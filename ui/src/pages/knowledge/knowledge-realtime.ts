import type { ApplicationGateway } from "../../app/gateway.ts";
import type { EnterprisePortalAudience } from "../enterprise/services/enterprise-api.ts";
import {
  listEnterpriseKnowledgeChanges,
  type EnterpriseKnowledgeChangeEvent,
} from "../enterprise/services/enterprise-knowledge-api.ts";

type KnowledgeRealtimeOptions = {
  gateway?: ApplicationGateway;
  audience: EnterprisePortalAudience;
  zoneIds: () => string[];
  overview?: boolean;
  hasActiveJobs: () => boolean;
  onEvents: (events: EnterpriseKnowledgeChangeEvent[]) => void;
  onTerminal: (events: EnterpriseKnowledgeChangeEvent[]) => void;
};

function parsePayload(payload: unknown): {
  events: EnterpriseKnowledgeChangeEvent[];
  lastSequence: number;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.events) || !Number.isSafeInteger(record.lastSequence)) {
    return null;
  }
  return {
    events: record.events as EnterpriseKnowledgeChangeEvent[],
    lastSequence: Number(record.lastSequence),
  };
}

export function startEnterpriseKnowledgeRealtime(options: KnowledgeRealtimeOptions): () => void {
  let disposed = false;
  let lastSequence = 0;
  let pollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let authoritativeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  const deliver = (events: EnterpriseKnowledgeChangeEvent[]) => {
    if (disposed) {
      return;
    }
    const fresh = [
      ...new Map(
        events
          .filter((event) => event.sequence > lastSequence)
          .map((event) => [event.sequence, event]),
      ).values(),
    ].toSorted((left, right) => left.sequence - right.sequence);
    if (fresh.length === 0) {
      return;
    }
    lastSequence = fresh.at(-1)!.sequence;
    options.onEvents(fresh);
    const terminal = fresh.filter((event) => {
      const statusTerminal = [
        "completed",
        "degraded",
        "failed",
        "cancelled",
        "superseded",
        "ready",
        "succeeded",
      ].includes(event.status ?? "");
      if (event.entityType === "job") {
        return statusTerminal;
      }
      if (event.entityType === "job_step") {
        return event.stage === "candidate_ready" && statusTerminal;
      }
      return (
        event.operation === "completed" &&
        ["source", "candidate", "publication", "graph", "upload"].includes(event.entityType)
      );
    });
    if (terminal.length > 0) {
      if (authoritativeTimer) {
        globalThis.clearTimeout(authoritativeTimer);
      }
      authoritativeTimer = globalThis.setTimeout(() => options.onTerminal(terminal), 180);
    }
  };

  const fetchFallback = async () => {
    if (disposed) {
      return;
    }
    const zones = options.zoneIds();
    try {
      if (options.audience === "admin" && options.overview) {
        const response = await listEnterpriseKnowledgeChanges("admin", {
          afterSequence: lastSequence,
          limit: 500,
        });
        if (disposed) {
          return;
        }
        if (response.gap) {
          options.onTerminal([]);
        }
        deliver(response.items);
        lastSequence = Math.max(lastSequence, response.lastSequence);
      } else {
        for (const zoneId of zones) {
          const response = await listEnterpriseKnowledgeChanges(options.audience, {
            afterSequence: lastSequence,
            zoneId,
            limit: 500,
          });
          if (disposed) {
            return;
          }
          if (response.gap) {
            options.onTerminal([]);
          }
          deliver(response.items);
          lastSequence = Math.max(lastSequence, response.lastSequence);
        }
      }
    } catch {
      // WebSocket reconnect or the next safety poll remains authoritative.
    }
    if (disposed) {
      return;
    }
    const activeDelay = document.visibilityState === "hidden" ? 60_000 : 20_000;
    if (options.hasActiveJobs() || options.gateway?.snapshot.phase !== "connected") {
      pollTimer = globalThis.setTimeout(() => void fetchFallback(), activeDelay);
    }
  };

  const subscribe = async () => {
    const client = options.gateway?.snapshot.client;
    if (!client || options.gateway?.snapshot.phase !== "connected") {
      void fetchFallback();
      return;
    }
    try {
      await client.request("enterprise.knowledge.subscribe", {
        zoneIds: options.zoneIds(),
        overview: options.overview === true,
        lastSequence,
      });
    } catch {
      void fetchFallback();
    }
  };

  const unsubscribeEvents = options.gateway?.subscribeEvents((event) => {
    if (event.event !== "enterprise.knowledge.changed") {
      return;
    }
    const parsed = parsePayload(event.payload);
    if (!parsed) {
      return;
    }
    deliver(parsed.events);
    lastSequence = Math.max(lastSequence, parsed.lastSequence);
  });
  const unsubscribeGateway = options.gateway?.subscribe((snapshot) => {
    if (snapshot.phase === "connected") {
      void subscribe();
    } else if (options.hasActiveJobs()) {
      void fetchFallback();
    }
  });
  void subscribe();

  return () => {
    disposed = true;
    unsubscribeEvents?.();
    unsubscribeGateway?.();
    if (pollTimer) {
      globalThis.clearTimeout(pollTimer);
    }
    if (authoritativeTimer) {
      globalThis.clearTimeout(authoritativeTimer);
    }
    const client = options.gateway?.snapshot.client;
    if (client) {
      void client.request("enterprise.knowledge.unsubscribe", {}).catch(() => undefined);
    }
  };
}
