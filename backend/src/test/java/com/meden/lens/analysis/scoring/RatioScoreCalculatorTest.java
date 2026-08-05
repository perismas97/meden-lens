package com.meden.lens.analysis.scoring;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RatioScoreCalculatorTest {

    private final RatioScoreCalculator calculator = new RatioScoreCalculator();

    @Test
    void appliesUniversalPenaltyCurve() {
        assertThat(calculator.score(100, 100)).isEqualTo(100);
        assertThat(calculator.score(125, 100)).isEqualTo(75);
        assertThat(calculator.score(150, 100)).isEqualTo(50);
        assertThat(calculator.score(200, 100)).isEqualTo(25);
        assertThat(calculator.score(201, 100)).isEqualTo(10);
    }

    @Test
    void handlesZeroExpectedValues() {
        assertThat(calculator.score(0, 0)).isEqualTo(100);
        assertThat(calculator.score(1, 0)).isEqualTo(10);
        assertThat(calculator.score(BigDecimal.ZERO, BigDecimal.ZERO)).isEqualTo(100);
        assertThat(calculator.score(new BigDecimal("0.0100"), BigDecimal.ZERO)).isEqualTo(10);
    }
}
