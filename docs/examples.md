# Example Analysis Scenarios

This page contains ready-to-run sample payloads for testing Meden Lens locally.

## Available Samples

| File | Expected signal |
| --- | --- |
| `samples/runs/proportional-document-summary.json` | A successful document summary that should be classified as proportional. |
| `samples/runs/excessive-document-summary.json` | A successful document summary with excessive model calls, tool calls, tokens, cost, latency, and retries. |
| `samples/runs/failed-high-cost-run.json` | A failed run that still exceeds the expected cost and retry limits. |
| `samples/runs/valid-deep-research.json` | A higher-cost deep research run that should still be acceptable because the task profile allows more resources. |

## Run A Sample

Start the local stack:

```powershell
docker compose up --build
```

Open a second PowerShell window from the repository root and choose a sample:

```powershell
$body = Get-Content samples/runs/excessive-document-summary.json -Raw
$run = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/v1/runs" `
  -ContentType "application/json" `
  -Body $body

$analysis = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/v1/runs/$($run.id)/analysis"

$analysis | ConvertTo-Json -Depth 10
```

Fetch the stored analysis again:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/v1/runs/$($run.id)/analysis" |
  ConvertTo-Json -Depth 10
```

The sample files use fixed idempotency keys. If you run the same sample more than once, Meden Lens returns the previously stored run instead of creating a duplicate.

## Expected Highlights

The excessive document summary should return a low `balanceScore`, a `HIGHLY_DISPROPORTIONATE` classification, multiple findings, and estimated cost reduction.

The proportional document summary and valid deep research examples should show why Meden Lens compares a run against the declared task profile instead of judging raw cost or token usage in isolation.
