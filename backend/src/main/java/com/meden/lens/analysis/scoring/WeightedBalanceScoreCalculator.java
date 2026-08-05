package com.meden.lens.analysis.scoring;

import org.springframework.stereotype.Component;

@Component
public class WeightedBalanceScoreCalculator {

    private final ScoringProperties properties;

    public WeightedBalanceScoreCalculator(ScoringProperties properties) {
        this.properties = properties;
    }

    public int calculate(ScoreBreakdown scores) {
        double weightedScore =
            scores.costEfficiency() * properties.getCostWeight()
                + scores.tokenEfficiency() * properties.getTokenWeight()
                + scores.toolEfficiency() * properties.getToolWeight()
                + scores.modelCallEfficiency() * properties.getModelCallWeight()
                + scores.latencyEfficiency() * properties.getLatencyWeight()
                + scores.retryEfficiency() * properties.getRetryWeight()
                + scores.autonomyEfficiency() * properties.getAutonomyWeight();

        return (int) Math.round(weightedScore);
    }
}
