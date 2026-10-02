import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runDetailPath, runIdFromRoute } from "./run-route.ts";

const RUN_ID = "60b7409d-3e8e-4d8f-92ea-2d52ebf42d2b";

describe("run detail routes", () => {
  it("builds a stable detail URL for a run", () => {
    assert.equal(runDetailPath(RUN_ID), `/runs/${RUN_ID}`);
  });

  it("normalizes valid route IDs and rejects malformed values", () => {
    assert.equal(runIdFromRoute(RUN_ID.toUpperCase()), RUN_ID);
    assert.equal(runIdFromRoute("not-a-run-id"), null);
    assert.equal(runIdFromRoute(undefined), null);
  });

  it("does not build a URL from an invalid run ID", () => {
    assert.throws(() => runDetailPath("invalid"), /valid run ID/);
  });
});
