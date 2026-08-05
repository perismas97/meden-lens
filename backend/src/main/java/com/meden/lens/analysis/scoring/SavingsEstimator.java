package com.meden.lens.analysis.scoring;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class SavingsEstimator {

    public EstimatedSavings estimate(BigDecimal actualCost, BigDecimal expectedCost) {
        BigDecimal reduction = actualCost.subtract(expectedCost).max(BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP);
        BigDecimal percent = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (actualCost.compareTo(BigDecimal.ZERO) > 0) {
            percent = reduction
                .divide(actualCost, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        }

        return new EstimatedSavings(reduction, percent);
    }
}
