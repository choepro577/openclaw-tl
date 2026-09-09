import { afterEach, describe, expect, it, vi } from "vitest";
import { createCodexEnterprisePluginRuntime } from "./runtime-api.js";

const controlRequest = vi.hoisted(() => vi.fn());
vi.mock("./src/command-rpc.js", () => ({ codexControlRequest: controlRequest }));
vi.mock("./src/app-server/auth-bridge.js", () => ({
  resolveCodexAppServerPreparedAuthProfileSnapshot: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => controlRequest.mockReset());

const reference = {
  pluginName: "example",
  marketplaceName: "approved",
  marketplacePath: "/catalog/approved",
};
const detail = {
  marketplaceName: "approved",
  summary: { id: "example@approved", installed: true, enabled: true },
  apps: [{ id: "gmail", name: "Gmail", installUrl: "https://chatgpt.com/apps/gmail" }],
  mcpServers: [],
};

describe("Codex plugin connector readiness", () => {
  it("keeps public discovery independent of supplemental private marketplace requests", async () => {
    controlRequest.mockResolvedValue({
      marketplaces: [
        {
          name: "approved",
          path: "/catalog/approved",
          plugins: [
            {
              id: "example@approved",
              name: "Example",
              installed: false,
              enabled: false,
            },
          ],
        },
      ],
      marketplaceLoadErrors: [],
    });
    const runtime = createCodexEnterprisePluginRuntime({
      agentDir: "/agent",
      workspaceDir: "/workspace",
    });
    expect((await runtime.listCatalog()).plugins).toMatchObject([{ id: "example@approved" }]);
    expect(controlRequest).toHaveBeenCalledOnce();
    expect(controlRequest.mock.calls[0]?.[2]).toEqual({ cwds: ["/workspace"] });
  });

  it("reads accessibility from the paginated app catalog rather than display metadata", async () => {
    controlRequest.mockImplementation(async (_config, method, params) => {
      switch (method) {
        case "plugin/read":
          return { plugin: detail };
        // These are the actual 0.148 app/read fields: no isAccessible/isEnabled.
        case "app/read":
          return {
            apps: [
              {
                id: "gmail",
                name: "Gmail",
                description: "Email",
                iconUrl: "https://example.com/gmail.png",
              },
            ],
            missingAppIds: [],
          };
        case "app/list":
          return params.cursor
            ? { data: [{ id: "gmail", isAccessible: true, isEnabled: true }], nextCursor: null }
            : { data: [{ id: "other", isAccessible: false, isEnabled: true }], nextCursor: "next" };
        case "app/installed":
          return { apps: [{ id: "gmail", enabled: true, callable: true }] };
        default:
          throw new Error(`Unexpected method: ${method}`);
      }
    });
    const runtime = createCodexEnterprisePluginRuntime({
      agentDir: "/agent",
      workspaceDir: "/workspace",
    });
    const status = await runtime.readAuthStatus(reference, { forceRefresh: false });
    expect(status).toMatchObject({ ready: true, needsAuth: false, connectUrls: [] });
    expect(status.apps).toMatchObject([
      {
        id: "gmail",
        accessible: true,
        callable: true,
        needsAuth: false,
        description: "Email",
        logoUrl: "https://example.com/gmail.png",
        installUrl: "https://chatgpt.com/apps/gmail",
      },
    ]);
    expect(
      controlRequest.mock.calls.find((call) => call[1] === "app/installed")?.[2],
    ).toMatchObject({ forceRefresh: false });
    expect(controlRequest.mock.calls.filter((call) => call[1] === "app/list")).toHaveLength(2);
  });

  it("accepts a connected MCP server on 0.148 without inventing a required runtimeStatus field", async () => {
    controlRequest.mockImplementation(async (_config, method) => {
      if (method === "plugin/read")
        return { plugin: { ...detail, apps: [], mcpServers: ["example"] } };
      if (method === "mcpServerStatus/list")
        return {
          data: [
            {
              name: "example",
              pluginId: "example@approved",
              authStatus: "unsupported",
              serverInfo: { name: "example", version: "1" },
              tools: {},
              resources: [],
              resourceTemplates: [],
            },
          ],
        };
      throw new Error(`Unexpected method: ${method}`);
    });
    const runtime = createCodexEnterprisePluginRuntime({
      agentDir: "/agent",
      workspaceDir: "/workspace",
    });
    expect(await runtime.readAuthStatus(reference)).toMatchObject({
      ready: true,
      needsAuth: false,
      mcpServers: [{ name: "example", ready: true }],
    });
  });
  it("starts OAuth only for the exact reviewed plugin's MCP server", async () => {
    controlRequest.mockImplementation(async (_config, method) => {
      if (method === "mcpServerStatus/list")
        return { data: [{ name: "example", pluginId: "other@approved" }] };
      throw new Error(`Unexpected method: ${method}`);
    });
    const runtime = createCodexEnterprisePluginRuntime({
      agentDir: "/agent",
      workspaceDir: "/workspace",
    });
    await expect(
      runtime.beginMcpOAuthLogin("example", { expectedPluginId: "example@approved" }),
    ).rejects.toThrow("not available in the current agent scope");
    expect(controlRequest.mock.calls.some((call) => call[1] === "mcpServer/oauth/login")).toBe(
      false,
    );
    controlRequest.mockImplementation(async (_config, method, params) => {
      if (method === "mcpServerStatus/list")
        return params.cursor
          ? { data: [{ name: "example", pluginId: "example@approved" }], nextCursor: null }
          : { data: [{ name: "other", pluginId: "other@approved" }], nextCursor: "second" };
      if (method === "mcpServer/oauth/login")
        return { authorizationUrl: "https://example.com/oauth/authorize" };
      throw new Error(`Unexpected method: ${method}`);
    });
    await expect(
      runtime.beginMcpOAuthLogin("example", { expectedPluginId: "example@approved" }),
    ).resolves.toEqual({
      name: "example",
      authorizationUrl: "https://example.com/oauth/authorize",
    });
  });

  it("refreshes existing chat tool inventories after account setup and reports reload failures", async () => {
    let reloadFails = false;
    controlRequest.mockImplementation(async (_config, method) => {
      if (method === "plugin/read") return { plugin: detail };
      if (method === "app/read") return { apps: [{ id: "gmail", name: "Gmail" }] };
      if (method === "app/list")
        return { data: [{ id: "gmail", isAccessible: true, isEnabled: true }] };
      if (method === "app/installed")
        return { apps: [{ id: "gmail", enabled: true, callable: true }] };
      if (method === "config/mcpServer/reload") {
        if (reloadFails) throw new Error("Refresh failed");
        return {};
      }
      throw new Error(`Unexpected method: ${method}`);
    });
    const runtime = createCodexEnterprisePluginRuntime({ agentDir: "/agent" });
    expect(await runtime.readAuthStatus(reference, { forceRefresh: true })).toMatchObject({
      ready: true,
    });
    const methods = controlRequest.mock.calls.map((call) => call[1]);
    expect(methods.indexOf("config/mcpServer/reload")).toBeGreaterThan(
      methods.indexOf("app/installed"),
    );
    reloadFails = true;
    expect(await runtime.readAuthStatus(reference, { forceRefresh: true })).toMatchObject({
      ready: false,
      statusError: "runtime_unavailable",
    });
  });
});
