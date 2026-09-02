import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { digestClawHubSkillTreeSync } from "../../skills/lifecycle/skill-tree-digest.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { verifiedEnterpriseUserSkillsForRuntimeAgent } from "./extension-runtime-integrity.js";
import {
  listEnterpriseUserSkillInstalls,
  writeEnterpriseUserSkillInstall,
} from "./extension-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise installed Skill runtime integrity", () => {
  it("projects an unchanged managed tree and fails closed after tampering", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-skill-runtime-"));
    directories.push(directory);
    const databaseOptions = { path: join(directory, "state.sqlite") };
    const workspaceDir = join(directory, "workspace");
    const skillDir = join(workspaceDir, "skills", "calendar");
    mkdirSync(join(skillDir, ".clawhub"), { recursive: true });
    mkdirSync(join(workspaceDir, ".clawhub"), { recursive: true });
    const skillContent = "---\nname: calendar\ndescription: Calendar\n---\n";
    writeFileSync(join(skillDir, "SKILL.md"), skillContent);
    const skillFileSha256 = createHash("sha256").update(skillContent).digest("hex");
    const treeHash = digestClawHubSkillTreeSync(skillDir);
    const provenance = {
      version: 1,
      registry: "https://clawhub.ai",
      slug: "calendar",
      installedVersion: "1.0.0",
      installedAt: 123,
      skillFile: { path: "SKILL.md", sha256: skillFileSha256 },
      fileTreeSha256: treeHash,
    };
    writeFileSync(join(skillDir, ".clawhub", "origin.json"), JSON.stringify(provenance));
    writeFileSync(
      join(workspaceDir, ".clawhub", "lock.json"),
      JSON.stringify({
        version: 1,
        skills: {
          calendar: {
            version: "1.0.0",
            registry: provenance.registry,
            installedAt: provenance.installedAt,
            skillFile: provenance.skillFile,
            fileTreeSha256: treeHash,
          },
        },
      }),
    );
    const account = createEnterpriseAccount(
      {
        username: "runtime-integrity",
        displayName: "Runtime Integrity",
        passwordHash: "test-only",
        role: "employee",
      },
      databaseOptions,
    );
    writeEnterpriseUserSkillInstall(
      {
        accountId: account.id,
        agentKey: "shared:support",
        runtimeAgentId: "support",
        clawhubRef: "calendar",
        skillName: "calendar",
        exactVersion: "1.0.0",
        integrity: `sha256:${"a".repeat(64)}`,
        relativePath: "skills/calendar",
        treeHash,
        enabled: true,
        state: "ready",
        safeErrorCode: null,
      },
      databaseOptions,
    );

    expect(
      verifiedEnterpriseUserSkillsForRuntimeAgent({
        accountId: account.id,
        runtimeAgentId: "support",
        workspaceDir,
        databaseOptions,
      }),
    ).toHaveLength(1);

    writeFileSync(join(skillDir, "SKILL.md"), `${skillContent}tampered\n`);
    expect(
      verifiedEnterpriseUserSkillsForRuntimeAgent({
        accountId: account.id,
        runtimeAgentId: "support",
        workspaceDir,
        databaseOptions,
      }),
    ).toEqual([]);
    expect(
      listEnterpriseUserSkillInstalls(account.id, "shared:support", databaseOptions),
    ).toMatchObject([{ enabled: false, state: "modified", safeErrorCode: "SKILL_TAMPERED" }]);
  });
});
