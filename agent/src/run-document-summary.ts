import { fileURLToPath } from "node:url";

import { runDocumentSummary } from "./document-summary/document-summary-agent.ts";

const fixtureRoot = fileURLToPath(new URL("../fixtures/documents/", import.meta.url));
const requestedPath = process.argv[2];

if (!requestedPath) {
  console.error(
    "Usage: npm run agent:summary -- fixtures/documents/<document-name>.txt",
  );
  process.exitCode = 1;
} else {
  try {
    const result = await runDocumentSummary({
      requestedPath,
      fixtureRoot,
      model: process.env.MEDEN_AGENT_MODEL ?? "llama3.2:3b",
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Document-summary agent failed: ${reason}`);
    process.exitCode = 1;
  }
}
