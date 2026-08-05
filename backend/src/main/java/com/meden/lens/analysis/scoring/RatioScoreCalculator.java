package com.meden.lens.analysis.scoring;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class RatioScoreCalculator {

    public int score(long actual, long expected) {
        if (expected == 0) {
            return actual == 0 ? 100 : 10;
        }

        return scoreRatio(BigDecimal.valueOf(actual)
            .divide(BigDecimal.valueOf(expected), 6, RoundingMode.HALF_UP));
    }

    public int score(BigDecimal actual, BigDecimal expected) {
        if (expected.compareTo(BigDecimal.ZERO) == 0) {
            return actual.compareTo(BigDecimal.ZERO) == 0 ? 100 : 10;
        }

        return scoreRatio(actual.divide(expected, 6, RoundingMode.HALF_UP));
    }

    private int scoreRatio(BigDecimal ratio) {
        if (ratio.compareTo(BigDecimal.valueOf(1.0)) <= 0) {
            return 100;
        }
        if (ratio.compareTo(BigDecimal.valueOf(1.25)) <= 0) {
            return 75;
        }
        if (ratio.compareTo(BigDecimal.valueOf(1.5)) <= 0) {
            return 50;
        }
        if (ratio.compareTo(BigDecimal.valueOf(2.0)) <= 0) {
            return 25;
        }
        return 10;
    }
}
