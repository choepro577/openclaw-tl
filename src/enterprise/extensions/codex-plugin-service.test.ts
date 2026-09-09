import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  createEnterpriseAccount,
  deleteEnterpriseAccountForBootstrapRollback,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import {
  approveEnterpriseCodexPluginRequest,
  connectEnterpriseCodexGrant,
  listEnterpriseCodexPlugins,
  refreshEnterpriseCodexGrant,
  reviewEnterpriseCodexPlugin,
} from "./codex-plugin-service.js";
import {
  createEnterpriseCodexPluginRequest,
  getEnterpriseCodexPluginGrant,
  getEnterpriseCodexPluginRequest,
  listEnterpriseAccountCodexPluginGrants,
  transitionEnterpriseCodexPluginGrant,
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

function enterpriseConfig(workspace: string): OpenClawConfig {
  return {
    enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
    agents: { entries: { main: { workspace } } },
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
    },
    capabilityDigest: "sha256:reviewed",
    ...overrides,
  });
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

describe("Enterprise Codex plugin lifecycle", () => {
  it("fails closed when the authenticated account was deleted", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester } = accounts();
      deleteEnterpriseAccountForBootstrapRollback(requester.id);

      await expect(
        reviewEnterpriseCodexPlugin({
          config,
          account: requester,
          agentKey: "personal",
          pluginId: "gmail@openai-curated-remote",
          runtime: createRuntime(),
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
    });
  });

  it("requires the reviewed digest and preserves the discovered remote marketplace identity", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester);
      const runtime = createRuntime();

      const approved = await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });

      expect(approved.request.state).toBe("available");
      expect(approved.grant).toMatchObject({
        pluginName: "gmail",
        marketplaceName: "openai-curated-remote",
        installedPluginId: "gmail@openai-curated-remote",
        capabilityDigest: "sha256:reviewed",
      });
      expect(runtime.install).toHaveBeenCalledWith(
        expect.objectContaining({ marketplaceName: "openai-curated-remote" }),
      );

      const mismatch = seedRequest(config, requester, {
        pluginName: "linear",
        marketplaceName: "openai-curated-remote",
        remotePluginId: "remote-linear",
        capabilitySnapshot: { version: 1, summary: { id: "linear@openai-curated-remote" } },
      });
      const changedRuntime = createRuntime({
        item: catalogItem({
          id: "linear@openai-curated-remote",
          pluginName: "linear",
          remotePluginId: "remote-linear",
        }),
        capabilityDigest: "sha256:changed",
      });
      await expect(
        approveEnterpriseCodexPluginRequest({
          config,
          reviewer,
          requestId: mismatch.id,
          baseRevision: mismatch.revision,
          runtime: changedRuntime,
        }),
      ).rejects.toMatchObject({ code: "CODEX_PLUGIN_CAPABILITY_CHANGED" });
      expect(getEnterpriseCodexPluginRequest(mismatch.id)?.state).toBe("pending");
      expect(changedRuntime.install).not.toHaveBeenCalled();
    });
  });

  it("never marks a grant ready when the post-install auth status read fails", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester);
      const runtime = createRuntime({
        authStatus: vi.fn(async () => {
          throw new Error("connector status unavailable");
        }),
      });

      const approved = await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });

      expect(approved.grant.ready).toBe(false);
      expect(approved.request.state).toBe("available");
      const detail = await reviewEnterpriseCodexPlugin({
        config,
        account: requester,
        agentKey: "personal",
        pluginId: "gmail@openai-curated-remote",
        runtime,
      });
      expect(detail.item.ready).toBe(false);
      expect(detail.item.authRequired).toBe(false);
    });
  });

  it("projects persisted connector setup links onto the plugin detail item", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester);
      const runtime = createRuntime({
        authStatus: vi.fn(async () => ({
          authRequired: true,
          appsNeedingAuth: [
            { id: "gmail", name: "Gmail", installUrl: "https://accounts.example.test/connect" },
          ],
          connectUrls: ["https://accounts.example.test/connect"],
          ready: false,
        })),
      });

      await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });
      const detail = await reviewEnterpriseCodexPlugin({
        config,
        account: requester,
        agentKey: "personal",
        pluginId: "gmail@openai-curated-remote",
        runtime,
      });

      expect(detail.item).toMatchObject({
        authRequired: true,
        appsNeedingAuth: [
          { id: "gmail", name: "Gmail", installUrl: "https://accounts.example.test/connect" },
        ],
        connectUrls: ["https://accounts.example.test/connect"],
        ready: false,
      });
    });
  });

  it("preserves per-app connected account metadata without provider secrets", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester);
      const authStatus = vi.fn(async () => ({
        authRequired: true,
        apps: [
          {
            id: "gmail",
            name: "Gmail",
            needsAuth: true,
            installUrl: "https://accounts.example.test/gmail",
            accountsStatus: "available" as const,
            addAccountUrl: "https://accounts.example.test/gmail/add",
            accounts: [
              {
                id: "primary",
                name: "Personal",
                email: "primary@example.com",
                avatarUrl: "https://accounts.example.test/avatar/primary",
                authStatus: "connected",
                authType: "oauth",
                accessToken: "must-not-leak",
              },
            ],
            secretToken: "must-not-leak",
          },
        ],
        appsNeedingAuth: [],
        connectUrls: ["https://accounts.example.test/gmail"],
        ready: false,
      }));
      const runtime = createRuntime({ authStatus });
      await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });

      const detail = await reviewEnterpriseCodexPlugin({
        config,
        account: requester,
        agentKey: "personal",
        pluginId: "gmail@openai-curated-remote",
        runtime,
      });
      expect(detail.auth?.apps?.[0]).toMatchObject({
        id: "gmail",
        accountsStatus: "available",
        addAccountUrl: "https://accounts.example.test/gmail/add",
        accounts: [
          {
            id: "primary",
            name: "Personal",
            email: "primary@example.com",
            avatarUrl: "https://accounts.example.test/avatar/primary",
            authStatus: "connected",
            authType: "oauth",
          },
        ],
      });
      expect(detail.auth?.apps?.[0]).not.toHaveProperty("secretToken");
      expect(detail.auth?.apps?.[0]?.accounts?.[0]).not.toHaveProperty("accessToken");

      authStatus.mockResolvedValue({
        authRequired: false,
        apps: [
          {
            id: "gmail",
            name: "Gmail",
            needsAuth: false,
            installUrl: null,
            accountsStatus: "unavailable" as const,
            addAccountUrl: "javascript:alert(1)",
            accounts: [],
          },
        ],
        appsNeedingAuth: [],
        connectUrls: [],
        ready: false,
      });
      const unavailable = await reviewEnterpriseCodexPlugin({
        config,
        account: requester,
        agentKey: "personal",
        pluginId: "gmail@openai-curated-remote",
        runtime,
      });
      expect(unavailable.auth?.apps?.[0]).toMatchObject({
        accounts: [],
        accountsStatus: "unavailable",
        addAccountUrl: null,
      });
    });
  });

  it("starts MCP OAuth only for an active grant's reviewed server", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester, {
        capabilitySnapshot: {
          version: 1,
          summary: { id: "gmail@openai-curated-remote", name: "gmail" },
          apps: [],
          mcpServers: ["gmail-server"],
        },
      });
      const item = catalogItem({ installed: true, enabled: true });
      const beginMcpOAuthLogin = vi.fn(
        async (serverName: string, options?: { expectedPluginId?: string }) => {
          expect(serverName).toBe("gmail-server");
          expect(options).toEqual({ expectedPluginId: "gmail@openai-curated-remote" });
          return {
            name: serverName,
            authorizationUrl: "https://accounts.example.test/oauth/authorize",
          };
        },
      );
      const runtime = createRuntime({
        item,
        capabilitySnapshot: {
          version: 1,
          summary: { id: item.id, name: item.name },
          apps: [],
          mcpServers: ["gmail-server"],
        },
        beginMcpOAuthLogin,
      });
      const approved = await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });

      await expect(
        connectEnterpriseCodexGrant({
          config,
          account: requester,
          agentKey: "personal",
          grantId: approved.grant.id,
          baseRevision: approved.grant.revision,
          serverName: "gmail-server",
          runtime,
        }),
      ).resolves.toEqual({
        authorizationUrl: "https://accounts.example.test/oauth/authorize",
      });
      expect(beginMcpOAuthLogin).toHaveBeenCalledTimes(1);

      await expect(
        connectEnterpriseCodexGrant({
          config,
          account: requester,
          agentKey: "personal",
          grantId: approved.grant.id,
          baseRevision: approved.grant.revision,
          serverName: "other-server",
          runtime,
        }),
      ).rejects.toMatchObject({ code: "CODEX_MCP_SERVER_NOT_GRANTED" });
      expect(beginMcpOAuthLogin).toHaveBeenCalledTimes(1);
    });
  });

  it("does not return an OAuth URL after the grant is revoked during login", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester, reviewer } = accounts();
      const request = seedRequest(config, requester, {
        capabilitySnapshot: {
          version: 1,
          summary: { id: "gmail@openai-curated-remote", name: "gmail" },
          apps: [],
          mcpServers: ["gmail-server"],
        },
      });
      const item = catalogItem({ installed: true, enabled: true });
      const loginStarted = Promise.withResolvers<void>();
      const releaseLogin = Promise.withResolvers<void>();
      const beginMcpOAuthLogin = vi.fn(async (serverName: string) => {
        loginStarted.resolve();
        await releaseLogin.promise;
        return {
          name: serverName,
          authorizationUrl: "https://accounts.example.test/oauth/authorize",
        };
      });
      const runtime = createRuntime({
        item,
        capabilitySnapshot: {
          version: 1,
          summary: { id: item.id, name: item.name },
          apps: [],
          mcpServers: ["gmail-server"],
        },
        beginMcpOAuthLogin,
      });
      const approved = await approveEnterpriseCodexPluginRequest({
        config,
        reviewer,
        requestId: request.id,
        baseRevision: request.revision,
        runtime,
      });
      const connect = connectEnterpriseCodexGrant({
        config,
        account: requester,
        agentKey: "personal",
        grantId: approved.grant.id,
        baseRevision: approved.grant.revision,
        serverName: "gmail-server",
        runtime,
      });
      await loginStarted.promise;
      transitionEnterpriseCodexPluginGrant({
        id: approved.grant.id,
        accountId: requester.id,
        baseRevision: approved.grant.revision,
        state: "revoked",
      });
      releaseLogin.resolve();

      await expect(connect).rejects.toMatchObject({ code: "CODEX_PLUGIN_REVISION_CONFLICT" });
      expect(getEnterpriseCodexPluginGrant(approved.grant.id)?.state).toBe("revoked");
    });
  });

  it.each([
    ["account", { enabled: false }],
    ["personal Agent", { personalAgentEnabled: false }],
  ] as const)(
    "does not activate after %s scope is disabled during install",
    async (_label, patch) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const config = enterpriseConfig(state.workspaceDir);
        const { requester, reviewer } = accounts();
        const request = seedRequest(config, requester);
        const installStarted = Promise.withResolvers<void>();
        const releaseInstall = Promise.withResolvers<void>();
        const runtime = createRuntime({
          install: vi.fn(async () => {
            installStarted.resolve();
            await releaseInstall.promise;
            return {
              installedPluginId: "gmail@openai-curated-remote",
              authRequired: false,
              ready: true,
            };
          }),
        });
        const approval = approveEnterpriseCodexPluginRequest({
          config,
          reviewer,
          requestId: request.id,
          baseRevision: request.revision,
          runtime,
        });
        await installStarted.promise;
        updateEnterpriseAccount(requester.id, patch);
        releaseInstall.resolve();

        await expect(approval).rejects.toMatchObject({ code: "CODEX_REQUEST_SCOPE_CHANGED" });
        expect(getEnterpriseCodexPluginRequest(request.id)?.state).toBe("install_failed");
        expect(listEnterpriseAccountCodexPluginGrants(requester.id)).toEqual([]);
      });
    },
  );

  it("cannot let a slow auth refresh revive a concurrently revoked grant", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester } = accounts();
      const request = seedRequest(config, requester);
      transitionEnterpriseCodexPluginRequest({
        id: request.id,
        baseRevision: request.revision,
        from: ["pending"],
        to: "available",
        installedPluginId: "gmail@openai-curated-remote",
      });
      const grant = upsertEnterpriseCodexPluginGrant({
        accountId: requester.id,
        agentKey: "personal",
        runtimeAgentId: request.runtimeAgentId,
        pluginName: request.pluginName,
        marketplaceName: request.marketplaceName,
        remotePluginId: request.remotePluginId,
        installedPluginId: request.installedPluginId ?? "gmail@openai-curated-remote",
        capabilitySnapshot: request.capabilitySnapshot,
        capabilityDigest: request.capabilityDigest,
        sourceRequestId: request.id,
        state: "active",
      });
      const statusStarted = Promise.withResolvers<void>();
      const releaseStatus = Promise.withResolvers<void>();
      const runtime = createRuntime({
        authStatus: vi.fn(async () => {
          statusStarted.resolve();
          await releaseStatus.promise;
          return { authRequired: false, appsNeedingAuth: [], connectUrls: [], ready: true };
        }),
      });
      const refresh = refreshEnterpriseCodexGrant({
        config,
        account: requester,
        agentKey: "personal",
        grantId: grant.id,
        baseRevision: grant.revision,
        runtime,
      });
      await statusStarted.promise;
      transitionEnterpriseCodexPluginGrant({
        id: grant.id,
        accountId: requester.id,
        baseRevision: grant.revision,
        state: "revoked",
      });
      releaseStatus.resolve();

      await expect(refresh).rejects.toMatchObject({ code: "CODEX_PLUGIN_REVISION_CONFLICT" });
      expect(getEnterpriseCodexPluginGrant(grant.id)?.state).toBe("revoked");
    });
  });

  it("maps public names to exact runtime identities and fails closed on ambiguity", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname.endsWith("/.agents/plugins/marketplace.json")) {
        return new Response(
          JSON.stringify({
            plugins: [
              {
                name: "gmail",
                source: { source: "local", path: "./plugins/gmail" },
                policy: { installation: "AVAILABLE" },
                category: "Communication",
              },
              {
                name: "magicpath",
                source: { source: "local", path: "./plugins/magicpath" },
                policy: { installation: "AVAILABLE" },
                category: "Developer Tools",
              },
              {
                name: "chatcut",
                source: { source: "local", path: "./plugins/chatcut" },
                policy: { installation: "AVAILABLE" },
                category: "Creativity",
              },
              {
                name: "dropbox",
                source: { source: "local", path: "./plugins/dropbox" },
                policy: { installation: "AVAILABLE" },
                category: "Productivity",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        );
      }
      const manifests: Record<string, { displayName: string; description: string }> = {
        gmail: { displayName: "Gmail", description: "Read and manage Gmail" },
        magicpath: { displayName: "MagicPath", description: "Build interfaces" },
        chatcut: { displayName: "ChatCut", description: "Edit video" },
        dropbox: { displayName: "Dropbox", description: "Manage files" },
      };
      const pluginName = Object.keys(manifests).find((name) =>
        url.pathname.endsWith(`/plugins/${name}/.codex-plugin/plugin.json`),
      );
      if (pluginName) {
        const manifest = manifests[pluginName]!;
        return new Response(
          JSON.stringify({
            name: pluginName,
            interface: {
              displayName: manifest.displayName,
              shortDescription: manifest.description,
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const config = enterpriseConfig(state.workspaceDir);
      const { requester } = accounts();
      const runtime = createRuntime();
      const exactGmail = catalogItem({ name: "Runtime Gmail" });
      const renamedMagicPath = catalogItem({
        id: "app-6a883213fb288191aa91f89a5db31f60@openai-curated-remote",
        pluginName: "app-6a883213fb288191aa91f89a5db31f60",
        name: "MagicPath",
        remotePluginId: "plugin_asdk_app_6a883213fb288191aa91f89a5db31f60",
      });
      const renamedChatCut = catalogItem({
        id: "chatcut-desktop@openai-curated-remote",
        pluginName: "chatcut-desktop",
        name: "ChatCut",
        remotePluginId: "plugins_6a8c039995c08191932d494269209307",
      });
      const ambiguousDropbox = [
        catalogItem({
          id: "app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote",
          pluginName: "app-69b31dc2110c8191b8b47dc98fe5a052",
          name: "Dropbox",
          remotePluginId: "plugin_asdk_app_69b31dc2110c8191b8b47dc98fe5a052",
        }),
        catalogItem({
          id: "dropbox-other@openai-curated-remote",
          pluginName: "dropbox-other",
          name: "Dropbox",
          remotePluginId: "remote-dropbox-other",
        }),
      ];
      runtime.list = vi.fn(async () => ({
        items: [exactGmail, renamedMagicPath, renamedChatCut, ...ambiguousDropbox],
        warnings: [],
      }));
      const result = await listEnterpriseCodexPlugins({
        config,
        account: requester,
        agentKey: "personal",
        runtime,
      });

      expect(result.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "gmail@openai-curated-remote",
            marketplaceName: "openai-curated-remote",
            name: "Gmail",
            description: "Read and manage Gmail",
          }),
          expect.objectContaining({
            id: "app-6a883213fb288191aa91f89a5db31f60@openai-curated-remote",
            pluginName: "app-6a883213fb288191aa91f89a5db31f60",
            name: "MagicPath",
            description: "Build interfaces",
          }),
          expect.objectContaining({
            id: "chatcut-desktop@openai-curated-remote",
            pluginName: "chatcut-desktop",
            name: "ChatCut",
            description: "Edit video",
          }),
          expect.objectContaining({
            id: "dropbox@openai-curated",
            available: false,
            name: "Dropbox",
            description: "Manage files",
          }),
        ]),
      );

      runtime.list = vi.fn(async () => ({
        items: [ambiguousDropbox[0]!],
        warnings: [],
      }));
      const searchResult = await listEnterpriseCodexPlugins({
        config,
        account: requester,
        agentKey: "personal",
        runtime,
        query: "dropbox",
      });
      expect(searchResult.items).toHaveLength(1);
      expect(searchResult.items[0]).toMatchObject({
        id: "app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote",
        name: "Dropbox",
        description: "Manage files",
      });
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
