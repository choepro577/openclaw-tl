import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";
import {
  enterpriseExtensionTestHooks,
  reviewEnterpriseExtension,
  updateEnterpriseUserSkill,
} from "./extension-service.js";
import {
  getEnterpriseUserSkillInstall,
  writeEnterpriseUserSkillInstall,
} from "./extension-store.js";

const release = vi.hoisted(() => {
  const missingBins: string[] = [];
  return {
    missingBins,
    version: "1.0.0",
    integrity: "sha256-test",
    treeHash: "tree-test",
    displayName: "Unit conversion",
    skillName: "unit-convert",
    skillKey: "unit-convert",
    slug: "unit-convert",
  };
});

vi.mock("../../infra/clawhub-install-trust.js", () => ({
  ensureClawHubPackageTrustAcknowledged: async () => ({
    ok: true,
    trustInstallRecordFields: {
      clawhubTrustDisposition: "clean",
      clawhubTrustScanStatus: "clean",
      clawhubTrustCheckedAt: "2026-09-04T00:00:00.000Z",
    },
  }),
}));
vi.mock("../../infra/clawhub-skills.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../infra/clawhub-skills.js")>()),
  fetchClawHubSkillDetail: async () => ({
    skill: { displayName: release.displayName },
    owner: { handle: "alice" },
    latestVersion: { version: release.version },
  }),
}));
vi.mock("../../skills/lifecycle/clawhub.js", () => ({
  preflightSkillFromClawHub: async () => ({ ok: true, integrity: release.integrity }),
  installSkillFromClawHub: async ({ workspaceDir }: { workspaceDir: string }) => ({
    ok: true,
    targetDir: path.join(workspaceDir, "skills", release.slug),
  }),
}));
vi.mock("../../skills/lifecycle/clawhub-uninstall.js", () => ({
  applyClawHubSkillUninstall: async () => ({ ok: true }),
  planClawHubSkillUninstall: async ({ workspaceDir }: { workspaceDir: string }) => ({
    ok: true,
    plan: {
      targetDir: path.join(workspaceDir, "skills", "unit-convert"),
      fileTreeSha256: release.treeHash,
    },
  }),
}));
vi.mock("../../skills/discovery/status.js", () => ({
  buildWorkspaceSkillStatus: (workspaceDir: string) => ({
    skills: [
      {
        name: release.skillName,
        skillKey: release.skillKey,
        baseDir: path.join(workspaceDir, "skills", release.slug),
        clawhub: {
          status: "linked",
          valid: true,
          slug: release.slug,
          fileTreeSha256: release.treeHash,
        },
        missing: { bins: release.missingBins, anyBins: [], env: [], config: [], os: [] },
      },
    ],
  }),
}));

afterEach(() => {
  release.missingBins.length = 0;
  release.version = "1.0.0";
  release.displayName = "Unit conversion";
  release.skillName = "unit-convert";
  release.skillKey = "unit-convert";
  release.slug = "unit-convert";
  enterpriseExtensionTestHooks.clearReviewTokens();
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise Skill review identity", () => {
  it("accepts a ClawHub release whose display name differs from its catalog slug", async () => {
    release.displayName = "Quick Converter";
    release.skillName = "Quick Converter";
    release.skillKey = "Quick Converter";
    release.slug = "quick-converter";

    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "skill-review-user",
        displayName: "Skill Review User",
        passwordHash: "test-only",
        role: "employee",
      });
      const review = await reviewEnterpriseExtension({
        config: { agents: { defaults: { workspace: state.workspaceDir } } },
        account,
        agentKey: "personal",
        kind: "skill",
        catalogKey: "@alice/quick-converter",
      });

      expect(review.item).toMatchObject({
        catalogKey: "@alice/quick-converter",
        name: "Quick Converter",
        allowedAction: "install_skill",
      });
      expect(review.reviewToken).toEqual(expect.any(String));
    });
  });
});

describe("Enterprise Skill update enablement", () => {
  it.each([
    { state: "disabled", enabled: false, version: "1.0.0", missing: false, expected: "disabled" },
    { state: "disabled", enabled: false, version: "1.1.0", missing: false, expected: "disabled" },
    { state: "ready", enabled: true, version: "1.1.0", missing: false, expected: "ready" },
    {
      state: "needs_setup",
      enabled: false,
      version: "1.1.0",
      missing: false,
      expected: "disabled",
    },
    { state: "ready", enabled: true, version: "1.1.0", missing: true, expected: "needs_setup" },
    { state: "disabled", enabled: false, version: "1.1.0", missing: true, expected: "needs_setup" },
  ] as const)(
    "keeps $state activation intent when updating to $version (missing requirements: $missing)",
    async (testCase) => {
      release.version = testCase.version;
      release.missingBins.push(...(testCase.missing ? ["missing-test-command"] : []));
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const account = createEnterpriseAccount({
          username: "skill-update-user",
          displayName: "Skill Update User",
          passwordHash: "test-only",
          role: "employee",
        });
        const config = { agents: { defaults: { workspace: state.workspaceDir } } };
        const current = writeEnterpriseUserSkillInstall({
          accountId: account.id,
          agentKey: "personal",
          runtimeAgentId: resolveEnterpriseUserRuntimeAgentId(config, account, "personal"),
          clawhubRef: "@alice/unit-convert",
          skillName: "unit-convert",
          exactVersion: "1.0.0",
          integrity: release.integrity,
          relativePath: "skills/unit-convert",
          treeHash: release.treeHash,
          enabled: testCase.enabled,
          state: testCase.state,
          safeErrorCode: testCase.state === "needs_setup" ? "DEPENDENCY_SETUP_REQUIRED" : null,
        });
        const review = await reviewEnterpriseExtension({
          config,
          account,
          agentKey: "personal",
          kind: "skill",
          catalogKey: current.clawhubRef,
        });
        const updated = await updateEnterpriseUserSkill({
          config,
          account,
          id: current.id,
          baseRevision: current.revision,
          reviewToken: review.reviewToken,
        });

        expect(updated).toMatchObject({
          exactVersion: testCase.version,
          enabled: testCase.expected === "ready",
          state: testCase.expected,
          safeErrorCode: testCase.missing ? "DEPENDENCY_SETUP_REQUIRED" : null,
          revision: current.revision + 1,
        });
        expect(getEnterpriseUserSkillInstall(account.id, current.id)).toEqual(updated);
      });
    },
  );
});
