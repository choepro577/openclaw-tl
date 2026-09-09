import { afterEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";
import type { EnterpriseUserBootstrapV2 } from "../contracts/user-bootstrap.ts";
import { loadEnterpriseUserBootstrapV2 } from "../services/user-enterprise-api.ts";
import { UserAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

vi.mock("../services/user-enterprise-api.ts", () => ({
  loadEnterpriseUserBootstrapV2: vi.fn(),
}));

function agent(key: EnterpriseUserAgent["key"], canChat: boolean): EnterpriseUserAgent {
  return {
    key,
    kind: key === "personal" ? "personal" : "shared",
    name: key,
    canonicalName: key,
    description: null,
    avatar: null,
    availability: "ready",
    capabilityLabels: [],
    relationship: null,
    actions: { canChat, canSchedule: canChat, canEdit: false, canPersonalize: false },
  };
}

const previous = userBootstrapStore.state;
afterEach(() => {
  userBootstrapStore.state = previous;
  vi.clearAllMocks();
});

describe("Agent catalog selection permissions", () => {
  it("keeps denied agents discoverable but never activates or binds them", () => {
    const agents = [agent("personal", true), agent("shared:legal", false)];
    userBootstrapStore.state = { phase: "ready", data: { agents } as EnterpriseUserBootstrapV2 };
    const store = new UserAgentCatalogStore();
    store.setActive("personal");
    store.setActive("shared:legal");
    store.bindRuntimeAgent("shared:legal", "runtime-legal");
    store.setActiveRuntime("runtime-legal");
    expect(store.agents).toEqual(agents);
    expect(store.activeKey).toBe("personal");
    expect(store.activeAgent?.key).toBe("personal");
  });

  it("drops an active agent after revocation while keeping its catalog entry", async () => {
    const agents = [agent("personal", true), agent("shared:legal", true)];
    const data = { agents, defaultAgentKey: "personal" } as EnterpriseUserBootstrapV2;
    userBootstrapStore.state = { phase: "ready", data };
    const store = new UserAgentCatalogStore();
    const unsubscribe = store.subscribe(() => {});
    try {
      store.bindRuntimeAgent("shared:legal", "runtime-legal");
      vi.mocked(loadEnterpriseUserBootstrapV2).mockResolvedValue({
        ...data,
        agents: [agents[0], agent("shared:legal", false)],
      });
      await store.load(true);
      store.setActiveRuntime("runtime-legal");
      expect(store.agents).toHaveLength(2);
      expect(store.activeAgent?.key).toBe("personal");
    } finally {
      unsubscribe();
    }
  });
});
