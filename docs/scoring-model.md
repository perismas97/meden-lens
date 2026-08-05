# Scoring Model

The first scoring model will be deterministic and explainable.

Each execution metric will be compared with the configured task profile:

```text
ratio = actualValue / recommendedValue
```

The ratio maps to a score from 0 to 100. A higher score means better proportionality.

Planned classifications:

```text
85-100: PROPORTIONAL
70-84: ACCEPTABLE
50-69: SLIGHTLY_EXCESSIVE
30-49: DISPROPORTIONATE
0-29: HIGHLY_DISPROPORTIONATE
```

The final `balanceScore` will be a weighted average of cost, token, tool, model-call, latency, retry, and autonomy efficiency.
