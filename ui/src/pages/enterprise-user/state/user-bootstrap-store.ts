import { eu } from "../../../i18n/enterprise-user.ts";
import type { EnterpriseUserAgentAccessRequest } from "../contracts/user-agent.ts";
import type { EnterpriseUserBootstrapV2 } from "../contracts/user-bootstrap.ts";
import { loadEnterpriseUserBootstrapV2 } from "../services/user-enterprise-api.ts";

export type UserBootstrapState =
  | { phase: "idle" | "loading" }
  | { phase: "ready"; data: EnterpriseUserBootstrapV2; refreshError?: string }
  | { phase: "error"; message: string };

export class UserBootstrapStore {
  state: UserBootstrapState = { phase: "idle" };
  private readonly listeners = new Set<() => void>();
  private pending?: Promise<void>;
  private loadEpoch = 0;

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
    const epoch = ++this.loadEpoch;
    const previous = this.state;
    if (previous.phase === "ready") {
      this.publish({ phase: "ready", data: previous.data });
    } else {
      this.publish({ phase: "loading" });
    }
    const pending = loadEnterpriseUserBootstrapV2()
      .then((data) => {
        if (epoch === this.loadEpoch) {
          this.publish({ phase: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (epoch !== this.loadEpoch) {
          return;
        }
        const message = error instanceof Error ? error.message : eu("portalLoadFailed");
        if (this.state.phase === "ready") {
          this.publish({ ...this.state, refreshError: message });
        } else {
          this.publish({ phase: "error", message });
        }
      })
      .finally(() => {
        if (epoch === this.loadEpoch) {
          this.pending = undefined;
        }
      });
    this.pending = pending;
    return pending;
  }

  applyAgentAccessRequest(request: EnterpriseUserAgentAccessRequest): void {
    if (this.state.phase !== "ready") {
      return;
    }
    const agent = this.state.data.agents.find((item) => item.key === request.agentKey);
    if (!agent) {
      return;
    }
    ++this.loadEpoch;
    this.pending = undefined;
    this.publish({
      phase: "ready",
      data: {
        ...this.state.data,
        agents: this.state.data.agents.map((item) =>
          item.key === request.agentKey
            ? {
                ...item,
                access: {
                  allowed: item.access?.allowed ?? false,
                  reason: item.access?.reason ?? null,
                  request,
                },
                actions: {
                  ...item.actions,
                  canRequestAccess: request.state !== "pending",
                },
              }
            : item,
        ),
      },
    });
  }
}

export const userBootstrapStore = new UserBootstrapStore();
