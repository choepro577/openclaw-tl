import type { AgentKey } from "../user/user-api-contracts.js";

export type EnterpriseExtensionKind = "skill" | "code_plugin" | "bundle_plugin";
export type EnterpriseExtensionAction = "install_skill" | "request_admin" | "none";

export type EnterpriseExtensionTrust = {
  disposition: "clean" | "pending" | "stale" | "unscanned" | "malicious" | "revoked";
  scanStatus: string | null;
  moderationState: string | null;
  checkedAt: string;
};

export type EnterpriseExtensionCatalogItem = {
  catalogKey: string;
  kind: EnterpriseExtensionKind;
  name: string;
  description: string | null;
  publisher: string | null;
  version: string | null;
  integrity: string | null;
  trust: EnterpriseExtensionTrust | null;
  allowedAction: EnterpriseExtensionAction;
  reasonCodes: string[];
  requirements: string[];
  requestState: EnterprisePluginRequest["state"] | null;
};

export type EnterpriseUserSkillInstallState =
  | "ready"
  | "needs_setup"
  | "disabled"
  | "modified"
  | "error";

export type EnterpriseUserSkillInstall = {
  id: string;
  accountId: string;
  agentKey: AgentKey;
  runtimeAgentId: string;
  clawhubRef: string;
  skillName: string;
  exactVersion: string;
  integrity: string;
  relativePath: string;
  treeHash: string;
  enabled: boolean;
  state: EnterpriseUserSkillInstallState;
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type EnterprisePluginRequestState =
  | "pending"
  | "approving"
  | "available"
  | "rejected"
  | "cancelled"
  | "install_failed";

/**
 * Ownership boundary for an installed native plugin. Existing account grants
 * stay private to their account; a shared-agent grant is opt-in and is
 * resolved only for that canonical runtime agent.
 */
export type EnterpriseExtensionGrantScope = "account" | "shared_agent";

export function normalizeEnterpriseExtensionGrantTarget(input: {
  scope?: EnterpriseExtensionGrantScope | null;
  agentKey?: AgentKey | null;
  runtimeAgentId?: string | null;
}): {
  scope: EnterpriseExtensionGrantScope;
  agentKey: AgentKey | null;
  runtimeAgentId: string | null;
} {
  const scope = input.scope ?? "account";
  const agentKey = input.agentKey ?? null;
  const runtimeAgentId = input.runtimeAgentId?.trim() || null;
  if (scope === "shared_agent" && (!agentKey?.startsWith("shared:") || !runtimeAgentId)) {
    throw new Error("EXTENSION_GRANT_SCOPE_INVALID");
  }
  return { scope, agentKey, runtimeAgentId };
}

export type EnterprisePluginRequest = {
  id: string;
  /** Null after the requesting account is removed; the request is retained for audit. */
  requesterAccountId: string | null;
  scope: EnterpriseExtensionGrantScope;
  agentKey: AgentKey | null;
  runtimeAgentId: string | null;
  packageName: string;
  packageFamily: "code_plugin" | "bundle_plugin";
  exactVersion: string;
  integrity: string;
  requestKind: "install" | "access";
  trustSnapshot: Record<string, unknown>;
  capabilitySnapshot: Record<string, unknown>;
  capabilityDigest: string;
  state: EnterprisePluginRequestState;
  installedPluginId: string | null;
  reviewerAccountId: string | null;
  decisionReason: string | null;
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterprisePluginGrantState =
  | "active"
  | "suspended_version_mismatch"
  | "unavailable"
  | "orphaned"
  | "revoked";

export type EnterpriseAccountPluginGrant = {
  id: string;
  /** Null after the requester account is removed; shared scope is agent-owned. */
  accountId: string | null;
  scope: EnterpriseExtensionGrantScope;
  agentKey: AgentKey | null;
  runtimeAgentId: string | null;
  pluginId: string;
  exactVersion: string;
  integrity: string;
  capabilityDigest: string;
  approvedTools: string[];
  sourceRequestId: string | null;
  approvedByAccountId: string | null;
  state: EnterprisePluginGrantState;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
