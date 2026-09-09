import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { createEmptyPluginRegistry } from "../../plugins/registry-empty.js";
import { resetPluginRuntimeStateForTest, setActivePluginRegistry } from "../../plugins/runtime.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { writeEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import {
  createEnterprisePluginRequest,
  listEnterpriseAccountPluginGrants,
  upsertEnterprisePluginGrant,
} from "../extensions/extension-store.js";
import { compileEnterpriseToolPolicy } from "./enterprise-tool-policy.js";

const pluginIndexMocks = vi.hoisted(() => ({
  records: vi.fn<() => Record<string, Record<string, unknown>>>(() => ({})),
}));

vi.mock("../../plugins/installed-plugin-index-records.js", () => ({
  loadInstalledPluginIndexInstallRecordsSync: pluginIndexMocks.records,
}));

afterEach(() => {
  pluginIndexMocks.records.mockReset();
  pluginIndexMocks.records.mockReturnValue({});
  resetPluginRuntimeStateForTest();
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise native plugin account grants", () => {
  it.each([
    [undefined, "release"],
    ["1.0.2", "release"],
    ["1.0.2", "runtime"],
    ["1.0.2", "integrity"],
    ["1.0.2", "path"],
  ])(
    "grants only the approved snapshot for release %s and suspends on %s drift",
    async (clawhubVersion, drift) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const account = createEnterpriseAccount({
          username: "plugin-grant",
          displayName: "Plugin Grant",
          passwordHash: "test-only",
          role: "employee",
        });
        const request = createEnterprisePluginRequest({
          requesterAccountId: account.id,
          packageName: "@acme/native",
          packageFamily: "code_plugin",
          exactVersion: clawhubVersion ?? "1.0.0",
          integrity: "sha256:artifact",
          requestKind: "install",
          trustSnapshot: { disposition: "clean" },
          capabilitySnapshot: { tools: ["acme.search", "gateway"] },
          capabilityDigest: "capability-digest",
        });
        upsertEnterprisePluginGrant({
          accountId: account.id,
          pluginId: "acme-native",
          exactVersion: clawhubVersion ?? "1.0.0",
          integrity: "sha256:artifact",
          capabilityDigest: "capability-digest",
          approvedTools: ["acme.search", "gateway"],
          sourceRequestId: request.id,
          state: "active",
        });
        pluginIndexMocks.records.mockReturnValue({
          "acme-native": {
            source: "clawhub",
            clawhubPackage: "@acme/native",
            clawhubVersion,
            installPath: "/plugins/acme-native",
            version: "1.0.0",
            integrity: "sha256:artifact",
          },
        });
        const registry = createEmptyPluginRegistry();
        registry.plugins.push({
          id: "acme-native",
          name: "Acme Native",
          packageName: "@acme/native",
          packageVersion: "1.0.0",
          source: "/plugins/acme-native",
          rootDir: "/plugins/acme-native",
          origin: "global",
          enabled: true,
          status: "loaded",
          toolNames: ["acme.search", "gateway"],
        } as never);
        registry.tools.push({
          pluginId: "acme-native",
          names: ["acme.search", "gateway", "acme.future"],
          factory: () => ({}) as never,
          optional: false,
          source: "/plugins/acme-native",
        });
        setActivePluginRegistry(registry, "enterprise-plugin-grant-test");

        const config: OpenClawConfig = {
          enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        };
        const compiled = compileEnterpriseToolPolicy(config, account);
        expect(compiled.allow).toContain("acme.search");
        expect(compiled.allow).not.toContain("acme.future");
        expect(compiled.allow).not.toContain("gateway");
        expect(compiled.deny).toContain("gateway");

        writeEnterpriseAccountToolPolicy(account.id, 0, {
          profile: "full",
          alsoAllow: [],
          deny: ["acme.search"],
        });
        expect(compileEnterpriseToolPolicy(config, account).deny).toContain("acme.search");

        pluginIndexMocks.records.mockReturnValue({
          "acme-native": {
            source: "clawhub",
            clawhubPackage: "@acme/native",
            clawhubVersion: drift === "release" ? "2.0.0" : clawhubVersion,
            installPath: drift === "path" ? "/plugins/other-copy" : "/plugins/acme-native",
            version: drift === "runtime" ? "2.0.0" : "1.0.0",
            integrity: drift === "integrity" ? "sha256:new-artifact" : "sha256:artifact",
          },
        });
        expect(compileEnterpriseToolPolicy(config, account).allow).not.toContain("acme.search");
        expect(listEnterpriseAccountPluginGrants(account.id)).toMatchObject([
          { state: drift === "path" ? "unavailable" : "suspended_version_mismatch" },
        ]);
      });
    },
  );
});
