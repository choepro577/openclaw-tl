// Live authority guard for Enterprise specialist child runs.
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { PluginApprovalResolutions, type PluginApprovalResolution } from "../../plugins/types.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";
import type { SkillSnapshot } from "../../skills/types.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { resolveEnterpriseSharedAgentCapabilities } from "../isolation/enterprise-agent-capabilities.js";
import { cancelEnterpriseSkillAuthForChild } from "../skill-runtime/skill-auth-request.js";
import { skillScriptRisk } from "../skill-runtime/skill-script-runtime.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import { readEnterpriseDelegationPolicy } from "./delegation-store.js";

const log = createSubsystemLogger("enterprise/delegation-guard");
const SKILL_SCRIPT_TOOL = "skill_script";
const APPROVAL_TIMEOUT_MS = 2 * 60_000;

export type DelegationChildAuthority = {
  childSessionKey: string;
  childRunId: string;
  accountId: string;
  personalAgentId: string;
  parentSessionKey: string;
  parentRunId: string;
  childAgentId: string;
  childAgentName: string;
  approvalReviewerDeviceId?: string;
  policyRevision: number;
  profileRevision: string;
  provisionalRunId: boolean;
  stateOptions?: OpenClawStateDatabaseOptions;
};

// This process-local map indexes an admitted child until the existing terminal
// or dispatch-abort callback revokes it. It is not a time-based grant: every
// call revalidates the live account, policy, profile, and capability revision.
const childAuthorities = resolveGlobalSingleton<Map<string, DelegationChildAuthority>>(
  Symbol.for("openclaw.enterprise.delegationChildAuthorities"),
  () => new Map(),
);

export function registerEnterpriseDelegationChildAuthority(
  input: Omit<DelegationChildAuthority, "provisionalRunId"> & {
    provisionalRunId?: boolean;
  },
): void {
  childAuthorities.set(input.childSessionKey, {
    ...input,
    provisionalRunId: input.provisionalRunId === true,
  });
}

export function confirmEnterpriseDelegationChildRun(params: {
  childSessionKey: string;
  anticipatedRunId: string;
  actualRunId: string;
}): void {
  const authority = childAuthorities.get(params.childSessionKey);
  if (
    !authority ||
    !authority.provisionalRunId ||
    authority.childRunId !== params.anticipatedRunId
  ) {
    throw new Error("DELEGATION_CHILD_AUTHORITY_CONFIRMATION_FAILED");
  }
  childAuthorities.set(params.childSessionKey, {
    ...authority,
    childRunId: params.actualRunId,
    provisionalRunId: false,
  });
}

export function revokeEnterpriseDelegationChildAuthority(
  childSessionKey: string,
  childRunId?: string,
): void {
  const authority = childAuthorities.get(childSessionKey);
  if (childRunId && authority?.childRunId !== childRunId) {
    return;
  }
  childAuthorities.delete(childSessionKey);
  cancelEnterpriseSkillAuthForChild(childSessionKey);
}

function resolveAuthority(params: {
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): DelegationChildAuthority | undefined {
  if (!params.childSessionKey || !params.childRunId || !params.childAgentId) {
    return undefined;
  }
  const authority = childAuthorities.get(params.childSessionKey);
  return authority &&
    (authority.provisionalRunId || authority.childRunId === params.childRunId) &&
    normalizeAgentId(authority.childAgentId) === normalizeAgentId(params.childAgentId)
    ? authority
    : undefined;
}

export function readEnterpriseDelegationChildAuthority(params: {
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): DelegationChildAuthority | undefined {
  const authority = resolveAuthority(params);
  if (!authority && childAuthorities.size > 0) {
    const registered = childAuthorities.get(params.childSessionKey ?? "");
    log.warn("delegation child authority lookup missed", {
      childSessionKey: params.childSessionKey,
      childRunId: params.childRunId,
      childAgentId: params.childAgentId,
      authorityRegistered: Boolean(registered),
      registeredRunId: registered?.childRunId,
      registeredAgentId: registered?.childAgentId,
      provisionalRunId: registered?.provisionalRunId,
      registeredSessionKeys: [...childAuthorities.keys()],
    });
  }
  return authority ? { ...authority } : undefined;
}

export function isEnterpriseDelegationChildSession(params: {
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): boolean {
  return Boolean(resolveAuthority(params));
}

type EnterpriseSharedCapability = ReturnType<typeof resolveEnterpriseSharedAgentCapabilities>;

function resolveLiveEnterpriseSharedAgentCapabilities(
  config: OpenClawConfig,
  accountId: string,
  agentId: string,
  stateOptions?: OpenClawStateDatabaseOptions,
): EnterpriseSharedCapability | undefined {
  const resolver = readGatewayRequestRuntimeMetadata(config)?.enterpriseCapabilities;
  if (resolver) {
    const capability = resolver.resolve(agentId);
    return capability.accountId === accountId ? capability : undefined;
  }
  const account = getEnterpriseAccountById(accountId, stateOptions);
  return account
    ? resolveEnterpriseSharedAgentCapabilities({ config, account, agentId, stateOptions })
    : undefined;
}

/**
 * Identifies a directly selected Shared Agent before the tool call reaches the
 * normal policy chain. Personal Agent policy is deliberately not consulted.
 */
export function isEnterpriseSharedAgentSession(params: {
  config?: OpenClawConfig;
  agentId?: string;
}): boolean {
  const metadata = readGatewayRequestRuntimeMetadata(params.config);
  const user = metadata?.enterpriseUser;
  const agentId = params.agentId?.trim();
  if (!user || !agentId) {
    return false;
  }
  const normalized = normalizeAgentId(agentId);
  return (
    normalized !== normalizeAgentId(user.personalAgentId) &&
    normalized !== normalizeAgentId(user.personalAgentTemplateId)
  );
}

function resolveDirectEnterpriseSharedCapability(params: {
  config: OpenClawConfig;
  agentId?: string;
}): EnterpriseSharedCapability | undefined {
  if (!isEnterpriseSharedAgentSession(params) || !params.agentId) {
    return undefined;
  }
  const accountId = readGatewayRequestRuntimeMetadata(params.config)?.enterpriseUser?.accountId;
  return accountId
    ? resolveLiveEnterpriseSharedAgentCapabilities(params.config, accountId, params.agentId)
    : undefined;
}

function approvalDescription(params: { toolName: string; agentName?: string }): {
  title: string;
  description: string;
} {
  const owner = params.agentName?.trim() || "Shared Agent";
  return {
    title: `Xác nhận thao tác của ${owner}`,
    description: `Công cụ ${params.toolName} yêu cầu xác nhận trước khi thực hiện thao tác có thể thay đổi dữ liệu hoặc chưa được phân loại là chỉ đọc.`,
  };
}

function liveAuthorityReason(
  authority: DelegationChildAuthority,
  config: OpenClawConfig,
): string | undefined {
  const account = getEnterpriseAccountById(authority.accountId, authority.stateOptions);
  const policy = readEnterpriseDelegationPolicy(authority.stateOptions);
  if (!account?.enabled || !account.personalAgentEnabled) {
    return "AGENT_DISABLED";
  }
  if (policy.rollout !== "on" || policy.revision !== authority.policyRevision) {
    return "DELEGATION_POLICY_CHANGED";
  }
  const liveResolver =
    readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.resolveSpecialist;
  const target = liveResolver
    ? liveResolver(authority.childAgentId)
    : listEnterpriseDelegationCandidates(config, account, authority.stateOptions).find(
        (candidate) => candidate.agentId === normalizeAgentId(authority.childAgentId),
      );
  if (!target?.routable) {
    log.warn("delegation target validation failed", {
      childRunId: authority.childRunId,
      routable: target?.routable ?? false,
      reasonCodes: target?.reasonCodes ?? ["target_missing"],
    });
    return target?.reasonCodes.includes("profile_disabled")
      ? "AGENT_DISABLED"
      : "SHARED_AGENT_NOT_GRANTED";
  }
  if (target.profileRevision !== authority.profileRevision) {
    log.warn("delegation capability revision changed", {
      childRunId: authority.childRunId,
      expectedProfileRevision: authority.profileRevision,
      actualProfileRevision: target.profileRevision,
    });
    return "DELEGATION_CAPABILITY_CHANGED";
  }
  const capability = resolveLiveEnterpriseSharedAgentCapabilities(
    config,
    authority.accountId,
    authority.childAgentId,
    authority.stateOptions,
  );
  if (!capability?.allowed) {
    return capability?.reason === "account_disabled"
      ? "AGENT_DISABLED"
      : "SHARED_AGENT_NOT_GRANTED";
  }
  return undefined;
}

export function validateEnterpriseDelegationChildAuthority(params: {
  config: OpenClawConfig;
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): { ok: true; authority: DelegationChildAuthority } | { ok: false; reason: string } {
  const authority = resolveAuthority(params);
  if (!authority) {
    return { ok: false, reason: "SHARED_AGENT_NOT_GRANTED" };
  }
  const reason = liveAuthorityReason(authority, params.config);
  return reason ? { ok: false, reason } : { ok: true, authority: { ...authority } };
}

export type EnterpriseDelegationToolGuardDecision =
  | { kind: "not_delegated_child" }
  | { kind: "allow" }
  | { kind: "block"; reason: string }
  | {
      kind: "require_approval";
      title: string;
      description: string;
      timeoutMs: number;
      allowedDecisions: Array<"allow-once" | "deny">;
    };

export function evaluateEnterpriseDelegationToolCall(params: {
  config?: OpenClawConfig;
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
  toolName: string;
  toolParams?: Record<string, unknown>;
  toolCallId?: string;
  skillsSnapshot?: SkillSnapshot;
  approvalResolution?: PluginApprovalResolution;
}): EnterpriseDelegationToolGuardDecision {
  const authority = resolveAuthority(params);
  if (!params.config) {
    return authority || params.toolName === SKILL_SCRIPT_TOOL
      ? { kind: "block", reason: "DELEGATION_REQUEST_CONFIG_MISSING" }
      : { kind: "not_delegated_child" };
  }

  const normalizedTool = params.toolName.trim().toLowerCase();
  const toolParams = params.toolParams ?? {};
  let capability: EnterpriseSharedCapability | undefined;
  if (authority) {
    const reason = liveAuthorityReason(authority, params.config);
    if (reason) {
      return { kind: "block", reason };
    }
    capability = resolveLiveEnterpriseSharedAgentCapabilities(
      params.config,
      authority.accountId,
      authority.childAgentId,
      authority.stateOptions,
    );
  } else {
    capability = resolveDirectEnterpriseSharedCapability({
      config: params.config,
      agentId: params.childAgentId,
    });
    if (
      !capability &&
      !isEnterpriseSharedAgentSession({ config: params.config, agentId: params.childAgentId })
    ) {
      return { kind: "not_delegated_child" };
    }
  }

  if (!capability?.allowed) {
    return {
      kind: "block",
      reason:
        capability?.reason === "account_disabled" ? "AGENT_DISABLED" : "SHARED_AGENT_NOT_GRANTED",
    };
  }

  if (normalizedTool === SKILL_SCRIPT_TOOL) {
    const skillKey = typeof toolParams.skill === "string" ? toolParams.skill.trim() : "";
    const entrypointName =
      typeof toolParams.entrypoint === "string" ? toolParams.entrypoint.trim() : "";
    if (!skillKey || !entrypointName) {
      return { kind: "block", reason: "SKILL_ENTRYPOINT_INVALID" };
    }
    let risk: "read" | "approval";
    try {
      risk = skillScriptRisk({
        snapshot: capability.skillsSnapshot,
        skillKey,
        entrypointName,
        ...(typeof toolParams.operation === "string" ? { operation: toolParams.operation } : {}),
      });
    } catch (error) {
      const code =
        error instanceof Error && "code" in error && typeof error.code === "string"
          ? error.code
          : "SKILL_ENTRYPOINT_INVALID";
      return { kind: "block", reason: code };
    }
    if (risk === "read") {
      return { kind: "allow" };
    }

    if (params.approvalResolution === PluginApprovalResolutions.ALLOW_ONCE) {
      return { kind: "allow" };
    }
    if (params.approvalResolution) {
      return { kind: "block", reason: "delegation_approval_denied" };
    }
    const approval = approvalDescription({
      toolName: normalizedTool,
      agentName: authority?.childAgentName ?? params.childAgentId,
    });
    return {
      kind: "require_approval",
      ...approval,
      timeoutMs: APPROVAL_TIMEOUT_MS,
      allowedDecisions: ["allow-once", "deny"],
    };
  }
  // Existing tool owners, trusted policies, and harness capability checks own
  // approval for non-script tools. This guard only establishes that the live
  // Shared Agent capability is still valid for the call.
  return { kind: "allow" };
}
