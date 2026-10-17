import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MockAgentModel } from "../test-support/mock-agent-model.ts";
import { readFixtureDocument, resolveFixtureDocument } from "./document-reader.ts";
import { runDocumentSummary } from "./document-summary-agent.ts";
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

test("returns normalized telemetry with a mocked model", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-summary-telemetry-"));
  const sourceText = "Synthetic support report that must not appear in telemetry.";
  await writeFile(path.join(root, "sample.txt"), sourceText, "utf8");
  const model = new MockAgentModel({
    toolCall: {
      name: "read_document",
      args: { fileName: "sample.txt" },
      id: "summary-tool-call",
    },
    structuredResponses: [
      {
        title: "Synthetic support report",
        executiveSummary:
          "The controlled report records an operational observation without evaluating output quality.",
        keyPoints: ["The input is synthetic.", "The workflow uses one tool.", "Usage is provider reported."],
        risksOrUnknowns: ["Output quality is not evaluated."],
      },
    ],
  });

  const result = await runDocumentSummary({
    requestedPath: path.join(root, "sample.txt"),
    fixtureRoot: root,
    model: "mock-model",
    ollamaBaseUrl: "http://unused",
    agentModel: model,
  });

  assert.equal(result.telemetry.modelCalls, 2);
  assert.equal(result.telemetry.toolCalls, 1);
  assert.equal(result.telemetry.inputTokens, 30);
  assert.equal(result.telemetry.outputTokens, 10);
  assert.match(result.telemetry.traceId, /^[a-f0-9]{32}$/);
  assert.doesNotMatch(JSON.stringify(result.telemetry), /Synthetic support report that must not appear/);
});
