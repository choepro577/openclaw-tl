import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAgentConfig } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  isGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { createEmptyPluginRegistry } from "../../plugins/registry-empty.js";
import { resetPluginRuntimeStateForTest, setActivePluginRegistry } from "../../plugins/runtime.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { createEnterpriseSession } from "../auth/session-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { personalAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  createEnterprisePluginRequest,
  upsertEnterprisePluginGrant,
} from "../extensions/extension-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { createEnterpriseUserGatewayClient } from "../user/user-gateway-client.js";
import {
  prepareEnterpriseGatewayRequest,
  projectEnterpriseRuntimeConfig,
} from "./enterprise-gateway-policy.js";

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

describe("enterprise gateway policy cache", () => {
  it("rebuilds the projected tool schema after the active plugin registry changes", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.plugin-registry-cache",
        displayName: "Plugin Registry Cache Employee",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      });
      const request = createEnterprisePluginRequest({
        requesterAccountId: account.id,
        packageName: "@acme/native",
        packageFamily: "code_plugin",
        exactVersion: "1.0.0",
        integrity: "sha256:artifact",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: { tools: ["acme.search"] },
        capabilityDigest: "capability-digest",
      });
      upsertEnterprisePluginGrant({
        accountId: account.id,
        pluginId: "acme-native",
        exactVersion: "1.0.0",
        integrity: "sha256:artifact",
        capabilityDigest: "capability-digest",
        approvedTools: ["acme.search"],
        sourceRequestId: request.id,
        state: "active",
      });
      pluginIndexMocks.records.mockReturnValue({
        "acme-native": {
          source: "clawhub",
          clawhubPackage: "@acme/native",
          clawhubVersion: "1.0.0",
          installPath: "/plugins/acme-native",
          version: "1.0.0",
          integrity: "sha256:artifact",
        },
      });
      const loadedRegistry = createEmptyPluginRegistry();
      loadedRegistry.plugins.push({
        id: "acme-native",
        name: "Acme Native",
        packageName: "@acme/native",
        packageVersion: "1.0.0",
        source: "/plugins/acme-native",
        rootDir: "/plugins/acme-native",
        origin: "global",
        enabled: true,
        status: "loaded",
        toolNames: ["acme.search"],
      } as never);
      loadedRegistry.tools.push({
        pluginId: "acme-native",
        names: ["acme.search"],
        factory: () => ({}) as never,
        optional: false,
        source: "/plugins/acme-native",
      });
      setActivePluginRegistry(loadedRegistry, "enterprise-projection-cache-loaded");

      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: { entries: { main: { workspace: state.workspaceDir } } },
      };
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const loaded = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
      expect(resolveAgentConfig(loaded, personalAgentId)?.tools?.alsoAllow).toContain(
        "acme.search",
      );

      setActivePluginRegistry(createEmptyPluginRegistry(), "enterprise-projection-cache-empty");
      const afterRegistryChange = projectEnterpriseRuntimeConfig(config, account, {
        userAudience: true,
      });
      expect(
        resolveAgentConfig(afterRegistryChange, personalAgentId)?.tools?.alsoAllow,
      ).not.toContain("acme.search");
    });
  });

  it("preserves projected model, tools, and skills while keeping admission metadata private", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.projection-cache-quality",
        displayName: "Projection Cache Quality Employee",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
        initialEntitlements: [
          {
            resourceType: "skill",
            resourceId: "skill:global:openclaw-workspace:cache-quality",
            effect: "allow",
          },
        ],
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: {
          defaults: {
            model: {
              primary: "openai/gpt-5.6-sol",
              fallbacks: ["openai/gpt-5.5"],
            },
            skills: ["cache-quality"],
          },
          entries: {
            main: {
              workspace: state.workspaceDir,
              model: {
                primary: "openai/gpt-5.6-sol",
                fallbacks: ["openai/gpt-5.5"],
              },
              skills: ["cache-quality"],
              tools: {
                profile: "coding",
                allow: ["read", "write"],
                alsoAllow: ["web_search"],
                deny: ["exec"],
              },
            },
          },
        },
        tools: {
          alsoAllow: ["web_search"],
          deny: ["terminal"],
        },
      };
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);

      const firstProjection = projectEnterpriseRuntimeConfig(config, account, {
        userAudience: true,
      });
      const secondProjection = projectEnterpriseRuntimeConfig(config, account, {
        userAudience: true,
      });
      expect(secondProjection).toEqual(firstProjection);
      const firstAgent = resolveAgentConfig(firstProjection, personalAgentId);
      const secondAgent = resolveAgentConfig(secondProjection, personalAgentId);
      expect(secondAgent?.model).toEqual(firstAgent?.model);
      expect(secondAgent?.tools).toEqual(firstAgent?.tools);
      expect(secondAgent?.skills).toEqual(firstAgent?.skills);
      expect(firstAgent?.model).toEqual({
        primary: "openai/gpt-5.6-sol",
        fallbacks: ["openai/gpt-5.5"],
      });
      expect(firstAgent?.skills).toEqual(["cache-quality"]);

      const firstModel = firstAgent?.model as
        | { primary?: string; fallbacks?: string[] }
        | undefined;
      expect(Object.isFrozen(config.agents?.entries?.main?.model)).toBe(false);
      expect(Object.isFrozen(firstModel)).toBe(true);
      expect(Object.isFrozen(firstModel?.fallbacks)).toBe(true);
      expect(() => {
        if (firstModel) {
          firstModel.primary = "mutated/provider";
        }
      }).toThrow(TypeError);
      expect(() => {
        firstModel?.fallbacks?.push("mutated/fallback");
      }).toThrow(TypeError);

      const afterNestedMutationAttempt = projectEnterpriseRuntimeConfig(config, account, {
        userAudience: true,
      });
      expect(resolveAgentConfig(afterNestedMutationAttempt, personalAgentId)?.model).toEqual({
        primary: "openai/gpt-5.6-sol",
        fallbacks: ["openai/gpt-5.5"],
      });

      const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
      const session = createEnterpriseSession(account.id);
      const firstAdmission = prepareEnterpriseGatewayRequest({
        client: createEnterpriseUserGatewayClient(account, session.sessionId),
        context,
        method: "chat.send",
        requestParams: { agentId: personalAgentId },
      });
      const secondAdmission = prepareEnterpriseGatewayRequest({
        client: createEnterpriseUserGatewayClient(account, session.sessionId),
        context,
        method: "chat.send",
        requestParams: { agentId: personalAgentId },
      });
      expect(firstAdmission.allowed).toBe(true);
      expect(secondAdmission.allowed).toBe(true);
      if (!firstAdmission.allowed || !secondAdmission.allowed) {
        throw new Error("Expected both user admissions to succeed");
      }
      const firstScoped = firstAdmission.context.getRuntimeConfig();
      const secondScoped = secondAdmission.context.getRuntimeConfig();
      expect(isGatewayRequestScopedRuntimeConfig(firstScoped)).toBe(true);
      expect(isGatewayRequestScopedRuntimeConfig(secondScoped)).toBe(true);
      expect(secondScoped).toEqual(firstScoped);
      expect(secondScoped).not.toBe(firstScoped);
      const firstMetadata = readGatewayRequestRuntimeMetadata(firstScoped);
      const secondMetadata = readGatewayRequestRuntimeMetadata(secondScoped);
      expect(firstMetadata?.enterpriseUser).toBeDefined();
      expect(secondMetadata?.enterpriseUser).toBeDefined();
      if (!firstMetadata?.enterpriseUser || !secondMetadata?.enterpriseUser) {
        throw new Error("Expected request-private Enterprise user metadata");
      }
      expect(secondMetadata.enterpriseUser).not.toBe(firstMetadata.enterpriseUser);
      firstMetadata.enterpriseUser.displayName = "mutated request metadata";
      expect(secondMetadata.enterpriseUser.displayName).toBe(account.displayName);

      replaceEnterpriseEntitlements(account.id, [
        {
          resourceType: "agent",
          resourceId: personalAgentResourceKey(account.id),
          effect: "deny",
        },
      ]);
      expect(
        prepareEnterpriseGatewayRequest({
          client: createEnterpriseUserGatewayClient(account, session.sessionId),
          context,
          method: "chat.send",
          requestParams: { agentId: personalAgentId },
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_AGENT_DENIED" });
    });
  });
});
