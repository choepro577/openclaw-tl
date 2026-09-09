// One-shot mutation approvals for Enterprise specialist child runs.
import { createHash } from "node:crypto";
import path from "node:path";
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { isPathInside } from "../../infra/path-guards.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { PluginApprovalResolution } from "../../plugins/types.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";
import type { SkillSnapshot } from "../../skills/types.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { hasTopLevelShellControlOperator, splitShellArgs } from "../../utils/shell-argv.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import {
  appendEnterpriseDelegationEvent,
  readEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const log = createSubsystemLogger("enterprise/delegation-guard");

const AUTHORITY_TTL_MS = 10 * 60_000;
const APPROVAL_TTL_MS = 2 * 60_000;

const READ_ONLY_TOOLS = new Set([
  "read",
  "grep",
  "glob",
  "find",
  "search",
  "web_search",
  "web_fetch",
  "memory_search",
  "memory_get",
  "knowledge_search",
  "knowledge_get",
  "enterprise_knowledge_search",
  "enterprise_knowledge_get",
  "sessions_list",
  "sessions_history",
  "sessions_search",
  "session_status",
]);
const EXEC_TOOLS = new Set(["exec", "sandbox_exec"]);
const READ_ONLY_PROCESS_ACTIONS = new Set(["list", "poll", "log"]);

type DelegationChildAuthority = {
  childSessionKey: string;
  childRunId: string;
  accountId: string;
  personalAgentId: string;
  parentSessionKey: string;
  parentRunId: string;
  childAgentId: string;
  childAgentName: string;
  policyRevision: number;
  profileRevision: string;
  createdAt: number;
  expiresAt: number;
  stateOptions?: OpenClawStateDatabaseOptions;
};

type PendingApproval = {
  token: string;
  childSessionKey: string;
  childRunId: string;
  toolName: string;
  toolCallId: string;
  argsHash: string;
  expiresAt: number;
  consumed: boolean;
};

const CHILD_AUTHORITIES_KEY = Symbol.for("openclaw.enterprise.delegationChildAuthorities");
const PENDING_APPROVALS_KEY = Symbol.for("openclaw.enterprise.delegationMutationApprovals");
const childAuthorities = resolveGlobalSingleton<Map<string, DelegationChildAuthority>>(
  CHILD_AUTHORITIES_KEY,
  () => new Map(),
);
const pendingApprovals = resolveGlobalSingleton<Map<string, PendingApproval>>(
  PENDING_APPROVALS_KEY,
  () => new Map(),
);

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function hashArgs(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function cleanupExpired(now = Date.now()): void {
  for (const [key, authority] of childAuthorities) {
    if (authority.expiresAt <= now) {
      childAuthorities.delete(key);
    }
  }
  for (const [key, approval] of pendingApprovals) {
    if (approval.expiresAt <= now || approval.consumed) {
      pendingApprovals.delete(key);
    }
  }
}

export function registerEnterpriseDelegationChildAuthority(
  input: Omit<DelegationChildAuthority, "createdAt" | "expiresAt">,
): void {
  cleanupExpired();
  const now = Date.now();
  childAuthorities.set(input.childSessionKey, {
    ...input,
    createdAt: now,
    expiresAt: now + AUTHORITY_TTL_MS,
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
  for (const [key, approval] of pendingApprovals) {
    if (approval.childSessionKey === childSessionKey) {
      pendingApprovals.delete(key);
    }
  }
}

/** Invalidates unused one-shot approvals while retaining child authority so live policy checks fail closed. */
export function invalidateEnterpriseDelegationMutationApprovals(): number {
  const count = pendingApprovals.size;
  pendingApprovals.clear();
  return count;
}

function resolveAuthority(params: {
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): DelegationChildAuthority | undefined {
  cleanupExpired();
  if (!params.childSessionKey || !params.childRunId || !params.childAgentId) {
    return undefined;
  }
  const authority = childAuthorities.get(params.childSessionKey);
  return authority &&
    authority.childRunId === params.childRunId &&
    normalizeAgentId(authority.childAgentId) === normalizeAgentId(params.childAgentId)
    ? authority
    : undefined;
}

export function isEnterpriseDelegationChildSession(params: {
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
}): boolean {
  return Boolean(resolveAuthority(params));
}

function liveAuthorityReason(
  authority: DelegationChildAuthority,
  config: OpenClawConfig,
): string | undefined {
  const account = getEnterpriseAccountById(authority.accountId, authority.stateOptions);
  const policy = readEnterpriseDelegationPolicy(authority.stateOptions);
  if (!account?.enabled || !account.personalAgentEnabled) {
    return "delegation_account_disabled";
  }
  if (policy.rollout !== "on" || policy.revision !== authority.policyRevision) {
    return "delegation_policy_changed";
  }
  const target = listEnterpriseDelegationCandidates(config, account, authority.stateOptions).find(
    (candidate) => candidate.agentId === normalizeAgentId(authority.childAgentId),
  );
  if (!target?.routable || target.profileRevision !== authority.profileRevision) {
    log.warn("delegation target validation failed", {
      childRunId: authority.childRunId,
      expectedProfileRevision: authority.profileRevision,
      actualProfileRevision: target?.profileRevision,
      routable: target?.routable ?? false,
      reasonCodes: target?.reasonCodes ?? ["target_missing"],
    });
    return "delegation_target_changed";
  }
  return undefined;
}

function actionLabel(toolName: string): string {
  if (["write", "edit", "apply_patch"].includes(toolName)) {
    return "ghi hoặc thay đổi dữ liệu";
  }
  if (["message", "send", "email", "notify"].some((name) => toolName.includes(name))) {
    return "gửi dữ liệu hoặc thông báo ra bên ngoài";
  }
  if (["delete", "remove", "trash"].some((name) => toolName.includes(name))) {
    return "xóa dữ liệu";
  }
  if (["exec", "bash", "process", "shell"].some((name) => toolName.includes(name))) {
    return "chạy lệnh hoặc điều khiển tiến trình";
  }
  return "thực hiện thao tác chưa được phân loại là chỉ đọc";
}

function targetLabel(params: Record<string, unknown>): string {
  for (const key of ["path", "file", "target", "to", "channel", "url", "resourceId", "id"]) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) {
      return `${key}: ${value.trim().slice(0, 240)}`;
    }
  }
  return "đối tượng do công cụ xác định từ tham số hiện tại";
}

function changedFields(params: Record<string, unknown>): string {
  const fields = Object.keys(params).slice(0, 12);
  return fields.length > 0 ? fields.join(", ") : "không có trường dữ liệu mô tả";
}

function isReadOnlyProcessCall(toolName: string, toolParams: Record<string, unknown>): boolean {
  return (
    (toolName === "process" || toolName === "sandbox_process") &&
    typeof toolParams.action === "string" &&
    READ_ONLY_PROCESS_ACTIONS.has(toolParams.action.trim().toLowerCase())
  );
}

function isGrantedSkillScriptCall(params: {
  toolName: string;
  toolParams: Record<string, unknown>;
  skillsSnapshot?: SkillSnapshot;
}): boolean {
  if (!EXEC_TOOLS.has(params.toolName) || typeof params.toolParams.command !== "string") {
    return false;
  }
  const command = params.toolParams.command.trim();
  if (!command || hasTopLevelShellControlOperator(command) || /[`<>]|\$\(/u.test(command)) {
    return false;
  }
  const argv = splitShellArgs(command);
  const executable = argv?.[0];
  if (!executable || !path.isAbsolute(executable)) {
    return false;
  }
  const resolvedExecutable = path.resolve(executable);
  return (params.skillsSnapshot?.resolvedSkills ?? []).some((skill) => {
    const scriptsDir = path.resolve(skill.baseDir, "scripts");
    return resolvedExecutable !== scriptsDir && isPathInside(scriptsDir, resolvedExecutable);
  });
}

export type EnterpriseDelegationToolGuardDecision =
  | { kind: "not_delegated_child" | "allow_read_only" | "allow_granted_skill_script" }
  | { kind: "block"; reason: string }
  | {
      kind: "require_approval";
      token: string;
      title: string;
      description: string;
      timeoutMs: number;
      allowedDecisions: Array<"allow-once" | "deny">;
      onResolution: (resolution: PluginApprovalResolution) => void;
    };

export function evaluateEnterpriseDelegationToolCall(params: {
  config?: OpenClawConfig;
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
  toolName: string;
  toolCallId?: string;
  toolParams: Record<string, unknown>;
  skillsSnapshot?: SkillSnapshot;
}): EnterpriseDelegationToolGuardDecision {
  const authority = resolveAuthority(params);
  if (!authority || !params.config) {
    return { kind: "not_delegated_child" };
  }
  const normalizedTool = params.toolName.trim().toLowerCase();
  if (
    READ_ONLY_TOOLS.has(normalizedTool) ||
    isReadOnlyProcessCall(normalizedTool, params.toolParams)
  ) {
    return { kind: "allow_read_only" };
  }
  const invalidReason = liveAuthorityReason(authority, params.config);
  if (invalidReason) {
    return { kind: "block", reason: invalidReason };
  }
  if (
    isGrantedSkillScriptCall({
      toolName: normalizedTool,
      toolParams: params.toolParams,
      skillsSnapshot: params.skillsSnapshot,
    })
  ) {
    return { kind: "allow_granted_skill_script" };
  }
  const toolCallId = params.toolCallId?.trim();
  if (!toolCallId) {
    return { kind: "block", reason: "delegation_tool_call_id_required" };
  }
  const argsHash = hashArgs(params.toolParams);
  const token = createHash("sha256")
    .update(
      [
        authority.accountId,
        authority.parentRunId,
        authority.childSessionKey,
        authority.childRunId,
        toolCallId,
        normalizedTool,
        argsHash,
        String(Date.now()),
      ].join("\0"),
    )
    .digest("hex");
  const approval: PendingApproval = {
    token,
    childSessionKey: authority.childSessionKey,
    childRunId: authority.childRunId,
    toolName: normalizedTool,
    toolCallId,
    argsHash,
    expiresAt: Date.now() + APPROVAL_TTL_MS,
    consumed: false,
  };
  pendingApprovals.set(token, approval);
  return {
    kind: "require_approval",
    token,
    title: `Xác nhận thao tác của ${authority.childAgentName}`,
    description: [
      `Agent: ${authority.childAgentName}`,
      `Hành động: ${actionLabel(normalizedTool)} (${normalizedTool})`,
      `Đối tượng: ${targetLabel(params.toolParams)}`,
      `Dữ liệu chính sẽ tác động: ${changedFields(params.toolParams)}`,
      "Xác nhận này chỉ có hiệu lực cho đúng thao tác và tham số hiện tại.",
    ].join("\n"),
    timeoutMs: APPROVAL_TTL_MS,
    allowedDecisions: ["allow-once", "deny"],
    onResolution(resolution) {
      if (resolution !== "allow-once") {
        pendingApprovals.delete(token);
        appendEnterpriseDelegationEvent(
          {
            accountId: authority.accountId,
            personalAgentId: authority.personalAgentId,
            sharedAgentIds: [authority.childAgentId],
            childRunIds: [authority.childRunId],
            prompt: "",
            parentRunId: authority.parentRunId,
            parentSessionKey: authority.parentSessionKey,
            decisionSource: "system",
            outcome: "blocked",
            confidenceBand: null,
            reasonCode:
              resolution === "deny"
                ? "mutation_confirmation_denied"
                : "mutation_confirmation_expired",
            policyRevision: authority.policyRevision,
            profileRevisions: { [authority.childAgentId]: authority.profileRevision },
            confirmationState: resolution === "deny" ? "denied" : "expired",
            latencyMs: null,
          },
          authority.stateOptions,
        );
      }
    },
  };
}

export function consumeEnterpriseDelegationMutationApproval(params: {
  token: string;
  config: OpenClawConfig;
  childSessionKey?: string;
  childRunId?: string;
  childAgentId?: string;
  toolName: string;
  toolCallId?: string;
  toolParams: Record<string, unknown>;
  resolution?: PluginApprovalResolution;
}): { ok: true } | { ok: false; reason: string } {
  const authority = resolveAuthority(params);
  const approval = pendingApprovals.get(params.token);
  if (!authority || !approval) {
    return { ok: false, reason: "delegation_approval_not_found" };
  }
  if (params.resolution !== "allow-once") {
    pendingApprovals.delete(params.token);
    return { ok: false, reason: "delegation_approval_denied" };
  }
  if (
    approval.consumed ||
    approval.expiresAt <= Date.now() ||
    approval.childSessionKey !== params.childSessionKey ||
    approval.childRunId !== params.childRunId ||
    approval.toolName !== params.toolName.trim().toLowerCase() ||
    approval.toolCallId !== params.toolCallId ||
    approval.argsHash !== hashArgs(params.toolParams)
  ) {
    pendingApprovals.delete(params.token);
    return { ok: false, reason: "delegation_approval_scope_mismatch" };
  }
  const invalidReason = liveAuthorityReason(authority, params.config);
  if (invalidReason) {
    pendingApprovals.delete(params.token);
    return { ok: false, reason: invalidReason };
  }
  approval.consumed = true;
  pendingApprovals.delete(params.token);
  appendEnterpriseDelegationEvent(
    {
      accountId: authority.accountId,
      personalAgentId: authority.personalAgentId,
      sharedAgentIds: [authority.childAgentId],
      childRunIds: [],
      prompt: "",
      parentRunId: authority.parentRunId,
      parentSessionKey: authority.childSessionKey,
      decisionSource: "system",
      outcome: "delegated",
      confidenceBand: null,
      reasonCode: "mutation_confirmation_approved",
      policyRevision: authority.policyRevision,
      profileRevisions: { [authority.childAgentId]: authority.profileRevision },
      confirmationState: "approved",
      latencyMs: null,
    },
    authority.stateOptions,
  );
  return { ok: true };
}
