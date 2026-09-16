// Resolves persisted session model metadata without loading Gateway projections.
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import type { SessionEntry } from "../config/sessions/types.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { getCurrentPluginMetadataSnapshotRuntime } from "../plugins/plugin-metadata-snapshot.runtime.js";
import { getActivePluginRegistryWorkspaceDirFromStateCore } from "../plugins/runtime-workspace-state.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./defaults.js";
import type { ModelManifestNormalizationContext } from "./model-ref-shared.js";
import {
  inferUniqueProviderFromConfiguredModels,
  normalizeStoredOverrideModel,
  parseModelRef,
  resolveConfiguredModelRef,
  resolveDefaultModelForAgent,
  resolvePersistedSelectedModelRef,
} from "./model-selection.js";

type SessionModelEntry =
  | SessionEntry
  | Pick<SessionEntry, "model" | "modelProvider" | "modelOverride" | "providerOverride">;

type SessionModelRefOptions = {
  allowPluginNormalization?: boolean;
} & ModelManifestNormalizationContext;

function resolveSessionManifestPlugins(
  cfg: OpenClawConfig,
  options?: SessionModelRefOptions,
): ModelManifestNormalizationContext["manifestPlugins"] {
  if (options?.manifestPlugins !== undefined) {
    return options.manifestPlugins;
  }
  // Gateway startup publishes this snapshot before chat requests. Reuse it for
  // persisted model parsing so a session read does not rescan plugin manifests.
  return getCurrentPluginMetadataSnapshotRuntime({
    config: cfg,
    env: process.env,
    workspaceDir: getActivePluginRegistryWorkspaceDirFromStateCore(),
    allowWorkspaceScopedSnapshot: true,
  })?.plugins;
}

export function resolveSessionModelRef(
  cfg: OpenClawConfig,
  entry?: SessionModelEntry,
  agentId?: string,
  options?: SessionModelRefOptions,
): { provider: string; model: string } {
  const manifestPlugins = resolveSessionManifestPlugins(cfg, options);
  const normalizedOverride = normalizeStoredOverrideModel({
    providerOverride: entry?.providerOverride,
    modelOverride: entry?.modelOverride,
  });
  if (normalizedOverride.providerOverride && normalizedOverride.modelOverride) {
    return resolvePersistedSelectedModelRef({
      defaultProvider: normalizedOverride.providerOverride,
      overrideProvider: normalizedOverride.providerOverride,
      overrideModel: normalizedOverride.modelOverride,
      allowPluginNormalization: options?.allowPluginNormalization,
      manifestPlugins,
    })!;
  }
  const runtimeProvider = normalizeOptionalString(entry?.modelProvider);
  const runtimeModel = normalizeOptionalString(entry?.model);

  const resolved = agentId
    ? resolveDefaultModelForAgent({
        cfg,
        agentId,
        allowPluginNormalization: options?.allowPluginNormalization,
        manifestPlugins,
      })
    : resolveConfiguredModelRef({
        cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
        allowPluginNormalization: options?.allowPluginNormalization,
        manifestPlugins,
      });

  const persisted = resolvePersistedSelectedModelRef({
    defaultProvider: resolved.provider || DEFAULT_PROVIDER,
    // Runtime fields record the previous run. Agent-scoped selection must use
    // current config or an explicit override; legacy callers without an agent
    // still use the persisted pair as their fallback selection context.
    runtimeProvider: agentId ? undefined : runtimeProvider,
    runtimeModel: agentId ? undefined : runtimeModel,
    overrideProvider: normalizedOverride.providerOverride,
    overrideModel: normalizedOverride.modelOverride,
    allowPluginNormalization: options?.allowPluginNormalization,
    manifestPlugins,
  });
  return persisted ?? resolved;
}

export function resolveSessionModelIdentityRef(
  cfg: OpenClawConfig,
  entry?: SessionModelEntry,
  agentId?: string,
  fallbackModelRef?: string,
  options?: SessionModelRefOptions,
): { provider?: string; model: string } {
  const runtimeModel = entry?.model?.trim();
  const runtimeProvider = entry?.modelProvider?.trim();
  if (runtimeModel) {
    if (runtimeProvider) {
      return { provider: runtimeProvider, model: runtimeModel };
    }
    const manifestPlugins = resolveSessionManifestPlugins(cfg, options);
    const inferredProvider = inferUniqueProviderFromConfiguredModels({
      cfg,
      model: runtimeModel,
      agentId,
      manifestPlugins,
    });
    if (inferredProvider) {
      return { provider: inferredProvider, model: runtimeModel };
    }
    if (runtimeModel.includes("/")) {
      const parsedRuntime = parseModelRef(runtimeModel, DEFAULT_PROVIDER, {
        allowPluginNormalization: options?.allowPluginNormalization,
        manifestPlugins,
      });
      if (parsedRuntime) {
        return { provider: parsedRuntime.provider, model: parsedRuntime.model };
      }
      return { model: runtimeModel };
    }
    return { model: runtimeModel };
  }
  const fallbackRef = fallbackModelRef?.trim();
  if (fallbackRef) {
    const manifestPlugins = resolveSessionManifestPlugins(cfg, options);
    const parsedFallback = parseModelRef(fallbackRef, DEFAULT_PROVIDER, {
      allowPluginNormalization: options?.allowPluginNormalization,
      manifestPlugins,
    });
    if (parsedFallback) {
      return { provider: parsedFallback.provider, model: parsedFallback.model };
    }
    const inferredProvider = inferUniqueProviderFromConfiguredModels({
      cfg,
      model: fallbackRef,
      agentId,
    });
    if (inferredProvider) {
      return { provider: inferredProvider, model: fallbackRef };
    }
    return { model: fallbackRef };
  }
  const resolved = resolveSessionModelRef(cfg, entry, agentId, options);
  return { provider: resolved.provider, model: resolved.model };
}
