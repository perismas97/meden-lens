import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

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
