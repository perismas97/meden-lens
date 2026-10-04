# Meden Lens Local Agent

This package will contain the local TypeScript agent used to produce real Meden
Lens telemetry. The current increment contains only the model compatibility
spike. It is not yet the document-summary agent.

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
