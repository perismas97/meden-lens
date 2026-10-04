import { pathToFileURL } from "node:url";

import {
  OllamaHttpClient,
  type OllamaApi,
  type OllamaChatResponse,
  type OllamaMessage,
  type OllamaRunningModel,
  type OllamaTool,
} from "./ollama-api.ts";

const DEFAULT_MODELS = ["llama3.2:3b", "qwen3:4b"];
const EXPECTED_PRODUCT = 391;

const multiplyTool: OllamaTool = {
  type: "function",
  function: {
    name: "multiply_numbers",
    description: "Multiply two integers and return their product.",
    parameters: {
      type: "object",
      required: ["left", "right"],
      properties: {
        left: { type: "integer", description: "The first integer." },
        right: { type: "integer", description: "The second integer." },
      },
    },
  },
};

export interface CompatibilityResult {
  model: string;
  passed: boolean;
  toolCallValid: boolean;
  finalAnswerValid: boolean;
  usageMetadataPresent: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelCalls: number;
  toolCalls: number;
  wallDurationMs: number;
  modelDurationMs: number;
  loadDurationMs: number;
  loadedSizeBytes?: number;
  loadedVramBytes?: number;
  contextLength?: number;
  parameterSize?: string;
  quantizationLevel?: string;
  failure?: string;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelDurationMs: number;
  loadDurationMs: number;
  complete: boolean;
}

export async function runCompatibilityCheck(
  api: OllamaApi,
  model: string,
): Promise<CompatibilityResult> {
  const startedAt = performance.now();

  try {
    const userMessage: OllamaMessage = {
      role: "user",
      content:
        "Use the multiply_numbers tool exactly once to multiply 17 by 23. " +
        "Do not calculate the product yourself.",
    };

    const firstResponse = await api.chat({
      model,
      messages: [userMessage],
      tools: [multiplyTool],
      stream: false,
      think: false,
      keep_alive: "5m",
      options: { temperature: 0, seed: 42 },
    });

    const toolCalls = firstResponse.message.tool_calls ?? [];
    const toolCall = toolCalls[0];
    const left = Number(toolCall?.function.arguments.left);
    const right = Number(toolCall?.function.arguments.right);
    const toolCallValid =
      toolCalls.length === 1 &&
      toolCall?.function.name === multiplyTool.function.name &&
      ((left === 17 && right === 23) || (left === 23 && right === 17));

    if (!toolCallValid) {
      throw new Error("Model did not return the expected multiply_numbers(17, 23) tool call.");
    }

    const toolResultMessage: OllamaMessage = {
      role: "tool",
      tool_name: multiplyTool.function.name,
      content: String(left * right),
    };

    const finalResponse = await api.chat({
      model,
      messages: [userMessage, firstResponse.message, toolResultMessage],
      tools: [multiplyTool],
      stream: false,
      think: false,
      keep_alive: "5m",
      options: { temperature: 0, seed: 42 },
    });

    const usage = aggregateUsage([firstResponse, finalResponse]);
    const runningModel = findRunningModel(await api.listRunningModels(), model);
    const finalAnswerValid = finalResponse.message.content.includes(String(EXPECTED_PRODUCT));
    const wallDurationMs = Math.round(performance.now() - startedAt);

    return {
      model,
      passed: toolCallValid && finalAnswerValid && usage.complete,
      toolCallValid,
      finalAnswerValid,
      usageMetadataPresent: usage.complete,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      modelCalls: 2,
      toolCalls: toolCalls.length,
      wallDurationMs,
      modelDurationMs: usage.modelDurationMs,
      loadDurationMs: usage.loadDurationMs,
      loadedSizeBytes: runningModel?.size,
      loadedVramBytes: runningModel?.size_vram,
      contextLength: runningModel?.context_length,
      parameterSize: runningModel?.details?.parameter_size,
      quantizationLevel: runningModel?.details?.quantization_level,
    };
  } catch (error) {
    return failedResult(model, Math.round(performance.now() - startedAt), error);
  }
}

export function aggregateUsage(responses: OllamaChatResponse[]): UsageTotals {
  const complete = responses.every(
    (response) =>
      Number.isInteger(response.prompt_eval_count) &&
      Number.isInteger(response.eval_count) &&
      typeof response.total_duration === "number" &&
      typeof response.load_duration === "number",
  );

  const inputTokens = sum(responses, "prompt_eval_count");
  const outputTokens = sum(responses, "eval_count");

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    modelDurationMs: nanosecondsToMilliseconds(sum(responses, "total_duration")),
    loadDurationMs: nanosecondsToMilliseconds(sum(responses, "load_duration")),
    complete,
  };
}

function sum(
  responses: OllamaChatResponse[],
  key: "prompt_eval_count" | "eval_count" | "total_duration" | "load_duration",
): number {
  return responses.reduce((total, response) => total + (response[key] ?? 0), 0);
}

function nanosecondsToMilliseconds(value: number): number {
  return Math.round(value / 1_000_000);
}

function findRunningModel(
  models: OllamaRunningModel[],
  requestedModel: string,
): OllamaRunningModel | undefined {
  const requestedBase = requestedModel.split(":")[0];
  return models.find(
    (candidate) =>
      candidate.name === requestedModel ||
      candidate.model === requestedModel ||
      candidate.name.split(":")[0] === requestedBase,
  );
}

function failedResult(model: string, wallDurationMs: number, error: unknown): CompatibilityResult {
  return {
    model,
    passed: false,
    toolCallValid: false,
    finalAnswerValid: false,
    usageMetadataPresent: false,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    modelCalls: 0,
    toolCalls: 0,
    wallDurationMs,
    modelDurationMs: 0,
    loadDurationMs: 0,
    failure: error instanceof Error ? error.message : String(error),
  };
}

async function main(): Promise<void> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const models = parseModels(process.env.MEDEN_SPIKE_MODELS);
  const client = new OllamaHttpClient(baseUrl);

  let installedModels: string[];
  try {
    installedModels = (await client.listModels()).flatMap((model) => [model.name, model.model]);
  } catch (error) {
    console.error(formatPreflightFailure(baseUrl, error));
    process.exitCode = 1;
    return;
  }

  const missingModels = models.filter((model) => !installedModels.includes(model));
  if (missingModels.length > 0) {
    console.error("Required spike models are not installed:");
    for (const model of missingModels) {
      console.error(`  ollama pull ${model}`);
    }
    process.exitCode = 1;
    return;
  }

  const results: CompatibilityResult[] = [];
  for (const model of models) {
    console.error(`Checking ${model}...`);
    results.push(await runCompatibilityCheck(client, model));
  }

  const report = {
    recordedAt: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      ollamaBaseUrl: baseUrl,
    },
    acceptanceCriteria: {
      validToolCall: true,
      finalAnswerUsesToolResult: true,
      tokenUsagePresentForEveryModelCall: true,
    },
    results,
    recommendedModel: recommendModel(results),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = results.every((result) => result.passed) ? 0 : 1;
}

function parseModels(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_MODELS;
  }

  const models = value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return models.length > 0 ? models : DEFAULT_MODELS;
}

function recommendModel(results: CompatibilityResult[]): string | null {
  const passing = results.filter((result) => result.passed);
  if (passing.length === 0) {
    return null;
  }

  return [...passing].sort((left, right) => left.wallDurationMs - right.wallDurationMs)[0].model;
}

function formatPreflightFailure(baseUrl: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return [
    `Ollama preflight failed for ${baseUrl}.`,
    "Start the Ollama Windows application or run 'ollama serve' in another terminal.",
    `Reason: ${reason}`,
  ].join("\n");
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (entryPoint === import.meta.url) {
  await main();
}
