package com.meden.lens.run.api;

import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.run.domain.InputSizeUnit;
import com.meden.lens.run.domain.RunSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RunListItemResponse(
    UUID id,
    String externalRunId,
    RunSource source,
    RunResponse.AgentResponse agent,
    RunResponse.WorkflowResponse workflow,
    RunResponse.TaskResponse task,
    InputOverviewResponse input,
    RunResponse.ExecutionResponse execution,
    RunResponse.MetadataResponse metadata,
    Instant createdAt,
    AnalysisOverviewResponse analysis
) {

    public record InputOverviewResponse(long sizeValue, InputSizeUnit sizeUnit) {
    }

    public record AnalysisOverviewResponse(
        boolean analyzed,
        Integer balanceScore,
        AnalysisClassification classification,
        BigDecimal estimatedCostReductionUsd
    ) {
    }
}
