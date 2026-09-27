import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  comparisonMeterWidth,
  comparisonRatioLabel,
  comparisonTone
} from "./comparison.ts";
import { formatDate, formatDuration, formatEnum, formatMoney } from "./formatters.ts";

describe("formatters", () => {
  it("formats durations without losing minute and second context", () => {
    assert.equal(formatDuration(750), "750 ms");
    assert.equal(formatDuration(42_000), "42 sec");
    assert.equal(formatDuration(150_000), "2m 30s");
  });

  it("formats enum labels and defensive fallback values", () => {
    assert.equal(formatEnum("HIGHLY_DISPROPORTIONATE"), "Highly Disproportionate");
    assert.equal(formatMoney("not-a-number"), "$0.00");
    assert.equal(formatDate("not-a-date"), "-");
  });
});

describe("actual versus expected helpers", () => {
  it("classifies ratios around the display thresholds", () => {
    assert.equal(comparisonTone(100, 100), "within");
    assert.equal(comparisonTone(120, 100), "over");
    assert.equal(comparisonTone(126, 100), "critical");
  });

  it("handles zero ceilings without dividing by zero", () => {
    assert.equal(comparisonRatioLabel(0, 0), "within limit");
    assert.equal(comparisonRatioLabel(1, 0), "not allowed");
    assert.equal(comparisonMeterWidth(0, 0), 0);
    assert.equal(comparisonMeterWidth(1, 0), 100);
  });

  it("places the expected value at the midpoint and caps large overruns", () => {
    assert.equal(comparisonMeterWidth(100, 100), 50);
    assert.equal(comparisonMeterWidth(250, 100), 100);
  });
});
