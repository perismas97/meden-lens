package com.meden.lens.analysis.api;

import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.analysis.domain.EstimatedImpact;
import com.meden.lens.analysis.domain.FindingCode;
import com.meden.lens.analysis.domain.RecommendationCode;
import com.meden.lens.analysis.domain.Severity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnalysisResponse(
    UUID id,
    UUID runId,
    int balanceScore,
    AnalysisClassification classification,
    ScoreResponse scores,
    List<FindingResponse> findings,
    List<RecommendationResponse> recommendations,
    EstimatedSavingsResponse estimatedSavings,
    Instant analyzedAt
) {

    public record ScoreResponse(
        int costEfficiency,
        int tokenEfficiency,
        int toolEfficiency,
        int modelCallEfficiency,
        int latencyEfficiency,
        int retryEfficiency,
        int autonomyEfficiency
    ) {
    }

    public record FindingResponse(
        UUID id,
        FindingCode code,
        Severity severity,
        String message,
        String actualValue,
        String expectedValue,
        String explanation
    ) {
    }

    public record RecommendationResponse(
        UUID id,
        RecommendationCode code,
        String message,
        EstimatedImpact estimatedImpact,
        FindingCode relatedFindingCode
    ) {
    }

    public record EstimatedSavingsResponse(
        BigDecimal estimatedCostReductionUsd,
        BigDecimal estimatedSavingsPercent
    ) {
    }
}
