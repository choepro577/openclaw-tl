import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { enterpriseSharedAgentKey } from "../user/user-agent-key.js";
import { approveEnterpriseCodexPluginRequest } from "./codex-plugin-service.js";
import {
  CODEX_CONNECTOR_IDENTITY_REQUIRED,
  createEnterpriseCodexPluginRequest,
  getEnterpriseCodexPluginRequest,
  listActiveEnterpriseCodexPluginGrants,
  listActiveEnterpriseSharedCodexPluginGrantFingerprints,
  listEnterpriseAccountCodexPluginGrants,
  transitionEnterpriseCodexPluginRequest,
  upsertEnterpriseCodexPluginGrant,
} from "./codex-plugin-store.js";
import type {
  EnterpriseCodexPluginCatalogItem,
  EnterpriseCodexPluginRuntime,
} from "./codex-plugin-types.js";

let accountSequence = 0;

afterEach(() => {
  vi.unstubAllGlobals();
  closeOpenClawStateDatabaseForTest();
});

function sharedEnterpriseConfig(workspace: string): OpenClawConfig {
  return {
    enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
    agents: {
      entries: {
        main: { workspace },
        support: { workspace, name: "Support Agent" },
      },
    },
  };
}

function catalogItem(overrides: Partial<EnterpriseCodexPluginCatalogItem> = {}) {
  return {
    id: "gmail@openai-curated-remote",
    pluginName: "gmail",
    marketplaceName: "openai-curated-remote",
    remotePluginId: "remote-gmail",
    name: "gmail",
    description: "",
    installed: false,
    enabled: false,
    available: true,
    installPolicy: null,
    authPolicy: null,
    requestState: null,
    grantState: null,
    ...overrides,
  } satisfies EnterpriseCodexPluginCatalogItem;
}

function createRuntime(
  params: {
    item?: EnterpriseCodexPluginCatalogItem;
    capabilityDigest?: string;
    capabilitySnapshot?: Record<string, unknown>;
    install?: EnterpriseCodexPluginRuntime["install"];
    authStatus?: EnterpriseCodexPluginRuntime["authStatus"];
    beginMcpOAuthLogin?: EnterpriseCodexPluginRuntime["beginMcpOAuthLogin"];
  } = {},
): EnterpriseCodexPluginRuntime {
  const item = params.item ?? catalogItem();
  const capabilitySnapshot = params.capabilitySnapshot ?? {
    version: 1,
    summary: { id: item.id, name: item.name },
    apps: [],
    appTemplates: [],
    mcpServers: [],
  };
  return {
    list: vi.fn(async () => ({ items: [item], warnings: [] })),
    detail: vi.fn(async () => ({
      item,
      capabilitySnapshot,
      capabilityDigest: params.capabilityDigest ?? "sha256:reviewed",
    })),
    install:
      params.install ??
      vi.fn(async () => ({
        item,
        installedPluginId: item.id,
        authRequired: false,
        appsNeedingAuth: [],
        connectUrls: [],
        ready: true,
      })),
    ...(params.authStatus ? { authStatus: params.authStatus } : {}),
    ...(params.beginMcpOAuthLogin ? { beginMcpOAuthLogin: params.beginMcpOAuthLogin } : {}),
  };
}

function seedRequest(
  config: OpenClawConfig,
  account: ReturnType<typeof createEnterpriseAccount>,
  overrides: Partial<Parameters<typeof createEnterpriseCodexPluginRequest>[0]> = {},
) {
  const runtimeAgentId = resolveEnterprisePersonalAgentId(config, account);
  return createEnterpriseCodexPluginRequest({
    requesterAccountId: account.id,
    agentKey: "personal",
    runtimeAgentId,
    pluginName: "gmail",
    marketplaceName: "openai-curated-remote",
    remotePluginId: "remote-gmail",
    requestKind: "install",
    catalogSnapshot: { id: "gmail@openai-curated-remote" },
    capabilitySnapshot: {
      version: 1,
      summary: { id: "gmail@openai-curated-remote", name: "gmail" },
      apps: [],
      appTemplates: [],
      mcpServers: [],
    },
    capabilityDigest: "sha256:reviewed",
    ...overrides,
  });
}

function hostedCapabilitySnapshot(pluginId = "gmail@openai-curated-remote") {
  return {
    version: 1,
    summary: { id: pluginId, name: pluginId.split("@")[0] },
    apps: [{ id: "gmail", name: "Gmail" }],
    appTemplates: [],
    mcpServers: [],
  } satisfies Record<string, unknown>;
}

function accounts() {
  const suffix = String(accountSequence++);
  const requester = createEnterpriseAccount({
    username: `codex-requester-${suffix}`,
    displayName: "Codex Requester",
    passwordHash: "test-only",
    role: "employee",
    mustChangePassword: false,
  });
  const reviewer = createEnterpriseAccount({
    username: `codex-reviewer-${suffix}`,
    displayName: "Codex Reviewer",
    passwordHash: "test-only",
    role: "administrator",
    mustChangePassword: false,
  });
  return { requester, reviewer };
}

describe("Enterprise Codex connector guards", () => {
  it("blocks hosted connector handoff for every member while preserving private grants", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { requester, reviewer } = accounts();
      const memberA = createEnterpriseAccount({
        username: "codex-member-a-" + accountSequence++,
        displayName: "Codex Member A",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      });
      const memberB = createEnterpriseAccount({
        username: "codex-member-b-" + accountSequence++,
        displayName: "Codex Member B",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      });
      const sharedRequest = createEnterpriseCodexPluginRequest({
        requesterAccountId: requester.id,
        scope: "shared_agent",
        agentKey: "shared:support",
        runtimeAgentId: "support",
        pluginName: "hosted-mailbox",
        marketplaceName: "openai-curated",
        remotePluginId: "hosted-mailbox",
        requestKind: "install",
        catalogSnapshot: { id: "hosted-mailbox@openai-curated" },
        capabilitySnapshot: hostedCapabilitySnapshot("hosted-mailbox@openai-curated"),
        capabilityDigest: "sha256:hosted",
      });
      const sharedAvailable = transitionEnterpriseCodexPluginRequest({
        id: sharedRequest.id,
        baseRevision: sharedRequest.revision,
        from: ["pending"],
        to: "available",
        reviewerAccountId: reviewer.id,
        installedPluginId: "hosted-mailbox",
      });
      upsertEnterpriseCodexPluginGrant({
        accountId: requester.id,
        scope: "shared_agent",
        agentKey: sharedAvailable.agentKey,
        runtimeAgentId: sharedAvailable.runtimeAgentId,
        pluginName: sharedAvailable.pluginName,
        marketplaceName: sharedAvailable.marketplaceName,
        installedPluginId: "hosted-mailbox",
        capabilitySnapshot: hostedCapabilitySnapshot("hosted-mailbox@openai-curated"),
        capabilityDigest: sharedAvailable.capabilityDigest,
        sourceRequestId: sharedAvailable.id,
        approvedByAccountId: reviewer.id,
        state: "active",
      });

      expect(() => listActiveEnterpriseCodexPluginGrants(memberA.id, "support")).toThrow(
        expect.objectContaining({ code: CODEX_CONNECTOR_IDENTITY_REQUIRED }),
      );
      expect(() => listActiveEnterpriseCodexPluginGrants(memberB.id, "support")).toThrow(
        expect.objectContaining({ code: CODEX_CONNECTOR_IDENTITY_REQUIRED }),
      );
      expect(listActiveEnterpriseSharedCodexPluginGrantFingerprints(memberA.id, "support")).toEqual(
        expect.arrayContaining([
          {
            pluginName: "hosted-mailbox",
            marketplaceName: "openai-curated",
            installedPluginId: "hosted-mailbox",
            capabilityDigest: "sha256:hosted",
          },
        ]),
      );

      const privateRequest = createEnterpriseCodexPluginRequest({
        requesterAccountId: requester.id,
        scope: "account",
        agentKey: "personal",
        runtimeAgentId: "private-runtime",
        pluginName: "private-mailbox",
        marketplaceName: "openai-curated",
        remotePluginId: "private-mailbox",
        requestKind: "install",
        catalogSnapshot: { id: "private-mailbox@openai-curated" },
        capabilitySnapshot: hostedCapabilitySnapshot("private-mailbox@openai-curated"),
        capabilityDigest: "sha256:private",
      });
      const privateAvailable = transitionEnterpriseCodexPluginRequest({
        id: privateRequest.id,
        baseRevision: privateRequest.revision,
        from: ["pending"],
        to: "available",
        reviewerAccountId: reviewer.id,
        installedPluginId: "private-mailbox",
      });
      upsertEnterpriseCodexPluginGrant({
        accountId: requester.id,
        scope: "account",
        agentKey: privateAvailable.agentKey,
        runtimeAgentId: privateAvailable.runtimeAgentId,
        pluginName: privateAvailable.pluginName,
        marketplaceName: privateAvailable.marketplaceName,
        installedPluginId: "private-mailbox",
        capabilitySnapshot: privateAvailable.capabilitySnapshot,
        capabilityDigest: privateAvailable.capabilityDigest,
        sourceRequestId: privateAvailable.id,
        approvedByAccountId: reviewer.id,
        state: "active",
      });
      expect(listActiveEnterpriseCodexPluginGrants(requester.id, "private-runtime")).toEqual([
        expect.objectContaining({ pluginName: "private-mailbox" }),
      ]);
    });
  });

  it("rejects a shared hosted connector before provider installation", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = sharedEnterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const resourceKey = sharedAgentResourceKey("support");
      const agentKey = enterpriseSharedAgentKey(resourceKey);
      replaceEnterpriseEntitlements(requester.id, [
        { resourceType: "agent", resourceId: resourceKey, effect: "allow" },
      ]);
      const capabilitySnapshot = hostedCapabilitySnapshot();
      const request = seedRequest(config, requester, {
        scope: "shared_agent",
        agentKey,
        runtimeAgentId: "support",
        capabilitySnapshot,
        capabilityDigest: "sha256:hosted",
      });
      const install = vi.fn(async () => ({
        installedPluginId: "gmail@openai-curated-remote",
        authRequired: false,
        ready: true,
      }));
      const runtime = createRuntime({
        capabilitySnapshot,
        capabilityDigest: "sha256:hosted",
        install,
      });

      await expect(
        approveEnterpriseCodexPluginRequest({
          config,
          reviewer,
          requestId: request.id,
          baseRevision: request.revision,
          runtime,
        }),
      ).rejects.toMatchObject({ code: CODEX_CONNECTOR_IDENTITY_REQUIRED, status: 409 });
      expect(install).not.toHaveBeenCalled();
      expect(getEnterpriseCodexPluginRequest(request.id)).toMatchObject({
        state: "pending",
        revision: request.revision,
      });
      expect(listEnterpriseAccountCodexPluginGrants(requester.id)).toEqual([]);
    });
  });

  it("rejects a malformed shared capability snapshot before provider installation", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = sharedEnterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const resourceKey = sharedAgentResourceKey("support");
      const agentKey = enterpriseSharedAgentKey(resourceKey);
      replaceEnterpriseEntitlements(requester.id, [
        { resourceType: "agent", resourceId: resourceKey, effect: "allow" },
      ]);
      const capabilitySnapshot = {
        version: 1,
        apps: [{ id: "gmail" }],
        appTemplates: [],
        mcpServers: [],
      };
      const request = seedRequest(config, requester, {
        scope: "shared_agent",
        agentKey,
        runtimeAgentId: "support",
        capabilitySnapshot,
        capabilityDigest: "sha256:malformed",
      });
      const install = vi.fn(async () => ({
        installedPluginId: "gmail@openai-curated-remote",
        authRequired: false,
        ready: true,
      }));
      const runtime = createRuntime({
        capabilitySnapshot,
        capabilityDigest: "sha256:malformed",
        install,
      });

      await expect(
        approveEnterpriseCodexPluginRequest({
          config,
          reviewer,
          requestId: request.id,
          baseRevision: request.revision,
          runtime,
        }),
      ).rejects.toMatchObject({ code: CODEX_CONNECTOR_IDENTITY_REQUIRED, status: 409 });
      expect(install).not.toHaveBeenCalled();
      expect(getEnterpriseCodexPluginRequest(request.id)).toMatchObject({
        state: "pending",
        revision: request.revision,
      });
    });
  });
});
