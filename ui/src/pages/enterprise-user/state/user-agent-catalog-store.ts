import type { AgentKey, EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { userBootstrapStore } from "./user-bootstrap-store.ts";

export class UserAgentCatalogStore {
  activeKey: AgentKey | null = null;
  private readonly runtimeAgentKeys = new Map<string, AgentKey>();
  private readonly listeners = new Set<() => void>();
  private unsubscribeBootstrap?: () => void;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.unsubscribeBootstrap ??= userBootstrapStore.subscribe(() => {
      const state = userBootstrapStore.state;
      if (state.phase === "ready") {
        const activeAvailable = state.data.agents.some((agent) => agent.key === this.activeKey);
        if (!activeAvailable) {
          this.activeKey = state.data.defaultAgentKey;
        }
      }
      this.publish();
    });
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribeBootstrap?.();
        this.unsubscribeBootstrap = undefined;
      }
    };
  }

  get agents(): EnterpriseUserAgent[] {
    return userBootstrapStore.state.phase === "ready" ? userBootstrapStore.state.data.agents : [];
  }

  get activeAgent(): EnterpriseUserAgent | null {
    return this.agents.find((agent) => agent.key === this.activeKey) ?? null;
  }

  setActive(key: AgentKey): void {
    if (!this.agents.some((agent) => agent.key === key)) {
      return;
    }
    this.activeKey = key;
    this.publish();
  }

  bindRuntimeAgent(key: AgentKey, runtimeAgentId: string): void {
    if (!this.agents.some((agent) => agent.key === key)) {
      return;
    }
    this.runtimeAgentKeys.set(runtimeAgentId, key);
    this.activeKey = key;
    this.publish();
  }

  setActiveRuntime(runtimeAgentId: string): void {
    const key = this.runtimeAgentKeys.get(runtimeAgentId);
    if (key) {
      this.setActive(key);
    }
  }

  load(force = false): Promise<void> {
    return userBootstrapStore.load(force);
  }

  private publish(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const userAgentCatalogStore = new UserAgentCatalogStore();
