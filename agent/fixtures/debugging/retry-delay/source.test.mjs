import assert from "node:assert/strict";
import test from "node:test";

import { calculateRetryDelay } from "./source.mjs";

test("starts with the base delay on the first attempt", () => {
  assert.equal(calculateRetryDelay(1, 100), 100);
});

test("doubles the delay after each failed attempt", () => {
  assert.equal(calculateRetryDelay(2, 100), 200);
  assert.equal(calculateRetryDelay(3, 100), 400);
});

test("rejects invalid attempts", () => {
  assert.throws(() => calculateRetryDelay(0, 100), /positive integer/);
});
