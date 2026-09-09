import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { enterpriseExtensionTestHooks, reviewEnterpriseExtension } from "./extension-service.js";
import { listEnterprisePluginRequests } from "./extension-store.js";

const fixture = vi.hoisted(() => ({
  trust: "clean" as "clean" | "malicious" | "revoked",
  artifactAvailable: true,
}));

vi.mock("../../infra/clawhub-install-trust.js", () => ({
  ensureClawHubPackageTrustAcknowledged: async () => ({
    ok: true,
    trustInstallRecordFields: {
      clawhubTrustDisposition: fixture.trust === "malicious" ? "blocked" : "clean",
      clawhubTrustScanStatus: fixture.trust === "malicious" ? "malicious" : "clean",
      clawhubTrustModerationState: fixture.trust === "revoked" ? "revoked" : "approved",
      clawhubTrustCheckedAt: "2026-09-08T00:00:00.000Z",
    },
  }),
}));

vi.mock("../../infra/clawhub-packages.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../infra/clawhub-packages.js")>()),
  fetchClawHubPackageDetail: async () => ({
    package: {
      name: "weather-plugin",
      displayName: "Weather plugin",
      family: "code-plugin" as const,
      latestVersion: "1.0.0",
    },
    owner: { handle: "alice" },
  }),
  fetchClawHubPackageVersion: async () => ({
    package: {
      name: "weather-plugin",
      displayName: "Weather plugin",
      family: "code-plugin" as const,
    },
    version: {
      version: "1.0.0",
      createdAt: 0,
      changelog: "",
      capabilities: {},
      compatibility: {},
      clawpack: { available: false, environment: {} },
    },
  }),
  fetchClawHubPackageArtifact: async () =>
    fixture.artifactAvailable
      ? {
          artifact: {
            source: "clawhub" as const,
            artifactKind: "npm-pack" as const,
            packageName: "weather-plugin",
            version: "1.0.0",
            npmIntegrity: "sha512-test",
            artifactSha256: "a".repeat(64),
          },
        }
      : { artifact: null },
}));

async function withReviewContext(
  run: (context: {
    account: ReturnType<typeof createEnterpriseAccount>;
    config: { agents: { defaults: { workspace: string } } };
  }) => Promise<void>,
): Promise<void> {
  await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
    const account = createEnterpriseAccount({
      username: "extension-review-user",
      displayName: "Extension Review User",
      passwordHash: "test-only",
      role: "employee",
      mustChangePassword: false,
    });
    await run({
      account,
      config: { agents: { defaults: { workspace: state.workspaceDir } } },
    });
  });
}

afterEach(() => {
  fixture.trust = "clean";
  fixture.artifactAvailable = true;
  enterpriseExtensionTestHooks.clearReviewTokens();
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise plugin review trust boundary", () => {
  it.each([
    ["malicious", "CLAWHUB_RELEASE_NOT_CLEAN"],
    ["revoked", "CLAWHUB_RELEASE_NOT_CLEAN"],
  ] as const)("rejects a %s release before issuing a review token", async (trust, code) => {
    fixture.trust = trust;
    await withReviewContext(async ({ account, config }) => {
      await expect(
        reviewEnterpriseExtension({
          config,
          account,
          kind: "code_plugin",
          catalogKey: "weather-plugin",
        }),
      ).rejects.toMatchObject({ code, status: 409 });
      expect(listEnterprisePluginRequests({ accountId: account.id })).toEqual([]);
    });
  });

  it("rejects a release without artifact integrity before issuing a review token", async () => {
    fixture.artifactAvailable = false;
    await withReviewContext(async ({ account, config }) => {
      await expect(
        reviewEnterpriseExtension({
          config,
          account,
          kind: "code_plugin",
          catalogKey: "weather-plugin",
        }),
      ).rejects.toMatchObject({ code: "INTEGRITY_UNAVAILABLE", status: 409 });
      expect(listEnterprisePluginRequests({ accountId: account.id })).toEqual([]);
    });
  });
});
