import { API_BASE_URL } from "./config";
import type { ExecutionStatus, RunPageResponse, RunSummaryResponse } from "./types";

interface RunPageParams {
  page: number;
  size: number;
  status: ExecutionStatus | "ALL";
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

  return getJson<RunPageResponse>(`/api/v1/runs?${query.toString()}`, signal);
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
