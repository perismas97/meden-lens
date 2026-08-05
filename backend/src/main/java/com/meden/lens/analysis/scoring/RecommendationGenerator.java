package com.meden.lens.analysis.scoring;

import com.meden.lens.analysis.domain.EstimatedImpact;
import com.meden.lens.analysis.domain.FindingCode;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.RecommendationCode;
import com.meden.lens.analysis.domain.RecommendationEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class RecommendationGenerator {

    public List<RecommendationEntity> generate(List<FindingEntity> findings) {
        List<RecommendationEntity> recommendations = new ArrayList<>();
        Set<String> emitted = new LinkedHashSet<>();

        findings.forEach(finding -> addRecommendationsFor(finding, recommendations, emitted));

        return recommendations;
    }

    private void addRecommendationsFor(
        FindingEntity finding,
        List<RecommendationEntity> recommendations,
        Set<String> emitted
    ) {
        switch (finding.getCode()) {
            case EXCESSIVE_MODEL_CALLS -> add(
                recommendations,
                emitted,
                RecommendationCode.REDUCE_MODEL_CALLS,
                "Reduce redundant model calls or merge repeated reasoning steps into a smaller number of planned calls.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case EXCESSIVE_TOOL_USAGE -> add(
                recommendations,
                emitted,
                RecommendationCode.REDUCE_TOOL_CALLS,
                "Review tool selection and remove tool calls that are not required for this task profile.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case TOKEN_BUDGET_EXCEEDED -> add(
                recommendations,
                emitted,
                RecommendationCode.SET_TOKEN_BUDGET,
                "Set an explicit token budget for this task type and truncate or summarize context before execution.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case INPUT_CONTEXT_TOO_LARGE -> add(
                recommendations,
                emitted,
                RecommendationCode.REDUCE_CONTEXT_SIZE,
                "Reduce input context size by filtering irrelevant context or adding a pre-summarization step.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case OUTPUT_TOO_VERBOSE -> add(
                recommendations,
                emitted,
                RecommendationCode.SET_TOKEN_BUDGET,
                "Constrain output length with a clearer response format or maximum output token budget.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case COST_DISPROPORTIONATE_TO_TASK -> add(
                recommendations,
                emitted,
                RecommendationCode.USE_SMALLER_MODEL,
                "Evaluate whether a lower-cost model can satisfy this task profile without reducing acceptable output quality.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case LATENCY_ABOVE_EXPECTED -> add(
                recommendations,
                emitted,
                RecommendationCode.SPLIT_TASK_INTO_STAGES,
                "Review the workflow for blocking tool calls, retries, or long reasoning chains that increase latency.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case RETRY_LOOP_DETECTED -> add(
                recommendations,
                emitted,
                RecommendationCode.ADD_RETRY_LIMIT,
                "Add a stricter retry limit and capture retry causes so failure loops can be fixed.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case UNNECESSARY_SUB_AGENTS -> add(
                recommendations,
                emitted,
                RecommendationCode.DISABLE_SUB_AGENTS,
                "Disable sub-agents for this task profile unless a higher-complexity profile is selected.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case TOOLS_USED_FOR_NON_TOOL_TASK -> add(
                recommendations,
                emitted,
                RecommendationCode.DISABLE_UNNECESSARY_TOOLS,
                "Disable external tools for task profiles that should be handled without retrieval or tool execution.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case FAILED_RUN_WITH_HIGH_COST -> add(
                recommendations,
                emitted,
                RecommendationCode.ADD_RETRY_LIMIT,
                "Stop failed executions earlier and require explicit escalation before another expensive retry.",
                EstimatedImpact.HIGH,
                finding.getCode()
            );
            case INSUFFICIENT_EXECUTION -> add(
                recommendations,
                emitted,
                RecommendationCode.REVIEW_TASK_PROFILE,
                "Review failure handling and task profile selection because the run failed before meaningful execution.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case PREMIUM_MODEL_FOR_SIMPLE_TASK -> add(
                recommendations,
                emitted,
                RecommendationCode.USE_SMALLER_MODEL,
                "Use a smaller or deterministic implementation for simple task profiles.",
                EstimatedImpact.MEDIUM,
                finding.getCode()
            );
            case BALANCED_EXECUTION -> {
            }
        }
    }

    private void add(
        List<RecommendationEntity> recommendations,
        Set<String> emitted,
        RecommendationCode code,
        String message,
        EstimatedImpact impact,
        FindingCode relatedFindingCode
    ) {
        String key = code.name() + ":" + relatedFindingCode.name();
        if (emitted.add(key)) {
            recommendations.add(new RecommendationEntity(code, message, impact, relatedFindingCode));
        }
    }
}
