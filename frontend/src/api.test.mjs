import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRunPageQuery } from "./run-page-query.ts";

describe("buildRunPageQuery", () => {
  it("includes pagination and sorting while omitting inactive filters", () => {
    const query = buildRunPageQuery({
      page: 2,
      size: 9,
      status: "ALL",
      taskType: "ALL",
      team: "   "
    });

    assert.equal(query.get("page"), "2");
    assert.equal(query.get("size"), "9");
    assert.equal(query.get("sort"), "createdAt,desc");
    assert.equal(query.has("status"), false);
    assert.equal(query.has("taskType"), false);
    assert.equal(query.has("team"), false);
  });

  it("includes active filters and trims the team value", () => {
    const query = buildRunPageQuery({
      page: 0,
      size: 25,
      status: "FAILED",
      taskType: "DOCUMENT_SUMMARY",
      team: "  platform  "
    });

    assert.equal(query.get("status"), "FAILED");
    assert.equal(query.get("taskType"), "DOCUMENT_SUMMARY");
    assert.equal(query.get("team"), "platform");
  });
});
