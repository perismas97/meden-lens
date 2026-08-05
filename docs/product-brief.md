# Product Brief

Meden Lens is an AI agent efficiency and proportionality analyzer.

It is inspired by the Delphic maxim "Μηδέν άγαν" - nothing in excess. The product translates that principle into AI infrastructure: an agent should use only the computation, model capacity, tools, time, retries, and autonomy justified by the task.

The first version receives AI execution runs, validates them, stores them, analyzes them against configured task profiles, and returns an explainable proportionality decision.

## Core Product Question

Was the resource consumption of this AI execution proportional to the task?

## Initial Users

- AI engineers
- Platform engineers
- Backend engineers
- Engineering managers
- FinOps teams
- AI infrastructure teams

## MVP Direction

The MVP starts as an analyzer and observability tool. It does not block agents at runtime. Runtime guardrails can be added later after the scoring model is proven.

## Current MVP Output

For each analyzed run, Meden Lens returns:

- A `balanceScore` from 0 to 100.
- A classification such as `PROPORTIONAL`, `ACCEPTABLE`, or `HIGHLY_DISPROPORTIONATE`.
- Supporting metric scores for cost, tokens, tools, model calls, latency, retries, and autonomy.
- Findings that explain which budgets were exceeded.
- Recommendations connected to those findings.
- Estimated cost reduction compared with the selected task profile budget.
