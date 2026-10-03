# Agent Telemetry and Baseline MVP

Status: approved implementation specification  
Scope: local portfolio MVP  
Target: Meden Lens v1.0

## Purpose

This document defines the next Meden Lens vertical slice: connect a real local AI
agent, collect execution telemetry automatically, learn typical resource usage
from eligible historical runs, and compare every run with both explicit task
policy and historical behavior.

The product question remains:

> Was the resource consumption of this AI execution proportional to the task?

The current application already accepts execution data, stores runs, and scores
them against static task profiles. This specification does not describe that
work as automatic. It defines the additional components required to make the
data originate from an instrumented agent rather than a manually assembled JSON
request or a simulator scenario.

## MVP Outcome

The completed portfolio demonstration must support this flow:

```text
Local TypeScript agent
    -> executes a registered workflow with an Ollama model
    -> records model, tool, retry, token, and timing telemetry
    -> sends one normalized run to Meden Lens automatically
    -> Meden Lens validates and stores the run
    -> policy scoring evaluates explicit task limits
    -> historical scoring evaluates the relevant baseline cohort
    -> the dashboard shows the evidence, verdict, and recommendations
```

The user must not need to copy token counts or construct the ingestion payload
by hand after running the agent.

## MVP Scope

The MVP includes:

- One local TypeScript agent package in this repository.
- Ollama as the first local model provider.
- Three registered workflows: `DOCUMENT_SUMMARY`, `CODE_REVIEW`, and
  `DEBUGGING`.
- Workflow-owned task classification. The model cannot choose its own task
  category or complexity to obtain a more generous budget.
- Automatic run-level telemetry aggregation.
- Server-controlled run provenance.
- Static task profiles as explicit policy.
- Historical baselines calculated from eligible instrumented runs.
- Independent policy and historical comparisons.
- Explainable findings and recommendations.
- A category-first dashboard and an evidence-focused run detail view.
- Repeatable fixtures, tests, and a recorded-telemetry end-to-end test.

## Non-Goals

The MVP does not include:

- Runtime blocking or automatic termination of expensive runs.
- A universal benchmark that claims one correct token budget for every task.
- Automatic task classification by an LLM.
- Output-quality judgment by another LLM.
- Production authentication, multi-tenancy, or hosted deployment.
- A complete OpenTelemetry collector or general-purpose trace explorer.
- Storage of raw prompts, document contents, source code, or model responses by
  default.
- Training or fine-tuning a model.

## Supported Workflows

The workflow selects the task category before execution. The agent may make
model and tool decisions inside that workflow, but it cannot change the category
used for scoring.

| Workflow key | Task category | Input size unit | Completion rule | Outcome rule |
| --- | --- | --- | --- | --- |
| `document-summary` | `DOCUMENT_SUMMARY` | characters | The workflow returns non-empty output matching the summary schema. | `NOT_EVALUATED` unless a separate verifier is added. |
| `code-review` | `CODE_REVIEW` | non-blank lines of code | The workflow returns a valid structured findings collection, including an empty collection. | `NOT_EVALUATED` because schema validity is not review quality. |
| `debugging` | `DEBUGGING` | non-blank lines of code | The workflow completes its attempt and executes the configured verification command. | `VERIFIED` when tests pass; `REJECTED` when tests fail. |

Initial input-size buckets are workflow configuration, not scientific claims:

| Workflow | Small | Medium | Large |
| --- | --- | --- | --- |
| `document-summary` | up to 8,000 characters | 8,001-32,000 characters | more than 32,000 characters |
| `code-review` | up to 200 lines | 201-800 lines | more than 800 lines |
| `debugging` | up to 200 lines | 201-800 lines | more than 800 lines |

Bucket boundaries must be versioned and configurable in the workflow registry.
Changing a boundary requires a new baseline compatibility key.

## Execution Status and Outcome Status

Resource efficiency and result quality are separate concerns.

```text
executionStatus: COMPLETED | FAILED
outcomeStatus:   VERIFIED | REJECTED | NOT_EVALUATED
```

`executionStatus` answers whether the workflow completed its controlled
execution path. `outcomeStatus` answers whether an objective verifier accepted
the result.

A cheap `NOT_EVALUATED` summary is not automatically a good summary. A high
efficiency score must never be presented as an output-quality score.

The existing backend `SUCCESS` value maps to canonical telemetry
`COMPLETED`. This mapping may remain at the API boundary to avoid an unnecessary
breaking migration.

## Integration Boundary

The local agent contains one telemetry observer around the workflow execution.
The observer receives events from the model and tool adapters, aggregates them,
and creates one run envelope when the workflow finishes or fails.

The first integration uses LangChain JavaScript with `ChatOllama`, subject to the
model compatibility spike. The domain contract must not depend on LangChain
types. A future adapter must be able to emit the same canonical envelope from
OpenTelemetry, OpenInference, or another agent framework.

## Canonical Telemetry Contract

The canonical envelope is versioned independently from the HTTP API.

### Identity and provenance

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | yes | Telemetry contract version; initial value is `1`. |
| `externalRunId` | yes | Identifier generated once by the agent runner. |
| `idempotencyKey` | yes | Stable retry key for this logical run. |
| `traceId` | yes | Correlates the run with agent, model, and tool activity. |
| `source` | server | `API`, `DEMO`, `INSTRUMENTED_AGENT`, or `RECORDED_TEST`. |
| `environment` | yes | Initial values are `local`, `test`, and `ci`. |
| `team` | no | Optional reporting dimension; not used for scoring. |

The ingestion client does not set `source`. The server assigns it from the
trusted ingestion path.

### Agent and workflow

| Field | Required | Meaning |
| --- | --- | --- |
| `agentName` | yes | Stable logical agent name. |
| `agentVersion` | yes | Version of agent orchestration code. |
| `workflowKey` | yes | Registered workflow identifier. |
| `workflowVersion` | yes | Version of workflow logic and tools. |
| `promptVersion` | yes | Version of the prompt template or prompt bundle. |
| `baselineCompatibilityKey` | yes | Explicit key identifying runs that may share a primary baseline. |
| `taskCategory` | derived | Category resolved from the server workflow registry. |

The server validates that `workflowKey` maps to `taskCategory`. A caller cannot
submit an arbitrary category through the instrumented-agent endpoint.

### Model

| Field | Required | Meaning |
| --- | --- | --- |
| `modelProvider` | yes | `ollama` for the first adapter. |
| `modelName` | yes | Provider model identifier. |
| `modelVersion` | no | Digest or provider version when available. |

### Input description

| Field | Required | Meaning |
| --- | --- | --- |
| `inputSizeValue` | yes | Numeric workload size measured before execution. |
| `inputSizeUnit` | yes | `CHARACTERS` or `LINES_OF_CODE` in the MVP. |
| `inputSizeBucket` | derived | `SMALL`, `MEDIUM`, or `LARGE` from the workflow registry. |
| `inputFingerprint` | yes | SHA-256 fingerprint of normalized input used only for duplicate control. |

The fingerprint is not a replacement for access control and must not be shown
in the normal dashboard.

### Timing and result

| Field | Required | Meaning |
| --- | --- | --- |
| `startedAt` | yes | UTC workflow start time. |
| `completedAt` | yes | UTC workflow finish time, including failures. |
| `durationMs` | yes | Monotonic elapsed workflow time. |
| `executionStatus` | yes | `COMPLETED` or `FAILED`. |
| `outcomeStatus` | yes | `VERIFIED`, `REJECTED`, or `NOT_EVALUATED`. |
| `errorType` | on failure | Stable error category, without stack trace or sensitive content. |

### Resource usage

| Field | Required | Aggregation rule |
| --- | --- | --- |
| `inputTokens` | yes | Sum provider-reported input tokens for every model call. |
| `outputTokens` | yes | Sum provider-reported output tokens for every model call. |
| `totalTokens` | derived | `inputTokens + outputTokens`. |
| `modelCalls` | yes | Count every attempted model invocation, including failed calls. |
| `toolCalls` | yes | Count every attempted tool invocation. |
| `toolSuccesses` | yes | Count tools that return normally. |
| `toolFailures` | yes | Count tools that fail or time out. |
| `retryCount` | yes | Count repeated attempts after the first attempt. |
| `subAgentCount` | yes | Count delegated agent executions; initially zero unless explicitly supported. |
| `actualCostUsd` | yes | Provider charge; `0` for local Ollama runs. |
| `referenceCostEstimateUsd` | no | Clearly labeled illustrative cloud-price estimate. |

If the model adapter does not return token usage, the run is stored with a
telemetry completeness warning and is excluded from token baselines. Meden Lens
does not guess token counts in the MVP.

## Event and Trace Semantics

The observer may keep in-memory events for `AGENT`, `LLM`, and `TOOL`
operations. The MVP persists run aggregates plus `traceId`; it does not persist a
full span tree.

Internal fields remain stable even when an external semantic convention changes.
Adapters are responsible for mapping provider or trace fields into the canonical
contract. Conceptually:

| Meden Lens concept | OpenTelemetry/OpenInference concept |
| --- | --- |
| workflow execution | agent/root span |
| model call | LLM or generative-AI operation span |
| tool call | TOOL span |
| input/output tokens | generative-AI usage or LLM token-count attributes |
| trace correlation | OpenTelemetry trace ID |
| execution failure | span/error status and normalized error category |

Raw prompt and response attributes are not exported to Meden Lens by default,
even if an external tracing framework can provide them.

## Idempotency

The agent generates `externalRunId` and `idempotencyKey` before execution and
retains them while retrying ingestion.

The server guarantees:

```text
same idempotencyKey + same normalized payload -> return existing run
same idempotencyKey + different payload       -> reject as conflict
new idempotencyKey                             -> create new run
```

An HTTP retry must never create a second historical observation.

## Privacy and Data Retention

The default stored record contains metrics and safe metadata only.

The following content is not stored:

- Document text.
- Source code.
- Prompts or system instructions.
- Model responses.
- Tool arguments or tool output.
- Full exception messages or stack traces that may contain input content.

Fixtures committed to the repository must be synthetic or deliberately licensed
for inclusion. The fingerprint is calculated locally from normalized input; only
the digest is sent.

## Historical Baseline Eligibility

A run is eligible for historical resource baselines only when all of these are
true:

- `source` is `INSTRUMENTED_AGENT`.
- `executionStatus` is `COMPLETED`.
- `outcomeStatus` is `VERIFIED` or `NOT_EVALUATED`.
- Required telemetry for the metric is present and non-negative.
- `workflowKey`, `baselineCompatibilityKey`, and `inputFingerprint` are present.
- The run was not produced by a mock, simulator, recorded test, or CI fixture.
- The run has not been superseded by a newer eligible run with the same primary
  baseline cohort and `inputFingerprint`.

`NOT_EVALUATED` runs may establish a resource baseline, but the UI must continue
to state that their output quality was not evaluated. `REJECTED` and `FAILED`
runs remain visible for analysis but do not teach the system what normal
successful consumption looks like.

For deterministic duplicate handling, only the newest eligible run for each
`inputFingerprint` contributes to a baseline cohort. Repeated execution of the
same fixture therefore does not increase the effective sample count.

## Baseline Cohorts and Fallback

Historical baselines are resolved in this order:

1. Same `agentName`, `workflowKey`, `baselineCompatibilityKey`, task category,
   and input-size bucket.
2. Same `agentName`, `workflowKey`, `baselineCompatibilityKey`, and task
   category across all input sizes.
3. Same task category across compatible instrumented local workflows.
4. Static task profile only.

The first cohort with at least 10 eligible unique inputs is selected. The API
must report which fallback level was used. A model, prompt, tool, or workflow
change that makes old runs incomparable requires a new
`baselineCompatibilityKey`; it must not silently mix incompatible history.

## Baseline Statistics

Baselines are calculated independently for:

```text
totalTokens
durationMs
modelCalls
toolCalls
retryCount
```

For each metric, Meden Lens reports:

```text
sampleCount
uniqueInputCount
median
firstQuartile
thirdQuartile
interquartileRange
medianAbsoluteDeviation
p90
historicalUpperBound
```

Percentiles use the R-7 linear interpolation method so backend tests and future
clients produce the same values.

The MVP upper bound is:

```text
historicalUpperBound = max(p90, thirdQuartile + 1.5 * interquartileRange)
```

This is an empirical anomaly boundary, not a task policy. It says what has been
typical in the eligible cohort, not what should be allowed.

## Confidence

Confidence is based on eligible unique inputs, not raw run count:

```text
0-9 unique inputs   -> LOW, policy-only decision
10-29 unique inputs -> MEDIUM, policy and history decision
30+ unique inputs   -> HIGH, policy and history decision
```

Low-confidence statistics may be displayed as provisional context but cannot
change the final classification.

## Policy and Historical Decisions

Meden Lens produces two independent comparisons.

### Policy comparison

The policy comparison uses the existing deterministic scoring model and static
task profile budgets. Static profiles remain explicit guardrails at every
confidence level.

### Historical comparison

For medium- and high-confidence cohorts, each historical metric uses:

```text
historicalRatio = actual / historicalUpperBound
```

Zero upper bounds use the existing zero-expected-value rule. Metric scores use
the existing universal ratio penalty curve and configured weights. The result
is a separate historical score and classification.

### Final resource verdict

The final classification is the stricter of the policy classification and the
historical classification. History can make a verdict stricter, but it can
never excuse a task-policy violation.

The analysis must preserve both explanations:

```text
policyClassification
historicalClassification or INSUFFICIENT_HISTORY
finalClassification
baselineConfidence
baselineFallbackLevel
```

Two important findings are required:

- `TYPICAL_BUT_ABOVE_TASK_POLICY`: the agent usually behaves this way, but the
  explicit task budget says the behavior is excessive.
- `UNUSUAL_FOR_AGENT`: the run is inside task policy but materially above the
  eligible historical cohort.

This prevents a consistently wasteful agent from teaching Meden Lens that waste
is proportional.

## Cost Semantics

For local Ollama runs:

```text
actualCostUsd = 0
```

Meden Lens may also calculate `referenceCostEstimateUsd` from a versioned pricing
snapshot. The estimate must record:

```text
referenceProvider
referenceModel
inputRatePerMillionTokens
outputRatePerMillionTokens
pricingVersion
pricingEffectiveDate
```

Reference prices must come from the selected provider's official pricing source.
The dashboard must label this value `Reference cloud cost estimate`, never
`actual cost`, `equivalent cost`, or `savings`. Because local and cloud models
may differ in tokenization and capability, the estimate is illustrative and is
not part of the final proportionality score.

## Dashboard Product Contract

The redesigned interface is category-first and must answer these questions in
order:

1. How many instrumented runs were observed?
2. Which task categories consumed the most tokens and time?
3. Which runs require review, and why?
4. What is typical for this category and input size?
5. What did this run use compared with policy and history?
6. Was outcome quality verified, rejected, or not evaluated?
7. What concrete resource change is recommended?

The primary views are:

- Overview: instrumented runs, tokens, duration, reference cost, review count,
  category summary, and recent exceptions.
- Runs: filterable execution ledger with provenance and deep links.
- Categories: policy limits, historical ranges, confidence, and sample origin.
- Run detail: trace identity, actual metrics, both comparisons, findings,
  recommendations, and outcome status.
- Agent status: configured model, workflow versions, and latest ingestion.

Task-profile maintenance and synthetic demo controls are secondary. They must
not dominate the first screen.

## Fixtures and Testing Strategy

The repository must include varied synthetic fixtures:

- At least 8 document inputs distributed across size buckets.
- At least 3 small code fixtures with reviewable issues.
- At least 3 debugging fixtures with deterministic failing and passing tests.

The batch runner may repeat workflows for development, but duplicate fingerprints
must not raise baseline confidence.

Test boundaries are:

- Agent unit tests use mocked model responses and deterministic tool results.
- Backend integration tests use Testcontainers and normalized telemetry payloads.
- Statistical tests use fixed datasets with exact expected quartiles, percentiles,
  confidence, and fallback levels.
- CI does not download or run Ollama.
- Docker end-to-end tests replay recorded telemetry through the real ingestion
  endpoint and verify the dashboard and run detail route.
- Ollama compatibility is a documented local test because model behavior depends
  on model version and available hardware.

## Definition of Done

The agent telemetry and baseline MVP is complete only when:

- A documented local command executes each supported workflow.
- The agent collects usage without manual token entry.
- A completed or failed run is ingested automatically and idempotently.
- Stored records identify their trusted source and workflow versions.
- Raw documents, source code, prompts, and responses are absent from persistence.
- Eligible runs produce deterministic historical baselines and confidence.
- Static policy remains active after historical confidence becomes high.
- The API returns policy, history, and final classifications separately.
- The dashboard makes provenance, baseline confidence, and quality status visible.
- Recorded telemetry proves the end-to-end path in CI without Ollama.
- The README can guide an interviewer through the complete flow.

## Standards References

- [OpenTelemetry Generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OpenInference specification](https://arize-ai.github.io/openinference/spec/)
- [LangChain JavaScript ChatOllama integration](https://docs.langchain.com/oss/javascript/integrations/chat/ollama)

These references guide adapter semantics. The Meden Lens canonical telemetry
contract remains versioned and owned by this repository.
