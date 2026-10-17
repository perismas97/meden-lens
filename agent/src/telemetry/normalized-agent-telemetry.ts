export type AgentExecutionStatus = "COMPLETED" | "FAILED";
export type AgentOutcomeStatus = "VERIFIED" | "REJECTED" | "NOT_EVALUATED";
export type TelemetryWarning = "TOKEN_USAGE_MISSING";

export interface NormalizedAgentTelemetry {
  schemaVersion: 1;
  traceId: string;
  workflow: string;
  taskCategory: string;
  modelProvider: "ollama";
  modelName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  executionStatus: AgentExecutionStatus;
  outcomeStatus: AgentOutcomeStatus;
  errorType?: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  modelCalls: number;
  toolCalls: number;
  toolSuccesses: number;
  toolFailures: number;
  retryCount: number;
  subAgentCount: number;
  actualCostUsd: 0;
  completenessWarnings: TelemetryWarning[];
}
