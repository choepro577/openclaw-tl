// Per-request Enterprise projection over the existing Gateway runtime.
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import type { AgentConfig, AgentEntryConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentToolsConfig, ToolAllowDenyPolicyConfig } from "../../config/types.tools.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import type { GatewayClient, GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { normalizeAgentId, parseAgentSessionKey } from "../../routing/session-key.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { getEnterpriseAccountByProfileId } from "../accounts/account-store.js";
import { readEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { getActiveEnterpriseSession } from "../auth/session-store.js";
import { listEnterpriseDelegationCandidates } from "../delegation/delegation-candidates.js";
import { explicitlyMentionedEnterpriseAgentIds } from "../delegation/delegation-explicit-match.js";
import { isEnterpriseEnabled } from "../enterprise-config.js";
import {
  listEnterpriseEntitlements,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import {
  ENTERPRISE_ACCESS_PRESET_BASIC,
  ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
  enterpriseRuntimeResourceId,
  parseEnterpriseResourceKey,
  personalAgentResourceKey,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { listActiveEnterpriseCodexPluginGrants } from "../extensions/codex-plugin-store.js";
import { verifiedEnterpriseUserSkillsForRuntimeAgent } from "../extensions/extension-runtime-integrity.js";
import { createEnterpriseKnowledgeAuthority } from "../knowledge/authority.js";
import { listPublishedZonesForAgent } from "../knowledge/knowledge-zone-store.js";
import {
  resolveEnterprisePersonalAgentId,
  resolveEnterprisePersonalAgentTemplateId,
} from "../personal-agent/personal-agent-config.js";
import { ensureEnterpriseWorkspaceFromTemplate } from "../personal-agent/personal-workspace.js";
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
): AgentToolsConfig | undefined {
  if (!restricted) {
    return configured;
  }
  const allowedForAgent = intersectToolGrants(configured?.allow, accountAllow);
  const denied = [...new Set([...(configured?.deny ?? []), ...accountDeny])].toSorted();
  const inheritedSandboxDeny = [
    ...(configured?.sandbox?.tools?.deny ?? globalSandboxPolicy?.deny ?? []),
  ];
  const accountSandboxAllow = accountAllow.filter((toolId) =>
    isToolAllowedByPolicyName(toolId, { deny: [...accountDeny] }),
  );
  const sandboxAlsoAllow = [
    ...new Set([
      ...(configured?.sandbox?.tools?.alsoAllow ?? globalSandboxPolicy?.alsoAllow ?? []),
      ...(configured?.allow ?? []),
      ...accountSandboxAllow,
      ...allowedForAgent.filter((toolId) => isToolAllowedByPolicyName(toolId, { deny: denied })),
    ]),
  ].toSorted();
  const sandboxDeny = [
    ...new Set([
      ...removeSandboxDeniesCoveredByAccountGrants(inheritedSandboxDeny, accountSandboxAllow),
      ...denied,
    ]),
  ].toSorted();
  return {
    ...configured,
    // Account grants must survive the profile stage. Preserve an Agent allowlist
    // as an independent runtime restriction while the account-scoped global
    // allowlist remains the final security cap.
    allow: configured?.allow,
    alsoAllow: allowedForAgent,
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
  const agentGranted = grantedEntitlements
    .filter((item) => {
      const parsed = parseEnterpriseResourceKey("skill", item.resourceId);
      return (
        parsed.scope === "agent" &&
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
      ...(requiresAccountGrant
        ? intersectAllowed(agent.skills ?? config.agents?.defaults?.skills, granted)
        : agentGranted.length > 0
          ? intersectAllowed(agent.skills ?? config.agents?.defaults?.skills, agentGranted)
          : (agent.skills ?? config.agents?.defaults?.skills ?? []).filter(
              (skillName) => !explicitDenied.has(skillName),
            )),
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
        // Skills can reach LAN services; explicit agent/global network policy still wins.
        network:
          agent.sandbox?.docker?.network ??
          config.agents?.defaults?.sandbox?.docker?.network ??
          "bridge",
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
    ),
  };
}

export function projectEnterpriseRuntimeConfig(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  options: { userAudience?: boolean } = {},
): OpenClawConfig {
  const restricted = account.role === "employee" || options.userAudience === true;
  const allowed = resolveEnterpriseAllowedAgentIds(config, account, options);
  const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
  const knowledgeAgentIds = new Set(
    options.userAudience
      ? [...allowed].filter((agentId) => {
          const resourceKey =
            agentId === personalAgentId
              ? personalAgentResourceKey(account.id)
              : sharedAgentResourceKey(agentId);
          return (
            resolveEnterpriseResourceAccess(account, "agent", resourceKey).allowed &&
            listPublishedZonesForAgent(resourceKey, undefined).length > 0
          );
        })
      : [],
  );
  const storedAccountToolPolicy = readEnterpriseAccountToolPolicy(account.id);
  const delegationCandidates = listEnterpriseDelegationCandidates(config, account);
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
  const scopedShared = sourceEntries
    .filter((entry) => allowed.has(normalizeAgentId(entry.id)))
    .map((entry) => {
      const scopedAgent = toScopedAgent(
        config,
        entry,
        account,
        preferredDefault,
        toolAllowForAgent(normalizeAgentId(entry.id)),
        accountToolDeny,
        entry.id,
        restricted,
        false,
      );
      return {
        ...scopedAgent,
        tools: {
          ...scopedAgent.tools,
          deny: [
            ...new Set([
              ...(scopedAgent.tools?.deny ?? []),
              ...ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
            ]),
          ].toSorted(),
        },
      };
    });
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
              { ...personalTemplateWithAccountPolicy, id: personalAgentId },
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
  return {
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
          // This is the account boundary, not a host-global mutation. Agent
          // `alsoAllow` widens the selected profile only inside this cap.
          allow: accountToolAllow,
          alsoAllow: undefined,
          deny: [...new Set([...(config.tools?.deny ?? []), ...accountToolDeny])].toSorted(),
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
  let scopedContext: GatewayRequestContext;
  scopedContext = new Proxy(context, {
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
  const projectedConfig = managementRequest
    ? undefined
    : projectEnterpriseRuntimeConfig(config, account, { userAudience });
  const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
  const delegationCandidates = userAudience
    ? listEnterpriseDelegationCandidates(config, account).map((candidate) => ({
        agentId: candidate.agentId,
        name: candidate.name,
        description: candidate.description,
        assigned: candidate.assigned,
        effective: candidate.effective,
        routable: candidate.routable,
        effectiveMode: candidate.effectiveMode,
        reasonCodes: candidate.reasonCodes,
      }))
    : [];
  const scopedContext = managementRequest
    ? params.context
    : contextWithConfig(
        params.context,
        markGatewayRequestScopedRuntimeConfig(
          projectedConfig!,
          userAudience
            ? {
                nativePluginGrants: (agentId, harnessPluginId) => {
                  const activeSession = getActiveEnterpriseSession(
                    enterpriseSession.sessionId,
                    {},
                    "user",
                  );
                  const currentAccount = getEnterpriseAccountByProfileId(account.profileId);
                  if (
                    harnessPluginId !== "codex" ||
                    activeSession?.accountId !== account.id ||
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
                  username: account.username,
                  displayName: account.displayName,
                  personalAgentId,
                  personalAgentTemplateId: resolveEnterprisePersonalAgentTemplateId(
                    config,
                    account,
                  ),
                },
                enterpriseDelegation: {
                  accountId: account.id,
                  personalAgentId,
                  specialists: delegationCandidates,
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
