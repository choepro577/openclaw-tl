import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  approveEnterpriseAdminAgentAccessRequest,
  listEnterpriseAdminAgentAccessRequests,
  requestEnterpriseAgentAccess,
} from "./agent-access-request-service.js";

const state = vi.hoisted(() => ({
  currentConfig: {} as OpenClawConfig,
  getRequest: vi.fn(),
  listRequests: vi.fn(),
  listAccounts: vi.fn(),
  approveRequest: vi.fn(),
  createRequest: vi.fn(),
  roster: vi.fn(),
  resolveCatalogKey: vi.fn(),
  withLifecycleLocks: vi.fn(),
  readConfigSnapshot: vi.fn(),
}));

vi.mock("../../config/io.js", () => ({
  readConfigFileSnapshot: state.readConfigSnapshot,
}));
vi.mock("../accounts/account-store.js", () => ({
  getEnterpriseAccountById: vi.fn(),
  listEnterpriseAccounts: state.listAccounts,
}));
vi.mock("../user/user-agent-roster.js", () => ({
  listEnterpriseUserSharedAgentRoster: state.roster,
}));
vi.mock("../entitlements/entitlement-store.js", () => ({
  resolveEnterpriseResourceAccess: vi.fn(() => ({ allowed: false, reason: "not_granted" })),
}));
vi.mock("../user/user-agent-key.js", () => ({
  resolveEnterpriseSharedAgentCatalogKey: state.resolveCatalogKey,
}));
vi.mock("./agent-access-request-store.js", () => ({
  getEnterpriseAgentAccessRequest: state.getRequest,
  listEnterpriseAgentAccessRequests: state.listRequests,
  approveEnterpriseAgentAccessRequest: state.approveRequest,
  createEnterpriseAgentAccessRequest: state.createRequest,
}));
vi.mock("./enterprise-agent-lifecycle-lock.js", () => ({
  withEnterpriseAgentLifecycleLocks: state.withLifecycleLocks,
}));

const resourceKey = "agent:shared:research";
const request = {
  id: "request-1",
  requesterAccountId: "account-1",
  agentKey: "shared:research-key" as `shared:${string}`,
  resourceKey,
  agentId: "research",
  state: "pending" as const,
  reviewerAccountId: null,
  decisionReason: null,
  revision: 1,
  createdAt: 1,
  updatedAt: 1,
  decidedAt: null,
};

function configWithResearch(): OpenClawConfig {
  return {
    agents: { entries: { research: { name: "Research Agent" } } },
  };
}

describe("Enterprise shared-agent access approval service", () => {
  it("presents the admin request list from the lightweight shared-agent roster", () => {
    state.listRequests.mockReturnValue([request]);
    state.listAccounts.mockReturnValue([
      { id: request.requesterAccountId, username: "requester", displayName: "Requester" },
    ]);
    state.roster.mockReturnValue({
      catalogRevision: "test",
      shared: [
        {
          agentId: request.agentId,
          resourceKey,
          name: "Research Agent",
          description: "Researches things",
        },
      ],
    });

    expect(listEnterpriseAdminAgentAccessRequests(configWithResearch())).toEqual([
      expect.objectContaining({
        requester: {
          id: request.requesterAccountId,
          username: "requester",
          displayName: "Requester",
        },
        agent: {
          agentId: request.agentId,
          resourceKey,
          name: "Research Agent",
          description: "Researches things",
        },
      }),
    ]);
    expect(state.roster).toHaveBeenCalledTimes(1);
  });

  it("loads current config inside the lifecycle lock before granting", async () => {
    state.currentConfig = configWithResearch();
    state.getRequest.mockReturnValue(request);
    state.resolveCatalogKey.mockImplementation((config: OpenClawConfig) =>
      config.agents?.entries?.research ? { agentId: "research", resourceKey } : null,
    );
    state.readConfigSnapshot.mockImplementation(async () => ({
      valid: true,
      config: state.currentConfig,
    }));
    state.approveRequest.mockReturnValue({
      request: { ...request, state: "approved", revision: 2 },
      entitlement: {
        accountId: request.requesterAccountId,
        resourceType: "agent",
        resourceId: resourceKey,
        resourceState: "active",
        effect: "allow",
      },
    });

    let release: (() => void) | undefined;
    const entered = new Promise<void>((resolve) => {
      release = resolve;
    });
    state.withLifecycleLocks.mockImplementation(
      async (_keys: string[], operation: () => unknown) => {
        await entered;
        return operation();
      },
    );

    const approving = approveEnterpriseAdminAgentAccessRequest(
      {},
      {
        requestId: request.id,
        reviewerAccountId: "admin-1",
        baseRevision: request.revision,
      },
    );
    await Promise.resolve();
    state.currentConfig = { agents: { entries: {} } };
    release?.();

    await expect(approving).rejects.toThrow("AGENT_NOT_FOUND");
    expect(state.readConfigSnapshot).toHaveBeenLastCalledWith({
      observe: false,
      pluginValidation: "core-only",
    });
    expect(state.approveRequest).not.toHaveBeenCalled();
  });

  it("approves when the current Agent still resolves to the requested resource", async () => {
    state.currentConfig = configWithResearch();
    state.getRequest.mockReturnValue(request);
    state.resolveCatalogKey.mockReturnValue({ agentId: "research", resourceKey });
    state.readConfigSnapshot.mockResolvedValue({ valid: true, config: state.currentConfig });
    state.approveRequest.mockReturnValue({
      request: { ...request, state: "approved", revision: 2 },
      entitlement: {
        accountId: request.requesterAccountId,
        resourceType: "agent",
        resourceId: resourceKey,
        resourceState: "active",
        effect: "allow",
      },
    });
    state.withLifecycleLocks.mockImplementation(
      async (_keys: string[], operation: () => unknown) => await operation(),
    );

    await expect(
      approveEnterpriseAdminAgentAccessRequest(configWithResearch(), {
        requestId: request.id,
        reviewerAccountId: "admin-1",
        baseRevision: request.revision,
      }),
    ).resolves.toMatchObject({ request: { state: "approved" } });
    expect(state.approveRequest).toHaveBeenCalledWith({
      requestId: request.id,
      reviewerAccountId: "admin-1",
      baseRevision: request.revision,
    });
  });

  it("does not create a request from a stale config after the Agent was removed", async () => {
    state.currentConfig = { agents: { entries: {} } };
    state.resolveCatalogKey.mockImplementation((config: OpenClawConfig) =>
      config.agents?.entries?.research ? { agentId: "research", resourceKey } : null,
    );
    state.readConfigSnapshot.mockResolvedValue({ valid: true, config: state.currentConfig });
    state.withLifecycleLocks.mockImplementation(
      async (_keys: string[], operation: () => unknown) => await operation(),
    );
    const account = { id: "account-1", enabled: true } as never;

    await expect(
      requestEnterpriseAgentAccess(configWithResearch(), account, request.agentKey),
    ).rejects.toThrow("AGENT_NOT_FOUND");
    expect(state.readConfigSnapshot).toHaveBeenLastCalledWith({
      observe: false,
      pluginValidation: "core-only",
    });
    expect(state.createRequest).not.toHaveBeenCalled();
  });
});
