# Meden Lens

Goal-aware efficiency analysis for AI agents.

Meden Lens is an explainable AI agent efficiency analyzer inspired by the Delphic maxim "Μηδέν άγαν" - nothing in excess. It evaluates whether the cost, tokens, tools, latency, retries, and autonomy used by an AI agent are proportional to the task being performed.

## Why It Exists

AI observability usually answers questions like:

- How many tokens were used?
- How much did the run cost?
- How long did it take?
- How many tool calls happened?

Meden Lens asks the next question:

> Was that level of resource consumption justified for this specific task?

The same 80,000-token run might be reasonable for deep research and absurd for a simple date-format conversion. Meden Lens evaluates executions against task profiles so teams can distinguish justified complexity from digital excess.

## MVP Scope

The first vertical slice includes:

- Spring Boot backend with Java 21.
- PostgreSQL persistence.
- Flyway migrations.
- Configurable task profiles seeded in the database.
- Execution run ingestion.
- Idempotency support.
- Request validation and consistent API errors.
- OpenAPI documentation.
- Docker-based local setup.

Frontend, scoring analysis, findings, recommendations, simulator, and comparison screens will follow after this backend slice is stable.

## Current API

Base path:

```text
/api/v1
```

Endpoints:

```text
POST /api/v1/runs
GET  /api/v1/runs/{runId}
GET  /api/v1/task-profiles
GET  /actuator/health
```

Swagger UI:

```text
http://localhost:8080/swagger-ui/index.html
```

## Run Locally

Run unit tests:

```bash
mvn -f backend/pom.xml test
```

Run unit and integration tests. This requires Docker Desktop to be running because integration tests use Testcontainers:

```bash
mvn -f backend/pom.xml verify
```

The project uses Testcontainers 2.x so integration tests work with recent Docker Desktop versions that require newer Docker API clients.

With Docker:

```bash
docker compose up --build
```

Backend:

```text
http://localhost:8080
```

PostgreSQL:

```text
localhost:5432
```

## Example Run

```json
{
  "externalRunId": "run-external-001",
  "idempotencyKey": "document-summary-2026-08-05-001",
  "agent": {
    "name": "support-document-agent",
    "version": "1.0.0"
  },
  "task": {
    "type": "DOCUMENT_SUMMARY",
    "description": "Summarize a 15-page technical support document",
    "complexity": "MEDIUM"
  },
  "execution": {
    "status": "SUCCESS",
    "startedAt": "2026-08-05T08:00:00Z",
    "completedAt": "2026-08-05T08:00:42Z",
    "durationMs": 42000,
    "modelCalls": 6,
    "toolCalls": 12,
    "retryCount": 2,
    "subAgentCount": 0,
    "inputTokens": 48000,
    "outputTokens": 9000,
    "estimatedCostUsd": 1.84
  },
  "models": [
    {
      "provider": "sample-provider",
      "model": "large-reasoning-model",
      "callCount": 6,
      "inputTokens": 48000,
      "outputTokens": 9000,
      "estimatedCostUsd": 1.84
    }
  ],
  "tools": [
    {
      "name": "web-search",
      "callCount": 10,
      "successCount": 10,
      "failureCount": 0
    }
  ],
  "metadata": {
    "environment": "local",
    "team": "demo",
    "purpose": "technical-document-summary"
  }
}
```

## Roadmap

1. Add deterministic scoring and balance score classifications.
2. Generate findings and recommendations.
3. Add analysis endpoints.
4. Add simulator with demo scenarios.
5. Build React dashboard and comparison views.
6. Add observability metrics for run and analysis quality.
