package com.meden.lens.analysis.scoring;

import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.taskprofile.domain.TaskProfileEntity;
import org.springframework.stereotype.Component;

@Component
public class ScoreBreakdownCalculator {

    private final RatioScoreCalculator ratioScoreCalculator;
    private final AutonomyScoreCalculator autonomyScoreCalculator;

    public ScoreBreakdownCalculator(
        RatioScoreCalculator ratioScoreCalculator,
        AutonomyScoreCalculator autonomyScoreCalculator
    ) {
        this.ratioScoreCalculator = ratioScoreCalculator;
        this.autonomyScoreCalculator = autonomyScoreCalculator;
    }

    public ScoreBreakdown calculate(ExecutionRunEntity run, TaskProfileEntity profile) {
        return new ScoreBreakdown(
            ratioScoreCalculator.score(run.getEstimatedCostUsd(), profile.getRecommendedCostUsd()),
            ratioScoreCalculator.score(run.getTotalTokens(), profile.getRecommendedTotalTokens()),
            ratioScoreCalculator.score(run.getToolCalls(), profile.getMaxToolCalls()),
            ratioScoreCalculator.score(run.getModelCalls(), profile.getMaxModelCalls()),
            ratioScoreCalculator.score(run.getDurationMs(), profile.getRecommendedDurationMs()),
            ratioScoreCalculator.score(run.getRetryCount(), profile.getMaxRetries()),
            autonomyScoreCalculator.score(profile.isAllowSubAgents(), run.getSubAgentCount())
        );
    }
}
