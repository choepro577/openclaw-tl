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

export type EnterprisePluginRequest = {
  id: string;
  requesterAccountId: string;
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
  accountId: string;
  pluginId: string;
  exactVersion: string;
  integrity: string;
  capabilityDigest: string;
  approvedTools: string[];
  sourceRequestId: string;
  state: EnterprisePluginGrantState;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
