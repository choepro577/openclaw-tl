import type { OpenClawConfig } from "../config/types.openclaw.js";

type GatewayEnterpriseKnowledgeAuthority = {
  readonly accountId: string;
  readonly sessionId: string;
  readonly agentResourceKey: string;
  hasPublishedKnowledge(): boolean;
  search(input: { query: string; maxResults?: number; zoneSlug?: string }): Promise<unknown>;
  get(citationId: string): Promise<unknown>;
  evaluateGrounding(
    finalText: string,
  ): { action: "accept" } | { action: "revise"; instruction: string };
};
import { resolveGlobalSingleton } from "../shared/global-singleton.js";

const GATEWAY_REQUEST_SCOPED_CONFIGS_KEY = Symbol.for(
  "openclaw.gateway.requestScopedRuntimeConfigs",
);

const gatewayRequestScopedConfigs = resolveGlobalSingleton<WeakSet<OpenClawConfig>>(
  GATEWAY_REQUEST_SCOPED_CONFIGS_KEY,
  () => new WeakSet(),
);

export type GatewayRequestRuntimeMetadata = {
  enterpriseUser?: {
    accountId: string;
    displayName: string;
    personalAgentId: string;
  };
  enterpriseKnowledge?: {
    createAuthority(agentId: string): GatewayEnterpriseKnowledgeAuthority;
  };
};

const GATEWAY_REQUEST_SCOPED_METADATA_KEY = Symbol.for(
  "openclaw.gateway.requestScopedRuntimeConfigMetadata",
);

const gatewayRequestScopedMetadata = resolveGlobalSingleton<
  WeakMap<OpenClawConfig, GatewayRequestRuntimeMetadata>
>(GATEWAY_REQUEST_SCOPED_METADATA_KEY, () => new WeakMap());

export function markGatewayRequestScopedRuntimeConfig(
  config: OpenClawConfig,
  metadata?: GatewayRequestRuntimeMetadata,
): OpenClawConfig {
  gatewayRequestScopedConfigs.add(config);
  if (metadata) {
    gatewayRequestScopedMetadata.set(config, metadata);
  }
  return config;
}

export function isGatewayRequestScopedRuntimeConfig(config: OpenClawConfig): boolean {
  return gatewayRequestScopedConfigs.has(config);
}

export function readGatewayRequestRuntimeMetadata(
  config: OpenClawConfig | undefined,
): GatewayRequestRuntimeMetadata | undefined {
  return config ? gatewayRequestScopedMetadata.get(config) : undefined;
}

export function preserveGatewayRequestScopedRuntimeConfig(
  requestConfig: OpenClawConfig | undefined,
  fallbackConfig: OpenClawConfig,
): OpenClawConfig {
  return requestConfig && isGatewayRequestScopedRuntimeConfig(requestConfig)
    ? requestConfig
    : fallbackConfig;
}

export function inheritGatewayRequestScopedRuntimeConfig<T extends OpenClawConfig>(
  sourceConfig: OpenClawConfig,
  resolvedConfig: T,
): T {
  if (isGatewayRequestScopedRuntimeConfig(sourceConfig)) {
    markGatewayRequestScopedRuntimeConfig(
      resolvedConfig,
      readGatewayRequestRuntimeMetadata(sourceConfig),
    );
  }
  return resolvedConfig;
}
