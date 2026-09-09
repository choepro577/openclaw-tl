import type { OpenClawConfig } from "../config/types.openclaw.js";
import type { EnterpriseKnowledgeAuthority } from "../enterprise/knowledge/authority.js";
import { generateSecureUuid } from "../infra/secure-random.js";

export type GatewayEnterpriseDelegationSpecialist = {
  agentId: string;
  name: string;
  description: string;
  assigned: boolean;
  effective: boolean;
  routable: boolean;
  effectiveMode: "auto_when_certain" | "confirm_before_handoff" | "explicit_only" | "disabled";
  reasonCodes: string[];
};

export type GatewayEnterpriseDelegationTurn = {
  decisionId?: string;
  planId?: string;
  planRevision?: number;
  handling?: "direct" | "knowledge" | "specialist" | "hybrid";
  outcome: "delegate" | "clarify" | "local" | "blocked" | "shadow";
  source: "explicit" | "rule" | "ai" | "system";
  agentNames: string[];
  instruction: string;
  /** User-facing text for a server-owned clarification; never inferred from instruction prose. */
  clarificationQuestion?: string;
  reasonCode: string;
};
import { resolveGlobalSingleton } from "../shared/global-singleton.js";

const GATEWAY_REQUEST_SCOPED_CONFIGS_KEY = Symbol.for(
  "openclaw.gateway.requestScopedRuntimeConfigs",
);

const gatewayRequestScopedConfigs = resolveGlobalSingleton<WeakSet<OpenClawConfig>>(
  GATEWAY_REQUEST_SCOPED_CONFIGS_KEY,
  () => new WeakSet(),
);

const gatewayRequestConfigIdentities = resolveGlobalSingleton<WeakMap<OpenClawConfig, string>>(
  Symbol.for("openclaw.gateway.requestScopedRuntimeConfigIdentities"),
  () => new WeakMap(),
);

/** Runtime metadata is request-private even when two configs serialize identically. */
export function getGatewayRequestRuntimeConfigIdentity(config: OpenClawConfig): string | undefined {
  if (!isGatewayRequestScopedRuntimeConfig(config)) return undefined;
  let identity = gatewayRequestConfigIdentities.get(config);
  if (!identity) {
    identity = generateSecureUuid();
    gatewayRequestConfigIdentities.set(config, identity);
  }
  return identity;
}

export type GatewayRequestRuntimeMetadata = {
  /** Authoritative account grants, resolved for the current Agent and harness owner. */
  nativePluginGrants?: (
    agentId: string,
    harnessPluginId: string,
  ) => readonly { pluginName: string; marketplaceName: string; capabilityDigest?: string | null }[];
  enterpriseUser?: {
    accountId: string;
    displayName: string;
    personalAgentId: string;
    personalAgentTemplateId: string;
  };
  enterpriseKnowledge?: {
    createAuthority(agentId: string): EnterpriseKnowledgeAuthority;
  };
  enterpriseDelegation?: {
    accountId: string;
    personalAgentId: string;
    specialists: GatewayEnterpriseDelegationSpecialist[];
    resolveExplicitAgentIds?: (prompt: string) => string[];
    request?: { sessionKey: string; parentRunId: string };
    turn?: GatewayEnterpriseDelegationTurn;
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
