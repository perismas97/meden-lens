package com.meden.lens.analysis.application;

import com.meden.lens.analysis.api.AnalysisResponse;

public record AnalysisResult(
    AnalysisResponse response,
    boolean newlyCreated
) {
}
