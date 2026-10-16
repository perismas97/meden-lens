export function calculateRetryDelay(attempt, baseDelayMs) {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error("attempt must be a positive integer");
  }

  if (!Number.isFinite(baseDelayMs) || baseDelayMs <= 0) {
    throw new Error("baseDelayMs must be positive");
  }

  return baseDelayMs * 2 ** attempt;
}
