import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  createEnterprisePluginRequest,
  getEnterprisePluginRequest,
  transitionEnterprisePluginRequest,
} from "./extension-store.js";

const approvalMocks = vi.hoisted(() => ({
  records: vi.fn<() => Record<string, Record<string, unknown>>>(() => ({})),
  catalog: vi.fn(async () => ({ plugins: [] as Array<Record<string, unknown>> })),
  registry: vi.fn<() => Record<string, unknown> | null>(() => null),
  revalidate: vi.fn(async () => undefined),
}));

vi.mock("../../plugins/installed-plugin-index-records.js", () => ({
  loadInstalledPluginIndexInstallRecordsSync: approvalMocks.records,
}));
vi.mock("../../plugins/management-service.js", () => ({
  listManagedPlugins: approvalMocks.catalog,
}));
vi.mock("../../plugins/runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../plugins/runtime.js")>()),
  getActivePluginRegistry: approvalMocks.registry,
}));
vi.mock("./extension-service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./extension-service.js")>()),
  revalidateEnterprisePluginRequestArtifact: approvalMocks.revalidate,
}));

import { EnterpriseExtensionError } from "./extension-service.js";
import {
  approveEnterprisePluginRequest,
  reconcileApprovingEnterprisePluginRequests,
} from "./plugin-approval-service.js";

afterEach(() => {
  approvalMocks.records.mockReset();
  approvalMocks.records.mockReturnValue({});
  approvalMocks.catalog.mockReset();
  approvalMocks.catalog.mockResolvedValue({ plugins: [] });
  approvalMocks.registry.mockReset();
  approvalMocks.registry.mockReturnValue(null);
  approvalMocks.revalidate.mockClear();
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise native plugin approval", () => {
  it.each([
    { origin: "official", installed: false, enabled: false, shouldInstall: true },
    { origin: "bundled", installed: true, enabled: false, shouldInstall: true },
    { origin: "bundled", installed: true, enabled: true, shouldInstall: false },
    { origin: "global", installed: true, enabled: false, shouldInstall: false },
  ])("distinguishes catalog availability from a verified install: %j", async (entry) => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const requester = createEnterpriseAccount({
        username: "catalog-requester",
        displayName: "Requester",
        passwordHash: "test-only",
        role: "employee",
      });
      const reviewer = createEnterpriseAccount({
        username: "catalog-reviewer",
        displayName: "Reviewer",
        passwordHash: "test-only",
        role: "administrator",
      });
      const request = createEnterprisePluginRequest({
        requesterAccountId: requester.id,
        packageName: "@acme/native",
        packageFamily: "code_plugin",
        exactVersion: "1.0.0",
        integrity: "sha256:artifact",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: {},
        capabilityDigest: "digest",
      });
      approvalMocks.catalog.mockResolvedValue({
        plugins: [
          {
            id: "acme-native",
            packageName: "@acme/native",
            version: "1.0.0",
            ...entry,
          },
        ],
      });
      const install = vi.fn(async () => {
        approvalMocks.records.mockReturnValue({
          "acme-native": {
            source: "clawhub",
            clawhubPackage: "@acme/native",
            clawhubVersion: "1.0.0",
            version: "1.0.0",
            integrity: "sha256:artifact",
          },
        });
        return { plugin: { id: "acme-native" }, restartRequired: true };
      });
      const result = approveEnterprisePluginRequest({
        config: {},
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        install,
      });
      if (entry.shouldInstall) {
        await expect(result).resolves.toMatchObject({
          request: { state: "approving" },
          grant: null,
          restartRequired: true,
        });
        expect(install).toHaveBeenCalledWith({
          source: "clawhub",
          packageName: "@acme/native",
          version: "1.0.0",
          acknowledgeInstallPolicyWarning: true,
        });
      } else {
        await expect(result).rejects.toMatchObject({ code: "GLOBAL_INSTALL_VERIFICATION_FAILED" });
        expect(install).not.toHaveBeenCalled();
        expect(getEnterprisePluginRequest(request.id)?.state).toBe("pending");
      }
    });
  });

  it.each([
    [undefined, true],
    ["1.0.2", true],
    ["1.0.2", false],
  ] as const)(
    "checks ClawHub release %s independently of runtime version and enforces installed root match %s",
    async (clawhubVersion, matchingRoot) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const requester = createEnterpriseAccount({
          username: "plugin-requester",
          displayName: "Plugin Requester",
          passwordHash: "test-only",
          role: "employee",
        });
        const reviewer = createEnterpriseAccount({
          username: "plugin-reviewer",
          displayName: "Plugin Reviewer",
          passwordHash: "test-only",
          role: "administrator",
        });
        const request = createEnterprisePluginRequest({
          requesterAccountId: requester.id,
          packageName: "@acme/native",
          packageFamily: "code_plugin",
          exactVersion: clawhubVersion ?? "1.0.0",
          integrity: "sha256:artifact",
          requestKind: "access",
          trustSnapshot: { disposition: "clean" },
          capabilitySnapshot: { tools: ["acme.search"] },
          capabilityDigest: "capability-digest",
        });
        approvalMocks.records.mockReturnValue({
          "acme-native": {
            source: "clawhub",
            clawhubPackage: "@acme/native",
            clawhubVersion,
            installPath: "/plugins/acme-native",
            version: "1.0.0",
            integrity: "sha256:artifact",
          },
        });
        approvalMocks.catalog.mockResolvedValue({
          plugins: [
            {
              id: "acme-native",
              packageName: "@acme/native",
              rootDir: "/plugins/acme-native",
              version: "1.0.0",
              installed: true,
              enabled: true,
              origin: "global",
            },
          ],
        });
        approvalMocks.registry.mockReturnValue({
          plugins: [
            {
              id: "acme-native",
              packageName: "@acme/native",
              packageVersion: "1.0.0",
              rootDir: matchingRoot ? "/plugins/acme-native" : "/bundled/acme-native",
              status: "loaded",
            },
          ],
          tools: [{ pluginId: "acme-native", names: ["acme.search"] }],
        });
        const install = vi.fn(async () => ({}));

        const approval = approveEnterprisePluginRequest({
          config: {},
          reviewer,
          requestId: request.id,
          baseRevision: request.revision,
          install,
        });
        if (!matchingRoot) {
          await expect(approval).rejects.toMatchObject({
            code: "GLOBAL_INSTALL_VERIFICATION_FAILED",
          });
          expect(install).not.toHaveBeenCalled();
          return;
        }
        const result = await approval;

        expect(install).not.toHaveBeenCalled();
        expect(result.request.state).toBe("available");
        expect(result.grant).toMatchObject({
          accountId: requester.id,
          pluginId: "acme-native",
          approvedTools: ["acme.search"],
          state: "active",
        });
      });
    },
  );

  it("leaves a pending request unchanged on global version conflict", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const requester = createEnterpriseAccount({
        username: "conflict-requester",
        displayName: "Conflict Requester",
        passwordHash: "test-only",
        role: "employee",
      });
      const reviewer = createEnterpriseAccount({
        username: "conflict-reviewer",
        displayName: "Conflict Reviewer",
        passwordHash: "test-only",
        role: "administrator",
      });
      const request = createEnterprisePluginRequest({
        requesterAccountId: requester.id,
        packageName: "@acme/native",
        packageFamily: "code_plugin",
        exactVersion: "1.0.0",
        integrity: "sha256:artifact",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: {},
        capabilityDigest: "capability-digest",
      });
      approvalMocks.records.mockReturnValue({
        "acme-native": {
          source: "clawhub",
          clawhubPackage: "@acme/native",
          version: "2.0.0",
          integrity: "sha256:other",
        },
      });
      const install = vi.fn(async () => ({}));

      await expect(
        approveEnterprisePluginRequest({
          config: {},
          reviewer,
          requestId: request.id,
          baseRevision: request.revision,
          install,
        }),
      ).rejects.toMatchObject<Partial<EnterpriseExtensionError>>({
        code: "GLOBAL_VERSION_CONFLICT",
      });
      expect(install).not.toHaveBeenCalled();
      expect(getEnterprisePluginRequest(request.id)?.state).toBe("pending");
    });
  });

  it.each(["1.2.0", "1.2.3"])(
    "retries release %s and grants only after restart exposes its runtime",
    async (clawhubVersion) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const requester = createEnterpriseAccount({
          username: "restart-requester",
          displayName: "Restart Requester",
          passwordHash: "test-only",
          role: "employee",
        });
        const reviewer = createEnterpriseAccount({
          username: "restart-reviewer",
          displayName: "Restart Reviewer",
          passwordHash: "test-only",
          role: "administrator",
        });
        const request = createEnterprisePluginRequest({
          requesterAccountId: requester.id,
          packageName: "@acme/restarted",
          packageFamily: "code_plugin",
          exactVersion: clawhubVersion,
          integrity: "sha256:restarted",
          requestKind: "install",
          trustSnapshot: { disposition: "clean" },
          capabilitySnapshot: { tools: ["acme.restarted.search"] },
          capabilityDigest: "restart-capability-digest",
        });
        const failed = transitionEnterprisePluginRequest({
          id: request.id,
          baseRevision: request.revision,
          from: ["pending"],
          to: "install_failed",
          reviewerAccountId: reviewer.id,
          safeErrorCode: "PLUGIN_INSTALL_FAILED",
        });
        approvalMocks.records.mockReturnValue({
          "acme-restarted": {
            source: "clawhub",
            clawhubPackage: "@acme/restarted",
            clawhubVersion,
            installPath: "/plugins/acme-restarted",
            version: "1.2.0",
            integrity: "sha256:restarted",
          },
        });
        const install = vi.fn(async () => ({}));
        const retried = await approveEnterprisePluginRequest({
          config: {},
          reviewer,
          requestId: failed.id,
          baseRevision: failed.revision,
          install,
        });
        expect(retried).toMatchObject({
          request: { state: "approving", safeErrorCode: null },
          grant: null,
          restartRequired: true,
        });
        expect(getEnterprisePluginRequest(failed.id)?.safeErrorCode).toBeNull();
        expect(install).not.toHaveBeenCalled();
        expect(reconcileApprovingEnterprisePluginRequests()).toEqual({
          available: 0,
          awaitingLoad: 1,
          failed: 0,
        });
        approvalMocks.registry.mockReturnValue({
          plugins: [
            {
              id: "acme-restarted",
              packageName: "@acme/restarted",
              rootDir: "/plugins/acme-restarted",
              packageVersion: "1.2.0",
              status: "loaded",
            },
          ],
          tools: [{ pluginId: "acme-restarted", names: ["acme.restarted.search"] }],
        });

        expect(reconcileApprovingEnterprisePluginRequests()).toEqual({
          available: 1,
          awaitingLoad: 0,
          failed: 0,
        });
        expect(getEnterprisePluginRequest(failed.id)).toMatchObject({
          state: "available",
          safeErrorCode: null,
        });
      });
    },
  );
});
