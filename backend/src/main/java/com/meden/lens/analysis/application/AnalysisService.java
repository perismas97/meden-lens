package com.meden.lens.analysis.application;

import com.meden.lens.analysis.api.AnalysisResponse;
import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.analysis.domain.AnalysisEntity;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.RecommendationEntity;
import com.meden.lens.analysis.infrastructure.AnalysisRepository;
import com.meden.lens.analysis.scoring.ClassificationResolver;
import com.meden.lens.analysis.scoring.EstimatedSavings;
import com.meden.lens.analysis.scoring.FindingGenerator;
import com.meden.lens.analysis.scoring.RecommendationGenerator;
import com.meden.lens.analysis.scoring.SavingsEstimator;
import com.meden.lens.analysis.scoring.ScoreBreakdown;
import com.meden.lens.analysis.scoring.ScoreBreakdownCalculator;
import com.meden.lens.analysis.scoring.WeightedBalanceScoreCalculator;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.infrastructure.ExecutionRunRepository;
import com.meden.lens.shared.errors.ResourceNotFoundException;
import com.meden.lens.taskprofile.domain.TaskProfileEntity;
import com.meden.lens.taskprofile.infrastructure.TaskProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AnalysisService {

    private final AnalysisRepository analysisRepository;
    private final ExecutionRunRepository runRepository;
    private final TaskProfileRepository taskProfileRepository;
    private final ScoreBreakdownCalculator scoreBreakdownCalculator;
    private final WeightedBalanceScoreCalculator weightedBalanceScoreCalculator;
    private final FindingGenerator findingGenerator;
    private final RecommendationGenerator recommendationGenerator;
    private final SavingsEstimator savingsEstimator;
    private final ClassificationResolver classificationResolver;
    private final AnalysisMapper mapper;

    public AnalysisService(
        AnalysisRepository analysisRepository,
        ExecutionRunRepository runRepository,
        TaskProfileRepository taskProfileRepository,
        ScoreBreakdownCalculator scoreBreakdownCalculator,
        WeightedBalanceScoreCalculator weightedBalanceScoreCalculator,
        FindingGenerator findingGenerator,
        RecommendationGenerator recommendationGenerator,
        SavingsEstimator savingsEstimator,
        ClassificationResolver classificationResolver,
        AnalysisMapper mapper
    ) {
        this.analysisRepository = analysisRepository;
        this.runRepository = runRepository;
        this.taskProfileRepository = taskProfileRepository;
        this.scoreBreakdownCalculator = scoreBreakdownCalculator;
        this.weightedBalanceScoreCalculator = weightedBalanceScoreCalculator;
        this.findingGenerator = findingGenerator;
        this.recommendationGenerator = recommendationGenerator;
        this.savingsEstimator = savingsEstimator;
        this.classificationResolver = classificationResolver;
        this.mapper = mapper;
    }

    @Transactional
    public AnalysisResult analyze(UUID runId) {
        return analysisRepository.findByExecutionRunId(runId)
            .map(existingAnalysis -> new AnalysisResult(mapper.toResponse(existingAnalysis), false))
            .orElseGet(() -> createAnalysis(runId));
    }

    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(UUID runId) {
        return analysisRepository.findByExecutionRunId(runId)
            .map(mapper::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("Analysis was not found for this execution run."));
    }

    private AnalysisResult createAnalysis(UUID runId) {
        ExecutionRunEntity run = runRepository.findById(runId)
            .orElseThrow(() -> new ResourceNotFoundException("Execution run was not found."));

        TaskProfileEntity profile = taskProfileRepository.findByTaskType(run.getTaskType())
            .orElseThrow(() -> new ResourceNotFoundException("Task profile was not found for this execution run."));

        ScoreBreakdown scores = scoreBreakdownCalculator.calculate(run, profile);
        List<FindingEntity> findings = findingGenerator.generate(run, profile);
        int balanceScore = weightedBalanceScoreCalculator.calculate(scores);
        AnalysisClassification classification = classificationResolver.resolve(
            balanceScore,
            run.getStatus(),
            findings
        );
        EstimatedSavings estimatedSavings = savingsEstimator.estimate(
            run.getEstimatedCostUsd(),
            profile.getRecommendedCostUsd()
        );

        AnalysisEntity analysis = new AnalysisEntity(
            run,
            balanceScore,
            classification,
            scores.costEfficiency(),
            scores.tokenEfficiency(),
            scores.toolEfficiency(),
            scores.modelCallEfficiency(),
            scores.latencyEfficiency(),
            scores.retryEfficiency(),
            scores.autonomyEfficiency(),
            estimatedSavings.estimatedCostReductionUsd(),
            estimatedSavings.estimatedSavingsPercent()
        );

        findings.forEach(analysis::addFinding);
        List<RecommendationEntity> recommendations = recommendationGenerator.generate(findings);
        recommendations.forEach(analysis::addRecommendation);

        AnalysisEntity savedAnalysis = analysisRepository.saveAndFlush(analysis);
        return new AnalysisResult(mapper.toResponse(savedAnalysis), true);
    }
}
