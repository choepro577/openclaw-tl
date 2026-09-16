import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll } from "vitest";

/** Provides one cleaned-up temporary workspace root per context test file. */
export function useSandboxFixtureDir(): (prefix: string) => Promise<string> {
  let root = "";
  let count = 0;

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-context-"));
  });

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  return async (prefix: string): Promise<string> => {
    const dir = path.join(root, `${prefix}-${count++}`);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };
}
