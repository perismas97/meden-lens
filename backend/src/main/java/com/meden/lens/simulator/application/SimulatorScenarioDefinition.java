package com.meden.lens.simulator.application;

public record SimulatorScenarioDefinition(
    String key,
    String name,
    String description,
    String expectedSignal
) {
}
