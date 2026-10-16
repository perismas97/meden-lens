import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  prepareDebugFixture,
  removeDebugWorkspace,
  runDebugVerification,
  writeDebugReplacement,
} from "./debug-fixture.ts";
import { debuggingAttemptSchema } from "./debugging-schema.ts";

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
