import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import { findAgentEntryIndex, listAgentEntries } from "../commands/agents.config.js";
import { loadConfig, writeConfigFile } from "../config/config.js";
import { getMemorySearchManager } from "../memory/search-manager.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { resolveKbProfileRootPath } from "./kb-path-utils.js";

type KbSyncAllState = "queued" | "running" | "done" | "failed";

type KbSyncAllAgentResult = {
  agentId: string;
  indexOk: boolean;
  files?: number;
  chunks?: number;
  error?: string;
};

type KbSyncAllProgress = {
  totalAgents: number;
  doneAgents: number;
  currentAgentId: string | null;
};

type KbSyncAllJob = {
  jobId: string;
  state: KbSyncAllState;
  forceReindex: boolean;
  kbPath: string;
  unionPaths: string[];
  progress: KbSyncAllProgress;
  results: KbSyncAllAgentResult[];
  error?: string;
  startedAtMs: number;
  finishedAtMs?: number;
};

type StartJobResult =
  | { ok: true; jobId: string; state: KbSyncAllState }
  | { ok: false; error: string };

const JOBS = new Map<string, KbSyncAllJob>();
let runningJobId: string | null = null;

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isValidPathForMemorySync(stat: import("node:fs").Stats, resolvedPath: string): boolean {
  if (stat.isSymbolicLink()) {
    return false;
  }
  if (stat.isDirectory()) {
    return true;
  }
  if (stat.isFile()) {
    return resolvedPath.toLowerCase().endsWith(".md");
  }
  return false;
}

async function normalizeExistingAbsolutePath(inputPath: string): Promise<string | null> {
  const trimmed = inputPath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) {
    return null;
  }
  const resolved = path.resolve(trimmed);
  let stat: import("node:fs").Stats;
  try {
    stat = await fs.lstat(resolved);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
  if (!isValidPathForMemorySync(stat, resolved)) {
    return null;
  }
  try {
    return await fs.realpath(resolved);
  } catch {
    return resolved;
  }
}

async function dedupeExistingAbsolutePaths(input: string[]): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    const normalized = await normalizeExistingAbsolutePath(entry);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function listKnownAgentIds(cfg: OpenClawConfig): string[] {
  const entries = listAgentEntries(cfg);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const id = normalizeAgentId(entry.id);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeExtraPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
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

function mergePaths(base: string[], additions: string[]): string[] {
  const out = [...base];
  const seen = new Set(base.map((entry) => entry.trim()).filter(Boolean));
  for (const entry of additions) {
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function buildUnionPaths(cfg: OpenClawConfig, kbPath: string): Promise<string[]> {
  const allCandidates: string[] = [kbPath];
  for (const entry of listAgentEntries(cfg)) {
    const extraPaths = normalizeExtraPaths(entry.memorySearch?.extraPaths);
    allCandidates.push(...extraPaths);
  }
  return await dedupeExistingAbsolutePaths(allCandidates);
}

async function writeMergedConfig(params: {
  cfg: OpenClawConfig;
  unionPaths: string[];
}): Promise<OpenClawConfig> {
  const entries = listAgentEntries(params.cfg);
  const nextEntries = [...entries];
  let changed = false;

  for (const entry of entries) {
    const agentId = normalizeAgentId(entry.id);
    if (!agentId) {
      continue;
    }
    const index = findAgentEntryIndex(nextEntries, agentId);
    if (index < 0) {
      continue;
    }
    const current = nextEntries[index]!;
    const before = normalizeExtraPaths(current.memorySearch?.extraPaths);
    const after = mergePaths(before, params.unionPaths);
    if (after.length === before.length && after.every((value, idx) => value === before[idx])) {
      continue;
    }
    changed = true;
    nextEntries[index] = {
      ...current,
      memorySearch: {
        ...current.memorySearch,
        extraPaths: after,
      },
    };
  }

  if (!changed) {
    return params.cfg;
  }

  const nextCfg = {
    ...params.cfg,
    agents: {
      ...params.cfg.agents,
      list: nextEntries,
    },
  } satisfies OpenClawConfig;
  await writeConfigFile(nextCfg);
  return loadConfig();
}

async function runKbSyncAllJob(job: KbSyncAllJob): Promise<void> {
  job.state = "running";

  try {
    let cfg = loadConfig();
    const agentIds = listKnownAgentIds(cfg);
    job.progress.totalAgents = agentIds.length;

    cfg = await writeMergedConfig({ cfg, unionPaths: job.unionPaths });

    for (const agentId of agentIds) {
      job.progress.currentAgentId = agentId;
      const agentResult: KbSyncAllAgentResult = { agentId, indexOk: false };

      try {
        if (!job.forceReindex) {
          agentResult.indexOk = true;
        } else {
          const { manager, error } = await getMemorySearchManager({ cfg, agentId });
          if (!manager) {
            throw new Error(error ?? "memory manager unavailable");
          }
          if (typeof manager.sync === "function") {
            await manager.sync({ reason: "kb-sync-all", force: true });
          } else {
            throw new Error("memory manager does not support sync");
          }
          const status = manager.status();
          agentResult.indexOk = true;
          agentResult.files = typeof status.files === "number" ? status.files : 0;
          agentResult.chunks = typeof status.chunks === "number" ? status.chunks : 0;
        }
      } catch (err) {
        agentResult.indexOk = false;
        agentResult.error = toErrorMessage(err);
      }

      job.results.push(agentResult);
      job.progress.doneAgents += 1;
    }

    const failed = job.results.filter((entry) => !entry.indexOk);
    if (failed.length > 0) {
      job.state = "failed";
      const firstError = failed.find((entry) => entry.error)?.error;
      job.error = `${failed.length}/${agentIds.length} agent(s) failed during KB sync-all${firstError ? `: ${firstError}` : ""}`;
    } else {
      job.state = "done";
      job.error = undefined;
    }
    job.progress.currentAgentId = null;
    job.finishedAtMs = Date.now();
  } catch (err) {
    job.state = "failed";
    job.error = toErrorMessage(err);
    job.progress.currentAgentId = null;
    job.finishedAtMs = Date.now();
  } finally {
    if (runningJobId === job.jobId) {
      runningJobId = null;
    }
  }
}

export async function startKbSyncAllJob(params?: {
  forceReindex?: boolean;
}): Promise<StartJobResult> {
  const activeJob = runningJobId ? JOBS.get(runningJobId) : null;
  if (activeJob && (activeJob.state === "queued" || activeJob.state === "running")) {
    return {
      ok: false,
      error: `sync-all already running (jobId=${activeJob.jobId})`,
    };
  }

  const cfg = loadConfig();
  const kbPath = resolveKbProfileRootPath(process.env);
  await fs.mkdir(kbPath, { recursive: true });
  const unionPaths = await buildUnionPaths(cfg, kbPath);
  const jobId = `kb_sync_${randomUUID()}`;
  const job: KbSyncAllJob = {
    jobId,
    state: "queued",
    forceReindex: params?.forceReindex !== false,
    kbPath,
    unionPaths,
    progress: {
      totalAgents: 0,
      doneAgents: 0,
      currentAgentId: null,
    },
    results: [],
    startedAtMs: Date.now(),
  };

  JOBS.set(jobId, job);
  runningJobId = jobId;
  void runKbSyncAllJob(job);

  return { ok: true, jobId, state: job.state };
}

export function getKbSyncAllStatus(jobId: string): KbSyncAllJob | null {
  const trimmed = jobId.trim();
  if (!trimmed) {
    return null;
  }
  return JOBS.get(trimmed) ?? null;
}
