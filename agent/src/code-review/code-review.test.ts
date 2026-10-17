import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MockAgentModel } from "../test-support/mock-agent-model.ts";
import { runCodeReview } from "./code-review-agent.ts";
import { codeReviewSchema } from "./code-review-schema.ts";
import { readCodeReviewFixture, resolveCodeReviewFixture } from "./source-reader.ts";

test("accepts a structured code review", () => {
  const review = codeReviewSchema.parse({
    summary: "The source contains one concrete correctness issue.",
    findings: [
      {
        severity: "HIGH",
        category: "CORRECTNESS",
        line: 12,
        title: "Failure is reported as success",
        explanation: "The catch branch returns updated true even when the database operation fails.",
        recommendation: "Return a failure result or allow the database error to propagate.",
      },
    ],
  });

  assert.equal(review.findings.length, 1);
});

test("rejects a finding without a valid source line", () => {
  assert.throws(
    () =>
      codeReviewSchema.parse({
        summary: "The source contains one concrete correctness issue.",
        findings: [
          {
            severity: "HIGH",
            category: "CORRECTNESS",
            line: 0,
            title: "Invalid line",
            explanation: "The finding does not point to a valid one-based source line.",
            recommendation: "Provide the line where the issue begins.",
          },
        ],
      }),
    /greater than 0|too small/i,
  );
});

test("reads a source fixture inside the configured directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-review-"));
  const fixturePath = path.join(root, "sample.ts");
  await writeFile(fixturePath, "export const answer = 42;", "utf8");

  assert.equal(resolveCodeReviewFixture(root, fixturePath), fixturePath);
  assert.equal(await readCodeReviewFixture(root, "sample.ts"), "export const answer = 42;");
});

test("rejects code-review paths outside the configured directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-review-"));
  const outsidePath = path.resolve(root, "..", "outside.ts");

  assert.throws(() => resolveCodeReviewFixture(root, outsidePath), /must be inside/);
  await assert.rejects(
    () => readCodeReviewFixture(root, "../outside.ts"),
    /without directory segments/,
  );
});

test("returns normalized telemetry with a mocked model", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-review-telemetry-"));
  const sourceText = "export function unsafeQuery(id: string) { return `SELECT ${id}`; }";
  await writeFile(path.join(root, "sample.ts"), sourceText, "utf8");
  const model = new MockAgentModel({
    toolCall: {
      name: "read_source_file",
      args: { fileName: "sample.ts" },
      id: "review-tool-call",
    },
    structuredResponses: [
      {
        summary: "The fixture contains one concrete security issue.",
        findings: [
          {
            severity: "HIGH",
            category: "SECURITY",
            line: 1,
            title: "Query input is interpolated",
            explanation: "Untrusted input is inserted directly into a query string.",
            recommendation: "Use a parameterized query.",
          },
        ],
      },
    ],
  });

  const result = await runCodeReview({
    requestedPath: path.join(root, "sample.ts"),
    fixtureRoot: root,
    model: "mock-model",
    ollamaBaseUrl: "http://unused",
    agentModel: model,
  });

  assert.equal(result.telemetry.modelCalls, 2);
  assert.equal(result.telemetry.toolSuccesses, 1);
  assert.equal(result.telemetry.totalTokens, 40);
  assert.doesNotMatch(JSON.stringify(result.telemetry), /unsafeQuery|SELECT/);
});
