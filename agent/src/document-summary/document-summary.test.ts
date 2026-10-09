import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readFixtureDocument, resolveFixtureDocument } from "./document-reader.ts";
import { documentSummarySchema } from "./summary-schema.ts";

test("accepts a complete structured document summary", () => {
  const result = documentSummarySchema.parse({
    title: "Support pilot",
    executiveSummary:
      "The pilot reduced median handling time while keeping customer-facing actions under human control.",
    keyPoints: ["The pilot lasted six weeks.", "Eighteen specialists participated.", "Retries were limited."],
    risksOrUnknowns: ["Customer satisfaction was not measured."],
  });

  assert.equal(result.keyPoints.length, 3);
});

test("rejects an incomplete structured document summary", () => {
  assert.throws(
    () =>
      documentSummarySchema.parse({
        title: "Support pilot",
        executiveSummary: "Too short.",
        keyPoints: ["Only one point."],
        risksOrUnknowns: [],
      }),
    /Too small|expected/i,
  );
});

test("reads a non-empty text fixture inside the configured directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-agent-"));
  const fixturePath = path.join(root, "sample.txt");
  await writeFile(fixturePath, "A controlled synthetic document.", "utf8");

  const resolved = resolveFixtureDocument(root, fixturePath);
  const content = await readFixtureDocument(root, "sample.txt");

  assert.equal(resolved, fixturePath);
  assert.equal(content, "A controlled synthetic document.");
});

test("rejects paths outside the configured fixture directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-agent-"));
  const outsidePath = path.resolve(root, "..", "outside.txt");

  assert.throws(() => resolveFixtureDocument(root, outsidePath), /must be inside/);
  await assert.rejects(() => readFixtureDocument(root, "../outside.txt"), /without directory segments/);
});
