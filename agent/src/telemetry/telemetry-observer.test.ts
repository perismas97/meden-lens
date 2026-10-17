import assert from "node:assert/strict";
import test from "node:test";

import { TelemetryObserver } from "./telemetry-observer.ts";

test("aggregates model, tool, retry, and timing telemetry", async () => {
  const dates = [
    new Date("2026-10-17T08:00:00.000Z"),
    new Date("2026-10-17T08:00:01.250Z"),
  ];
  const monotonicTimes = [100, 1350];
  const observer = new TelemetryObserver({
    workflow: "document-summary",
    taskCategory: "DOCUMENT_SUMMARY",
    modelName: "mock-model",
    traceIdFactory: () => "0123456789abcdef0123456789abcdef",
    clock: {
      now: () => dates.shift()!,
      monotonicNow: () => monotonicTimes.shift()!,
    },
  });

  await observer.observeModelCall(
    async () => ({ usage: { input_tokens: 12, output_tokens: 3, total_tokens: 15 } }),
    (response) => response.usage,
  );
  await observer.observeModelCall(
    async () => ({ usage: { input_tokens: 20, output_tokens: 5, total_tokens: 25 } }),
    (response) => response.usage,
  );
  await observer.observeToolCall(async () => "fixture content");
  observer.recordRetry();

  const telemetry = observer.complete({
    executionStatus: "COMPLETED",
    outcomeStatus: "NOT_EVALUATED",
  });

  assert.deepEqual(telemetry, {
    schemaVersion: 1,
    traceId: "0123456789abcdef0123456789abcdef",
    workflow: "document-summary",
    taskCategory: "DOCUMENT_SUMMARY",
    modelProvider: "ollama",
    modelName: "mock-model",
    startedAt: "2026-10-17T08:00:00.000Z",
    completedAt: "2026-10-17T08:00:01.250Z",
    durationMs: 1250,
    executionStatus: "COMPLETED",
    outcomeStatus: "NOT_EVALUATED",
    inputTokens: 32,
    outputTokens: 8,
    totalTokens: 40,
    modelCalls: 2,
    toolCalls: 1,
    toolSuccesses: 1,
    toolFailures: 0,
    retryCount: 1,
    subAgentCount: 0,
    actualCostUsd: 0,
    completenessWarnings: [],
  });
});

test("does not guess tokens when provider usage is missing", async () => {
  const observer = new TelemetryObserver({
    workflow: "code-review",
    taskCategory: "CODE_REVIEW",
    modelName: "mock-model",
  });

  await observer.observeModelCall(async () => ({}), () => undefined);
  await assert.rejects(
    () => observer.observeToolCall(async () => Promise.reject(new Error("tool failed"))),
    /tool failed/,
  );

  const telemetry = observer.complete({
    executionStatus: "FAILED",
    outcomeStatus: "NOT_EVALUATED",
    errorType: "MODEL_USAGE_UNAVAILABLE",
  });

  assert.equal(telemetry.inputTokens, null);
  assert.equal(telemetry.outputTokens, null);
  assert.equal(telemetry.totalTokens, null);
  assert.equal(telemetry.toolFailures, 1);
  assert.equal(telemetry.errorType, "MODEL_USAGE_UNAVAILABLE");
  assert.deepEqual(telemetry.completenessWarnings, ["TOKEN_USAGE_MISSING"]);
});
