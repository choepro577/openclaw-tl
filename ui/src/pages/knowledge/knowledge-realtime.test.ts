/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplicationGateway } from "../../app/gateway.ts";
import type { EnterpriseKnowledgeChangeEvent } from "../enterprise/services/enterprise-knowledge-api.ts";
import { startEnterpriseKnowledgeRealtime } from "./knowledge-realtime.ts";

describe("Enterprise Knowledge realtime synchronization", () => {
  afterEach(() => {
    vi.useRealTimers();
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
});
