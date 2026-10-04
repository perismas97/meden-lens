import assert from "node:assert/strict";
import test from "node:test";

import type {
  OllamaApi,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaRunningModel,
} from "./ollama-api.ts";
import { aggregateUsage, runCompatibilityCheck } from "./model-compatibility-spike.ts";

test("aggregates provider token and duration metadata", () => {
  const totals = aggregateUsage([
    response({ promptTokens: 40, outputTokens: 8, totalDuration: 2_000_000_000 }),
    response({ promptTokens: 55, outputTokens: 12, totalDuration: 1_500_000_000 }),
  ]);

  assert.deepEqual(totals, {
    inputTokens: 95,
    outputTokens: 20,
    totalTokens: 115,
    modelDurationMs: 3500,
    loadDurationMs: 20,
    complete: true,
  });
});

test("passes when the model calls the tool and reports usage", async () => {
  const api = new FakeOllamaApi([
    response({
      promptTokens: 35,
      outputTokens: 6,
      totalDuration: 1_000_000_000,
      toolCall: true,
    }),
    response({
      promptTokens: 50,
      outputTokens: 9,
      totalDuration: 750_000_000,
      content: "The product is 391.",
    }),
  ]);

  const result = await runCompatibilityCheck(api, "test-model:latest");

  assert.equal(result.passed, true);
  assert.equal(result.toolCallValid, true);
  assert.equal(result.finalAnswerValid, true);
  assert.equal(result.totalTokens, 100);
  assert.equal(result.modelCalls, 2);
  assert.equal(result.toolCalls, 1);
  assert.equal(result.loadedSizeBytes, 2_500_000_000);
});

test("fails clearly when no valid tool call is returned", async () => {
  const api = new FakeOllamaApi([
    response({
      promptTokens: 20,
      outputTokens: 4,
      totalDuration: 500_000_000,
      content: "17 times 23 is 391.",
    }),
  ]);

  const result = await runCompatibilityCheck(api, "test-model:latest");

  assert.equal(result.passed, false);
  assert.match(result.failure ?? "", /expected multiply_numbers/);
});

class FakeOllamaApi implements OllamaApi {
  private readonly responses: OllamaChatResponse[];

  constructor(responses: OllamaChatResponse[]) {
    this.responses = [...responses];
  }

  async listModels() {
    return [];
  }

  async listRunningModels(): Promise<OllamaRunningModel[]> {
    return [
      {
        name: "test-model:latest",
        model: "test-model:latest",
        size: 2_500_000_000,
        digest: "test-digest",
        size_vram: 0,
        context_length: 4096,
        details: {
          parameter_size: "4B",
          quantization_level: "Q4_K_M",
        },
      },
    ];
  }

  async chat(_request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const next = this.responses.shift();
    if (!next) {
      throw new Error("No fake response configured.");
    }
    return next;
  }
}

function response(options: {
  promptTokens: number;
  outputTokens: number;
  totalDuration: number;
  content?: string;
  toolCall?: boolean;
}): OllamaChatResponse {
  return {
    model: "test-model:latest",
    done: true,
    total_duration: options.totalDuration,
    load_duration: 10_000_000,
    prompt_eval_count: options.promptTokens,
    eval_count: options.outputTokens,
    message: {
      role: "assistant",
      content: options.content ?? "",
      tool_calls: options.toolCall
        ? [
            {
              function: {
                name: "multiply_numbers",
                arguments: { left: 17, right: 23 },
              },
            },
          ]
        : undefined,
    },
  };
}
