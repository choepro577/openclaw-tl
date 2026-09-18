// Per-request Enterprise projection over the existing Gateway runtime.
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import { cloneConfigWithResolutionFacts } from "../../config/resolution-facts.js";
import { registerRuntimeConfigWriteListener } from "../../config/runtime-snapshot.js";
import type { AgentConfig, AgentEntryConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentToolsConfig, ToolAllowDenyPolicyConfig } from "../../config/types.tools.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import type { GatewayClient, GatewayRequestContext } from "../../gateway/server-methods/types.js";
import {
  emitDiagnosticsTimelineEvent,
  getActiveDiagnosticsTimelineSpan,
} from "../../infra/diagnostics-timeline.js";
import { getActivePluginRegistryVersion } from "../../plugins/runtime.js";
import { normalizeAgentId, parseAgentSessionKey } from "../../routing/session-key.js";
import { registerSkillsChangeListener } from "../../skills/runtime/refresh-state.js";
import { openOpenClawStateDatabase } from "../../state/openclaw-state-db.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { getEnterpriseAccountByProfileId } from "../accounts/account-store.js";
import { readEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { getActiveEnterpriseSession } from "../auth/session-store.js";
import {
  listEnterpriseDelegationCandidates,
  type EnterpriseDelegationCandidate,
} from "../delegation/delegation-candidates.js";
import { explicitlyMentionedEnterpriseAgentIds } from "../delegation/delegation-explicit-match.js";
import { readEnterpriseDelegationPolicy } from "../delegation/delegation-store.js";
import { isEnterpriseEnabled } from "../enterprise-config.js";
import {
  listEnterpriseEntitlements,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import {
  ENTERPRISE_ACCESS_PRESET_BASIC,
  ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  enterpriseRuntimeResourceId,
  parseEnterpriseResourceKey,
  personalAgentResourceKey,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { listActiveEnterpriseCodexPluginGrants } from "../extensions/codex-plugin-store.js";
import { verifiedEnterpriseUserSkillsForRuntimeAgent } from "../extensions/extension-runtime-integrity.js";
import { createEnterpriseKnowledgeAuthority } from "../knowledge/authority.js";
import { subscribeKnowledgeAccessChanges } from "../knowledge/knowledge-access-changes.js";
import { listPublishedZonesForAgent } from "../knowledge/knowledge-zone-store.js";
import {
  resolveEnterprisePersonalAgentId,
  resolveEnterprisePersonalAgentTemplateId,
} from "../personal-agent/personal-agent-config.js";
import { ensureEnterpriseWorkspaceFromTemplate } from "../personal-agent/personal-workspace.js";
import { isEnterpriseHostScriptSource } from "../skill-runtime/skill-script-runtime.js";
import {
  resolveEnterprisePersonalAgentCapabilities,
  resolveEnterpriseSharedAgentCapabilities,
} from "./enterprise-agent-capabilities.js";
import { compileEnterpriseToolPolicy } from "./enterprise-tool-policy.js";
import {
  enterpriseUserGatewayMethodAllowed,
  enterpriseUserGatewayParamsAllowed,
} from "./enterprise-user-methods.js";

const EMPLOYEE_BLOCKED_METHODS = new Set([
  "agents.create",
  "agents.delete",
  "agents.update",
  "agents.files.set",
  "node.invoke",
  "plugins.install",
  "plugins.uninstall",
  "plugins.update",
  "skills.install",
  "skills.update",
]);

const EMPLOYEE_BLOCKED_PREFIXES = [
  "config.",
  "exec.",
  "terminal.",
  "gateway.",
  "device.",
  "node.",
] as const;

const KNOWLEDGE_TOOL_IDS: readonly string[] = [
  "enterprise_knowledge_search",
  "enterprise_knowledge_get",
];
const SKILL_SCRIPT_TOOL_ID = "skill_script";

type EnterpriseCacheInvalidationReason = "config" | "account" | "skills" | "knowledge";

function emitEnterpriseCacheStatus(params: {
  config: OpenClawConfig;
  name: "enterprise.gateway.delegation_facts_cache" | "enterprise.gateway.runtime_projection_cache";
  state: "hit" | "miss";
  reason?: EnterpriseCacheInvalidationReason;
}): void {
  const activeSpan = getActiveDiagnosticsTimelineSpan();
  emitDiagnosticsTimelineEvent(
    {
      type: "mark",
      name: params.name,
      ...(activeSpan?.runId ? { runId: activeSpan.runId } : {}),
      ...(activeSpan?.phase ? { phase: activeSpan.phase } : { phase: "enterprise-admission" }),
      attributes: {
        cache: params.state,
        ...(params.reason ? { invalidationReason: params.reason } : {}),
      },
    },
    { config: params.config },
  );
}

type EnterpriseDelegationFactsCacheEntry = {
  accountPolicyRevision: number;
  delegationPolicyRevision: number;
  skillsRevision: number;
  candidates: EnterpriseDelegationCandidate[];
};

// A projected config is an immutable prepared-runtime snapshot. Keep only the
// expensive assignment/profile facts on that snapshot; account/session auth,
// request metadata, and live capability checks remain outside this cache. The
// WeakMap follows the prepared owner lifetime, while owner revisions fence
// durable policy and Knowledge changes.
const enterpriseDelegationFactsCache = new WeakMap<
  OpenClawConfig,
  Map<string, EnterpriseDelegationFactsCacheEntry>
>();
const MAX_ENTERPRISE_DELEGATION_FACTS_ENTRIES = 256;
let enterpriseSkillsRevision = 0;

// Skill refresh versions are monotonic per workspace, so taking the maximum
// across workspaces is not a valid aggregate: an update in workspace B can be
// hidden by an older, larger version in workspace A. The refresh event is the
// ownership boundary; one process-local revision invalidates every prepared
// Enterprise facts snapshot when any skill source changes.
const ensureEnterpriseSkillsInvalidationListener = (() => {
  const listener = () => {
    enterpriseSkillsRevision += 1;
  };
  return () => {
    // Tests reset refresh-state listeners between cases. Re-registering the
    // same function is idempotent in the Set and keeps this cache correct.
    registerSkillsChangeListener(listener);
  };
})();

let enterpriseKnowledgeRevision = 0;

// Knowledge bindings, publication selection, and zone access have their own
// revision domain. The post-commit event is the owner boundary, so a cached
// projection never has to scan every allowed Agent on a cache hit while a
// committed Knowledge mutation still invalidates the projection immediately.
subscribeKnowledgeAccessChanges(() => {
  enterpriseKnowledgeRevision += 1;
});

type EnterpriseRuntimeProjectionCacheEntry = {
  accountPolicyRevision: number;
  configGeneration: number;
  delegationCandidates: readonly EnterpriseDelegationCandidate[];
  knowledgeRevision: number;
  /** SQLite fence catches committed mutations made by another process. */
  stateDatabaseVersion?: number;
  pluginRegistryVersion: number;
  skillsRevision: number;
  allowedAgentIds: readonly string[];
  knowledgeAgentIds: readonly string[];
  projectedConfig: OpenClawConfig;
};

// Workspace/template materialization is the largest synchronous part of the
// Enterprise admission projection. The prepared config object is immutable;
// retain it by the prepared config owner and account policy revision, then
// return a fresh top-level object before request metadata is attached. The
// request metadata lives in a WeakMap keyed by that returned object, so sharing
// the cached projection itself would let one request overwrite another.
const enterpriseRuntimeProjectionCache = new WeakMap<
  OpenClawConfig,
  Map<string, EnterpriseRuntimeProjectionCacheEntry>
>();
const MAX_ENTERPRISE_RUNTIME_PROJECTION_ENTRIES = 128;
let enterpriseRuntimeProjectionGeneration = 0;

function readEnterpriseStateDatabaseVersion(): number | undefined {
  try {
    const row = openOpenClawStateDatabase().db.prepare("PRAGMA data_version").get() as {
      data_version?: unknown;
    };
    return typeof row.data_version === "number" ? row.data_version : undefined;
  } catch {
    // A cache hit is never safe without the durable fence. The normal
    // projection path still performs its existing live reads and will rebuild.
    return undefined;
  }
}

// Runtime config writes replace the prepared owner or change its policy
// inputs. Keep the generation fence here instead of hashing the whole config
// on each admission; a direct caller that owns a standalone config remains
// fenced by that config object's identity.
registerRuntimeConfigWriteListener(() => {
  enterpriseRuntimeProjectionGeneration += 1;
});

function resolveEnterpriseKnowledgeAgentIds(
  account: EnterpriseAccount,
  allowed: ReadonlySet<string>,
  personalAgentId: string,
): string[] {
  return [...allowed]
    .filter((agentId) => {
      const resourceKey =
        agentId === personalAgentId
          ? personalAgentResourceKey(account.id)
          : sharedAgentResourceKey(agentId);
      // `allowed` is resolved from the same account policy revision. Knowledge
      // access itself is fenced by enterpriseKnowledgeRevision below.
      return listPublishedZonesForAgent(resourceKey, undefined).length > 0;
    })
    .toSorted();
}

function cloneEnterpriseRuntimeProjection(config: OpenClawConfig): OpenClawConfig {
  // markGatewayRequestScopedRuntimeConfig stores mutable request metadata by
  // config identity. A root clone is sufficient to isolate that metadata while
  // preserving the immutable nested projection without a full deep clone on
  // every message.
  return { ...config };
}

function freezeEnterpriseRuntimeProjection<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value as object)) {
    return value;
  }
  seen.add(value as object);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    freezeEnterpriseRuntimeProjection(nested, seen);
  }
  return Object.freeze(value);
}

function ownImmutableEnterpriseRuntimeProjection(config: OpenClawConfig): OpenClawConfig {
  // The cache must own every nested value before freezing. Freezing the
  // projection assembled from `config` would freeze the caller's runtime
  // snapshot and make later config publication fail in surprising ways.
  return freezeEnterpriseRuntimeProjection(cloneConfigWithResolutionFacts(config));
}

function resolveEnterpriseDelegationFacts(
  config: OpenClawConfig,
  account: EnterpriseAccount,
): EnterpriseDelegationCandidate[] {
  ensureEnterpriseSkillsInvalidationListener();
  const delegationPolicyRevision = readEnterpriseDelegationPolicy().revision;
  const byAccount =
    enterpriseDelegationFactsCache.get(config) ??
    new Map<string, EnterpriseDelegationFactsCacheEntry>();
  enterpriseDelegationFactsCache.set(config, byAccount);
  const cached = byAccount.get(account.id);
  const factsCacheMissReason: EnterpriseCacheInvalidationReason | undefined = !cached
    ? "config"
    : cached.accountPolicyRevision !== account.policyRevision ||
        cached.delegationPolicyRevision !== delegationPolicyRevision
      ? "account"
      : cached.skillsRevision !== enterpriseSkillsRevision
        ? "skills"
        : undefined;
  if (cached && factsCacheMissReason === undefined) {
    emitEnterpriseCacheStatus({
      config,
      name: "enterprise.gateway.delegation_facts_cache",
      state: "hit",
    });
    return cached.candidates;
  }
  emitEnterpriseCacheStatus({
    config,
    name: "enterprise.gateway.delegation_facts_cache",
    state: "miss",
    reason: factsCacheMissReason,
  });
  const candidates = listEnterpriseDelegationCandidates(config, account);
  if (byAccount.size >= MAX_ENTERPRISE_DELEGATION_FACTS_ENTRIES) {
    const oldest = byAccount.keys().next().value;
    if (oldest !== undefined) {
      byAccount.delete(oldest);
    }
  }
  byAccount.set(account.id, {
    accountPolicyRevision: account.policyRevision,
    delegationPolicyRevision,
    skillsRevision: enterpriseSkillsRevision,
    candidates,
  });
  return candidates;
}

export type EnterpriseGatewayAdmission =
  | { allowed: true; context: GatewayRequestContext; account?: EnterpriseAccount }
  | { allowed: false; reason: string; closeConnection: boolean };

function explicitAgentAccess(account: EnterpriseAccount): {
  allowed: Set<string>;
  denied: Set<string>;
} {
  const allowed = new Set<string>();
  const denied = new Set<string>();
  for (const item of listEnterpriseEntitlements(account.id)) {
    if (item.resourceType !== "agent" || item.resourceState !== "active") {
      continue;
    }
    if (parseEnterpriseResourceKey("agent", item.resourceId).scope === "personal") {
      continue;
    }
    const agentId = normalizeAgentId(enterpriseRuntimeResourceId("agent", item.resourceId));
    if (item.effect === "deny") {
      denied.add(agentId);
      allowed.delete(agentId);
    } else if (!denied.has(agentId)) {
      allowed.add(agentId);
    }
  }
  return { allowed, denied };
}

export function resolveEnterpriseAllowedAgentIds(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  options: { userAudience?: boolean } = {},
): Set<string> {
  const access =
    account.role === "administrator"
      ? {
          allowed: new Set(listAgentEntries(config).map((entry) => normalizeAgentId(entry.id))),
          denied: new Set<string>(),
        }
      : explicitAgentAccess(account);
  if (
    resolveEnterpriseResourceAccess(account, "agent", personalAgentResourceKey(account.id)).allowed
  ) {
    access.allowed.add(resolveEnterprisePersonalAgentId(config, account));
  }
  for (const denied of access.denied) {
    access.allowed.delete(denied);
  }
  if (options.userAudience === true) {
    for (const agentId of access.allowed) {
      if (isReservedSystemAgentId(agentId)) {
        access.allowed.delete(agentId);
      }
    }
  }
  return access.allowed;
}

function intersectAllowed(
  base: readonly string[] | undefined,
  granted: readonly string[],
): string[] {
  if (!base) {
    return [...new Set(granted)].toSorted();
  }
  const configured = new Set(base);
  return [...new Set(granted.filter((value) => configured.has(value)))].toSorted();
}

function intersectToolGrants(
  configuredAllow: readonly string[] | undefined,
  granted: readonly string[],
): string[] {
  if (granted.length === 0) {
    return [];
  }
  if (!configuredAllow || configuredAllow.length === 0) {
    return [...new Set(granted)].toSorted();
  }
  return [
    ...new Set([
      ...granted.filter((toolId) =>
        isToolAllowedByPolicyName(toolId, { allow: [...configuredAllow] }),
      ),
      ...configuredAllow.filter((toolId) =>
        isToolAllowedByPolicyName(toolId, { allow: [...granted] }),
      ),
    ]),
  ].toSorted();
}

function removeSandboxDeniesCoveredByAccountGrants(
  sandboxDeny: readonly string[],
  accountAllow: readonly string[],
): string[] {
  if (accountAllow.length === 0) {
    return [...sandboxDeny];
  }
  if (accountAllow.some((toolId) => toolId.trim() === "*")) {
    // The projected account-level tools.allow remains the security cap. Removing
    // a broad sandbox deny here therefore cannot expose an ungranted tool, while
    // it lets an explicit account grant survive the sandbox stage.
    return [];
  }
  return sandboxDeny.filter(
    (denyPattern) =>
      !accountAllow.some((toolId) => isToolAllowedByPolicyName(toolId, { allow: [denyPattern] })),
  );
}

function scopedTools(
  configured: AgentToolsConfig | undefined,
  globalSandboxPolicy: ToolAllowDenyPolicyConfig | undefined,
  accountAllow: readonly string[],
  accountDeny: readonly string[],
  restricted: boolean,
  accountScoped = true,
): AgentToolsConfig | undefined {
  if (!restricted) {
    return configured;
  }
  const allowedForAgent = accountScoped
    ? intersectToolGrants(configured?.allow, accountAllow)
    : configured?.allow;
  const denied = [
    ...new Set([...(configured?.deny ?? []), ...(accountScoped ? accountDeny : [])]),
  ].toSorted();
  const inheritedSandboxDeny = [
    ...(configured?.sandbox?.tools?.deny ?? globalSandboxPolicy?.deny ?? []),
  ];
  const accountSandboxAllow = accountScoped
    ? accountAllow.filter((toolId) => isToolAllowedByPolicyName(toolId, { deny: [...accountDeny] }))
    : [];
  const sandboxAlsoAllow = [
    ...new Set([
      ...(configured?.sandbox?.tools?.alsoAllow ?? globalSandboxPolicy?.alsoAllow ?? []),
      ...(configured?.allow ?? []),
      ...accountSandboxAllow,
      ...(allowedForAgent ?? []).filter((toolId) =>
        isToolAllowedByPolicyName(toolId, { deny: denied }),
      ),
    ]),
  ].toSorted();
  const sandboxDeny = [
    ...new Set([
      ...(accountScoped
        ? removeSandboxDeniesCoveredByAccountGrants(inheritedSandboxDeny, accountSandboxAllow)
        : inheritedSandboxDeny),
      ...denied,
    ]),
  ].toSorted();
  return {
    ...configured,
    // Account grants must survive the profile stage. Preserve an Agent allowlist
    // as an independent runtime restriction while the account-scoped global
    // allowlist remains the final security cap.
    allow: allowedForAgent,
    alsoAllow: accountScoped ? allowedForAgent : configured?.alsoAllow,
    deny: denied,
    elevated: { ...configured?.elevated, enabled: false },
    fs: { ...configured?.fs, workspaceOnly: true },
    exec: {
      ...configured?.exec,
      host: "sandbox",
      applyPatch: { ...configured?.exec?.applyPatch, workspaceOnly: true },
    },
    // The Admin policy remains the only account-scoped grant source. Mirror
    // those grants into the request-scoped sandbox policy so default sandbox
    // denies (for example web and browser tools) do not silently override the
    // Admin checkbox. An explicit sandbox deny is preserved and still wins.
    sandbox: {
      ...configured?.sandbox,
      tools: {
        ...globalSandboxPolicy,
        ...configured?.sandbox?.tools,
        alsoAllow: sandboxAlsoAllow,
        deny: sandboxDeny,
      },
    },
  };
}

function scopedSkills(
  config: OpenClawConfig,
  agent: AgentConfig,
  account: EnterpriseAccount,
  workspaceDir: string,
  entitlementAgentId = agent.id,
  restricted = account.role === "employee",
  requiresAccountGrant = restricted,
): string[] | undefined {
  if (!restricted) {
    return agent.skills;
  }
  if (!requiresAccountGrant) {
    const inherited = agent.skills ?? config.agents?.defaults?.skills;
    return inherited === undefined ? undefined : [...new Set(inherited)].toSorted();
  }
  const grantedEntitlements = listEnterpriseEntitlements(account.id)
    .filter(
      (item) =>
        item.resourceType === "skill" && item.resourceState === "active" && item.effect === "allow",
    )
    .filter((item) => resolveEnterpriseResourceAccess(account, "skill", item.resourceId).allowed);
  const granted = grantedEntitlements
    .filter((item) => {
      const parsed = parseEnterpriseResourceKey("skill", item.resourceId);
      return (
        parsed.scope !== "agent" ||
        normalizeAgentId(parsed.agentId ?? "") === normalizeAgentId(entitlementAgentId)
      );
    })
    .map((item) => enterpriseRuntimeResourceId("skill", item.resourceId));
  const explicitDenied = new Set(
    listEnterpriseEntitlements(account.id)
      .filter(
        (item) =>
          item.resourceType === "skill" &&
          item.resourceState === "active" &&
          item.effect === "deny",
      )
      .map((item) => enterpriseRuntimeResourceId("skill", item.resourceId)),
  );
  const installed = verifiedEnterpriseUserSkillsForRuntimeAgent({
    accountId: account.id,
    runtimeAgentId: normalizeAgentId(agent.id),
    workspaceDir,
  })
    .map((install) => install.skillName)
    .filter((skillName) => !explicitDenied.has(skillName));
  return [
    ...new Set([
      ...intersectAllowed(agent.skills ?? config.agents?.defaults?.skills, granted),
      ...installed,
    ]),
  ].toSorted();
}

function toScopedAgent(
  config: OpenClawConfig,
  agent: AgentConfig,
  account: EnterpriseAccount,
  defaultAgentId: string,
  accountToolAllow: readonly string[],
  accountToolDeny: readonly string[],
  templateAgentId = agent.id,
  restricted = account.role === "employee",
  requiresSkillGrant = restricted,
  accountScopedTools = true,
): AgentConfig {
  const agentId = normalizeAgentId(agent.id);
  const templateWorkspace = resolveAgentWorkspaceDir(config, normalizeAgentId(templateAgentId));
  const workspaceDir = ensureEnterpriseWorkspaceFromTemplate(
    account.profileId,
    agentId,
    templateWorkspace,
  );
  const configuredSandbox = agent.sandbox ?? config.agents?.defaults?.sandbox;
  const effectiveSandbox = configuredSandbox ?? { mode: "all" as const };
  return {
    ...agent,
    id: agentId,
    default: agentId === defaultAgentId,
    workspace: workspaceDir,
    // Enterprise user and automation requests execute in an isolated container by default.
    // Keeping this request-scoped makes Docker-unavailable failures fail closed without mutating
    // the host config or weakening the Admin control-plane.
    sandbox: {
      ...effectiveSandbox,
      mode: "all" as const,
      backend: "docker",
      workspaceAccess: effectiveSandbox.workspaceAccess ?? "rw",
      scope: "session" as const,
      docker: {
        ...effectiveSandbox.docker,
        memory:
          agent.sandbox?.docker?.memory ?? config.agents?.defaults?.sandbox?.docker?.memory ?? "1g",
        memorySwap:
          agent.sandbox?.docker?.memorySwap ??
          config.agents?.defaults?.sandbox?.docker?.memorySwap ??
          "1g",
        pidsLimit:
          agent.sandbox?.docker?.pidsLimit ??
          config.agents?.defaults?.sandbox?.docker?.pidsLimit ??
          256,
        // Skills can reach LAN services; explicit agent/global network policy still wins.
        network:
          agent.sandbox?.docker?.network ??
          config.agents?.defaults?.sandbox?.docker?.network ??
          "bridge",
      },
      browser: {
        ...effectiveSandbox.browser,
        maxRunningContainers:
          agent.sandbox?.browser?.maxRunningContainers ??
          config.agents?.defaults?.sandbox?.browser?.maxRunningContainers ??
          3,
      },
      prune: {
        ...effectiveSandbox.prune,
        idleHours:
          agent.sandbox?.prune?.idleHours ??
          config.agents?.defaults?.sandbox?.prune?.idleHours ??
          0.25,
      },
    },
    skills: scopedSkills(
      config,
      agent,
      account,
      workspaceDir,
      templateAgentId,
      restricted,
      requiresSkillGrant,
    ),
    tools: scopedTools(
      agent.tools,
      config.tools?.sandbox?.tools,
      accountToolAllow,
      accountToolDeny,
      restricted,
      accountScopedTools,
    ),
  };
}

export function projectEnterpriseRuntimeConfig(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  options: {
    userAudience?: boolean;
    /** Reuse the roster already resolved for this request when available. */
    delegationCandidates?: readonly EnterpriseDelegationCandidate[];
    /** Reuse the admission entitlement set instead of resolving it twice. */
    allowedAgentIds?: ReadonlySet<string>;
  } = {},
): OpenClawConfig {
  const restricted = account.role === "employee" || options.userAudience === true;
  const userAudience = options.userAudience === true;
  const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
  const pluginRegistryVersion = getActivePluginRegistryVersion();
  const stateDatabaseVersion = readEnterpriseStateDatabaseVersion();
  ensureEnterpriseSkillsInvalidationListener();
  const delegationCandidates =
    options.delegationCandidates ?? resolveEnterpriseDelegationFacts(config, account);
  const cacheKey = `${account.id}:${userAudience ? "user" : "operator"}`;
  const byAccount =
    enterpriseRuntimeProjectionCache.get(config) ??
    new Map<string, EnterpriseRuntimeProjectionCacheEntry>();
  enterpriseRuntimeProjectionCache.set(config, byAccount);
  const cached = byAccount.get(cacheKey);
  const cacheMatches =
    cached &&
    cached.accountPolicyRevision === account.policyRevision &&
    cached.delegationCandidates === delegationCandidates &&
    cached.knowledgeRevision === enterpriseKnowledgeRevision &&
    stateDatabaseVersion !== undefined &&
    cached.stateDatabaseVersion === stateDatabaseVersion &&
    cached.pluginRegistryVersion === pluginRegistryVersion &&
    cached.skillsRevision === enterpriseSkillsRevision &&
    cached.configGeneration === enterpriseRuntimeProjectionGeneration;
  if (cacheMatches && cached) {
    emitEnterpriseCacheStatus({
      config,
      name: "enterprise.gateway.runtime_projection_cache",
      state: "hit",
    });
    return cloneEnterpriseRuntimeProjection(cached.projectedConfig);
  }
  const projectionCacheMissReason: EnterpriseCacheInvalidationReason = !cached
    ? "config"
    : cached.accountPolicyRevision !== account.policyRevision ||
        cached.delegationCandidates !== delegationCandidates
      ? "account"
      : cached.knowledgeRevision !== enterpriseKnowledgeRevision
        ? "knowledge"
        : cached.skillsRevision !== enterpriseSkillsRevision
          ? "skills"
          : "config";
  emitEnterpriseCacheStatus({
    config,
    name: "enterprise.gateway.runtime_projection_cache",
    state: "miss",
    reason: projectionCacheMissReason,
  });
  const allowed = options.allowedAgentIds
    ? new Set(options.allowedAgentIds)
    : resolveEnterpriseAllowedAgentIds(config, account, options);
  const knowledgeAgentIds = new Set(
    userAudience ? resolveEnterpriseKnowledgeAgentIds(account, allowed, personalAgentId) : [],
  );
  const storedAccountToolPolicy = readEnterpriseAccountToolPolicy(account.id);
  const hasAssignedSpecialist = delegationCandidates.some((candidate) => candidate.effective);
  const routableSpecialistIds = delegationCandidates
    .filter((candidate) => candidate.routable)
    .map((candidate) => normalizeAgentId(candidate.agentId))
    .toSorted();
  const hasRoutableSpecialist = routableSpecialistIds.length > 0;
  const managedDelegationTools = [
    ...(hasAssignedSpecialist ? ["enterprise_specialists_list"] : []),
    ...(hasRoutableSpecialist ? ["enterprise_delegate", "sessions_yield"] : []),
  ];
  const accountToolPolicy = compileEnterpriseToolPolicy(config, account, storedAccountToolPolicy);
  const canonicalBasicPersonalPolicy =
    account.role === "employee" && account.accessPresetKey === ENTERPRISE_ACCESS_PRESET_BASIC;
  // A selected basic preset is the authoritative cap for a personal Enterprise
  // runtime, so the host's legacy allowlist must not silently remove preset
  // tools. Legacy and administrator accounts continue to honor the configured
  // host allowlist as an additional cap.
  const accountToolAllow = [
    ...new Set([
      ...(canonicalBasicPersonalPolicy
        ? (accountToolPolicy.allow ?? [])
        : intersectToolGrants(config.tools?.allow, accountToolPolicy.allow ?? [])),
      ...managedDelegationTools,
      ...(knowledgeAgentIds.size > 0 ? KNOWLEDGE_TOOL_IDS : []),
    ]),
  ].toSorted();
  const accountToolDeny = [
    ...new Set([
      ...(accountToolPolicy.deny ?? []),
      ...(restricted && accountToolAllow.length === 0 ? ["*"] : []),
    ]),
  ].toSorted();
  // Zone binding grants a managed read capability, not a general tool entitlement.
  // Keep it on the bound Agent; the tool authority rechecks live access on each call.
  const toolAllowForAgent = (agentId: string) =>
    accountToolAllow.filter(
      (toolId) => knowledgeAgentIds.has(agentId) || !KNOWLEDGE_TOOL_IDS.includes(toolId),
    );
  const fallbackEntries = listAgentEntries(config);
  const sourceEntries: AgentConfig[] =
    fallbackEntries.length > 0 ? fallbackEntries : [{ id: "main", default: true }];
  const personalTemplateId = resolveEnterprisePersonalAgentTemplateId(config, account);
  const preferredDefault = normalizeAgentId(
    account.personalAgentEnabled ? personalAgentId : (account.defaultAgentId ?? personalAgentId),
  );
  const scopedShared: AgentConfig[] = [];
  for (const entry of sourceEntries) {
    if (
      normalizeAgentId(entry.id) === normalizeAgentId(personalTemplateId) ||
      !allowed.has(normalizeAgentId(entry.id))
    ) {
      continue;
    }
    const sharedCapabilities = resolveEnterpriseSharedAgentCapabilities({
      config,
      account,
      agentId: normalizeAgentId(entry.id),
    });
    if (!sharedCapabilities.allowed) {
      continue;
    }
    const sharedSkillToolIds = [
      ...(sharedCapabilities.skillsSnapshot.skills.length > 0 ? ["read"] : []),
      ...(sharedCapabilities.skillsSnapshot.skills.some(
        (skill) =>
          Boolean(skill.scriptRuntime) &&
          Boolean(skill.source) &&
          isEnterpriseHostScriptSource(skill.source!),
      )
        ? [SKILL_SCRIPT_TOOL_ID]
        : []),
    ];
    const sharedCapabilityToolIds = [
      ...new Set([...sharedCapabilities.pluginTools, ...sharedSkillToolIds]),
    ].toSorted();
    const sharedEntry =
      sharedCapabilityToolIds.length > 0
        ? {
            ...entry,
            tools: {
              ...entry.tools,
              allow:
                entry.tools?.allow === undefined
                  ? undefined
                  : [...new Set([...entry.tools.allow, ...sharedCapabilityToolIds])].toSorted(),
              alsoAllow: [
                ...new Set([...(entry.tools?.alsoAllow ?? []), ...sharedCapabilityToolIds]),
              ].toSorted(),
              sandbox: {
                ...entry.tools?.sandbox,
                tools: {
                  ...entry.tools?.sandbox?.tools,
                  alsoAllow: [
                    ...new Set([
                      ...(entry.tools?.sandbox?.tools?.alsoAllow ?? []),
                      ...sharedCapabilityToolIds,
                    ]),
                  ].toSorted(),
                },
              },
            },
          }
        : entry;
    const scopedAgent = toScopedAgent(
      config,
      sharedEntry,
      account,
      preferredDefault,
      toolAllowForAgent(normalizeAgentId(entry.id)),
      accountToolDeny,
      entry.id,
      restricted,
      false,
      false,
    );
    scopedShared.push({
      ...scopedAgent,
      tools: {
        ...scopedAgent.tools,
        deny: [
          ...new Set([
            ...(scopedAgent.tools?.deny ?? []),
            ...ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
            ...ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
          ]),
        ].toSorted(),
      },
    });
  }
  const personalTemplate = sourceEntries.find(
    (entry) => normalizeAgentId(entry.id) === normalizeAgentId(personalTemplateId),
  );
  const personalTemplateWithAccountPolicy = personalTemplate
    ? {
        ...personalTemplate,
        tools: {
          ...personalTemplate.tools,
          // The account policy is authoritative for this synthetic Personal
          // Agent. Preserve the template profile for legacy behavior, but do
          // not let a template allowlist trim a selected account preset.
          allow: canonicalBasicPersonalPolicy ? undefined : personalTemplate.tools?.allow,
          ...(canonicalBasicPersonalPolicy ? { profile: "full" as const } : {}),
          ...(storedAccountToolPolicy.configured
            ? {
                ...(canonicalBasicPersonalPolicy || storedAccountToolPolicy.profile === null
                  ? {}
                  : { profile: storedAccountToolPolicy.profile }),
                alsoAllow: storedAccountToolPolicy.alsoAllow,
                deny: [
                  ...new Set([
                    ...(personalTemplate.tools?.deny ?? []),
                    ...storedAccountToolPolicy.deny,
                  ]),
                ].toSorted(),
              }
            : {}),
        },
      }
    : personalTemplate;
  const scopedPersonal =
    allowed.has(personalAgentId) && personalTemplateWithAccountPolicy
      ? [
          (() => {
            const scopedAgent = toScopedAgent(
              config,
              {
                ...personalTemplateWithAccountPolicy,
                id: personalAgentId,
                model: config.agents?.defaults?.model,
                models: config.agents?.defaults?.models,
                modelPolicy: config.agents?.defaults?.modelPolicy,
                utilityModel: config.agents?.defaults?.utilityModel,
                thinkingDefault: config.agents?.defaults?.thinkingDefault,
                fastModeDefault: config.agents?.defaults?.fastModeDefault,
              },
              account,
              preferredDefault,
              toolAllowForAgent(personalAgentId),
              accountToolDeny,
              personalTemplateId,
              restricted,
            );
            return {
              ...scopedAgent,
              // This is a request-scoped runtime authorization used only by
              // enterprise_delegate's server-owned spawn. It does not expose
              // sessions_spawn to the model and cannot outlive this request.
              subagents: {
                ...scopedAgent.subagents,
                allowAgents: routableSpecialistIds,
                requireAgentId: true,
              },
              tools: {
                ...scopedAgent.tools,
                alsoAllow: [
                  ...new Set([...(scopedAgent.tools?.alsoAllow ?? []), ...managedDelegationTools]),
                ].toSorted(),
              },
            };
          })(),
        ]
      : [];
  const scoped = [...scopedPersonal, ...scopedShared];
  if (scoped.length > 0 && !scoped.some((entry) => entry.default === true)) {
    const first = scoped[0]!;
    scoped[0] = { ...first, default: true };
  }
  const entries: Record<string, AgentEntryConfig> = Object.fromEntries(
    scoped.map((entry) => {
      const { id, ...rest } = entry;
      return [id, rest];
    }),
  );
  let projectedConfig: OpenClawConfig = {
    ...config,
    gateway: {
      ...config.gateway,
      roles: config.gateway?.roles ?? {
        default: "employee",
        definitions: {
          employee: {
            sessions: { others: "none" },
            agents: "*",
            scopes: ["operator.read", "operator.write", "operator.questions"],
          },
          administrator: {
            sessions: { others: "none" },
            agents: "*",
            scopes: ["operator.read", "operator.write", "operator.questions"],
          },
        },
      },
    },
    tools: restricted
      ? {
          ...config.tools,
          // Keep host policy global. Account policy is attached only to the
          // synthetic Personal Agent so it cannot trim delegated children.
          allow: config.tools?.allow
            ? [
                ...new Set([
                  ...config.tools.allow,
                  ...managedDelegationTools,
                  ...(knowledgeAgentIds.size > 0 ? KNOWLEDGE_TOOL_IDS : []),
                  ...(hasAssignedSpecialist ? [SKILL_SCRIPT_TOOL_ID] : []),
                ]),
              ].toSorted()
            : undefined,
          alsoAllow: [
            ...new Set([
              ...(config.tools?.alsoAllow ?? []),
              ...managedDelegationTools,
              ...(knowledgeAgentIds.size > 0 ? KNOWLEDGE_TOOL_IDS : []),
              ...(hasAssignedSpecialist ? [SKILL_SCRIPT_TOOL_ID] : []),
            ]),
          ].toSorted(),
          deny: config.tools?.deny,
          fs: { ...config.tools?.fs, workspaceOnly: true },
          elevated: { ...config.tools?.elevated, enabled: false },
          exec: {
            ...config.tools?.exec,
            host: "sandbox",
            applyPatch: { ...config.tools?.exec?.applyPatch, workspaceOnly: true },
          },
        }
      : config.tools,
    agents: {
      ...config.agents,
      defaults: {
        ...config.agents?.defaults,
        // The Personal Agent is a synthetic copy of this template and has no
        // standalone credential store. Keep host-side auth inheritance pinned
        // to the configured template instead of deriving it from the synthetic id.
        authInheritance: {
          ...config.agents?.defaults?.authInheritance,
          agentId: personalTemplateId,
        },
        subagents: {
          ...config.agents?.defaults?.subagents,
          // Enterprise delegation is deliberately depth one in v1.
          maxSpawnDepth: 1,
        },
      },
      entries,
      list: undefined,
    },
  };
  const personalCapability = scopedPersonal.length
    ? resolveEnterprisePersonalAgentCapabilities({
        config: projectedConfig,
        account,
        agentId: personalAgentId,
      })
    : undefined;
  const personalHasScriptRuntime =
    personalCapability?.allowed === true &&
    personalCapability.skillsSnapshot.skills.some(
      (skill) =>
        Boolean(skill.scriptRuntime) &&
        Boolean(skill.source) &&
        isEnterpriseHostScriptSource(skill.source!),
    );
  const projectedPersonal = projectedConfig.agents?.entries?.[personalAgentId];
  if (personalHasScriptRuntime && projectedPersonal && personalTemplateWithAccountPolicy) {
    const personalTools = scopedTools(
      personalTemplateWithAccountPolicy.tools,
      config.tools?.sandbox?.tools,
      [...toolAllowForAgent(personalAgentId), SKILL_SCRIPT_TOOL_ID],
      accountToolDeny,
      restricted,
    );
    projectedConfig = {
      ...projectedConfig,
      tools: {
        ...projectedConfig.tools,
        allow: projectedConfig.tools?.allow
          ? [...new Set([...projectedConfig.tools.allow, SKILL_SCRIPT_TOOL_ID])].toSorted()
          : undefined,
        alsoAllow: [
          ...new Set([...(projectedConfig.tools?.alsoAllow ?? []), SKILL_SCRIPT_TOOL_ID]),
        ].toSorted(),
      },
      agents: {
        ...projectedConfig.agents,
        entries: {
          ...projectedConfig.agents?.entries,
          [personalAgentId]: {
            ...projectedPersonal,
            tools: {
              ...personalTools,
              alsoAllow: [
                ...new Set([...(personalTools?.alsoAllow ?? []), ...managedDelegationTools]),
              ].toSorted(),
            },
          },
        },
      },
    };
  }
  const ownedProjectedConfig = ownImmutableEnterpriseRuntimeProjection(projectedConfig);
  if (byAccount.size >= MAX_ENTERPRISE_RUNTIME_PROJECTION_ENTRIES) {
    const oldest = byAccount.keys().next().value;
    if (oldest !== undefined && oldest !== cacheKey) {
      byAccount.delete(oldest);
    }
  }
  byAccount.set(cacheKey, {
    accountPolicyRevision: account.policyRevision,
    configGeneration: enterpriseRuntimeProjectionGeneration,
    delegationCandidates,
    knowledgeRevision: enterpriseKnowledgeRevision,
    stateDatabaseVersion,
    pluginRegistryVersion,
    skillsRevision: enterpriseSkillsRevision,
    allowedAgentIds: [...allowed].toSorted(),
    knowledgeAgentIds: [...knowledgeAgentIds].toSorted(),
    projectedConfig: ownedProjectedConfig,
  });
  return cloneEnterpriseRuntimeProjection(ownedProjectedConfig);
}

function requestedAgentIds(params: unknown): Set<string> {
  const ids = new Set<string>();
  const collect = (value: unknown, includeNestedPatch: boolean) => {
    if (!isRecord(value)) {
      return;
    }
    const record = value;
    for (const key of ["agentId", "targetAgentId", "sourceAgentId"]) {
      if (typeof record[key] === "string" && record[key].trim()) {
        ids.add(normalizeAgentId(record[key]));
      }
    }
    for (const key of ["sessionKey", "key", "parentSessionKey", "childSessionKey"]) {
      const sessionKey = record[key];
      if (typeof sessionKey !== "string") {
        continue;
      }
      const parsed = parseAgentSessionKey(sessionKey);
      if (parsed?.agentId) {
        ids.add(normalizeAgentId(parsed.agentId));
      }
    }
    if (includeNestedPatch) {
      collect(record.patch, false);
    }
  };
  collect(params, true);
  return ids;
}

function employeeMethodAllowed(method: string): boolean {
  return (
    !EMPLOYEE_BLOCKED_METHODS.has(method) &&
    !EMPLOYEE_BLOCKED_PREFIXES.some((prefix) => method.startsWith(prefix))
  );
}

function contextWithConfig(
  context: GatewayRequestContext,
  config: OpenClawConfig,
): GatewayRequestContext {
  const scopedContext: GatewayRequestContext = new Proxy(context, {
    get(target, property, receiver) {
      if (property === "getRuntimeConfig") {
        return () => config;
      }
      if (property === "resolveGatewayContext") {
        // Child launches and completion delivery can re-enter the Gateway after
        // the parent handler has returned. Keep them on this exact account-
        // scoped projection instead of falling back to the host-global config.
        return () => scopedContext;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return scopedContext;
}

export function prepareEnterpriseGatewayRequest(params: {
  client: GatewayClient;
  context: GatewayRequestContext;
  method: string;
  requestParams: unknown;
}): EnterpriseGatewayAdmission {
  const config = params.context.getRuntimeConfig();
  if (!isEnterpriseEnabled(config) || config.gateway?.auth?.mode !== "accounts") {
    return { allowed: true, context: params.context };
  }
  const profileId = params.client.authenticatedUserProfile?.profileId;
  const account = profileId ? getEnterpriseAccountByProfileId(profileId) : undefined;
  const enterpriseSession = params.client.internal?.enterpriseSession;
  const activeSession = enterpriseSession
    ? getActiveEnterpriseSession(enterpriseSession.sessionId, {}, enterpriseSession.audience)
    : undefined;
  if (
    !account?.enabled ||
    account.mustChangePassword ||
    !enterpriseSession ||
    !activeSession ||
    activeSession.accountId !== account.id
  ) {
    return { allowed: false, reason: "ENTERPRISE_SESSION_REVOKED", closeConnection: true };
  }
  const userAudience = enterpriseSession.audience === "user";
  if (
    userAudience &&
    (!enterpriseUserGatewayMethodAllowed(
      params.method,
      params.client.internal?.syntheticClient === true,
    ) ||
      !enterpriseUserGatewayParamsAllowed(params.method, params.requestParams))
  ) {
    return { allowed: false, reason: "ENTERPRISE_METHOD_DENIED", closeConnection: false };
  }
  if (!userAudience && account.role === "employee" && !employeeMethodAllowed(params.method)) {
    return { allowed: false, reason: "ENTERPRISE_METHOD_DENIED", closeConnection: false };
  }
  const allowedAgents = resolveEnterpriseAllowedAgentIds(config, account, { userAudience });
  for (const agentId of requestedAgentIds(params.requestParams)) {
    if (!allowedAgents.has(agentId)) {
      return { allowed: false, reason: "ENTERPRISE_AGENT_DENIED", closeConnection: false };
    }
  }
  const managementRequest =
    !userAudience &&
    account.role === "administrator" &&
    (params.method.startsWith("agents.") ||
      params.method.startsWith("config.") ||
      params.method.startsWith("skills.") ||
      params.method.startsWith("plugins."));
  const knowledgeAuthorities = new Map<
    string,
    ReturnType<typeof createEnterpriseKnowledgeAuthority>
  >();
  const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
  const resolvedDelegationCandidates = userAudience
    ? resolveEnterpriseDelegationFacts(config, account)
    : [];
  const delegationCandidates = userAudience
    ? resolvedDelegationCandidates.map((candidate) => ({
        agentId: candidate.agentId,
        name: candidate.name,
        description: candidate.description,
        assigned: candidate.assigned,
        effective: candidate.effective,
        routable: candidate.routable,
        effectiveMode: candidate.effectiveMode,
        reasonCodes: candidate.reasonCodes,
        profileRevision: candidate.profileRevision,
      }))
    : [];
  const projectedConfig = managementRequest
    ? undefined
    : projectEnterpriseRuntimeConfig(config, account, {
        userAudience,
        delegationCandidates: userAudience ? resolvedDelegationCandidates : undefined,
        allowedAgentIds: allowedAgents,
      });
  const scopedContext = managementRequest
    ? params.context
    : contextWithConfig(
        params.context,
        markGatewayRequestScopedRuntimeConfig(
          projectedConfig!,
          userAudience
            ? {
                nativePluginGrants: (agentId, harnessPluginId) => {
                  const currentSession = getActiveEnterpriseSession(
                    enterpriseSession.sessionId,
                    {},
                    "user",
                  );
                  const currentAccount = getEnterpriseAccountByProfileId(account.profileId);
                  if (
                    harnessPluginId !== "codex" ||
                    currentSession?.accountId !== account.id ||
                    !currentAccount?.enabled ||
                    !resolveEnterpriseAllowedAgentIds(config, currentAccount, {
                      userAudience: true,
                    }).has(normalizeAgentId(agentId))
                  ) {
                    return [];
                  }
                  return listActiveEnterpriseCodexPluginGrants(
                    account.id,
                    normalizeAgentId(agentId),
                  );
                },
                enterpriseUser: {
                  accountId: account.id,
                  sessionId: enterpriseSession.sessionId,
                  username: account.username,
                  displayName: account.displayName,
                  personalAgentId,
                  personalAgentTemplateId: resolveEnterprisePersonalAgentTemplateId(
                    config,
                    account,
                  ),
                },
                enterpriseCapabilities: {
                  resolve: (agentId) => {
                    const currentSession = getActiveEnterpriseSession(
                      enterpriseSession.sessionId,
                      {},
                      "user",
                    );
                    const currentAccount = getEnterpriseAccountByProfileId(account.profileId);
                    if (
                      !currentSession ||
                      currentSession.accountId !== account.id ||
                      !currentAccount?.enabled
                    ) {
                      return {
                        allowed: false as const,
                        accountId: account.id,
                        agentId: normalizeAgentId(agentId),
                        reason: "account_disabled" as const,
                      };
                    }
                    if (normalizeAgentId(agentId) === normalizeAgentId(personalAgentId)) {
                      if (currentAccount.policyRevision !== account.policyRevision) {
                        return {
                          allowed: false as const,
                          accountId: account.id,
                          agentId: normalizeAgentId(agentId),
                          reason: "account_policy_changed" as const,
                        };
                      }
                      return resolveEnterprisePersonalAgentCapabilities({
                        config: projectedConfig!,
                        account: currentAccount,
                        agentId,
                      });
                    }
                    return resolveEnterpriseSharedAgentCapabilities({
                      config: params.context.getRuntimeConfig(),
                      account: currentAccount,
                      agentId,
                    });
                  },
                },
                enterpriseDelegation: {
                  accountId: account.id,
                  personalAgentId,
                  specialists: delegationCandidates,
                  resolveSpecialist: (agentId) => {
                    const currentAccount = getEnterpriseAccountByProfileId(account.profileId);
                    if (!currentAccount?.enabled) {
                      return undefined;
                    }
                    const liveConfig = params.context.getRuntimeConfig();
                    const candidate = listEnterpriseDelegationCandidates(
                      liveConfig,
                      currentAccount,
                    ).find((item) => normalizeAgentId(item.agentId) === normalizeAgentId(agentId));
                    return candidate
                      ? {
                          agentId: candidate.agentId,
                          name: candidate.name,
                          description: candidate.description,
                          assigned: candidate.assigned,
                          effective: candidate.effective,
                          routable: candidate.routable,
                          effectiveMode: candidate.effectiveMode,
                          reasonCodes: candidate.reasonCodes,
                          profileRevision: candidate.profileRevision,
                        }
                      : undefined;
                  },
                  resolveExplicitAgentIds: (prompt) =>
                    explicitlyMentionedEnterpriseAgentIds(config, prompt),
                },
                enterpriseKnowledge: {
                  createAuthority(agentId: string) {
                    const normalizedAgentId = normalizeAgentId(agentId);
                    const normalizedPersonalAgentId = normalizeAgentId(personalAgentId);
                    const agentResourceKey =
                      normalizedAgentId === normalizedPersonalAgentId
                        ? personalAgentResourceKey(account.id)
                        : sharedAgentResourceKey(normalizedAgentId);
                    let authority = knowledgeAuthorities.get(agentResourceKey);
                    if (!authority) {
                      authority = createEnterpriseKnowledgeAuthority({
                        accountId: account.id,
                        sessionId: enterpriseSession.sessionId,
                        agentResourceKey,
                        config,
                      });
                      knowledgeAuthorities.set(agentResourceKey, authority);
                    }
                    return authority;
                  },
                },
              }
            : undefined,
        ),
      );
  return { allowed: true, context: scopedContext, account };
}
