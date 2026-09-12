// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShellRouteState } from "../../../app/app-host-route-state.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";
import type { EnterpriseUserBootstrapV2 } from "../contracts/user-bootstrap.ts";
import {
  loadEnterpriseUserBootstrapV2,
  resolveEnterpriseUserConversationAgentKey,
} from "../services/user-enterprise-api.ts";
import { syncEnterpriseUserSessionOwner } from "../shell/user-shell.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

vi.mock("../services/user-enterprise-api.ts", () => ({
  loadEnterpriseUserBootstrapV2: vi.fn(),
  resolveEnterpriseUserConversationAgentKey: vi.fn(),
}));

const sharedPurchaseOrderAgent: EnterpriseUserAgent = {
  key: "shared:4y2veJpZcXUF6GH3QR37",
  kind: "shared",
  name: "Mua hàng",
  canonicalName: "Mua hàng",
  description: null,
  avatar: null,
  availability: "ready",
  capabilityLabels: ["purchase-order-skill"],
  relationship: null,
  actions: {
    canChat: true,
    canSchedule: true,
    canEdit: false,
    canPersonalize: true,
  },
};

const personalAgent: EnterpriseUserAgent = {
  key: "personal",
  kind: "personal",
  name: "Personal Agent",
  canonicalName: "Personal Agent",
  description: null,
  avatar: null,
  availability: "ready",
  capabilityLabels: [],
  relationship: null,
  actions: {
    canChat: true,
    canSchedule: true,
    canEdit: true,
    canPersonalize: false,
  },
};

function bootstrap(): EnterpriseUserBootstrapV2 {
  return {
    schemaVersion: 2,
    user: { username: "alex", displayName: "Alex", avatarUrl: null },
    features: {
      personalAgent: { enabled: true, editable: true },
      automations: true,
      notifications: false,
      knowledge: { enabled: false, memberships: 0 },
      plugins: { enabled: false },
    },
    agents: [personalAgent, sharedPurchaseOrderAgent],
    defaultAgentKey: "personal",
    policyRevision: 1,
    catalogRevision: "catalog-1",
  };
}

function contextFor(calls: string[]) {
  return {
    agentSelection: {
      state: { selectedId: "personal", scopeId: "personal" },
      set: vi.fn((agentId: string | null) => calls.push(`agent:${agentId}`)),
      setScope: vi.fn(),
    },
    gateway: {
      setSessionKey: vi.fn((sessionKey: string) => calls.push(`session:${sessionKey}`)),
    },
  } as unknown as ApplicationContext;
}

const initialBootstrapState = userBootstrapStore.state;
const initialActiveKey = userAgentCatalogStore.activeKey;

afterEach(() => {
  userBootstrapStore.state = initialBootstrapState;
  userAgentCatalogStore.activeKey = initialActiveKey;
  vi.clearAllMocks();
});

describe("Enterprise User deep-link route owner binding", () => {
  it("keeps a direct shared session owner after delayed bootstrap defaults to Personal", async () => {
    vi.mocked(resolveEnterpriseUserConversationAgentKey).mockResolvedValue({
      agentKey: "shared:4y2veJpZcXUF6GH3QR37",
    });
    let resolveBootstrap: (data: EnterpriseUserBootstrapV2) => void = () => undefined;
    vi.mocked(loadEnterpriseUserBootstrapV2).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBootstrap = resolve;
        }),
    );
    userBootstrapStore.state = { phase: "idle" };
    userAgentCatalogStore.activeKey = "personal";
    const calls: string[] = [];
    const context = contextFor(calls);
    const routeState: ShellRouteState = {
      committedRouteId: "chat",
      committedSessionKey: "agent:purchase-order-skill:dashboard:767c9833",
    };
    const subscription = userAgentCatalogStore.subscribe(() => undefined);

    try {
      const binding = syncEnterpriseUserSessionOwner(context, routeState, () => true);
      expect(binding).toBeInstanceOf(Promise);
      expect(calls).toEqual([
        "agent:purchase-order-skill",
        "session:agent:purchase-order-skill:dashboard:767c9833",
      ]);
      expect(userAgentCatalogStore.activeKey).toBe("personal");

      await vi.waitFor(() => expect(loadEnterpriseUserBootstrapV2).toHaveBeenCalled());
      resolveBootstrap(bootstrap());
      await binding;

      expect(userAgentCatalogStore.activeKey).toBe("shared:4y2veJpZcXUF6GH3QR37");
      expect(userAgentCatalogStore.activeAgent?.key).toBe("shared:4y2veJpZcXUF6GH3QR37");
    } finally {
      subscription();
    }
  });

  it("does not apply a stale route owner after the route epoch changes", async () => {
    vi.mocked(resolveEnterpriseUserConversationAgentKey).mockResolvedValue({
      agentKey: "shared:4y2veJpZcXUF6GH3QR37",
    });
    let resolveBootstrap: (data: EnterpriseUserBootstrapV2) => void = () => undefined;
    vi.mocked(loadEnterpriseUserBootstrapV2).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBootstrap = resolve;
        }),
    );
    userBootstrapStore.state = { phase: "idle" };
    userAgentCatalogStore.activeKey = "personal";
    const context = contextFor([]);
    let current = true;
    const binding = syncEnterpriseUserSessionOwner(
      context,
      {
        committedRouteId: "chat",
        committedSessionKey: "agent:purchase-order-skill:dashboard:767c9833",
      },
      () => current,
    );

    await vi.waitFor(() => expect(loadEnterpriseUserBootstrapV2).toHaveBeenCalled());
    current = false;
    resolveBootstrap(bootstrap());
    await binding;

    expect(userAgentCatalogStore.activeKey).toBe("personal");
  });

  it("rebinds a Personal deep link after a Shared Agent route", async () => {
    vi.mocked(resolveEnterpriseUserConversationAgentKey).mockResolvedValue({
      agentKey: "personal",
    });
    userBootstrapStore.state = { phase: "ready", data: bootstrap() };
    userAgentCatalogStore.activeKey = "shared:4y2veJpZcXUF6GH3QR37";
    const context = contextFor([]);

    await syncEnterpriseUserSessionOwner(
      context,
      {
        committedRouteId: "chat",
        committedSessionKey: "agent:personal-alex:dashboard:personal-session",
      },
      () => true,
    );

    expect(userAgentCatalogStore.activeKey).toBe("personal");
  });
});
