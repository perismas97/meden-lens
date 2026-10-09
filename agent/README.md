# Meden Lens Local Agent

This package contains the local TypeScript agent used to produce real Meden Lens
executions. It currently includes a document-summary workflow and the model
compatibility spike used to select its first Ollama model.

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
