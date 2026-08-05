# Architecture

Meden Lens starts as a simple modular monolith.

```text
External Agent or Simulator
          |
          v
   Execution Run API
          |
          v
     Run Storage
          |
          v
   Task Profile Resolver
          |
          v
   Proportionality Engine
          |
          v
Findings and Recommendations
          |
          v
     Analysis Storage
          |
          v
 Dashboard and Comparison API
```

The current vertical slice implements ingestion, validation, persistence, idempotency, task profile lookup, deterministic scoring, findings, recommendations, estimated savings, analysis persistence, and API documentation.

The scoring engine is intentionally separate from the HTTP layer so it can later evolve into a standalone library, SDK component, or service.
