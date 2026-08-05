package com.meden.lens.analysis.application;

import com.meden.lens.analysis.api.AnalysisResponse;
import com.meden.lens.analysis.domain.AnalysisEntity;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.RecommendationEntity;
import org.springframework.stereotype.Component;

@Component
public class AnalysisMapper {

    public AnalysisResponse toResponse(AnalysisEntity entity) {
        return new AnalysisResponse(
            entity.getId(),
            entity.getExecutionRun().getId(),
            entity.getBalanceScore(),
            entity.getClassification(),
            new AnalysisResponse.ScoreResponse(
                entity.getCostEfficiencyScore(),
                entity.getTokenEfficiencyScore(),
                entity.getToolEfficiencyScore(),
                entity.getModelCallEfficiencyScore(),
                entity.getLatencyEfficiencyScore(),
                entity.getRetryEfficiencyScore(),
                entity.getAutonomyEfficiencyScore()
            ),
            entity.getFindings()
                .stream()
                .map(this::toFindingResponse)
                .toList(),
            entity.getRecommendations()
                .stream()
                .map(this::toRecommendationResponse)
                .toList(),
            new AnalysisResponse.EstimatedSavingsResponse(
                entity.getEstimatedCostReductionUsd(),
                entity.getEstimatedSavingsPercent()
            ),
            entity.getAnalyzedAt()
        );
    }

    private AnalysisResponse.FindingResponse toFindingResponse(FindingEntity entity) {
        return new AnalysisResponse.FindingResponse(
            entity.getId(),
            entity.getCode(),
            entity.getSeverity(),
            entity.getMessage(),
            entity.getActualValue(),
            entity.getExpectedValue(),
            entity.getExplanation()
        );
    }

    private AnalysisResponse.RecommendationResponse toRecommendationResponse(RecommendationEntity entity) {
        return new AnalysisResponse.RecommendationResponse(
            entity.getId(),
            entity.getCode(),
            entity.getMessage(),
            entity.getEstimatedImpact(),
            entity.getRelatedFindingCode()
        );
    }
}
