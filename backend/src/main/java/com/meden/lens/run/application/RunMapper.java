package com.meden.lens.run.application;

import com.meden.lens.analysis.domain.AnalysisEntity;
import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.api.RunListItemResponse;
import com.meden.lens.run.api.RunResponse;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ModelUsageEntity;
import com.meden.lens.run.domain.OutcomeStatus;
import com.meden.lens.run.domain.RunSource;
import com.meden.lens.run.domain.ToolUsageEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RunMapper {

    public ExecutionRunEntity toEntity(
        CreateRunRequest request,
        String idempotencyKey,
        RunSource source
    ) {
        CreateRunRequest.ExecutionRequest execution = request.execution();
        CreateRunRequest.MetadataRequest metadata = request.metadata();
        CreateRunRequest.WorkflowRequest workflow = request.workflow();
        CreateRunRequest.InputRequest input = request.input();
        long totalTokens = execution.totalTokens() == null
            ? execution.inputTokens() + execution.outputTokens()
            : execution.totalTokens();

        ExecutionRunEntity entity = new ExecutionRunEntity(
            request.externalRunId(),
            idempotencyKey,
            source,
            request.agent().name(),
            request.agent().version(),
            workflow == null ? null : workflow.key(),
            workflow == null ? null : workflow.version(),
            workflow == null ? null : workflow.promptVersion(),
            request.task().type(),
            request.task().description(),
            request.task().complexity(),
            input == null ? null : input.sizeValue(),
            input == null ? null : input.sizeUnit(),
            input == null ? null : input.fingerprint(),
            execution.status(),
            execution.traceId(),
            execution.outcomeStatus() == null
                ? OutcomeStatus.NOT_EVALUATED
                : execution.outcomeStatus(),
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
            model.modelVersion(),
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
            entity.getSource(),
            new RunResponse.AgentResponse(entity.getAgentName(), entity.getAgentVersion()),
            toWorkflowResponse(entity),
            new RunResponse.TaskResponse(entity.getTaskType(), entity.getTaskDescription(), entity.getTaskComplexity()),
            toInputResponse(entity),
            new RunResponse.ExecutionResponse(
                entity.getStatus(),
                entity.getTraceId(),
                entity.getOutcomeStatus(),
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

    public RunListItemResponse toListItemResponse(ExecutionRunEntity entity, AnalysisEntity analysis) {
        return new RunListItemResponse(
            entity.getId(),
            entity.getExternalRunId(),
            entity.getSource(),
            new RunResponse.AgentResponse(entity.getAgentName(), entity.getAgentVersion()),
            toWorkflowResponse(entity),
            new RunResponse.TaskResponse(entity.getTaskType(), entity.getTaskDescription(), entity.getTaskComplexity()),
            toInputOverviewResponse(entity),
            new RunResponse.ExecutionResponse(
                entity.getStatus(),
                entity.getTraceId(),
                entity.getOutcomeStatus(),
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
            new RunResponse.MetadataResponse(entity.getEnvironment(), entity.getTeam(), entity.getPurpose()),
            entity.getCreatedAt(),
            toAnalysisOverviewResponse(analysis)
        );
    }

    private RunListItemResponse.AnalysisOverviewResponse toAnalysisOverviewResponse(AnalysisEntity analysis) {
        if (analysis == null) {
            return new RunListItemResponse.AnalysisOverviewResponse(false, null, null, null);
        }

        return new RunListItemResponse.AnalysisOverviewResponse(
            true,
            analysis.getBalanceScore(),
            analysis.getClassification(),
            analysis.getEstimatedCostReductionUsd()
        );
    }

    private RunResponse.ModelUsageResponse toModelUsageResponse(ModelUsageEntity entity) {
        return new RunResponse.ModelUsageResponse(
            entity.getProvider(),
            entity.getModelName(),
            entity.getModelVersion(),
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

    private RunResponse.WorkflowResponse toWorkflowResponse(ExecutionRunEntity entity) {
        if (entity.getWorkflowKey() == null) {
            return null;
        }

        return new RunResponse.WorkflowResponse(
            entity.getWorkflowKey(),
            entity.getWorkflowVersion(),
            entity.getPromptVersion()
        );
    }

    private RunResponse.InputResponse toInputResponse(ExecutionRunEntity entity) {
        if (entity.getInputSizeValue() == null) {
            return null;
        }

        return new RunResponse.InputResponse(
            entity.getInputSizeValue(),
            entity.getInputSizeUnit(),
            entity.getInputFingerprint()
        );
    }

    private RunListItemResponse.InputOverviewResponse toInputOverviewResponse(
        ExecutionRunEntity entity
    ) {
        if (entity.getInputSizeValue() == null) {
            return null;
        }

        return new RunListItemResponse.InputOverviewResponse(
            entity.getInputSizeValue(),
            entity.getInputSizeUnit()
        );
    }
}
