import { describe, expect, it, vi } from "vitest";
import "./test-helpers/fast-core-tools.js";

vi.mock("../gateway/call.js", () => ({
  callGateway: vi.fn(),
}));

import { createOpenClawTools } from "./openclaw-tools.js";

describe("createOpenClawTools a_to_a_send registration", () => {
  it("registers a_to_a_send with a Gemini-safe timeout schema", () => {
    const tool = createOpenClawTools({
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
    }).find((candidate) => candidate.name === "a_to_a_send");
    expect(tool).toBeDefined();
    if (!tool) {
      throw new Error("missing a_to_a_send tool");
    }
    const schema = tool.parameters as {
      properties?: Record<string, { type?: unknown }>;
      anyOf?: unknown;
      oneOf?: unknown;
    };
    expect(schema.anyOf).toBeUndefined();
    expect(schema.oneOf).toBeUndefined();
    expect(schema.properties?.agentId?.type).toBe("string");
    expect(schema.properties?.message?.type).toBe("string");
    expect(schema.properties?.timeoutSeconds?.type).toBe("number");
  });
});
