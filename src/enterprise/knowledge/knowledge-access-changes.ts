import { createSubsystemLogger } from "../../logging/subsystem.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";
import {
  deferOpenClawStatePostCommitPublication,
  type OpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";

const listeners = resolveGlobalSingleton<Set<(zoneId: string) => void>>(
  Symbol.for("openclaw.enterprise.knowledgeAccessChanges"),
  () => new Set(),
);
const log = createSubsystemLogger("enterprise/knowledge-access");

/** Process-only invalidation; never transports excerpts or replaces live authorization checks. */
export function subscribeKnowledgeAccessChanges(listener: (zoneId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function deferKnowledgeAccessChange(database: OpenClawStateDatabase, zoneId: string): void {
  if (
    !deferOpenClawStatePostCommitPublication(database, () => {
      // A lease may unsubscribe while being revoked; notify the committed snapshot.
      const currentListeners = Array.from(listeners);
      for (const listener of currentListeners) {
        try {
          listener(zoneId);
        } catch {
          // The mutation is already committed; a listener must not turn it into a retryable write failure.
          log.warn("Knowledge access-change listener failed.");
        }
      }
    })
  ) {
    throw new Error("Knowledge access changes require an owned state transaction.");
  }
}
