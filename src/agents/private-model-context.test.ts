import { describe, expect, it, vi } from "vitest";
import {
  getPrivateModelContextScope,
  preparePrivateModelContextRequest,
  projectPrivateModelContextEvent,
  wrapStreamFnWithPrivateModelContext,
} from "./private-model-context.js";
import type { StreamFn } from "./runtime/index.js";
import { makeProviderModelFixture } from "./test-helpers/provider-model-fixture.js";

const model = makeProviderModelFixture({
  id: "selected",
  provider: "fixture",
  api: "openai-responses",
  baseUrl: "https://fixture.invalid/v1",
});

describe("private model context boundary", () => {
  it("projects only error data and retains finite terminal usage without arbitrary metadata", () => {
    const answer = '{"type":"response.output_text.delta","delta":"A normal answer"}';
    expect(projectPrivateModelContextEvent(answer)).toBe(answer);
    expect(projectPrivateModelContextEvent("[DONE]")).toBe("[DONE]");
    const failed = projectPrivateModelContextEvent(
      JSON.stringify({
        type: "response.failed",
        response: {
          error: { message: "PRIVATE EXCERPT", details: "PRIVATE EXCERPT" },
          metadata: "PRIVATE EXCERPT",
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            total_tokens: 7,
            input_tokens_details: { cached_tokens: 1, private: "PRIVATE EXCERPT" },
            output_tokens_details: { reasoning_tokens: 1, private: "PRIVATE EXCERPT" },
            private: "PRIVATE EXCERPT",
          },
        },
      }),
    );
    expect(failed).not.toContain("PRIVATE EXCERPT");
    expect(JSON.parse(failed).response.usage).toEqual({
      input_tokens: 5,
      output_tokens: 2,
      total_tokens: 7,
      input_tokens_details: { cached_tokens: 1 },
      output_tokens_details: { reasoning_tokens: 1 },
    });
    expect(() => projectPrivateModelContextEvent('{"bad": PRIVATE EXCERPT')).toThrow(
      "PRIVATE_MODEL_CONTEXT_UNAVAILABLE",
    );
  });

  it.each(["max_output_tokens", "content_filter"])(
    "retains known incomplete reason %s and actual output without extra terminal metadata",
    (reason) => {
      const output = [
        { type: "message", content: [{ type: "output_text", text: "Actual answer" }] },
      ];
      const projected = projectPrivateModelContextEvent(
        JSON.stringify({
          type: "response.incomplete",
          response: {
            status: "incomplete",
            incomplete_details: { reason, extra: "PRIVATE EXCERPT" },
            output,
            metadata: "PRIVATE EXCERPT",
            usage: {
              input_tokens: 5,
              output_tokens: 2,
              total_tokens: 7,
              input_tokens_details: { cache_write_tokens: 1, extra: "PRIVATE EXCERPT" },
            },
          },
        }),
      );
      expect(projected).not.toContain("PRIVATE EXCERPT");
      expect(JSON.parse(projected)).toMatchObject({
        type: "response.incomplete",
        response: {
          status: "incomplete",
          incomplete_details: { reason },
          output,
          usage: {
            input_tokens: 5,
            output_tokens: 2,
            total_tokens: 7,
            input_tokens_details: { cache_write_tokens: 1 },
          },
        },
      });
    },
  );

  it.each([
    { streamStrategy: "provider", transport: "sse" },
    { streamStrategy: "session-custom", transport: "sse" },
    { streamStrategy: "boundary-aware:openai-responses", transport: "auto" },
    { streamStrategy: "boundary-aware:openai-responses", transport: "websocket" },
  ] as const)("fails closed before unsupported $streamStrategy/$transport execution", (options) => {
    const streamFn = vi.fn();
    const resolve = vi.fn();
    const wrapped = wrapStreamFnWithPrivateModelContext({
      streamFn,
      resolve,
      assertActive: () => {},
      streamStrategy: options.streamStrategy,
    });
    expect(() => wrapped(model, { messages: [] }, { transport: options.transport })).toThrow(
      "PRIVATE_MODEL_CONTEXT_UNAVAILABLE",
    );
    expect(streamFn).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("checks admission again after evidence selection and does not expose its error details", async () => {
    let active = true;
    const resolve = vi.fn(async () => {
      active = false;
      return "PRIVATE EXCERPT";
    });
    const assertActive = () => {
      if (!active) throw new Error("private/source/path");
    };
    await expect(
      preparePrivateModelContextRequest({
        scope: { resolve, assertActive },
        model,
        url: `${model.baseUrl}/responses`,
        init: { method: "POST", body: JSON.stringify({ model: model.id, input: [] }) },
      }),
    ).rejects.toThrow("PRIVATE_MODEL_CONTEXT_UNAVAILABLE");
  });

  it.each([
    { suffix: "/responses/compact", body: { input: [] } },
    { suffix: "/responses", body: { input: [], previous_response_id: "old-response" } },
  ])("does not transfer into continuation or compaction state", async ({ suffix, body }) => {
    const resolve = vi.fn(async () => "PRIVATE EXCERPT");
    await expect(
      preparePrivateModelContextRequest({
        scope: { resolve, assertActive: () => {} },
        model,
        url: `${model.baseUrl}${suffix}`,
        init: { method: "POST", body: JSON.stringify(body) },
      }),
    ).rejects.toThrow("PRIVATE_MODEL_CONTEXT_UNAVAILABLE");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("keeps concurrent scopes isolated and only projects the actual fallback destination", async () => {
    const run = (id: string) => {
      const resolve = vi.fn(async () => id);
      const wrapped = wrapStreamFnWithPrivateModelContext({
        streamStrategy: "boundary-aware:openai-responses",
        assertActive: () => {},
        resolve,
        streamFn: (async () => {
          await Promise.resolve();
          const scope = getPrivateModelContextScope();
          if (!scope) throw new Error("missing scope");
          return await preparePrivateModelContextRequest({
            scope,
            model: { ...model, provider: "fallback", id },
            url: `https://fallback.invalid/v1/responses`,
            init: { method: "POST", body: JSON.stringify({ model: id, input: [] }) },
          });
        }) as unknown as StreamFn,
      });
      return { result: wrapped(model, { messages: [] }, { transport: "sse" }), resolve };
    };
    const first = run("one");
    const second = run("two");
    const requests = (await Promise.all([first.result, second.result])) as unknown as RequestInit[];
    expect(String(requests[0]?.body)).toContain("one");
    expect(String(requests[0]?.body)).not.toContain("two");
    expect(first.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "fallback",
        model: "one",
        requestUrl: "https://fallback.invalid/v1/responses",
      }),
    );
    expect(getPrivateModelContextScope()).toBeUndefined();
  });
});
