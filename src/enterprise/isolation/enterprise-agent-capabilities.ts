import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { stableStringify } from "@openclaw/normalization-core";
import { resolveAgentWorkspaceDir, listAgentEntries } from "../../agents/agent-scope.js";
import type { AgentConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentToolsConfig } from "../../config/types.tools.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveReusableWorkspaceSkillSnapshot } from "../../skills/runtime/session-snapshot.js";
import { fingerprintSkillSnapshotConfig } from "../../skills/runtime/snapshot-config-fingerprint.js";
import type { SkillSnapshot } from "../../skills/types.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { parseEnterpriseResourceKey } from "../entitlements/resource-keys.js";
import { listActiveEnterpriseSharedCodexPluginGrantFingerprints } from "../extensions/codex-plugin-store.js";
import { listEnterpriseEffectivePluginGrants } from "../extensions/extension-store.js";
import { listActiveEnterprisePluginGrantTools } from "./enterprise-plugin-tool-grants.js";

export type EnterpriseSharedAgentCapabilities =
  | {
      allowed: false;
      accountId: string;
      agentId: string;
      reason:
        | "account_disabled"
        | "agent_not_configured"
        | "agent_not_granted"
        | "agent_explicitly_denied";
      revision?: string;
    }
  | {
      allowed: true;
      scope: "shared";
      accountId: string;
      agentId: string;
      /** The exact skill catalog used by this run. Includes script metadata. */
      skillsSnapshot: SkillSnapshot;
      /** Changes when account grants, agent config, or skill files change. */
      revision: string;
      /** Raw host config is retained for operation-specific credential lookup. */
      config: OpenClawConfig;
      /** Agent-owned tool policy. Personal-account policy is intentionally absent. */
      toolPolicy?: AgentToolsConfig;
      /** Native OpenClaw plugin tools effective for this account and agent. */
      pluginTools: string[];
    };

export type EnterpriseSharedAgentCapabilityResolver = {
  resolve(agentId: string): EnterpriseSharedAgentCapabilities;
};

function findAgentEntry(config: OpenClawConfig, agentId: string): AgentConfig | undefined {
  const normalized = normalizeAgentId(agentId);
  return listAgentEntries(config).find((entry) => normalizeAgentId(entry.id) === normalized);
}

function hashFile(hash: crypto.Hash, filePath: string): void {
  try {
    const stat = fs.statSync(filePath);
    hash.update(filePath);
    hash.update(String(stat.size));
    hash.update(fs.readFileSync(filePath));
  } catch {
    hash.update(`${filePath}:missing`);
  }
}

function hashSkillSupportFiles(hash: crypto.Hash, baseDir: string): void {
  const supportDirectories = ["assets", "examples", "references", "scripts", "templates"];
  const walk = (directory: string, relativeDirectory: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs
        .readdirSync(directory, { withFileTypes: true })
        .toSorted((left, right) => left.name.localeCompare(right.name, "en"));
    } catch {
      hash.update(`${relativeDirectory}:missing`);
      return;
    }
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(baseDir, relativePath);
      hash.update(relativePath);
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isSymbolicLink()) {
        try {
          hash.update(`symlink:${fs.readlinkSync(absolutePath)}`);
        } catch {
          hash.update("symlink:missing");
        }
      } else if (entry.isFile()) {
        hashFile(hash, absolutePath);
      }
    }
  };
  for (const directory of supportDirectories) {
    walk(path.join(baseDir, directory), directory);
  }
}

function fingerprintSkillContents(snapshot: SkillSnapshot): string {
  const hash = crypto.createHash("sha256");
  for (const skill of [...snapshot.skills].toSorted((left, right) =>
    `${left.skillKey ?? left.name}:${left.source ?? ""}`.localeCompare(
      `${right.skillKey ?? right.name}:${right.source ?? ""}`,
      "en",
    ),
  )) {
    hash.update(
      stableStringify({
        name: skill.name,
        skillKey: skill.skillKey,
        source: skill.source,
        baseDir: skill.baseDir,
        scriptRuntime: skill.scriptRuntime,
      }),
    );
    if (skill.baseDir) {
      hashFile(
        hash,
        skill.baseDir.endsWith("SKILL.md") ? skill.baseDir : path.join(skill.baseDir, "SKILL.md"),
      );
      for (const entrypoint of Object.values(skill.scriptRuntime?.entrypoints ?? {})) {
        hashFile(hash, path.resolve(skill.baseDir, entrypoint.path));
      }
      hashSkillSupportFiles(hash, skill.baseDir);
    }
    if (skill.name && skill.source?.startsWith("node:")) {
      hash.update(skill.name);
    }
  }
  return hash.digest("hex");
}

type SharedAgentSkillSnapshotCacheEntry = {
  configFingerprint: string;
  workspaceDir: string;
  skillFilterKey: string;
  snapshot: SkillSnapshot;
  skillContentsFingerprint: string;
};

export type EnterpriseSharedAgentSkillSnapshot = {
  snapshot: SkillSnapshot;
  skillContentsFingerprint: string;
};

/**
 * Resolve the current skill catalog for an Agent entry using the same cache as
 * the capability resolver. Callers still need to perform their own live
 * entitlement checks; this helper only owns the skill snapshot lifecycle.
 */
export function resolveEnterpriseSharedAgentSkillSnapshot(params: {
  config: OpenClawConfig;
  agentId: string;
}): EnterpriseSharedAgentSkillSnapshot | undefined {
  const agentId = normalizeAgentId(params.agentId);
  const entry = findAgentEntry(params.config, agentId);
  if (!entry) {
    return undefined;
  }
  const workspaceDir = resolveAgentWorkspaceDir(params.config, agentId);
  const skillFilter = Object.hasOwn(entry, "skills")
    ? entry.skills
    : params.config.agents?.defaults?.skills;
  const configFingerprint = fingerprintSkillSnapshotConfig(params.config);
  const skillFilterKey = skillFilter === undefined ? "<inherit>" : stableStringify(skillFilter);
  const snapshotCache =
    sharedAgentSkillSnapshotCache.get(params.config) ??
    new Map<string, SharedAgentSkillSnapshotCacheEntry>();
  sharedAgentSkillSnapshotCache.set(params.config, snapshotCache);
  const cachedSnapshot = snapshotCache.get(agentId);
  const cacheMatches =
    cachedSnapshot?.configFingerprint === configFingerprint &&
    cachedSnapshot.workspaceDir === workspaceDir &&
    cachedSnapshot.skillFilterKey === skillFilterKey;
  let existingSnapshot: SkillSnapshot | undefined;
  let skillContentsFingerprint: string | undefined;
  if (cacheMatches && cachedSnapshot) {
    existingSnapshot = cachedSnapshot.snapshot;
    skillContentsFingerprint = fingerprintSkillContents(cachedSnapshot.snapshot);
  }
  if (
    cacheMatches &&
    cachedSnapshot &&
    skillContentsFingerprint !== cachedSnapshot.skillContentsFingerprint
  ) {
    // A watcher event normally changes the snapshot version. This content
    // check also catches a missed event before stale skill files remain active.
    existingSnapshot = undefined;
    skillContentsFingerprint = undefined;
  }
  const resolvedSnapshot = resolveReusableWorkspaceSkillSnapshot({
    workspaceDir,
    config: params.config,
    agentId,
    ...(skillFilter === undefined ? {} : { skillFilter }),
    ...(existingSnapshot ? { existingSnapshot } : {}),
  });
  const snapshot = resolvedSnapshot.snapshot;
  if (!existingSnapshot || resolvedSnapshot.shouldRefresh || snapshot !== existingSnapshot) {
    skillContentsFingerprint = fingerprintSkillContents(snapshot);
  }
  if (!skillContentsFingerprint) {
    skillContentsFingerprint = fingerprintSkillContents(snapshot);
  }
  snapshotCache.set(agentId, {
    configFingerprint,
    workspaceDir,
    skillFilterKey,
    snapshot,
    skillContentsFingerprint,
  });
  return { snapshot, skillContentsFingerprint };
}

// Capability authorization is intentionally resolved live below. This cache
// only reuses the expensive skill catalog scan while the config, agent
// workspace/filter, watcher revision, and file-content fingerprint remain
// stable. A WeakMap keeps projected config generations from accumulating.
const sharedAgentSkillSnapshotCache = new WeakMap<
  OpenClawConfig,
  Map<string, SharedAgentSkillSnapshotCacheEntry>
>();

function capabilityRevision(params: {
  account: EnterpriseAccount;
  config: OpenClawConfig;
  agentId: string;
  skillsSnapshot: SkillSnapshot;
  skillContentsFingerprint: string;
  toolPolicy?: AgentToolsConfig;
  pluginGrantFingerprint: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      stableStringify({
        accountId: params.account.id,
        accountPolicyRevision: params.account.policyRevision,
        agentId: params.agentId,
        configFingerprint: fingerprintSkillSnapshotConfig(params.config),
        skillFilter: params.skillsSnapshot.skillFilter,
        skillVersion: params.skillsSnapshot.version,
        skillContents: params.skillContentsFingerprint,
        toolPolicy: params.toolPolicy,
        pluginGrantFingerprint: params.pluginGrantFingerprint,
      }),
    )
    .digest("hex");
}

/**
 * Resolve the complete published capability of one Shared Agent.
 *
 * This deliberately reads only the Shared Agent entry and its grant. Personal
 * account tool/skill policy is not an input, so a Personal deny cannot trim a
 * directly selected Shared Agent or a delegated child.
 */
export function resolveEnterpriseSharedAgentCapabilities(params: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  agentId: string;
  stateOptions?: OpenClawStateDatabaseOptions;
}): EnterpriseSharedAgentCapabilities {
  const agentId = normalizeAgentId(params.agentId);
  const base = { accountId: params.account.id, agentId };
  if (!params.account.enabled) {
    return { allowed: false, ...base, reason: "account_disabled" };
  }
  const entry = findAgentEntry(params.config, agentId);
  if (!entry) {
    return { allowed: false, ...base, reason: "agent_not_configured" };
  }
  const agentEntitlements = listEnterpriseEntitlements(
    params.account.id,
    params.stateOptions,
  ).filter(
    (item) =>
      item.resourceType === "agent" &&
      item.resourceState === "active" &&
      parseEnterpriseResourceKey("agent", item.resourceId).scope !== "personal" &&
      normalizeAgentId(parseEnterpriseResourceKey("agent", item.resourceId).runtimeId) === agentId,
  );
  if (agentEntitlements.some((item) => item.effect === "deny")) {
    return { allowed: false, ...base, reason: "agent_explicitly_denied" };
  }
  if (
    params.account.role !== "administrator" &&
    !agentEntitlements.some((item) => item.effect === "allow")
  ) {
    return { allowed: false, ...base, reason: "agent_not_granted" };
  }

  const skillSnapshot = resolveEnterpriseSharedAgentSkillSnapshot({
    config: params.config,
    agentId,
  });
  if (!skillSnapshot) {
    return { allowed: false, ...base, reason: "agent_not_configured" };
  }
  const { snapshot, skillContentsFingerprint } = skillSnapshot;
  const toolPolicy = entry.tools;
  const pluginTools = listActiveEnterprisePluginGrantTools(params.account.id, agentId, {
    sharedAgentAllowed: true,
    sharedAgentOnly: true,
    databaseOptions: params.stateOptions,
  });
  const openClawPluginGrantFingerprint = listEnterpriseEffectivePluginGrants(
    params.account.id,
    agentId,
    {
      sharedAgentAllowed: true,
    },
    params.stateOptions,
  )
    .filter((grant) => grant.scope === "shared_agent")
    .map((grant) => ({
      id: grant.id,
      scope: grant.scope,
      runtimeAgentId: grant.runtimeAgentId,
      pluginId: grant.pluginId,
      exactVersion: grant.exactVersion,
      integrity: grant.integrity,
      capabilityDigest: grant.capabilityDigest,
      approvedTools: grant.approvedTools,
      state: grant.state,
      revision: grant.revision,
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id, "en"));
  const codexPluginGrantFingerprint = listActiveEnterpriseSharedCodexPluginGrantFingerprints(
    params.account.id,
    agentId,
    params.stateOptions,
  );
  const pluginGrantFingerprint = stableStringify({
    openClaw: openClawPluginGrantFingerprint,
    codex: codexPluginGrantFingerprint,
  });
  return {
    allowed: true,
    scope: "shared",
    ...base,
    skillsSnapshot: snapshot,
    revision: capabilityRevision({
      account: params.account,
      config: params.config,
      agentId,
      skillsSnapshot: snapshot,
      skillContentsFingerprint,
      toolPolicy,
      pluginGrantFingerprint,
    }),
    config: params.config,
    ...(toolPolicy ? { toolPolicy } : {}),
    pluginTools,
  };
}
