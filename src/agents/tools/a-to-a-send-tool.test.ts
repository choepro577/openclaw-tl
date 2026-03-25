import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

const callGatewayMock = vi.fn();
vi.mock("../../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let createAToASendTool: (typeof import("./a-to-a-send-tool.js"))["createAToASendTool"];

const baseConfig = {
  session: {
    scope: "per-sender",
    mainKey: "main",
    agentToAgent: { maxPingPongTurns: 2 },
  },
  tools: {
    sessions: { visibility: "all" },
    agentToAgent: { enabled: true },
  },
  agents: {
    list: [{ id: "main", default: true }, { id: "target" }, { id: "other" }],
  },
} as unknown as OpenClawConfig;

function getTool(config: OpenClawConfig = baseConfig) {
  return createAToASendTool({
    agentSessionKey: "agent:main:discord:group:req",
    agentChannel: "discord",
    config,
  });
}

describe("a_to_a_send tool", () => {
  const asString = (value: unknown) => (typeof value === "string" ? value : "");

  beforeEach(async () => {
    callGatewayMock.mockReset();
    vi.resetModules();
    ({ createAToASendTool } = await import("./a-to-a-send-tool.js"));
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
      error: "a_to_a_send does not allow self-targeting in v1.",
      agentId: "main",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("blocks cross-agent sends when agent-to-agent messaging is disabled", async () => {
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
      sessionKey: "agent:target:a2a:from:main",
    });
    expect((result.details as { error?: string }).error).toContain(
      "Agent-to-agent messaging is disabled",
    );
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("reuses the same pair session key for repeated sends", async () => {
    const calls: Array<{ method?: string; params?: Record<string, unknown> }> = [];
    callGatewayMock.mockImplementation(async (request: unknown) => {
      const typed = request as { method?: string; params?: Record<string, unknown> };
      calls.push(typed);
      if (typed.method === "agent") {
        return { runId: `run-${calls.length}` };
      }
      if (typed.method === "agent.wait") {
        return { status: "ok" };
      }
      if (typed.method === "chat.history") {
        return {
          messages: [{ role: "assistant", content: [{ type: "text", text: "ok" }] }],
        };
      }
      return {};
    });

    const tool = getTool({
      ...baseConfig,
      session: {
        ...baseConfig.session,
        agentToAgent: { maxPingPongTurns: 0 },
      },
    } as OpenClawConfig);
    await tool.execute("call-first", {
      agentId: "target",
      message: "first",
      timeoutSeconds: 1,
    });
    await tool.execute("call-second", {
      agentId: "target",
      message: "second",
      timeoutSeconds: 1,
    });

    const primaryAgentCalls = calls.filter(
      (call) => call.method === "agent" && call.params?.sessionKey === "agent:target:a2a:from:main",
    );
    expect(primaryAgentCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of primaryAgentCalls.slice(0, 2)) {
      expect(call.params).toMatchObject({
        sessionKey: "agent:target:a2a:from:main",
        label: "A2A from main",
      });
    }
  });

  it("runs primary send into the pair session, then ping-pongs without announce delivery", async () => {
    const calls: Array<{ method?: string; params?: Record<string, unknown> }> = [];
    let agentCallCount = 0;
    let lastWaitedRunId: string | undefined;
    const replyByRunId = new Map<string, string>();
    const requesterKey = "agent:main:discord:group:req";
    const pairKey = "agent:target:a2a:from:main";

    callGatewayMock.mockImplementation(async (request: unknown) => {
      const typed = request as { method?: string; params?: Record<string, unknown> };
      calls.push(typed);
      if (typed.method === "agent") {
        agentCallCount += 1;
        const runId = `run-${agentCallCount}`;
        const params = typed.params ?? {};
        const extraSystemPrompt = asString(params.extraSystemPrompt);
        let reply = "initial";
        if (extraSystemPrompt.includes("Agent-to-agent pair session reply step")) {
          reply = params.sessionKey === requesterKey ? "pong-1" : "pong-2";
        }
        replyByRunId.set(runId, reply);
        return { runId, status: "accepted" };
      }
      if (typed.method === "agent.wait") {
        lastWaitedRunId = typeof typed.params?.runId === "string" ? typed.params.runId : undefined;
        return { status: "ok" };
      }
      if (typed.method === "chat.history") {
        const text = (lastWaitedRunId && replyByRunId.get(lastWaitedRunId)) ?? "";
        return {
          messages: [{ role: "assistant", content: [{ type: "text", text }] }],
        };
      }
      if (typed.method === "send") {
        return { messageId: "should-not-happen" };
      }
      return {};
    });

    const result = await getTool().execute("call-flow", {
      agentId: "target",
      message: "hello",
      timeoutSeconds: 1,
    });
    expect(result.details).toMatchObject({
      status: "ok",
      reply: "initial",
      agentId: "target",
      sessionKey: pairKey,
      label: "A2A from main",
      delivery: { status: "pending", mode: "ping-pong" },
    });

    await vi.waitFor(
      () => {
        expect(calls.filter((call) => call.method === "agent")).toHaveLength(4);
      },
      { timeout: 2_000, interval: 5 },
    );

    const agentCalls = calls.filter((call) => call.method === "agent");
    expect(agentCalls[0]?.params).toMatchObject({
      sessionKey: pairKey,
      label: "A2A from main",
      lane: "nested",
      channel: "webchat",
      inputProvenance: {
        kind: "inter_session",
        sourceSessionKey: requesterKey,
        sourceChannel: "discord",
        sourceTool: "a_to_a_send",
      },
    });
    expect(agentCalls[1]?.params).toMatchObject({
      sessionKey: requesterKey,
      lane: "nested",
      channel: "webchat",
      inputProvenance: {
        kind: "inter_session",
        sourceSessionKey: pairKey,
        sourceChannel: "webchat",
        sourceTool: "a_to_a_send",
      },
    });
    expect(agentCalls[2]?.params).toMatchObject({
      sessionKey: pairKey,
      lane: "nested",
      channel: "webchat",
      inputProvenance: {
        kind: "inter_session",
        sourceSessionKey: requesterKey,
        sourceChannel: "discord",
        sourceTool: "a_to_a_send",
      },
    });
    expect(agentCalls[3]?.params).toMatchObject({
      sessionKey: requesterKey,
      lane: "nested",
      channel: "webchat",
      inputProvenance: {
        kind: "inter_session",
        sourceSessionKey: pairKey,
        sourceChannel: "webchat",
        sourceTool: "a_to_a_send",
      },
    });
    expect(calls.some((call) => call.method === "send")).toBe(false);
  });

  it("keeps waiting in background after timeout and calls back into the requester session", async () => {
    const calls: Array<{ method?: string; params?: Record<string, unknown> }> = [];
    let agentCallCount = 0;
    let waitCallCount = 0;
    let lastWaitedRunId: string | undefined;
    const replyByRunId = new Map<string, string>();
    const requesterKey = "agent:main:discord:group:req";

    callGatewayMock.mockImplementation(async (request: unknown) => {
      const typed = request as { method?: string; params?: Record<string, unknown> };
      calls.push(typed);
      if (typed.method === "agent") {
        agentCallCount += 1;
        const runId = `run-${agentCallCount}`;
        const sessionKey = asString(typed.params?.sessionKey);
        const prompt = asString(typed.params?.extraSystemPrompt);
        let reply = "initial";
        if (prompt.includes("Agent-to-agent completion callback")) {
          reply = "Em da nhan duoc tu agent B";
        } else if (sessionKey === requesterKey && prompt.includes("reply step")) {
          reply = "REPLY_SKIP";
        }
        replyByRunId.set(runId, reply);
        return { runId, status: "accepted" };
      }
      if (typed.method === "agent.wait") {
        waitCallCount += 1;
        lastWaitedRunId = typeof typed.params?.runId === "string" ? typed.params.runId : undefined;
        if (waitCallCount === 1) {
          return { status: "timeout" };
        }
        return { status: "ok" };
      }
      if (typed.method === "chat.history") {
        const text = (lastWaitedRunId && replyByRunId.get(lastWaitedRunId)) ?? "";
        return {
          messages: [{ role: "assistant", content: [{ type: "text", text }] }],
        };
      }
      return {};
    });

    const result = await getTool({
      ...baseConfig,
      session: {
        ...baseConfig.session,
        agentToAgent: { maxPingPongTurns: 0 },
      },
    } as OpenClawConfig).execute("call-timeout", {
      agentId: "target",
      message: "hello",
      timeoutSeconds: 1,
    });

    expect(result.details).toMatchObject({
      status: "timeout",
      sessionKey: "agent:target:a2a:from:main",
    });

    await vi.waitFor(
      () => {
        expect(
          calls.some(
            (call) =>
              call.method === "agent" &&
              call.params?.sessionKey === requesterKey &&
              asString(call.params?.extraSystemPrompt).includes(
                "Agent-to-agent completion callback",
              ),
          ),
        ).toBe(true);
      },
      { timeout: 2_000, interval: 5 },
    );
  });
});
