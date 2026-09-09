/**
 * Public, account-scoped Codex plugin management facade.
 *
 * Enterprise control-plane code must use this module instead of importing
 * app-server internals.  The facade deliberately receives an agent directory
 * and forwards the same auth/session scope to every request.  It never reads
 * or returns Codex credentials.
 */
import path from "node:path";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { CODEX_CONTROL_METHODS, type CodexControlMethod } from "./src/app-server/capabilities.js";
import type { CodexAppServerStartOptions } from "./src/app-server/config.js";
import { codexControlRequest, type CodexControlRequestOptions } from "./src/command-rpc.js";
import { resolveCodexDefaultWorkspaceDir } from "./src/conversation-binding-data.js";
import {
  codexPluginAddAccountUrl,
  readCodexPluginConnectedAccounts,
  type CodexPluginConnectedAccount,
} from "./src/plugin-connected-accounts.js";
import {
  discoverCodexMarketplacePlugins,
  parseCodexPluginMarketplaceId,
  type CodexAvailablePlugin,
} from "./src/plugin-marketplace-discovery.js";
export {
  buildCodexPluginCapabilitySnapshot,
  computeCodexPluginCapabilityDigest,
} from "./src/app-server/native-plugin-grants.js";
export type { CodexNativePluginGrant } from "./src/app-server/native-plugin-grants.js";
import type {
  CodexMcpServerStatus,
  McpServerOauthLoginParams,
  McpServerOauthLoginResponse,
} from "./src/app-server/protocol-mcp.js";
import type {
  CodexAppsInstalledResponse,
  CodexAppsListResponse,
  CodexAppsReadResponse,
  CodexPluginInstalledResponse,
  CodexPluginInstallResponse,
  CodexPluginListResponse,
  CodexPluginReadResponse,
  CodexPluginUninstallParams,
  v2,
} from "./src/app-server/protocol.js";
import { withAbortableTimeout } from "./src/app-server/timeout.js";

const CODEX_PLUGIN_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;
const CODEX_PLUGIN_CATALOG_TIMEOUT_MIN_MS = 1_000;
const CODEX_PLUGIN_CATALOG_TIMEOUT_MAX_MS = 60_000;

/** Inputs needed to bind a facade to one OpenClaw agent and Codex account. */
export type CodexEnterprisePluginRuntimeOptions = {
  /** Live OpenClaw Codex entry; this is read only for request startup. */
  pluginConfig?: unknown;
  /** The same account configuration used by the active agent harness. */
  config?: OpenClawConfig;
  /** Required to prevent accidental fallback to a shared user Codex home. */
  agentDir: string;
  /** Agent workspace used for repo/workspace marketplace discovery. */
  workspaceDir?: string;
  /** Explicit profile selected by the active agent, when one is bound. */
  authProfileId?: string | null;
  sessionKey?: string;
  sessionId?: string;
  startOptions?: CodexAppServerStartOptions;
  timeoutMs?: number;
  isolated?: boolean;
};

/** Stable plugin identity accepted by detail, install, and auth-status calls. */
export type CodexEnterprisePluginReference = {
  /** Canonical `<plugin>@<marketplace>` id, when available. */
  id?: string;
  pluginName?: string;
  marketplaceName?: string;
  /** Absolute local marketplace path returned by Codex discovery. */
  marketplacePath?: string | null;
  /** Backend remote id returned by the Codex marketplace. */
  remotePluginId?: string | null;
};

export type CodexEnterprisePluginCatalog = {
  plugins: CodexAvailablePlugin[];
  warnings: string[];
};

export type CodexEnterprisePluginInstallOptions = {
  installAttemptId?: string;
  refresh?: boolean;
};

export type CodexEnterprisePluginInstallResult = {
  plugin: CodexAvailablePlugin;
  response: CodexPluginInstallResponse;
  /** Confirmed by a fresh plugin/installed read after Codex accepted install. */
  verified: boolean;
  refreshed: boolean;
  /** Stable labels for refresh work that the pinned Codex server did not support. */
  refreshFailures?: string[];
};

export type CodexEnterprisePluginRefreshResult = {
  catalog: CodexEnterprisePluginCatalog;
  installed: CodexPluginInstalledResponse;
  apps: CodexAppsListResponse;
  installedApps: CodexAppsInstalledResponse;
  /** Optional reconciliation calls are reported individually and never hidden. */
  optionalFailures: string[];
};

export type CodexEnterprisePluginAppAuthStatus = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  accessible: boolean;
  enabled: boolean;
  callable: boolean;
  needsAuth: boolean;
  metadataAvailable: boolean;
  runtimeState: "available" | "missing" | "unavailable";
  /** Safe provider-owned URL returned by Codex for connector setup. */
  installUrl?: string | null;
  accounts?: CodexPluginConnectedAccount[];
  accountsStatus?: "available" | "unavailable";
  addAccountUrl?: string | null;
};

export type CodexEnterprisePluginMcpAuthStatus = {
  name: string;
  pluginId?: string | null;
  authStatus: NonNullable<CodexMcpServerStatus["authStatus"]>;
  runtimeStatus?: CodexMcpServerStatus["runtimeStatus"];
  needsAuth: boolean;
  ready: boolean;
};

/** Connector readiness and setup URLs; never includes credentials or raw provider errors. */
export type CodexEnterprisePluginAuthStatus = {
  pluginId: string;
  installed: boolean;
  enabled: boolean;
  authPolicy?: string;
  needsAuth: boolean;
  ready: boolean;
  apps: CodexEnterprisePluginAppAuthStatus[];
  mcpServers: CodexEnterprisePluginMcpAuthStatus[];
  /** Connector setup URLs that can be opened by the current signed-in user. */
  connectUrls: string[];
  statusError?: "metadata_unavailable" | "runtime_unavailable" | "mcp_unavailable";
  statusErrors?: Array<"metadata_unavailable" | "runtime_unavailable" | "mcp_unavailable">;
};

export type CodexEnterprisePluginAuthStatusOptions = {
  threadId?: string;
  /** Explicit refresh for setup completion; false uses the committed snapshot. */
  forceRefresh?: boolean;
};

export type CodexEnterprisePluginMcpAuthOptions = {
  /** Exact reviewed plugin ownership; never inferred from the server name. */
  expectedPluginId?: string;
  threadId?: string;
  clientRegistration?: "auto" | "cimd" | "dcr";
  scopes?: string[];
  timeoutSecs?: number;
};

export type CodexEnterprisePluginMcpAuthResult = {
  name: string;
  authorizationUrl: string;
};

export type CodexEnterprisePluginRuntime = {
  listCatalog(params?: {
    workspaceDir?: string;
    forceRefetch?: boolean;
  }): Promise<CodexEnterprisePluginCatalog>;
  listInstalled(params?: {
    workspaceDir?: string;
    installSuggestionPluginNames?: string[];
  }): Promise<CodexPluginInstalledResponse>;
  readPlugin(reference: CodexEnterprisePluginReference): Promise<v2.PluginDetail>;
  installPlugin(
    reference: CodexEnterprisePluginReference,
    options?: CodexEnterprisePluginInstallOptions,
  ): Promise<CodexEnterprisePluginInstallResult>;
  uninstallPlugin(pluginId: string): Promise<void>;
  readAuthStatus(
    reference: CodexEnterprisePluginReference,
    options?: CodexEnterprisePluginAuthStatusOptions,
  ): Promise<CodexEnterprisePluginAuthStatus>;
  /** Starts Codex's MCP OAuth flow and returns only its validated browser URL. */
  beginMcpOAuthLogin(
    serverName: string,
    options?: CodexEnterprisePluginMcpAuthOptions,
  ): Promise<CodexEnterprisePluginMcpAuthResult>;
  refresh(params?: {
    workspaceDir?: string;
    threadId?: string;
  }): Promise<CodexEnterprisePluginRefreshResult>;
};

type RuntimeRequest = (method: CodexControlMethod, params?: unknown) => Promise<unknown>;

/**
 * Creates a request-scoped Codex plugin management runtime.
 *
 * `agentDir` is intentionally required.  A caller that has only a user-level
 * Codex home must first resolve the active agent binding; silently falling
 * back here would allow one enterprise account to observe another account's
 * installed plugins or connector state.
 */
export function createCodexEnterprisePluginRuntime(
  options: CodexEnterprisePluginRuntimeOptions,
): CodexEnterprisePluginRuntime {
  const agentDir = options.agentDir.trim();
  if (!agentDir) {
    throw new Error("Codex plugin management requires an agent-scoped agentDir");
  }
  const defaultWorkspaceDir =
    options.workspaceDir?.trim() || resolveCodexDefaultWorkspaceDir(options.pluginConfig);

  const requestOptions: CodexControlRequestOptions = {
    config: options.config,
    agentDir,
    ...(options.authProfileId !== undefined ? { authProfileId: options.authProfileId } : {}),
    ...(options.sessionKey ? { sessionKey: options.sessionKey } : {}),
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    ...(options.startOptions ? { startOptions: options.startOptions } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.isolated !== undefined ? { isolated: options.isolated } : {}),
  };
  const request: RuntimeRequest = async (method, params) =>
    await codexControlRequest(options.pluginConfig, method, params as never, requestOptions);

  const catalogCache = new Map<string, CodexEnterprisePluginCatalog>();

  const listMcpStatuses = async (threadId?: string): Promise<CodexMcpServerStatus[]> => {
    const statuses: CodexMcpServerStatus[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = (await request(CODEX_CONTROL_METHODS.listMcpServers, {
        ...(threadId ? { threadId } : {}),
        ...(cursor ? { cursor } : {}),
        detail: "full",
      })) as { data: CodexMcpServerStatus[]; nextCursor?: string | null };
      statuses.push(...page.data);
      const next = page.nextCursor;
      if (!next) break;
      // Codex v2 MCP inventory is paginated. Never treat a truncated inventory
      // or repeated cursor as proof that a reviewed server is missing.
      if (cursors.has(next) || cursors.size >= 100) {
        throw new Error("Codex MCP inventory pagination did not complete");
      }
      cursors.add(next);
      cursor = next;
    } while (cursor);
    return statuses;
  };

  const listCatalog = async (
    params: {
      workspaceDir?: string;
      forceRefetch?: boolean;
    } = {},
  ): Promise<CodexEnterprisePluginCatalog> => {
    const workspaceDir = params.workspaceDir?.trim() || defaultWorkspaceDir;
    if (!params.forceRefetch) {
      const cached = catalogCache.get(workspaceDir);
      if (cached) {
        return cached;
      }
    }
    const discovered = await withAbortableTimeout({
      timeoutMs: resolveCatalogTimeoutMs(options.timeoutMs),
      timeoutMessage: "Codex plugin catalog discovery timed out",
      promise: discoverCodexMarketplacePlugins({
        workspaceDir,
        includeSupplemental: false,
        request: async (listParams) =>
          (await request(CODEX_CONTROL_METHODS.listPlugins, {
            ...listParams,
            ...(params.forceRefetch ? { forceRefetch: true } : {}),
          })) as CodexPluginListResponse,
      }),
    });
    catalogCache.set(workspaceDir, discovered);
    return discovered;
  };

  const listInstalled = async (
    params: {
      workspaceDir?: string;
      installSuggestionPluginNames?: string[];
    } = {},
  ): Promise<CodexPluginInstalledResponse> => {
    const workspaceDir = params.workspaceDir?.trim() || defaultWorkspaceDir;
    return (await request(CODEX_CONTROL_METHODS.installedPlugins, {
      cwds: [workspaceDir],
      ...(params.installSuggestionPluginNames?.length
        ? { installSuggestionPluginNames: params.installSuggestionPluginNames }
        : {}),
    })) as CodexPluginInstalledResponse;
  };

  const readPlugin = async (
    reference: CodexEnterprisePluginReference,
  ): Promise<v2.PluginDetail> => {
    let normalized = normalizePluginReference(reference);
    if (!normalized.marketplacePath) {
      const catalog = await listCatalog();
      const discovered = findCatalogPlugin(catalog.plugins, normalized);
      if (discovered) {
        normalized = normalizePluginReference({
          ...reference,
          pluginName: discovered.pluginName,
          marketplaceName: discovered.marketplaceName,
          marketplacePath: discovered.marketplacePath,
          remotePluginId: discovered.remotePluginId,
        });
      } else if (!normalized.remotePluginId) {
        throw new Error(`Codex plugin ${normalized.id} was not found in the current catalog`);
      }
    }
    const response = (await request(CODEX_CONTROL_METHODS.readPlugin, {
      ...(normalized.marketplacePath
        ? { marketplacePath: normalized.marketplacePath }
        : { remoteMarketplaceName: normalized.marketplaceName }),
      pluginName: normalized.marketplacePath
        ? normalized.pluginName
        : (normalized.remotePluginId ?? normalized.pluginName),
    })) as CodexPluginReadResponse;
    if (!response?.plugin) {
      throw new Error("Codex plugin detail was empty");
    }
    return response.plugin;
  };

  const installPlugin = async (
    reference: CodexEnterprisePluginReference,
    installOptions: CodexEnterprisePluginInstallOptions = {},
  ): Promise<CodexEnterprisePluginInstallResult> => {
    const normalized = normalizePluginReference(reference);
    const catalog = await listCatalog({ forceRefetch: true });
    const plugin = findCatalogPlugin(catalog.plugins, normalized);
    if (!plugin) {
      throw new Error(`Codex plugin ${normalized.id} was not found in the current catalog`);
    }
    if (!plugin.available) {
      throw new Error(`Codex plugin ${plugin.id} is unavailable for installation`);
    }
    if (!plugin.marketplacePath && !plugin.remotePluginId) {
      throw new Error(`Codex plugin ${plugin.id} has no remote installation identity`);
    }
    const attemptId = installOptions.installAttemptId?.trim();
    const response = (await request(CODEX_CONTROL_METHODS.installPlugin, {
      ...(plugin.marketplacePath
        ? { marketplacePath: plugin.marketplacePath }
        : { remoteMarketplaceName: plugin.marketplaceName }),
      pluginName: plugin.marketplacePath
        ? plugin.pluginName
        : (plugin.remotePluginId ?? plugin.pluginName),
      ...(attemptId ? { installAttemptId: attemptId.slice(0, 256) } : {}),
    })) as CodexPluginInstallResponse;
    const installedAfter = await listInstalled({ workspaceDir: defaultWorkspaceDir });
    if (!hasInstalledPlugin(installedAfter, plugin.id)) {
      throw new Error(`Codex plugin ${plugin.id} was not present after installation`);
    }
    catalogCache.delete(defaultWorkspaceDir);
    let refreshed = false;
    const refreshFailures: string[] = [];
    if (installOptions.refresh !== false) {
      try {
        const refreshResult = await refresh({ workspaceDir: defaultWorkspaceDir });
        refreshed = true;
        refreshFailures.push(...refreshResult.optionalFailures);
      } catch {
        // Codex 0.148 accepts plugin/install and plugin/installed even when an
        // optional app/skills/hooks reconciliation method is unavailable. The
        // install remains successful and the caller receives a retryable label.
        refreshFailures.push("required_refresh_unavailable");
      }
    }
    return {
      plugin: { ...plugin, installed: true },
      response,
      verified: true,
      refreshed,
      ...(refreshFailures.length > 0 ? { refreshFailures } : {}),
    };
  };

  const uninstallPlugin = async (pluginId: string): Promise<void> => {
    const normalizedId = normalizePluginId(pluginId);
    const installed = await listInstalled();
    if (!hasInstalledPlugin(installed, normalizedId)) {
      throw new Error(`Codex plugin ${normalizedId} is not installed for this agent`);
    }
    await request(CODEX_CONTROL_METHODS.uninstallPlugin, {
      pluginId: normalizedId,
    } satisfies CodexPluginUninstallParams);
    const installedAfter = await listInstalled();
    if (hasInstalledPlugin(installedAfter, normalizedId)) {
      throw new Error(`Codex plugin ${normalizedId} was still installed after removal`);
    }
    catalogCache.delete(defaultWorkspaceDir);
    // Reconcile all app/runtime surfaces after removal.  The caller can also
    // invoke refresh explicitly when it needs the resulting catalog payload.
    try {
      await refresh({ workspaceDir: defaultWorkspaceDir });
    } catch {
      // Removal was already post-verified. A pinned server may lack one of the
      // optional reconciliation methods, so leave refresh to the next read.
    }
  };

  const readAuthStatus = async (
    reference: CodexEnterprisePluginReference,
    statusOptions: CodexEnterprisePluginAuthStatusOptions = {},
  ): Promise<CodexEnterprisePluginAuthStatus> => {
    const detail = await readPlugin(reference);
    const pluginId = canonicalDetailPluginId(detail, reference);
    const appSummaries = detail.apps ?? [];
    const appIds = appSummaries.map((app) => app.id).filter(Boolean);

    let metadata: CodexAppsReadResponse | undefined;
    let metadataFailed = false;
    if (appIds.length > 0) {
      try {
        metadata = (await request(CODEX_CONTROL_METHODS.readApps, {
          appIds,
          ...(statusOptions.threadId ? { threadId: statusOptions.threadId } : {}),
          includeTools: true,
        })) as CodexAppsReadResponse;
      } catch {
        metadataFailed = true;
      }
    }

    // app/read deliberately returns connector metadata only.  Accessibility
    // and enablement are authoritative in app/list, so do not infer them from
    // metadata presence; doing so reports an unauthorised connector as ready.
    const appInventory: CodexAppsListResponse["data"] = [];
    if (appIds.length > 0) {
      try {
        let cursor: string | undefined;
        const seenCursors = new Set<string>();
        do {
          const page = (await request(CODEX_CONTROL_METHODS.listApps, {
            limit: 100,
            ...(cursor ? { cursor } : {}),
            ...(statusOptions.threadId ? { threadId: statusOptions.threadId } : {}),
            forceRefetch: !cursor && statusOptions.forceRefresh !== false,
          })) as CodexAppsListResponse;
          appInventory.push(...page.data);
          if (appIds.every((id) => appInventory.some((app) => app.id === id))) break;
          const next = page.nextCursor;
          if (!next) break;
          if (seenCursors.has(next) || seenCursors.size >= 100) {
            throw new Error("Codex app inventory pagination did not complete");
          }
          seenCursors.add(next);
          cursor = next;
        } while (cursor);
      } catch {
        metadataFailed = true;
      }
    }

    let installed: CodexAppsInstalledResponse | undefined;
    let runtimeFailed = false;
    if (appIds.length > 0) {
      try {
        installed = (await request(CODEX_CONTROL_METHODS.installedApps, {
          ...(statusOptions.threadId ? { threadId: statusOptions.threadId } : {}),
          forceRefresh: statusOptions.forceRefresh !== false,
        })) as CodexAppsInstalledResponse;
        if (statusOptions.forceRefresh === true) {
          // app/installed publishes a new hosted-tool snapshot; existing Codex
          // threads also need their MCP runtime invalidated after account changes.
          // Codex's reload preserves each thread's policy/config overrides.
          await request(CODEX_CONTROL_METHODS.reloadMcpServers, undefined);
        }
      } catch {
        runtimeFailed = true;
      }
    }

    const metadataById = new Map((metadata?.apps ?? []).map((app) => [app.id, app] as const));
    const inventoryById = new Map(appInventory.map((app) => [app.id, app] as const));
    const installedById = new Map((installed?.apps ?? []).map((app) => [app.id, app] as const));
    const connectedAccounts = await readCodexPluginConnectedAccounts(options, appIds);
    const apps = appSummaries.map((summary) => {
      const app = metadataById.get(summary.id);
      const inventory = inventoryById.get(summary.id);
      const runtime = installedById.get(summary.id);
      const accessible = inventory?.isAccessible === true;
      const enabled = runtime?.enabled ?? inventory?.isEnabled ?? false;
      const callable = runtime?.callable === true;
      const installUrl = safeBrowserUrl(
        app?.installUrl ?? inventory?.installUrl ?? summary.installUrl,
      );
      return {
        id: summary.id,
        name: app?.name ?? summary.name,
        description: app?.description ?? inventory?.description ?? summary.description ?? null,
        logoUrl: safeBrowserUrl(app?.iconUrl ?? inventory?.logoUrl) ?? null,
        logoDarkUrl: safeBrowserUrl(app?.iconUrlDark ?? inventory?.logoUrlDark) ?? null,
        accessible,
        enabled,
        callable,
        needsAuth: !accessible,
        metadataAvailable: app !== undefined,
        runtimeState: runtime ? "available" : runtimeFailed ? "unavailable" : "missing",
        ...(installUrl ? { installUrl } : {}),
        accounts: connectedAccounts?.get(summary.id) ?? [],
        accountsStatus: connectedAccounts ? "available" : "unavailable",
        addAccountUrl: codexPluginAddAccountUrl({ id: summary.id, installUrl }),
      } satisfies CodexEnterprisePluginAppAuthStatus;
    });
    let mcpStatuses: CodexMcpServerStatus[] = [];
    let mcpFailed = false;
    if ((detail.mcpServers ?? []).length > 0) {
      try {
        mcpStatuses = await listMcpStatuses(statusOptions.threadId);
      } catch {
        mcpFailed = true;
      }
    }
    const mcpByName = new Map(mcpStatuses.map((status) => [status.name, status] as const));
    const mcpServers = (detail.mcpServers ?? []).map((name) => {
      const candidate = mcpByName.get(name);
      const status = candidate?.pluginId === pluginId ? candidate : undefined;
      const authStatus = status?.authStatus ?? "unknown";
      const runtimeStatus = status?.runtimeStatus;
      const needsAuth =
        status === undefined ||
        authStatus === "notLoggedIn" ||
        runtimeStatus === "authenticationRequired";
      return {
        name,
        ...(status?.pluginId !== undefined ? { pluginId: status.pluginId } : {}),
        authStatus,
        ...(runtimeStatus !== undefined ? { runtimeStatus } : {}),
        needsAuth,
        ready:
          status !== undefined &&
          (runtimeStatus != null
            ? runtimeStatus === "connected"
            : Boolean(status.serverInfo) ||
              Object.keys(status.tools).length > 0 ||
              (status.resources?.length ?? 0) > 0 ||
              (status.resourceTemplates?.length ?? 0) > 0) &&
          authStatus !== "unknown" &&
          authStatus !== "notLoggedIn",
      } satisfies CodexEnterprisePluginMcpAuthStatus;
    });
    const needsAuth =
      apps.some((app) => app.needsAuth) || mcpServers.some((server) => server.needsAuth);
    const statusErrors = [
      ...(metadataFailed ? (["metadata_unavailable"] as const) : []),
      ...(runtimeFailed ? (["runtime_unavailable"] as const) : []),
      ...(mcpFailed ? (["mcp_unavailable"] as const) : []),
    ];
    return {
      pluginId,
      installed: detail.summary.installed,
      enabled: detail.summary.enabled,
      ...(detail.summary.authPolicy ? { authPolicy: detail.summary.authPolicy } : {}),
      needsAuth,
      ready:
        detail.summary.installed &&
        detail.summary.enabled &&
        statusErrors.length === 0 &&
        !needsAuth &&
        apps.every((app) => app.callable) &&
        mcpServers.every((server) => server.ready),
      apps,
      mcpServers,
      connectUrls: apps.flatMap((app) => (app.needsAuth && app.installUrl ? [app.installUrl] : [])),
      ...(statusErrors[0] ? { statusError: statusErrors[0] } : {}),
      ...(statusErrors.length > 0 ? { statusErrors: [...statusErrors] } : {}),
    };
  };

  const beginMcpOAuthLogin = async (
    serverName: string,
    authOptions: CodexEnterprisePluginMcpAuthOptions = {},
  ): Promise<CodexEnterprisePluginMcpAuthResult> => {
    const name = serverName.trim();
    if (!name || name.length > 256) {
      throw new Error("Codex MCP server name is invalid");
    }
    const statuses = await listMcpStatuses(authOptions.threadId);
    if (
      !statuses.some(
        (status) =>
          status.name === name &&
          (!authOptions.expectedPluginId || status.pluginId === authOptions.expectedPluginId),
      )
    ) {
      throw new Error("Codex MCP server is not available in the current agent scope");
    }
    const response = (await request(CODEX_CONTROL_METHODS.loginMcpServer, {
      name,
      ...(authOptions.threadId ? { threadId: authOptions.threadId } : {}),
      ...(authOptions.clientRegistration
        ? { clientRegistration: authOptions.clientRegistration }
        : {}),
      ...(authOptions.scopes?.length ? { scopes: authOptions.scopes } : {}),
      ...(authOptions.timeoutSecs !== undefined ? { timeoutSecs: authOptions.timeoutSecs } : {}),
    } satisfies McpServerOauthLoginParams)) as McpServerOauthLoginResponse;
    const authorizationUrl = safeBrowserUrl(response?.authorizationUrl);
    if (!authorizationUrl) {
      throw new Error("Codex MCP OAuth returned no safe authorization URL");
    }
    return { name, authorizationUrl };
  };

  const refresh = async (
    params: {
      workspaceDir?: string;
      threadId?: string;
    } = {},
  ): Promise<CodexEnterprisePluginRefreshResult> => {
    const workspaceDir = params.workspaceDir?.trim() || defaultWorkspaceDir;
    // Catalog and installed-plugin state are required because callers use this
    // result to decide whether a mutation actually took effect.
    const [catalog, installed] = await Promise.all([
      listCatalog({ workspaceDir, forceRefetch: true }),
      listInstalled({ workspaceDir }),
    ]);
    const optionalFailures: string[] = [];
    let apps: CodexAppsListResponse = { data: [] };
    let installedApps: CodexAppsInstalledResponse = { apps: [] };
    try {
      apps = (await request(CODEX_CONTROL_METHODS.listApps, {
        limit: 100,
        ...(params.threadId ? { threadId: params.threadId } : {}),
        forceRefetch: true,
      })) as CodexAppsListResponse;
    } catch {
      optionalFailures.push("apps_list");
    }
    try {
      installedApps = (await request(CODEX_CONTROL_METHODS.installedApps, {
        ...(params.threadId ? { threadId: params.threadId } : {}),
        forceRefresh: true,
      })) as CodexAppsInstalledResponse;
    } catch {
      optionalFailures.push("apps_installed");
    }
    try {
      await request(CODEX_CONTROL_METHODS.listSkills, {
        cwds: [workspaceDir],
        forceReload: true,
      });
    } catch {
      optionalFailures.push("skills_list");
    }
    try {
      await request(CODEX_CONTROL_METHODS.listHooks, { cwds: [workspaceDir] });
    } catch {
      optionalFailures.push("hooks_list");
    }
    try {
      await request(CODEX_CONTROL_METHODS.reloadMcpServers, undefined);
    } catch {
      optionalFailures.push("mcp_reload");
    }
    return { catalog, installed, apps, installedApps, optionalFailures };
  };

  return {
    listCatalog,
    listInstalled,
    readPlugin,
    installPlugin,
    uninstallPlugin,
    readAuthStatus,
    beginMcpOAuthLogin,
    refresh,
  };
}

function normalizePluginReference(reference: CodexEnterprisePluginReference): {
  id: string;
  pluginName: string;
  marketplaceName: string;
  marketplacePath?: string;
  remotePluginId?: string;
} {
  const parsed = reference.id ? parseCodexPluginMarketplaceId(reference.id.trim()) : undefined;
  const pluginName = (reference.pluginName?.trim() || parsed?.pluginName || "").trim();
  const marketplaceName = (
    reference.marketplaceName?.trim() ||
    parsed?.marketplaceName ||
    ""
  ).trim();
  const marketplacePath = reference.marketplacePath?.trim() || undefined;
  const remotePluginId = reference.remotePluginId?.trim() || undefined;
  if (!CODEX_PLUGIN_SEGMENT.test(pluginName) || !CODEX_PLUGIN_SEGMENT.test(marketplaceName)) {
    throw new Error("Codex plugin identity is invalid");
  }
  if (marketplacePath && !path.isAbsolute(marketplacePath)) {
    throw new Error("Codex marketplacePath must be absolute");
  }
  return {
    id: `${pluginName}@${marketplaceName}`,
    pluginName,
    marketplaceName,
    ...(marketplacePath ? { marketplacePath } : {}),
    ...(remotePluginId ? { remotePluginId } : {}),
  };
}

function normalizePluginId(value: string): string {
  const parsed = parseCodexPluginMarketplaceId(value.trim());
  if (!parsed) {
    throw new Error("Codex plugin id must use <plugin>@<marketplace> form");
  }
  return `${parsed.pluginName}@${parsed.marketplaceName}`;
}

function findCatalogPlugin(
  plugins: readonly CodexAvailablePlugin[],
  reference: ReturnType<typeof normalizePluginReference>,
): CodexAvailablePlugin | undefined {
  const exact = plugins.find((plugin) => {
    if (
      plugin.pluginName !== reference.pluginName ||
      !sameCodexMarketplace(plugin.marketplaceName, reference.marketplaceName)
    ) {
      return false;
    }
    return !reference.marketplacePath || plugin.marketplacePath === reference.marketplacePath;
  });
  if (exact) {
    return exact;
  }
  return plugins.find(
    (plugin) =>
      plugin.pluginName === reference.pluginName &&
      sameCodexMarketplace(plugin.marketplaceName, reference.marketplaceName) &&
      (!reference.marketplacePath || plugin.marketplacePath === reference.marketplacePath),
  );
}

function hasInstalledPlugin(response: CodexPluginInstalledResponse, pluginId: string): boolean {
  const parsedTarget = parseCodexPluginMarketplaceId(pluginId);
  if (!parsedTarget) {
    return false;
  }
  return response.marketplaces.some((marketplace) =>
    marketplace.plugins.some((plugin) => {
      if (
        !plugin.installed ||
        !sameCodexMarketplace(marketplace.name, parsedTarget.marketplaceName)
      ) {
        return false;
      }
      const parsedPluginId = parseCodexPluginMarketplaceId(plugin.id);
      return parsedPluginId
        ? parsedPluginId.pluginName === parsedTarget.pluginName &&
            sameCodexMarketplace(parsedPluginId.marketplaceName, parsedTarget.marketplaceName)
        : plugin.name === parsedTarget.pluginName;
    }),
  );
}

function sameCodexMarketplace(left: string, right: string): boolean {
  // A grant is bound to the exact discovered marketplace identity.  The
  // curated wire names are placement-specific and must not authorize one
  // another during install or post-install verification.
  return left === right;
}

function safeBrowserUrl(value: string | null | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 2_048) {
    return undefined;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function resolveCatalogTimeoutMs(value: number | undefined): number {
  const timeoutMs =
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 30_000;
  return Math.min(
    CODEX_PLUGIN_CATALOG_TIMEOUT_MAX_MS,
    Math.max(CODEX_PLUGIN_CATALOG_TIMEOUT_MIN_MS, Math.floor(timeoutMs)),
  );
}

function canonicalDetailPluginId(
  detail: v2.PluginDetail,
  reference: CodexEnterprisePluginReference,
): string {
  const summaryId = detail.summary.id?.trim();
  if (summaryId && parseCodexPluginMarketplaceId(summaryId)) {
    return summaryId;
  }
  return normalizePluginReference(reference).id;
}
