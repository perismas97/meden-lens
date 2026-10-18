package com.meden.lens.run.api;

import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.run.domain.InputSizeUnit;
import com.meden.lens.run.domain.OutcomeStatus;
import com.meden.lens.run.domain.RunSource;
import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RunResponse(
    UUID id,
    String externalRunId,
    String idempotencyKey,
    boolean previouslyProcessed,
    RunSource source,
    AgentResponse agent,
    WorkflowResponse workflow,
    TaskResponse task,
    InputResponse input,
    ExecutionResponse execution,
    List<ModelUsageResponse> models,
    List<ToolUsageResponse> tools,
    MetadataResponse metadata,
    Instant createdAt
) {

    public record AgentResponse(String name, String version) {
    }

    public record WorkflowResponse(String key, String version, String promptVersion) {
    }

    public record TaskResponse(TaskType type, String description, Complexity complexity) {
    }

    public record InputResponse(long sizeValue, InputSizeUnit sizeUnit, String fingerprint) {
    }

    public record ExecutionResponse(
        ExecutionStatus status,
        String traceId,
        OutcomeStatus outcomeStatus,
        Instant startedAt,
        Instant completedAt,
        long durationMs,
        int modelCalls,
        int toolCalls,
        int retryCount,
        int subAgentCount,
        long inputTokens,
        long outputTokens,
        long totalTokens,
        BigDecimal estimatedCostUsd
    ) {
    }

    public record ModelUsageResponse(
        String provider,
        String model,
        String modelVersion,
        int callCount,
        long inputTokens,
        long outputTokens,
        BigDecimal estimatedCostUsd
    ) {
    }

    public record ToolUsageResponse(
        String name,
        int callCount,
        int successCount,
        int failureCount
    ) {
    }

    public record MetadataResponse(String environment, String team, String purpose) {
    }
}
