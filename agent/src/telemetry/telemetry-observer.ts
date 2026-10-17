import { randomBytes } from "node:crypto";

import type { ProviderTokenUsage } from "../model/agent-model.ts";
import type {
  AgentExecutionStatus,
  AgentOutcomeStatus,
  NormalizedAgentTelemetry,
} from "./normalized-agent-telemetry.ts";

interface TelemetryObserverOptions {
  workflow: string;
  taskCategory: string;
  modelName: string;
  clock?: TelemetryClock;
  traceIdFactory?: () => string;
}

interface TelemetryClock {
  now(): Date;
  monotonicNow(): number;
}

interface CompleteTelemetryOptions {
  executionStatus: AgentExecutionStatus;
  outcomeStatus: AgentOutcomeStatus;
  errorType?: string;
}

const systemClock: TelemetryClock = {
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

export class TelemetryObserver {
  private readonly workflow: string;
  private readonly taskCategory: string;
  private readonly modelName: string;
  private readonly clock: TelemetryClock;
  private readonly traceId: string;
  private readonly startedAt: Date;
  private readonly monotonicStartedAt: number;
  private inputTokens = 0;
  private outputTokens = 0;
  private modelCalls = 0;
  private modelCallsWithoutUsage = 0;
  private toolCalls = 0;
  private toolSuccesses = 0;
  private toolFailures = 0;
  private retryCount = 0;

  constructor(options: TelemetryObserverOptions) {
    this.workflow = options.workflow;
    this.taskCategory = options.taskCategory;
    this.modelName = options.modelName;
    this.clock = options.clock ?? systemClock;
    this.traceId = (options.traceIdFactory ?? createTraceId)();
    this.startedAt = this.clock.now();
    this.monotonicStartedAt = this.clock.monotonicNow();
  }

  async observeModelCall<T>(
    operation: () => Promise<T>,
    usageSelector: (result: T) => ProviderTokenUsage | undefined,
  ): Promise<T> {
    this.modelCalls += 1;

    try {
      const result = await operation();
      const usage = usageSelector(result);
      if (isCompleteUsage(usage)) {
        this.inputTokens += usage.input_tokens;
        this.outputTokens += usage.output_tokens;
      } else {
        this.modelCallsWithoutUsage += 1;
      }
      return result;
    } catch (error) {
      this.modelCallsWithoutUsage += 1;
      throw error;
    }
  }

  async observeToolCall<T>(operation: () => Promise<T>): Promise<T> {
    this.toolCalls += 1;

    try {
      const result = await operation();
      this.toolSuccesses += 1;
      return result;
    } catch (error) {
      this.toolFailures += 1;
      throw error;
    }
  }

  recordRetry(): void {
    this.retryCount += 1;
  }

  complete(options: CompleteTelemetryOptions): NormalizedAgentTelemetry {
    const completedAt = this.clock.now();
    const durationMs = Math.max(
      0,
      Math.round(this.clock.monotonicNow() - this.monotonicStartedAt),
    );
    const tokenUsageComplete =
      this.modelCalls > 0 && this.modelCallsWithoutUsage === 0;

    return {
      schemaVersion: 1,
      traceId: this.traceId,
      workflow: this.workflow,
      taskCategory: this.taskCategory,
      modelProvider: "ollama",
      modelName: this.modelName,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      executionStatus: options.executionStatus,
      outcomeStatus: options.outcomeStatus,
      ...(options.errorType ? { errorType: options.errorType } : {}),
      inputTokens: tokenUsageComplete ? this.inputTokens : null,
      outputTokens: tokenUsageComplete ? this.outputTokens : null,
      totalTokens: tokenUsageComplete ? this.inputTokens + this.outputTokens : null,
      modelCalls: this.modelCalls,
      toolCalls: this.toolCalls,
      toolSuccesses: this.toolSuccesses,
      toolFailures: this.toolFailures,
      retryCount: this.retryCount,
      subAgentCount: 0,
      actualCostUsd: 0,
      completenessWarnings: tokenUsageComplete ? [] : ["TOKEN_USAGE_MISSING"],
    };
  }
}

function createTraceId(): string {
  return randomBytes(16).toString("hex");
}

function isCompleteUsage(
  usage: ProviderTokenUsage | undefined,
): usage is ProviderTokenUsage {
  return (
    usage !== undefined &&
    Number.isInteger(usage.input_tokens) &&
    Number.isInteger(usage.output_tokens) &&
    Number.isInteger(usage.total_tokens)
  );
}
