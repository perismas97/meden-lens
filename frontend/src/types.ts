export type ExecutionStatus = "SUCCESS" | "FAILED";

export type AnalysisClassification =
  | "PROPORTIONAL"
  | "ACCEPTABLE"
  | "SLIGHTLY_EXCESSIVE"
  | "DISPROPORTIONATE"
  | "HIGHLY_DISPROPORTIONATE";

export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FindingCode =
  | "EXCESSIVE_MODEL_CALLS"
  | "EXCESSIVE_TOOL_USAGE"
  | "TOKEN_BUDGET_EXCEEDED"
  | "INPUT_CONTEXT_TOO_LARGE"
  | "OUTPUT_TOO_VERBOSE"
  | "COST_DISPROPORTIONATE_TO_TASK"
  | "LATENCY_ABOVE_EXPECTED"
  | "RETRY_LOOP_DETECTED"
  | "UNNECESSARY_SUB_AGENTS"
  | "TOOLS_USED_FOR_NON_TOOL_TASK"
  | "PREMIUM_MODEL_FOR_SIMPLE_TASK"
  | "FAILED_RUN_WITH_HIGH_COST"
  | "INSUFFICIENT_EXECUTION"
  | "BALANCED_EXECUTION";

export type RecommendationCode =
  | "REDUCE_MODEL_CALLS"
  | "REDUCE_TOOL_CALLS"
  | "DISABLE_UNNECESSARY_TOOLS"
  | "SET_TOKEN_BUDGET"
  | "REDUCE_CONTEXT_SIZE"
  | "USE_SMALLER_MODEL"
  | "ADD_RETRY_LIMIT"
  | "DISABLE_SUB_AGENTS"
  | "CACHE_REPEATED_RESULTS"
  | "USE_DETERMINISTIC_CODE"
  | "SPLIT_TASK_INTO_STAGES"
  | "REVIEW_TASK_PROFILE";

export type EstimatedImpact = "LOW" | "MEDIUM" | "HIGH";

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

export interface TaskProfileResponse {
  id: string;
  taskType: string;
  complexity: string;
  maxModelCalls: number;
  maxToolCalls: number;
  recommendedInputTokens: number;
  recommendedOutputTokens: number;
  recommendedTotalTokens: number;
  recommendedDurationMs: number;
  recommendedCostUsd: string;
  maxRetries: number;
  allowSubAgents: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResponse {
  id: string;
  runId: string;
  balanceScore: number;
  classification: AnalysisClassification;
  scores: {
    costEfficiency: number;
    tokenEfficiency: number;
    toolEfficiency: number;
    modelCallEfficiency: number;
    latencyEfficiency: number;
    retryEfficiency: number;
    autonomyEfficiency: number;
  };
  findings: Array<{
    id: string;
    code: FindingCode;
    severity: FindingSeverity;
    message: string;
    actualValue: string | null;
    expectedValue: string | null;
    explanation: string | null;
  }>;
  recommendations: Array<{
    id: string;
    code: RecommendationCode;
    message: string;
    estimatedImpact: EstimatedImpact;
    relatedFindingCode: FindingCode | null;
  }>;
  estimatedSavings: {
    estimatedCostReductionUsd: string | number;
    estimatedSavingsPercent: string | number;
  };
  analyzedAt: string;
}

export interface SimulatorScenarioResponse {
  key: string;
  name: string;
  description: string;
  expectedSignal: string;
}

export interface SimulatedRunResponse {
  scenarioKey: string;
  scenarioName: string;
  runCreated: boolean;
  analysisCreated: boolean;
  run: {
    id: string;
  };
  analysis: unknown;
}
