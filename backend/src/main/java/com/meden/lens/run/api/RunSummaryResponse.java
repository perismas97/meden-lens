package com.meden.lens.run.api;

import java.math.BigDecimal;

public record RunSummaryResponse(
    long totalRuns,
    long successfulRuns,
    long failedRuns,
    long analyzedRuns,
    long unanalyzedRuns,
    int averageBalanceScore,
    long proportionalRuns,
    long acceptableRuns,
    long slightlyExcessiveRuns,
    long disproportionateRuns,
    long highlyDisproportionateRuns,
    BigDecimal totalEstimatedCostUsd,
    BigDecimal estimatedCostReductionUsd
) {
}
