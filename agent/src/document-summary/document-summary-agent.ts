import path from "node:path";

import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage, ToolMessage, tool } from "langchain";
import { z } from "zod";

import { readFixtureDocument, resolveFixtureDocument } from "./document-reader.ts";
import {
  documentSummarySchema,
  type DocumentSummary,
} from "./summary-schema.ts";

export interface DocumentSummaryRun {
  workflow: "document-summary";
  taskCategory: "DOCUMENT_SUMMARY";
  model: string;
  sourceFile: string;
  executionStatus: "COMPLETED";
  outcomeStatus: "NOT_EVALUATED";
  summary: DocumentSummary;
}

interface RunDocumentSummaryOptions {
  requestedPath: string;
  fixtureRoot: string;
  model: string;
  ollamaBaseUrl: string;
}

export async function runDocumentSummary(
  options: RunDocumentSummaryOptions,
): Promise<DocumentSummaryRun> {
  const absolutePath = resolveFixtureDocument(options.fixtureRoot, options.requestedPath);
  const sourceFile = path.basename(absolutePath);
  let documentReads = 0;
  const readDocumentInputSchema = z.object({
    fileName: z
      .literal(sourceFile)
      .describe("The exact fixture file name supplied by the workflow."),
  });

  const readOnce = async (fileName: string): Promise<string> => {
    documentReads += 1;
    if (documentReads > 1) {
      throw new Error("The document may be read only once per workflow execution.");
    }
    return readFixtureDocument(options.fixtureRoot, fileName);
  };

  const readDocument = tool(
    async ({ fileName }) => readOnce(fileName),
    {
      name: "read_document",
      description:
        "Read the complete text of the single document fixture that must be summarized.",
      schema: readDocumentInputSchema,
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
      "You are a document-summary agent.",
      "Call read_document exactly once before producing the summary.",
      "Use only facts contained in the document and do not infer missing results.",
      "Preserve measured values exactly; state before and after values instead of calculating an unstated difference.",
      "Keep key points distinct and place stated limitations in risksOrUnknowns.",
      "Do not summarize until the tool result is available.",
    ].join(" "),
  );
  const userMessage = new HumanMessage(
    `Read and summarize the fixture named ${sourceFile}.`,
  );

  const toolEnabledModel = model.bindTools([readDocument]);
  const toolSelection = await toolEnabledModel.invoke([systemMessage, userMessage]);
  const toolCalls = toolSelection.tool_calls ?? [];
  const selectedTool = toolCalls[0];

  if (toolCalls.length !== 1 || selectedTool?.name !== "read_document") {
    throw new Error("Model did not select the required read_document tool exactly once.");
  }

  const toolInput = readDocumentInputSchema.parse(selectedTool.args);
  const documentContent = await readOnce(toolInput.fileName);
  const toolResult = new ToolMessage({
    content: String(documentContent),
    name: "read_document",
    tool_call_id: selectedTool.id ?? "read_document-call",
  });

  const structuredModel = model.withStructuredOutput(documentSummarySchema);
  const structuredResponse = await structuredModel.invoke([
    systemMessage,
    userMessage,
    toolSelection,
    toolResult,
  ]);

  if (documentReads !== 1) {
    throw new Error(`Expected one document read, observed ${documentReads}.`);
  }

  const summary = documentSummarySchema.parse(structuredResponse);

  return {
    workflow: "document-summary",
    taskCategory: "DOCUMENT_SUMMARY",
    model: options.model,
    sourceFile,
    executionStatus: "COMPLETED",
    outcomeStatus: "NOT_EVALUATED",
    summary,
  };
}
