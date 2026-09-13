import { API_BASE_URL } from "./config";
import type {
  AnalysisResponse,
  ExecutionStatus,
  RunPageResponse,
  RunSummaryResponse,
  SimulatedRunResponse,
  SimulatorScenarioResponse,
  TaskProfileResponse
} from "./types";

interface RunPageParams {
  page: number;
  size: number;
  status: ExecutionStatus | "ALL";
  taskType: string;
  team: string;
}

export function fetchRunSummary(signal?: AbortSignal) {
  return getJson<RunSummaryResponse>("/api/v1/runs/summary", signal);
}

export function fetchRunPage(params: RunPageParams, signal?: AbortSignal) {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    sort: "createdAt,desc"
  });

  if (params.status !== "ALL") {
    query.set("status", params.status);
  }

  if (params.taskType !== "ALL") {
    query.set("taskType", params.taskType);
  }

  const team = params.team.trim();
  if (team.length > 0) {
    query.set("team", team);
  }

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
