import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplyDispatcher } from "./reply-dispatcher.js";
import { buildTestCtx } from "./test-ctx.js";
import { createAcpTestConfig } from "./test-fixtures/acp-runtime.js";

const ttsMocks = vi.hoisted(() => ({
  maybeApplyTtsToPayload: vi.fn(async (paramsUnknown: unknown) => {
    const params = paramsUnknown as { payload: unknown };
    return params.payload;
  }),
}));
const routeMocks = vi.hoisted(() => ({
  routeReply: vi.fn(async () => ({ ok: true, messageId: "mock" })),
}));
const webUiMocks = vi.hoisted(() => ({
  sendWebUiNotification: vi.fn(async () => true),
}));

vi.mock("../../tts/tts.js", () => ({
  maybeApplyTtsToPayload: (params: unknown) => ttsMocks.maybeApplyTtsToPayload(params),
}));
vi.mock("./route-reply.js", () => ({
  routeReply: routeMocks.routeReply,
}));
vi.mock("../../infra/webui-notification.js", () => ({
  sendWebUiNotification: webUiMocks.sendWebUiNotification,
}));

let createAcpDispatchDeliveryCoordinator: typeof import("./dispatch-acp-delivery.js").createAcpDispatchDeliveryCoordinator;

beforeEach(async () => {
  vi.resetModules();
  ({ createAcpDispatchDeliveryCoordinator } = await import("./dispatch-acp-delivery.js"));
});

function createDispatcher(): ReplyDispatcher {
  return {
    sendToolResult: vi.fn(() => true),
    sendBlockReply: vi.fn(() => true),
    sendFinalReply: vi.fn(() => true),
    waitForIdle: vi.fn(async () => {}),
    getQueuedCounts: vi.fn(() => ({ tool: 0, block: 0, final: 0 })),
    markComplete: vi.fn(),
  };
}

function createCoordinator(onReplyStart?: (...args: unknown[]) => Promise<void>) {
  return createAcpDispatchDeliveryCoordinator({
    cfg: createAcpTestConfig(),
    ctx: buildTestCtx({
      Provider: "discord",
      Surface: "discord",
      SessionKey: "agent:codex-acp:session-1",
    }),
    dispatcher: createDispatcher(),
    inboundAudio: false,
    shouldRouteToOriginating: false,
    ...(onReplyStart ? { onReplyStart } : {}),
  });
}

describe("createAcpDispatchDeliveryCoordinator", () => {
  it("starts reply lifecycle only once when called directly and through deliver", async () => {
    const onReplyStart = vi.fn(async () => {});
    const coordinator = createCoordinator(onReplyStart);

    await coordinator.startReplyLifecycle();
    await coordinator.deliver("final", { text: "hello" });
    await coordinator.startReplyLifecycle();
    await coordinator.deliver("block", { text: "world" });

    expect(onReplyStart).toHaveBeenCalledTimes(1);
  });

  it("starts reply lifecycle once when deliver triggers first", async () => {
    const onReplyStart = vi.fn(async () => {});
    const coordinator = createCoordinator(onReplyStart);

    await coordinator.deliver("final", { text: "hello" });
    await coordinator.startReplyLifecycle();

    expect(onReplyStart).toHaveBeenCalledTimes(1);
  });

  it("does not start reply lifecycle for empty payload delivery", async () => {
    const onReplyStart = vi.fn(async () => {});
    const coordinator = createCoordinator(onReplyStart);

    await coordinator.deliver("final", {});

    expect(onReplyStart).not.toHaveBeenCalled();
  });

  it("notifies Web UI once for successful routed final replies only", async () => {
    routeMocks.routeReply.mockClear();
    webUiMocks.sendWebUiNotification.mockClear();
    const coordinator = createAcpDispatchDeliveryCoordinator({
      cfg: createAcpTestConfig(),
      ctx: buildTestCtx({
        Provider: "discord",
        Surface: "discord",
        SessionKey: "agent:codex-acp:session-1",
      }),
      dispatcher: createDispatcher(),
      inboundAudio: false,
      shouldRouteToOriginating: true,
      originatingChannel: "telegram",
      originatingTo: "telegram:123",
    });

    await coordinator.deliver("tool", { text: "tool" });
    await coordinator.deliver("final", { text: "done" });
    await coordinator.deliver("final", { text: "done again" });

    expect(routeMocks.routeReply).toHaveBeenCalledTimes(3);
    expect(webUiMocks.sendWebUiNotification).toHaveBeenCalledTimes(1);
    expect(webUiMocks.sendWebUiNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: "agent:codex-acp:session-1",
        text: "done",
      }),
    );
  });
});
