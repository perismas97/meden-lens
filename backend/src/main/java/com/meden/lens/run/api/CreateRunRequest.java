package com.meden.lens.run.api;

import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.run.domain.InputSizeUnit;
import com.meden.lens.run.domain.OutcomeStatus;
import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CreateRunRequest(
    @Size(max = 160) String externalRunId,
    @Size(max = 200) String idempotencyKey,
    @Valid @NotNull AgentRequest agent,
    @Valid WorkflowRequest workflow,
    @Valid @NotNull TaskRequest task,
    @Valid InputRequest input,
    @Valid @NotNull ExecutionRequest execution,
    List<@Valid ModelUsageRequest> models,
    List<@Valid ToolUsageRequest> tools,
    @Valid MetadataRequest metadata
) {

    public record AgentRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 80) String version
    ) {
    }

    public record WorkflowRequest(
        @NotBlank @Size(max = 120) String key,
        @NotBlank @Size(max = 80) String version,
        @NotBlank @Size(max = 80) String promptVersion
    ) {
    }

    public record TaskRequest(
        @NotNull TaskType type,
        @NotBlank @Size(max = 2000) String description,
        @NotNull Complexity complexity
    ) {
    }

    public record InputRequest(
        @NotNull @PositiveOrZero Long sizeValue,
        @NotNull InputSizeUnit sizeUnit,
        @NotBlank
        @Pattern(regexp = "[0-9a-f]{64}", message = "must be a lowercase SHA-256 fingerprint")
        String fingerprint
    ) {
    }

    public record ExecutionRequest(
        @NotNull ExecutionStatus status,
        @Pattern(regexp = "[0-9a-f]{32}", message = "must be a lowercase 32-character trace ID")
        String traceId,
        OutcomeStatus outcomeStatus,
        @NotNull Instant startedAt,
        @NotNull Instant completedAt,
        @NotNull @PositiveOrZero Long durationMs,
        @NotNull @PositiveOrZero Integer modelCalls,
        @NotNull @PositiveOrZero Integer toolCalls,
        @NotNull @PositiveOrZero Integer retryCount,
        @NotNull @PositiveOrZero Integer subAgentCount,
        @NotNull @PositiveOrZero Long inputTokens,
        @NotNull @PositiveOrZero Long outputTokens,
        @PositiveOrZero Long totalTokens,
        @NotNull @DecimalMin("0.0") BigDecimal estimatedCostUsd
    ) {
    }

    public record ModelUsageRequest(
        @NotBlank @Size(max = 120) String provider,
        @NotBlank @Size(max = 160) String model,
        @Size(max = 160) String modelVersion,
        @NotNull @PositiveOrZero Integer callCount,
        @NotNull @PositiveOrZero Long inputTokens,
        @NotNull @PositiveOrZero Long outputTokens,
        @NotNull @DecimalMin("0.0") BigDecimal estimatedCostUsd
    ) {
    }

    public record ToolUsageRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull @PositiveOrZero Integer callCount,
        @NotNull @PositiveOrZero Integer successCount,
        @NotNull @PositiveOrZero Integer failureCount
    ) {
    }

    public record MetadataRequest(
        @Size(max = 120) String environment,
        @Size(max = 120) String team,
        @Size(max = 200) String purpose
    ) {
    }
}
