import { describe, expect, it } from "vitest";
import type { CodexAppServerClient } from "./client.js";
import { createCodexTestHostCapabilities } from "./host-capability.test-support.js";
import { createCodexNativeHookRelayRunBeforeToolCall } from "./native-hook-relay.js";
import {
  assertCodexNativePluginGrant,
  assertCodexNativePluginToolGrant,
  buildCodexPluginCapabilitySnapshot,
  createCodexNativePluginMcpServerOwnerResolver,
  computeCodexPluginCapabilityDigest,
  isCodexNativePluginIdAllowed,
  resolveCodexNativePluginMcpToolOwnerFromStatus,
} from "./native-plugin-grants.js";
import { restrictCodexPluginConfigToNativePluginGrants } from "./plugin-thread-config-deadline.js";
import type { v2 } from "./protocol.js";

const pluginConfig = {
  codexPlugins: {
    enabled: true,
    allow_all_plugins: true,
    plugins: {
      gmail: { marketplaceName: "openai-curated", pluginName: "gmail" },
      slack: { marketplaceName: "openai-curated", pluginName: "slack" },
      disabled: {
        enabled: false,
        marketplaceName: "openai-curated",
        pluginName: "disabled",
      },
    },
  },
};

describe("Codex native plugin grants", () => {
  it("projects only approved entries and clears the account-wide allowlist", () => {
    expect(
      restrictCodexPluginConfigToNativePluginGrants(pluginConfig, [
        { pluginName: "gmail", marketplaceName: "openai-curated" },
      ]),
    ).toMatchObject({
      codexPlugins: {
        enabled: true,
        allow_all_plugins: false,
        plugins: {
          gmail: { pluginName: "gmail", marketplaceName: "openai-curated" },
        },
      },
    });
  });

  it("turns an empty enterprise snapshot into an explicit deny-all config", () => {
    expect(restrictCodexPluginConfigToNativePluginGrants(pluginConfig, [])).toMatchObject({
      codexPlugins: {
        enabled: false,
        allow_all_plugins: false,
        plugins: {},
      },
    });
  });

  it("projects an approved plugin into an otherwise empty Codex config", () => {
    expect(
      restrictCodexPluginConfigToNativePluginGrants({}, [
        { pluginName: "gmail", marketplaceName: "openai-curated" },
      ]),
    ).toMatchObject({
      codexPlugins: {
        enabled: true,
        allow_all_plugins: false,
        plugins: {
          "gmail@openai-curated": {
            enabled: true,
            pluginName: "gmail",
            marketplaceName: "openai-curated",
          },
        },
      },
    });
  });

  it("does not project a grant onto a different marketplace wire identity", () => {
    const projected = restrictCodexPluginConfigToNativePluginGrants(pluginConfig, [
      { pluginName: "gmail", marketplaceName: "openai-curated-remote" },
    ]);
    expect(projected.codexPlugins?.plugins).toEqual({
      "gmail@openai-curated-remote": {
        enabled: true,
        pluginName: "gmail",
        marketplaceName: "openai-curated-remote",
      },
    });
  });

  it("rechecks the current resolver for each native plugin action", () => {
    let allowed = true;
    const resolver = () =>
      allowed ? [{ pluginName: "gmail", marketplaceName: "openai-curated" }] : [];
    expect(isCodexNativePluginIdAllowed(resolver, "gmail@openai-curated-remote")).toBe(false);
    expect(isCodexNativePluginIdAllowed(resolver, "gmail@openai-curated")).toBe(true);
    allowed = false;
    expect(() => assertCodexNativePluginGrant(resolver, "gmail@openai-curated")).toThrow(
      "[plugin_grant_missing]",
    );
  });

  it("rechecks native MCP hook ownership against the exact trusted inventory", () => {
    let allowed = true;
    const grants = () =>
      allowed ? [{ pluginName: "gmail", marketplaceName: "openai-curated-remote" }] : [];
    const ownership = createCodexNativePluginMcpServerOwnerResolver([
      {
        serverName: "gmail-mcp",
        pluginName: "gmail",
        marketplaceName: "openai-curated-remote",
      },
    ]);
    expect(() =>
      assertCodexNativePluginToolGrant({
        grants,
        ownership,
        toolName: "mcp__gmail-mcp__search",
      }),
    ).not.toThrow();
    allowed = false;
    expect(() =>
      assertCodexNativePluginToolGrant({
        grants,
        ownership,
        toolName: "mcp__gmail-mcp__search",
      }),
    ).toThrow("current enterprise policy");
    expect(() =>
      assertCodexNativePluginToolGrant({ grants, ownership, toolName: "mcp__unknown__search" }),
    ).toThrow("[tool_owner_unresolved]");
    expect(() =>
      assertCodexNativePluginToolGrant({ grants, ownership, toolName: "exec" }),
    ).not.toThrow();
  });

  it("fails closed when trusted MCP ownership is ambiguous", () => {
    const ownership = createCodexNativePluginMcpServerOwnerResolver([
      { serverName: "shared", pluginName: "gmail", marketplaceName: "openai-curated" },
      { serverName: "shared", pluginName: "slack", marketplaceName: "openai-curated" },
    ]);
    expect(() =>
      assertCodexNativePluginToolGrant({
        grants: () => [
          { pluginName: "gmail", marketplaceName: "openai-curated" },
          { pluginName: "slack", marketplaceName: "openai-curated" },
        ],
        ownership,
        toolName: "mcp__shared__search",
      }),
    ).toThrow("current enterprise policy");
  });

  it("resolves shared codex_apps ownership from exact connector metadata", async () => {
    const serverWideOwner = createCodexNativePluginMcpServerOwnerResolver([
      { serverName: "codex_apps", pluginName: "gmail", marketplaceName: "openai-curated-remote" },
    ]);
    expect(serverWideOwner?.("mcp__codex_apps__unowned_search")).toBeUndefined();
    const client = {
      request: async () => ({
        data: [
          {
            name: "codex_apps",
            tools: {
              gmail_search: { _meta: { connector_id: "gmail" } },
              account_search: { _meta: { connectorId: "account" } },
              unowned_search: { _meta: { connector_id: "not-approved" } },
            },
          },
        ],
        nextCursor: null,
      }),
    } as unknown as Pick<CodexAppServerClient, "request">;
    const pluginAppPolicyContext = {
      apps: {
        gmail: {
          pluginName: "gmail",
          marketplaceName: "openai-curated-remote",
        },
        account: {
          source: "account" as const,
          pluginName: "should-not-be-used",
          marketplaceName: "openai-curated-remote",
        },
      },
    };

    await expect(
      resolveCodexNativePluginMcpToolOwnerFromStatus({
        client,
        threadId: "thread-1",
        toolName: "mcp__codex_apps__gmail_search",
        pluginAppPolicyContext,
      }),
    ).resolves.toEqual({
      pluginName: "gmail",
      marketplaceName: "openai-curated-remote",
    });
    await expect(
      resolveCodexNativePluginMcpToolOwnerFromStatus({
        client,
        threadId: "thread-1",
        toolName: "mcp__codex_apps__account_search",
        pluginAppPolicyContext,
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveCodexNativePluginMcpToolOwnerFromStatus({
        client,
        threadId: "thread-1",
        toolName: "mcp__codex_apps__unknown_search",
        pluginAppPolicyContext,
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveCodexNativePluginMcpToolOwnerFromStatus({
        client,
        threadId: "thread-1",
        toolName: "mcp__codex_apps__unowned_search",
        pluginAppPolicyContext,
      }),
    ).resolves.toBeUndefined();
  });

  it("rechecks a shared connector grant after the host callback returns", async () => {
    let allowed = true;
    const baseHostCapabilities = createCodexTestHostCapabilities();
    const hostCapabilities = {
      ...baseHostCapabilities,
      nativePluginGrants: () =>
        allowed ? [{ pluginName: "gmail", marketplaceName: "openai-curated-remote" }] : [],
      runBeforeToolCall: async (
        request: Parameters<typeof baseHostCapabilities.runBeforeToolCall>[0],
      ) => {
        allowed = false;
        return { blocked: false, params: request.params };
      },
    } satisfies typeof baseHostCapabilities & {
      nativePluginGrants: NonNullable<typeof baseHostCapabilities.nativePluginGrants>;
    };
    const runBeforeToolCall = createCodexNativeHookRelayRunBeforeToolCall({
      hostCapabilities,
      resolveNativePluginMcpToolOwner: async () => ({
        pluginName: "gmail",
        marketplaceName: "openai-curated-remote",
      }),
    });

    await expect(
      runBeforeToolCall({ toolName: "mcp__codex_apps__gmail_search", params: {} }),
    ).rejects.toThrow("current enterprise policy");
  });

  it("omits mutable install and auth state from the capability digest", () => {
    const detail = {
      marketplaceName: "openai-curated-remote",
      marketplacePath: "/private/path/that/must/not/affect/digest",
      summary: {
        id: "gmail@openai-curated-remote",
        remotePluginId: "remote-gmail",
        version: "1.2.3",
        localVersion: "1.2.3",
        name: "Gmail",
        installed: false,
        installedAt: null,
        enabled: false,
        installPolicy: "AVAILABLE",
        authPolicy: "NO_AUTH",
        availability: "AVAILABLE",
        keywords: ["mail"],
        interface: null,
      },
      description: "Gmail",
      skills: [],
      hooks: [],
      apps: [
        {
          id: "gmail",
          name: "Gmail",
          description: null,
          installUrl: "https://example.test/connect",
          category: null,
        },
      ],
      appTemplates: [],
      mcpServers: [],
      scheduledTasks: [],
    } satisfies v2.PluginDetail;
    const changed = structuredClone(detail);
    changed.marketplacePath = "/another/path";
    changed.summary.installed = true;
    changed.summary.enabled = true;
    changed.apps[0].installUrl = "https://example.test/new-connect";
    expect(computeCodexPluginCapabilityDigest(detail)).toBe(
      computeCodexPluginCapabilityDigest(changed),
    );
    expect(buildCodexPluginCapabilitySnapshot(detail)).toMatchObject({
      summary: { version: "1.2.3" },
      apps: [{ id: "gmail" }],
    });
  });
});
