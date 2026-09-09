import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentKey } from "../user/user-api-contracts.js";

/** Canonical identity of one Codex marketplace plugin. */
export type EnterpriseCodexPluginIdentity = {
  pluginName: string;
  marketplaceName: string;
  remotePluginId?: string | null;
};

export type EnterpriseCodexPluginRequestState =
  | "pending"
  | "approving"
  | "available"
  | "rejected"
  | "cancelled"
  | "install_failed";

export type EnterpriseCodexPluginRequestKind = "install" | "access";

export type EnterpriseCodexPluginAuthApp = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  accessible?: boolean;
  enabled?: boolean;
  callable?: boolean;
  needsAuth?: boolean;
  metadataAvailable?: boolean;
  runtimeState?: "available" | "missing" | "unavailable";
  installUrl: string | null;
  /** Current provider accounts reported for this app by Codex. */
  accounts?: Array<{
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    authStatus: string;
    authType: string;
  }>;
  accountsStatus?: "available" | "unavailable";
  /** Provider URL for adding another account, when the connector exposes one. */
  addAccountUrl?: string | null;
};

/** Public, path-free projection of Codex's PluginInterface. */
export type EnterpriseCodexPluginInterface = {
  displayName: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  developerName: string | null;
  category: string | null;
  capabilities: string[];
  websiteUrl: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  defaultPrompts: string[];
  brandColor: string | null;
  composerIconUrl: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  screenshotUrls: string[];
};

/** Path-free projection of one Codex skill declared by a plugin. */
export type EnterpriseCodexPluginSkill = {
  name: string;
  description: string;
  shortDescription: string | null;
  interface: {
    displayName: string | null;
    shortDescription: string | null;
    iconSmallUrl: string | null;
    iconLargeUrl: string | null;
    brandColor: string | null;
    defaultPrompt: string | null;
  } | null;
  enabled: boolean;
};

export type EnterpriseCodexPluginHook = {
  key: string;
  eventName: string;
};

export type EnterpriseCodexPluginApp = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  installUrl: string | null;
};

export type EnterpriseCodexPluginAppTemplate = {
  templateId: string;
  name: string;
  description: string | null;
  category: string | null;
  canonicalConnectorId: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  materializedAppIds: string[];
  reason: string | null;
};

/** Safe detail metadata returned by the Codex v2 plugin/read protocol. */
export type EnterpriseCodexPluginMetadata = {
  version: string | null;
  localVersion: string | null;
  interface: EnterpriseCodexPluginInterface | null;
  shareUrl: string | null;
  description: string | null;
  skills: EnterpriseCodexPluginSkill[];
  hooks: EnterpriseCodexPluginHook[];
  apps: EnterpriseCodexPluginApp[];
  appTemplates: EnterpriseCodexPluginAppTemplate[];
  mcpServers: string[];
  scheduledTasks: Array<Record<string, unknown>>;
};

export type EnterpriseCodexPluginAuthState = {
  authRequired: boolean;
  appsNeedingAuth: EnterpriseCodexPluginAuthApp[];
  /** Complete app inventory; includes connected apps as well as setup-needed apps. */
  apps?: EnterpriseCodexPluginAuthApp[];
  mcpServers?: Array<{
    name: string;
    pluginId: string | null;
    authStatus: string;
    runtimeStatus: string | null;
    needsAuth: boolean;
    ready: boolean;
  }>;
  connectUrls: string[];
  ready: boolean;
  statusError?: "metadata_unavailable" | "runtime_unavailable" | "mcp_unavailable";
  statusErrors?: Array<"metadata_unavailable" | "runtime_unavailable" | "mcp_unavailable">;
};

/**
 * Result of starting one plugin-owned MCP OAuth flow. The authorization URL
 * is returned for the current browser session and is never persisted with the
 * grant or exposed as a provider credential.
 */
export type EnterpriseCodexPluginMcpOAuthResult = {
  authorizationUrl: string;
};

export type EnterpriseCodexPluginRequest = EnterpriseCodexPluginIdentity & {
  id: string;
  requesterAccountId: string;
  agentKey: AgentKey;
  runtimeAgentId: string;
  requestKind: EnterpriseCodexPluginRequestKind;
  catalogSnapshot: Record<string, unknown>;
  capabilitySnapshot: Record<string, unknown>;
  capabilityDigest: string;
  state: EnterpriseCodexPluginRequestState;
  installedPluginId: string | null;
  reviewerAccountId: string | null;
  decisionReason: string | null;
  safeErrorCode: string | null;
  authRequired: boolean;
  appsNeedingAuth: EnterpriseCodexPluginAuthApp[];
  connectUrls: string[];
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterpriseCodexPluginGrantState = "active" | "disabled" | "unavailable" | "revoked";

export type EnterpriseCodexPluginGrant = EnterpriseCodexPluginIdentity & {
  id: string;
  accountId: string;
  agentKey: AgentKey;
  runtimeAgentId: string;
  installedPluginId: string | null;
  capabilitySnapshot: Record<string, unknown>;
  capabilityDigest: string;
  sourceRequestId: string;
  state: EnterpriseCodexPluginGrantState;
  revision: number;
  createdAt: number;
  updatedAt: number;
  authRequired: boolean;
  appsNeedingAuth: EnterpriseCodexPluginAuthApp[];
  connectUrls: string[];
  ready: boolean;
};

/** Safe Codex catalog row exposed to Enterprise portals. */
export type EnterpriseCodexPluginCatalogItem = EnterpriseCodexPluginIdentity & {
  id: string;
  name: string;
  description: string;
  category?: string | null;
  installed: boolean;
  enabled: boolean;
  available: boolean;
  installPolicy: string | null;
  authPolicy: string | null;
  requestState: EnterpriseCodexPluginRequestState | null;
  grantState: EnterpriseCodexPluginGrantState | null;
  /** Current connector readiness, when this row represents an installed grant. */
  authRequired?: boolean;
  appsNeedingAuth?: EnterpriseCodexPluginAuthApp[];
  connectUrls?: string[];
  ready?: boolean;
};

export type EnterpriseCodexPluginRuntimeCatalog = {
  items: EnterpriseCodexPluginCatalogItem[];
  warnings?: string[];
};

export type EnterpriseCodexPluginRuntimeDetail = {
  item: EnterpriseCodexPluginCatalogItem;
  metadata?: EnterpriseCodexPluginMetadata;
  /** Fresh connector state is supplied by the Codex runtime when available. */
  auth?: EnterpriseCodexPluginAuthState;
  capabilitySnapshot?: Record<string, unknown>;
  capabilityDigest?: string;
};

export type EnterpriseCodexPluginRuntimeMutationResult = {
  item?: EnterpriseCodexPluginCatalogItem;
  installedPluginId?: string | null;
  restartRequired?: boolean;
  authRequired?: boolean;
  safeErrorCode?: string | null;
  appsNeedingAuth?: EnterpriseCodexPluginAuthApp[];
  connectUrls?: string[];
  ready?: boolean;
};

/**
 * Narrow boundary consumed by Enterprise HTTP. Codex owns discovery, auth,
 * and app-server installation; Enterprise only supplies the exact account and
 * agent scope plus the reviewed identity.
 */
export type EnterpriseCodexPluginRuntime = {
  list: (params: {
    config: OpenClawConfig;
    accountId: string;
    runtimeAgentId: string;
    agentDir?: string;
    workspaceDir?: string;
    query?: string;
  }) => Promise<EnterpriseCodexPluginRuntimeCatalog>;
  detail: (params: {
    config: OpenClawConfig;
    accountId: string;
    runtimeAgentId: string;
    pluginName: string;
    marketplaceName: string;
    remotePluginId?: string | null;
    agentDir?: string;
    workspaceDir?: string;
  }) => Promise<EnterpriseCodexPluginRuntimeDetail>;
  install: (params: {
    config: OpenClawConfig;
    accountId: string;
    runtimeAgentId: string;
    pluginName: string;
    marketplaceName: string;
    remotePluginId?: string | null;
    agentDir?: string;
    workspaceDir?: string;
  }) => Promise<EnterpriseCodexPluginRuntimeMutationResult>;
  authStatus?: (params: {
    config: OpenClawConfig;
    accountId: string;
    runtimeAgentId: string;
    pluginName: string;
    marketplaceName: string;
    remotePluginId?: string | null;
    agentDir?: string;
    workspaceDir?: string;
    /** False reads Codex's committed connector snapshot; true refreshes it. */
    forceRefresh?: boolean;
  }) => Promise<EnterpriseCodexPluginAuthState>;
  /** Starts OAuth only for an MCP server owned by this exact plugin grant. */
  beginMcpOAuthLogin?: (
    serverName: string,
    options?: {
      expectedPluginId?: string;
      threadId?: string;
      clientRegistration?: "auto" | "cimd" | "dcr";
      scopes?: string[];
      timeoutSecs?: number;
    },
  ) => Promise<EnterpriseCodexPluginMcpOAuthResult & { name: string }>;
  refresh?: (params: {
    config: OpenClawConfig;
    accountId: string;
    runtimeAgentId: string;
    pluginName: string;
    marketplaceName: string;
  }) => Promise<EnterpriseCodexPluginRuntimeMutationResult>;
};
