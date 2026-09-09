import type { RuntimeAuthMaterialization } from "../agents/auth-profiles/runtime-materializations.js";
import type { ResolvedPublishedModelCatalogOwner } from "../agents/prepared-model-catalog.types.js";
import type { PreparedModelRuntimeAuthScope } from "../agents/prepared-model-runtime-auth.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { isGatewayRequestScopedRuntimeConfig } from "./request-runtime-config.js";
import type { GatewayRequestContext } from "./server-methods/shared-types.js";
import type { GatewayModelCatalogSnapshot } from "./server-model-catalog.types.js";

export type PreparedGatewayModelCatalogSnapshot = GatewayModelCatalogSnapshot &
  Pick<ResolvedPublishedModelCatalogOwner, "authModes" | "authStore" | "metadataSnapshot"> & {
    authMaterializations: readonly RuntimeAuthMaterialization[];
  };

type GatewayModelCatalogReadParams = {
  agentId?: string;
  agentDir?: string;
  authScope?: PreparedModelRuntimeAuthScope;
  /** Exact per-request config projection that owns this catalog read. */
  config?: OpenClawConfig;
  readOnly?: boolean;
  refreshAuth?: boolean;
  refreshFullCatalog?: boolean;
  workspaceDir?: string;
};

type GatewayModelCatalogPrivateAccess = {
  loadDeferred: (
    params?: GatewayModelCatalogReadParams,
  ) => Promise<PreparedGatewayModelCatalogSnapshot>;
  readPrepared: (
    params?: Omit<GatewayModelCatalogReadParams, "readOnly">,
  ) => Promise<PreparedGatewayModelCatalogSnapshot | undefined>;
};

const privateAccessByLoader = new WeakMap<
  GatewayRequestContext["loadGatewayModelCatalogSnapshot"],
  GatewayModelCatalogPrivateAccess
>();

/** Keeps prepared auth and metadata behind the Gateway-owned loader boundary. */
export function registerGatewayModelCatalogPrivateAccess(
  loader: GatewayRequestContext["loadGatewayModelCatalogSnapshot"],
  access: GatewayModelCatalogPrivateAccess,
): void {
  privateAccessByLoader.set(loader, access);
}

function requirePrivateAccess(
  context: Pick<GatewayRequestContext, "loadGatewayModelCatalogSnapshot">,
): GatewayModelCatalogPrivateAccess {
  const access = privateAccessByLoader.get(context.loadGatewayModelCatalogSnapshot);
  if (!access) {
    throw new Error("Gateway model catalog loader omitted prepared owner access");
  }
  return access;
}

/** Loads the catalog owned by the exact request config when Enterprise projected it per user. */
export async function loadGatewayModelCatalogForRequest(
  context: Pick<
    GatewayRequestContext,
    "getRuntimeConfig" | "loadGatewayModelCatalog" | "loadGatewayModelCatalogSnapshot"
  >,
  agentId: string,
): Promise<Awaited<ReturnType<GatewayRequestContext["loadGatewayModelCatalog"]>>> {
  const config = context.getRuntimeConfig();
  if (!isGatewayRequestScopedRuntimeConfig(config)) {
    return await context.loadGatewayModelCatalog({ agentId });
  }
  return (
    await requirePrivateAccess(context).loadDeferred({
      agentId,
      config,
      readOnly: true,
    })
  ).entries;
}

export async function loadDeferredCatalog(
  context: Pick<GatewayRequestContext, "loadGatewayModelCatalogSnapshot"> &
    Partial<Pick<GatewayRequestContext, "getRuntimeConfig">>,
  agentId: string,
  options: Pick<
    GatewayModelCatalogReadParams,
    "authScope" | "readOnly" | "refreshAuth" | "refreshFullCatalog"
  >,
): Promise<PreparedGatewayModelCatalogSnapshot> {
  const config = context.getRuntimeConfig?.();
  return await requirePrivateAccess(context).loadDeferred({
    agentId,
    ...options,
    ...(config ? { config } : {}),
  });
}

export async function readPreparedCatalog(
  context: Pick<GatewayRequestContext, "loadGatewayModelCatalogSnapshot"> &
    Partial<Pick<GatewayRequestContext, "getRuntimeConfig">>,
  agentId: string,
): Promise<PreparedGatewayModelCatalogSnapshot | undefined> {
  const config = context.getRuntimeConfig?.();
  return await requirePrivateAccess(context).readPrepared({
    agentId,
    ...(config ? { config } : {}),
  });
}
