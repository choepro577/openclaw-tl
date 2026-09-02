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
  it("skips a matching global install and grants only active-registry tools", async () => {
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
        exactVersion: "1.0.0",
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
          version: "1.0.0",
          integrity: "sha256:artifact",
        },
      });
      approvalMocks.catalog.mockResolvedValue({
        plugins: [{ id: "acme-native", packageName: "@acme/native", version: "1.0.0" }],
      });
      approvalMocks.registry.mockReturnValue({
        plugins: [
          {
            id: "acme-native",
            packageName: "@acme/native",
            packageVersion: "1.0.0",
            status: "loaded",
          },
        ],
        tools: [{ pluginId: "acme-native", names: ["acme.search"] }],
      });
      const install = vi.fn(async () => ({}));

      const result = await approveEnterprisePluginRequest({
        config: {},
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        install,
      });

      expect(install).not.toHaveBeenCalled();
      expect(result.request.state).toBe("available");
      expect(result.grant).toMatchObject({
        accountId: requester.id,
        pluginId: "acme-native",
        approvedTools: ["acme.search"],
        state: "active",
      });
    });
  });

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

  it("activates an approving grant only after restart exposes the loaded plugin", async () => {
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
        exactVersion: "1.2.0",
        integrity: "sha256:restarted",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: { tools: ["acme.restarted.search"] },
        capabilityDigest: "restart-capability-digest",
      });
      const approving = transitionEnterprisePluginRequest({
        id: request.id,
        baseRevision: request.revision,
        from: ["pending"],
        to: "approving",
        reviewerAccountId: reviewer.id,
        installedPluginId: "acme-restarted",
      });
      approvalMocks.records.mockReturnValue({
        "acme-restarted": {
          source: "clawhub",
          clawhubPackage: "@acme/restarted",
          version: "1.2.0",
          integrity: "sha256:restarted",
        },
      });
      approvalMocks.registry.mockReturnValue({
        plugins: [
          {
            id: "acme-restarted",
            packageName: "@acme/restarted",
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
      expect(getEnterprisePluginRequest(approving.id)?.state).toBe("available");
    });
  });
});
