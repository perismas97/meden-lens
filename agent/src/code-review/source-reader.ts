import { readFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".js", ".mjs", ".ts"]);

export function resolveCodeReviewFixture(
  fixtureRoot: string,
  requestedPath: string,
): string {
  const root = path.resolve(fixtureRoot);
  const candidate = path.resolve(requestedPath);
  const relative = path.relative(root, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Code-review fixture must be inside ${root}.`);
  }

  if (!ALLOWED_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
    throw new Error("Code-review fixtures must use .js, .mjs, or .ts files.");
  }

  return candidate;
}

export async function readCodeReviewFixture(
  fixtureRoot: string,
  fileName: string,
): Promise<string> {
  if (path.basename(fileName) !== fileName) {
    throw new Error("read_source_file accepts a file name without directory segments.");
  }

  const absolutePath = resolveCodeReviewFixture(
    fixtureRoot,
    path.join(fixtureRoot, fileName),
  );
  const content = await readFile(absolutePath, "utf8");

  if (content.trim().length === 0) {
    throw new Error(`Fixture ${fileName} is empty.`);
  }

  return content;
}
