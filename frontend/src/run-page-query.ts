import type { ExecutionStatus } from "./types";

export interface RunPageParams {
  page: number;
  size: number;
  status: ExecutionStatus | "ALL";
  taskType: string;
  team: string;
}

export function buildRunPageQuery(params: RunPageParams) {
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

  return query;
}
