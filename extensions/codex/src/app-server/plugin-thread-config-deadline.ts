import {
  AgentHarnessPreflightError,
  type EmbeddedRunAttemptParams,
} from "openclaw/plugin-sdk/agent-harness-runtime";
/** Enforces one bounded startup budget across Codex plugin config discovery. */
import {
  defaultCodexAppInventoryCache,
  type CodexAppInventoryCache,
} from "./app-inventory-cache.js";
import type { CodexAppServerClient } from "./client.js";
import {
  resolveCodexPluginsPolicy,
  readCodexPluginConfig,
  type CodexPluginConfig,
  type ResolvedCodexPluginsPolicy,
} from "./config.js";
import { disableCodexPluginThreadConfig } from "./dynamic-tool-build.js";
import {
  assertCodexPluginCapabilityGrants,
  type CodexNativePluginGrant,
  type CodexNativePluginGrantsResolver,
} from "./native-plugin-grants.js";
import {
  resolveRecoverableCodexPluginConfigKeys,
  type CodexPluginRuntimeRequest,
} from "./plugin-inventory.js";
import {
  defaultCodexPluginMetadataCache,
  type CodexPluginMetadataCache,
} from "./plugin-metadata-cache.js";
import {
  buildCodexPluginThreadConfig,
  buildCodexPluginThreadConfigTimeoutFallback,
  shouldBuildCodexPluginThreadConfig,
  type CodexPluginThreadConfig,
} from "./plugin-thread-config.js";
import {
  intersectCodexPluginThreadConfigWithScheduledAuthority,
  readCurrentCodexScheduledAppPolicy as readCurrentCodexScheduledAppPolicyShared,
} from "./scheduled-app-authority.js";
import type { CurrentCodexScheduledAppPolicy } from "./scheduled-app-authority.js";
import { withAbortableTimeout } from "./timeout.js";

const CODEX_PLUGIN_THREAD_CONFIG_MAX_TIMEOUT_MS = 60_000;
const CODEX_PLUGIN_THREAD_CONFIG_TIMEOUT_DIVISOR = 4;
const CODEX_PLUGIN_THREAD_CONFIG_MIN_TIMEOUT_MS = 100;

type CodexPluginThreadConfigDeadlineRequest = (
  method: string,
  params: unknown,
  options: { timeoutMs: number; signal: AbortSignal },
) => Promise<unknown>;

type BuildCodexPluginThreadConfigWithinDeadlineParams = Omit<
  Parameters<typeof buildCodexPluginThreadConfig>[0],
  "request"
> & {
  requestTimeoutMs: number;
  signal: AbortSignal;
  request: CodexPluginThreadConfigDeadlineRequest;
  failClosedOnTimeout?: boolean;
  transform?: (
    config: CodexPluginThreadConfig,
    request: CodexPluginRuntimeRequest,
  ) => Promise<CodexPluginThreadConfig>;
};

class CodexPluginThreadConfigDeadlineError extends Error {
  constructor() {
    super("Codex plugin thread config deadline elapsed");
    this.name = "CodexPluginThreadConfigDeadlineError";
  }
}

/** Resolves the plugin policy state reused throughout app-server startup. */
export function resolveCodexPluginThreadConfigStartupPolicy(params: {
  pluginConfig: CodexPluginConfig;
  nativeToolSurfaceEnabled: boolean;
  scheduledRuntimeAuthority?: EmbeddedRunAttemptParams["scheduledRuntimeAuthority"];
  /** Current account/agent grant resolver. It is consulted for each startup build. */
  nativePluginGrants?: CodexNativePluginGrantsResolver;
}) {
  const pluginThreadConfigRequired =
    Boolean(params.scheduledRuntimeAuthority) ||
    !params.nativeToolSurfaceEnabled ||
    shouldBuildCodexPluginThreadConfig(params.pluginConfig);
  // Restricted runs still need a config so thread/start carries an explicit
  // apps._default denial patch without app inventory discovery.
  const restrictedPluginConfig =
    !params.nativeToolSurfaceEnabled && params.nativePluginGrants
      ? restrictCodexPluginConfigToNativePluginGrants(
          params.pluginConfig,
          params.nativePluginGrants(),
        )
      : params.pluginConfig;
  const pluginThreadConfigPluginConfig =
    params.nativeToolSurfaceEnabled || params.scheduledRuntimeAuthority
      ? restrictedPluginConfig
      : params.nativePluginGrants
        ? restrictedPluginConfig
        : disableCodexPluginThreadConfig(params.pluginConfig);
  const resolvedPluginPolicy = pluginThreadConfigRequired
    ? resolveCodexPluginsPolicy(pluginThreadConfigPluginConfig)
    : undefined;
  return {
    pluginThreadConfigRequired,
    pluginThreadConfigPluginConfig,
    resolvedPluginPolicy,
    enabledPluginConfigKeys: resolvedPluginPolicy
      ? resolvedPluginPolicy.pluginPolicies
          .filter((plugin) => plugin.enabled)
          .map((plugin) => plugin.configKey)
          .toSorted()
      : undefined,
  };
}

/**
 * Projects the configured plugin entries onto the exact account/agent grants.
 * `allow_all_plugins` is always cleared so a grant can never widen the native
 * tool surface; an empty grant snapshot produces an explicit deny-all config.
 */
export function restrictCodexPluginConfigToNativePluginGrants(
  pluginConfig: unknown,
  grants: readonly CodexNativePluginGrant[],
): CodexPluginConfig {
  const config = readCodexPluginConfig(pluginConfig);
  const configuredPlugins = config.codexPlugins?.plugins ?? {};
  const validGrants = grants.filter(
    (grant) => grant.pluginName.trim().length > 0 && grant.marketplaceName.trim().length > 0,
  );
  const plugins: Record<string, (typeof configuredPlugins)[string]> = {};
  for (const grant of validGrants) {
    const existing = Object.entries(configuredPlugins).find(
      ([, entry]) =>
        entry.pluginName === grant.pluginName &&
        entry.marketplaceName !== undefined &&
        sameCodexMarketplace(entry.marketplaceName, grant.marketplaceName),
    );
    // A deliberate per-plugin disable remains authoritative.  Enterprise
    // grants add the reviewed entry when a user has no Codex plugin config,
    // while retaining any explicit app/destructive policy on an existing row.
    if (existing?.[1].enabled === false) {
      continue;
    }
    const configKey = existing?.[0] ?? `${grant.pluginName}@${grant.marketplaceName}`;
    plugins[configKey] = existing?.[1] ?? {
      pluginName: grant.pluginName,
      marketplaceName: grant.marketplaceName,
      enabled: true,
    };
  }
  const explicitlyDisabled = config.codexPlugins?.enabled === false;
  return {
    ...config,
    codexPlugins: {
      ...config.codexPlugins,
      enabled: !explicitlyDisabled && Object.keys(plugins).length > 0,
      allow_all_plugins: false,
      plugins,
    },
  };
}

function sameCodexMarketplace(left: string, right: string): boolean {
  // Enterprise grants are reviewed against the exact marketplace returned by
  // discovery.  Auth/catalog wire aliases are separate identities here.
  return left === right;
}

/** Builds plugin config without allowing sequential RPC timeouts to consume the turn. */
async function buildCodexPluginThreadConfigWithinDeadline(
  params: BuildCodexPluginThreadConfigWithinDeadlineParams,
): Promise<CodexPluginThreadConfig> {
  const { requestTimeoutMs, signal, request, failClosedOnTimeout, transform, ...buildParams } =
    params;
  const timeoutMs = resolveCodexPluginThreadConfigTimeoutMs(requestTimeoutMs);
  // One deadline owns the whole config build; every RPC gets only the remaining
  // budget so discovery cannot consume one full request timeout per call.
  const deadlineMs = Date.now() + timeoutMs;
  const boundedRequest: CodexPluginRuntimeRequest = (method, requestParams) => {
    const remainingTimeoutMs = deadlineMs - Date.now();
    if (remainingTimeoutMs <= 0) {
      throw new CodexPluginThreadConfigDeadlineError();
    }
    return request(method, requestParams, {
      timeoutMs: remainingTimeoutMs,
      signal,
    });
  };
  try {
    return await withAbortableTimeout({
      signal,
      timeoutMs,
      promise: (async () => {
        const config = await buildCodexPluginThreadConfig({
          ...buildParams,
          request: boundedRequest,
        });
        return transform ? await transform(config, boundedRequest) : config;
      })(),
      timeoutMessage: "Codex plugin thread config deadline elapsed",
      createTimeoutError: () => new CodexPluginThreadConfigDeadlineError(),
    });
  } catch (error) {
    if (signal.aborted || !isCodexPluginThreadConfigTimeoutError(error)) {
      throw error;
    }
    if (failClosedOnTimeout) {
      throw new AgentHarnessPreflightError(
        `Scheduled Codex app policy verification exceeded its ${timeoutMs} ms startup budget. No app tools were executed. Retry after Codex app inventory is responsive, or reauthorize the automation.`,
      );
    }
    return buildCodexPluginThreadConfigTimeoutFallback({
      pluginConfig: buildParams.pluginConfig,
      appCacheKey: buildParams.appCacheKey,
      message: `Codex plugin discovery exceeded its ${timeoutMs} ms startup budget; plugin apps were disabled for this turn.`,
    });
  }
}

/** Creates the recovery metadata and bounded builder used by thread startup. */
export function createCodexPluginThreadConfigStartupProvider(params: {
  inputFingerprint: string | undefined;
  enabledPluginConfigKeys: string[] | undefined;
  policy: ResolvedCodexPluginsPolicy | undefined;
  requestTimeoutMs: number;
  signal: AbortSignal;
  pluginConfig?: unknown;
  client: Pick<CodexAppServerClient, "request">;
  configCwd?: string;
  appCache?: CodexAppInventoryCache;
  appCacheKey: string;
  metadataCache?: CodexPluginMetadataCache;
  scheduledRuntimeAuthority?: EmbeddedRunAttemptParams["scheduledRuntimeAuthority"];
  /** Current account/agent grant resolver; checked for every config build. */
  nativePluginGrants?: CodexNativePluginGrantsResolver;
}) {
  const {
    client,
    policy,
    inputFingerprint,
    enabledPluginConfigKeys,
    appCache,
    metadataCache: configuredMetadataCache,
    nativePluginGrants,
    ...buildParams
  } = params;
  const metadataCache = configuredMetadataCache ?? defaultCodexPluginMetadataCache;
  return {
    enabled: true,
    requiresCurrentPolicyCheck: Boolean(params.scheduledRuntimeAuthority || nativePluginGrants),
    inputFingerprint,
    enabledPluginConfigKeys,
    accountAppRecoveryEnabled: policy?.allowAllPlugins,
    recoverablePluginConfigKeys: policy
      ? resolveRecoverableCodexPluginConfigKeys({
          policy,
          metadataCache,
          appCacheKey: params.appCacheKey,
          configCwd: params.configCwd,
        })
      : undefined,
    build: async (buildOptions?: { threadId?: string }) => {
      const currentPluginConfig = nativePluginGrants
        ? restrictCodexPluginConfigToNativePluginGrants(
            buildParams.pluginConfig,
            nativePluginGrants(),
          )
        : buildParams.pluginConfig;
      const config = await buildCodexPluginThreadConfigWithinDeadline({
        ...buildParams,
        pluginConfig: currentPluginConfig,
        appCache: appCache ?? defaultCodexAppInventoryCache,
        metadataCache,
        failClosedOnTimeout: Boolean(params.scheduledRuntimeAuthority),
        transform:
          params.scheduledRuntimeAuthority || nativePluginGrants
            ? async (builtConfig, request) => {
                if (nativePluginGrants) {
                  assertCodexPluginCapabilityGrants({
                    resolver: nativePluginGrants,
                    records: builtConfig.inventory?.records ?? [],
                  });
                }
                return params.scheduledRuntimeAuthority
                  ? intersectCodexPluginThreadConfigWithScheduledAuthority(
                      builtConfig,
                      params.scheduledRuntimeAuthority,
                      await readCurrentCodexScheduledAppPolicy(
                        request,
                        params.configCwd,
                        buildOptions?.threadId,
                      ),
                    )
                  : builtConfig;
              }
            : undefined,
        request: (method, requestParams, options) => client.request(method, requestParams, options),
      });
      return params.scheduledRuntimeAuthority && params.inputFingerprint
        ? { ...config, inputFingerprint: params.inputFingerprint }
        : config;
    },
  };
}

async function readCurrentCodexScheduledAppPolicy(
  request: CodexPluginRuntimeRequest,
  cwd: string | undefined,
  threadId: string | undefined,
): Promise<CurrentCodexScheduledAppPolicy> {
  return await readCurrentCodexScheduledAppPolicyShared({
    request,
    configCwd: cwd,
    threadId,
  });
}

function resolveCodexPluginThreadConfigTimeoutMs(requestTimeoutMs: number): number {
  const finiteRequestTimeoutMs =
    Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
      ? requestTimeoutMs
      : CODEX_PLUGIN_THREAD_CONFIG_MAX_TIMEOUT_MS * CODEX_PLUGIN_THREAD_CONFIG_TIMEOUT_DIVISOR;
  return Math.min(
    CODEX_PLUGIN_THREAD_CONFIG_MAX_TIMEOUT_MS,
    Math.max(
      CODEX_PLUGIN_THREAD_CONFIG_MIN_TIMEOUT_MS,
      Math.floor(finiteRequestTimeoutMs / CODEX_PLUGIN_THREAD_CONFIG_TIMEOUT_DIVISOR),
    ),
  );
}

function isCodexPluginThreadConfigTimeoutError(error: unknown): boolean {
  return (
    error instanceof CodexPluginThreadConfigDeadlineError ||
    (error instanceof Error &&
      "code" in error &&
      error.code === "CODEX_APP_SERVER_LOCAL_REQUEST_CANCELLED" &&
      error.message.endsWith(" timed out"))
  );
}
