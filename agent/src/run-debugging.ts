import { fileURLToPath } from "node:url";

import { runDebugging } from "./debugging/debugging-agent.ts";

const fixtureRoot = fileURLToPath(new URL("../fixtures/debugging/", import.meta.url));
const fixtureKey = process.argv[2];

if (!fixtureKey) {
  console.error("Usage: npm run agent:debug -- <fixture-name>");
  process.exitCode = 1;
} else {
  try {
    const result = await runDebugging({
      fixtureKey,
      fixtureRoot,
      model: process.env.MEDEN_AGENT_MODEL ?? "qwen3:4b",
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Debugging agent failed: ${reason}`);
    process.exitCode = 1;
  }
}
