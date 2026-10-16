import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const DEBUG_SOURCE_FILE = "source.mjs";
export const DEBUG_TEST_FILE = "source.test.mjs";

export interface PreparedDebugFixture {
  key: string;
  workspace: string;
  source: string;
  testSource: string;
}

export interface VerificationResult {
  command: string;
  passed: boolean;
  exitCode: number;
  output: string;
}

export async function prepareDebugFixture(
  fixtureRoot: string,
  fixtureKey: string,
): Promise<PreparedDebugFixture> {
  if (path.basename(fixtureKey) !== fixtureKey || fixtureKey.trim().length === 0) {
    throw new Error("Debugging fixture must be a single directory name.");
  }

  const root = path.resolve(fixtureRoot);
  const fixtureDirectory = path.resolve(root, fixtureKey);
  const relative = path.relative(root, fixtureDirectory);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Debugging fixture must be inside ${root}.`);
  }

  const sourcePath = path.join(fixtureDirectory, DEBUG_SOURCE_FILE);
  const testPath = path.join(fixtureDirectory, DEBUG_TEST_FILE);
  const [source, testSource] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(testPath, "utf8"),
  ]);

  if (source.trim().length === 0 || testSource.trim().length === 0) {
    throw new Error(`Debugging fixture ${fixtureKey} contains an empty file.`);
  }

  const workspace = await mkdtemp(path.join(tmpdir(), "meden-debug-"));
  await Promise.all([
    copyFile(sourcePath, path.join(workspace, DEBUG_SOURCE_FILE)),
    copyFile(testPath, path.join(workspace, DEBUG_TEST_FILE)),
  ]);

  return { key: fixtureKey, workspace, source, testSource };
}

export async function writeDebugReplacement(
  workspace: string,
  replacementSource: string,
): Promise<void> {
  await writeFile(path.join(workspace, DEBUG_SOURCE_FILE), replacementSource, "utf8");
}

export async function removeDebugWorkspace(workspace: string): Promise<void> {
  await rm(workspace, { recursive: true, force: true });
}

export function runDebugVerification(
  workspace: string,
  timeoutMs = 15_000,
): Promise<VerificationResult> {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ["--test", DEBUG_TEST_FILE], {
      cwd: workspace,
      env: environment,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      const output = `${stdout}${stderr}`.trim().slice(-4_000);
      resolve({
        command: `node --test ${DEBUG_TEST_FILE}`,
        passed: !timedOut && exitCode === 0,
        exitCode: timedOut ? 124 : (exitCode ?? 1),
        output: timedOut ? `${output}\nVerification timed out.`.trim() : output,
      });
    });
  });
}
