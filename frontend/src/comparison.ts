export type ComparisonTone = "critical" | "over" | "within";

export function comparisonTone(actual: number, expected: number): ComparisonTone {
  if (expected === 0) {
    return actual === 0 ? "within" : "critical";
  }

  const ratio = actual / expected;
  if (ratio <= 1) {
    return "within";
  }

  return ratio <= 1.25 ? "over" : "critical";
}

export function comparisonRatioLabel(actual: number, expected: number) {
  if (expected === 0) {
    return actual === 0 ? "within limit" : "not allowed";
  }

  return `${(actual / expected).toFixed(1)}x`;
}

export function comparisonMeterWidth(actual: number, expected: number) {
  if (expected === 0) {
    return actual === 0 ? 0 : 100;
  }

  return Math.min(100, Math.max(0, (actual / expected) * 50));
}
