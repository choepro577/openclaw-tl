// Fetches the gateway signals behind the Models settings page.
// Each source degrades independently: a missing usage hook or an older
// gateway must not blank the provider list.
import type { SessionModelUsage } from "../../../../src/infra/session-cost-usage.types.js";
import type { GatewayBrowserClient } from "../../api/gateway.ts";
import type {
  ConfigSnapshot,
  ModelAuthStatusResult,
  ModelCatalogEntry,
  ModelCatalogProviderOutcome,
} from "../../api/types.ts";
import { resolveEditableSnapshotConfig } from "../../lib/config/config-state-model.ts";
import { formatUiError } from "../../lib/format-error.ts";
import {
  formatMissingOperatorReadScopeMessage,
  isMissingOperatorReadScopeError,
} from "../../lib/gateway-errors.ts";
import { loadModelAuthStatus } from "../../lib/model-auth.ts";
import {
  requestProviderUsage,
  type ProviderUsageRequestResult,
} from "../../lib/provider-usage-request.ts";
import { requestSessionUsage } from "../../lib/sessions/index.ts";
import { loadModelCatalog } from "../chat/models.ts";

/** Local session-spend window shown on each card. */
export const MODEL_PROVIDERS_COST_DAYS = 30;

export type ModelProvidersData = {
  authStatus: ModelAuthStatusResult | null;
  models: ModelCatalogEntry[] | null;
  providerOutcomes: ModelCatalogProviderOutcome[];
  catalogError: string | null;
  config: Record<string, unknown> | null;
  providerUsage: ProviderUsageRequestResult | null;
  costByProvider: SessionModelUsage[] | null;
  updatedAt: number | null;
  error: string | null;
};

export const EMPTY_MODEL_PROVIDERS_DATA: ModelProvidersData = {
  authStatus: null,
  models: null,
  providerOutcomes: [],
  catalogError: null,
  config: null,
  providerUsage: null,
  costByProvider: null,
  updatedAt: null,
  error: null,
};

export type ModelProviderUsageData = {
  providerUsage: ProviderUsageRequestResult;
  costByProvider: SessionModelUsage[] | null;
};

function localDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown): string {
  if (isMissingOperatorReadScopeError(error)) {
    return formatMissingOperatorReadScopeMessage("model providers");
  }
  return formatUiError(error, "request failed");
}

/**
 * Usage is useful enrichment, but it must not hold the model/provider cards
 * hostage. Enterprise Admin starts this request as a background task while
 * the critical provider data is rendered.
 */
export async function loadModelProviderUsage(
  client: GatewayBrowserClient,
  opts: { signal?: AbortSignal; retryRefreshing?: boolean } = {},
): Promise<ModelProviderUsageData> {
  const providerUsageLoad = requestProviderUsage(
    client,
    opts.signal ? { signal: opts.signal } : undefined,
  ).then(async (result) => {
    if (!opts.retryRefreshing || !result.ok || result.value.refreshing !== true) {
      return result;
    }
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 2_000);
    });
    if (opts.signal?.aborted) {
      throw opts.signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    return await requestProviderUsage(client, opts.signal ? { signal: opts.signal } : undefined);
  });
  const [providerUsage, costByProvider] = await Promise.all([
    providerUsageLoad,
    requestSessionUsage(client, {
      startDate: localDate(MODEL_PROVIDERS_COST_DAYS - 1),
      endDate: localDate(0),
      scope: "family",
      timeZone: "local",
    })
      .then((result) => result?.aggregates?.byProvider ?? null)
      .catch(() => null),
  ]);
  return { providerUsage, costByProvider };
}

export async function loadModelProvidersData(
  client: GatewayBrowserClient,
  opts: {
    agentId: string;
    refresh?: boolean;
    signal?: AbortSignal;
    deferProviderUsage?: boolean;
    configLoad?: Promise<Record<string, unknown> | null>;
  },
): Promise<ModelProvidersData> {
  const request = <T>(method: string, params?: unknown): Promise<T> =>
    opts?.signal
      ? client.request<T>(method, params, { signal: opts.signal })
      : params === undefined
        ? client.request<T>(method)
        : client.request<T>(method, params);
  const catalogLoad = loadModelCatalog(client, {
    agentId: opts.agentId,
    // Settings inventories provider models independently of chat picker allowlists.
    view: "all",
    ...(opts.refresh ? { refresh: true } : { refreshIfDue: true }),
    rejectOnFailure: true,
  }).then(
    (result) => ({ ok: true as const, result }),
    async (error: unknown) => ({
      ok: false as const,
      error,
      result: await loadModelCatalog(client, {
        agentId: opts.agentId,
        view: "all",
        preparedOnly: true,
      }),
    }),
  );
  const usageLoad = opts.deferProviderUsage
    ? Promise.resolve({ providerUsage: null, costByProvider: null })
    : loadModelProviderUsage(client, opts.signal ? { signal: opts.signal } : undefined);
  const [authStatus, catalogResult, config, usage] = await Promise.all([
    loadModelAuthStatus(client, opts).then(
      (result) => ({ ok: true as const, result }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    catalogLoad,
    opts.configLoad ??
      request<ConfigSnapshot>("config.get", {})
        .then((snapshot) => resolveEditableSnapshotConfig(snapshot))
        .catch(() => null),
    usageLoad,
  ]);
  return {
    authStatus:
      authStatus.ok && Array.isArray(authStatus.result?.providers) ? authStatus.result : null,
    models: catalogResult.result.models,
    providerOutcomes: catalogResult.result.providerOutcomes ?? [],
    catalogError: catalogResult.ok ? null : errorMessage(catalogResult.error),
    config,
    providerUsage: usage.providerUsage,
    costByProvider: usage.costByProvider,
    updatedAt: Date.now(),
    // Auth status is the primary provider list; its failure is the only one
    // worth surfacing as a page-level error.
    error: authStatus.ok ? null : errorMessage(authStatus.error),
  };
}
