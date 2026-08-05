package com.meden.lens.analysis.scoring;

import java.math.BigDecimal;

public record EstimatedSavings(
    BigDecimal estimatedCostReductionUsd,
    BigDecimal estimatedSavingsPercent
) {
}
