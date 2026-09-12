import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { writeEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { personalAgentResourceKey, sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterpriseSharedAgentCapabilities } from "./enterprise-agent-capabilities.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

function writeSkill(workspaceDir: string, description: string): string {
  const skillDir = path.join(workspaceDir, "skills", "shared-only");
  mkdirSync(skillDir, { recursive: true });
  const skillFile = path.join(skillDir, "SKILL.md");
  writeFileSync(
    skillFile,
    `---\nname: shared-only\ndescription: ${description}\n---\n\n# Shared skill\n`,
  );
  return skillFile;
}

function sharedConfig(workspaceDir: string, skills?: string[]): OpenClawConfig {
  return {
    agents: {
      entries: {
        specialist: {
          workspace: workspaceDir,
          tools: { profile: "full" },
          ...(skills === undefined ? {} : { skills }),
        },
      },
    },
  };
}

describe("Enterprise shared-agent capability resolver", () => {
  it("inherits the agent skill catalog without personal grants or Personal Agent access", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const skillFile = writeSkill(state.workspaceDir, "first revision");
      const account = createEnterpriseAccount({
        username: "shared-capability.user",
        displayName: "Shared Capability User",
        passwordHash: "test-only-hash",
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: false,
      });
      // The Personal Agent is explicitly denied and its tool policy is empty.
      // Neither must reduce the capability published by the Shared Agent grant.
      replaceEnterpriseEntitlements(account.id, [
        {
          resourceType: "agent",
          resourceId: personalAgentResourceKey(account.id),
          effect: "deny",
        },
        {
          resourceType: "agent",
          resourceId: sharedAgentResourceKey("specialist"),
          effect: "allow",
        },
      ]);
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: null,
        alsoAllow: [],
        deny: ["read"],
      });

      const config = sharedConfig(state.workspaceDir);
      const resolved = resolveEnterpriseSharedAgentCapabilities({
        config,
        account,
        agentId: "specialist",
      });

      expect(resolved.allowed).toBe(true);
      if (!resolved.allowed) {
        return;
      }
      expect(resolved.scope).toBe("shared");
      expect(resolved.skillsSnapshot.skillFilter).toBeUndefined();
      expect(resolved.skillsSnapshot.skills.map((skill) => skill.skillKey)).toContain(
        "shared-only",
      );
      expect(resolved.toolPolicy).toEqual({ profile: "full" });

      // A new resolve reads the current file, so a changed skill cannot keep
      // the previous capability revision alive through the snapshot cache.
      const previousRevision = resolved.revision;
      writeFileSync(skillFile, "---\nname: shared-only\ndescription: second revision\n---\n");
      const refreshed = resolveEnterpriseSharedAgentCapabilities({
        config,
        account,
        agentId: "specialist",
      });
      expect(refreshed.allowed).toBe(true);
      if (!refreshed.allowed) {
        return;
      }
      expect(refreshed.revision).not.toBe(previousRevision);

      // The skill snapshot may be reused, but the agent grant is always live.
      // Revoking and restoring the same Shared Agent must take effect without
      // relying on a config or workspace change to invalidate the cache.
      replaceEnterpriseEntitlements(account.id, []);
      expect(
        resolveEnterpriseSharedAgentCapabilities({ config, account, agentId: "specialist" }),
      ).toMatchObject({
        allowed: false,
        reason: "agent_not_granted",
      });
      replaceEnterpriseEntitlements(account.id, [
        {
          resourceType: "agent",
          resourceId: sharedAgentResourceKey("specialist"),
          effect: "allow",
        },
      ]);
      const restored = resolveEnterpriseSharedAgentCapabilities({
        config,
        account,
        agentId: "specialist",
      });
      expect(restored.allowed).toBe(true);
      if (restored.allowed) {
        expect(restored.skillsSnapshot.skills.map((skill) => skill.skillKey)).toContain(
          "shared-only",
        );
      }
    });
  });

  it("treats an explicit empty skill list as no skills while keeping the shared agent grant", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      writeSkill(state.workspaceDir, "filtered");
      const account = createEnterpriseAccount({
        username: "shared-capability.empty",
        displayName: "Shared Capability Empty",
        passwordHash: "test-only-hash",
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: false,
      });
      replaceEnterpriseEntitlements(account.id, [
        {
          resourceType: "agent",
          resourceId: sharedAgentResourceKey("specialist"),
          effect: "allow",
        },
      ]);

      const resolved = resolveEnterpriseSharedAgentCapabilities({
        config: sharedConfig(state.workspaceDir, []),
        account,
        agentId: "specialist",
      });

      expect(resolved.allowed).toBe(true);
      if (!resolved.allowed) {
        return;
      }
      expect(resolved.skillsSnapshot.skillFilter).toEqual([]);
      expect(resolved.skillsSnapshot.skills).toEqual([]);
    });
  });

  it("fails closed when the shared agent grant is revoked", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "shared-capability.revoked",
        displayName: "Shared Capability Revoked",
        passwordHash: "test-only-hash",
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: false,
      });
      const config = sharedConfig(state.workspaceDir);
      replaceEnterpriseEntitlements(account.id, []);

      expect(
        resolveEnterpriseSharedAgentCapabilities({ config, account, agentId: "specialist" }),
      ).toMatchObject({
        allowed: false,
        reason: "agent_not_granted",
      });
    });
  });
});
