/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplicationGateway } from "../../app/gateway.ts";
import type { EnterpriseKnowledgeChangeEvent } from "../enterprise/services/enterprise-knowledge-api.ts";
import { startEnterpriseKnowledgeRealtime } from "./knowledge-realtime.ts";

describe("Enterprise Knowledge realtime synchronization", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("subscribes from a cursor, ignores duplicate sequence and refreshes on terminal events", async () => {
    vi.useFakeTimers();
    const request = vi.fn(async () => ({ ok: true }));
    let eventListener: ((event: { event: string; payload: unknown }) => void) | undefined;
    const gateway = {
      snapshot: { phase: "connected", client: { request } },
      subscribeEvents(listener: typeof eventListener) {
        eventListener = listener;
        return () => {
          eventListener = undefined;
        };
      },
      subscribe() {
        return () => undefined;
      },
    } as unknown as ApplicationGateway;
    const onEvents = vi.fn();
    const onTerminal = vi.fn();
    const stop = startEnterpriseKnowledgeRealtime({
      gateway,
      audience: "admin",
      zoneIds: () => ["zone-realtime"],
      overview: true,
      hasActiveJobs: () => true,
      onEvents,
      onTerminal,
    });
    await Promise.resolve();
    expect(request).toHaveBeenCalledWith("enterprise.knowledge.subscribe", {
      zoneIds: ["zone-realtime"],
      overview: true,
      lastSequence: 0,
    });

    const running: EnterpriseKnowledgeChangeEvent = {
      sequence: 1,
      zoneId: "zone-realtime",
      entityType: "job_step",
      entityId: "job-1",
      operation: "updated",
      status: "running",
      stage: "ai_read",
      progressCurrent: 30,
      progressTotal: 60,
      occurredAt: new Date(1).toISOString(),
    };
    const completed: EnterpriseKnowledgeChangeEvent = {
      ...running,
      sequence: 2,
      operation: "completed",
      status: "completed",
      stage: "candidate_ready",
      progressCurrent: 60,
    };
    eventListener?.({
      event: "enterprise.knowledge.changed",
      payload: { events: [running, running, completed], lastSequence: 2 },
    });
    expect(onEvents).toHaveBeenCalledWith([running, completed]);
    await vi.advanceTimersByTimeAsync(180);
    expect(onTerminal).toHaveBeenCalledWith([completed]);

    stop();
    await Promise.resolve();
    expect(request).toHaveBeenLastCalledWith("enterprise.knowledge.unsubscribe", {});
  });

  it("polls the durable change feed in the HTTP-only Admin portal and stops on disposal", async () => {
    vi.useFakeTimers();
    const completed: EnterpriseKnowledgeChangeEvent = {
      sequence: 1,
      zoneId: "zone-http",
      entityType: "candidate",
      entityId: "generation-http",
      operation: "completed",
      status: "ready",
      occurredAt: new Date(1).toISOString(),
    };
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [completed], lastSequence: 1, gap: false }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const onTerminal = vi.fn();
    const onEvents = vi.fn();
    const stop = startEnterpriseKnowledgeRealtime({
      audience: "admin",
      overview: true,
      zoneIds: () => ["zone-http"],
      hasActiveJobs: () => false,
      onEvents,
      onTerminal,
    });
    await vi.advanceTimersByTimeAsync(180);
    expect(onEvents).toHaveBeenCalledWith([completed]);
    expect(onTerminal).toHaveBeenCalledWith([completed]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch.mock.calls.length).toBeGreaterThan(1);
    expect(onEvents).toHaveBeenCalledTimes(1);
    const callsBeforeStop = fetch.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it("does not resurrect polling when a pending HTTP response arrives after disposal", async () => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal("fetch", fetch);
    const onTerminal = vi.fn();
    const onEvents = vi.fn();
    const stop = startEnterpriseKnowledgeRealtime({
      audience: "admin",
      overview: true,
      zoneIds: () => [],
      hasActiveJobs: () => true,
      onEvents,
      onTerminal,
    });
    stop();
    pending.resolve(new Response(JSON.stringify({ items: [], lastSequence: 1, gap: true })));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onEvents).not.toHaveBeenCalled();
    expect(onTerminal).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
