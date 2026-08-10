package com.meden.lens.simulator.api;

import com.meden.lens.simulator.application.SimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/simulator/scenarios")
public class SimulatorController {

    private final SimulatorService simulatorService;

    public SimulatorController(SimulatorService simulatorService) {
        this.simulatorService = simulatorService;
    }

    @GetMapping
    @Operation(summary = "List simulator scenarios")
    public List<SimulatorScenarioResponse> listScenarios() {
        return simulatorService.listScenarios();
    }

    @PostMapping("/{scenarioKey}")
    @Operation(summary = "Create and analyze a sample execution run")
    public ResponseEntity<SimulatedRunResponse> simulateScenario(@PathVariable String scenarioKey) {
        SimulatedRunResponse response = simulatorService.simulate(scenarioKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
