import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";

export const KB_ROOT_DIRNAME = "KB";

const NULL_BYTE_RE = /\0/;

function ensureNoNullByte(value: string, label: string) {
  if (NULL_BYTE_RE.test(value)) {
    throw new Error(`${label} must not contain null bytes`);
  }
}

export function normalizeKbRelativePath(
  value: unknown,
  opts?: { allowEmpty?: boolean; label?: string },
): string {
  const allowEmpty = opts?.allowEmpty ?? false;
  const label = opts?.label ?? "path";
  if (typeof value !== "string") {
    if (allowEmpty && (value === null || value === undefined)) {
      return "";
    }
    throw new Error(`${label} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (allowEmpty) {
      return "";
    }
    throw new Error(`${label} is required`);
  }

  ensureNoNullByte(trimmed, label);

  const forward = trimmed.replaceAll("\\", "/");
  if (forward.startsWith("/")) {
    throw new Error(`${label} must be relative`);
  }

  const normalized = path.posix.normalize(forward);
  if (normalized === "." || normalized === "") {
    if (allowEmpty) {
      return "";
    }
    throw new Error(`${label} is required`);
  }
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`${label} must not escape KB root`);
  }

  return normalized.replace(/^\.\/+/, "");
}

export function normalizeKbEntryName(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  ensureNoNullByte(trimmed, label);
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error(`${label} must not contain path separators`);
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error(`${label} is invalid`);
  }
  return trimmed;
}

export function resolveKbRootPath(workspaceDir: string): string {
  return path.join(workspaceDir, KB_ROOT_DIRNAME);
}

export function resolveKbProfileRootPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveStateDir(env), KB_ROOT_DIRNAME);
}

export function resolveKbAbsolutePath(kbRootAbs: string, relPath: string): string {
  const resolved = path.resolve(kbRootAbs, relPath);
  if (resolved === kbRootAbs) {
    return resolved;
  }
  if (resolved.startsWith(`${kbRootAbs}${path.sep}`)) {
    return resolved;
  }
  throw new Error("path must stay inside KB root");
}

export function ensureMarkdownFilePath(relPath: string): void {
  if (!relPath.toLowerCase().endsWith(".md")) {
    throw new Error("only .md files are allowed");
  }
}

export function ensureNestedFilePath(relPath: string): void {
  if (!relPath.includes("/")) {
    throw new Error("files must be stored inside a folder under KB root");
  }
}

export function splitKbParentPath(relPath: string): { parentPath: string; name: string } {
  const parts = relPath.split("/");
  const name = parts.pop() ?? "";
  return {
    parentPath: parts.join("/"),
    name,
  };
}

export async function assertNoSymlinkTraversal(kbRootAbs: string, relPath: string): Promise<void> {
  const segments = relPath.split("/").filter(Boolean);
  let current = kbRootAbs;

  for (const segment of segments) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await fs.lstat(current);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw err;
    }
    if (stat.isSymbolicLink()) {
      throw new Error("symlink paths are not allowed in KB");
    }
  }
}
