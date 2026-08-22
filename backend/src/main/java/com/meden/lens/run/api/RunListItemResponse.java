package com.meden.lens.run.api;

import com.meden.lens.analysis.domain.AnalysisClassification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RunListItemResponse(
    UUID id,
    String externalRunId,
    RunResponse.AgentResponse agent,
    RunResponse.TaskResponse task,
    RunResponse.ExecutionResponse execution,
    RunResponse.MetadataResponse metadata,
    Instant createdAt,
    AnalysisOverviewResponse analysis
) {

    public record AnalysisOverviewResponse(
        boolean analyzed,
        Integer balanceScore,
        AnalysisClassification classification,
        BigDecimal estimatedCostReductionUsd
    ) {
    }
}
