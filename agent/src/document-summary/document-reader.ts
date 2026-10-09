import { readFile } from "node:fs/promises";
import path from "node:path";

export function resolveFixtureDocument(fixtureRoot: string, requestedPath: string): string {
  const root = path.resolve(fixtureRoot);
  const candidate = path.resolve(requestedPath);
  const relative = path.relative(root, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Document must be inside ${root}.`);
  }

  if (path.extname(candidate).toLowerCase() !== ".txt") {
    throw new Error("Document-summary fixtures must use the .txt extension.");
  }

  return candidate;
}

export async function readFixtureDocument(
  fixtureRoot: string,
  fileName: string,
): Promise<string> {
  if (path.basename(fileName) !== fileName) {
    throw new Error("read_document accepts a file name without directory segments.");
  }

  const absolutePath = resolveFixtureDocument(fixtureRoot, path.join(fixtureRoot, fileName));
  const content = await readFile(absolutePath, "utf8");

  if (content.trim().length === 0) {
    throw new Error(`Fixture ${fileName} is empty.`);
  }

  return content;
}
