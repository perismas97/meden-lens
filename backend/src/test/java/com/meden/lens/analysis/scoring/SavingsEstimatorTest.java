package com.meden.lens.analysis.scoring;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SavingsEstimatorTest {

    private final SavingsEstimator estimator = new SavingsEstimator();

    @Test
    void estimatesCostReductionAgainstProfileBudget() {
        EstimatedSavings savings = estimator.estimate(new BigDecimal("1.8400"), new BigDecimal("0.2500"));

        assertThat(savings.estimatedCostReductionUsd()).isEqualByComparingTo(new BigDecimal("1.5900"));
        assertThat(savings.estimatedSavingsPercent()).isEqualByComparingTo(new BigDecimal("86.41"));
    }

    @Test
    void avoidsDivisionByZeroWhenActualCostIsZero() {
        EstimatedSavings savings = estimator.estimate(BigDecimal.ZERO, new BigDecimal("0.2500"));

        assertThat(savings.estimatedCostReductionUsd()).isEqualByComparingTo(new BigDecimal("0.0000"));
        assertThat(savings.estimatedSavingsPercent()).isEqualByComparingTo(new BigDecimal("0.00"));
    }
}
