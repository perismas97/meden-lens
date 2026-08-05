package com.meden.lens.analysis.scoring;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WeightedBalanceScoreCalculatorTest {

    @Test
    void calculatesWeightedBalanceScoreFromConfiguredWeights() {
        ScoringProperties properties = new ScoringProperties();
        WeightedBalanceScoreCalculator calculator = new WeightedBalanceScoreCalculator(properties);

        ScoreBreakdown scores = new ScoreBreakdown(10, 10, 10, 10, 10, 25, 100);

        assertThat(calculator.calculate(scores)).isEqualTo(16);
    }
}
