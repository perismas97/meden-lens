# Scoring Model

This document defines the MVP scoring model for Meden Lens.

The scoring model must stay deterministic, explainable, and easy to test. The goal is not to judge whether an AI result was high quality. The goal is to judge whether the resources used by an AI execution were proportional to the task profile that was declared for that execution.

## Core Idea

Every analysis compares two things:

```text
actual run metrics vs expected task profile budgets
```

Example:

```text
taskType: DOCUMENT_SUMMARY
actualTotalTokens: 57,000
recommendedTotalTokens: 15,000

ratio = 57,000 / 15,000 = 3.8
```

The higher the ratio, the more the run exceeded the configured task profile budget.

## MVP Metric Interpretation

For the MVP, all numeric efficiency metrics are treated as budget or ceiling metrics:

```text
actual <= expected/max -> score 100
actual > expected/max  -> penalty
```

This means a lower value is not automatically penalized. If a document summary uses fewer tokens than the configured budget and still succeeds, it should receive a high efficiency score for that metric.

The only MVP exception is failed under-execution, described below.

## Metrics

The MVP calculates these supporting scores:

```text
costEfficiency
tokenEfficiency
toolEfficiency
modelCallEfficiency
latencyEfficiency
retryEfficiency
autonomyEfficiency
```

The final score is called:

```text
balanceScore
```

## Universal Ratio Penalty Curve

For MVP simplicity and explainability, all numeric ceiling metrics use the same penalty curve.

```text
ratio <= 1.0  -> 100
ratio <= 1.25 -> 75
ratio <= 1.5  -> 50
ratio <= 2.0  -> 25
ratio > 2.0   -> 10
```

This curve is intentionally strict. Meden Lens is designed to detect excess, so once a run is more than 2x over a configured budget, that metric should be treated as strongly inefficient.

Metric-specific differences are handled through weights and findings, not through separate curves in the MVP.

## Numeric Metric Inputs

The scoring engine maps metrics like this:

| Score | Actual value | Expected value |
| --- | --- | --- |
| costEfficiency | `execution.estimatedCostUsd` | `taskProfile.recommendedCostUsd` |
| tokenEfficiency | `execution.totalTokens` | `taskProfile.recommendedTotalTokens` |
| toolEfficiency | `execution.toolCalls` | `taskProfile.maxToolCalls` |
| modelCallEfficiency | `execution.modelCalls` | `taskProfile.maxModelCalls` |
| latencyEfficiency | `execution.durationMs` | `taskProfile.recommendedDurationMs` |
| retryEfficiency | `execution.retryCount` | `taskProfile.maxRetries` |

## Zero Expected Value Handling

Some task profiles intentionally set a ceiling to zero.

Example:

```text
SIMPLE_TRANSFORMATION.maxToolCalls = 0
SIMPLE_TRANSFORMATION.maxRetries = 0
```

Division by zero is not allowed. The scoring rule is:

```text
if expected == 0 and actual == 0:
    score = 100

if expected == 0 and actual > 0:
    score = 10
```

This represents a strong violation of the profile. For example, a simple deterministic transformation should not use external tools unless the task profile explicitly allows them.

## Autonomy Score

Autonomy is not ratio-based in the MVP because the task profile uses a boolean:

```text
allowSubAgents
```

The MVP rule is:

```text
if allowSubAgents == true:
    autonomyEfficiency = 100

if allowSubAgents == false and subAgentCount == 0:
    autonomyEfficiency = 100

if allowSubAgents == false and subAgentCount == 1:
    autonomyEfficiency = 50

if allowSubAgents == false and subAgentCount > 1:
    autonomyEfficiency = 10
```

If sub-agents are not allowed but were used, the analysis should generate:

```text
UNNECESSARY_SUB_AGENTS
```

## Failed Under-Execution

Lower resource usage is generally good only when the run succeeds.

A failed run that consumed very few resources may indicate that the agent stopped too early, misclassified the task, or failed before doing meaningful work.

The MVP introduces:

```text
INSUFFICIENT_EXECUTION
```

Rule:

```text
if execution.status == FAILED
and execution.totalTokens < recommendedTotalTokens * insufficientExecutionTokenRatio:
    finding = INSUFFICIENT_EXECUTION
```

Default tunable constant:

```text
insufficientExecutionTokenRatio = 0.25
```

This constant must be configurable in the scoring engine and should not be buried as an unexplained magic number.

## Failed Run With High Cost

The opposite failure mode is also important: a run can fail after consuming excessive resources.

The MVP rule is:

```text
if execution.status == FAILED
and execution.estimatedCostUsd > taskProfile.recommendedCostUsd:
    finding = FAILED_RUN_WITH_HIGH_COST
```

This finding should usually have high severity because the run produced no successful outcome while exceeding the expected cost.

## Weighted Balance Score

The base `balanceScore` is a weighted average of supporting scores.

Default weights:

```text
costEfficiency:      0.25
tokenEfficiency:     0.20
toolEfficiency:      0.15
modelCallEfficiency: 0.15
latencyEfficiency:   0.10
retryEfficiency:     0.10
autonomyEfficiency:  0.05
```

The weights must sum to 1.0.

All weights must be configurable from a single scoring configuration object or configuration file. They should not be duplicated across the codebase.

## Base Classification

The weighted score maps to a base classification:

```text
85-100 -> PROPORTIONAL
70-84  -> ACCEPTABLE
50-69  -> SLIGHTLY_EXCESSIVE
30-49  -> DISPROPORTIONATE
0-29   -> HIGHLY_DISPROPORTIONATE
```

## Classification Caps

The weighted average is not the whole decision. Some findings are serious enough that they should cap the final classification.

MVP caps:

```text
if any CRITICAL finding exists:
    final classification cannot be better than DISPROPORTIONATE

if execution.status == FAILED:
    final classification cannot be better than SLIGHTLY_EXCESSIVE
```

These caps prevent a severe localized problem from being hidden by a decent average score.

## Initial Finding Codes

The MVP should support these findings:

```text
EXCESSIVE_MODEL_CALLS
EXCESSIVE_TOOL_USAGE
TOKEN_BUDGET_EXCEEDED
INPUT_CONTEXT_TOO_LARGE
OUTPUT_TOO_VERBOSE
COST_DISPROPORTIONATE_TO_TASK
LATENCY_ABOVE_EXPECTED
RETRY_LOOP_DETECTED
UNNECESSARY_SUB_AGENTS
TOOLS_USED_FOR_NON_TOOL_TASK
PREMIUM_MODEL_FOR_SIMPLE_TASK
FAILED_RUN_WITH_HIGH_COST
INSUFFICIENT_EXECUTION
BALANCED_EXECUTION
```

Each finding must include:

```text
code
severity
message
actualValue
expectedValue
optional explanation
```

## Initial Recommendation Codes

Recommendations are deterministic and connected to findings.

```text
REDUCE_MODEL_CALLS
REDUCE_TOOL_CALLS
DISABLE_UNNECESSARY_TOOLS
SET_TOKEN_BUDGET
REDUCE_CONTEXT_SIZE
USE_SMALLER_MODEL
ADD_RETRY_LIMIT
DISABLE_SUB_AGENTS
CACHE_REPEATED_RESULTS
USE_DETERMINISTIC_CODE
SPLIT_TASK_INTO_STAGES
REVIEW_TASK_PROFILE
```

Each recommendation must include:

```text
code
message
estimatedImpact
relatedFindingCode
```

## Estimated Savings

The MVP uses a simple conservative estimate:

```text
expectedCost = taskProfile.recommendedCostUsd
actualCost = execution.estimatedCostUsd

estimatedCostReductionUsd = max(actualCost - expectedCost, 0)
estimatedSavingsPercent = estimatedCostReductionUsd / actualCost * 100
```

If `actualCost == 0`, the estimated savings percent should be `0` to avoid division by zero.

The UI and API must label this as an estimate, not a guaranteed saving.

## Example

Task profile:

```text
DOCUMENT_SUMMARY
maxModelCalls = 2
maxToolCalls = 1
recommendedTotalTokens = 15,000
recommendedCostUsd = 0.25
recommendedDurationMs = 20,000
maxRetries = 1
allowSubAgents = false
```

Actual run:

```text
modelCalls = 6
toolCalls = 12
totalTokens = 57,000
estimatedCostUsd = 1.84
durationMs = 42,000
retryCount = 2
subAgentCount = 0
```

Ratios:

```text
model calls: 6 / 2 = 3.0
tool calls: 12 / 1 = 12.0
tokens: 57,000 / 15,000 = 3.8
cost: 1.84 / 0.25 = 7.36
duration: 42,000 / 20,000 = 2.1
retries: 2 / 1 = 2.0
autonomy: allowed? no, used? no -> 100
```

Supporting scores:

```text
modelCallEfficiency = 10
toolEfficiency = 10
tokenEfficiency = 10
costEfficiency = 10
latencyEfficiency = 10
retryEfficiency = 25
autonomyEfficiency = 100
```

Weighted score:

```text
balanceScore =
10 * 0.25 +
10 * 0.20 +
10 * 0.15 +
10 * 0.15 +
10 * 0.10 +
25 * 0.10 +
100 * 0.05

balanceScore = 16
```

Base classification:

```text
HIGHLY_DISPROPORTIONATE
```

Likely findings:

```text
EXCESSIVE_MODEL_CALLS
EXCESSIVE_TOOL_USAGE
TOKEN_BUDGET_EXCEEDED
COST_DISPROPORTIONATE_TO_TASK
LATENCY_ABOVE_EXPECTED
RETRY_LOOP_DETECTED
```

## Future Improvements

The MVP scoring model is intentionally simple. Future versions can add:

```text
per-metric penalty curves
parameterized task profiles based on input size
historical percentile baselines
task profile mismatch detection
quality-aware scoring
team-specific or agent-specific policies
OpenTelemetry/OpenInference trace ingestion
```

Static task profiles should not be removed when adaptive baselines are introduced. Historical baselines should complement explicit policies, not replace them.
