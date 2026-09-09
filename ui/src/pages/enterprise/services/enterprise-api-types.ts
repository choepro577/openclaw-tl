import type { SkillClawHubLink } from "../../../api/types.ts";

export type EnterprisePortalAudience = "admin" | "user";
export type EnterpriseAccountRole = "administrator" | "employee";
export type EnterpriseEntitlementEffect = "allow" | "deny";

export type EnterpriseAccessPreset = {
  key: string;
  label: string;
  description: string;
  toolIds: string[];
};

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
  permissionAllowed: boolean;
  effectiveAllowed: boolean;
  intrinsicStatus: string;
  reasonCodes: string[];
  setupReason?: string | null;
  policyRevision: number;
  catalogRevision: string;
};

export type EnterpriseSharedAgent = {
  kind: "shared";
  agentId: string;
  resourceKey: string;
  name: string;
  description?: string;
  delegationTarget?: EnterpriseDelegationProfile | null;
  delegationReadiness?: "ready" | "needs_setup" | "disabled";
  evidenceTransferEligible?: boolean;
  model: string | null;
  workspace: string | null;
  runtimeType: string;
  assignedUserCount: number;
  effectiveUserCount?: number;
  routableUserCount?: number;
  skillCount: number;
  toolCount: number;
  updatedAt?: number | null;
};

export type EnterpriseDelegationHandlingMode =
  | "auto_when_certain"
  | "confirm_before_handoff"
  | "explicit_only";

export type EnterpriseDelegationProfile = {
  status: "draft" | "active" | "disabled";
  aliases: string[];
  handlingMode: EnterpriseDelegationHandlingMode;
  useWhen: string[];
  avoidWhen: string[];
  requiredInputs: Array<{ id: string; label: string; question: string }>;
};

export type EnterpriseDelegationPolicy = {
  rollout: "off" | "shadow" | "on";
  routerModel: string;
  autoThreshold: number;
  clarifyThreshold: number;
  minimumMargin: number;
  maxDelegatesPerTurn: number;
  eventRetentionDays: number;
  revision: number;
  updatedAt: number;
};

export type EnterpriseDelegationSpecialist = {
  agentId: string;
  resourceKey: string;
  name: string;
  description: string;
  profile: EnterpriseDelegationProfile | null;
  profileRevision: string;
  assigned: boolean;
  effective: boolean;
  routable: boolean;
  overrideMode: "inherit" | "confirm_before_handoff" | "explicit_only" | "disabled";
  overrideRevision: number;
  effectiveMode: EnterpriseDelegationHandlingMode | "disabled";
  reasonCodes: string[];
};

export type EnterpriseDelegationEvent = {
  id: string;
  accountId: string;
  personalAgentId: string;
  sharedAgentIds: string[];
  childRunIds: string[];
  promptHash: string;
  decisionSource: "explicit" | "rule" | "ai" | "system";
  outcome: "delegated" | "clarified" | "local" | "blocked" | "failed" | "cancelled" | "shadow";
  confidenceBand: "clear" | "ambiguous" | "low" | null;
  reasonCode: string;
  policyRevision: number;
  confirmationState: "not_required" | "pending" | "approved" | "denied" | "expired";
  latencyMs: number | null;
  createdAt: number;
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
  intrinsicStatus?: "ready" | "needs_setup" | "disabled";
  setupReason?: string | null;
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

export type EnterpriseCodexPluginRequest = {
  id: string;
  pluginId?: string;
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
  requesterAccountId: string;
  agentKey: string;
  runtimeAgentId?: string;
  requestKind: "install" | "access";
  catalogSnapshot?: Record<string, unknown>;
  capabilitySnapshot?: Record<string, unknown>;
  capabilityDigest?: string;
  state: "pending" | "approving" | "available" | "rejected" | "cancelled" | "install_failed";
  installedPluginId: string | null;
  reviewerAccountId?: string | null;
  decisionReason: string | null;
  safeErrorCode: string | null;
  authRequired?: boolean;
  appsNeedingAuth?: Array<{ id: string; name: string; installUrl?: string | null }>;
  connectUrls?: string[];
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterpriseCodexPluginGrant = {
  id: string;
  pluginId?: string;
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
  accountId?: string;
  agentKey: string;
  runtimeAgentId?: string;
  installedPluginId: string | null;
  capabilitySnapshot?: Record<string, unknown>;
  capabilityDigest?: string;
  sourceRequestId?: string;
  state: "active" | "disabled" | "unavailable" | "revoked";
  authRequired?: boolean;
  appsNeedingAuth?: Array<{ id: string; name: string; installUrl?: string | null }>;
  connectUrls?: string[];
  ready?: boolean;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type EnterpriseCodexPluginRequestDetail = {
  request: EnterpriseCodexPluginRequest;
  account: { id: string; username: string; displayName: string } | null;
  detail: Record<string, unknown> | null;
  grant: EnterpriseCodexPluginGrant | null;
};
