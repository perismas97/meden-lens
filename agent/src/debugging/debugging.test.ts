import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MockAgentModel } from "../test-support/mock-agent-model.ts";
import {
  prepareDebugFixture,
  removeDebugWorkspace,
  runDebugVerification,
  writeDebugReplacement,
} from "./debug-fixture.ts";
import { debuggingAttemptSchema } from "./debugging-schema.ts";
import { runDebugging } from "./debugging-agent.ts";

test("accepts a complete structured debugging attempt", () => {
  const attempt = debuggingAttemptSchema.parse({
    diagnosis: "The exponent starts one step too high for the first retry attempt.",
    replacementSource: "export function delay(attempt) { return 2 ** (attempt - 1); }",
    explanation: "Subtracting one makes the first attempt use the configured base delay.",
  });

  assert.match(attempt.replacementSource, /attempt - 1/);
});

test("verifies a replacement against the unchanged fixture tests", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-debug-test-"));
  const fixtureDirectory = path.join(root, "sample");
  await mkdir(fixtureDirectory);
  await writeFile(
    path.join(fixtureDirectory, "source.mjs"),
    "export function value() { return 1; }\n",
    "utf8",
  );
  await writeFile(
    path.join(fixtureDirectory, "source.test.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import test from "node:test";',
      'import { value } from "./source.mjs";',
      'test("returns two", () => assert.equal(value(), 2));',
    ].join("\n"),
    "utf8",
  );

  const fixture = await prepareDebugFixture(root, "sample");
  try {
    const initial = await runDebugVerification(fixture.workspace);
    assert.equal(initial.passed, false);

    await writeDebugReplacement(
      fixture.workspace,
      "export function value() { return 2; }\n",
    );
    const final = await runDebugVerification(fixture.workspace);
    assert.equal(final.passed, true);
  } finally {
    await removeDebugWorkspace(fixture.workspace);
  }
});

test("rejects a debugging fixture path instead of a fixture key", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-debug-test-"));
  await assert.rejects(
    () => prepareDebugFixture(root, "../outside"),
    /single directory name/,
  );
});

test("returns verified normalized telemetry with a mocked model", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-debug-telemetry-"));
  const fixtureDirectory = path.join(root, "sample");
  await mkdir(fixtureDirectory);
  await writeFile(
    path.join(fixtureDirectory, "source.mjs"),
    "export function value() { return 1; }\n",
    "utf8",
  );
  await writeFile(
    path.join(fixtureDirectory, "source.test.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import test from "node:test";',
      'import { value } from "./source.mjs";',
      'test("returns two", () => assert.equal(value(), 2));',
    ].join("\n"),
    "utf8",
  );
  const model = new MockAgentModel({
    toolCall: {
      name: "inspect_debug_fixture",
      args: {},
      id: "debug-tool-call",
    },
    structuredResponses: [
      {
        diagnosis: "The function returns one instead of two.",
        replacementSource: "export function value() { return 2; }\n",
        explanation: "Returning two satisfies the unchanged fixture test.",
      },
    ],
  });

  const result = await runDebugging({
    fixtureKey: "sample",
    fixtureRoot: root,
    model: "mock-model",
    ollamaBaseUrl: "http://unused",
    agentModel: model,
  });

  assert.equal(result.outcomeStatus, "VERIFIED");
  assert.equal(result.telemetry.outcomeStatus, "VERIFIED");
  assert.equal(result.telemetry.modelCalls, 2);
  assert.equal(result.telemetry.toolCalls, 1);
  assert.equal(result.telemetry.retryCount, 0);
  assert.doesNotMatch(JSON.stringify(result.telemetry), /function value|returns two/);
});

test("records a bounded debugging retry in normalized telemetry", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "meden-debug-retry-"));
  const fixtureDirectory = path.join(root, "sample");
  await mkdir(fixtureDirectory);
  await writeFile(
    path.join(fixtureDirectory, "source.mjs"),
    "export function value() { return 1; }\n",
    "utf8",
  );
  await writeFile(
    path.join(fixtureDirectory, "source.test.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import test from "node:test";',
      'import { value } from "./source.mjs";',
      'test("returns two", () => assert.equal(value(), 2));',
    ].join("\n"),
    "utf8",
  );
  const model = new MockAgentModel({
    toolCall: {
      name: "inspect_debug_fixture",
      args: {},
      id: "debug-tool-call",
    },
    structuredResponses: [
      {
        diagnosis: "The first proposal is intentionally insufficient.",
        replacementSource: "export function value() { return 1; }\n",
        explanation: "This proposal should fail and trigger the bounded retry.",
      },
      {
        diagnosis: "The function must return two.",
        replacementSource: "export function value() { return 2; }\n",
        explanation: "The revised source satisfies the unchanged test.",
      },
    ],
    usage: [
      { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      { input_tokens: 20, output_tokens: 8, total_tokens: 28 },
      { input_tokens: 25, output_tokens: 7, total_tokens: 32 },
    ],
  });

  const result = await runDebugging({
    fixtureKey: "sample",
    fixtureRoot: root,
    model: "mock-model",
    ollamaBaseUrl: "http://unused",
    agentModel: model,
  });

  assert.equal(result.outcomeStatus, "VERIFIED");
  assert.equal(result.retryCount, 1);
  assert.equal(result.telemetry.retryCount, 1);
  assert.equal(result.telemetry.modelCalls, 3);
  assert.equal(result.telemetry.totalTokens, 72);
  assert.deepEqual(result.telemetry.completenessWarnings, []);
});
