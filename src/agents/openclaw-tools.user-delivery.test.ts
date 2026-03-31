import { describe, expect, it, vi } from "vitest";
import "./test-helpers/fast-core-tools.js";

vi.mock("../gateway/call.js", () => ({
  callGateway: vi.fn(),
}));

import { createOpenClawTools } from "./openclaw-tools.js";

describe("createOpenClawTools user delivery registration", () => {
  it("registers user_notify and user_schedule with provider-safe schemas", () => {
    const tools = createOpenClawTools({
      config: {
        session: { scope: "per-sender", mainKey: "main" },
        tools: {
          sessions: { visibility: "all" },
          agentToAgent: { enabled: true },
        },
        agents: {
          list: [{ id: "main", default: true }, { id: "target" }],
        },
      },
    });

    const userNotify = tools.find((candidate) => candidate.name === "user_notify");
    expect(userNotify).toBeDefined();
    if (!userNotify) {
      throw new Error("missing user_notify tool");
    }
    const notifySchema = userNotify.parameters as {
      properties?: Record<string, { type?: unknown }>;
      anyOf?: unknown;
      oneOf?: unknown;
    };
    expect(notifySchema.anyOf).toBeUndefined();
    expect(notifySchema.oneOf).toBeUndefined();
    expect(notifySchema.properties?.agentId?.type).toBe("string");
    expect(notifySchema.properties?.message?.type).toBe("string");

    const userSchedule = tools.find((candidate) => candidate.name === "user_schedule");
    expect(userSchedule).toBeDefined();
    if (!userSchedule) {
      throw new Error("missing user_schedule tool");
    }
    const scheduleSchema = userSchedule.parameters as {
      properties?: Record<string, { type?: unknown }>;
      anyOf?: unknown;
      oneOf?: unknown;
    };
    expect(scheduleSchema.anyOf).toBeUndefined();
    expect(scheduleSchema.oneOf).toBeUndefined();
    expect(scheduleSchema.properties?.agentId?.type).toBe("string");
    expect(scheduleSchema.properties?.name?.type).toBe("string");
    expect(scheduleSchema.properties?.message?.type).toBe("string");
  });
});
