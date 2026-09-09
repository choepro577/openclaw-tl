import type { EmbeddedRunAttemptParamsV2 } from "openclaw/plugin-sdk/agent-harness-runtime";
import { describe, expect, it, vi } from "vitest";
import { createCodexTestHostCapabilities } from "./host-capability.test-support.js";
import type { JsonObject } from "./protocol.js";
import {
  attestCodexRestrictedToolSurfaceMcpServersDisabled,
  buildThreadResumeParams,
  buildThreadStartParams,
} from "./thread-requests.js";

const appId = "connector_gmail";
function attempt(overrides: Partial<EmbeddedRunAttemptParamsV2> = {}) {
  return {
    hostCapabilities: createCodexTestHostCapabilities(),
    provider: "openai",
    modelId: "gpt-5.4",
    prompt: "Check the connected profile",
    pluginHarnessToolPolicyRestricted: true,
    ...overrides,
  } as EmbeddedRunAttemptParamsV2;
}
function requests(params = attempt(), hostSystemAgentActive = false) {
  const options = {
    appServer: {
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandbox: "workspace-write",
    } as const,
    cwd: "/repo",
    dynamicTools: [],
    hostSystemAgentActive,
    admittedCodexPluginAppIds: [appId],
    restrictedToolSurfaceInheritedMcpServerNames: ["unapproved"],
    config: {
      apps: {
        _default: { enabled: false },
        [appId]: { enabled: true },
        connector_other: { enabled: false },
      },
    } as JsonObject,
    nativeHookRelayConfig: {
      "features.hooks": true,
      "hooks.PreToolUse": [
        {
          matcher: "*",
          hooks: [{ type: "command", command: "trusted-relay", trusted_hash: "test-hash" }],
        },
      ],
    } as JsonObject,
  };
  return [
    buildThreadStartParams(params, options),
    buildThreadResumeParams(params, { ...options, threadId: "existing-thread" }),
  ];
}

describe("enterprise plugin admission on restricted Codex chats", () => {
  it("keeps an approved app callable on both new and resumed chats without opening other tool sources", () => {
    for (const request of requests()) {
      expect(request.config).toMatchObject({
        "features.apps": true,
        "orchestrator.mcp.enabled": true,
        "features.hooks": true,
        "features.shell_tool": false,
        "features.computer_use": false,
        apps: { _default: { enabled: false }, [appId]: { enabled: true } },
        mcp_servers: { unapproved: { enabled: false } },
      });
      expect(request.config?.["hooks.PreToolUse"]).toEqual(
        expect.arrayContaining([expect.objectContaining({ matcher: "*" })]),
      );
      expect(
        ((request.config?.apps as JsonObject)?.connector_other as JsonObject | undefined)?.enabled,
      ).not.toBe(true);
    }
  });

  it.each([
    { toolsAllow: ["openclaw"] },
    { toolsAllow: ["message"], sourceReplyDeliveryMode: "message_tool_only" },
  ])("does not widen a special isolated tool surface: %j", (overrides) => {
    for (const request of requests(attempt(overrides), true)) {
      expect(request.config?.["features.apps"]).toBe(false);
      expect(request.config?.["features.hooks"]).toBe(false);
      expect(request.config?.["orchestrator.mcp.enabled"]).toBe(false);
    }
  });

  it("accepts raw shared app inventory only when the server was admitted, while rejecting unrelated servers", async () => {
    const request = vi.fn(
      async (): Promise<{ data: JsonObject[]; nextCursor: null }> => ({
        data: [
          {
            name: "codex_apps",
            serverInfo: { name: "Apps", version: "1" },
            tools: { other: { _meta: { connector_id: "connector_other" } } },
          },
        ],
        nextCursor: null,
      }),
    );
    await expect(
      attestCodexRestrictedToolSurfaceMcpServersDisabled(
        { request } as never,
        "thread",
        {},
        undefined,
        { admittedCodexPluginAppIds: [appId] },
      ),
    ).resolves.toBeUndefined();
    await expect(
      attestCodexRestrictedToolSurfaceMcpServersDisabled({ request } as never, "thread", {}),
    ).rejects.toThrow("unexpected server codex_apps");
    request.mockResolvedValueOnce({
      data: [{ name: "unapproved", serverInfo: { name: "Other", version: "1" }, tools: {} }],
      nextCursor: null,
    });
    await expect(
      attestCodexRestrictedToolSurfaceMcpServersDisabled(
        { request } as never,
        "thread",
        {},
        undefined,
        { admittedCodexPluginAppIds: [appId] },
      ),
    ).rejects.toThrow("unexpected server unapproved");
  });
});
