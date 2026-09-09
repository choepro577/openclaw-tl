import { stableStringify } from "@openclaw/normalization-core/stable-stringify";
import { resolveAgentDir, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { sha256Hex } from "../../infra/crypto-digest.js";
import { loadBundledPluginPublicArtifactModuleSync } from "../../plugins/public-surface-loader.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  projectEnterpriseRuntimeConfig,
  resolveEnterpriseAllowedAgentIds,
} from "../isolation/enterprise-gateway-policy.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";
import {
  CODEX_CURATED_MARKETPLACE,
  createEnterpriseCodexPluginRequest,
  getEnterpriseCodexPluginGrant,
  getEnterpriseCodexPluginRequest,
  listEnterpriseAccountCodexPluginGrants,
  listEnterpriseCodexPluginRequests,
  normalizeEnterpriseCodexPluginIdentity,
  refreshEnterpriseCodexPluginGrantAuth,
  transitionEnterpriseCodexPluginGrant,
  transitionEnterpriseCodexPluginRequest,
  upsertEnterpriseCodexPluginGrant,
} from "./codex-plugin-store.js";
import type {
  EnterpriseCodexPluginAuthApp,
  EnterpriseCodexPluginAuthState,
  EnterpriseCodexPluginApp,
  EnterpriseCodexPluginAppTemplate,
  EnterpriseCodexPluginCatalogItem,
  EnterpriseCodexPluginGrant,
  EnterpriseCodexPluginGrantState,
  EnterpriseCodexPluginHook,
  EnterpriseCodexPluginIdentity,
  EnterpriseCodexPluginInterface,
  EnterpriseCodexPluginMetadata,
  EnterpriseCodexPluginRequest,
  EnterpriseCodexPluginRuntime,
  EnterpriseCodexPluginRuntimeCatalog,
  EnterpriseCodexPluginRuntimeDetail,
  EnterpriseCodexPluginRuntimeMutationResult,
  EnterpriseCodexPluginSkill,
} from "./codex-plugin-types.js";
import { listCodexPublicCatalog, type CodexPublicCatalogItem } from "./codex-public-catalog.js";

/** Safe, machine-readable error returned by the Codex Enterprise lifecycle. */
export class EnterpriseCodexPluginError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message = code,
  ) {
    super(message);
    this.name = "EnterpriseCodexPluginError";
  }
}

export type EnterpriseCodexRuntimeScope = {
  config: OpenClawConfig;
  projectedConfig: OpenClawConfig;
  account: EnterpriseAccount;
  agentKey: AgentKey;
  runtimeAgentId: string;
  agentDir: string;
  workspaceDir: string;
};

export type EnterpriseCodexPluginRuntimeResolver = (
  scope: EnterpriseCodexRuntimeScope,
) => Promise<EnterpriseCodexPluginRuntime | undefined> | EnterpriseCodexPluginRuntime | undefined;

export type EnterpriseCodexPluginServiceContext = {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  agentKey: AgentKey;
  runtime?: EnterpriseCodexPluginRuntime;
  resolveRuntime?: EnterpriseCodexPluginRuntimeResolver;
  options?: OpenClawStateDatabaseOptions;
};

export type EnterpriseCodexPluginCatalogResponse = {
  items: EnterpriseCodexPluginCatalogItem[];
  installed: EnterpriseCodexPluginGrant[];
  requests: EnterpriseCodexPluginRequest[];
  warnings?: string[];
};

export type EnterpriseCodexPluginDetailResponse = {
  item: EnterpriseCodexPluginCatalogItem;
  metadata?: EnterpriseCodexPluginMetadata;
  auth?: EnterpriseCodexPluginAuthState;
  authRequired?: boolean;
  appsNeedingAuth?: EnterpriseCodexPluginAuthApp[];
  connectUrls?: string[];
  ready?: boolean;
  capabilitySnapshot: Record<string, unknown>;
  capabilityDigest: string;
};

export type EnterpriseCodexPluginApprovalResponse = {
  request: EnterpriseCodexPluginRequest;
  grant: EnterpriseCodexPluginGrant;
  authRequired: boolean;
  appsNeedingAuth: EnterpriseCodexPluginAuthApp[];
  connectUrls: string[];
  restartRequired: boolean;
};

type RuntimeFacade = {
  listCatalog: (params?: { workspaceDir?: string; forceRefetch?: boolean }) => Promise<{
    plugins: readonly RuntimePlugin[];
    warnings: readonly string[];
  }>;
  readPlugin: (reference: RuntimeReference) => Promise<unknown>;
  installPlugin: (
    reference: RuntimeReference,
    options?: { installAttemptId?: string; refresh?: boolean },
  ) => Promise<unknown>;
  readAuthStatus?: (
    reference: RuntimeReference,
    options?: { forceRefresh?: boolean },
  ) => Promise<unknown>;
  beginMcpOAuthLogin?: (
    serverName: string,
    options?: {
      expectedPluginId?: string;
      threadId?: string;
      clientRegistration?: "auto" | "cimd" | "dcr";
      scopes?: string[];
      timeoutSecs?: number;
    },
  ) => Promise<unknown>;
  uninstallPlugin?: (pluginId: string) => Promise<void>;
  buildCodexPluginCapabilitySnapshot?: (detail: unknown) => RecordValue;
  computeCodexPluginCapabilityDigest?: (detail: unknown) => string;
};

type RuntimeFactory = (options: {
  pluginConfig?: unknown;
  config?: OpenClawConfig;
  agentDir: string;
  workspaceDir?: string;
  accountId?: string;
}) => RuntimeFacade;

type RuntimeReference = {
  id: string;
  pluginName: string;
  marketplaceName: string;
  marketplacePath?: string;
  remotePluginId?: string | null;
};

type RuntimePlugin = {
  id?: string;
  pluginName?: string;
  marketplaceName?: string;
  name?: string;
  description?: string;
  category?: string;
  installed?: boolean;
  enabled?: boolean;
  available?: boolean;
  installPolicy?: string;
  authPolicy?: string;
  remotePluginId?: string;
  marketplacePath?: string;
  summaryId?: string;
};

type RecordValue = Record<string, unknown>;

let runtimeFactory: RuntimeFactory | null | undefined;
let capabilitySnapshotFactory: RuntimeFacade["buildCodexPluginCapabilitySnapshot"] | undefined;
let capabilityDigestFactory: RuntimeFacade["computeCodexPluginCapabilityDigest"] | undefined;

function record(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function bounded(value: unknown, max = 2_048): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function bool(value: unknown): boolean {
  return value === true;
}

function validHttpUrl(value: unknown): string | null {
  const raw = bounded(value, 2_048);
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function boundedStringArray(value: unknown, maxItems = 128, maxLength = 2_048): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, maxItems).flatMap((entry) => {
    const text = bounded(entry, maxLength);
    return text ? [text] : [];
  });
}

/**
 * Maps Codex's PluginInterface without leaking local package paths. The v2
 * protocol exposes URL fields separately from local asset paths; only the
 * former are safe for an Enterprise portal to render.
 */
function pluginInterfaceFromValue(value: unknown): EnterpriseCodexPluginInterface | null {
  const row = record(value);
  if (!row) {
    return null;
  }
  const prompts = Array.isArray(row.defaultPrompt)
    ? boundedStringArray(row.defaultPrompt, 3, 4_096)
    : typeof row.defaultPrompt === "string"
      ? boundedStringArray([row.defaultPrompt], 1, 4_096)
      : [];
  const interfaceValue: EnterpriseCodexPluginInterface = {
    displayName: bounded(row.displayName, 256) ?? null,
    shortDescription: bounded(row.shortDescription, 4_096) ?? null,
    longDescription: bounded(row.longDescription, 10_000) ?? null,
    developerName: bounded(row.developerName, 256) ?? null,
    category: bounded(row.category, 256) ?? null,
    capabilities: boundedStringArray(row.capabilities, 64, 256),
    websiteUrl: validHttpUrl(row.websiteUrl),
    privacyPolicyUrl: validHttpUrl(row.privacyPolicyUrl),
    termsOfServiceUrl: validHttpUrl(row.termsOfServiceUrl),
    defaultPrompts: prompts,
    brandColor: bounded(row.brandColor, 128) ?? null,
    composerIconUrl: validHttpUrl(row.composerIconUrl),
    logoUrl: validHttpUrl(row.logoUrl),
    logoDarkUrl: validHttpUrl(row.logoUrlDark),
    screenshotUrls: boundedStringArray(row.screenshotUrls, 32, 2_048).flatMap((url) => {
      const safe = validHttpUrl(url);
      return safe ? [safe] : [];
    }),
  };
  return interfaceValue;
}

function skillInterfaceFromValue(value: unknown): EnterpriseCodexPluginSkill["interface"] {
  const row = record(value);
  if (!row) {
    return null;
  }
  return {
    displayName: bounded(row.displayName, 256) ?? null,
    shortDescription: bounded(row.shortDescription, 4_096) ?? null,
    iconSmallUrl: validHttpUrl(row.iconSmallUrl),
    iconLargeUrl: validHttpUrl(row.iconLargeUrl),
    brandColor: bounded(row.brandColor, 128) ?? null,
    defaultPrompt: bounded(row.defaultPrompt, 256) ?? null,
  };
}

function pluginSkillsFromValue(value: unknown): EnterpriseCodexPluginSkill[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 256).flatMap((entry) => {
    const row = record(entry);
    const name = bounded(row?.name, 256);
    if (!name) {
      return [];
    }
    return [
      {
        name,
        description: bounded(row?.description, 10_000) ?? "",
        shortDescription: bounded(row?.shortDescription, 4_096) ?? null,
        interface: skillInterfaceFromValue(row?.interface),
        enabled: row?.enabled === true,
      } satisfies EnterpriseCodexPluginSkill,
    ];
  });
}

function pluginHooksFromValue(value: unknown): EnterpriseCodexPluginHook[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 256).flatMap((entry) => {
    const row = record(entry);
    const key = bounded(row?.key, 256);
    const eventName = bounded(row?.eventName, 256);
    return key && eventName ? [{ key, eventName }] : [];
  });
}

function pluginAppsFromValue(value: unknown): EnterpriseCodexPluginApp[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 256).flatMap((entry) => {
    const row = record(entry);
    const id = bounded(row?.id, 256);
    const name = bounded(row?.name, 256);
    if (!id || !name) {
      return [];
    }
    return [
      {
        id,
        name,
        description: bounded(row?.description, 4_096) ?? null,
        category: bounded(row?.category, 256) ?? null,
        installUrl: validHttpUrl(row?.installUrl),
      } satisfies EnterpriseCodexPluginApp,
    ];
  });
}

function pluginAppTemplatesFromValue(value: unknown): EnterpriseCodexPluginAppTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 256).flatMap((entry) => {
    const row = record(entry);
    const templateId = bounded(row?.templateId, 256);
    const name = bounded(row?.name, 256);
    if (!templateId || !name) {
      return [];
    }
    return [
      {
        templateId,
        name,
        description: bounded(row?.description, 4_096) ?? null,
        category: bounded(row?.category, 256) ?? null,
        canonicalConnectorId: bounded(row?.canonicalConnectorId, 256) ?? null,
        logoUrl: validHttpUrl(row?.logoUrl),
        logoDarkUrl: validHttpUrl(row?.logoUrlDark),
        materializedAppIds: boundedStringArray(row?.materializedAppIds, 256, 256),
        reason: bounded(row?.reason, 256) ?? null,
      } satisfies EnterpriseCodexPluginAppTemplate,
    ];
  });
}

function pluginScheduledTasksFromValue(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 128).flatMap((entry) => {
    const row = record(entry);
    const key = bounded(row?.key, 256);
    const name = bounded(row?.name, 256);
    const prompt = bounded(row?.prompt, 4_096);
    const schedule = record(row?.schedule);
    if (!key || !name || !prompt || !schedule) {
      return [];
    }
    return [{ key, name, prompt, schedule: sanitizeCapabilityValue(schedule) ?? {} }];
  });
}

function pluginMetadataFromDetail(value: unknown): EnterpriseCodexPluginMetadata {
  const detail = record(value);
  const summary = record(detail?.summary);
  return {
    version: bounded(summary?.version, 128) ?? null,
    localVersion: bounded(summary?.localVersion, 128) ?? null,
    interface: pluginInterfaceFromValue(summary?.interface),
    shareUrl: validHttpUrl(detail?.shareUrl),
    description: bounded(detail?.description, 10_000) ?? null,
    skills: pluginSkillsFromValue(detail?.skills),
    hooks: pluginHooksFromValue(detail?.hooks),
    apps: pluginAppsFromValue(detail?.apps),
    appTemplates: pluginAppTemplatesFromValue(detail?.appTemplates),
    mcpServers: boundedStringArray(detail?.mcpServers, 128, 256),
    scheduledTasks: pluginScheduledTasksFromValue(detail?.scheduledTasks),
  };
}

function normalizeMarketplaceName(value: string | undefined): string | undefined {
  return value;
}

function parsePluginId(value: string): { pluginName: string; marketplaceName: string } | undefined {
  const separator = value.lastIndexOf("@");
  if (separator <= 0 || separator >= value.length - 1) {
    return undefined;
  }
  try {
    return normalizeEnterpriseCodexPluginIdentity({
      pluginName: value.slice(0, separator),
      marketplaceName: value.slice(separator + 1),
    });
  } catch {
    return undefined;
  }
}

function identityFromPlugin(plugin: RuntimePlugin): EnterpriseCodexPluginIdentity | undefined {
  const parsed = plugin.id ? parsePluginId(plugin.id) : undefined;
  const pluginName = bounded(plugin.pluginName, 128) ?? parsed?.pluginName;
  const marketplaceName = normalizeMarketplaceName(
    bounded(plugin.marketplaceName, 128) ?? parsed?.marketplaceName,
  );
  if (!pluginName || !marketplaceName) {
    return undefined;
  }
  try {
    return normalizeEnterpriseCodexPluginIdentity({
      pluginName,
      marketplaceName,
      remotePluginId: plugin.remotePluginId,
    });
  } catch {
    return undefined;
  }
}

function catalogItemFromRuntime(
  plugin: RuntimePlugin,
): EnterpriseCodexPluginCatalogItem | undefined {
  const identity = identityFromPlugin(plugin);
  if (!identity) {
    return undefined;
  }
  const id = `${identity.pluginName}@${identity.marketplaceName}`;
  return {
    ...identity,
    id,
    name: bounded(plugin.name, 256) ?? identity.pluginName,
    description: bounded(plugin.description, 4_096) ?? "",
    ...(bounded(plugin.category, 256) ? { category: bounded(plugin.category, 256) } : {}),
    installed: bool(plugin.installed),
    enabled: bool(plugin.enabled),
    available: plugin.available !== false,
    installPolicy: bounded(plugin.installPolicy, 128) ?? null,
    authPolicy: bounded(plugin.authPolicy, 128) ?? null,
    requestState: null,
    grantState: null,
  };
}

function catalogItemFromPublic(item: CodexPublicCatalogItem): EnterpriseCodexPluginCatalogItem {
  const parsed = parsePluginId(`${item.id}@${CODEX_CURATED_MARKETPLACE}`)!;
  return {
    ...parsed,
    id: `${parsed.pluginName}@${parsed.marketplaceName}`,
    name: item.name.slice(0, 256),
    description: item.description.slice(0, 4_096),
    ...(item.category?.trim() ? { category: item.category.trim().slice(0, 256) } : {}),
    installed: false,
    enabled: false,
    available: true,
    installPolicy: null,
    authPolicy: null,
    requestState: null,
    grantState: null,
  };
}

function metadataFromPublicCatalogItem(
  item: CodexPublicCatalogItem,
): EnterpriseCodexPluginMetadata {
  return {
    version: item.version ?? null,
    localVersion: null,
    interface: item.interface
      ? {
          ...item.interface,
          category: item.interface.category ?? item.category ?? null,
        }
      : null,
    shareUrl: null,
    description: item.description.slice(0, 10_000),
    skills: [],
    hooks: [],
    apps: [],
    appTemplates: [],
    mcpServers: [],
    scheduledTasks: [],
  };
}

function snapshotFromCatalog(item: EnterpriseCodexPluginCatalogItem): RecordValue {
  return {
    identity: {
      pluginName: item.pluginName,
      marketplaceName: item.marketplaceName,
      ...(item.remotePluginId ? { remotePluginId: item.remotePluginId } : {}),
    },
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category ?? null,
    available: item.available,
    installPolicy: item.installPolicy,
    authPolicy: item.authPolicy,
  };
}

function snapshotFromDetail(value: unknown, item: EnterpriseCodexPluginCatalogItem): RecordValue {
  const detail = record(value);
  const summary = record(detail?.summary);
  const metadata = pluginMetadataFromDetail(value);
  const apps = Array.isArray(detail?.apps)
    ? detail.apps.flatMap((app) => {
        const row = record(app);
        const id = bounded(row?.id, 256);
        const name = bounded(row?.name, 256);
        if (!id || !name) {
          return [];
        }
        return [
          {
            id,
            name,
            description: bounded(row?.description, 2_048) ?? null,
            category: bounded(row?.category, 256) ?? null,
            installUrl: validHttpUrl(row?.installUrl),
          },
        ];
      })
    : [];
  return {
    catalog: snapshotFromCatalog(item),
    metadata,
    summary: summary
      ? {
          id: bounded(summary.id, 256) ?? item.id,
          name: bounded(summary.name, 256) ?? item.name,
          version: bounded(summary.version, 128) ?? null,
          localVersion: bounded(summary.localVersion, 128) ?? null,
          remotePluginId: bounded(summary.remotePluginId, 256) ?? item.remotePluginId ?? null,
          installPolicy: bounded(summary.installPolicy, 128) ?? null,
          authPolicy: bounded(summary.authPolicy, 128) ?? null,
          availability: bounded(summary.availability, 128) ?? null,
        }
      : null,
    marketplaceName: bounded(detail?.marketplaceName, 128) ?? item.marketplaceName,
    marketplacePath: bounded(detail?.marketplacePath, 2_048) ?? null,
    apps,
    mcpServers: Array.isArray(detail?.mcpServers)
      ? detail.mcpServers
          .filter((entry): entry is string => typeof entry === "string")
          .slice(0, 128)
      : [],
    skillCount: Array.isArray(detail?.skills) ? detail.skills.length : 0,
    hookCount: Array.isArray(detail?.hooks) ? detail.hooks.length : 0,
  };
}

function digest(identity: EnterpriseCodexPluginIdentity, snapshot: RecordValue): string {
  return `sha256:${sha256Hex(stableStringify({ identity, snapshot }))}`;
}

type EnterpriseCodexPluginConnectedAccount = NonNullable<
  EnterpriseCodexPluginAuthApp["accounts"]
>[number];

function connectedAccounts(value: unknown): EnterpriseCodexPluginConnectedAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 64).flatMap((entry) => {
    const row = record(entry);
    const id = bounded(row?.id, 256);
    const name = bounded(row?.name, 256) ?? bounded(row?.email, 512) ?? "Account";
    if (!id) {
      return [];
    }
    return [
      {
        id,
        name,
        email: bounded(row?.email, 512) ?? null,
        avatarUrl: validHttpUrl(row?.avatarUrl),
        authStatus: bounded(row?.authStatus, 128) ?? "unknown",
        authType: bounded(row?.authType, 128) ?? "unknown",
      } satisfies EnterpriseCodexPluginConnectedAccount,
    ];
  });
}

function authApps(value: unknown): EnterpriseCodexPluginAuthApp[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const row = record(entry);
    const id = bounded(row?.id, 256);
    const name = bounded(row?.name, 256);
    if (!id || !name) {
      return [];
    }
    return [
      {
        id,
        name,
        description: bounded(row?.description, 4_096) ?? null,
        logoUrl: validHttpUrl(row?.logoUrl),
        logoDarkUrl: validHttpUrl(row?.logoDarkUrl),
        ...(typeof row?.accessible === "boolean" ? { accessible: row.accessible } : {}),
        ...(typeof row?.enabled === "boolean" ? { enabled: row.enabled } : {}),
        ...(typeof row?.callable === "boolean" ? { callable: row.callable } : {}),
        ...(typeof row?.needsAuth === "boolean" ? { needsAuth: row.needsAuth } : {}),
        ...(typeof row?.metadataAvailable === "boolean"
          ? { metadataAvailable: row.metadataAvailable }
          : {}),
        ...(row?.runtimeState === "available" ||
        row?.runtimeState === "missing" ||
        row?.runtimeState === "unavailable"
          ? { runtimeState: row.runtimeState }
          : {}),
        installUrl: validHttpUrl(row?.installUrl),
        ...(Array.isArray(row?.accounts) ? { accounts: connectedAccounts(row.accounts) } : {}),
        ...(row?.accountsStatus === "available" || row?.accountsStatus === "unavailable"
          ? { accountsStatus: row.accountsStatus }
          : {}),
        ...(Object.hasOwn(row ?? {}, "addAccountUrl")
          ? { addAccountUrl: validHttpUrl(row?.addAccountUrl) }
          : {}),
      },
    ];
  });
}

function authState(value: unknown): EnterpriseCodexPluginAuthState {
  const row = record(value);
  const allRawApps = Array.isArray(row?.apps) ? row.apps : undefined;
  const rawApps = allRawApps ?? (Array.isArray(row?.appsNeedingAuth) ? row.appsNeedingAuth : []);
  const apps = authApps(rawApps);
  const appsNeedingAuth = apps.filter((_app, index) => {
    const source = record(rawApps[index]);
    return source?.needsAuth === undefined || source.needsAuth === true;
  });
  const explicitConnectUrls = Array.isArray(row?.connectUrls)
    ? row.connectUrls.flatMap((url) => {
        const safe = validHttpUrl(url);
        return safe ? [safe] : [];
      })
    : [];
  const connectUrls = [
    ...new Set([
      ...explicitConnectUrls,
      ...appsNeedingAuth.flatMap((app) => (app.installUrl ? [app.installUrl] : [])),
    ]),
  ];
  const mcpServers = Array.isArray(row?.mcpServers)
    ? row.mcpServers.flatMap((entry) => {
        const mcp = record(entry);
        const name = bounded(mcp?.name, 256);
        if (!name) {
          return [];
        }
        return [
          {
            name,
            pluginId: bounded(mcp?.pluginId, 256) ?? null,
            authStatus: bounded(mcp?.authStatus, 128) ?? "unknown",
            runtimeStatus: bounded(mcp?.runtimeStatus, 128) ?? null,
            needsAuth: mcp?.needsAuth === true,
            ready: mcp?.ready === true,
          },
        ];
      })
    : undefined;
  const authRequired =
    bool(row?.needsAuth) ||
    bool(row?.authRequired) ||
    appsNeedingAuth.length > 0 ||
    Boolean(mcpServers?.some((server) => server.needsAuth));
  const statusErrors = Array.isArray(row?.statusErrors)
    ? row.statusErrors.filter(
        (entry): entry is "metadata_unavailable" | "runtime_unavailable" | "mcp_unavailable" =>
          entry === "metadata_unavailable" ||
          entry === "runtime_unavailable" ||
          entry === "mcp_unavailable",
      )
    : [];
  const statusError =
    row?.statusError === "metadata_unavailable" ||
    row?.statusError === "runtime_unavailable" ||
    row?.statusError === "mcp_unavailable"
      ? row.statusError
      : statusErrors[0];
  return {
    authRequired,
    appsNeedingAuth,
    ...(allRawApps ? { apps } : {}),
    ...(mcpServers ? { mcpServers } : {}),
    connectUrls,
    // An absent readiness bit is an unverified state. A successful install
    // still needs the facade's explicit auth-status read before we report it
    // ready to the portal.
    ready: row?.ready === true,
    ...(statusError ? { statusError } : {}),
    ...(statusErrors.length > 0 ? { statusErrors } : {}),
  };
}

function safeErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (
    normalized.includes("not found") ||
    normalized.includes("was not found") ||
    message.includes("NOT_FOUND")
  ) {
    return "CODEX_PLUGIN_NOT_FOUND";
  }
  if (
    normalized.includes("unavailable") ||
    message.includes("UNAVAILABLE") ||
    message.includes("NOT_AVAILABLE")
  ) {
    return "CODEX_PLUGIN_UNAVAILABLE";
  }
  if (normalized.includes("auth") || normalized.includes("login")) {
    return "CODEX_AUTH_REQUIRED";
  }
  return "CODEX_INSTALL_FAILED";
}

function isCuratedMarketplace(value: string): boolean {
  return new Set(["openai-curated", "openai-curated-remote", "openai-api-curated"]).has(value);
}

function toRuntimeDetail(
  value: unknown,
  requested: EnterpriseCodexPluginIdentity,
): EnterpriseCodexPluginRuntimeDetail {
  const detail = record(value);
  const summary = record(detail?.summary);
  const identity = normalizeEnterpriseCodexPluginIdentity({
    pluginName: requested.pluginName,
    marketplaceName: normalizeMarketplaceName(
      bounded(detail?.marketplaceName, 128) ?? requested.marketplaceName,
    ),
    remotePluginId: bounded(summary?.remotePluginId, 256) ?? requested.remotePluginId ?? null,
  });
  const item: EnterpriseCodexPluginCatalogItem = {
    ...identity,
    id: `${identity.pluginName}@${identity.marketplaceName}`,
    name: bounded(summary?.name, 256) ?? identity.pluginName,
    description: bounded(detail?.description, 4_096) ?? "",
    installed: bool(summary?.installed),
    enabled: bool(summary?.enabled),
    available:
      bounded(summary?.availability, 128) !== "DISABLED_BY_ADMIN" &&
      bounded(summary?.installPolicy, 128) !== "NOT_AVAILABLE",
    installPolicy: bounded(summary?.installPolicy, 128) ?? null,
    authPolicy: bounded(summary?.authPolicy, 128) ?? null,
    requestState: null,
    grantState: null,
  };
  let capabilitySnapshot: RecordValue | undefined;
  let capabilityDigest: string | undefined;
  try {
    capabilitySnapshot = capabilitySnapshotFactory?.(value);
    capabilityDigest = capabilityDigestFactory?.(value);
  } catch {
    // An older or incompatible Codex facade must not make the plugin detail
    // endpoint fail after it has already returned a valid detail object.
  }
  capabilitySnapshot ??= snapshotFromDetail(value, item);
  capabilityDigest ??= digest(identity, capabilitySnapshot);
  const metadata = pluginMetadataFromDetail(value);
  const authValue = record(detail?.auth);
  return {
    item,
    metadata,
    ...(authValue ? { auth: authState(authValue) } : {}),
    capabilitySnapshot,
    capabilityDigest,
  };
}

function mapMutation(
  value: unknown,
  item: EnterpriseCodexPluginCatalogItem,
): EnterpriseCodexPluginRuntimeMutationResult {
  const row = record(value);
  const response = record(row?.response);
  const plugin = record(row?.plugin);
  const installId = bounded(plugin?.id, 256) ?? bounded(plugin?.summaryId, 256) ?? item.id;
  const needingAuth = authApps(response?.appsNeedingAuth);
  const auth = authState({
    authRequired: needingAuth.length > 0,
    appsNeedingAuth: needingAuth,
    ready: record(response)?.ready === true,
  });
  return {
    item,
    installedPluginId: installId,
    restartRequired: row?.restartRequired === true,
    authRequired: auth.authRequired,
    appsNeedingAuth: auth.appsNeedingAuth,
    connectUrls: auth.connectUrls,
    ready: auth.ready,
  };
}

function installedIdentityMatches(
  installedPluginId: string,
  identity: EnterpriseCodexPluginIdentity,
): boolean {
  if (
    installedPluginId === identity.remotePluginId ||
    installedPluginId === `${identity.pluginName}@${identity.marketplaceName}`
  ) {
    return true;
  }
  const parsed = parsePluginId(installedPluginId);
  return Boolean(
    parsed &&
    parsed.pluginName === identity.pluginName &&
    parsed.marketplaceName === identity.marketplaceName,
  );
}

function mcpServerNamesFromSnapshot(value: unknown): string[] {
  const snapshot = record(value);
  if (!Array.isArray(snapshot?.mcpServers)) {
    return [];
  }
  return snapshot.mcpServers.flatMap((entry) => {
    const name = typeof entry === "string" ? entry : bounded(record(entry)?.name, 256);
    return name ? [name] : [];
  });
}

function mcpServerNamesFromDetail(detail: EnterpriseCodexPluginRuntimeDetail): string[] {
  return [
    ...new Set([
      ...mcpServerNamesFromSnapshot(detail.capabilitySnapshot),
      ...(detail.metadata?.mcpServers ?? []),
    ]),
  ];
}

function pluginIdentityMatches(
  expected: EnterpriseCodexPluginIdentity,
  actual: EnterpriseCodexPluginIdentity,
): boolean {
  return (
    expected.pluginName === actual.pluginName &&
    expected.marketplaceName === actual.marketplaceName &&
    (!expected.remotePluginId ||
      !actual.remotePluginId ||
      expected.remotePluginId === actual.remotePluginId)
  );
}

function requireActiveCodexGrant(input: {
  grant: EnterpriseCodexPluginGrant | undefined;
  accountId: string;
  runtimeAgentId: string;
  baseRevision: number;
}): EnterpriseCodexPluginGrant {
  const { grant } = input;
  if (
    !grant ||
    grant.accountId !== input.accountId ||
    grant.runtimeAgentId !== input.runtimeAgentId
  ) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_FOUND", 404);
  }
  if (grant.revision !== input.baseRevision) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
  }
  if (grant.state !== "active") {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_ACTIVE", 409);
  }
  if (!grant.installedPluginId || !installedIdentityMatches(grant.installedPluginId, grant)) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_INSTALL_IDENTITY_MISMATCH", 409);
  }
  return grant;
}

function requireCurrentCodexGrant(input: {
  grant: EnterpriseCodexPluginGrant;
  accountId: string;
  runtimeAgentId: string;
  baseRevision: number;
  options?: OpenClawStateDatabaseOptions;
}): EnterpriseCodexPluginGrant {
  const current = requireActiveCodexGrant({
    grant: getEnterpriseCodexPluginGrant(input.grant.id, input.options),
    accountId: input.accountId,
    runtimeAgentId: input.runtimeAgentId,
    baseRevision: input.baseRevision,
  });
  if (
    current.pluginName !== input.grant.pluginName ||
    current.marketplaceName !== input.grant.marketplaceName ||
    current.installedPluginId !== input.grant.installedPluginId ||
    current.capabilityDigest !== input.grant.capabilityDigest
  ) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
  }
  return current;
}

function runtimeDetailDigest(detail: EnterpriseCodexPluginRuntimeDetail): string {
  return (
    detail.capabilityDigest ??
    digest(detail.item, detail.capabilitySnapshot ?? snapshotFromCatalog(detail.item))
  );
}

function requireOwnedMcpServer(
  grant: EnterpriseCodexPluginGrant,
  detail: EnterpriseCodexPluginRuntimeDetail,
  serverName: string,
): void {
  if (!mcpServerNamesFromSnapshot(grant.capabilitySnapshot).includes(serverName)) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_NOT_GRANTED", 403);
  }
  if (!pluginIdentityMatches(grant, detail.item)) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_INSTALL_IDENTITY_MISMATCH", 409);
  }
  if (runtimeDetailDigest(detail) !== grant.capabilityDigest) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_CAPABILITY_CHANGED", 409);
  }
  if (!mcpServerNamesFromDetail(detail).includes(serverName)) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_NOT_GRANTED", 403);
  }
  if (!detail.item.available || !detail.item.installed || !detail.item.enabled) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_UNAVAILABLE", 409);
  }
}

function defaultRuntimeResolver(scope: EnterpriseCodexRuntimeScope): EnterpriseCodexPluginRuntime {
  if (runtimeFactory === undefined) {
    runtimeFactory = null;
    for (const artifactBasename of ["runtime-api.js", "api.js"]) {
      try {
        const loaded = loadBundledPluginPublicArtifactModuleSync<{
          createCodexEnterprisePluginRuntime?: RuntimeFactory;
          buildCodexPluginCapabilitySnapshot?: (detail: unknown) => RecordValue;
          computeCodexPluginCapabilityDigest?: (detail: unknown) => string;
        }>({ dirName: "codex", artifactBasename });
        if (typeof loaded.createCodexEnterprisePluginRuntime === "function") {
          runtimeFactory = loaded.createCodexEnterprisePluginRuntime;
          capabilitySnapshotFactory = loaded.buildCodexPluginCapabilitySnapshot;
          capabilityDigestFactory = loaded.computeCodexPluginCapabilityDigest;
          break;
        }
      } catch (error) {
        if (artifactBasename === "api.js") {
          throw error;
        }
      }
    }
  }
  if (!runtimeFactory) {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }
  const facade = runtimeFactory({
    config: scope.projectedConfig,
    pluginConfig: scope.projectedConfig.plugins?.entries?.codex?.config,
    agentDir: scope.agentDir,
    workspaceDir: scope.workspaceDir,
    accountId: scope.account.id,
  });
  const resolveFacadeReference = async (
    identity: EnterpriseCodexPluginIdentity,
  ): Promise<RuntimeReference> => {
    try {
      const discovered = await facade.listCatalog({
        workspaceDir: scope.workspaceDir,
        forceRefetch: false,
      });
      const plugin = discovered.plugins.find((candidate) => {
        const candidateName = candidate.pluginName ?? candidate.id?.split("@")[0];
        const candidateMarketplace = candidate.marketplaceName ?? candidate.id?.split("@").at(-1);
        return (
          candidateName === identity.pluginName && candidateMarketplace === identity.marketplaceName
        );
      });
      if (plugin) {
        const marketplaceName = plugin.marketplaceName ?? identity.marketplaceName;
        return {
          id: `${identity.pluginName}@${marketplaceName}`,
          pluginName: identity.pluginName,
          marketplaceName,
          ...(plugin.marketplacePath ? { marketplacePath: plugin.marketplacePath } : {}),
          ...(plugin.remotePluginId
            ? { remotePluginId: plugin.remotePluginId }
            : identity.remotePluginId
              ? { remotePluginId: identity.remotePluginId }
              : {}),
        };
      }
    } catch {
      // Let the facade issue the final bounded runtime error below.
    }
    throw new Error("CODEX_PLUGIN_NOT_FOUND");
  };
  return {
    list: async (params) => {
      const result = await facade.listCatalog({
        workspaceDir: params.workspaceDir,
        // The public facade keeps a request-scoped cache. Refetching the full
        // local + remote catalog for every portal render can block a request
        // for several minutes when one supplemental marketplace is slow.
        forceRefetch: false,
      });
      const items = result.plugins.flatMap((plugin) => {
        const item = catalogItemFromRuntime(plugin);
        return item ? [item] : [];
      });
      return { items, warnings: [...result.warnings] };
    },
    detail: async (params) => {
      const detail = await facade.readPlugin(
        await resolveFacadeReference({
          pluginName: params.pluginName,
          marketplaceName: params.marketplaceName,
          remotePluginId: params.remotePluginId,
        }),
      );
      return toRuntimeDetail(detail, params);
    },
    install: async (params) => {
      const result = await facade.installPlugin(
        await resolveFacadeReference({
          pluginName: params.pluginName,
          marketplaceName: params.marketplaceName,
          remotePluginId: params.remotePluginId,
        }),
        // Installation already verifies plugin/installed. Approval performs a
        // focused auth check below; unrelated skills/hooks refresh RPCs must not
        // delay granting access to an otherwise ready plugin.
        { refresh: false },
      );
      const plugin = record(result)?.plugin;
      const item =
        catalogItemFromRuntime(plugin ?? {}) ??
        ({
          ...params,
          id: `${params.pluginName}@${params.marketplaceName}`,
          name: params.pluginName,
          description: "",
          installed: true,
          enabled: true,
          available: true,
          installPolicy: null,
          authPolicy: null,
          requestState: null,
          grantState: null,
        } satisfies EnterpriseCodexPluginCatalogItem);
      return mapMutation(result, item);
    },
    authStatus: facade.readAuthStatus
      ? async (params) =>
          authState(
            await facade.readAuthStatus!(
              await resolveFacadeReference({
                pluginName: params.pluginName,
                marketplaceName: params.marketplaceName,
                remotePluginId: params.remotePluginId,
              }),
              { forceRefresh: params.forceRefresh !== false },
            ),
          )
      : undefined,
    beginMcpOAuthLogin: facade.beginMcpOAuthLogin
      ? async (serverName, options) => {
          const value = record(await facade.beginMcpOAuthLogin!(serverName, options));
          const authorizationUrl = bounded(value?.authorizationUrl, 2_048);
          if (!authorizationUrl) {
            throw new Error("CODEX_MCP_OAUTH_URL_MISSING");
          }
          return {
            name: bounded(value?.name, 256) ?? serverName,
            authorizationUrl,
          };
        }
      : undefined,
    refresh: async () => ({}),
  };
}

function scope(context: EnterpriseCodexPluginServiceContext): EnterpriseCodexRuntimeScope {
  // The principal is a request snapshot. Re-read the account before every
  // Codex operation so an admin disable takes effect while a portal is open.
  const account = getEnterpriseAccountById(context.account.id, context.options);
  if (!account) {
    throw new EnterpriseCodexPluginError("ACCOUNT_NOT_FOUND", 404);
  }
  if (!account.enabled) {
    throw new EnterpriseCodexPluginError("ACCOUNT_DISABLED", 401);
  }
  let runtimeAgentId: string;
  try {
    runtimeAgentId = resolveEnterpriseUserRuntimeAgentId(context.config, account, context.agentKey);
  } catch {
    throw new EnterpriseCodexPluginError("AGENT_NOT_FOUND", 404);
  }
  if (
    !resolveEnterpriseAllowedAgentIds(context.config, account, { userAudience: true }).has(
      runtimeAgentId,
    )
  ) {
    throw new EnterpriseCodexPluginError("AGENT_NOT_FOUND", 404);
  }
  const projectedConfig = projectEnterpriseRuntimeConfig(context.config, account, {
    userAudience: true,
  });
  return {
    config: context.config,
    projectedConfig,
    account,
    agentKey: context.agentKey,
    runtimeAgentId,
    agentDir: resolveAgentDir(projectedConfig, runtimeAgentId),
    workspaceDir: resolveAgentWorkspaceDir(projectedConfig, runtimeAgentId),
  };
}

async function runtimeFor(
  context: EnterpriseCodexPluginServiceContext,
  required: boolean,
): Promise<{ scope: EnterpriseCodexRuntimeScope; runtime?: EnterpriseCodexPluginRuntime }> {
  const current = scope(context);
  if (context.runtime) {
    return { scope: current, runtime: context.runtime };
  }
  if (context.resolveRuntime) {
    const runtime = await context.resolveRuntime(current);
    if (required && !runtime) {
      throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
    }
    return { scope: current, runtime };
  }
  try {
    const runtime = defaultRuntimeResolver(current);
    return { scope: current, runtime };
  } catch (error) {
    if (required) {
      if (error instanceof EnterpriseCodexPluginError) {
        throw error;
      }
      throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
    }
    return { scope: current };
  }
}

function latestRequest(
  requests: readonly EnterpriseCodexPluginRequest[],
  identity: EnterpriseCodexPluginIdentity,
): EnterpriseCodexPluginRequest | undefined {
  return requests.find(
    (request) =>
      request.pluginName === identity.pluginName &&
      request.marketplaceName === identity.marketplaceName,
  );
}

function grantFor(
  grants: readonly EnterpriseCodexPluginGrant[],
  identity: EnterpriseCodexPluginIdentity,
): EnterpriseCodexPluginGrant | undefined {
  return grants.find(
    (grant) =>
      grant.pluginName === identity.pluginName &&
      grant.marketplaceName === identity.marketplaceName,
  );
}

function attachLifecycle(
  item: EnterpriseCodexPluginCatalogItem,
  request: EnterpriseCodexPluginRequest | undefined,
  grant: EnterpriseCodexPluginGrant | undefined,
): EnterpriseCodexPluginCatalogItem {
  const authSource = grant ?? (request?.state === "available" ? request : undefined);
  return {
    ...item,
    installed: item.installed || Boolean(grant?.installedPluginId),
    enabled: item.enabled && grant?.state === "active",
    requestState: request?.state ?? null,
    grantState: grant?.state ?? null,
    ...(authSource
      ? {
          authRequired: authSource.authRequired,
          appsNeedingAuth: authSource.appsNeedingAuth,
          connectUrls: authSource.connectUrls,
          ready: grant?.ready ?? !authSource.authRequired,
        }
      : {}),
  };
}

function catalogItemMatchesQuery(item: EnterpriseCodexPluginCatalogItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return (
    !normalized ||
    [item.id, item.pluginName, item.name, item.description, item.marketplaceName].some((value) =>
      value.toLowerCase().includes(normalized),
    )
  );
}

function mergePublicMetadata(
  item: EnterpriseCodexPluginCatalogItem,
  publicItem: { name: string; description: string; category?: string } | undefined,
): EnterpriseCodexPluginCatalogItem {
  if (!publicItem) {
    return item;
  }
  return {
    ...item,
    name: publicItem.name.slice(0, 256),
    description: publicItem.description.slice(0, 4_096),
    ...(publicItem.category?.trim() ? { category: publicItem.category.trim().slice(0, 256) } : {}),
  };
}

/**
 * Resolves a public catalog row to the exact identity returned by Codex.
 *
 * The public repository owns a human-facing slug (for example `magicpath`),
 * while the remote Codex marketplace can expose an app-backed plugin name
 * (for example `app-...`). A display-name match is useful for that rename, but
 * it must be unique. Returning no match keeps the public row visible while
 * preventing an approval from binding to an arbitrary plugin.
 */
function matchPublicRuntimeItem(
  publicItem: { id: string; name: string },
  runtimeItems: readonly EnterpriseCodexPluginCatalogItem[],
): EnterpriseCodexPluginCatalogItem | undefined {
  const curated = runtimeItems.filter((item) => isCuratedMarketplace(item.marketplaceName));
  const exact = curated.filter((item) => item.pluginName === publicItem.id);
  if (exact.length === 1) {
    return exact[0];
  }
  if (exact.length > 1) {
    return undefined;
  }
  const displayName = publicItem.name.trim().toLowerCase();
  if (!displayName) {
    return undefined;
  }
  const byDisplayName = curated.filter((item) => item.name.trim().toLowerCase() === displayName);
  return byDisplayName.length === 1 ? byDisplayName[0] : undefined;
}

function catalogIdentityKey(
  item: Pick<EnterpriseCodexPluginCatalogItem, "pluginName" | "marketplaceName">,
): string {
  return `${item.pluginName}@${item.marketplaceName}`;
}

function publicCatalogItemForRuntimeState(
  item: ReturnType<typeof catalogItemFromPublic>,
  runtimeAvailable: boolean,
): ReturnType<typeof catalogItemFromPublic> {
  return runtimeAvailable ? { ...item, available: false } : item;
}

function safeCatalogWarnings(params: {
  runtimeWarnings?: readonly string[];
  runtimeUnavailable?: boolean;
  publicUnavailable?: boolean;
}): string[] {
  const warnings = new Set<string>();
  if (params.runtimeWarnings?.length) {
    warnings.add("CODEX_MARKETPLACE_PARTIAL");
  }
  if (params.runtimeUnavailable) {
    warnings.add("CODEX_RUNTIME_UNAVAILABLE");
  }
  if (params.publicUnavailable) {
    warnings.add("CODEX_PUBLIC_CATALOG_UNAVAILABLE");
  }
  return [...warnings];
}

function presentRequest(request: EnterpriseCodexPluginRequest, includeAccount = false) {
  return {
    id: request.id,
    pluginId: `${request.pluginName}@${request.marketplaceName}`,
    pluginName: request.pluginName,
    marketplaceName: request.marketplaceName,
    remotePluginId: request.remotePluginId,
    ...(includeAccount ? { requesterAccountId: request.requesterAccountId } : {}),
    agentKey: request.agentKey,
    requestKind: request.requestKind,
    state: request.state,
    installedPluginId: request.installedPluginId,
    authRequired: request.authRequired,
    appsNeedingAuth: request.appsNeedingAuth,
    connectUrls: request.connectUrls,
    decisionReason: request.decisionReason,
    safeErrorCode: request.safeErrorCode,
    ...(includeAccount
      ? {
          capabilitySnapshot: sanitizeCapabilitySnapshot(request.capabilitySnapshot),
          capabilityDigest: request.capabilityDigest,
        }
      : {}),
    revision: request.revision,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    decidedAt: request.decidedAt,
  };
}

function presentGrant(grant: EnterpriseCodexPluginGrant) {
  return {
    id: grant.id,
    pluginId: `${grant.pluginName}@${grant.marketplaceName}`,
    pluginName: grant.pluginName,
    marketplaceName: grant.marketplaceName,
    remotePluginId: grant.remotePluginId,
    installedPluginId: grant.installedPluginId,
    agentKey: grant.agentKey,
    state: grant.state,
    authRequired: grant.authRequired,
    appsNeedingAuth: grant.appsNeedingAuth,
    connectUrls: grant.connectUrls,
    ready: grant.ready,
    capabilityDigest: grant.capabilityDigest,
    revision: grant.revision,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
  };
}

export function presentEnterpriseCodexPluginRequest(
  request: EnterpriseCodexPluginRequest,
  includeAccount = false,
) {
  return presentRequest(request, includeAccount);
}

export function presentEnterpriseCodexPluginGrant(grant: EnterpriseCodexPluginGrant) {
  return presentGrant(grant);
}

const PRIVATE_CAPABILITY_KEYS = new Set([
  "accountId",
  "agentDir",
  "installedPluginId",
  "marketplacePath",
  "path",
  "runtimeAgentId",
  "sessionId",
  "workspaceDir",
]);

function sanitizeCapabilityValue(value: unknown, key = "", depth = 0): unknown {
  if (depth > 8) {
    return undefined;
  }
  if (PRIVATE_CAPABILITY_KEYS.has(key)) {
    return undefined;
  }
  if (typeof value === "string") {
    // Capability details are provider metadata, but older facades included
    // local path fragments in skill/hook descriptions. Strip those before a
    // detail response leaves the Enterprise boundary.
    const boundedValue = value.slice(0, 4_096);
    return boundedValue.replace(
      /(?:^|\s)(?:\/(?:Users|private|var|tmp|home|root|opt|workspace)[^\s]*)/g,
      " [path omitted]",
    );
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 256)
      .map((entry) => sanitizeCapabilityValue(entry, "", depth + 1))
      .filter((entry): entry is Exclude<typeof entry, undefined> => entry !== undefined);
  }
  const row = record(value);
  if (!row) {
    return value;
  }
  const sanitized: RecordValue = {};
  for (const [childKey, childValue] of Object.entries(row).slice(0, 256)) {
    const safe = sanitizeCapabilityValue(childValue, childKey, depth + 1);
    if (safe !== undefined) {
      sanitized[childKey] = safe;
    }
  }
  return sanitized;
}

function sanitizeCapabilitySnapshot(snapshot: RecordValue): RecordValue {
  const safe = sanitizeCapabilityValue(snapshot);
  return record(safe) ?? {};
}

export function presentEnterpriseCodexPluginDetail(detail: EnterpriseCodexPluginDetailResponse) {
  // Keep this boundary defensive even when callers already obtained auth from
  // the runtime mapper. A facade can add provider-specific fields over time;
  // only the explicitly supported connection metadata belongs in the portal.
  const auth = detail.auth ? authState(detail.auth) : undefined;
  return {
    item: detail.item,
    ...(detail.metadata ?? {}),
    ...(auth ? { auth } : {}),
    ...(auth
      ? {
          authRequired: auth.authRequired,
          appsNeedingAuth: auth.appsNeedingAuth,
          connectUrls: auth.connectUrls,
          ready: auth.ready,
        }
      : {}),
    capabilitySnapshot: sanitizeCapabilitySnapshot(detail.capabilitySnapshot),
    capabilityDigest: detail.capabilityDigest,
  };
}

export async function listEnterpriseCodexPlugins(
  context: EnterpriseCodexPluginServiceContext & { query?: string },
): Promise<EnterpriseCodexPluginCatalogResponse> {
  const { scope: current, runtime } = await runtimeFor(context, false);
  const grants = listEnterpriseAccountCodexPluginGrants(context.account.id, context.options).filter(
    (grant) => grant.runtimeAgentId === current.runtimeAgentId,
  );
  const requests = listEnterpriseCodexPluginRequests(
    { accountId: context.account.id, runtimeAgentId: current.runtimeAgentId },
    context.options,
  );
  let catalog: EnterpriseCodexPluginRuntimeCatalog;
  let runtimeUnavailable = false;
  if (runtime) {
    try {
      catalog = await runtime.list({
        config: current.projectedConfig,
        accountId: context.account.id,
        runtimeAgentId: current.runtimeAgentId,
        agentDir: current.agentDir,
        workspaceDir: current.workspaceDir,
        query: context.query,
      });
    } catch {
      catalog = { items: [], warnings: ["CODEX_RUNTIME_UNAVAILABLE"] };
      runtimeUnavailable = true;
    }
  } else {
    catalog = { items: [] };
    runtimeUnavailable = true;
  }
  const query = context.query ?? "";
  const publicCatalog = await listCodexPublicCatalog(query);
  const publicByName = new Map(publicCatalog.items.map((item) => [item.id, item] as const));
  const runtimeItems = catalog.items.filter((item) => catalogItemMatchesQuery(item, query));
  let visibleItems: EnterpriseCodexPluginCatalogItem[];
  if (!query.trim()) {
    // The live Codex app-server can expose thousands of workspace/shared
    // entries. The initial Enterprise catalog is intentionally the trusted
    // public OpenAI list, while an explicit search may query the scoped
    // runtime catalog below.
    visibleItems =
      publicCatalog.status === "available"
        ? publicCatalog.items.map((publicItem) => {
            const discovered = matchPublicRuntimeItem(publicItem, runtimeItems);
            return mergePublicMetadata(
              discovered ??
                publicCatalogItemForRuntimeState(
                  catalogItemFromPublic(publicItem),
                  !runtimeUnavailable,
                ),
              publicItem,
            );
          })
        : [];
  } else {
    const publicMetadataByRuntimeIdentity = new Map<string, (typeof publicCatalog.items)[number]>();
    if (publicCatalog.status === "available") {
      for (const publicItem of publicCatalog.items) {
        const discovered = matchPublicRuntimeItem(publicItem, runtimeItems);
        if (discovered) {
          const identity = catalogIdentityKey(discovered);
          if (!publicMetadataByRuntimeIdentity.has(identity)) {
            publicMetadataByRuntimeIdentity.set(identity, publicItem);
          }
        }
      }
    }
    visibleItems = runtimeItems
      .filter((item) => item.available)
      .map((item) =>
        mergePublicMetadata(
          item,
          publicMetadataByRuntimeIdentity.get(catalogIdentityKey(item)) ??
            publicByName.get(item.pluginName),
        ),
      );
    if (publicCatalog.status === "available") {
      const seenRuntimeIdentities = new Set(visibleItems.map(catalogIdentityKey));
      for (const publicItem of publicCatalog.items) {
        const discovered = matchPublicRuntimeItem(publicItem, runtimeItems);
        if (discovered && seenRuntimeIdentities.has(catalogIdentityKey(discovered))) {
          continue;
        }
        visibleItems.push(
          publicCatalogItemForRuntimeState(catalogItemFromPublic(publicItem), !runtimeUnavailable),
        );
      }
    }
  }
  const itemMap = new Map<string, EnterpriseCodexPluginCatalogItem>();
  for (const item of visibleItems) {
    const identity = normalizeEnterpriseCodexPluginIdentity({
      pluginName: item.pluginName,
      marketplaceName: normalizeMarketplaceName(item.marketplaceName),
      remotePluginId: item.remotePluginId,
    });
    const canonical = {
      ...item,
      ...identity,
      id: `${identity.pluginName}@${identity.marketplaceName}`,
    };
    const request = latestRequest(requests, identity);
    const grant = grantFor(grants, identity);
    itemMap.set(canonical.id, attachLifecycle(canonical, request, grant));
  }
  return {
    items: [...itemMap.values()],
    installed: grants,
    requests,
    ...(safeCatalogWarnings({
      runtimeWarnings: catalog.warnings,
      runtimeUnavailable,
      publicUnavailable: publicCatalog.status === "unavailable",
    }).length
      ? {
          warnings: safeCatalogWarnings({
            runtimeWarnings: catalog.warnings,
            runtimeUnavailable,
            publicUnavailable: publicCatalog.status === "unavailable",
          }),
        }
      : {}),
  };
}

export async function reviewEnterpriseCodexPlugin(
  context: EnterpriseCodexPluginServiceContext & { pluginId: string; requireRuntime?: boolean },
): Promise<EnterpriseCodexPluginDetailResponse> {
  const identity = parsePluginId(context.pluginId);
  if (!identity) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_ID_INVALID", 422);
  }
  const { scope: current, runtime } = await runtimeFor(context, context.requireRuntime === true);
  let detail: EnterpriseCodexPluginRuntimeDetail | undefined;
  if (runtime) {
    try {
      detail = await runtime.detail({
        config: current.projectedConfig,
        accountId: context.account.id,
        runtimeAgentId: current.runtimeAgentId,
        pluginName: identity.pluginName,
        marketplaceName: identity.marketplaceName,
        remotePluginId: null,
        agentDir: current.agentDir,
        workspaceDir: current.workspaceDir,
      });
    } catch (error) {
      if (context.requireRuntime === true) {
        throw new EnterpriseCodexPluginError(safeErrorCode(error), 404);
      }
    }
  }
  if (!detail) {
    const publicCatalog = await listCodexPublicCatalog(identity.pluginName);
    const item = publicCatalog.items.find((candidate) => candidate.id === identity.pluginName);
    if (!item) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_NOT_FOUND", 404);
    }
    const catalogItem = catalogItemFromPublic(item);
    const snapshot = snapshotFromCatalog(catalogItem);
    return {
      item: attachLifecycle(
        catalogItem,
        latestRequest(
          listEnterpriseCodexPluginRequests(
            { accountId: context.account.id, runtimeAgentId: current.runtimeAgentId },
            context.options,
          ),
          identity,
        ),
        grantFor(
          listEnterpriseAccountCodexPluginGrants(context.account.id, context.options).filter(
            (grant) => grant.runtimeAgentId === current.runtimeAgentId,
          ),
          identity,
        ),
      ),
      metadata: metadataFromPublicCatalogItem(item),
      capabilitySnapshot: snapshot,
      capabilityDigest: digest(identity, snapshot),
    };
  }
  const snapshot = detail.capabilitySnapshot ?? snapshotFromCatalog(detail.item);
  const capabilityDigest = detail.capabilityDigest ?? digest(detail.item, snapshot);
  const requests = listEnterpriseCodexPluginRequests(
    { accountId: context.account.id, runtimeAgentId: current.runtimeAgentId },
    context.options,
  );
  const grants = listEnterpriseAccountCodexPluginGrants(context.account.id, context.options).filter(
    (grant) => grant.runtimeAgentId === current.runtimeAgentId,
  );
  const reviewedGrant = grantFor(grants, detail.item);
  const reviewedGrantMatches = Boolean(
    reviewedGrant?.state === "active" &&
    reviewedGrant.capabilityDigest === capabilityDigest &&
    reviewedGrant.installedPluginId &&
    installedIdentityMatches(reviewedGrant.installedPluginId, detail.item),
  );
  let auth = reviewedGrantMatches && detail.auth ? authState(detail.auth) : undefined;
  let lifecycleGrant = reviewedGrantMatches ? reviewedGrant : undefined;
  if (runtime?.authStatus && reviewedGrantMatches) {
    try {
      auth = authState(
        await runtime.authStatus({
          config: current.projectedConfig,
          accountId: context.account.id,
          runtimeAgentId: current.runtimeAgentId,
          pluginName: detail.item.pluginName,
          marketplaceName: detail.item.marketplaceName,
          remotePluginId: detail.item.remotePluginId,
          agentDir: current.agentDir,
          workspaceDir: current.workspaceDir,
          // Opening a detail view must be bounded and must read Codex's
          // committed connector snapshot. The explicit Check connection action
          // uses refresh=true through the grant refresh route.
          forceRefresh: false,
        }),
      );
    } catch {
      // Metadata is still useful when a connector status read is unavailable,
      // but readiness must remain unverified rather than inheriting active.
      auth = {
        authRequired: reviewedGrant?.authRequired ?? detail.item.authRequired ?? false,
        appsNeedingAuth: reviewedGrant?.appsNeedingAuth ?? [],
        ...(reviewedGrant?.appsNeedingAuth ? { apps: reviewedGrant.appsNeedingAuth } : {}),
        connectUrls: reviewedGrant?.connectUrls ?? [],
        ready: false,
        statusError: "runtime_unavailable",
        statusErrors: ["runtime_unavailable"],
      };
    }
    // Connector status is asynchronous. Re-read the account/Agent scope and
    // grant after it returns so a concurrent disable, revoke, or capability
    // change cannot leak stale auth URLs through the detail presenter.
    const afterAuthScope = scope(context);
    if (afterAuthScope.runtimeAgentId !== current.runtimeAgentId) {
      auth = undefined;
      lifecycleGrant = undefined;
    } else {
      const afterAuthGrant = grantFor(
        listEnterpriseAccountCodexPluginGrants(context.account.id, context.options).filter(
          (grant) => grant.runtimeAgentId === afterAuthScope.runtimeAgentId,
        ),
        detail.item,
      );
      const afterAuthGrantMatches = Boolean(
        afterAuthGrant?.state === "active" &&
        afterAuthGrant.capabilityDigest === capabilityDigest &&
        afterAuthGrant.installedPluginId &&
        installedIdentityMatches(afterAuthGrant.installedPluginId, detail.item),
      );
      if (!afterAuthGrantMatches) {
        auth = undefined;
        lifecycleGrant = undefined;
      } else {
        lifecycleGrant = afterAuthGrant;
      }
    }
  }
  const lifecycleItem = attachLifecycle(
    detail.item,
    latestRequest(requests, detail.item),
    lifecycleGrant,
  );
  const item = auth
    ? {
        ...lifecycleItem,
        authRequired: auth.authRequired,
        appsNeedingAuth: auth.appsNeedingAuth,
        connectUrls: auth.connectUrls,
        ready: auth.ready,
      }
    : lifecycleItem;
  return {
    item,
    ...(detail.metadata ? { metadata: detail.metadata } : {}),
    ...(auth ? { auth } : {}),
    capabilitySnapshot: snapshot,
    capabilityDigest,
  };
}

/**
 * Starts OAuth for one MCP server declared by an active, reviewed plugin.
 *
 * The persisted capability snapshot is the first ownership fence. A fresh
 * runtime detail read then proves that the installed plugin still has the
 * same digest and server declaration before Codex receives the OAuth request.
 * The grant, account/Agent scope, digest, and server declaration are checked
 * again after the async OAuth call so a concurrent disable or capability
 * change cannot return a URL for a stale grant.
 */
export async function connectEnterpriseCodexGrant(
  context: EnterpriseCodexPluginServiceContext & {
    grantId: string;
    baseRevision: number;
    serverName: string;
  },
): Promise<{ authorizationUrl: string }> {
  const serverName = context.serverName.trim();
  if (!serverName || serverName.length > 256) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_INVALID", 422);
  }
  const initialScope = scope(context);
  const grant = requireActiveCodexGrant({
    grant: getEnterpriseCodexPluginGrant(context.grantId, context.options),
    accountId: context.account.id,
    runtimeAgentId: initialScope.runtimeAgentId,
    baseRevision: context.baseRevision,
  });
  if (!mcpServerNamesFromSnapshot(grant.capabilitySnapshot).includes(serverName)) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_NOT_GRANTED", 403);
  }
  const { scope: runtimeScope, runtime } = await runtimeFor(context, true);
  if (runtimeScope.runtimeAgentId !== initialScope.runtimeAgentId) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_SCOPE_CHANGED", 409);
  }
  if (!runtime?.beginMcpOAuthLogin) {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }

  let reviewedDetail: EnterpriseCodexPluginRuntimeDetail;
  try {
    reviewedDetail = await runtime.detail({
      config: initialScope.projectedConfig,
      accountId: context.account.id,
      runtimeAgentId: initialScope.runtimeAgentId,
      pluginName: grant.pluginName,
      marketplaceName: grant.marketplaceName,
      remotePluginId: grant.remotePluginId,
      agentDir: initialScope.agentDir,
      workspaceDir: initialScope.workspaceDir,
    });
  } catch {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }
  requireOwnedMcpServer(grant, reviewedDetail, serverName);

  const beforeOAuthScope = scope(context);
  if (beforeOAuthScope.runtimeAgentId !== initialScope.runtimeAgentId) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_SCOPE_CHANGED", 409);
  }
  const currentGrant = requireCurrentCodexGrant({
    grant,
    accountId: context.account.id,
    runtimeAgentId: beforeOAuthScope.runtimeAgentId,
    baseRevision: context.baseRevision,
    options: context.options,
  });

  let oauth: { name: string; authorizationUrl: string };
  try {
    oauth = await runtime.beginMcpOAuthLogin(serverName, {
      expectedPluginId: `${currentGrant.pluginName}@${currentGrant.marketplaceName}`,
    });
  } catch (error) {
    if (error instanceof EnterpriseCodexPluginError) {
      throw error;
    }
    throw new EnterpriseCodexPluginError("CODEX_MCP_OAUTH_UNAVAILABLE", 502);
  }
  if (oauth.name !== serverName) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_NOT_GRANTED", 403);
  }

  const afterOAuthScope = scope(context);
  if (afterOAuthScope.runtimeAgentId !== initialScope.runtimeAgentId) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_SCOPE_CHANGED", 409);
  }
  const afterOAuthGrant = requireCurrentCodexGrant({
    grant: currentGrant,
    accountId: context.account.id,
    runtimeAgentId: afterOAuthScope.runtimeAgentId,
    baseRevision: context.baseRevision,
    options: context.options,
  });
  if (!mcpServerNamesFromSnapshot(afterOAuthGrant.capabilitySnapshot).includes(serverName)) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_SERVER_NOT_GRANTED", 403);
  }

  let postOAuthDetail: EnterpriseCodexPluginRuntimeDetail;
  try {
    postOAuthDetail = await runtime.detail({
      config: afterOAuthScope.projectedConfig,
      accountId: context.account.id,
      runtimeAgentId: afterOAuthScope.runtimeAgentId,
      pluginName: afterOAuthGrant.pluginName,
      marketplaceName: afterOAuthGrant.marketplaceName,
      remotePluginId: afterOAuthGrant.remotePluginId,
      agentDir: afterOAuthScope.agentDir,
      workspaceDir: afterOAuthScope.workspaceDir,
    });
  } catch {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }
  requireOwnedMcpServer(afterOAuthGrant, postOAuthDetail, serverName);
  // The final detail read is also asynchronous. Fence the URL against a
  // revoke/disable that happened while Codex was reloading plugin metadata.
  const finalScope = scope(context);
  if (finalScope.runtimeAgentId !== initialScope.runtimeAgentId) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_SCOPE_CHANGED", 409);
  }
  requireCurrentCodexGrant({
    grant: afterOAuthGrant,
    accountId: context.account.id,
    runtimeAgentId: finalScope.runtimeAgentId,
    baseRevision: context.baseRevision,
    options: context.options,
  });
  const authorizationUrl = validHttpUrl(oauth.authorizationUrl);
  if (!authorizationUrl) {
    throw new EnterpriseCodexPluginError("CODEX_MCP_OAUTH_INVALID_RESPONSE", 502);
  }
  return { authorizationUrl };
}

export async function requestEnterpriseCodexPlugin(
  context: EnterpriseCodexPluginServiceContext & { pluginId: string },
): Promise<EnterpriseCodexPluginRequest> {
  const reviewed = await reviewEnterpriseCodexPlugin({ ...context, requireRuntime: true });
  if (!reviewed.item.available || reviewed.item.installPolicy === "NOT_AVAILABLE") {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_UNAVAILABLE", 409);
  }
  if (reviewed.item.grantState === "active") {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_ALREADY_GRANTED", 409);
  }
  const current = scope(context);
  const existingGrants = listEnterpriseAccountCodexPluginGrants(
    context.account.id,
    context.options,
  ).filter((grant) => grant.runtimeAgentId === current.runtimeAgentId);
  const grant = grantFor(existingGrants, reviewed.item);
  const request = createEnterpriseCodexPluginRequest(
    {
      pluginName: reviewed.item.pluginName,
      marketplaceName: reviewed.item.marketplaceName,
      remotePluginId: reviewed.item.remotePluginId,
      requesterAccountId: context.account.id,
      agentKey: context.agentKey,
      runtimeAgentId: current.runtimeAgentId,
      requestKind: reviewed.item.installed || grant ? "access" : "install",
      catalogSnapshot: snapshotFromCatalog(reviewed.item),
      capabilitySnapshot: reviewed.capabilitySnapshot,
      capabilityDigest: reviewed.capabilityDigest,
      authRequired: false,
      appsNeedingAuth: [],
      connectUrls: [],
    },
    context.options,
  );
  return request;
}

export function cancelEnterpriseCodexPluginRequest(
  context: EnterpriseCodexPluginServiceContext & { requestId: string; baseRevision: number },
): EnterpriseCodexPluginRequest {
  const current = scope(context);
  const request = getEnterpriseCodexPluginRequest(context.requestId, context.options);
  if (
    !request ||
    request.requesterAccountId !== context.account.id ||
    request.runtimeAgentId !== current.runtimeAgentId
  ) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  try {
    return transitionEnterpriseCodexPluginRequest(
      {
        id: request.id,
        baseRevision: context.baseRevision,
        from: ["pending"],
        to: "cancelled",
      },
      context.options,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CODEX_PLUGIN_REVISION_CONFLICT")) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
    }
    throw error;
  }
}

export async function approveEnterpriseCodexPluginRequest(context: {
  config: OpenClawConfig;
  reviewer: EnterpriseAccount;
  requestId: string;
  baseRevision: number;
  runtime?: EnterpriseCodexPluginRuntime;
  resolveRuntime?: EnterpriseCodexPluginRuntimeResolver;
  options?: OpenClawStateDatabaseOptions;
}): Promise<EnterpriseCodexPluginApprovalResponse> {
  const request = getEnterpriseCodexPluginRequest(context.requestId, context.options);
  if (!request) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  const requester = getEnterpriseAccountById(request.requesterAccountId, context.options);
  if (!requester || !requester.enabled) {
    throw new EnterpriseCodexPluginError("CODEX_REQUEST_ACCOUNT_UNAVAILABLE", 409);
  }
  const userContext: EnterpriseCodexPluginServiceContext = {
    config: context.config,
    account: requester,
    agentKey: request.agentKey,
    ...(context.runtime ? { runtime: context.runtime } : {}),
    ...(context.resolveRuntime ? { resolveRuntime: context.resolveRuntime } : {}),
    options: context.options,
  };
  const { scope: current, runtime } = await runtimeFor(userContext, true);
  if (!runtime) {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }
  if (request.runtimeAgentId !== current.runtimeAgentId) {
    throw new EnterpriseCodexPluginError("CODEX_REQUEST_AGENT_CHANGED", 409);
  }
  let reviewed: EnterpriseCodexPluginDetailResponse;
  try {
    reviewed = await reviewEnterpriseCodexPlugin({
      ...userContext,
      pluginId: `${request.pluginName}@${request.marketplaceName}`,
      requireRuntime: true,
    });
  } catch (error) {
    throw error;
  }
  if (reviewed.capabilityDigest !== request.capabilityDigest) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_CAPABILITY_CHANGED", 409);
  }
  if (!reviewed.item.available) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_UNAVAILABLE", 409);
  }
  let approving: EnterpriseCodexPluginRequest;
  try {
    approving = transitionEnterpriseCodexPluginRequest(
      {
        id: request.id,
        baseRevision: context.baseRevision,
        from: ["pending", "install_failed"],
        to: "approving",
        reviewerAccountId: context.reviewer.id,
        safeErrorCode: null,
      },
      context.options,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CODEX_PLUGIN_REVISION_CONFLICT")) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
    }
    throw error;
  }
  let mutation: EnterpriseCodexPluginRuntimeMutationResult;
  try {
    mutation = await runtime.install({
      config: current.projectedConfig,
      accountId: requester.id,
      runtimeAgentId: current.runtimeAgentId,
      pluginName: request.pluginName,
      marketplaceName: request.marketplaceName,
      remotePluginId: request.remotePluginId,
      agentDir: current.agentDir,
      workspaceDir: current.workspaceDir,
    });
  } catch (error) {
    const code = safeErrorCode(error);
    const failed = transitionEnterpriseCodexPluginRequest(
      {
        id: approving.id,
        baseRevision: approving.revision,
        from: ["approving"],
        to: "install_failed",
        reviewerAccountId: context.reviewer.id,
        safeErrorCode: code,
      },
      context.options,
    );
    throw new EnterpriseCodexPluginError(failed.safeErrorCode ?? "CODEX_INSTALL_FAILED", 502);
  }
  const postInstallRequester = getEnterpriseAccountById(requester.id, context.options);
  if (
    !postInstallRequester?.enabled ||
    !resolveEnterpriseAllowedAgentIds(context.config, postInstallRequester, {
      userAudience: true,
    }).has(current.runtimeAgentId)
  ) {
    const failed = transitionEnterpriseCodexPluginRequest(
      {
        id: approving.id,
        baseRevision: approving.revision,
        from: ["approving"],
        to: "install_failed",
        reviewerAccountId: context.reviewer.id,
        safeErrorCode: "CODEX_REQUEST_SCOPE_CHANGED",
      },
      context.options,
    );
    throw new EnterpriseCodexPluginError(
      failed.safeErrorCode ?? "CODEX_REQUEST_SCOPE_CHANGED",
      409,
    );
  }
  const installedPluginId =
    mutation.installedPluginId ??
    request.installedPluginId ??
    `${request.pluginName}@${request.marketplaceName}`;
  if (!installedIdentityMatches(installedPluginId, request)) {
    const failed = transitionEnterpriseCodexPluginRequest(
      {
        id: approving.id,
        baseRevision: approving.revision,
        from: ["approving"],
        to: "install_failed",
        reviewerAccountId: context.reviewer.id,
        safeErrorCode: "CODEX_PLUGIN_INSTALL_IDENTITY_MISMATCH",
      },
      context.options,
    );
    throw new EnterpriseCodexPluginError(
      failed.safeErrorCode ?? "CODEX_PLUGIN_INSTALL_IDENTITY_MISMATCH",
      502,
    );
  }
  let auth: EnterpriseCodexPluginAuthState = {
    authRequired: mutation.authRequired === true,
    appsNeedingAuth: mutation.appsNeedingAuth ?? [],
    connectUrls: mutation.connectUrls ?? [],
    ready: mutation.ready ?? mutation.authRequired !== true,
  };
  if (runtime.authStatus) {
    try {
      auth = authState(
        await runtime.authStatus({
          config: current.projectedConfig,
          accountId: requester.id,
          runtimeAgentId: current.runtimeAgentId,
          pluginName: request.pluginName,
          marketplaceName: request.marketplaceName,
          remotePluginId: request.remotePluginId,
          agentDir: current.agentDir,
          workspaceDir: current.workspaceDir,
        }),
      );
    } catch {
      // Installation succeeded but readiness could not be attested. Keep the
      // bounded connector information and force the grant into needs-setup.
      auth = { ...auth, ready: false };
    }
  }
  const grant = upsertEnterpriseCodexPluginGrant(
    {
      accountId: requester.id,
      agentKey: request.agentKey,
      runtimeAgentId: current.runtimeAgentId,
      pluginName: request.pluginName,
      marketplaceName: request.marketplaceName,
      remotePluginId: request.remotePluginId,
      installedPluginId,
      capabilitySnapshot: reviewed.capabilitySnapshot,
      capabilityDigest: reviewed.capabilityDigest,
      sourceRequestId: request.id,
      state: "active",
      authRequired: auth.authRequired,
      appsNeedingAuth: auth.appsNeedingAuth,
      connectUrls: auth.connectUrls,
      ready: auth.ready,
    },
    context.options,
  );
  const available = transitionEnterpriseCodexPluginRequest(
    {
      id: approving.id,
      baseRevision: approving.revision,
      from: ["approving"],
      to: "available",
      reviewerAccountId: context.reviewer.id,
      installedPluginId,
      authRequired: auth.authRequired,
      appsNeedingAuth: auth.appsNeedingAuth,
      connectUrls: auth.connectUrls,
    },
    context.options,
  );
  return {
    request: available,
    grant,
    authRequired: auth.authRequired,
    appsNeedingAuth: auth.appsNeedingAuth,
    connectUrls: auth.connectUrls,
    restartRequired: mutation.restartRequired === true,
  };
}

export function rejectEnterpriseCodexPluginRequest(input: {
  config: OpenClawConfig;
  reviewer: EnterpriseAccount;
  requestId: string;
  baseRevision: number;
  reason: string;
  options?: OpenClawStateDatabaseOptions;
}): EnterpriseCodexPluginRequest {
  const request = getEnterpriseCodexPluginRequest(input.requestId, input.options);
  if (!request) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  try {
    return transitionEnterpriseCodexPluginRequest(
      {
        id: request.id,
        baseRevision: input.baseRevision,
        from: ["pending", "install_failed"],
        to: "rejected",
        reviewerAccountId: input.reviewer.id,
        decisionReason: input.reason.trim().slice(0, 2_000),
      },
      input.options,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CODEX_PLUGIN_REVISION_CONFLICT")) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
    }
    throw error;
  }
}

export function transitionEnterpriseCodexGrantState(input: {
  context: EnterpriseCodexPluginServiceContext;
  grantId: string;
  baseRevision: number;
  state: EnterpriseCodexPluginGrantState;
}): EnterpriseCodexPluginGrant {
  const current = scope(input.context);
  const grant = getEnterpriseCodexPluginGrant(input.grantId, input.context.options);
  if (
    !grant ||
    grant.accountId !== input.context.account.id ||
    grant.runtimeAgentId !== current.runtimeAgentId
  ) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_FOUND", 404);
  }
  if (grant.state === "revoked") {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_REVOKED", 409);
  }
  try {
    return transitionEnterpriseCodexPluginGrant(
      {
        id: grant.id,
        accountId: input.context.account.id,
        baseRevision: input.baseRevision,
        state: input.state,
      },
      input.context.options,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CODEX_PLUGIN_REVISION_CONFLICT")) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
    }
    throw error;
  }
}

export async function refreshEnterpriseCodexGrant(
  context: EnterpriseCodexPluginServiceContext & { grantId: string; baseRevision: number },
): Promise<EnterpriseCodexPluginGrant> {
  const current = scope(context);
  const grant = getEnterpriseCodexPluginGrant(context.grantId, context.options);
  if (
    !grant ||
    grant.accountId !== context.account.id ||
    grant.runtimeAgentId !== current.runtimeAgentId
  ) {
    throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_FOUND", 404);
  }
  const { runtime } = await runtimeFor(context, true);
  if (!runtime?.authStatus) {
    return grant;
  }
  let auth: EnterpriseCodexPluginAuthState;
  try {
    auth = authState(
      await runtime.authStatus({
        config: current.projectedConfig,
        accountId: context.account.id,
        runtimeAgentId: current.runtimeAgentId,
        pluginName: grant.pluginName,
        marketplaceName: grant.marketplaceName,
        remotePluginId: grant.remotePluginId,
        agentDir: current.agentDir,
        workspaceDir: current.workspaceDir,
      }),
    );
  } catch {
    throw new EnterpriseCodexPluginError("CODEX_RUNTIME_UNAVAILABLE", 503);
  }
  const latestAccount = getEnterpriseAccountById(context.account.id, context.options);
  if (
    !latestAccount?.enabled ||
    !resolveEnterpriseAllowedAgentIds(context.config, latestAccount, { userAudience: true }).has(
      current.runtimeAgentId,
    )
  ) {
    throw new EnterpriseCodexPluginError("AGENT_NOT_FOUND", 404);
  }
  // Readiness is persisted with a narrow CAS update. This prevents a slow
  // connector status call from reviving a grant that was disabled meanwhile.
  let updated: EnterpriseCodexPluginGrant;
  try {
    updated = refreshEnterpriseCodexPluginGrantAuth(
      {
        id: grant.id,
        accountId: grant.accountId,
        runtimeAgentId: grant.runtimeAgentId,
        baseRevision: context.baseRevision,
        authRequired: auth.authRequired,
        appsNeedingAuth: auth.appsNeedingAuth,
        connectUrls: auth.connectUrls,
        ready: auth.ready,
      },
      context.options,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CODEX_PLUGIN_REVISION_CONFLICT")) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REVISION_CONFLICT", 409);
    }
    throw error;
  }
  return updated;
}
