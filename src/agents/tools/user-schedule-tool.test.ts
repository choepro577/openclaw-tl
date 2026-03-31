import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

const callGatewayMock = vi.fn();
vi.mock("../../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let createUserScheduleTool: (typeof import("./user-schedule-tool.js"))["createUserScheduleTool"];

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
  return createUserScheduleTool({
    agentSessionKey: "agent:main:discord:group:req",
    config,
  });
}

describe("user_schedule tool", () => {
  beforeEach(async () => {
    callGatewayMock.mockReset();
    vi.resetModules();
    ({ createUserScheduleTool } = await import("./user-schedule-tool.js"));
  });

  it("rejects self-targeting in v1", async () => {
    const result = await getTool().execute("call-self", {
      agentId: "main",
      name: "Hop gap",
      schedule: { kind: "at", at: "2026-03-31T03:40:00.000Z" },
      message: "Nhac xuong hop gap ngay.",
    });
    expect(result.details).toMatchObject({
      status: "error",
      error: "user_schedule does not allow self-targeting in v1.",
      agentId: "main",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("creates an active-user cron job for the target agent", async () => {
    callGatewayMock.mockResolvedValue({
      id: "cron-1",
      agentId: "target",
      sessionTarget: "active-user",
      payload: {
        kind: "agentTurn",
        message: "Nhac xuong hop gap ngay.",
      },
    });

    const result = await getTool().execute("call-schedule", {
      agentId: "target",
      name: "Hop gap",
      description: "Nhac anh Cuong xuong hop gap",
      schedule: { kind: "at", at: "2026-03-31T03:40:00.000Z" },
      message: "Nhac xuong hop gap ngay.",
    });

    expect(result.details).toMatchObject({
      id: "cron-1",
      agentId: "target",
      sessionTarget: "active-user",
    });
    const call = callGatewayMock.mock.calls[0]?.[0] as {
      method?: string;
      params?: Record<string, unknown>;
    };
    expect(call.method).toBe("cron.add");
    expect(call.params).toMatchObject({
      agentId: "target",
      name: "Hop gap",
      description: "Nhac anh Cuong xuong hop gap",
      sessionTarget: "active-user",
      payload: {
        kind: "agentTurn",
        message: "Nhac xuong hop gap ngay.",
        relay: {
          kind: "cross-agent-user-delivery",
          deliveryKind: "schedule",
          sourceAgentId: "main",
          sourceAgentName: "Nguyen Duc Hieu Assistant",
          targetAgentId: "target",
          targetAgentName: "Nguyen Tester Assistant",
          attribution: "always",
        },
      },
      delivery: {
        mode: "announce",
      },
    });
  });

  it("falls back to agent ids when display names are missing", async () => {
    callGatewayMock.mockResolvedValue({ id: "cron-2" });

    await getTool({
      ...baseConfig,
      agents: {
        list: [{ id: "main", default: true }, { id: "target" }],
      },
    } as OpenClawConfig).execute("call-schedule-fallback", {
      agentId: "target",
      name: "Hop gap",
      schedule: { kind: "at", at: "2026-03-31T03:40:00.000Z" },
      message: "Chieu nay hop luc 14:00.",
    });

    const call = callGatewayMock.mock.calls[0]?.[0] as {
      params?: {
        payload?: {
          relay?: {
            sourceAgentName?: string;
            targetAgentName?: string;
          };
        };
      };
    };
    expect(call.params?.payload?.relay).toMatchObject({
      sourceAgentName: "main",
      targetAgentName: "target",
    });
  });
});
