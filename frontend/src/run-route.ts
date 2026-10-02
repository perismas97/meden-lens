const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function runDetailPath(runId: string) {
  const normalizedRunId = runIdFromRoute(runId);

  if (!normalizedRunId) {
    throw new Error("A valid run ID is required to build a run detail path.");
  }

  return `/runs/${normalizedRunId}`;
}

export function runIdFromRoute(runId: string | undefined) {
  if (!runId || !UUID_PATTERN.test(runId)) {
    return null;
  }

  return runId.toLowerCase();
}
