import { getEnterpriseAccountById } from "../enterprise/accounts/account-store.js";
import { getActiveEnterpriseSession } from "../enterprise/auth/session-store.js";
import {
  getKnowledgeZoneRole,
  listEnterpriseKnowledgeChanges,
} from "../enterprise/knowledge/knowledge-store.js";
import type { EnterpriseKnowledgeChangeEvent } from "../enterprise/knowledge/knowledge-types.js";
import type { GatewayBroadcastToConnIdsFn } from "./server-broadcast-types.js";

export const ENTERPRISE_KNOWLEDGE_CHANGED_EVENT = "enterprise.knowledge.changed";

type Subscription = {
  connId: string;
  sessionId: string;
  accountId: string;
  accountRole: "administrator" | "employee";
  zoneIds: Set<string>;
  overview: boolean;
  lastSequence: number;
  broadcastToConnIds: GatewayBroadcastToConnIdsFn;
  isConnectionActive: (connId: string) => boolean;
};

const subscriptions = new Map<string, Subscription>();
let poller: ReturnType<typeof setInterval> | undefined;
let polling = false;

function eventAllowed(subscription: Subscription, event: EnterpriseKnowledgeChangeEvent): boolean {
  if (subscription.accountRole === "administrator") {
    return subscription.overview || subscription.zoneIds.has(event.zoneId);
  }
  if (!subscription.zoneIds.has(event.zoneId)) {
    return false;
  }
  const role = getKnowledgeZoneRole(event.zoneId, subscription.accountId);
  if (!role) {
    return false;
  }
  if (role === "viewer") {
    return event.entityType === "publication" || event.entityType === "graph";
  }
  return true;
}

async function pollSubscriptions(): Promise<void> {
  if (polling) {
    return;
  }
  polling = true;
  try {
    for (const subscription of subscriptions.values()) {
      if (!subscription.isConnectionActive(subscription.connId)) {
        subscriptions.delete(subscription.connId);
        continue;
      }
      const session = getActiveEnterpriseSession(subscription.sessionId, {}, "user");
      const account = getEnterpriseAccountById(subscription.accountId);
      if (
        !session ||
        session.accountId !== subscription.accountId ||
        !account?.enabled ||
        account.mustChangePassword
      ) {
        subscriptions.delete(subscription.connId);
        continue;
      }
      const changes = listEnterpriseKnowledgeChanges({
        afterSequence: subscription.lastSequence,
        limit: 500,
      });
      if (changes.length === 0) {
        continue;
      }
      subscription.lastSequence = changes.at(-1)!.sequence;
      const allowed = changes.filter((event) => eventAllowed(subscription, event));
      if (allowed.length > 0) {
        subscription.broadcastToConnIds(
          ENTERPRISE_KNOWLEDGE_CHANGED_EVENT,
          {
            events: allowed,
            lastSequence: subscription.lastSequence,
          },
          new Set([subscription.connId]),
        );
      }
    }
  } finally {
    polling = false;
    if (subscriptions.size === 0 && poller) {
      clearInterval(poller);
      poller = undefined;
    }
  }
}

function ensurePoller(): void {
  if (poller) {
    return;
  }
  poller = setInterval(() => void pollSubscriptions(), 350);
  poller.unref();
}

export function subscribeEnterpriseKnowledgeChanges(params: {
  connId: string;
  sessionId: string;
  accountId: string;
  accountRole: "administrator" | "employee";
  zoneIds: string[];
  overview: boolean;
  lastSequence: number;
  broadcastToConnIds: GatewayBroadcastToConnIdsFn;
  isConnectionActive: (connId: string) => boolean;
}): void {
  subscriptions.set(params.connId, {
    ...params,
    zoneIds: new Set(params.zoneIds),
  });
  ensurePoller();
  void pollSubscriptions();
}

export function unsubscribeEnterpriseKnowledgeChanges(connId: string): void {
  subscriptions.delete(connId);
}

export const testing = {
  clear() {
    subscriptions.clear();
    if (poller) {
      clearInterval(poller);
      poller = undefined;
    }
  },
  size: () => subscriptions.size,
  poll: pollSubscriptions,
};
