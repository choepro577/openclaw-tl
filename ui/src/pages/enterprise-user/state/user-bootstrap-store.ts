import { eu } from "../../../i18n/enterprise-user.ts";
import type { EnterpriseUserBootstrapV2 } from "../contracts/user-bootstrap.ts";
import { loadEnterpriseUserBootstrapV2 } from "../services/user-enterprise-api.ts";

export type UserBootstrapState =
  | { phase: "idle" | "loading" }
  | { phase: "ready"; data: EnterpriseUserBootstrapV2 }
  | { phase: "error"; message: string };

export class UserBootstrapStore {
  state: UserBootstrapState = { phase: "idle" };
  private readonly listeners = new Set<() => void>();
  private pending?: Promise<void>;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(state: UserBootstrapState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }

  load(force = false): Promise<void> {
    if (!force && this.state.phase === "ready") {
      return Promise.resolve();
    }
    if (!force && this.pending) {
      return this.pending;
    }
    this.publish({ phase: "loading" });
    this.pending = loadEnterpriseUserBootstrapV2()
      .then((data) => this.publish({ phase: "ready", data }))
      .catch((error: unknown) =>
        this.publish({
          phase: "error",
          message: error instanceof Error ? error.message : eu("portalLoadFailed"),
        }),
      )
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
}

export const userBootstrapStore = new UserBootstrapStore();
