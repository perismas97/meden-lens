import path from "node:path";

import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage, ToolMessage, tool } from "langchain";
import { z } from "zod";

import { codeReviewSchema, type CodeReview } from "./code-review-schema.ts";
import { readCodeReviewFixture, resolveCodeReviewFixture } from "./source-reader.ts";

export interface CodeReviewRun {
  workflow: "code-review";
  taskCategory: "CODE_REVIEW";
  model: string;
  sourceFile: string;
  executionStatus: "COMPLETED";
  outcomeStatus: "NOT_EVALUATED";
  review: CodeReview;
}

interface RunCodeReviewOptions {
  requestedPath: string;
  fixtureRoot: string;
  model: string;
  ollamaBaseUrl: string;
}

export async function runCodeReview(
  options: RunCodeReviewOptions,
): Promise<CodeReviewRun> {
  const absolutePath = resolveCodeReviewFixture(options.fixtureRoot, options.requestedPath);
  const sourceFile = path.basename(absolutePath);
  let sourceReads = 0;
  const readSourceInputSchema = z.object({
    fileName: z.literal(sourceFile),
  });

  const readOnce = async (fileName: string): Promise<string> => {
    sourceReads += 1;
    if (sourceReads > 1) {
      throw new Error("The source fixture may be read only once per workflow execution.");
    }
    return readCodeReviewFixture(options.fixtureRoot, fileName);
  };

  const readSourceFile = tool(async ({ fileName }) => readOnce(fileName), {
    name: "read_source_file",
    description: "Read the complete source file that must be reviewed.",
    schema: readSourceInputSchema,
  });

  const model = new ChatOllama({
    model: options.model,
    baseUrl: options.ollamaBaseUrl,
    temperature: 0,
    maxRetries: 0,
    think: false,
  });
  const systemMessage = new SystemMessage(
    [
      "You are a focused code-review agent.",
      "Call read_source_file exactly once before reviewing the code.",
      "Report only concrete issues supported by the supplied source.",
      "Use the source line number where the problem begins.",
      "Do not invent project context, runtime behavior, or requirements.",
      "An empty findings collection is valid when no concrete issue exists.",
    ].join(" "),
  );
  const userMessage = new HumanMessage(`Review the fixture named ${sourceFile}.`);

  const toolEnabledModel = model.bindTools([readSourceFile]);
  const toolSelection = await toolEnabledModel.invoke([systemMessage, userMessage]);
  const toolCalls = toolSelection.tool_calls ?? [];
  const selectedTool = toolCalls[0];

  if (toolCalls.length !== 1 || selectedTool?.name !== "read_source_file") {
    throw new Error("Model did not select the required read_source_file tool exactly once.");
  }

  const toolInput = readSourceInputSchema.parse(selectedTool.args);
  const source = await readOnce(toolInput.fileName);
  const toolResult = new ToolMessage({
    content: source,
    name: "read_source_file",
    tool_call_id: selectedTool.id ?? "read_source_file-call",
  });

  const structuredModel = model.withStructuredOutput(codeReviewSchema);
  const structuredResponse = await structuredModel.invoke([
    systemMessage,
    userMessage,
    toolSelection,
    toolResult,
  ]);

  if (sourceReads !== 1) {
    throw new Error(`Expected one source read, observed ${sourceReads}.`);
  }

  return {
    workflow: "code-review",
    taskCategory: "CODE_REVIEW",
    model: options.model,
    sourceFile,
    executionStatus: "COMPLETED",
    outcomeStatus: "NOT_EVALUATED",
    review: codeReviewSchema.parse(structuredResponse),
  };
}
