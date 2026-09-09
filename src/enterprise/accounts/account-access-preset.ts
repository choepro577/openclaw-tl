import type { DatabaseSync } from "node:sqlite";
import { listAgentEntries } from "../../agents/agent-scope.js";
import { listCoreToolSections } from "../../agents/tool-catalog.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import {
  expandToolGroups,
  normalizeToolPolicyName,
  resolveToolProfilePolicy,
} from "../../agents/tool-policy-shared.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { ToolProfileId } from "../../config/types.tools.js";
import { getActivePluginRegistry } from "../../plugins/runtime.js";
import {
  accessPresetToolIds,
  ENTERPRISE_ACCESS_PRESET_BASIC,
  enterpriseRuntimeResourceId,
  isEnterpriseNonDelegableToolId,
} from "../entitlements/resource-keys.js";
import { resolveEnterprisePersonalAgentTemplateId } from "../personal-agent/personal-agent-config.js";
import type { EnterpriseAccount } from "./account-types.js";

type StoredPolicy = { profile: string | null; also_allow_json: string; deny_json: string };
type ToolEntitlement = { resource_id: string; effect: string; resource_state: string };

export function readAccountPresetState(db: DatabaseSync, accountId: string) {
  return {
    toolPolicy: db
      .prepare(
        "SELECT profile, also_allow_json, deny_json FROM enterprise_account_tool_policies WHERE account_id = ?",
      )
      .get(accountId) as StoredPolicy | undefined,
    toolEntitlements: db
      .prepare(
        "SELECT resource_id, effect, resource_state FROM enterprise_entitlements WHERE account_id = ? AND resource_type = 'tool'",
      )
      .all(accountId) as ToolEntitlement[],
  }; // sqlite-allow-raw -- Exact account permission snapshot for atomic preset application and audit.
}

function entries(json: string): string[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === "string")) {
    throw new Error("ACCOUNT_TOOL_POLICY_INVALID");
  }
  return expandToolGroups(parsed);
}

/** Called inside the account transaction. Never edits host config or another account. */
export function applyAccountAccessPreset(
  db: DatabaseSync,
  account: EnterpriseAccount,
  config: OpenClawConfig,
  now: number,
  previousPresetKey = account.accessPresetKey,
): void {
  const grants = accessPresetToolIds(account.accessPresetKey);
  if (!grants.length) {
    return;
  }
  const snapshot = readAccountPresetState(db, account.id);
  const stored = snapshot.toolPolicy;
  const entitlements = snapshot.toolEntitlements.filter(
    (entry) => entry.resource_state === "active",
  );
  const granted = new Set(grants);
  const overlaps = (pattern: string) =>
    grants.some((id) => isToolAllowedByPolicyName(id, { allow: [pattern] }));
  const storedDeny = stored ? entries(stored.deny_json) : [];
  const entitlementDeny = entitlements
    .filter((entry) => entry.effect === "deny")
    .flatMap((entry) => expandToolGroups([enterpriseRuntimeResourceId("tool", entry.resource_id)]));
  const deny = [...storedDeny, ...entitlementDeny];
  const wildcardConflict = deny.some((pattern) => pattern.includes("*") && overlaps(pattern));
  const alsoAllow = stored ? entries(stored.also_allow_json) : [];
  let profile = stored ? stored.profile : "minimal";
  if (profile !== null && !["minimal", "coding", "messaging", "full"].includes(profile)) {
    throw new Error("ACCOUNT_TOOL_POLICY_INVALID");
  }
  let nextAllow = alsoAllow;
  let nextDeny = storedDeny.filter((pattern) => !overlaps(pattern));

  if (
    wildcardConflict ||
    (stored && profile === null && previousPresetKey !== ENTERPRISE_ACCESS_PRESET_BASIC)
  ) {
    const templateId = resolveEnterprisePersonalAgentTemplateId(config, account);
    const agents = listAgentEntries(config);
    const template =
      agents.find((entry) => entry.id === templateId) ??
      agents.find((entry) => entry.default) ??
      agents[0];
    const inheritedProfile = template?.tools?.profile ?? config.tools?.profile ?? "full";
    if (!wildcardConflict) {
      profile = inheritedProfile;
      nextAllow = [...alsoAllow, ...(template?.tools?.alsoAllow ?? config.tools?.alsoAllow ?? [])];
    } else {
      const priorAllow = [
        ...grants,
        ...(stored && (profile !== null || previousPresetKey !== ENTERPRISE_ACCESS_PRESET_BASIC)
          ? (resolveToolProfilePolicy((profile ?? inheritedProfile) as ToolProfileId)?.allow ?? [
              "*",
            ])
          : []),
        ...(stored && profile === null && previousPresetKey !== ENTERPRISE_ACCESS_PRESET_BASIC
          ? (template?.tools?.alsoAllow ?? config.tools?.alsoAllow ?? [])
          : []),
        ...alsoAllow,
        ...entitlements
          .filter((entry) => entry.effect === "allow")
          .map((entry) => enterpriseRuntimeResourceId("tool", entry.resource_id)),
      ];
      const pluginTools = (
        db
          .prepare(
            "SELECT approved_tools_json FROM enterprise_account_plugin_grants WHERE account_id = ? AND state != 'revoked'",
          )
          .all(account.id) as Array<{ approved_tools_json: string }>
      ).flatMap((grant) => entries(grant.approved_tools_json));
      // sqlite-allow-raw -- Include dormant approved tools so removing a wildcard deny cannot expose them later.
      const universe = new Set([
        ...pluginTools,
        ...listCoreToolSections({ swarmEnabled: true }).flatMap((section) =>
          section.tools.map((tool) => tool.id),
        ),
        ...(getActivePluginRegistry()?.tools.flatMap((tool) => tool.names) ?? []),
        ...expandToolGroups([...priorAllow, ...deny]).filter((id) => !id.includes("*")),
      ]);
      // Snapshot existing grants before removing a broad deny: unknown/future tools stay ungranted.
      // A finite allowlist is necessary because the runtime glob language has no subtraction.
      nextAllow = [...universe].filter(
        (id) =>
          !isEnterpriseNonDelegableToolId(id) &&
          (granted.has(id) || isToolAllowedByPolicyName(id, { allow: priorAllow, deny })),
      );
      profile = "minimal";
      nextDeny = [...universe].filter(
        (id) => !granted.has(id) && !isToolAllowedByPolicyName(id, { deny }),
      );
    }
  }
  for (const entitlement of entitlements) {
    if (entitlement.effect !== "deny") {
      continue;
    }
    const patterns = expandToolGroups([
      enterpriseRuntimeResourceId("tool", entitlement.resource_id),
    ]);
    if (!patterns.some(overlaps)) {
      continue;
    }
    nextDeny.push(...patterns.filter((pattern) => !overlaps(pattern)));
    db.prepare(
      "DELETE FROM enterprise_entitlements WHERE account_id = ? AND resource_type = 'tool' AND resource_id = ?",
    ).run(account.id, entitlement.resource_id); // sqlite-allow-raw -- Only the selected account's conflicting deny is replaced.
  }
  if (stored || nextDeny.length || wildcardConflict) {
    const normalize = (values: string[]) =>
      [...new Set(values.map(normalizeToolPolicyName))].toSorted();
    db.prepare(`INSERT INTO enterprise_account_tool_policies
      (account_id, schema_version, profile, also_allow_json, deny_json, revision, created_at, updated_at)
      VALUES (?, 1, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET profile = excluded.profile,
        also_allow_json = excluded.also_allow_json, deny_json = excluded.deny_json,
        revision = enterprise_account_tool_policies.revision + 1, updated_at = excluded.updated_at`).run(
      account.id,
      profile,
      JSON.stringify(normalize(nextAllow)),
      JSON.stringify(normalize(nextDeny)),
      now,
      now,
    );
    // sqlite-allow-raw -- Preset and override reconciliation commit in the account transaction.
  }
}
