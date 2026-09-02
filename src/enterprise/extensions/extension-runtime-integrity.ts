import path from "node:path";
import { resolveClawHubSkillStatusLinkSync } from "../../skills/lifecycle/clawhub-status.js";
import { parseRequestedClawHubSkillRef } from "../../skills/lifecycle/clawhub-store.js";
import { digestClawHubSkillTreeSync } from "../../skills/lifecycle/skill-tree-digest.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import {
  listActiveEnterpriseUserSkillInstallsForRuntimeAgent,
  writeEnterpriseUserSkillInstall,
} from "./extension-store.js";
import type { EnterpriseUserSkillInstall } from "./extension-types.js";

function expectedRelativePath(ref: string): string {
  const slug = parseRequestedClawHubSkillRef(ref).slug;
  return `skills/${slug}`;
}

function hasValidManagedTree(workspaceDir: string, install: EnterpriseUserSkillInstall): boolean {
  const portableRelativePath = install.relativePath.split(path.sep).join("/");
  if (
    portableRelativePath !== expectedRelativePath(install.clawhubRef) ||
    !/^skills\/[a-z0-9][a-z0-9._-]*$/i.test(portableRelativePath)
  ) {
    return false;
  }
  const skillDir = path.resolve(workspaceDir, portableRelativePath);
  const workspaceRoot = path.resolve(workspaceDir);
  if (!skillDir.startsWith(`${workspaceRoot}${path.sep}`)) {
    return false;
  }
  const slug = parseRequestedClawHubSkillRef(install.clawhubRef).slug;
  const provenance = resolveClawHubSkillStatusLinkSync({ workspaceDir, skillDir, skillKey: slug });
  return Boolean(
    provenance?.valid &&
    provenance.installedVersion === install.exactVersion &&
    provenance.fileTreeSha256 === install.treeHash &&
    digestClawHubSkillTreeSync(skillDir) === install.treeHash,
  );
}

/** Fails closed and persists a tamper state before skills enter a request-scoped runtime config. */
export function verifiedEnterpriseUserSkillsForRuntimeAgent(input: {
  accountId: string;
  runtimeAgentId: string;
  workspaceDir: string;
  databaseOptions?: OpenClawStateDatabaseOptions;
}): EnterpriseUserSkillInstall[] {
  const verified: EnterpriseUserSkillInstall[] = [];
  for (const install of listActiveEnterpriseUserSkillInstallsForRuntimeAgent(
    input.accountId,
    input.runtimeAgentId,
    input.databaseOptions,
  )) {
    try {
      if (hasValidManagedTree(input.workspaceDir, install)) {
        verified.push(install);
        continue;
      }
    } catch {
      // Persist only a safe state below; filesystem details never enter the database or audit log.
    }
    try {
      writeEnterpriseUserSkillInstall(
        {
          ...install,
          enabled: false,
          state: "modified",
          safeErrorCode: "SKILL_TAMPERED",
          baseRevision: install.revision,
        },
        input.databaseOptions,
      );
    } catch {
      // A concurrent mutation or database failure must still exclude the skill from this request.
    }
  }
  return verified;
}
