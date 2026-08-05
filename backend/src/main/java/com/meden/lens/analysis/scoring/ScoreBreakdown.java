package com.meden.lens.analysis.scoring;

public record ScoreBreakdown(
    int costEfficiency,
    int tokenEfficiency,
    int toolEfficiency,
    int modelCallEfficiency,
    int latencyEfficiency,
    int retryEfficiency,
    int autonomyEfficiency
) {
}
