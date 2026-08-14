package com.meden.lens.run.application;

import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.analysis.domain.AnalysisEntity;
import com.meden.lens.analysis.infrastructure.AnalysisRepository;
import com.meden.lens.run.api.RunSummaryResponse;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.run.infrastructure.ExecutionRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class RunSummaryService {

    private final ExecutionRunRepository runRepository;
    private final AnalysisRepository analysisRepository;

    public RunSummaryService(
        ExecutionRunRepository runRepository,
        AnalysisRepository analysisRepository
    ) {
        this.runRepository = runRepository;
        this.analysisRepository = analysisRepository;
    }

    @Transactional(readOnly = true)
    public RunSummaryResponse getSummary() {
        List<ExecutionRunEntity> runs = runRepository.findAll();
        List<AnalysisEntity> analyses = analysisRepository.findAll();

        long analyzedRuns = analyses.size();

        return new RunSummaryResponse(
            runs.size(),
            countByStatus(runs, ExecutionStatus.SUCCESS),
            countByStatus(runs, ExecutionStatus.FAILED),
            analyzedRuns,
            runs.size() - analyzedRuns,
            averageBalanceScore(analyses),
            countByClassification(analyses, AnalysisClassification.PROPORTIONAL),
            countByClassification(analyses, AnalysisClassification.ACCEPTABLE),
            countByClassification(analyses, AnalysisClassification.SLIGHTLY_EXCESSIVE),
            countByClassification(analyses, AnalysisClassification.DISPROPORTIONATE),
            countByClassification(analyses, AnalysisClassification.HIGHLY_DISPROPORTIONATE),
            sumEstimatedCostUsd(runs),
            sumEstimatedCostReductionUsd(analyses)
        );
    }

    private long countByStatus(List<ExecutionRunEntity> runs, ExecutionStatus status) {
        return runs.stream()
            .filter(run -> run.getStatus() == status)
            .count();
    }

    private int averageBalanceScore(List<AnalysisEntity> analyses) {
        return (int) Math.round(analyses.stream()
            .mapToInt(AnalysisEntity::getBalanceScore)
            .average()
            .orElse(0));
    }

    private long countByClassification(
        List<AnalysisEntity> analyses,
        AnalysisClassification classification
    ) {
        return analyses.stream()
            .filter(analysis -> analysis.getClassification() == classification)
            .count();
    }

    private BigDecimal sumEstimatedCostUsd(List<ExecutionRunEntity> runs) {
        return runs.stream()
            .map(ExecutionRunEntity::getEstimatedCostUsd)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal sumEstimatedCostReductionUsd(List<AnalysisEntity> analyses) {
        return analyses.stream()
            .map(AnalysisEntity::getEstimatedCostReductionUsd)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
    }
}
