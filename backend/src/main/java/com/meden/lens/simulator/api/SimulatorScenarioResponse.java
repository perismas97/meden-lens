package com.meden.lens.simulator.api;

public record SimulatorScenarioResponse(
    String key,
    String name,
    String description,
    String expectedSignal
) {
}
