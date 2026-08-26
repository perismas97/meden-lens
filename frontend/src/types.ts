export type ExecutionStatus = "SUCCESS" | "FAILED";

export type AnalysisClassification =
  | "PROPORTIONAL"
  | "ACCEPTABLE"
  | "SLIGHTLY_EXCESSIVE"
  | "DISPROPORTIONATE"
  | "HIGHLY_DISPROPORTIONATE";

export interface RunSummaryResponse {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  analyzedRuns: number;
  unanalyzedRuns: number;
  averageBalanceScore: number;
  proportionalRuns: number;
  acceptableRuns: number;
  slightlyExcessiveRuns: number;
  disproportionateRuns: number;
  highlyDisproportionateRuns: number;
  totalEstimatedCostUsd: string;
  estimatedCostReductionUsd: string;
}

export interface RunPageResponse {
  items: RunListItemResponse[];
  page: number;
  size: number;
  sort: string;
  totalItems: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface RunListItemResponse {
  id: string;
  externalRunId: string | null;
  agent: {
    name: string;
    version: string | null;
  };
  task: {
    type: string;
    description: string;
    complexity: string;
  };
  execution: {
    status: ExecutionStatus;
    durationMs: number;
    modelCalls: number;
    toolCalls: number;
    retryCount: number;
    subAgentCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: string;
  };
  metadata: {
    environment: string | null;
    team: string | null;
    purpose: string | null;
  };
  createdAt: string;
  analysis: {
    analyzed: boolean;
    balanceScore: number | null;
    classification: AnalysisClassification | null;
    estimatedCostReductionUsd: string | null;
  };
}
