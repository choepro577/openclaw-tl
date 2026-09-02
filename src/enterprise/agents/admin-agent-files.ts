import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_BOOTSTRAP_FILENAMES } from "../../agents/workspace.js";
import { isMissingPathError } from "../../infra/errors.js";
import { withFileLock } from "../../infra/file-lock.js";
import { FsSafeError, root as openFsSafeRoot } from "../../infra/fs-safe.js";

const ALLOWED_AGENT_FILE_NAMES = new Set<string>(WORKSPACE_BOOTSTRAP_FILENAMES);
const AGENT_FILE_LOCK_OPTIONS = {
  retries: { retries: 40, factor: 1.2, minTimeout: 20, maxTimeout: 200, randomize: true },
  stale: 30_000,
} as const;

function contentRevision(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function requireAgentFileName(value: string): string {
  const name = value.trim();
  if (!ALLOWED_AGENT_FILE_NAMES.has(name)) {
    throw new Error("AGENT_FILE_UNSUPPORTED");
  }
  return name;
}

export async function listEnterpriseAgentCoreFiles(workspace: string) {
  return await Promise.all(
    WORKSPACE_BOOTSTRAP_FILENAMES.map(async (name) => {
      try {
        const stat = await fs.lstat(path.join(workspace, name));
        return {
          name,
          missing: false,
          size: stat.size,
          updatedAt: stat.mtimeMs,
          writable: !stat.isSymbolicLink(),
        };
      } catch {
        return { name, missing: true, size: 0, updatedAt: null, writable: true };
      }
    }),
  );
}

export async function readEnterpriseAgentCoreFile(workspace: string, nameInput: string) {
  const name = requireAgentFileName(nameInput);
  const filePath = path.join(workspace, name);
  try {
    const workspaceRoot = await openFsSafeRoot(workspace);
    const result = await workspaceRoot.read(name, {
      hardlinks: "reject",
      nonBlockingRead: true,
    });
    const content = result.buffer.toString("utf8");
    return {
      name,
      path: filePath,
      missing: false,
      size: result.stat.size,
      updatedAt: Math.floor(result.stat.mtimeMs),
      writable: true,
      content,
      contentRevision: contentRevision(content),
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        name,
        path: filePath,
        missing: true,
        size: 0,
        updatedAt: null,
        writable: true,
        content: "",
        contentRevision: null,
      };
    }
    if (error instanceof FsSafeError) {
      throw new Error("AGENT_FILE_UNSAFE", { cause: error });
    }
    throw error;
  }
}

export async function writeEnterpriseAgentCoreFile(
  workspace: string,
  input: { name: string; content: string; baseRevision: string | null },
) {
  const name = requireAgentFileName(input.name);
  await fs.mkdir(workspace, { recursive: true, mode: 0o700 });
  const filePath = path.join(workspace, name);
  return await withFileLock(filePath, AGENT_FILE_LOCK_OPTIONS, async () => {
    const current = await readEnterpriseAgentCoreFile(workspace, name);
    if (current.contentRevision !== input.baseRevision) {
      throw new Error(`AGENT_FILE_REVISION_CONFLICT:${current.contentRevision ?? "missing"}`);
    }
    try {
      const workspaceRoot = await openFsSafeRoot(workspace);
      await workspaceRoot.write(name, input.content, { encoding: "utf8" });
    } catch (error) {
      if (error instanceof FsSafeError) {
        throw new Error("AGENT_FILE_UNSAFE", { cause: error });
      }
      throw error;
    }
    return await readEnterpriseAgentCoreFile(workspace, name);
  });
}
