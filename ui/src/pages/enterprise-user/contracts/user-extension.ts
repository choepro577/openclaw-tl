import type { AgentKey } from "./user-agent.ts";

export type UserExtensionKind = "skill" | "code_plugin" | "bundle_plugin";
export type UserExtensionAction = "install_skill" | "request_admin" | "none";

export type UserExtensionCatalogItem = {
  catalogKey: string;
  kind: UserExtensionKind;
  name: string;
  description: string | null;
  publisher: string | null;
  version: string | null;
  integrity: string | null;
  trust: {
    disposition: "clean" | "pending" | "stale" | "unscanned" | "malicious" | "revoked";
    scanStatus: string | null;
    moderationState: string | null;
    checkedAt: string;
  } | null;
  allowedAction: UserExtensionAction;
  reasonCodes: string[];
  requirements: string[];
  requestState: UserPluginRequest["state"] | null;
};

export type UserSkillInstall = {
  id: string;
  agentKey: AgentKey;
  clawhubRef: string;
  skillName: string;
  exactVersion: string;
  integrity: string;
  enabled: boolean;
  state: "ready" | "needs_setup" | "disabled" | "modified" | "error";
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type UserPluginRequest = {
  id: string;
  packageName: string;
  packageFamily: "code_plugin" | "bundle_plugin";
  exactVersion: string;
  integrity: string;
  requestKind: "install" | "access";
  state: "pending" | "approving" | "available" | "rejected" | "cancelled" | "install_failed";
  decisionReason: string | null;
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type UserPluginGrant = {
  id: string;
  pluginId: string;
  exactVersion: string;
  integrity: string;
  approvedTools: string[];
  state: "active" | "suspended_version_mismatch" | "unavailable" | "orphaned" | "revoked";
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type UserExtensionReview = {
  item: UserExtensionCatalogItem;
  reviewToken: string;
  expiresAt: number;
};
