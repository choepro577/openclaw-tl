import type { AgentKey, EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { resolveEnterpriseUserConversationAgentKey } from "../services/user-enterprise-api.ts";
import { userBootstrapStore } from "./user-bootstrap-store.ts";

export class UserAgentCatalogStore {
  activeKey: AgentKey | null = null;
  private readonly runtimeAgentKeys = new Map<string, AgentKey>();
  private readonly listeners = new Set<() => void>();
  private unsubscribeBootstrap?: () => void;
  private runtimeBindingEpoch = 0;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.unsubscribeBootstrap ??= userBootstrapStore.subscribe(() => {
      const state = userBootstrapStore.state;
      if (state.phase === "ready") {
        const activeAvailable = state.data.agents.some(
          (agent) => agent.key === this.activeKey && agent.actions.canChat,
        );
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
    return (
      this.agents.find((agent) => agent.key === this.activeKey && agent.actions.canChat) ?? null
    );
  }

  setActive(key: AgentKey): void {
    if (!this.agents.some((agent) => agent.key === key && agent.actions.canChat)) {
      return;
    }
    ++this.runtimeBindingEpoch;
    this.activeKey = key;
    this.publish();
  }

  bindRuntimeAgent(key: AgentKey, runtimeAgentId: string): void {
    if (!this.agents.some((agent) => agent.key === key && agent.actions.canChat)) {
      return;
    }
    ++this.runtimeBindingEpoch;
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

  /**
   * Reconciles a committed session owner with the public User Portal catalog.
   *
   * A deep link only has the runtime owner in its session key. Resolve the
   * opaque public Agent key through the account-scoped server authority, then
   * bind it after the catalog bootstrap is ready. The caller supplies a route
   * epoch guard so an older session cannot win after navigation.
   */
  async bindSessionOwner(
    runtimeAgentId: string,
    sessionKey: string,
    options: { isCurrent?: () => boolean } = {},
  ): Promise<void> {
    const epoch = ++this.runtimeBindingEpoch;
    const isCurrent = () => this.runtimeBindingEpoch === epoch && (options.isCurrent?.() ?? true);
    const normalized = runtimeAgentId.trim();
    if (!normalized || !isCurrent()) {
      return;
    }

    const knownKey = this.runtimeAgentKeys.get(normalized);
    const resolved = knownKey
      ? { agentKey: knownKey }
      : await resolveEnterpriseUserConversationAgentKey(sessionKey);
    if (!isCurrent()) {
      return;
    }

    await this.load();
    if (!isCurrent()) {
      return;
    }
    this.bindRuntimeAgent(resolved.agentKey, normalized);
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
