package com.meden.lens.analysis.scoring;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AutonomyScoreCalculatorTest {

    private final AutonomyScoreCalculator calculator = new AutonomyScoreCalculator();

    @Test
    void allowsSubAgentsWhenProfilePermitsThem() {
        assertThat(calculator.score(true, 4)).isEqualTo(100);
    }

    @Test
    void penalizesSubAgentsWhenProfileDoesNotPermitThem() {
        assertThat(calculator.score(false, 0)).isEqualTo(100);
        assertThat(calculator.score(false, 1)).isEqualTo(50);
        assertThat(calculator.score(false, 2)).isEqualTo(10);
    }
}
