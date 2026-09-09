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

export type UserCodexPluginRequestState =
  | "pending"
  | "approving"
  | "available"
  | "rejected"
  | "cancelled"
  | "install_failed";

export type UserCodexPluginGrantState = "active" | "disabled" | "unavailable" | "revoked";

export type UserCodexPluginAuthApp = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  /** Whether Codex can address this provider app for the selected grant. */
  accessible?: boolean;
  enabled?: boolean;
  callable?: boolean;
  needsAuth?: boolean;
  metadataAvailable?: boolean;
  runtimeState?: string | null;
  installUrl?: string | null;
  accounts?: UserCodexPluginConnectedAccount[];
  accountsStatus?: "available" | "unavailable";
  addAccountUrl?: string | null;
};

export type UserCodexPluginConnectedAccount = {
  id: string;
  /** Provider display name; some providers only return the account email. */
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  authStatus?: string | null;
  authType?: string | null;
};

export type UserCodexPluginInterface = {
  displayName?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  developerName?: string | null;
  category?: string | null;
  capabilities?: string[];
  defaultPrompts?: string[];
  websiteUrl?: string | null;
  privacyPolicyUrl?: string | null;
  termsOfServiceUrl?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  composerIconUrl?: string | null;
  brandColor?: string | null;
  screenshotUrls?: string[];
};

export type UserCodexPluginSkill = {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  enabled?: boolean;
};

export type UserCodexPluginHook = {
  key: string;
  eventName?: string | null;
};

export type UserCodexPluginAppTemplate = {
  templateId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  canonicalConnectorId?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  materializedAppIds?: string[];
  reason?: string | null;
};

export type UserCodexPluginMcpServer = {
  name: string;
  pluginId?: string | null;
  authStatus?: string | null;
  runtimeStatus?: string | null;
  needsAuth?: boolean;
  ready?: boolean;
};

export type UserCodexPluginScheduledTask = {
  key: string;
  name: string;
  prompt?: string | null;
  schedule?: unknown;
};

export type UserCodexPluginAuth = {
  authRequired?: boolean;
  apps?: UserCodexPluginAuthApp[];
  mcpServers?: UserCodexPluginMcpServer[];
  connectUrls?: string[];
  ready?: boolean;
};

/** Safe Codex catalog identity and account-scoped state. */
export type UserCodexCatalogItem = {
  id: string;
  pluginId?: string;
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
  name: string;
  description: string;
  installed: boolean;
  enabled: boolean;
  authRequired?: boolean;
  appsNeedingAuth?: UserCodexPluginAuthApp[];
  connectUrls?: string[];
  ready?: boolean;
  available: boolean;
  installPolicy: string | null;
  authPolicy: string | null;
  requestState: UserCodexPluginRequestState | null;
  grantState: UserCodexPluginGrantState | null;
};

export type UserCodexPluginRequest = {
  id: string;
  pluginId?: string;
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
  agentKey: AgentKey;
  requestKind: "install" | "access";
  state: UserCodexPluginRequestState;
  installedPluginId: string | null;
  authRequired?: boolean;
  appsNeedingAuth?: UserCodexPluginAuthApp[];
  connectUrls?: string[];
  decisionReason: string | null;
  safeErrorCode: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt?: number | null;
};

export type UserCodexPluginGrant = {
  id: string;
  pluginId?: string;
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
  agentKey: AgentKey;
  installedPluginId: string | null;
  capabilitySnapshot?: Record<string, unknown>;
  capabilityDigest: string;
  sourceRequestId?: string;
  state: UserCodexPluginGrantState;
  authRequired?: boolean;
  appsNeedingAuth?: UserCodexPluginAuthApp[];
  connectUrls?: string[];
  ready?: boolean;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

/** Detail is intentionally normalized at the Enterprise boundary. */
export type UserCodexPluginDetail = {
  item: UserCodexCatalogItem;
  version?: string | null;
  localVersion?: string | null;
  shareUrl?: string | null;
  capabilitySnapshot?: Record<string, unknown>;
  capabilityDigest?: string;
  interface?: UserCodexPluginInterface;
  skills?: UserCodexPluginSkill[];
  hooks?: UserCodexPluginHook[];
  apps?: UserCodexPluginAuthApp[];
  appTemplates?: UserCodexPluginAppTemplate[];
  mcpServers?: Array<string | UserCodexPluginMcpServer>;
  scheduledTasks?: UserCodexPluginScheduledTask[];
  auth?: UserCodexPluginAuth;
  authRequired?: boolean;
  appsNeedingAuth?: UserCodexPluginAuthApp[];
  connectUrls?: string[];
  installUrl?: string | null;
  authLinks?: Array<{ label: string; url: string }>;
};

export type UserCodexPluginMutationResult = {
  item?: UserCodexCatalogItem;
  request?: UserCodexPluginRequest;
  grant?: UserCodexPluginGrant;
  installedPluginId?: string | null;
  restartRequired?: boolean;
  authRequired?: boolean;
  appsNeedingAuth?: UserCodexPluginAuthApp[];
  connectUrls?: string[];
  authorizationUrl?: string | null;
  ready?: boolean;
  safeErrorCode?: string | null;
};

/** Catalog, inventory and request state are returned together to avoid stale joins. */
export type UserCodexCatalog = {
  status?: "available" | "unavailable";
  items: UserCodexCatalogItem[];
  installed: UserCodexPluginGrant[];
  requests: UserCodexPluginRequest[];
};
