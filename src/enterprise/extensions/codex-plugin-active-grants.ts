import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { executeSqliteQuerySync, getNodeSqliteKysely } from "../../infra/kysely-sync.js";
import {
  openOpenClawStateDatabase,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { CodexPluginDatabase } from "./codex-plugin-store.js";

type Row = Record<string, unknown>;

export function jsonObject(row: Row, key: string): Record<string, unknown> {
  const encoded = row[key];
  if (typeof encoded !== "string") {
    return {};
  }
  try {
    const value = JSON.parse(encoded) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Shared Codex hosted connectors need a requester-scoped identity. */
export const CODEX_CONNECTOR_IDENTITY_REQUIRED = "CODEX_CONNECTOR_IDENTITY_REQUIRED" as const;

export type EnterpriseCodexCapabilitySurface = "hosted_app" | "ordinary" | "unknown";

/**
 * Classifies the immutable Codex capability snapshot without using a plugin
 * name or auth status as a proxy for connector ownership.
 *
 * The native snapshot contract always contains these three arrays. A missing
 * or malformed array is unknown and therefore unsafe to publish to a shared
 * agent; the account-private path can continue to use its existing grant.
 */
export function classifyEnterpriseCodexPluginCapabilitySnapshot(
  snapshot: unknown,
): EnterpriseCodexCapabilitySurface {
  if (!isRecord(snapshot)) {
    return "unknown";
  }
  const apps = snapshot.apps;
  const appTemplates = snapshot.appTemplates;
  const mcpServers = snapshot.mcpServers;
  if (!Array.isArray(apps) || !Array.isArray(appTemplates) || !Array.isArray(mcpServers)) {
    return "unknown";
  }
  if (
    apps.some(
      (entry) =>
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        entry.id.trim() === "" ||
        typeof entry.name !== "string" ||
        entry.name.trim() === "",
    ) ||
    appTemplates.some(
      (entry) =>
        !isRecord(entry) ||
        typeof entry.templateId !== "string" ||
        entry.templateId.trim() === "" ||
        typeof entry.name !== "string" ||
        entry.name.trim() === "",
    ) ||
    mcpServers.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    return "unknown";
  }
  return apps.length > 0 || appTemplates.length > 0 || mcpServers.includes("codex_apps")
    ? "hosted_app"
    : "ordinary";
}

export class EnterpriseCodexConnectorIdentityRequiredError extends Error {
  readonly code = CODEX_CONNECTOR_IDENTITY_REQUIRED;

  constructor() {
    super("Shared Codex hosted connectors require a requester-scoped connector identity.");
    this.name = "EnterpriseCodexConnectorIdentityRequiredError";
  }
}

export type EnterpriseActiveCodexPluginGrantFingerprint = {
  pluginName: string;
  marketplaceName: string;
  installedPluginId: string;
  capabilityDigest: string;
};

function queryActiveEnterpriseCodexPluginGrants(
  accountId: string,
  runtimeAgentId: string,
  options: OpenClawStateDatabaseOptions = {},
  scope: "effective" | "shared_agent" = "effective",
): EnterpriseActiveCodexPluginGrantFingerprint[] {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  const rows = executeSqliteQuerySync(
    db,
    query
      .selectFrom("enterprise_codex_plugin_grants as g")
      .innerJoin("enterprise_codex_plugin_requests as r", "r.id", "g.source_request_id")
      // Shared-agent grants deliberately outlive the account that requested or
      // installed them. Keep the account join optional; account-scoped rows
      // still require an enabled owner below.
      .leftJoin("enterprise_accounts as a", "a.id", "g.account_id")
      .select([
        "g.scope as scope",
        "g.plugin_name as plugin_name",
        "g.marketplace_name as marketplace_name",
        "g.installed_plugin_id as installed_plugin_id",
        "g.capability_digest as capability_digest",
        "g.capability_snapshot_json as capability_snapshot_json",
      ])
      .where("g.runtime_agent_id", "=", runtimeAgentId)
      .where((eb) =>
        scope === "shared_agent"
          ? eb("g.scope", "=", "shared_agent")
          : eb.or([
              eb.and([
                eb("g.scope", "=", "account"),
                eb("g.account_id", "=", accountId),
                // An account-scoped grant for a Shared Agent remains private to
                // that account and must not become part of the agent publication.
                eb("g.agent_key", "not like", "shared:%"),
                eb("a.enabled", "=", 1),
              ]),
              eb.and([eb("g.scope", "=", "shared_agent")]),
            ]),
      )
      .where("g.state", "=", "active")
      .where("r.state", "=", "available")
      .where("g.installed_plugin_id", "is not", null)
      .where((eb) =>
        eb.or([
          // Account grants remain tied to the requesting account. Shared
          // grants are agent-owned; their request survives account deletion
          // with requester_account_id set NULL and is still validated below.
          eb.and([eb("g.scope", "=", "account"), eb("r.requester_account_id", "=", accountId)]),
          eb("g.scope", "=", "shared_agent"),
        ]),
      )
      .whereRef("r.scope", "=", "g.scope")
      .whereRef("r.agent_key", "=", "g.agent_key")
      .whereRef("r.runtime_agent_id", "=", "g.runtime_agent_id")
      .whereRef("r.plugin_name", "=", "g.plugin_name")
      .whereRef("r.marketplace_name", "=", "g.marketplace_name")
      .whereRef("r.capability_digest", "=", "g.capability_digest")
      .whereRef("r.installed_plugin_id", "=", "g.installed_plugin_id")
      .orderBy("g.marketplace_name", "asc")
      .orderBy("g.plugin_name", "asc"),
  ).rows as Array<{
    scope: string;
    plugin_name: string;
    marketplace_name: string;
    installed_plugin_id: string | null;
    capability_digest: string;
    capability_snapshot_json: string;
  }>;
  const seen = new Set<string>();
  const result: EnterpriseActiveCodexPluginGrantFingerprint[] = [];
  for (const row of rows) {
    const capabilitySurface = classifyEnterpriseCodexPluginCapabilitySnapshot(
      jsonObject(
        { capability_snapshot_json: row.capability_snapshot_json },
        "capability_snapshot_json",
      ),
    );
    if (scope === "effective" && row.scope === "shared_agent" && capabilitySurface !== "ordinary") {
      throw new EnterpriseCodexConnectorIdentityRequiredError();
    }
    const pluginName = row.plugin_name;
    const marketplaceName = row.marketplace_name;
    const installedPluginId = row.installed_plugin_id;
    const capabilityDigest = row.capability_digest;
    const key = pluginName + "\0" + marketplaceName;
    if (
      !pluginName ||
      !marketplaceName ||
      !installedPluginId ||
      !capabilityDigest ||
      seen.has(key)
    ) {
      continue;
    }
    seen.add(key);
    result.push({
      pluginName,
      marketplaceName,
      installedPluginId,
      capabilityDigest,
    });
  }
  return result;
}

/**
 * Projection consumed by the native Codex harness. A grant is effective only
 * when its exact account-agent request is available and the grant is active.
 */
export function listActiveEnterpriseCodexPluginGrants(
  accountId: string,
  runtimeAgentId: string,
  options: OpenClawStateDatabaseOptions = {},
): readonly {
  pluginName: string;
  marketplaceName: string;
  capabilityDigest: string;
}[] {
  return queryActiveEnterpriseCodexPluginGrants(accountId, runtimeAgentId, options).map(
    ({ pluginName, marketplaceName, capabilityDigest }) => ({
      pluginName,
      marketplaceName,
      capabilityDigest,
    }),
  );
}

/**
 * Shared-Agent-only projection used by the canonical capability revision.
 * Account-private Codex grants are deliberately excluded from this list.
 */
export function listActiveEnterpriseSharedCodexPluginGrantFingerprints(
  accountId: string,
  runtimeAgentId: string,
  options: OpenClawStateDatabaseOptions = {},
): readonly EnterpriseActiveCodexPluginGrantFingerprint[] {
  return queryActiveEnterpriseCodexPluginGrants(accountId, runtimeAgentId, options, "shared_agent");
}
