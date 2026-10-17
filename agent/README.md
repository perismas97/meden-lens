# Meden Lens Local Agent

This package contains the local TypeScript agent used to produce real Meden Lens
executions. It includes controlled document-summary, code-review, and debugging
workflows plus the model compatibility spike used to select its first Ollama
model.

## Prerequisites

- Node.js 22.18 or newer.
- Ollama running at `http://localhost:11434`.
- The candidate models installed locally.

```powershell
ollama pull llama3.2:3b
ollama pull qwen3:4b
```

## Install and verify

```powershell
cd agent
npm install
npm run check
npm test
```

## Run the model spike

```powershell
npm run spike:model
```

The spike performs two model calls per candidate. It verifies a deterministic
tool call, feeds the local tool result back to the model, checks the final
answer, aggregates provider-reported tokens and durations, and reads loaded
model memory from Ollama.

Override the server or candidates when needed:

```powershell
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:MEDEN_SPIKE_MODELS = "llama3.2:3b,qwen3:4b"
npm run spike:model
```

The command exits with a non-zero status when the server is unavailable, a model
is missing, tool calling fails, or token metadata is absent.

## Run the document-summary agent

```powershell
npm run agent:summary -- fixtures/documents/ai-support-operations.txt
```

The workflow accepts only `.txt` files inside `fixtures/documents`. The agent
must call the controlled `read_document` tool before returning a summary that
matches the configured Zod schema.

The default model is `llama3.2:3b`. Override it without changing source code:

```powershell
$env:MEDEN_AGENT_MODEL = "qwen3:4b"
npm run agent:summary -- fixtures/documents/ai-support-operations.txt
```

This increment prints the structured result locally. It does not send telemetry
to the Meden Lens backend yet.

## Run the code-review agent

```powershell
npm run agent:review -- fixtures/code-review/user-profile-service.ts
```

The workflow reads one source fixture through a controlled tool and returns a
structured review. `NOT_EVALUATED` means that the response matches the review
schema; it does not claim that every finding is correct or complete.

## Run the debugging agent

```powershell
npm run agent:debug -- retry-delay
```

The workflow copies the fixture to a temporary directory, confirms that its
tests fail, asks the model for a complete replacement source file, and runs the
unchanged tests again. If the first replacement fails, the agent receives the
verification output and gets one bounded retry. `VERIFIED` means the final
replacement passed those tests. The original fixture is never modified.

Document summary and code review default to `llama3.2:3b`. Debugging defaults to
`qwen3:4b` because the controlled retry-delay fixture showed a task-specific
quality advantage. `MEDEN_AGENT_MODEL` overrides either default when comparing
models.

## Normalized telemetry

Every workflow result now includes a `telemetry` object. The observer records
provider-reported input and output tokens, attempted model and tool calls, tool
successes and failures, bounded retries, monotonic duration, execution and
outcome status, and a 32-character trace ID.

Telemetry is aggregate-only. It does not contain prompts, document contents,
source code, tool arguments, tool output, or model responses. Local Ollama runs
report `actualCostUsd` as `0`. If any model call omits token metadata, token
totals are `null` and `TOKEN_USAGE_MISSING` is added to
`completenessWarnings`; the observer never estimates missing tokens.

This increment prints telemetry with the local workflow result. Automatic
ingestion into the Meden Lens backend is a later increment.
