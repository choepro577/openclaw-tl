import type { SkillClawHubLink } from "../../../api/types.ts";

export type EnterprisePortalAudience = "admin" | "user";
export type EnterpriseAccountRole = "administrator" | "employee";
export type EnterpriseEntitlementEffect = "allow" | "deny";

export type EnterpriseAccount = {
  id: string;
  profileId: string;
  username: string;
  displayName: string;
  role: EnterpriseAccountRole;
  mustChangePassword: boolean;
  enabled: boolean;
  personalAgentEnabled: boolean;
  defaultAgentId: string | null;
  accessPresetKey: string;
  policyRevision: number;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
};

export type EnterpriseEntitlement = {
  accountId?: string;
  resourceType: "agent" | "skill" | "tool";
  resourceId: string;
  resourceState?: "active" | "legacy" | "orphaned";
  effect: EnterpriseEntitlementEffect;
};

export type EnterpriseEffectivePolicy = {
  accountId: string;
  role: EnterpriseAccountRole;
  personalAgentEnabled: boolean;
  defaultAgentId: string | null;
  entitlements: EnterpriseEntitlement[];
  employeeHardDeniedTools: string[];
};

export type EnterpriseStatus = {
  enabled: boolean;
  authMode?: string;
  bootstrapped?: boolean;
  userPortalVersion?: "legacy" | "v2";
};

export type EnterprisePageInfo = { total: number; nextCursor: string | null };

export type EnterpriseAccessDecision = {
  assignedEffect: EnterpriseEntitlementEffect | "none";
  effectiveAllowed: boolean;
  intrinsicStatus: string;
  reasonCodes: string[];
  policyRevision: number;
  catalogRevision: string;
};

export type EnterpriseSharedAgent = {
  kind: "shared";
  agentId: string;
  resourceKey: string;
  name: string;
  model: string | null;
  workspace: string | null;
  runtimeType: string;
  assignedUserCount: number;
  skillCount: number;
  toolCount: number;
  updatedAt?: number | null;
};

export type EnterprisePersonalAgent = {
  kind: "personal";
  accountId: string;
  instanceId: string;
  resourceKey: string;
  ownerDisplayName: string;
  username: string;
  enabled: boolean;
  runtimeAgentId: string | null;
  model: string | null;
  workspaceStatus: string;
  activeSessionCount: number;
  skillCount: number;
  toolCount: number;
  updatedAt: number;
};

export type EnterpriseUserCapabilities = {
  account: EnterpriseAccount;
  personal: EnterprisePersonalAgent | null;
  sharedAgents: EnterpriseSharedAgent[];
  defaultAgentId: string;
  policyRevision: number;
  catalogRevision: string;
  actions: {
    canCreateSession: boolean;
    canUsePersonalAgent: boolean;
    canInstallSkills: boolean;
    canManageConfig: boolean;
    canUseHostTerminal: boolean;
  };
};

export type EnterpriseSkillCatalogItem = {
  resourceKey: string;
  skillKey: string;
  name: string;
  description: string;
  source: string;
  category: "workspace" | "built-in" | "managed" | "extra" | "other";
  ownerAgentId: string | null;
  intrinsicStatus: "ready" | "needs_setup" | "disabled";
  setupReason: string | null;
  clawhub?: SkillClawHubLink;
  assignedUserCount: number;
  effectiveAccess?: EnterpriseAccessDecision;
};

export type EnterpriseToolCatalogItem = {
  resourceKey: string;
  toolId: string;
  label?: string;
  description?: string;
  source: string;
  risk: string;
  agentId: string | null;
  assignable: boolean;
  nonDelegable: boolean;
  sessionDependent: boolean;
  assignedUserCount: number;
  effectiveAccess?: EnterpriseAccessDecision;
};

export type EnterpriseConfigSnapshot = {
  schema: unknown;
  config: unknown;
  raw: string;
  hash: string;
  impact: { restartRequired?: boolean; reloadRequired?: boolean; warnings?: string[] };
};

export type EnterpriseConfigValidation = {
  valid: boolean;
  hash: string;
  sanitizedDiff: Array<{ path: string; before: unknown; after: unknown }>;
  warnings: string[];
  impact: { restartRequired: boolean; reloadRequired: boolean; highRiskPaths: string[] };
};

export type EnterpriseAuditEvent = {
  id: string;
  actorAccountId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  createdAt: number;
};

export type EnterpriseAdminModelMethod =
  | "models.list"
  | "models.authStatus"
  | "models.authLogout"
  | "models.probe"
  | "usage.status"
  | "sessions.usage"
  | "config.get"
  | "config.schema"
  | "config.schema.lookup"
  | "config.set"
  | "config.patch"
  | "openclaw.setup.detect"
  | "openclaw.setup.verify"
  | "openclaw.setup.auth.start"
  | "openclaw.setup.prepare.start"
  | "openclaw.setup.activate"
  | "wizard.next"
  | "wizard.cancel";

export type EnterpriseAdminModelContext = {
  agents: {
    defaultId: string;
    mainKey: string;
    scope: string;
    agents: Array<{ id: string; kind?: string; name?: string }>;
  };
  methods: string[];
};

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
  state: "pending" | "approving" | "available" | "rejected" | "cancelled" | "install_failed";
  installedPluginId: string | null;
  reviewerAccountId: string | null;
  decisionReason: string | null;
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterprisePluginGrant = {
  id: string;
  accountId: string;
  pluginId: string;
  exactVersion: string;
  integrity: string;
  approvedTools: string[];
  state: "active" | "suspended_version_mismatch" | "unavailable" | "orphaned" | "revoked";
  revision: number;
};

export type EnterprisePluginRequestDetail = {
  request: EnterprisePluginRequest;
  account: { id: string; username: string; displayName: string } | null;
  globalImpact: {
    scope: "gateway";
    nativeSurfaces: string[];
    affectedAccounts: string[];
  };
  artifactCheck: {
    ok: boolean;
    checkedAt: number;
    errorCode?: string;
  };
  globalStatus: {
    installed: boolean;
    loaded: boolean;
    pluginId: string | null;
    version: string | null;
    integrity: string | null;
    toolOwnershipMatches: boolean;
    tools: string[];
  };
  grants: EnterprisePluginGrant[];
};
