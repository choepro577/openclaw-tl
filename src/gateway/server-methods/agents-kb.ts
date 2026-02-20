import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { GatewayRequestHandlers } from "./types.js";
import { listAgentIds } from "../../agents/agent-scope.js";
import { findAgentEntryIndex, listAgentEntries } from "../../commands/agents.config.js";
import { loadConfig, writeConfigFile } from "../../config/config.js";
import { getMemorySearchManager } from "../../memory/search-manager.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
  assertNoSymlinkTraversal,
  ensureMarkdownFilePath,
  ensureNestedFilePath,
  KB_ROOT_DIRNAME,
  normalizeKbEntryName,
  normalizeKbRelativePath,
  resolveKbAbsolutePath,
  resolveKbProfileRootPath,
  splitKbParentPath,
} from "../kb-path-utils.js";
import { getKbSyncAllStatus, startKbSyncAllJob } from "../kb-sync-all-jobs.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateAgentsKbDeleteParams,
  validateAgentsKbExtraPathsGetParams,
  validateAgentsKbExtraPathsSetParams,
  validateAgentsKbFileGetParams,
  validateAgentsKbFileSetParams,
  validateAgentsKbMkdirParams,
  validateAgentsKbSyncAllStartParams,
  validateAgentsKbSyncAllStatusParams,
  validateAgentsKbSyncParams,
  validateAgentsKbTreeParams,
} from "../protocol/index.js";
import { assertAgentIdInScope } from "../server/agent-scope-guard.js";

type KbTreeEntry = {
  type: "dir" | "file";
  name: string;
  path: string;
  parentPath: string;
  size?: number;
  updatedAtMs?: number;
};

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function respondInvalidParamError(
  method: string,
  errors: ReturnType<typeof formatValidationErrors>,
  respond: (ok: boolean, payload?: unknown, error?: ReturnType<typeof errorShape>) => void,
): void {
  respond(
    false,
    undefined,
    errorShape(ErrorCodes.INVALID_REQUEST, `invalid ${method} params: ${errors}`),
  );
}

function resolveKnownAgentId(cfg: OpenClawConfig, raw: unknown): string | null {
  const normalized = normalizeAgentId(String(raw ?? ""));
  if (!normalized) {
    return null;
  }
  const known = new Set(listAgentIds(cfg).map((entry) => normalizeAgentId(entry)));
  return known.has(normalized) ? normalized : null;
}

function normalizeExtraPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function normalizeAbsoluteExtraPaths(raw: unknown): Promise<string[]> {
  if (!Array.isArray(raw)) {
    throw new Error("paths must be an array");
  }
  const out: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== "string") {
      throw new Error("paths must contain only strings");
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (!path.isAbsolute(trimmed)) {
      throw new Error(`extra path must be absolute: ${trimmed}`);
    }

    const resolved = path.resolve(trimmed);
    let canonical = resolved;
    try {
      const stat = await fs.lstat(resolved);
      if (stat.isSymbolicLink()) {
        throw new Error(`symlink paths are not allowed: ${trimmed}`);
      }
      if (stat.isFile() && !resolved.toLowerCase().endsWith(".md")) {
        throw new Error(`file extra path must be .md: ${trimmed}`);
      }
      canonical = await fs.realpath(resolved).catch(() => resolved);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw err;
      }
      // Missing paths are allowed for per-agent custom config; sync-all filters to existing paths.
      canonical = resolved;
    }

    if (seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    out.push(canonical);
  }

  return out;
}

async function collectKbTreeEntries(kbRootAbs: string, startPath: string): Promise<KbTreeEntry[]> {
  const startAbs = resolveKbAbsolutePath(kbRootAbs, startPath);
  const entries: KbTreeEntry[] = [];

  async function walk(currentAbs: string, currentRel: string): Promise<void> {
    const dirents = await fs.readdir(currentAbs, { withFileTypes: true });
    dirents.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    for (const dirent of dirents) {
      if (dirent.isSymbolicLink()) {
        continue;
      }
      const relPath = currentRel ? `${currentRel}/${dirent.name}` : dirent.name;
      const absPath = path.join(currentAbs, dirent.name);
      if (dirent.isDirectory()) {
        entries.push({
          type: "dir",
          name: dirent.name,
          path: relPath,
          parentPath: currentRel,
        });
        await walk(absPath, relPath);
        continue;
      }
      if (!dirent.isFile()) {
        continue;
      }
      if (!dirent.name.toLowerCase().endsWith(".md")) {
        continue;
      }
      const stat = await fs.stat(absPath);
      entries.push({
        type: "file",
        name: dirent.name,
        path: relPath,
        parentPath: currentRel,
        size: stat.size,
        updatedAtMs: Math.floor(stat.mtimeMs),
      });
    }
  }

  await walk(startAbs, startPath);
  return entries;
}

async function ensureKbRootAbs(): Promise<string> {
  const kbRootAbs = resolveKbProfileRootPath(process.env);
  await fs.mkdir(kbRootAbs, { recursive: true });
  return kbRootAbs;
}

async function statIfExists(absPath: string): Promise<import("node:fs").Stats | null> {
  try {
    return await fs.stat(absPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function lstatIfExists(absPath: string): Promise<import("node:fs").Stats | null> {
  try {
    return await fs.lstat(absPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function readAgentExtraPaths(cfg: OpenClawConfig, agentId: string): Promise<string[]> {
  const entries = listAgentEntries(cfg);
  const index = findAgentEntryIndex(entries, agentId);
  if (index < 0) {
    throw new Error("unknown agent id");
  }
  return normalizeExtraPaths(entries[index]?.memorySearch?.extraPaths);
}

export const agentsKbHandlers: GatewayRequestHandlers = {
  "agents.kb.tree": async ({ params, respond, client }) => {
    if (!validateAgentsKbTreeParams(params)) {
      respondInvalidParamError(
        "agents.kb.tree",
        formatValidationErrors(validateAgentsKbTreeParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    let subtreePath = "";
    try {
      subtreePath = normalizeKbRelativePath(params.path ?? "", {
        allowEmpty: true,
        label: "path",
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const kbRootAbs = await ensureKbRootAbs();
    const subtreeAbs = resolveKbAbsolutePath(kbRootAbs, subtreePath);

    try {
      await assertNoSymlinkTraversal(kbRootAbs, subtreePath);
      const stat = await statIfExists(subtreeAbs);
      if (!stat) {
        respond(
          true,
          {
            agentId,
            workspace: path.dirname(kbRootAbs),
            kbRoot: KB_ROOT_DIRNAME,
            kbRootAbs,
            entries: [],
          },
          undefined,
        );
        return;
      }
      if (!stat.isDirectory()) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "path must be a folder"));
        return;
      }

      const entries = await collectKbTreeEntries(kbRootAbs, subtreePath);
      respond(
        true,
        {
          agentId,
          workspace: path.dirname(kbRootAbs),
          kbRoot: KB_ROOT_DIRNAME,
          kbRootAbs,
          entries,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, toErrorMessage(err)));
    }
  },

  "agents.kb.mkdir": async ({ params, respond, client }) => {
    if (!validateAgentsKbMkdirParams(params)) {
      respondInvalidParamError(
        "agents.kb.mkdir",
        formatValidationErrors(validateAgentsKbMkdirParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    let parentPath = "";
    let folderName = "";
    try {
      parentPath = normalizeKbRelativePath(params.parentPath ?? "", {
        allowEmpty: true,
        label: "parentPath",
      });
      folderName = normalizeKbEntryName(params.name, "name");
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const kbRootAbs = await ensureKbRootAbs();
    const targetAbs = resolveKbAbsolutePath(kbRootAbs, folderPath);

    try {
      await assertNoSymlinkTraversal(kbRootAbs, parentPath);
      if (parentPath) {
        const parentAbs = resolveKbAbsolutePath(kbRootAbs, parentPath);
        const parentStat = await lstatIfExists(parentAbs);
        if (!parentStat || !parentStat.isDirectory()) {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              "parent folder does not exist; create parent first",
            ),
          );
          return;
        }
        if (parentStat.isSymbolicLink()) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "symlink paths are not allowed in KB"),
          );
          return;
        }
      }

      let created = true;
      try {
        await fs.mkdir(targetAbs);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
          throw err;
        }
        const existing = await lstatIfExists(targetAbs);
        if (!existing?.isDirectory()) {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              "a non-folder entry already exists at this path",
            ),
          );
          return;
        }
        created = false;
      }

      respond(
        true,
        {
          ok: true,
          agentId,
          kbRoot: KB_ROOT_DIRNAME,
          kbRootAbs,
          path: folderPath,
          created,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, toErrorMessage(err)));
    }
  },

  "agents.kb.file.get": async ({ params, respond, client }) => {
    if (!validateAgentsKbFileGetParams(params)) {
      respondInvalidParamError(
        "agents.kb.file.get",
        formatValidationErrors(validateAgentsKbFileGetParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    let filePath = "";
    try {
      filePath = normalizeKbRelativePath(params.path, { label: "path" });
      ensureNestedFilePath(filePath);
      ensureMarkdownFilePath(filePath);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const kbRootAbs = await ensureKbRootAbs();
    const fileAbs = resolveKbAbsolutePath(kbRootAbs, filePath);

    try {
      await assertNoSymlinkTraversal(kbRootAbs, filePath);
      const stat = await lstatIfExists(fileAbs);
      if (!stat || !stat.isFile()) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "file not found"));
        return;
      }
      if (stat.isSymbolicLink()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "symlink paths are not allowed in KB"),
        );
        return;
      }
      const content = await fs.readFile(fileAbs, "utf-8");
      const { parentPath, name } = splitKbParentPath(filePath);
      respond(
        true,
        {
          agentId,
          workspace: path.dirname(kbRootAbs),
          kbRoot: KB_ROOT_DIRNAME,
          kbRootAbs,
          file: {
            name,
            path: filePath,
            parentPath,
            size: stat.size,
            updatedAtMs: Math.floor(stat.mtimeMs),
            content,
          },
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, toErrorMessage(err)));
    }
  },

  "agents.kb.file.set": async ({ params, respond, client }) => {
    if (!validateAgentsKbFileSetParams(params)) {
      respondInvalidParamError(
        "agents.kb.file.set",
        formatValidationErrors(validateAgentsKbFileSetParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    let filePath = "";
    try {
      filePath = normalizeKbRelativePath(params.path, { label: "path" });
      ensureNestedFilePath(filePath);
      ensureMarkdownFilePath(filePath);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const createIfMissing = params.createIfMissing !== false;
    const content = String(params.content ?? "");
    const { parentPath, name } = splitKbParentPath(filePath);

    const kbRootAbs = await ensureKbRootAbs();
    const parentAbs = resolveKbAbsolutePath(kbRootAbs, parentPath);
    const fileAbs = resolveKbAbsolutePath(kbRootAbs, filePath);

    try {
      await assertNoSymlinkTraversal(kbRootAbs, parentPath);
      const parentStat = await lstatIfExists(parentAbs);
      if (!parentStat || !parentStat.isDirectory()) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            "parent folder does not exist; create parent folder before creating a file",
          ),
        );
        return;
      }
      if (parentStat.isSymbolicLink()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "symlink paths are not allowed in KB"),
        );
        return;
      }

      const existing = await lstatIfExists(fileAbs);
      if (!existing && !createIfMissing) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "file not found and createIfMissing=false"),
        );
        return;
      }
      if (existing) {
        if (existing.isSymbolicLink()) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "symlink paths are not allowed in KB"),
          );
          return;
        }
        if (!existing.isFile()) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "target path is not a file"),
          );
          return;
        }
      }

      await fs.writeFile(fileAbs, content, "utf-8");
      const stat = await fs.stat(fileAbs);
      respond(
        true,
        {
          ok: true,
          agentId,
          workspace: path.dirname(kbRootAbs),
          kbRoot: KB_ROOT_DIRNAME,
          kbRootAbs,
          file: {
            name,
            path: filePath,
            parentPath,
            size: stat.size,
            updatedAtMs: Math.floor(stat.mtimeMs),
            content,
          },
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, toErrorMessage(err)));
    }
  },

  "agents.kb.delete": async ({ params, respond, client }) => {
    if (!validateAgentsKbDeleteParams(params)) {
      respondInvalidParamError(
        "agents.kb.delete",
        formatValidationErrors(validateAgentsKbDeleteParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    let targetPath = "";
    try {
      targetPath = normalizeKbRelativePath(params.path, { label: "path" });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const recursive = params.recursive === true;
    const kbRootAbs = await ensureKbRootAbs();
    const targetAbs = resolveKbAbsolutePath(kbRootAbs, targetPath);

    try {
      await assertNoSymlinkTraversal(kbRootAbs, targetPath);
      const stat = await lstatIfExists(targetAbs);
      if (!stat) {
        respond(
          true,
          {
            ok: true,
            agentId,
            kbRoot: KB_ROOT_DIRNAME,
            kbRootAbs,
            path: targetPath,
            deleted: false,
          },
          undefined,
        );
        return;
      }
      if (stat.isSymbolicLink()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "symlink paths are not allowed in KB"),
        );
        return;
      }

      if (stat.isDirectory()) {
        if (!recursive) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "cannot delete a folder without recursive=true"),
          );
          return;
        }
        await fs.rm(targetAbs, { recursive: true, force: false });
        respond(
          true,
          {
            ok: true,
            agentId,
            kbRoot: KB_ROOT_DIRNAME,
            kbRootAbs,
            path: targetPath,
            type: "dir",
            deleted: true,
          },
          undefined,
        );
        return;
      }

      if (!stat.isFile()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "unsupported target type"),
        );
        return;
      }

      ensureMarkdownFilePath(targetPath);
      await fs.unlink(targetAbs);
      respond(
        true,
        {
          ok: true,
          agentId,
          kbRoot: KB_ROOT_DIRNAME,
          kbRootAbs,
          path: targetPath,
          type: "file",
          deleted: true,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, toErrorMessage(err)));
    }
  },

  "agents.kb.sync": async ({ params, respond, client }) => {
    if (!validateAgentsKbSyncParams(params)) {
      respondInvalidParamError(
        "agents.kb.sync",
        formatValidationErrors(validateAgentsKbSyncParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const forceReindex = params.forceReindex !== false;
    const before = await readAgentExtraPaths(cfg, agentId).catch(() => []);
    const kbRootAbs = await ensureKbRootAbs();

    const indexResult: {
      attempted: boolean;
      ok: boolean;
      backend?: string;
      files?: number;
      chunks?: number;
      error?: string;
    } = {
      attempted: forceReindex,
      ok: !forceReindex,
    };

    if (forceReindex) {
      const { manager, error } = await getMemorySearchManager({ cfg, agentId });
      if (!manager) {
        indexResult.ok = false;
        indexResult.error = error ?? "memory manager unavailable";
      } else {
        try {
          if (typeof manager.sync === "function") {
            await manager.sync({ reason: "kb-sync", force: true });
          } else {
            throw new Error("memory manager does not support sync");
          }
          const status = manager.status();
          indexResult.ok = true;
          indexResult.backend = status.backend;
          indexResult.files = typeof status.files === "number" ? status.files : 0;
          indexResult.chunks = typeof status.chunks === "number" ? status.chunks : 0;
        } catch (err) {
          const status = manager.status();
          indexResult.ok = false;
          indexResult.backend = status.backend;
          indexResult.error = toErrorMessage(err);
        }
      }
    }

    respond(
      true,
      {
        ok: true,
        agentId,
        kbRootAbs,
        extraPaths: {
          before,
          after: before,
          added: false,
        },
        index: indexResult,
      },
      undefined,
    );
  },

  "agents.kb.extraPaths.get": async ({ params, respond, client }) => {
    if (!validateAgentsKbExtraPathsGetParams(params)) {
      respondInvalidParamError(
        "agents.kb.extraPaths.get",
        formatValidationErrors(validateAgentsKbExtraPathsGetParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const kbPath = await ensureKbRootAbs();
    const current = await readAgentExtraPaths(cfg, agentId).catch(() => []);
    const rows: Array<{ path: string; exists: boolean; isKb: boolean }> = [];
    for (const entry of current) {
      const trimmed = entry.trim();
      if (!trimmed) {
        continue;
      }
      const resolved = path.resolve(trimmed);
      let exists = false;
      try {
        const stat = await fs.lstat(resolved);
        exists = !stat.isSymbolicLink() && (stat.isDirectory() || stat.isFile());
      } catch {
        exists = false;
      }
      rows.push({
        path: resolved,
        exists,
        isKb: resolved === kbPath,
      });
    }

    respond(
      true,
      {
        agentId,
        kbPath,
        paths: rows,
      },
      undefined,
    );
  },

  "agents.kb.extraPaths.set": async ({ params, respond, client }) => {
    if (!validateAgentsKbExtraPathsSetParams(params)) {
      respondInvalidParamError(
        "agents.kb.extraPaths.set",
        formatValidationErrors(validateAgentsKbExtraPathsSetParams.errors),
        respond,
      );
      return;
    }

    const cfg = loadConfig();
    const agentId = resolveKnownAgentId(cfg, params.agentId);
    if (!agentId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    const scopeCheck = assertAgentIdInScope({ client, agentId });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const entries = listAgentEntries(cfg);
    const index = findAgentEntryIndex(entries, agentId);
    if (index < 0) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown agent id"));
      return;
    }

    let afterPaths: string[] = [];
    try {
      afterPaths = await normalizeAbsoluteExtraPaths(params.paths);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, toErrorMessage(err)));
      return;
    }

    const beforePaths = normalizeExtraPaths(entries[index]?.memorySearch?.extraPaths);
    const nextEntries = [...entries];
    const current = nextEntries[index]!;
    nextEntries[index] = {
      ...current,
      memorySearch: {
        ...current.memorySearch,
        extraPaths: afterPaths,
      },
    };

    const nextCfg = {
      ...cfg,
      agents: {
        ...cfg.agents,
        list: nextEntries,
      },
    } satisfies OpenClawConfig;

    await writeConfigFile(nextCfg);

    const beforeSet = new Set(beforePaths);
    const afterSet = new Set(afterPaths);
    const added = afterPaths.filter((entry) => !beforeSet.has(entry));
    const removed = beforePaths.filter((entry) => !afterSet.has(entry));

    respond(
      true,
      {
        ok: true,
        agentId,
        before: beforePaths,
        after: afterPaths,
        added,
        removed,
      },
      undefined,
    );
  },

  "agents.kb.syncAll.start": async ({ params, respond }) => {
    if (!validateAgentsKbSyncAllStartParams(params)) {
      respondInvalidParamError(
        "agents.kb.syncAll.start",
        formatValidationErrors(validateAgentsKbSyncAllStartParams.errors),
        respond,
      );
      return;
    }

    const result = await startKbSyncAllJob({ forceReindex: params.forceReindex !== false });
    if (!result.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, result.error));
      return;
    }

    respond(
      true,
      {
        ok: true,
        jobId: result.jobId,
        state: result.state,
      },
      undefined,
    );
  },

  "agents.kb.syncAll.status": async ({ params, respond }) => {
    if (!validateAgentsKbSyncAllStatusParams(params)) {
      respondInvalidParamError(
        "agents.kb.syncAll.status",
        formatValidationErrors(validateAgentsKbSyncAllStatusParams.errors),
        respond,
      );
      return;
    }

    const job = getKbSyncAllStatus(String(params.jobId ?? ""));
    if (!job) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "sync-all job not found"));
      return;
    }

    respond(
      true,
      {
        ok: true,
        jobId: job.jobId,
        state: job.state,
        progress: job.progress,
        kbPath: job.kbPath,
        unionPaths: job.unionPaths,
        results: job.results,
        error: job.error,
        startedAtMs: job.startedAtMs,
        finishedAtMs: job.finishedAtMs,
      },
      undefined,
    );
  },
};
