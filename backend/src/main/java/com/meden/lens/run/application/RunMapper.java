package com.meden.lens.run.application;

import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.api.RunResponse;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ModelUsageEntity;
import com.meden.lens.run.domain.ToolUsageEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RunMapper {

    public ExecutionRunEntity toEntity(CreateRunRequest request, String idempotencyKey) {
        CreateRunRequest.ExecutionRequest execution = request.execution();
        CreateRunRequest.MetadataRequest metadata = request.metadata();
        long totalTokens = execution.totalTokens() == null
            ? execution.inputTokens() + execution.outputTokens()
            : execution.totalTokens();

        ExecutionRunEntity entity = new ExecutionRunEntity(
            request.externalRunId(),
            idempotencyKey,
            request.agent().name(),
            request.agent().version(),
            request.task().type(),
            request.task().description(),
            request.task().complexity(),
            execution.status(),
            execution.startedAt(),
            execution.completedAt(),
            execution.durationMs(),
            execution.modelCalls(),
            execution.toolCalls(),
            execution.retryCount(),
            execution.subAgentCount(),
            execution.inputTokens(),
            execution.outputTokens(),
            totalTokens,
            execution.estimatedCostUsd(),
            metadata == null ? null : metadata.environment(),
            metadata == null ? null : metadata.team(),
            metadata == null ? null : metadata.purpose()
        );

        List<CreateRunRequest.ModelUsageRequest> models = request.models() == null ? List.of() : request.models();
        models.forEach(model -> entity.addModelUsage(new ModelUsageEntity(
            model.provider(),
            model.model(),
            model.callCount(),
            model.inputTokens(),
            model.outputTokens(),
            model.estimatedCostUsd()
        )));

        List<CreateRunRequest.ToolUsageRequest> tools = request.tools() == null ? List.of() : request.tools();
        tools.forEach(tool -> entity.addToolUsage(new ToolUsageEntity(
            tool.name(),
            tool.callCount(),
            tool.successCount(),
            tool.failureCount()
        )));

        return entity;
    }

    public RunResponse toResponse(ExecutionRunEntity entity, boolean previouslyProcessed) {
        return new RunResponse(
            entity.getId(),
            entity.getExternalRunId(),
            entity.getIdempotencyKey(),
            previouslyProcessed,
            new RunResponse.AgentResponse(entity.getAgentName(), entity.getAgentVersion()),
            new RunResponse.TaskResponse(entity.getTaskType(), entity.getTaskDescription(), entity.getTaskComplexity()),
            new RunResponse.ExecutionResponse(
                entity.getStatus(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getDurationMs(),
                entity.getModelCalls(),
                entity.getToolCalls(),
                entity.getRetryCount(),
                entity.getSubAgentCount(),
                entity.getInputTokens(),
                entity.getOutputTokens(),
                entity.getTotalTokens(),
                entity.getEstimatedCostUsd()
            ),
            entity.getModelUsages()
                .stream()
                .map(this::toModelUsageResponse)
                .toList(),
            entity.getToolUsages()
                .stream()
                .map(this::toToolUsageResponse)
                .toList(),
            new RunResponse.MetadataResponse(entity.getEnvironment(), entity.getTeam(), entity.getPurpose()),
            entity.getCreatedAt()
        );
    }

    private RunResponse.ModelUsageResponse toModelUsageResponse(ModelUsageEntity entity) {
        return new RunResponse.ModelUsageResponse(
            entity.getProvider(),
            entity.getModelName(),
            entity.getCallCount(),
            entity.getInputTokens(),
            entity.getOutputTokens(),
            entity.getEstimatedCostUsd()
        );
    }

    private RunResponse.ToolUsageResponse toToolUsageResponse(ToolUsageEntity entity) {
        return new RunResponse.ToolUsageResponse(
            entity.getToolName(),
            entity.getCallCount(),
            entity.getSuccessCount(),
            entity.getFailureCount()
        );
    }
}
