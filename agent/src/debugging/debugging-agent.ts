import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage, ToolMessage, tool } from "langchain";
import { z } from "zod";

import {
  prepareDebugFixture,
  removeDebugWorkspace,
  runDebugVerification,
  type VerificationResult,
  writeDebugReplacement,
} from "./debug-fixture.ts";
import {
  debuggingAttemptSchema,
  type DebuggingAttempt,
} from "./debugging-schema.ts";

export interface DebuggingRun {
  workflow: "debugging";
  taskCategory: "DEBUGGING";
  model: string;
  fixture: string;
  executionStatus: "COMPLETED";
  outcomeStatus: "VERIFIED" | "REJECTED";
  retryCount: number;
  attempt: DebuggingAttempt;
  initialVerification: VerificationResult;
  finalVerification: VerificationResult;
}

interface RunDebuggingOptions {
  fixtureKey: string;
  fixtureRoot: string;
  model: string;
  ollamaBaseUrl: string;
}

export async function runDebugging(
  options: RunDebuggingOptions,
): Promise<DebuggingRun> {
  const fixture = await prepareDebugFixture(options.fixtureRoot, options.fixtureKey);

  try {
    const initialVerification = await runDebugVerification(fixture.workspace);
    if (initialVerification.passed) {
      throw new Error(`Debugging fixture ${fixture.key} must fail before the model attempt.`);
    }

    let inspections = 0;
    const inspectInputSchema = z.object({});
    const inspectFixture = tool(
      async () => {
        inspections += 1;
        if (inspections > 1) {
          throw new Error("The debugging fixture may be inspected only once.");
        }

        return JSON.stringify({
          sourceFile: "source.mjs",
          source: fixture.source,
          testFile: "source.test.mjs",
          tests: fixture.testSource,
          failingTestOutput: initialVerification.output,
        });
      },
      {
        name: "inspect_debug_fixture",
        description: "Read the source, tests, and initial failing test output for the debugging fixture.",
        schema: inspectInputSchema,
      },
    );

    const model = new ChatOllama({
      model: options.model,
      baseUrl: options.ollamaBaseUrl,
      temperature: 0,
      maxRetries: 0,
      think: false,
    });
    const systemMessage = new SystemMessage(
      [
        "You are a debugging agent working on one controlled JavaScript fixture.",
        "Call inspect_debug_fixture exactly once before proposing a fix.",
        "Use the source, tests, and failing output as the only evidence.",
        "Make the smallest correction that satisfies the existing tests.",
      "Compare every expected and actual value before choosing the correction.",
      "A syntax-only rewrite that preserves the same output is not a fix.",
        "Return the complete source.mjs content in replacementSource without Markdown fences.",
        "Do not modify, weaken, remove, or bypass the tests.",
      ].join(" "),
    );
    const userMessage = new HumanMessage(`Diagnose and fix debugging fixture ${fixture.key}.`);

    const toolEnabledModel = model.bindTools([inspectFixture]);
    const toolSelection = await toolEnabledModel.invoke([systemMessage, userMessage]);
    const toolCalls = toolSelection.tool_calls ?? [];
    const selectedTool = toolCalls[0];

    if (toolCalls.length !== 1 || selectedTool?.name !== "inspect_debug_fixture") {
      throw new Error("Model did not select inspect_debug_fixture exactly once.");
    }

    const toolInput = inspectInputSchema.parse(selectedTool.args);
    const inspection = await inspectFixture.invoke(toolInput);
    const toolResult = new ToolMessage({
      content: String(inspection),
      name: "inspect_debug_fixture",
      tool_call_id: selectedTool.id ?? "inspect_debug_fixture-call",
    });
    const structuredModel = model.withStructuredOutput(debuggingAttemptSchema);
    const conversation = [
      systemMessage,
      userMessage,
      toolSelection,
      toolResult,
    ];
    let attempt = debuggingAttemptSchema.parse(
      await structuredModel.invoke(conversation),
    );

    if (inspections !== 1) {
      throw new Error(`Expected one fixture inspection, observed ${inspections}.`);
    }

    await writeDebugReplacement(fixture.workspace, attempt.replacementSource);
    let finalVerification = await runDebugVerification(fixture.workspace);
    let retryCount = 0;

    if (!finalVerification.passed) {
      retryCount = 1;
      const retryMessage = new HumanMessage(
        [
          "The proposed replacement failed the unchanged tests.",
          "Use the expected and actual values below to produce one revised complete source file.",
          "Do not return a mathematically equivalent rewrite of the failed implementation.",
          `Failed replacement:\n${attempt.replacementSource}`,
          `Verification output:\n${finalVerification.output}`,
        ].join("\n\n"),
      );
      attempt = debuggingAttemptSchema.parse(
        await structuredModel.invoke([...conversation, retryMessage]),
      );
      await writeDebugReplacement(fixture.workspace, attempt.replacementSource);
      finalVerification = await runDebugVerification(fixture.workspace);
    }

    return {
      workflow: "debugging",
      taskCategory: "DEBUGGING",
      model: options.model,
      fixture: fixture.key,
      executionStatus: "COMPLETED",
      outcomeStatus: finalVerification.passed ? "VERIFIED" : "REJECTED",
      retryCount,
      attempt,
      initialVerification,
      finalVerification,
    };
  } finally {
    await removeDebugWorkspace(fixture.workspace);
  }
}
