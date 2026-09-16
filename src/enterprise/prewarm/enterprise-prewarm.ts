// Background preparation for the Enterprise user that is currently active.
//
// This module only prepares already-known runtime facts. It never sends a chat
// message, invokes an agent, or calls a provider. Every task rechecks the
// account, session, and session ownership before it touches a runtime.
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { ResolveSandboxContextParams } from "../../agents/sandbox.js";
import { getRuntimeConfig } from "../../config/config.js";
import { registerRuntimeConfigWriteListener } from "../../config/runtime-snapshot.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import {
  resolveSessionSharingRole,
  resolveSessionSharingTarget,
} from "../../gateway/session-sharing.js";
import { emitDiagnosticsTimelineEvent } from "../../infra/diagnostics-timeline.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getActivePluginRegistryVersion } from "../../plugins/runtime.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
  getSkillsSnapshotVersion,
  registerSkillsChangeListener,
} from "../../skills/runtime/refresh-state.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  getActiveEnterpriseSession,
  registerEnterpriseSessionRevocationListener,
  type EnterpriseSessionRevocationEvent,
} from "../auth/session-store.js";
import { prepareEnterpriseGatewayRequest } from "../isolation/enterprise-gateway-policy.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { resolveEnterpriseWorkspacePath } from "../personal-agent/personal-workspace.js";
import { createEnterpriseUserGatewayClient } from "../user/user-gateway-client.js";

const log = createSubsystemLogger("enterprise/prewarm");

/** Keep prewarm work bounded so it cannot monopolize the Gateway process. */
export const ENTERPRISE_PREWARM_MAX_CONCURRENCY = 2;

type PrewarmKind = "login-metadata" | "session-runtime";

type PrewarmContextResolver = () => GatewayRequestContext | undefined;

type PrewarmJob = {
  kind: PrewarmKind;
  accountId: string;
  sessionId: string;
  sessionKey?: string;
  agentId?: string;
  getContext?: PrewarmContextResolver;
  controller: AbortController;
  workspaceDir?: string;
  skillsWorkspaceDir?: string;
  skillsVersion?: number;
  pluginRegistryVersion?: number;
  configReference?: OpenClawConfig;
};

type PrewarmRunOutcome = "ready" | "failure" | "aborted";

type PrewarmRunResult = {
  outcome: PrewarmRunOutcome;
  config?: OpenClawConfig;
  reasonCode?: string;
};

const jobsByAccount = new Map<string, PrewarmJob>();
const pendingJobs: PrewarmJob[] = [];
let activeJobs = 0;
let foregroundRetryTimer: ReturnType<typeof setTimeout> | undefined;

function jobIsCurrent(job: PrewarmJob): boolean {
  return !job.controller.signal.aborted && jobsByAccount.get(job.accountId) === job;
}

function abortError(): Error {
  const error = new Error("enterprise prewarm was superseded");
  error.name = "EnterprisePrewarmAbortedError";
  return error;
}

function throwIfAborted(job: PrewarmJob): void {
  if (!jobIsCurrent(job)) {
    throw abortError();
  }
}

function hasForegroundChatActivity(): boolean {
  const candidates = new Set<PrewarmJob>([...pendingJobs, ...jobsByAccount.values()]);
  for (const job of candidates) {
    const controllers = job.getContext?.()?.chatAbortControllers;
    if (
      controllers instanceof Map &&
      [...controllers.values()].some(
        (active) =>
          active.kind !== "agent" &&
          active.controlUiVisible !== false &&
          active.projectSessionActive !== false,
      )
    ) {
      return true;
    }
  }
  return false;
}

function sortPendingJobs(): void {
  pendingJobs.sort((left, right) => {
    const leftPriority = left.kind === "session-runtime" ? 0 : 1;
    const rightPriority = right.kind === "session-runtime" ? 0 : 1;
    return leftPriority - rightPriority;
  });
}

async function prepareSessionRuntime(
  sandbox: ResolveSandboxContextParams,
  options: { signal: AbortSignal; assertCurrent: () => void },
): Promise<boolean> {
  options.assertCurrent();
  // Keep the Docker/SSH backend out of the Gateway's login and subscription
  // module graph. It is loaded only after a real Enterprise session has been
  // admitted and the background slot starts.
  const { prewarmSandboxForSession } = await import("../../agents/sandbox.js");
  // A revoke/config/skill change may have happened while the lazy runtime was
  // loading. Never start the canonical sandbox owner after that boundary.
  options.assertCurrent();
  const prepared = await prewarmSandboxForSession({
    ...sandbox,
    signal: options.signal,
    assertCurrent: options.assertCurrent,
  });
  // The sandbox owner shares its in-flight promise with the foreground
  // resolver. Do not publish this preparation as current if it completed after
  // the Enterprise admission was invalidated.
  options.assertCurrent();
  return prepared;
}

function prewarmTelemetryAttributes(
  job: PrewarmJob,
  result: PrewarmRunResult,
): Record<string, string | boolean> {
  return {
    kind: job.kind,
    outcome: result.outcome,
    ...(job.sessionKey ? { sessionKey: job.sessionKey } : {}),
    ...(job.agentId ? { agentId: job.agentId } : {}),
    ...(result.reasonCode ? { reasonCode: result.reasonCode } : {}),
  };
}

/**
 * Emit a payload-free span and terminal mark for benchmark correlation.
 *
 * The scheduler records only the normalized session key and agent id.
 * Enterprise auth session ids, cookies, message text, and provider payloads
 * never enter this diagnostics path. Events are reconstructed at completion
 * with their original monotonic boundaries, so a synchronous diagnostics write
 * cannot extend the measured prewarm duration.
 */
function emitPrewarmTelemetry(
  job: PrewarmJob,
  result: PrewarmRunResult,
  startedAtMs: number,
  endedAtMs: number,
): void {
  try {
    const durationMs = Math.max(0, endedAtMs - startedAtMs);
    const attributes = prewarmTelemetryAttributes(job, result);
    const spanId = randomUUID();
    const options = result.config ? { config: result.config } : {};
    emitDiagnosticsTimelineEvent(
      {
        type: "span.start",
        name: "enterprise.prewarm",
        phase: "enterprise-prewarm",
        spanId,
        monotonicMs: startedAtMs,
        attributes,
      },
      options,
    );
    if (result.outcome === "ready") {
      emitDiagnosticsTimelineEvent(
        {
          type: "span.end",
          name: "enterprise.prewarm",
          phase: "enterprise-prewarm",
          spanId,
          monotonicMs: endedAtMs,
          durationMs,
          attributes,
        },
        options,
      );
    } else {
      emitDiagnosticsTimelineEvent(
        {
          type: "span.error",
          name: "enterprise.prewarm",
          phase: "enterprise-prewarm",
          spanId,
          monotonicMs: endedAtMs,
          durationMs,
          errorName:
            result.outcome === "aborted"
              ? "EnterprisePrewarmAbortedError"
              : "EnterprisePrewarmError",
          attributes,
        },
        options,
      );
    }
    emitDiagnosticsTimelineEvent(
      {
        type: "mark",
        name:
          result.outcome === "ready" ? "enterprise.prewarm.ready" : "enterprise.prewarm.failure",
        phase: "enterprise-prewarm",
        monotonicMs: endedAtMs,
        durationMs,
        attributes,
      },
      options,
    );
  } catch {
    // Diagnostics must never change the scheduler's background lifecycle.
  }
}

function resolveLiveContext(job: PrewarmJob): GatewayRequestContext | undefined {
  const captured = job.getContext?.();
  if (!captured) {
    return undefined;
  }
  // The dispatcher hands Enterprise handlers a scoped proxy whose resolver
  // intentionally points back to itself. Recover the host's current config
  // for this fresh admission while retaining the live kernel methods on the
  // captured context. This prevents a second projection over an old proxy.
  const resolved = captured.resolveGatewayContext?.();
  const base = resolved && resolved !== captured ? resolved : captured;
  let hostConfig: OpenClawConfig;
  try {
    hostConfig = getRuntimeConfig();
  } catch {
    hostConfig = base.getRuntimeConfig();
  }
  const liveContext = new Proxy(base, {
    get(target, property, receiver) {
      if (property === "getRuntimeConfig") {
        return () => hostConfig;
      }
      if (property === "resolveGatewayContext") {
        return () => liveContext;
      }
      return Reflect.get(target, property, receiver);
    },
  }) as GatewayRequestContext;
  return liveContext;
}

function resolveDefaultAgentId(config: OpenClawConfig, account: EnterpriseAccount): string {
  if (account.personalAgentEnabled) {
    return resolveEnterprisePersonalAgentId(config, account);
  }
  return normalizeAgentId(account.defaultAgentId ?? "main");
}

function resolveWorkspaceDir(config: OpenClawConfig, agentId: string): string | undefined {
  try {
    // The projected Enterprise config keeps the same private workspace path as
    // the foreground attempt. If a custom agent scope cannot resolve it, let
    // the sandbox owner apply its ordinary default.
    return resolveAgentWorkspaceDir(config, agentId);
  } catch {
    return undefined;
  }
}

function resolveWorkspaceFingerprint(
  account: EnterpriseAccount,
  agentId: string,
): {
  workspaceDir?: string;
  skillsVersion: number;
} {
  let workspaceDir: string | undefined;
  try {
    workspaceDir = resolveEnterpriseWorkspacePath(account.profileId, agentId);
  } catch {
    workspaceDir = undefined;
  }
  return {
    ...(workspaceDir ? { workspaceDir } : {}),
    skillsVersion: getSkillsSnapshotVersion(workspaceDir),
  };
}

function assertTaskCurrent(
  job: PrewarmJob,
  account: EnterpriseAccount,
  client: ReturnType<typeof createEnterpriseUserGatewayClient>,
  config: OpenClawConfig,
  agentId: string,
): void {
  throwIfAborted(job);
  const activeSession = getActiveEnterpriseSession(job.sessionId, {}, "user");
  const currentAccount = getEnterpriseAccountById(job.accountId);
  if (
    !activeSession ||
    activeSession.accountId !== job.accountId ||
    activeSession.audience !== "user" ||
    !currentAccount?.enabled ||
    currentAccount.policyRevision !== account.policyRevision ||
    currentAccount.updatedAt !== account.updatedAt
  ) {
    throw abortError();
  }
  let liveConfig = config;
  try {
    liveConfig = getRuntimeConfig();
  } catch {
    // The request context remains the authoritative fallback during startup
    // and in focused tests without a process config singleton.
  }
  // Runtime config objects are immutable snapshots. Config writes publish a
  // new object and notify the invalidation listener, so identity is enough and
  // avoids hashing the complete config on every assertion.
  if (job.configReference && liveConfig !== job.configReference) {
    throw abortError();
  }
  if (
    job.pluginRegistryVersion !== undefined &&
    getActivePluginRegistryVersion() !== job.pluginRegistryVersion
  ) {
    throw abortError();
  }
  if (
    job.skillsVersion !== undefined &&
    getSkillsSnapshotVersion(job.skillsWorkspaceDir) !== job.skillsVersion
  ) {
    throw abortError();
  }
  if (job.kind !== "session-runtime" || !job.sessionKey) {
    return;
  }
  const target = resolveSessionSharingTarget({
    cfg: liveConfig,
    sessionKey: job.sessionKey,
    agentId,
  });
  if (!target) {
    throw abortError();
  }
  const role = resolveSessionSharingRole({ cfg: liveConfig, client, target });
  if (role !== "owner" && role !== "admin") {
    throw abortError();
  }
}

function schedule(job: PrewarmJob): void {
  const existing = jobsByAccount.get(job.accountId);
  if (existing) {
    const sameSession =
      existing.sessionId === job.sessionId &&
      existing.sessionKey === job.sessionKey &&
      existing.kind === job.kind;
    if (sameSession) {
      return;
    }
    existing.controller.abort(abortError());
    // The active job will be removed by its finally block. A queued job is
    // removed here so it cannot consume a slot after being superseded.
    const index = pendingJobs.indexOf(existing);
    if (index >= 0) {
      pendingJobs.splice(index, 1);
    }
  }
  jobsByAccount.set(job.accountId, job);
  pendingJobs.push(job);
  // A real user turn wins first, then preparation for the selected session,
  // then login-only metadata. This is evaluated from the live context at each
  // enqueue, so an agent/tool run cannot accidentally claim foreground status.
  sortPendingJobs();
  drain();
}

function retryAfterForegroundWork(): void {
  if (foregroundRetryTimer || pendingJobs.length === 0) {
    return;
  }
  foregroundRetryTimer = setTimeout(() => {
    foregroundRetryTimer = undefined;
    drain();
  }, 100);
  foregroundRetryTimer.unref?.();
}

function drain(): void {
  sortPendingJobs();
  // Background preparation must yield while a visible user turn is queued or
  // executing anywhere represented by the live Gateway context. Active
  // prewarms are allowed to finish; this gate only prevents a new one from
  // taking CPU/IO slots away from the foreground lane.
  if (hasForegroundChatActivity()) {
    retryAfterForegroundWork();
    return;
  }
  while (activeJobs < ENTERPRISE_PREWARM_MAX_CONCURRENCY && pendingJobs.length > 0) {
    const job = pendingJobs.shift();
    if (!job || !jobIsCurrent(job)) {
      continue;
    }
    activeJobs += 1;
    // Deferring the first line of work is required: admission and Enterprise
    // projection are synchronous today and must never delay the login/subscribe
    // response that scheduled this task.
    setImmediate(() => {
      const startedAtMs = performance.now();
      void run(job)
        .then(
          (result) => {
            emitPrewarmTelemetry(job, result, startedAtMs, performance.now());
          },
          (error: unknown) => {
            // `run` normally converts every outcome to a result. Keep this
            // final boundary defensive so an unexpected implementation error
            // still produces a failure mark and never becomes unhandled work.
            emitPrewarmTelemetry(
              job,
              { outcome: "failure", reasonCode: "unexpected" },
              startedAtMs,
              performance.now(),
            );
            log.warn(`Enterprise prewarm failed unexpectedly: ${String(error)}`);
          },
        )
        .finally(() => {
          activeJobs -= 1;
          if (jobsByAccount.get(job.accountId) === job) {
            jobsByAccount.delete(job.accountId);
          }
          drain();
        });
    });
  }
}

async function run(job: PrewarmJob): Promise<PrewarmRunResult> {
  let config: OpenClawConfig | undefined;
  try {
    throwIfAborted(job);
    const context = resolveLiveContext(job);
    if (!context) {
      return { outcome: "failure", reasonCode: "context_unavailable" };
    }
    const contextConfig = context.getRuntimeConfig();
    config = contextConfig;
    const account = getEnterpriseAccountById(job.accountId);
    if (!account) {
      return { outcome: "failure", config, reasonCode: "account_unavailable" };
    }
    if (!account.enabled) {
      return { outcome: "failure", config, reasonCode: "account_disabled" };
    }
    const client = createEnterpriseUserGatewayClient(account, job.sessionId);
    const agentId = job.agentId ?? resolveDefaultAgentId(config, account);
    // Login jobs resolve their default agent here so the completion mark can
    // be correlated with the warmed runtime without retaining auth identity.
    job.agentId = agentId;
    const sessionTarget =
      job.kind === "session-runtime" && job.sessionKey
        ? resolveSessionSharingTarget({
            cfg: config,
            sessionKey: job.sessionKey,
            agentId,
          })
        : undefined;
    if (job.kind === "session-runtime" && job.sessionKey) {
      // Prove ownership before Enterprise admission projects the account
      // runtime. Projection can create private workspace state, so an
      // unowned key must return before any resource preparation starts.
      if (!sessionTarget) {
        return { outcome: "failure", config, reasonCode: "session_unavailable" };
      }
      const role = resolveSessionSharingRole({ cfg: config, client, target: sessionTarget });
      if (role !== "owner" && role !== "admin") {
        return { outcome: "failure", config, reasonCode: "session_not_owned" };
      }
    }
    const requestParams = job.sessionKey ? { agentId, sessionKey: job.sessionKey } : { agentId };
    const admission = prepareEnterpriseGatewayRequest({
      client,
      context,
      method: job.kind === "login-metadata" ? "chat.metadata" : "chat.startup",
      requestParams,
    });
    if (!admission.allowed) {
      return { outcome: "failure", config, reasonCode: "admission_denied" };
    }
    const projectedContext = admission.context;
    const projectedConfig = projectedContext.getRuntimeConfig();
    const workspaceFacts = resolveWorkspaceFingerprint(account, agentId);
    job.configReference = config;
    job.pluginRegistryVersion = getActivePluginRegistryVersion();
    job.skillsWorkspaceDir = workspaceFacts.workspaceDir;
    job.skillsVersion = workspaceFacts.skillsVersion;
    job.workspaceDir = resolveWorkspaceDir(projectedConfig, agentId);
    const assertCurrent = () => assertTaskCurrent(job, account, client, contextConfig, agentId);
    assertCurrent();

    if (job.kind === "login-metadata") {
      // Enterprise chat.metadata intentionally returns its static projection
      // from the handler. Admission above already prepared the authorized
      // default Agent without reading the operator metadata store.
      return { outcome: "ready", config };
    }

    if (!job.sessionKey) {
      return { outcome: "failure", config, reasonCode: "session_key_missing" };
    }
    const sandbox: ResolveSandboxContextParams = {
      config: projectedConfig,
      agentId,
      signal: job.controller.signal,
      assertCurrent,
      sessionKey: job.sessionKey,
      ...(job.workspaceDir ? { workspaceDir: job.workspaceDir } : {}),
    };
    const runtimePrepared = await prepareSessionRuntime(sandbox, {
      signal: job.controller.signal,
      assertCurrent,
    });
    assertCurrent();
    if (!runtimePrepared) {
      // The canonical sandbox owner reports optional preparation failures as
      // false. Never publish a ready mark without a successful runtime warmup.
      return { outcome: "failure", config, reasonCode: "runtime_failed" };
    }
    return { outcome: "ready", config };
  } catch (error) {
    const aborted =
      job.controller.signal.aborted ||
      (error instanceof Error && error.name === "EnterprisePrewarmAbortedError");
    if (!aborted) {
      log.warn(`Enterprise prewarm ${job.kind} skipped after preparation error: ${String(error)}`);
    }
    return {
      outcome: aborted ? "aborted" : "failure",
      ...(config ? { config } : {}),
      reasonCode: aborted ? "invalidated" : "unexpected",
    };
  }
}

export function scheduleEnterpriseLoginPrewarm(params: {
  accountId: string;
  sessionId: string;
  getContext?: PrewarmContextResolver;
}): void {
  schedule({
    kind: "login-metadata",
    accountId: params.accountId,
    sessionId: params.sessionId,
    ...(params.getContext ? { getContext: params.getContext } : {}),
    controller: new AbortController(),
  });
}

export function scheduleEnterpriseSessionPrewarm(params: {
  accountId: string;
  sessionId: string;
  sessionKey: string;
  agentId: string;
  getContext?: PrewarmContextResolver;
}): void {
  const sessionKey = params.sessionKey.trim();
  const agentId = normalizeAgentId(params.agentId);
  if (!sessionKey || !agentId) {
    return;
  }
  schedule({
    kind: "session-runtime",
    accountId: params.accountId,
    sessionId: params.sessionId,
    sessionKey,
    agentId,
    ...(params.getContext ? { getContext: params.getContext } : {}),
    controller: new AbortController(),
  });
}

export function invalidateEnterprisePrewarmForAccount(params: {
  accountId: string;
  sessionId?: string;
  sessionKey?: string;
  reason?: string;
}): void {
  const job = jobsByAccount.get(params.accountId);
  if (
    job &&
    (!params.sessionId || job.sessionId === params.sessionId) &&
    (!params.sessionKey || job.sessionKey === params.sessionKey)
  ) {
    job.controller.abort(abortError());
    jobsByAccount.delete(params.accountId);
    const index = pendingJobs.indexOf(job);
    if (index >= 0) {
      pendingJobs.splice(index, 1);
    }
  }
}

export function invalidateAllEnterprisePrewarms(reason = "enterprise runtime changed"): void {
  const accountIds = new Set(jobsByAccount.keys());
  for (const accountId of accountIds) {
    invalidateEnterprisePrewarmForAccount({ accountId, reason });
  }
}

registerEnterpriseSessionRevocationListener((event: EnterpriseSessionRevocationEvent) => {
  if (event.accountId) {
    invalidateEnterprisePrewarmForAccount({ accountId: event.accountId, reason: event.reason });
    return;
  }
  // A raw session revoke (logout) carries no account lookup to keep the revoke
  // transaction single-purpose. Match the stable session id in the local map.
  if (event.sessionId) {
    for (const job of jobsByAccount.values()) {
      if (job.sessionId === event.sessionId) {
        invalidateEnterprisePrewarmForAccount({
          accountId: job.accountId,
          sessionId: event.sessionId,
          reason: event.reason,
        });
      }
    }
  }
});

registerRuntimeConfigWriteListener(() => {
  invalidateAllEnterprisePrewarms("runtime config changed");
});

registerSkillsChangeListener((event) => {
  if (!event.workspaceDir) {
    invalidateAllEnterprisePrewarms("skills changed");
    return;
  }
  for (const job of jobsByAccount.values()) {
    if (job.workspaceDir === event.workspaceDir || job.skillsWorkspaceDir === event.workspaceDir) {
      invalidateEnterprisePrewarmForAccount({ accountId: job.accountId, reason: "skills changed" });
    }
  }
});
