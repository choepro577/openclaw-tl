import { asDateTimestampMs } from "@openclaw/normalization-core/number-coercion";
/**
 * Sandbox registry pruning.
 *
 * Removes stale runtime containers and browser bridges on a best-effort schedule.
 */
import { getRuntimeConfig } from "../../config/config.js";
import { defaultRuntime } from "../../runtime.js";
import { getSandboxBackendManager } from "./backend.js";
import { stopCachedBrowserBridgesForContainer } from "./browser-bridges.js";
import { dockerSandboxBackendManager } from "./docker-backend.js";
import {
  acquireSandboxLifecycleLease,
  hasSandboxActiveUsers,
  isSandboxLifecycleActive,
} from "./lifecycle.js";
import {
  readBrowserRegistry,
  readRegistry,
  removeBrowserRegistryEntry,
  removeRegistryEntry,
  type SandboxBrowserRegistryEntry,
  type SandboxRegistryEntry,
} from "./registry.js";
import type { SandboxConfig } from "./types.js";

const SANDBOX_PRUNE_THROTTLE_MS = 5 * 60 * 1000;

let lastPruneAtMs = 0;
let pruneInFlight: Promise<void> | null = null;
let scheduledPruneInFlight: Promise<void> | null = null;

type PruneableRegistryEntry = Pick<
  SandboxRegistryEntry,
  "containerName" | "backendId" | "createdAtMs" | "lastUsedAtMs" | "sessionKey"
>;

export type SandboxPruneOptions = {
  /** Scope/runtime keys to keep out of this prune pass. */
  protectedKeys?: ReadonlySet<string>;
};

function shouldPruneSandboxEntry(cfg: SandboxConfig, now: number, entry: PruneableRegistryEntry) {
  const idleHours = cfg.prune.idleHours;
  const maxAgeDays = cfg.prune.maxAgeDays;
  if (idleHours === 0 && maxAgeDays === 0) {
    return false;
  }
  const nowMs = asDateTimestampMs(now) ?? 0;
  const lastUsedAtMs = asDateTimestampMs(entry.lastUsedAtMs) ?? 0;
  const createdAtMs = asDateTimestampMs(entry.createdAtMs) ?? 0;
  const idleMs = nowMs - lastUsedAtMs;
  const ageMs = nowMs - createdAtMs;
  return (
    (idleHours > 0 && idleMs > idleHours * 60 * 60 * 1000) ||
    (maxAgeDays > 0 && ageMs > maxAgeDays * 24 * 60 * 60 * 1000)
  );
}

/** Removes expired registry entries and their backing runtime resources. */
async function pruneSandboxRegistryEntries<TEntry extends SandboxRegistryEntry>(params: {
  cfg: SandboxConfig;
  read: () => Promise<{ entries: TEntry[] }>;
  remove: (containerName: string) => Promise<void>;
  removeRuntime: (entry: TEntry) => Promise<void>;
  beforeRemove?: (entry: TEntry) => Promise<void>;
  protectedKeys?: ReadonlySet<string>;
}) {
  const now = Date.now();
  if (params.cfg.prune.idleHours === 0 && params.cfg.prune.maxAgeDays === 0) {
    return;
  }
  const registry = await params.read();
  for (const entry of registry.entries) {
    // A scope can be registered under a replacement runtime while its
    // lifecycle is still in progress. Protect by both stable scope and
    // runtime id so pruning cannot race create/start/replace work.
    if (
      isSandboxLifecycleActive(entry.sessionKey) ||
      isSandboxLifecycleActive(entry.containerName) ||
      params.protectedKeys?.has(entry.sessionKey) ||
      params.protectedKeys?.has(entry.containerName)
    ) {
      continue;
    }
    if (!shouldPruneSandboxEntry(params.cfg, now, entry)) {
      continue;
    }
    const releaseSandboxLifecycle = await acquireSandboxLifecycleLease(
      entry.sessionKey || entry.containerName,
    );
    try {
      // A foreground request may have acquired its shared lease while this
      // prune waited for the mutation queue. Never remove a live runtime after
      // the writer is granted.
      if (hasSandboxActiveUsers(entry.sessionKey) || hasSandboxActiveUsers(entry.containerName)) {
        continue;
      }
      // A foreground request may have refreshed this entry while the prune
      // pass waited for the lifecycle lease. Re-read before destructive work
      // so the stale snapshot cannot remove a freshly acquired runtime.
      const latestEntry = (await params.read()).entries.find(
        (candidate) => candidate.containerName === entry.containerName,
      );
      if (!latestEntry || !shouldPruneSandboxEntry(params.cfg, Date.now(), latestEntry)) {
        continue;
      }
      await params.beforeRemove?.(latestEntry);
      await params.removeRuntime(latestEntry);
      await params.remove(latestEntry.containerName);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      defaultRuntime.error?.(
        `Sandbox prune failed to remove ${entry.containerName}: ${message ?? "unknown error"}`,
      );
    } finally {
      releaseSandboxLifecycle();
    }
  }
}

/** Prunes ordinary sandbox runtime containers from the configured backend manager. */
async function pruneSandboxContainers(cfg: SandboxConfig, protectedKeys?: ReadonlySet<string>) {
  const config = getRuntimeConfig();
  await pruneSandboxRegistryEntries<SandboxRegistryEntry>({
    cfg,
    read: readRegistry,
    remove: removeRegistryEntry,
    removeRuntime: async (entry) => {
      const manager = getSandboxBackendManager(entry.backendId ?? "docker");
      await manager?.removeRuntime({
        entry,
        config,
      });
    },
    protectedKeys,
  });
}

/** Prunes browser bridge containers and closes matching in-process bridge servers. */
async function pruneSandboxBrowsers(cfg: SandboxConfig, protectedKeys?: ReadonlySet<string>) {
  const config = getRuntimeConfig();
  await pruneSandboxRegistryEntries<
    SandboxBrowserRegistryEntry & {
      backendId?: string;
      runtimeLabel?: string;
      configLabelKind?: string;
    }
  >({
    cfg,
    read: readBrowserRegistry,
    remove: removeBrowserRegistryEntry,
    removeRuntime: async (entry) => {
      await dockerSandboxBackendManager.removeRuntime({
        entry: {
          ...entry,
          backendId: "docker",
          runtimeLabel: entry.containerName,
          configLabelKind: "Image",
        },
        config,
      });
    },
    beforeRemove: async (entry) => {
      await stopCachedBrowserBridgesForContainer(entry.containerName);
    },
    protectedKeys,
  });
}

async function runSandboxPrune(cfg: SandboxConfig, protectedKeys?: ReadonlySet<string>) {
  try {
    await pruneSandboxContainers(cfg, protectedKeys);
    await pruneSandboxBrowsers(cfg, protectedKeys);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    defaultRuntime.error?.(`Sandbox prune failed: ${message ?? "unknown error"}`);
  }
}

/** Runs sandbox pruning at most once per throttle window. */
export async function maybePruneSandboxes(cfg: SandboxConfig, options: SandboxPruneOptions = {}) {
  const now = Date.now();
  if (now - lastPruneAtMs < SANDBOX_PRUNE_THROTTLE_MS) {
    return;
  }
  if (pruneInFlight) {
    await pruneInFlight;
    return;
  }
  lastPruneAtMs = now;
  const run = runSandboxPrune(cfg, options.protectedKeys);
  pruneInFlight = run;
  try {
    await run;
  } finally {
    if (pruneInFlight === run) {
      pruneInFlight = null;
    }
  }
}

/**
 * Schedules one best-effort prune pass after the current request yields.
 *
 * This is intentionally a tracked promise with a throttle and lifecycle
 * exclusions instead of an unobserved fire-and-forget call. Callers that need
 * completion can await the returned promise; request paths can safely ignore
 * it because all failures are logged by runSandboxPrune.
 */
export function scheduleSandboxPrune(
  cfg: SandboxConfig,
  options: SandboxPruneOptions = {},
): Promise<void> | null {
  if (scheduledPruneInFlight) {
    return scheduledPruneInFlight;
  }
  const protectedKeys = options.protectedKeys ? new Set(options.protectedKeys) : new Set<string>();
  // Let the caller acquire its active-turn lease after context resolution
  // before the background pass starts. The lifecycle lock still serializes
  // any later race with a request that arrives in the same event-loop turn.
  const scheduled = new Promise<void>((resolve) => {
    setImmediate(() => {
      void maybePruneSandboxes(cfg, { protectedKeys }).then(
        () => resolve(),
        (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          defaultRuntime.error?.(`Sandbox scheduled prune failed: ${message}`);
          resolve();
        },
      );
    });
  });
  const tracked = scheduled.finally(() => {
    if (scheduledPruneInFlight === tracked) {
      scheduledPruneInFlight = null;
    }
  });
  scheduledPruneInFlight = tracked;
  return tracked;
}
