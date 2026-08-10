package com.meden.lens.simulator.application;

import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class SimulatorScenarioCatalog {

    private static final String PROPORTIONAL_DOCUMENT_SUMMARY = "proportional-document-summary";
    private static final String EXCESSIVE_DOCUMENT_SUMMARY = "excessive-document-summary";
    private static final String FAILED_HIGH_COST_RUN = "failed-high-cost-run";
    private static final String VALID_DEEP_RESEARCH = "valid-deep-research";

    private static final List<SimulatorScenarioDefinition> SCENARIOS = List.of(
        new SimulatorScenarioDefinition(
            PROPORTIONAL_DOCUMENT_SUMMARY,
            "Proportional document summary",
            "A successful document summary that stays within the configured task profile budgets.",
            "Expected to be classified as PROPORTIONAL."
        ),
        new SimulatorScenarioDefinition(
            EXCESSIVE_DOCUMENT_SUMMARY,
            "Excessive document summary",
            "A successful document summary with excessive model calls, tool calls, tokens, cost, latency, and retries.",
            "Expected to be classified as HIGHLY_DISPROPORTIONATE."
        ),
        new SimulatorScenarioDefinition(
            FAILED_HIGH_COST_RUN,
            "Failed high-cost run",
            "A failed document summary that still exceeds expected cost and retry limits.",
            "Expected to generate failed-run and retry findings."
        ),
        new SimulatorScenarioDefinition(
            VALID_DEEP_RESEARCH,
            "Valid deep research",
            "A higher-cost deep research run that remains appropriate for a high-complexity task profile.",
            "Expected to show why raw cost is not enough without task context."
        )
    );

    public List<SimulatorScenarioDefinition> list() {
        return SCENARIOS;
    }

    public Optional<SimulatorScenarioDefinition> find(String key) {
        return SCENARIOS.stream()
            .filter(scenario -> scenario.key().equals(key))
            .findFirst();
    }

    public CreateRunRequest createRequest(String scenarioKey) {
        String runSuffix = UUID.randomUUID().toString();

        return switch (scenarioKey) {
            case PROPORTIONAL_DOCUMENT_SUMMARY -> proportionalDocumentSummary(runSuffix);
            case EXCESSIVE_DOCUMENT_SUMMARY -> excessiveDocumentSummary(runSuffix);
            case FAILED_HIGH_COST_RUN -> failedHighCostRun(runSuffix);
            case VALID_DEEP_RESEARCH -> validDeepResearch(runSuffix);
            default -> throw new IllegalArgumentException("Unknown simulator scenario: " + scenarioKey);
        };
    }

    private CreateRunRequest proportionalDocumentSummary(String runSuffix) {
        return new CreateRunRequest(
            "sim-proportional-document-summary-" + runSuffix,
            "sim-proportional-document-summary-" + runSuffix,
            agent("support-document-agent"),
            task(
                TaskType.DOCUMENT_SUMMARY,
                "Summarize a 15-page technical support document",
                Complexity.MEDIUM
            ),
            execution(ExecutionStatus.SUCCESS, "2026-08-07T08:00:00Z", "2026-08-07T08:00:15Z", 15000L, 1, 1, 0, 0, 10000L, 2500L, "0.1800"),
            List.of(model("efficient-summary-model", 1, 10000L, 2500L, "0.1800")),
            List.of(tool("document-reader", 1, 1, 0)),
            metadata("sample-proportional-run")
        );
    }

    private CreateRunRequest excessiveDocumentSummary(String runSuffix) {
        return new CreateRunRequest(
            "sim-excessive-document-summary-" + runSuffix,
            "sim-excessive-document-summary-" + runSuffix,
            agent("support-document-agent"),
            task(
                TaskType.DOCUMENT_SUMMARY,
                "Summarize a 15-page technical support document",
                Complexity.MEDIUM
            ),
            execution(ExecutionStatus.SUCCESS, "2026-08-07T08:00:00Z", "2026-08-07T08:00:42Z", 42000L, 6, 12, 2, 0, 48000L, 9000L, "1.8400"),
            List.of(model("large-reasoning-model", 6, 48000L, 9000L, "1.8400")),
            List.of(tool("web-search", 12, 12, 0)),
            metadata("sample-excessive-run")
        );
    }

    private CreateRunRequest failedHighCostRun(String runSuffix) {
        return new CreateRunRequest(
            "sim-failed-high-cost-run-" + runSuffix,
            "sim-failed-high-cost-run-" + runSuffix,
            agent("support-document-agent"),
            task(
                TaskType.DOCUMENT_SUMMARY,
                "Summarize a technical support document but fail after retries",
                Complexity.MEDIUM
            ),
            execution(ExecutionStatus.FAILED, "2026-08-07T08:00:00Z", "2026-08-07T08:01:00Z", 60000L, 4, 3, 3, 0, 16000L, 4000L, "0.9500"),
            List.of(model("large-reasoning-model", 4, 16000L, 4000L, "0.9500")),
            List.of(
                tool("document-reader", 2, 1, 1),
                tool("web-search", 1, 0, 1)
            ),
            metadata("sample-failed-expensive-run")
        );
    }

    private CreateRunRequest validDeepResearch(String runSuffix) {
        return new CreateRunRequest(
            "sim-valid-deep-research-" + runSuffix,
            "sim-valid-deep-research-" + runSuffix,
            agent("research-agent"),
            task(
                TaskType.DEEP_RESEARCH,
                "Research a technical market and produce a structured report",
                Complexity.HIGH
            ),
            execution(ExecutionStatus.SUCCESS, "2026-08-07T08:00:00Z", "2026-08-07T08:02:30Z", 150000L, 8, 24, 2, 2, 72000L, 18000L, "2.5000"),
            List.of(model("large-research-model", 8, 72000L, 18000L, "2.5000")),
            List.of(
                tool("web-search", 18, 18, 0),
                tool("document-reader", 6, 6, 0)
            ),
            metadata("sample-valid-deep-research")
        );
    }

    private CreateRunRequest.AgentRequest agent(String name) {
        return new CreateRunRequest.AgentRequest(name, "1.0.0");
    }

    private CreateRunRequest.TaskRequest task(TaskType taskType, String description, Complexity complexity) {
        return new CreateRunRequest.TaskRequest(taskType, description, complexity);
    }

    private CreateRunRequest.ExecutionRequest execution(
        ExecutionStatus status,
        String startedAt,
        String completedAt,
        long durationMs,
        int modelCalls,
        int toolCalls,
        int retryCount,
        int subAgentCount,
        long inputTokens,
        long outputTokens,
        String estimatedCostUsd
    ) {
        return new CreateRunRequest.ExecutionRequest(
            status,
            Instant.parse(startedAt),
            Instant.parse(completedAt),
            durationMs,
            modelCalls,
            toolCalls,
            retryCount,
            subAgentCount,
            inputTokens,
            outputTokens,
            null,
            new BigDecimal(estimatedCostUsd)
        );
    }

    private CreateRunRequest.ModelUsageRequest model(
        String model,
        int callCount,
        long inputTokens,
        long outputTokens,
        String estimatedCostUsd
    ) {
        return new CreateRunRequest.ModelUsageRequest(
            "sample-provider",
            model,
            callCount,
            inputTokens,
            outputTokens,
            new BigDecimal(estimatedCostUsd)
        );
    }

    private CreateRunRequest.ToolUsageRequest tool(
        String name,
        int callCount,
        int successCount,
        int failureCount
    ) {
        return new CreateRunRequest.ToolUsageRequest(name, callCount, successCount, failureCount);
    }

    private CreateRunRequest.MetadataRequest metadata(String purpose) {
        return new CreateRunRequest.MetadataRequest("local", "demo", purpose);
    }
}
