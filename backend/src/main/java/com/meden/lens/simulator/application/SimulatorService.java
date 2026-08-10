package com.meden.lens.simulator.application;

import com.meden.lens.analysis.application.AnalysisResult;
import com.meden.lens.analysis.application.AnalysisService;
import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.api.RunResponse;
import com.meden.lens.run.application.RunService;
import com.meden.lens.shared.errors.ResourceNotFoundException;
import com.meden.lens.simulator.api.SimulatedRunResponse;
import com.meden.lens.simulator.api.SimulatorScenarioResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SimulatorService {

    private final SimulatorScenarioCatalog scenarioCatalog;
    private final RunService runService;
    private final AnalysisService analysisService;

    public SimulatorService(
        SimulatorScenarioCatalog scenarioCatalog,
        RunService runService,
        AnalysisService analysisService
    ) {
        this.scenarioCatalog = scenarioCatalog;
        this.runService = runService;
        this.analysisService = analysisService;
    }

    public List<SimulatorScenarioResponse> listScenarios() {
        return scenarioCatalog.list()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public SimulatedRunResponse simulate(String scenarioKey) {
        SimulatorScenarioDefinition scenario = scenarioCatalog.find(scenarioKey)
            .orElseThrow(() -> new ResourceNotFoundException("Simulator scenario was not found."));

        CreateRunRequest request = scenarioCatalog.createRequest(scenario.key());
        RunResponse run = runService.createRun(request, null);
        AnalysisResult analysis = analysisService.analyze(run.id());

        return new SimulatedRunResponse(
            scenario.key(),
            scenario.name(),
            !run.previouslyProcessed(),
            analysis.newlyCreated(),
            run,
            analysis.response()
        );
    }

    private SimulatorScenarioResponse toResponse(SimulatorScenarioDefinition scenario) {
        return new SimulatorScenarioResponse(
            scenario.key(),
            scenario.name(),
            scenario.description(),
            scenario.expectedSignal()
        );
    }
}
