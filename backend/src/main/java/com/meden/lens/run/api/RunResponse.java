package com.meden.lens.run.api;

import com.meden.lens.run.domain.ExecutionStatus;
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
    AgentResponse agent,
    TaskResponse task,
    ExecutionResponse execution,
    List<ModelUsageResponse> models,
    List<ToolUsageResponse> tools,
    MetadataResponse metadata,
    Instant createdAt
) {

    public record AgentResponse(String name, String version) {
    }

    public record TaskResponse(TaskType type, String description, Complexity complexity) {
    }

    public record ExecutionResponse(
        ExecutionStatus status,
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
