import { API_BASE_URL } from "./config";
import { buildRunPageQuery } from "./run-page-query";
import type { RunPageParams } from "./run-page-query";
import type {
  AnalysisResponse,
  RunPageResponse,
  RunSummaryResponse,
  SimulatedRunResponse,
  SimulatorScenarioResponse,
  TaskProfileResponse
} from "./types";

export function fetchRunSummary(signal?: AbortSignal) {
  return getJson<RunSummaryResponse>("/api/v1/runs/summary", signal);
}

export function fetchRunPage(params: RunPageParams, signal?: AbortSignal) {
  const query = buildRunPageQuery(params);

  return getJson<RunPageResponse>(`/api/v1/runs?${query.toString()}`, signal);
}

export function fetchRunAnalysis(runId: string, signal?: AbortSignal) {
  return getJson<AnalysisResponse>(`/api/v1/runs/${encodeURIComponent(runId)}/analysis`, signal);
}

export function fetchTaskProfiles(signal?: AbortSignal) {
  return getJson<TaskProfileResponse[]>("/api/v1/task-profiles", signal);
}

export function fetchSimulatorScenarios(signal?: AbortSignal) {
  return getJson<SimulatorScenarioResponse[]>("/api/v1/simulator/scenarios", signal);
}

export function createSimulatorRun(scenarioKey: string) {
  return postJson<SimulatedRunResponse>(
    `/api/v1/simulator/scenarios/${encodeURIComponent(scenarioKey)}`
  );
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
    signal
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(path: string): Promise<T> {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
