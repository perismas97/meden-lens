package com.meden.lens.simulator.api;

import com.meden.lens.analysis.api.AnalysisResponse;
import com.meden.lens.run.api.RunResponse;

public record SimulatedRunResponse(
    String scenarioKey,
    String scenarioName,
    boolean runCreated,
    boolean analysisCreated,
    RunResponse run,
    AnalysisResponse analysis
) {
}
