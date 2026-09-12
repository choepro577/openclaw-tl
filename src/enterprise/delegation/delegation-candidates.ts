import { createHash } from "node:crypto";
// Builds the canonical, explicit-assignment-only specialist roster for one Enterprise account.
import { stableStringify } from "@openclaw/normalization-core/stable-stringify";
import { listAgentEntries } from "../../agents/agent-scope.js";
import type { AgentDelegationTargetConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import {
  ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  enterpriseRuntimeResourceId,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { resolveEnterpriseSharedAgentSkillSnapshot } from "../isolation/enterprise-agent-capabilities.js";
import {
  listEnterpriseDelegationOverrides,
  readEnterpriseDelegationPolicy,
  type EnterpriseDelegationHandlingMode,
  type EnterpriseDelegationOverrideMode,
} from "./delegation-store.js";

export type EnterpriseDelegationCandidate = {
  agentId: string;
  resourceKey: string;
  name: string;
  description: string;
  profile: AgentDelegationTargetConfig | null;
  profileRevision: string;
  assigned: boolean;
  effective: boolean;
  routable: boolean;
  overrideMode: EnterpriseDelegationOverrideMode;
  overrideRevision: number;
  effectiveMode: EnterpriseDelegationHandlingMode;
  reasonCodes: string[];
};

const HANDLING_RANK: Record<EnterpriseDelegationHandlingMode, number> = {
  auto_when_certain: 0,
  confirm_before_handoff: 1,
  explicit_only: 2,
  disabled: 3,
};

function effectiveHandlingMode(
  configured: AgentDelegationTargetConfig["handlingMode"] | undefined,
  override: EnterpriseDelegationOverrideMode,
): EnterpriseDelegationHandlingMode {
  const base = configured ?? "explicit_only";
  if (override === "inherit") {
    return base;
  }
  return HANDLING_RANK[override] >= HANDLING_RANK[base] ? override : base;
}

export function enterpriseDelegationModeCanOverride(
  configured: AgentDelegationTargetConfig["handlingMode"],
  override: EnterpriseDelegationOverrideMode,
): boolean {
  return override === "inherit" || HANDLING_RANK[override] >= HANDLING_RANK[configured];
}

function profileRevision(config: OpenClawConfig, agentId: string): string {
  // A user request runs against an account-scoped projection, while the live
  // delegation guard rechecks the host source config. The projection already
  // carries the profile revision computed from that source catalog; reuse it
  // so Personal policy additions (read/skill_script and sandbox controls) do
  // not make the same Shared Agent look changed at the child boundary.
  const requestSpecialist = readGatewayRequestRuntimeMetadata(
    config,
  )?.enterpriseDelegation?.specialists.find(
    (candidate) => normalizeAgentId(candidate.agentId) === normalizeAgentId(agentId),
  );
  if (requestSpecialist?.profileRevision) {
    return requestSpecialist.profileRevision;
  }
  const entry = listAgentEntries(config).find(
    (candidate) => normalizeAgentId(candidate.id) === normalizeAgentId(agentId),
  );
  const skillFilter = entry?.skills ?? config.agents?.defaults?.skills;
  const snapshot = entry
    ? resolveEnterpriseSharedAgentSkillSnapshot({ config, agentId })?.snapshot
    : undefined;
  return (
    createHash("sha256")
      // Config parsing and projection may reorder keys without changing the delegated authority.
      .update(
        stableStringify({
          description: entry?.description?.trim() ?? "",
          profile: entry?.delegationTarget ?? null,
          tools: {
            global: config.tools ?? null,
            agent: entry?.tools ?? null,
          },
          skills: skillFilter ?? null,
          sandbox: {
            defaults: config.agents?.defaults?.sandbox ?? null,
            agent: entry?.sandbox ?? null,
          },
          skillRuntime:
            snapshot?.skills.map((skill) => ({
              name: skill.name,
              skillKey: skill.skillKey ?? skill.name,
              source: skill.source ?? null,
              scriptRuntime: skill.scriptRuntime ?? null,
            })) ?? [],
          hardDeny: [
            ...ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
            ...ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
          ],
        }),
      )
      .digest("hex")
      .slice(0, 16)
  );
}

export function listEnterpriseDelegationCandidates(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseDelegationCandidate[] {
  const policy = readEnterpriseDelegationPolicy(options);
  const entries = new Map(
    listAgentEntries(config)
      .filter((entry) => !isReservedSystemAgentId(entry.id))
      .map((entry) => [normalizeAgentId(entry.id), entry] as const),
  );
  const overrides = new Map(
    listEnterpriseDelegationOverrides(account.id, options).map(
      (item) => [item.agentResourceKey, item] as const,
    ),
  );
  const entitlements = listEnterpriseEntitlements(account.id, options).filter(
    (item) => item.resourceType === "agent" && item.resourceState === "active",
  );
  const denied = new Set(
    entitlements
      .filter((item) => item.effect === "deny")
      .map((item) => normalizeAgentId(enterpriseRuntimeResourceId("agent", item.resourceId))),
  );
  return entitlements
    .filter((item) => item.effect === "allow")
    .map((item) => ({
      entitlement: item,
      agentId: normalizeAgentId(enterpriseRuntimeResourceId("agent", item.resourceId)),
    }))
    .filter(
      (item, index, all) => all.findIndex((other) => other.agentId === item.agentId) === index,
    )
    .map(({ entitlement, agentId }) => {
      const entry = entries.get(agentId);
      const resourceKey = sharedAgentResourceKey(agentId);
      const override = overrides.get(resourceKey);
      const profile = entry?.delegationTarget;
      const mode = effectiveHandlingMode(profile?.handlingMode, override?.mode ?? "inherit");
      const reasonCodes: string[] = [];
      if (!account.enabled) {
        reasonCodes.push("account_disabled");
      }
      if (!account.personalAgentEnabled) {
        reasonCodes.push("personal_agent_disabled");
      }
      if (denied.has(agentId)) {
        reasonCodes.push("explicit_deny");
      }
      if (!entry) {
        reasonCodes.push("agent_missing");
      }
      if (!profile || profile.status !== "active") {
        reasonCodes.push(profile?.status === "disabled" ? "profile_disabled" : "profile_not_ready");
      }
      if (mode === "disabled") {
        reasonCodes.push("override_disabled");
      }
      if (policy.rollout === "off") {
        reasonCodes.push("rollout_off");
      }
      const effective =
        account.enabled && entitlement.effect === "allow" && !denied.has(agentId) && Boolean(entry);
      return {
        agentId,
        resourceKey,
        name: entry?.identity?.name ?? entry?.name ?? agentId,
        description: entry?.description?.trim() ?? "",
        profile: profile ?? null,
        profileRevision: profileRevision(config, agentId),
        assigned: true,
        effective,
        routable:
          effective &&
          account.personalAgentEnabled &&
          profile?.status === "active" &&
          mode !== "disabled" &&
          policy.rollout !== "off",
        overrideMode: override?.mode ?? "inherit",
        overrideRevision: override?.revision ?? 0,
        effectiveMode: mode,
        reasonCodes,
      } satisfies EnterpriseDelegationCandidate;
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

export function enterpriseDelegationCountsForAgent(
  config: OpenClawConfig,
  agentId: string,
  accounts: readonly EnterpriseAccount[],
  options: OpenClawStateDatabaseOptions = {},
): { assigned: number; effective: number; routable: number } {
  const normalized = normalizeAgentId(agentId);
  const candidates = accounts.flatMap((account) =>
    listEnterpriseDelegationCandidates(config, account, options).filter(
      (candidate) => candidate.agentId === normalized,
    ),
  );
  return {
    assigned: candidates.filter((candidate) => candidate.assigned).length,
    effective: candidates.filter((candidate) => candidate.effective).length,
    routable: candidates.filter((candidate) => candidate.routable).length,
  };
}
