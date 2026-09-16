/**
 * Sandbox context resolver.
 *
 * Prepares workspace layout, backend handle, filesystem bridge, browser bridge, and registry state for one run.
 */
import { createHash, randomUUID } from "node:crypto";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  emitDiagnosticsTimelineEvent,
  measureDiagnosticsTimelineSpan,
  measureDiagnosticsTimelineSpanSync,
} from "../../infra/diagnostics-timeline.js";
import {
  ensureBrowserControlAuth,
  resolveBrowserControlAuth,
} from "../../plugin-sdk/browser-control-auth.js";
import {
  DEFAULT_BROWSER_EVALUATE_ENABLED,
  resolveBrowserConfig,
} from "../../plugin-sdk/browser-profiles.js";
import { defaultRuntime } from "../../runtime.js";
import type { SkillSnapshot } from "../../skills/types.js";
import type { ExecPolicyOverrides } from "../exec-defaults.js";
import type { SandboxBackendHandle } from "./backend-handle.types.js";
import { requireSandboxBackendFactory } from "./backend.js";
import { ensureSandboxBrowser } from "./browser.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import { resolveSandboxDockerUser } from "./docker-user.js";
import { createSandboxFsBridge } from "./fs-bridge.js";
import {
  activatePendingSandboxActiveLeases,
  acquireSandboxActiveLease,
  acquireSandboxLifecycleLease,
  cancelPendingSandboxActiveLeases,
  reserveSandboxActiveLease,
  type SandboxActiveLeaseReservation,
} from "./lifecycle.js";
import { toSandboxProvisioningError } from "./provisioning-error.js";
import { readRegisteredSandboxRuntimeIds, updateRegistry } from "./registry.js";
import { resolveSandboxRuntimeStatus } from "./runtime-status.js";
import { assertSshSandboxSecretOwnerAvailable } from "./secret-owner.js";
import type { SandboxContext, SandboxWorkspaceInfo } from "./types.js";
import {
  ensureSandboxWorkspaceBase,
  ensureSandboxWorkspaceLayout,
  resolveSandboxWorkspaceLayout,
  resolveSandboxWorkspaceInfoWorkdir,
  sandboxTimelineOptions,
  syncSandboxWorkspaceSkills,
  type SandboxSkillFacts,
  type SandboxWorkspaceLayout,
} from "./workspace-prep.js";

type SandboxPreparationSubscriber = Pick<ResolveSandboxContextParams, "signal" | "assertCurrent">;

type SandboxResourcePreparationState = {
  promise: Promise<SandboxResourcePreparation> | null;
  ready: boolean;
  subscribers: Map<symbol, SandboxPreparationSubscriber>;
};

const sandboxResourcePreparationsInFlight = new Map<string, SandboxResourcePreparationState>();

type SandboxResourcePreparation = {
  layout: SandboxWorkspaceLayout;
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  backend: SandboxBackendHandle;
  browser: SandboxContext["browser"] | null;
};

function resolveSandboxSession(params: {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey?: string;
}) {
  const rawSessionKey = params.sessionKey?.trim();
  if (!rawSessionKey) {
    return null;
  }

  const runtime = resolveSandboxRuntimeStatus({
    cfg: params.config,
    agentId: params.agentId,
    sessionKey: rawSessionKey,
  });
  if (!runtime.sandboxed) {
    return null;
  }

  const cfg = resolveSandboxConfigForAgent(params.config, runtime.agentId);
  return { rawSessionKey, runtime, cfg };
}

export type ResolveSandboxContextParams = {
  /** Optional subscriber cancellation used by background preparation callers. */
  signal?: AbortSignal;
  /** Revalidates the subscriber's admission after an asynchronous boundary. */
  assertCurrent?: () => void;
  /** Internal foreground handoff: keep the active-use lease through the turn. */
  holdActiveLease?: boolean;
  config?: OpenClawConfig;
  agentId?: string;
  execOverrides?: ExecPolicyOverrides;
  requireCurrentConfig?: boolean;
  sessionKey?: string;
  skillsSnapshot?: SkillSnapshot;
  workspaceDir?: string;
};

function assertSandboxPreparationCurrent(
  params: Pick<ResolveSandboxContextParams, "signal" | "assertCurrent">,
): void {
  if (params.signal?.aborted) {
    const reason = params.signal.reason;
    if (reason instanceof Error) {
      throw reason;
    }
    throw new Error("sandbox preparation aborted");
  }
  params.assertCurrent?.();
}

function assertSandboxContextCurrent(
  params: Pick<ResolveSandboxContextParams, "signal" | "assertCurrent">,
  context: SandboxContext,
): SandboxContext {
  try {
    assertSandboxPreparationCurrent(params);
    return context;
  } catch (error) {
    // A foreground lease is handed to the caller only after the full context
    // is built. If admission is revoked at this final boundary, no runner can
    // receive the context to release it, so release it here.
    context.lifecycleActiveRelease?.();
    throw error;
  }
}

function assertSandboxResourceSubscribersCurrent(state: SandboxResourcePreparationState): void {
  let firstError: unknown;
  for (const [token, subscriber] of state.subscribers) {
    try {
      assertSandboxPreparationCurrent(subscriber);
    } catch (error) {
      firstError ??= error;
      state.subscribers.delete(token);
    }
  }
  if (state.subscribers.size === 0) {
    throw firstError instanceof Error
      ? firstError
      : new Error("sandbox preparation no longer has a current subscriber");
  }
}

function digestSandboxPreparationPayload(payload: unknown): string | null {
  try {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  } catch {
    return null;
  }
}

function resolveSandboxResourcePreparationKey(
  params: ResolveSandboxContextParams,
  resolved: ResolvedSandboxSession,
): string | null {
  return digestSandboxPreparationPayload({
    agentId: resolved.runtime.agentId,
    rawSessionKey: resolved.rawSessionKey,
    cfg: resolved.cfg,
    // Include root-level settings that alter browser or resource policy.
    config: params.config ?? null,
    requireCurrentConfig: params.requireCurrentConfig ?? null,
    workspaceDir: params.workspaceDir ?? null,
  });
}

type ResolvedSandboxSession = NonNullable<ReturnType<typeof resolveSandboxSession>>;

function assertSandboxSessionSecretOwnerAvailable(
  config: OpenClawConfig | undefined,
  resolved: ResolvedSandboxSession,
): void {
  if (resolved.cfg.backend !== "ssh") {
    return;
  }
  // Never let an unresolved inline SSH credential silently fall through to
  // ambient host SSH identities for this agent.
  assertSshSandboxSecretOwnerAvailable({
    config,
    scope: resolved.cfg.scope,
    agentId: resolved.runtime.agentId,
  });
}

function scheduleSandboxPruneAfterPreparation(
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>,
  config: OpenClawConfig | undefined,
  scopeKey: string,
): void {
  if (cfg.prune.idleHours === 0 && cfg.prune.maxAgeDays === 0) {
    return;
  }
  const timelineOptions = sandboxTimelineOptions({
    config,
    cfg,
    stage: "prune-schedule",
  });
  void import("./prune.js")
    .then(({ scheduleSandboxPrune }) => {
      void measureDiagnosticsTimelineSpanSync(
        "sandbox.prune.schedule",
        () => scheduleSandboxPrune(cfg, { protectedKeys: new Set([scopeKey]) }),
        timelineOptions,
      );
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      defaultRuntime.error?.(`Sandbox prune scheduling failed: ${message}`);
    });
}

async function resolveSandboxResourcePreparationUncoalesced(
  params: ResolveSandboxContextParams,
  resolved: ResolvedSandboxSession,
  assertCurrent: () => void,
  preparationKey?: string,
): Promise<SandboxResourcePreparation> {
  const { rawSessionKey, cfg, runtime } = resolved;
  assertCurrent();
  const layout = resolveSandboxWorkspaceLayout({
    cfg,
    agentId: runtime.agentId,
    rawSessionKey,
    workspaceDir: params.workspaceDir,
  });

  // Workspace seed/mkdir, runtime acquisition, registry updates, and browser
  // startup all mutate one scope. Hold the writer before the first filesystem
  // side effect so prune cannot remove a runtime while its workspace is being
  // rebuilt. The lease ends before skill facts are refreshed below.
  const releaseSandboxLifecycle = await acquireSandboxLifecycleLease(layout.scopeKey);
  let preparationSucceeded = false;
  let preparationError: unknown;
  try {
    assertCurrent();
    await ensureSandboxWorkspaceBase({ cfg, layout, config: params.config });
    assertCurrent();

    const docker = await measureDiagnosticsTimelineSpan(
      "sandbox.docker.user",
      () =>
        resolveSandboxDockerUser({
          backend: cfg.backend,
          docker: cfg.docker,
          workspaceDir: layout.workspaceDir,
        }),
      sandboxTimelineOptions({ config: params.config, cfg, stage: "docker-user" }),
    );
    assertCurrent();
    const resolvedCfg = docker === cfg.docker ? cfg : { ...cfg, docker };

    const backendFactory = requireSandboxBackendFactory(resolvedCfg.backend);
    const registeredRuntimeIds = await measureDiagnosticsTimelineSpan(
      "sandbox.registry.read",
      () =>
        readRegisteredSandboxRuntimeIds({
          backendId: resolvedCfg.backend,
          scopeKey: layout.scopeKey,
        }),
      sandboxTimelineOptions({
        config: params.config,
        cfg: resolvedCfg,
        stage: "registry-read",
      }),
    );
    assertCurrent();
    const backend = await measureDiagnosticsTimelineSpan(
      "sandbox.backend.acquire",
      () =>
        backendFactory({
          sessionKey: rawSessionKey,
          scopeKey: layout.scopeKey,
          ...(registeredRuntimeIds.length > 0 ? { registeredRuntimeIds } : {}),
          workspaceDir: layout.workspaceDir,
          agentWorkspaceDir: layout.agentWorkspaceDir,
          skillsWorkspaceDir: layout.skillsWorkspaceDir,
          cfg: resolvedCfg,
          ...(params.requireCurrentConfig !== undefined
            ? { requireCurrentConfig: params.requireCurrentConfig }
            : {}),
        }),
      sandboxTimelineOptions({
        config: params.config,
        cfg: resolvedCfg,
        stage: "backend-acquire",
      }),
    );
    assertCurrent();
    if (backend.registryManaged !== true) {
      const registryNow = Date.now();
      await measureDiagnosticsTimelineSpan(
        "sandbox.registry.write",
        () =>
          updateRegistry({
            containerName: backend.runtimeId,
            backendId: backend.id,
            runtimeLabel: backend.runtimeLabel,
            sessionKey: layout.scopeKey,
            // updateRegistry preserves the immutable createdAtMs already
            // persisted for this runtime while refreshing lastUsedAtMs.
            createdAtMs: registryNow,
            lastUsedAtMs: registryNow,
            image: backend.configLabel ?? resolvedCfg.docker.image,
            configLabelKind: backend.configLabelKind ?? "Image",
          }),
        sandboxTimelineOptions({
          config: params.config,
          cfg: resolvedCfg,
          stage: "registry-write",
        }),
      );
      assertCurrent();
    }

    const resolvedBrowserConfig = resolvedCfg.browser.enabled
      ? resolveBrowserConfig(params.config?.browser, params.config)
      : undefined;
    const evaluateEnabled =
      resolvedBrowserConfig?.evaluateEnabled ?? DEFAULT_BROWSER_EVALUATE_ENABLED;
    const browser = await measureDiagnosticsTimelineSpan(
      "sandbox.browser",
      async () => {
        const bridgeAuth = resolvedCfg.browser.enabled
          ? await (async () => {
              // Sandbox browser bridge server runs on a loopback TCP port; always wire up
              // the same auth that loopback browser clients will send (token/password).
              const cfgForAuth =
                params.config ?? (await import("../../config/config.js")).getRuntimeConfig();
              let browserAuth = resolveBrowserControlAuth(cfgForAuth);
              try {
                const ensured = await ensureBrowserControlAuth({ cfg: cfgForAuth });
                browserAuth = ensured.auth;
              } catch (error) {
                const message = error instanceof Error ? error.message : JSON.stringify(error);
                defaultRuntime.error?.(`Sandbox browser auth ensure failed: ${message}`);
              }
              return browserAuth;
            })()
          : undefined;
        if (resolvedCfg.browser.enabled && backend.capabilities?.browser !== true) {
          throw new Error(
            `Sandbox backend "${backend.id}" does not support browser sandboxes yet.`,
          );
        }
        return resolvedCfg.browser.enabled && backend.capabilities?.browser === true
          ? await ensureSandboxBrowser({
              scopeKey: layout.scopeKey,
              workspaceDir: layout.workspaceDir,
              agentWorkspaceDir: layout.agentWorkspaceDir,
              skillsWorkspaceDir: layout.skillsWorkspaceDir,
              cfg: resolvedCfg,
              evaluateEnabled,
              bridgeAuth,
              ssrfPolicy: resolvedBrowserConfig?.ssrfPolicy,
            })
          : null;
      },
      sandboxTimelineOptions({
        config: params.config,
        cfg: resolvedCfg,
        stage: "browser",
      }),
    );
    assertCurrent();

    preparationSucceeded = true;
    return { layout, cfg: resolvedCfg, backend, browser };
  } catch (error) {
    preparationError = error;
    throw error;
  } finally {
    if (preparationSucceeded) {
      activatePendingSandboxActiveLeases(layout.scopeKey, preparationKey);
    } else {
      cancelPendingSandboxActiveLeases(
        layout.scopeKey,
        preparationKey,
        preparationError ?? new Error("sandbox resource preparation failed"),
      );
    }
    releaseSandboxLifecycle();
    scheduleSandboxPruneAfterPreparation(cfg, params.config, layout.scopeKey);
  }
}

async function resolveSandboxResourcePreparation(
  params: ResolveSandboxContextParams,
  resolved: ResolvedSandboxSession,
  preparationOwnerKey?: string,
): Promise<SandboxResourcePreparation> {
  const resourcePreparationKey = resolveSandboxResourcePreparationKey(params, resolved);
  const preparationKey =
    preparationOwnerKey ?? resourcePreparationKey ?? `uncached:${randomUUID()}`;
  if (!resourcePreparationKey) {
    emitDiagnosticsTimelineEvent(
      {
        type: "mark",
        name: "sandbox.resource.cache",
        phase: "agent.prepare",
        attributes: {
          cacheBypass: true,
          cacheHit: false,
          cacheMiss: false,
          backend: resolved.cfg.backend,
          scope: resolved.cfg.scope,
        },
      },
      { config: params.config },
    );
    assertSandboxPreparationCurrent(params);
    return await resolveSandboxResourcePreparationUncoalesced(
      params,
      resolved,
      () => assertSandboxPreparationCurrent(params),
      preparationKey,
    );
  }
  let state = sandboxResourcePreparationsInFlight.get(resourcePreparationKey);
  const subscriberToken = Symbol("sandbox-preparation-subscriber");
  if (!state) {
    emitDiagnosticsTimelineEvent(
      {
        type: "mark",
        name: "sandbox.resource.cache",
        phase: "agent.prepare",
        attributes: {
          cacheHit: false,
          cacheMiss: true,
          backend: resolved.cfg.backend,
          scope: resolved.cfg.scope,
        },
      },
      { config: params.config },
    );
    state = {
      promise: null,
      ready: false,
      subscribers: new Map(),
    };
    sandboxResourcePreparationsInFlight.set(resourcePreparationKey, state);
    state.subscribers.set(subscriberToken, params);
    const preparation = resolveSandboxResourcePreparationUncoalesced(
      params,
      resolved,
      () => assertSandboxResourceSubscribersCurrent(state!),
      preparationKey,
    );
    state.promise = preparation.finally(() => {
      state!.ready = true;
      if (sandboxResourcePreparationsInFlight.get(resourcePreparationKey) === state) {
        sandboxResourcePreparationsInFlight.delete(resourcePreparationKey);
      }
    });
  } else {
    emitDiagnosticsTimelineEvent(
      {
        type: "mark",
        name: "sandbox.resource.cache",
        phase: "agent.prepare",
        attributes: {
          cacheHit: true,
          cacheMiss: false,
          backend: resolved.cfg.backend,
          scope: resolved.cfg.scope,
        },
      },
      { config: params.config },
    );
    state.subscribers.set(subscriberToken, params);
    if (state.ready) {
      activatePendingSandboxActiveLeases(
        resolveSandboxWorkspaceLayout({
          cfg: resolved.cfg,
          agentId: resolved.runtime.agentId,
          rawSessionKey: resolved.rawSessionKey,
          workspaceDir: params.workspaceDir,
        }).scopeKey,
        preparationKey,
      );
    }
  }
  const preparation = state.promise;
  if (!preparation) {
    throw new Error("sandbox resource preparation was not initialized");
  }
  try {
    return await preparation;
  } finally {
    state.subscribers.delete(subscriberToken);
  }
}

async function resolveProvisionedSandboxContext(
  params: ResolveSandboxContextParams,
  resolved: ResolvedSandboxSession,
  activeReservation?: SandboxActiveLeaseReservation,
  preparationOwnerKey?: string,
): Promise<SandboxContext> {
  const { rawSessionKey, runtime } = resolved;
  const resources = await resolveSandboxResourcePreparation(params, resolved, preparationOwnerKey);
  const { layout, cfg, backend, browser } = resources;
  // Skill eligibility is caller-specific: a prewarm has no foreground
  // snapshot, while the active attempt carries the snapshot captured at
  // admission. The foreground reservation protects the scope while this
  // refresh runs without serializing already-active turns.
  let releaseSandboxActive = params.holdActiveLease
    ? await (activeReservation?.wait() ?? acquireSandboxActiveLease(layout.scopeKey))
    : undefined;
  let skillFacts: SandboxSkillFacts;
  try {
    skillFacts = await syncSandboxWorkspaceSkills({
      cfg,
      layout,
      config: params.config,
      agentId: runtime.agentId,
      rawSessionKey,
      execOverrides: params.execOverrides,
      skillsSnapshot: params.skillsSnapshot,
      assertCurrent: () => assertSandboxPreparationCurrent(params),
    });
  } catch (error) {
    releaseSandboxActive?.();
    throw error;
  }

  try {
    const sandboxContext: SandboxContext = {
      enabled: true,
      backendId: backend.id,
      sessionKey: rawSessionKey,
      lifecycleKey: layout.scopeKey,
      ...(releaseSandboxActive ? { lifecycleActiveRelease: releaseSandboxActive } : {}),
      workspaceDir: layout.workspaceDir,
      agentWorkspaceDir: layout.agentWorkspaceDir,
      skillsWorkspaceDir: layout.skillsWorkspaceDir,
      ...(skillFacts.eligibility ? { skillsEligibility: skillFacts.eligibility } : {}),
      ...(skillFacts.skillUsagePaths ? { skillUsagePaths: skillFacts.skillUsagePaths } : {}),
      workspaceAccess: cfg.workspaceAccess,
      runtimeId: backend.runtimeId,
      runtimeLabel: backend.runtimeLabel,
      containerName: backend.runtimeId,
      containerWorkdir: backend.workdir,
      docker: cfg.docker,
      tools: cfg.tools,
      browserAllowHostControl: cfg.browser.allowHostControl,
      browser: browser ?? undefined,
      backend,
    };

    sandboxContext.fsBridge =
      backend.createFsBridge?.({ sandbox: sandboxContext }) ??
      createSandboxFsBridge({ sandbox: sandboxContext });

    releaseSandboxActive = undefined;
    return sandboxContext;
  } finally {
    // If context construction fails, no runner receives the lease to release.
    releaseSandboxActive?.();
  }
}

export async function resolveSandboxContext(
  params: ResolveSandboxContextParams,
): Promise<SandboxContext | null> {
  // Keep cancellation/assertion state on each subscriber, never on shared work.
  assertSandboxPreparationCurrent(params);
  const resolved = resolveSandboxSession(params);
  if (!resolved) {
    return null;
  }
  const resourcePreparationKey = resolveSandboxResourcePreparationKey(params, resolved);
  const preparationOwnerKey = resourcePreparationKey ?? `uncached:${randomUUID()}`;
  const activeReservation = params.holdActiveLease
    ? reserveSandboxActiveLease(
        resolveSandboxWorkspaceLayout({
          cfg: resolved.cfg,
          agentId: resolved.runtime.agentId,
          rawSessionKey: resolved.rawSessionKey,
          workspaceDir: params.workspaceDir,
        }).scopeKey,
        preparationOwnerKey,
      )
    : undefined;
  // Once a sandbox session is selected, every remaining step is local
  // provisioning. Preserve that owner boundary across backend, browser,
  // registry, and filesystem-bridge setup so model fallback never retries it.
  const prepare = async () => {
    try {
      assertSandboxSessionSecretOwnerAvailable(params.config, resolved);
      return await resolveProvisionedSandboxContext(
        params,
        resolved,
        activeReservation,
        preparationOwnerKey,
      );
    } catch (error) {
      activeReservation?.cancel(error);
      throw toSandboxProvisioningError(error, resolved.cfg.backend);
    }
  };
  // Only stable runtime work is coalesced below. Build a fresh context for
  // each caller so skill facts, filesystem bridges, and admission guards stay
  // isolated while backend/browser preparation is shared.
  const result = await prepare();
  return assertSandboxContextCurrent(params, result);
}

/**
 * Prepares a sandbox ahead of the active user turn.
 *
 * The preparation shares the in-flight map with resolveSandboxContext, so an
 * arriving request joins the work instead of creating a second runtime. The
 * caller may run this in the background and handle failures according to its
 * scheduler policy.
 */
export async function prewarmSandboxForSession(
  params: ResolveSandboxContextParams,
): Promise<boolean> {
  try {
    assertSandboxPreparationCurrent(params);
    const resolved = resolveSandboxSession(params);
    if (!resolved) {
      return true;
    }
    assertSandboxSessionSecretOwnerAvailable(params.config, resolved);
    // A prewarm only establishes stable workspace/runtime/browser resources.
    // Foreground skill snapshots are refreshed by resolveSandboxContext after
    // it joins this promise, so background policy cannot affect model output.
    await resolveSandboxResourcePreparation(params, resolved);
    assertSandboxPreparationCurrent(params);
    return true;
  } catch (error) {
    // Prewarming is optional. Keep a failed warmup from becoming an
    // unhandled rejection or changing the active request's error contract.
    const message = error instanceof Error ? error.message : String(error);
    defaultRuntime.error?.(`Sandbox prewarm failed: ${message}`);
    return false;
  }
}

export async function ensureSandboxWorkspaceForSession(params: {
  config?: OpenClawConfig;
  sessionKey?: string;
  workspaceDir?: string;
}): Promise<SandboxWorkspaceInfo | null> {
  const resolved = resolveSandboxSession(params);
  if (!resolved) {
    return null;
  }
  assertSandboxSessionSecretOwnerAvailable(params.config, resolved);
  const { rawSessionKey, cfg, runtime } = resolved;

  const {
    agentWorkspaceDir,
    scopeKey,
    skillsEligibility,
    skillUsagePaths,
    skillsWorkspaceDir,
    workspaceDir,
  } = await ensureSandboxWorkspaceLayout({
    cfg,
    agentId: runtime.agentId,
    rawSessionKey,
    config: params.config,
    workspaceDir: params.workspaceDir,
  });

  const containerWorkdir = resolveSandboxWorkspaceInfoWorkdir({
    cfg,
    rawSessionKey,
    scopeKey,
    workspaceDir,
    agentWorkspaceDir,
    skillsWorkspaceDir,
  });
  return {
    workspaceDir,
    ...(containerWorkdir ? { containerWorkdir } : {}),
    skillsWorkspaceDir,
    ...(skillsEligibility ? { skillsEligibility } : {}),
    ...(skillUsagePaths ? { skillUsagePaths } : {}),
    workspaceAccess: cfg.workspaceAccess,
  };
}
