import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureAiTransportHost, getAiTransportHost } from "../host.js";
import type { Context, Model } from "../types.js";
import { createOpenAIResponsesTransportStreamFn } from "./openai-responses-client.js";

const context = {
  messages: [{ role: "user", content: "Choose a route.", timestamp: 1 }],
} satisfies Context;
const format = {
  type: "json_schema",
  name: "route_decision",
  strict: true,
  schema: {
    type: "object",
    properties: { route: { type: "string" } },
    required: ["route"],
    additionalProperties: false,
  },
};
let previousHost: ReturnType<typeof getAiTransportHost>;

beforeEach(() => {
  previousHost = getAiTransportHost();
});
afterEach(() => {
  configureAiTransportHost(previousHost);
});

describe.each([
  ["openai-responses", "https://api.openai.com/v1"],
  ["openai-chatgpt-responses", "https://chatgpt.com/backend-api/codex"],
  ["openclaw-openai-chatgpt-responses-transport", "https://chatgpt.com/backend-api/codex"],
] as const)("%s structured responses", (api, baseUrl) => {
  it.each(["options", "payload hook"] as const)(
    "preserves the schema from %s at the SDK HTTP boundary",
    async (source) => {
      const model: Model = {
        id: "gpt-5.6-luna",
        name: "GPT-5.6 Luna",
        provider: "openai",
        api,
        baseUrl,
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128_000,
        maxTokens: 4_096,
      };
      let body: Record<string, unknown> | undefined;
      const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
        if (typeof init?.body !== "string") {
          throw new Error("Expected a JSON request body");
        }
        body = JSON.parse(init.body) as Record<string, unknown>;
        const event = {
          type: "response.completed",
          response: {
            id: "resp_format",
            status: "completed",
            output: [],
            usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
          },
        };
        return new Response(`data: ${JSON.stringify(event)}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        });
      });
      configureAiTransportHost({ buildModelFetch: () => fetchMock });

      const stream = await createOpenAIResponsesTransportStreamFn()(model, context, {
        apiKey: "fixture-token",
        transport: "sse",
        ...(source === "options"
          ? { responseFormat: { type: "json_schema", json_schema: format } }
          : {
              onPayload: (payload) => ({
                ...(payload as Record<string, unknown>),
                text: { format },
              }),
            }),
      });
      const result = await stream.result();

      expect(result.stopReason).toBe("stop");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(body?.text).toEqual({ format });
      expect(body).not.toHaveProperty("response_format");
    },
  );
});
