import { createHash } from "node:crypto";
import {
  asOptionalRecord,
  normalizeOptionalString,
} from "openclaw/plugin-sdk/string-coerce-runtime";
import { parseCodexPluginMarketplaceId } from "../plugin-marketplace-discovery.js";
import type { CodexAppServerClient } from "./client.js";
import { isJsonObject } from "./protocol.js";
import type { CodexListMcpServerStatusResponse, CodexMcpServerStatus, v2 } from "./protocol.js";

/** Exact enterprise grant returned by the active account/agent policy. */
export type CodexNativePluginGrant = Readonly<{
  pluginName: string;
  marketplaceName: string;
  /** Optional review-time capability attestation for this installed plugin. */
  capabilityDigest?: string | null;
}>;

/** Resolves the current grant snapshot; callers must invoke it for every action. */
export type CodexNativePluginGrantsResolver = () => readonly CodexNativePluginGrant[];

/**
 * Trusted ownership facts captured from a plugin detail response.  Native
 * hook tool names are only used as exact lookup keys against this snapshot;
 * the plugin identity is never inferred from a server or tool name.
 */
export type CodexNativePluginMcpServerOwner = Readonly<{
  serverName: string;
  pluginName: string;
  marketplaceName: string;
}>;

export type CodexNativePluginMcpServerOwners = readonly CodexNativePluginMcpServerOwner[];

/** Trusted connector app ownership used by Codex's shared codex_apps server. */
export type CodexNativePluginAppOwner = Readonly<{
  appId: string;
  pluginName: string;
  marketplaceName: string;
}>;

export type CodexNativePluginAppOwners = readonly CodexNativePluginAppOwner[];

export type CodexNativePluginMcpServerOwnerResolver = (
  toolName: string | undefined,
) => CodexNativePluginGrant | undefined;

/** Resolves a tool owner from the live, thread-scoped Codex MCP inventory. */
export type CodexNativePluginMcpToolOwnerResolver = (
  toolName: string | undefined,
) => Promise<CodexNativePluginGrant | undefined>;

export const CODEX_NATIVE_PLUGIN_ACTION_DENIED_MESSAGE =
  "Codex native plugin action denied by current enterprise policy";

const CODEX_APPS_MCP_SERVER = "codex_apps";
const CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_PAGE_SIZE = 100;
const CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_MAX_PAGES = 100;
const CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_TIMEOUT_MS = 5_000;

/** Reads the connector id emitted by Codex for a shared `codex_apps` tool. */
export function readCodexConnectorIdFromTool(tool: unknown): string | undefined {
  const meta = asOptionalRecord(asOptionalRecord(tool)?.["_meta"]);
  return normalizeOptionalString(meta?.connector_id) ?? normalizeOptionalString(meta?.connectorId);
}

export function codexNativePluginGrantKey(grant: CodexNativePluginGrant): string {
  return `${grant.pluginName}@${grant.marketplaceName}`;
}

export function isCodexNativePluginIdAllowed(
  resolver: CodexNativePluginGrantsResolver | undefined,
  pluginId: string | null | undefined,
): boolean {
  if (!resolver) {
    return true;
  }
  const parsed = typeof pluginId === "string" ? parseCodexPluginMarketplaceId(pluginId) : undefined;
  if (!parsed) {
    return false;
  }
  return resolver().some(
    (grant) =>
      grant.pluginName === parsed.pluginName &&
      sameCodexMarketplace(grant.marketplaceName, parsed.marketplaceName),
  );
}

export function assertCodexNativePluginGrant(
  resolver: CodexNativePluginGrantsResolver | undefined,
  pluginId: string | null | undefined,
): void {
  if (!isCodexNativePluginIdAllowed(resolver, pluginId)) {
    throw new Error(`${CODEX_NATIVE_PLUGIN_ACTION_DENIED_MESSAGE} [plugin_grant_missing]`);
  }
}

/**
 * Resolves native MCP tool ownership from a trusted inventory snapshot.
 * Duplicate server names are intentionally marked ambiguous and return no
 * owner, so a caller can fail closed instead of guessing which plugin owns it.
 */
export function createCodexNativePluginMcpServerOwnerResolver(
  owners: CodexNativePluginMcpServerOwners | undefined,
): CodexNativePluginMcpServerOwnerResolver | undefined {
  if (!owners) {
    return undefined;
  }
  const byServer = new Map<string, CodexNativePluginGrant | null>();
  for (const owner of owners) {
    const serverName = owner.serverName.trim();
    const pluginName = owner.pluginName.trim();
    const marketplaceName = owner.marketplaceName.trim();
    if (!serverName || serverName === CODEX_APPS_MCP_SERVER || !pluginName || !marketplaceName) {
      continue;
    }
    const grant = { pluginName, marketplaceName } satisfies CodexNativePluginGrant;
    const existing = byServer.get(serverName);
    if (existing === undefined) {
      byServer.set(serverName, grant);
    } else if (
      existing === null ||
      existing.pluginName !== grant.pluginName ||
      existing.marketplaceName !== grant.marketplaceName
    ) {
      byServer.set(serverName, null);
    }
  }
  return (toolName) => {
    const serverName = readCodexNativeMcpServerName(toolName);
    if (!serverName) {
      return undefined;
    }
    return byServer.get(serverName) ?? undefined;
  };
}

/** Builds ownership facts directly from the plugin inventory detail snapshot. */
export function collectCodexNativePluginMcpServerOwners(
  records: readonly {
    policy: { pluginName: string; marketplaceName: string; enabled: boolean };
    detail?: { mcpServers?: readonly string[] };
  }[],
): CodexNativePluginMcpServerOwners {
  const owners: CodexNativePluginMcpServerOwner[] = [];
  for (const record of records) {
    if (!record.policy.enabled) {
      continue;
    }
    for (const serverName of record.detail?.mcpServers ?? []) {
      owners.push({
        serverName,
        pluginName: record.policy.pluginName,
        marketplaceName: record.policy.marketplaceName,
      });
    }
  }
  return owners;
}

/** Builds the same trusted ownership snapshot from a persisted thread context. */
export function collectCodexNativePluginMcpServerOwnersFromPolicyContext(context: {
  apps: Record<
    string,
    {
      source?: "plugin" | "account";
      pluginName?: string;
      marketplaceName?: string;
      mcpServerNames?: readonly string[];
    }
  >;
}): CodexNativePluginMcpServerOwners {
  const owners: CodexNativePluginMcpServerOwner[] = [];
  for (const entry of Object.values(context.apps)) {
    if (
      entry.source === "account" ||
      !entry.pluginName ||
      !entry.marketplaceName ||
      !entry.mcpServerNames
    ) {
      continue;
    }
    for (const serverName of entry.mcpServerNames) {
      owners.push({
        serverName,
        pluginName: entry.pluginName,
        marketplaceName: entry.marketplaceName,
      });
    }
  }
  return owners;
}

/** Builds exact connector-id ownership without granting the shared server wholesale. */
export function collectCodexNativePluginAppOwnersFromPolicyContext(context: {
  apps: Record<
    string,
    {
      source?: "plugin" | "account";
      pluginName?: string;
      marketplaceName?: string;
    }
  >;
}): CodexNativePluginAppOwners {
  const owners: CodexNativePluginAppOwner[] = [];
  for (const [appId, entry] of Object.entries(context.apps)) {
    if (entry.source === "account" || !entry.pluginName || !entry.marketplaceName) {
      continue;
    }
    owners.push({
      appId,
      pluginName: entry.pluginName,
      marketplaceName: entry.marketplaceName,
    });
  }
  return owners;
}

/**
 * Revalidates a native MCP hook action against both trusted ownership and the
 * current account/agent grant snapshot.  Unknown or ambiguous MCP ownership
 * is denied whenever enterprise grants are active.
 */
export function assertCodexNativePluginToolGrant(params: {
  grants: CodexNativePluginGrantsResolver | undefined;
  ownership: CodexNativePluginMcpServerOwnerResolver | undefined;
  toolName: string | undefined;
}): void {
  if (!params.grants) {
    return;
  }
  const serverName = readCodexNativeMcpServerName(params.toolName);
  if (!serverName) {
    return;
  }
  const owner = params.ownership?.(params.toolName);
  if (!owner) {
    throw new Error(`${CODEX_NATIVE_PLUGIN_ACTION_DENIED_MESSAGE} [tool_owner_unresolved]`);
  }
  assertCodexNativePluginGrant(params.grants, `${owner.pluginName}@${owner.marketplaceName}`);
}

/** Parses Codex's canonical MCP tool route for exact inventory lookup. */
export function readCodexNativeMcpToolRoute(
  toolName: string | undefined,
): { serverName: string; toolName: string } | undefined {
  const normalized = toolName?.trim();
  if (!normalized?.startsWith("mcp__")) {
    return undefined;
  }
  const separator = normalized.indexOf("__", "mcp__".length);
  if (separator <= "mcp__".length) {
    return undefined;
  }
  const serverName = normalized.slice("mcp__".length, separator).trim();
  const routeToolName = normalized.slice(separator + "__".length).trim();
  return serverName && routeToolName ? { serverName, toolName: routeToolName } : undefined;
}

function readCodexNativeMcpServerName(toolName: string | undefined): string | undefined {
  return readCodexNativeMcpToolRoute(toolName)?.serverName;
}

type CodexNativePluginPolicyContext = {
  apps: Record<
    string,
    {
      source?: "plugin" | "account";
      pluginName?: string;
      marketplaceName?: string;
    }
  >;
};

/**
 * Resolves a native MCP tool owner from the exact app-server status snapshot.
 *
 * Plugin MCP servers use the server's explicit `pluginId` when the persisted
 * inventory did not already provide a server owner.  The shared `codex_apps`
 * server is different: its tool metadata carries the connector id, which is
 * joined to the persisted plugin app policy.  There is deliberately no
 * server-wide fallback for `codex_apps`, since that would let one approved
 * connector inherit every other connector's tools.
 */
export async function resolveCodexNativePluginMcpToolOwnerFromStatus(params: {
  client: Pick<CodexAppServerClient, "request">;
  toolName: string | undefined;
  threadId?: string;
  pluginAppPolicyContext?: CodexNativePluginPolicyContext;
  nativePluginMcpServerOwners?: CodexNativePluginMcpServerOwners;
}): Promise<CodexNativePluginGrant | undefined> {
  const route = readCodexNativeMcpToolRoute(params.toolName);
  if (!route) {
    return undefined;
  }

  const staticOwner = createCodexNativePluginMcpServerOwnerResolver(
    params.nativePluginMcpServerOwners,
  )?.(params.toolName);
  // A detail snapshot is already the trusted owner proof for an ordinary
  // plugin server. Avoid a control-plane round trip for every such tool call.
  // The shared connector server must always be resolved per tool below.
  if (route.serverName !== CODEX_APPS_MCP_SERVER && staticOwner) {
    return staticOwner;
  }

  try {
    const statuses = await readCodexNativePluginMcpServerStatuses(params);
    const status = statuses?.find((entry) => entry.name === route.serverName);
    if (!status || !Object.hasOwn(status.tools, route.toolName)) {
      return undefined;
    }
    const rawTool = status.tools[route.toolName];
    if (route.serverName === CODEX_APPS_MCP_SERVER) {
      const connectorId = readCodexConnectorIdFromTool(rawTool);
      if (!connectorId) {
        return undefined;
      }
      const appOwner = params.pluginAppPolicyContext
        ? collectCodexNativePluginAppOwnersFromPolicyContext(params.pluginAppPolicyContext).find(
            (owner) => owner.appId === connectorId,
          )
        : undefined;
      if (!appOwner) {
        return undefined;
      }
      return {
        pluginName: appOwner.pluginName,
        marketplaceName: appOwner.marketplaceName,
      };
    }

    const statusPluginId = normalizeOptionalString(status.pluginId);
    const parsed = statusPluginId ? parseCodexPluginMarketplaceId(statusPluginId) : undefined;
    return parsed
      ? { pluginName: parsed.pluginName, marketplaceName: parsed.marketplaceName }
      : staticOwner;
  } catch {
    // A status lookup failure cannot grant ownership. A prebuilt owner remains
    // usable only for ordinary plugin servers, where it came from detail data.
    return route.serverName === CODEX_APPS_MCP_SERVER ? undefined : staticOwner;
  }
}

async function readCodexNativePluginMcpServerStatuses(params: {
  client: Pick<CodexAppServerClient, "request">;
  threadId?: string;
}): Promise<CodexMcpServerStatus[] | undefined> {
  const statuses: CodexMcpServerStatus[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null | undefined;
  for (let page = 0; page < CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_MAX_PAGES; page += 1) {
    const response = await params.client.request<CodexListMcpServerStatusResponse>(
      "mcpServerStatus/list",
      {
        ...(params.threadId ? { threadId: params.threadId } : {}),
        detail: "toolsAndAuthOnly",
        limit: CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      },
      { timeoutMs: CODEX_NATIVE_PLUGIN_OWNER_LOOKUP_TIMEOUT_MS },
    );
    if (!isJsonObject(response) || !Array.isArray(response.data)) {
      return undefined;
    }
    for (const rawStatus of response.data) {
      if (
        !isJsonObject(rawStatus) ||
        typeof rawStatus.name !== "string" ||
        !isJsonObject(rawStatus.tools)
      ) {
        return undefined;
      }
      statuses.push(rawStatus as unknown as CodexMcpServerStatus);
    }
    if (
      response.nextCursor !== undefined &&
      response.nextCursor !== null &&
      typeof response.nextCursor !== "string"
    ) {
      return undefined;
    }
    cursor = response.nextCursor;
    if (!cursor) {
      return statuses;
    }
    if (seenCursors.has(cursor)) {
      return undefined;
    }
    seenCursors.add(cursor);
  }
  return undefined;
}

/**
 * Canonical, non-secret capability material used by Enterprise review and by
 * the startup gate. Keeping this in the extension avoids a second digest
 * definition in the HTTP/store adapter.
 */
export function buildCodexPluginCapabilitySnapshot(
  detail: v2.PluginDetail,
): Record<string, unknown> {
  const summary = detail.summary;
  return {
    version: 1,
    marketplaceName: detail.marketplaceName
      ? canonicalCodexMarketplaceName(detail.marketplaceName)
      : null,
    summary: {
      id: summary.id,
      remotePluginId: summary.remotePluginId ?? null,
      version: summary.version ?? null,
      name: summary.name,
      keywords: summary.keywords ?? [],
      interface: summary.interface ?? null,
    },
    skills: detail.skills ?? [],
    hooks: detail.hooks ?? [],
    apps: (detail.apps ?? []).map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description ?? null,
      category: app.category ?? null,
    })),
    appTemplates: detail.appTemplates ?? [],
    mcpServers: detail.mcpServers ?? [],
    scheduledTasks: detail.scheduledTasks ?? [],
  };
}

export function computeCodexPluginCapabilityDigest(detail: v2.PluginDetail): string {
  return `sha256:${createHash("sha256")
    .update(stableStringify(buildCodexPluginCapabilitySnapshot(detail)))
    .digest("hex")}`;
}

/**
 * Verifies every configured approved plugin for which Enterprise supplied a
 * digest. Missing detail is a denial because version/capability drift cannot
 * be distinguished from a stale or spoofed inventory row.
 */
export function assertCodexPluginCapabilityGrants(params: {
  resolver: CodexNativePluginGrantsResolver;
  records: readonly {
    policy: { pluginName: string; marketplaceName: string; enabled: boolean };
    detail?: v2.PluginDetail;
  }[];
}): void {
  const grants = params.resolver();
  for (const record of params.records) {
    if (!record.policy.enabled) {
      continue;
    }
    const grant = grants.find(
      (candidate) =>
        candidate.pluginName === record.policy.pluginName &&
        sameCodexMarketplace(candidate.marketplaceName, record.policy.marketplaceName),
    );
    if (!grant?.capabilityDigest) {
      continue;
    }
    if (!record.detail) {
      throw new Error(`${CODEX_NATIVE_PLUGIN_ACTION_DENIED_MESSAGE} [capability_detail_missing]`);
    }
    if (computeCodexPluginCapabilityDigest(record.detail) !== grant.capabilityDigest) {
      throw new Error(`${CODEX_NATIVE_PLUGIN_ACTION_DENIED_MESSAGE} [capability_digest_mismatch]`);
    }
  }
}

function sameCodexMarketplace(left: string, right: string): boolean {
  // Marketplace identity is part of the reviewed grant.  The app-server uses
  // different wire names for different auth/catalog placements; treating
  // those names as interchangeable would let an approval for one catalog
  // authorize a plugin from another catalog.
  return left === right;
}

function canonicalCodexMarketplaceName(value: string): string {
  return value;
}

/**
 * Keep the attestation independent from the host package graph.  Extensions
 * are package-boundary compiled and cannot rely on the normalization-core
 * workspace alias being resolvable from the installed Codex package.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}
