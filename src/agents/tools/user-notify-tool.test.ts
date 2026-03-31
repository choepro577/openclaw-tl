import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

const callGatewayMock = vi.fn();
vi.mock("../../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let createUserNotifyTool: (typeof import("./user-notify-tool.js"))["createUserNotifyTool"];

const baseConfig = {
  session: {
    scope: "per-sender",
    mainKey: "main",
  },
  tools: {
    agentToAgent: { enabled: true },
  },
  agents: {
    list: [
      { id: "main", default: true, name: "Nguyen Duc Hieu Assistant" },
      { id: "target", name: "Nguyen Tester Assistant" },
      { id: "other" },
    ],
  },
} as unknown as OpenClawConfig;

function getTool(config: OpenClawConfig = baseConfig) {
  return createUserNotifyTool({
    agentSessionKey: "agent:main:discord:group:req",
    agentChannel: "discord",
    config,
  });
}

describe("user_notify tool", () => {
  beforeEach(async () => {
    callGatewayMock.mockReset();
    vi.resetModules();
    ({ createUserNotifyTool } = await import("./user-notify-tool.js"));
  });

  it("rejects unknown target agents", async () => {
    const result = await getTool().execute("call-unknown", {
      agentId: "ghost",
      message: "hello",
    });
    expect(result.details).toMatchObject({
      status: "error",
      error: "Unknown agentId: ghost",
      agentId: "ghost",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("rejects self-targeting in v1", async () => {
    const result = await getTool().execute("call-self", {
      agentId: "main",
      message: "hello",
    });
    expect(result.details).toMatchObject({
      status: "error",
      error: "user_notify does not allow self-targeting in v1.",
      agentId: "main",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("blocks cross-agent delivery when agent-to-agent messaging is disabled", async () => {
    const result = await getTool({
      ...baseConfig,
      tools: {
        ...baseConfig.tools,
        agentToAgent: { enabled: false },
      },
    } as OpenClawConfig).execute("call-disabled", {
      agentId: "target",
      message: "hello",
    });
    expect(result.details).toMatchObject({
      status: "forbidden",
      agentId: "target",
    });
    expect((result.details as { error?: string }).error).toContain(
      "Agent-to-agent messaging is disabled",
    );
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("resolves the target active user session and sends the request there", async () => {
    const calls: Array<{ method?: string; params?: Record<string, unknown> }> = [];
    callGatewayMock.mockImplementation(async (request: unknown) => {
      const typed = request as { method?: string; params?: Record<string, unknown> };
      calls.push(typed);
      if (typed.method === "sessions.resolve_active_user") {
        return {
          key: "agent:target:openai-user:latest",
          reason: "active",
        };
      }
      if (typed.method === "agent") {
        return { runId: "run-user-notify-1" };
      }
      return {};
    });

    const result = await getTool().execute("call-notify", {
      agentId: "target",
      message: "Anh Cuong can xuong hop gap ngay.",
    });

    expect(result.details).toMatchObject({
      status: "accepted",
      runId: "run-user-notify-1",
      agentId: "target",
      sessionKey: "agent:target:openai-user:latest",
      resolutionReason: "active",
    });

    expect(calls[0]).toMatchObject({
      method: "sessions.resolve_active_user",
      params: {
        agentId: "target",
        excludeKeys: ["agent:target:a2a:from:main"],
        activeWithinMinutes: 1440,
      },
    });
    expect(calls[1]?.method).toBe("agent");
    expect(calls[1]?.params).toMatchObject({
      message: "Anh Cuong can xuong hop gap ngay.",
      sessionKey: "agent:target:openai-user:latest",
      deliver: false,
      channel: "webchat",
      lane: "nested",
      inputProvenance: {
        kind: "inter_session",
        sourceSessionKey: "agent:main:discord:group:req",
        sourceChannel: "discord",
        sourceTool: "user_notify",
      },
    });
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "This session is user-facing for the target assistant's user.",
    );
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "Always mention the source assistant naturally in the final reply.",
    );
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "Do not thank, greet, acknowledge, or apologize to the source assistant.",
    );
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "Output exactly one short user-facing reminder sentence.",
    );
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "Nguyen Duc Hieu Assistant",
    );
    expect((calls[1]?.params?.extraSystemPrompt as string) ?? "").toContain(
      "Nguyen Tester Assistant",
    );
  });
});
