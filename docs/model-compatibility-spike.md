# Local Model Compatibility Spike

Date: 2026-10-04  
Status: completed

## Decision to Make

Select the first local Ollama model for the Meden Lens TypeScript agent. The
selection is based on observed behavior on the development machine, not only on
published model descriptions.

## Candidates

| Model | Published model size | Why it is tested |
| --- | ---: | --- |
| `llama3.2:3b` | approximately 2.0 GB | Small tool-capable baseline with summarization use cases. |
| `qwen3:4b` | approximately 2.5 GB | Small tool-capable model focused on agent and coding tasks. |

## Acceptance Criteria

A candidate passes only when:

- Ollama loads it successfully on the development machine.
- It emits exactly one valid `multiply_numbers(17, 23)` tool call.
- It incorporates the tool result into a final answer containing `391`.
- Every model call returns input-token and output-token metadata.
- Every model call returns model and load duration metadata.
- The spike records wall time and loaded model memory.
- A failure returns a diagnostic and a non-zero process exit code.

## Reproduction

```powershell
cd agent
npm install
npm run check
npm test
npm run spike:model
```

The spike uses temperature `0`, seed `42`, the same prompt, and the same tool
schema for both candidates.

## Results

Environment:

```text
Node.js: v24.19.0
Ollama: 0.35.1
Ollama API: http://localhost:11434
Execution: CPU (Ollama reported 0 bytes loaded in VRAM)
Context length: 4,096 for both loaded models
Quantization: Q4_K_M for both loaded models
```

Two consecutive controlled trials were run. The first includes model loading;
the second measures both models while already loaded.

| Model | Trial | Passed | Tool call | Usage metadata | Tokens | Wall time | Load time | Loaded memory |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `llama3.2:3b` | cold | yes | valid | complete | 341 | 11.082 s | 4.637 s | 2.56 GB |
| `llama3.2:3b` | warm | yes | valid | complete | 341 | 2.701 s | 0.007 s | 2.56 GB |
| `qwen3:4b` | cold | yes | valid | complete | 1,291 | 75.775 s | 5.894 s | 3.18 GB |
| `qwen3:4b` | warm | yes | valid | complete | 1,264 | 61.168 s | 0.007 s | 3.18 GB |

Both candidates met the functional acceptance criteria. Each produced exactly
one valid tool call, incorporated the tool result `391`, and returned token and
duration metadata for both model calls.

The results establish local compatibility, not general model quality. The spike
did not evaluate summary accuracy, code-review quality, debugging ability, or
behavior on large context windows.

## Decision

Select `llama3.2:3b` as the initial model for the document-summary agent.

It passed the same tool and telemetry checks while using substantially fewer
tokens, completing the warm trial about 22 times faster, and loading a smaller
memory footprint on this development machine. This makes it the safer first
choice for the local portfolio workflow.

Keep `qwen3:4b` installed as a comparison candidate for later code-review and
debugging workflow tests. It may still be useful if task-specific evaluation
shows a quality advantage that justifies its higher observed resource use.

This decision is local and version-specific. A model, Ollama, prompt, or hardware
change requires rerunning the spike before changing the default.

## Sources

- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling)
- [Ollama running-model memory API](https://docs.ollama.com/api/ps)
- [Llama 3.2 model page](https://ollama.com/library/llama3.2)
- [Qwen3 4B model page](https://ollama.com/library/qwen3%3A4b)
