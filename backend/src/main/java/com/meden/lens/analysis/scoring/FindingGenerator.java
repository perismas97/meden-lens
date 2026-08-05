package com.meden.lens.analysis.scoring;

import com.meden.lens.analysis.domain.FindingCode;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.Severity;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.taskprofile.domain.TaskProfileEntity;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Component
public class FindingGenerator {

    private final ScoringProperties properties;

    public FindingGenerator(ScoringProperties properties) {
        this.properties = properties;
    }

    public List<FindingEntity> generate(ExecutionRunEntity run, TaskProfileEntity profile) {
        List<FindingEntity> findings = new ArrayList<>();

        addNumericFinding(
            findings,
            FindingCode.EXCESSIVE_MODEL_CALLS,
            run.getModelCalls(),
            profile.getMaxModelCalls(),
            "The run used %s model calls. The configured profile allows no more than %s.",
            "Model calls above the profile ceiling can indicate unnecessary multi-step reasoning or redundant model invocations."
        );

        addNumericFinding(
            findings,
            FindingCode.EXCESSIVE_TOOL_USAGE,
            run.getToolCalls(),
            profile.getMaxToolCalls(),
            "The run used %s tool calls. The configured profile allows no more than %s.",
            "Tool calls above the profile ceiling can increase latency, cost, and workflow complexity."
        );

        addNumericFinding(
            findings,
            FindingCode.TOKEN_BUDGET_EXCEEDED,
            run.getTotalTokens(),
            profile.getRecommendedTotalTokens(),
            "The run consumed %s total tokens. The configured profile recommends %s total tokens.",
            "Total token usage above budget can indicate excessive context, verbose output, or repeated model calls."
        );

        addNumericFinding(
            findings,
            FindingCode.INPUT_CONTEXT_TOO_LARGE,
            run.getInputTokens(),
            profile.getRecommendedInputTokens(),
            "The run used %s input tokens. The configured profile recommends %s input tokens.",
            "Large input context can be valid, but this run exceeded the profile input budget."
        );

        addNumericFinding(
            findings,
            FindingCode.OUTPUT_TOO_VERBOSE,
            run.getOutputTokens(),
            profile.getRecommendedOutputTokens(),
            "The run produced %s output tokens. The configured profile recommends %s output tokens.",
            "Output above budget can indicate verbose responses or insufficient output constraints."
        );

        addDecimalFinding(
            findings,
            FindingCode.COST_DISPROPORTIONATE_TO_TASK,
            run.getEstimatedCostUsd(),
            profile.getRecommendedCostUsd(),
            "The run cost %s USD. The configured profile recommends %s USD.",
            "Cost above the profile budget indicates disproportionate resource consumption for this task category."
        );

        addNumericFinding(
            findings,
            FindingCode.LATENCY_ABOVE_EXPECTED,
            run.getDurationMs(),
            profile.getRecommendedDurationMs(),
            "The run took %s ms. The configured profile recommends %s ms.",
            "Latency above budget can indicate unnecessary tool use, retries, or excessive model calls."
        );

        if (run.getRetryCount() > profile.getMaxRetries()) {
            findings.add(new FindingEntity(
                FindingCode.RETRY_LOOP_DETECTED,
                retrySeverity(run.getRetryCount(), profile.getMaxRetries()),
                "The run used " + run.getRetryCount() + " retries. The configured profile allows no more than "
                    + profile.getMaxRetries() + ".",
                value(run.getRetryCount()),
                value(profile.getMaxRetries()),
                "Retry counts above the profile ceiling can indicate instability or a retry loop."
            ));
        }

        if (!profile.isAllowSubAgents() && run.getSubAgentCount() > 0) {
            findings.add(new FindingEntity(
                FindingCode.UNNECESSARY_SUB_AGENTS,
                run.getSubAgentCount() > 1 ? Severity.HIGH : Severity.MEDIUM,
                "The run used " + run.getSubAgentCount() + " sub-agents although this task profile does not allow sub-agents.",
                value(run.getSubAgentCount()),
                "0",
                "Sub-agent usage increases autonomy and complexity and should be reserved for profiles that allow it."
            ));
        }

        if (profile.getMaxToolCalls() == 0 && run.getToolCalls() > 0) {
            findings.add(new FindingEntity(
                FindingCode.TOOLS_USED_FOR_NON_TOOL_TASK,
                Severity.HIGH,
                "The run used tools even though this task profile expects no external tool usage.",
                value(run.getToolCalls()),
                "0",
                "For this profile, tool usage is treated as a strong policy violation."
            ));
        }

        if (run.getStatus() == ExecutionStatus.FAILED
            && run.getEstimatedCostUsd().compareTo(profile.getRecommendedCostUsd()) > 0) {
            findings.add(new FindingEntity(
                FindingCode.FAILED_RUN_WITH_HIGH_COST,
                failedRunCostSeverity(run.getEstimatedCostUsd(), profile.getRecommendedCostUsd()),
                "The run failed after exceeding the expected cost for this task profile.",
                money(run.getEstimatedCostUsd()),
                money(profile.getRecommendedCostUsd()),
                "Failed runs with above-budget cost deserve attention because they consumed resources without producing a successful outcome."
            ));
        }

        long insufficientExecutionThreshold = Math.round(
            profile.getRecommendedTotalTokens() * properties.getInsufficientExecutionTokenRatio()
        );
        if (run.getStatus() == ExecutionStatus.FAILED && run.getTotalTokens() < insufficientExecutionThreshold) {
            findings.add(new FindingEntity(
                FindingCode.INSUFFICIENT_EXECUTION,
                Severity.MEDIUM,
                "The run failed after consuming very few tokens relative to this task profile.",
                value(run.getTotalTokens()),
                "at least " + insufficientExecutionThreshold,
                "Low resource usage is not treated as efficient when the run failed before doing meaningful work."
            ));
        }

        if (findings.isEmpty()) {
            findings.add(new FindingEntity(
                FindingCode.BALANCED_EXECUTION,
                Severity.INFO,
                "The run stayed within the configured task profile budgets.",
                null,
                null,
                "No proportionality issues were detected by the MVP scoring model."
            ));
        }

        return findings;
    }

    private void addNumericFinding(
        List<FindingEntity> findings,
        FindingCode code,
        long actual,
        long expected,
        String messageTemplate,
        String explanation
    ) {
        if (actual <= expected) {
            return;
        }

        findings.add(new FindingEntity(
            code,
            severity(actual, expected),
            messageTemplate.formatted(value(actual), value(expected)),
            value(actual),
            value(expected),
            explanation
        ));
    }

    private void addDecimalFinding(
        List<FindingEntity> findings,
        FindingCode code,
        BigDecimal actual,
        BigDecimal expected,
        String messageTemplate,
        String explanation
    ) {
        if (actual.compareTo(expected) <= 0) {
            return;
        }

        findings.add(new FindingEntity(
            code,
            severity(actual, expected),
            messageTemplate.formatted(money(actual), money(expected)),
            money(actual),
            money(expected),
            explanation
        ));
    }

    private Severity severity(long actual, long expected) {
        if (expected == 0) {
            return Severity.HIGH;
        }
        return severity(BigDecimal.valueOf(actual), BigDecimal.valueOf(expected));
    }

    private Severity severity(BigDecimal actual, BigDecimal expected) {
        if (expected.compareTo(BigDecimal.ZERO) == 0) {
            return Severity.HIGH;
        }

        BigDecimal ratio = actual.divide(expected, 6, RoundingMode.HALF_UP);
        if (ratio.compareTo(BigDecimal.valueOf(5)) > 0) {
            return Severity.CRITICAL;
        }
        if (ratio.compareTo(BigDecimal.valueOf(2)) > 0) {
            return Severity.HIGH;
        }
        if (ratio.compareTo(BigDecimal.valueOf(1.5)) > 0) {
            return Severity.MEDIUM;
        }
        return Severity.LOW;
    }

    private Severity retrySeverity(int actual, int expected) {
        if ((expected == 0 && actual >= 3) || (expected > 0 && actual > expected * 2)) {
            return Severity.CRITICAL;
        }
        return Severity.HIGH;
    }

    private Severity failedRunCostSeverity(BigDecimal actual, BigDecimal expected) {
        if (expected.compareTo(BigDecimal.ZERO) == 0) {
            return Severity.HIGH;
        }

        BigDecimal ratio = actual.divide(expected, 6, RoundingMode.HALF_UP);
        return ratio.compareTo(BigDecimal.valueOf(2)) > 0 ? Severity.CRITICAL : Severity.HIGH;
    }

    private String value(long value) {
        return Long.toString(value);
    }

    private String money(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP).toPlainString();
    }
}
