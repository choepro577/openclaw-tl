import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
const webUiMocks = vi.hoisted(() => ({
  sendWebUiNotification: vi.fn(async () => true),
}));

vi.mock("../infra/webui-notification.js", () => ({
  sendWebUiNotification: webUiMocks.sendWebUiNotification,
  shouldNotifyWebUi: vi.fn(() => true),
}));

import type { ReplyDispatcher } from "./reply/reply-dispatcher.js";
import { buildTestCtx } from "./reply/test-ctx.js";

let dispatchInboundMessage: typeof import("./dispatch.js").dispatchInboundMessage;
let withReplyDispatcher: typeof import("./dispatch.js").withReplyDispatcher;

afterEach(() => {
  webUiMocks.sendWebUiNotification.mockClear();
});

beforeEach(async () => {
  vi.resetModules();
  ({ dispatchInboundMessage, withReplyDispatcher } = await import("./dispatch.js"));
});

function createDispatcher(record: string[]): ReplyDispatcher {
  return {
    sendToolResult: () => true,
    sendBlockReply: () => true,
    sendFinalReply: () => true,
    getQueuedCounts: () => ({ tool: 0, block: 0, final: 0 }),
    markComplete: () => {
      record.push("markComplete");
    },
    waitForIdle: async () => {
      record.push("waitForIdle");
    },
  };
}

describe("withReplyDispatcher", () => {
  it("always marks complete and waits for idle after success", async () => {
    const order: string[] = [];
    const dispatcher = createDispatcher(order);

    const result = await withReplyDispatcher({
      dispatcher,
      run: async () => {
        order.push("run");
        return "ok";
      },
      onSettled: () => {
        order.push("onSettled");
      },
    });

    expect(result).toBe("ok");
    expect(order).toEqual(["run", "markComplete", "waitForIdle", "onSettled"]);
  });

  it("still drains dispatcher after run throws", async () => {
    const order: string[] = [];
    const dispatcher = createDispatcher(order);
    const onSettled = vi.fn(() => {
      order.push("onSettled");
    });

    await expect(
      withReplyDispatcher({
        dispatcher,
        run: async () => {
          order.push("run");
          throw new Error("boom");
        },
        onSettled,
      }),
    ).rejects.toThrow("boom");

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["run", "markComplete", "waitForIdle", "onSettled"]);
  });

  it("dispatchInboundMessage owns dispatcher lifecycle", async () => {
    const order: string[] = [];
    const dispatcher = {
      sendToolResult: () => true,
      sendBlockReply: () => true,
      sendFinalReply: () => {
        order.push("sendFinalReply");
        return true;
      },
      getQueuedCounts: () => ({ tool: 0, block: 0, final: 0 }),
      markComplete: () => {
        order.push("markComplete");
      },
      waitForIdle: async () => {
        order.push("waitForIdle");
      },
    } satisfies ReplyDispatcher;

    await dispatchInboundMessage({
      ctx: buildTestCtx(),
      cfg: {} as OpenClawConfig,
      dispatcher,
      replyResolver: async () => ({ text: "ok" }),
    });

    expect(order).toEqual(["sendFinalReply", "markComplete", "waitForIdle"]);
  });

  it("sends one Web UI notification after same-channel final replies settle", async () => {
    const dispatcher = {
      sendToolResult: () => true,
      sendBlockReply: () => true,
      sendFinalReply: () => true,
      getQueuedCounts: () => ({ tool: 0, block: 0, final: 0 }),
      markComplete: () => {},
      waitForIdle: async () => {},
    } satisfies ReplyDispatcher;
    const cfg = {
      agents: {
        list: [{ id: "Test123" }],
      },
    } as OpenClawConfig;

    await dispatchInboundMessage({
      ctx: buildTestCtx({
        Provider: "telegram",
        Surface: "telegram",
        SessionKey: "agent:test123:main",
      }),
      cfg,
      dispatcher,
      replyResolver: async () => [{ text: "first" }, { text: "second" }],
    });

    expect(webUiMocks.sendWebUiNotification).toHaveBeenCalledTimes(1);
    expect(webUiMocks.sendWebUiNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        cfg,
        sessionKey: "agent:test123:main",
        agentId: "test123",
        text: "first\n\nsecond",
      }),
    );
  });

  it("does not send Web UI notifications for internal webchat dispatcher turns", async () => {
    const dispatcher = createDispatcher([]);

    await dispatchInboundMessage({
      ctx: buildTestCtx({
        Provider: "webchat",
        Surface: "webchat",
        SessionKey: "agent:main:main",
      }),
      cfg: {} as OpenClawConfig,
      dispatcher,
      replyResolver: async () => ({ text: "ok" }),
    });

    expect(webUiMocks.sendWebUiNotification).not.toHaveBeenCalled();
  });
});
