import { describe, expect, beforeEach, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";

const mocks = vi.hoisted(() => ({
  invokeEnterpriseGatewayHandler: vi.fn(),
  listSessionsFromStore: vi.fn(),
  loadLatestCombinedSessionStoreForGatewayCore: vi.fn(),
  loadCombinedSessionStoreForGatewayCore: vi.fn(),
  prepareEnterpriseGatewayRequest: vi.fn(),
  readSessionMessageCountAsync: vi.fn(),
  scheduleEnterpriseSessionPrewarm: vi.fn(),
}));

vi.mock("../../enterprise/gateway/invoke-handler.js", () => ({
  invokeEnterpriseGatewayHandler: mocks.invokeEnterpriseGatewayHandler,
}));

vi.mock("../../enterprise/isolation/enterprise-gateway-policy.js", () => ({
  prepareEnterpriseGatewayRequest: mocks.prepareEnterpriseGatewayRequest,
}));

vi.mock("../../gateway/server-methods/sessions-create.js", () => ({
  sessionCreateHandlers: {},
}));

vi.mock("../../gateway/server-methods/sessions-read.js", () => ({
  sessionReadHandlers: {},
}));

vi.mock("../prewarm/enterprise-prewarm.js", () => ({
  scheduleEnterpriseSessionPrewarm: mocks.scheduleEnterpriseSessionPrewarm,
}));

vi.mock("../../gateway/session-sharing.js", () => ({
  createSessionListEntryFilter: vi.fn(() => () => true),
}));

vi.mock("../../config/sessions/combined-store-gateway.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../config/sessions/combined-store-gateway.js")>()),
  loadLatestCombinedSessionStoreForGatewayCore: mocks.loadLatestCombinedSessionStoreForGatewayCore,
  loadCombinedSessionStoreForGatewayCore: mocks.loadCombinedSessionStoreForGatewayCore,
}));

vi.mock("../../gateway/session-utils.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../gateway/session-utils.js")>()),
  listSessionsFromStore: mocks.listSessionsFromStore,
}));

vi.mock("../../gateway/session-transcript-readers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../gateway/session-transcript-readers.js")>()),
  readSessionMessageCountAsync: mocks.readSessionMessageCountAsync,
}));

const { openEnterpriseUserConversation } = await import("./user-conversation-service.js");

const config: OpenClawConfig = {
  enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
  gateway: { auth: { mode: "accounts" } },
  agents: { entries: { main: {} } },
};

const account: EnterpriseAccount = {
  id: "account-1",
  profileId: "profile-1",
  username: "employee-1",
  displayName: "Employee 1",
  role: "employee",
  mustChangePassword: false,
  enabled: true,
  personalAgentEnabled: true,
  defaultAgentId: null,
  accessPresetKey: "standard-coding@1",
  policyRevision: 1,
  createdAt: 1,
  updatedAt: 1,
  lastLoginAt: 1,
};
const personalAgentId = resolveEnterprisePersonalAgentId(config, account);

describe("Enterprise User conversation opening", () => {
  beforeEach(() => {
    mocks.invokeEnterpriseGatewayHandler.mockReset();
    mocks.listSessionsFromStore.mockReset();
    mocks.loadLatestCombinedSessionStoreForGatewayCore.mockReset();
    mocks.loadCombinedSessionStoreForGatewayCore.mockReset();
    mocks.prepareEnterpriseGatewayRequest.mockReset();
    mocks.readSessionMessageCountAsync.mockReset();
    mocks.scheduleEnterpriseSessionPrewarm.mockReset();
    mocks.prepareEnterpriseGatewayRequest.mockImplementation(({ context }) => ({
      allowed: true,
      context,
    }));
    mocks.loadLatestCombinedSessionStoreForGatewayCore.mockReturnValue({
      candidateScanComplete: true,
      durableTargets: [],
      storePath: "/tmp/enterprise-user-sessions.sqlite",
      store: {},
    });
    mocks.listSessionsFromStore.mockReturnValue({
      sessions: [
        {
          key: `agent:${personalAgentId}:session-1`,
          sessionId: "session-1",
        },
      ],
    });
    // A regression to the old implementation would invoke the full sessions.list
    // Gateway handler here. Make that accidental round-trip fail loudly.
    mocks.invokeEnterpriseGatewayHandler.mockImplementation((_handler, method) => {
      throw new Error(`unexpected Gateway handler: ${String(method)}`);
    });
  });

  it("uses the canonical lightweight store query without a nested sessions.list RPC", async () => {
    const context = { getRuntimeConfig: () => config } as GatewayRequestContext;

    await expect(
      openEnterpriseUserConversation({
        config,
        context,
        account,
        sessionId: "enterprise-session-1",
        agentKey: "personal",
        mode: "resume-latest",
      }),
    ).resolves.toEqual({
      sessionKey: `agent:${personalAgentId}:session-1`,
      conversationId: "session-1",
      resumed: true,
    });

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(mocks.scheduleEnterpriseSessionPrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: account.id,
        agentId: personalAgentId,
        sessionId: "enterprise-session-1",
        sessionKey: `agent:${personalAgentId}:session-1`,
      }),
    );

    expect(mocks.prepareEnterpriseGatewayRequest).toHaveBeenCalledOnce();
    expect(mocks.loadLatestCombinedSessionStoreForGatewayCore).toHaveBeenCalledWith(
      config,
      expect.objectContaining({
        candidateLimit: 32,
        createdActorId: account.profileId,
        strictConfiguredAgentStoresOnly: true,
        projection: "list",
      }),
    );
    expect(mocks.loadCombinedSessionStoreForGatewayCore).not.toHaveBeenCalled();
    expect(mocks.listSessionsFromStore).toHaveBeenCalledWith(
      expect.objectContaining({
        lightweightListRows: true,
        opts: expect.objectContaining({
          limit: 1,
          sortBy: "updatedAt",
          includeGlobal: true,
          includeUnknown: false,
        }),
      }),
    );
    expect(mocks.invokeEnterpriseGatewayHandler).not.toHaveBeenCalled();
  });

  it("opens a dashboard conversation instead of the latest automation run", async () => {
    const dashboardKey = `agent:${personalAgentId}:dashboard:conversation-1`;
    const cronKey = `agent:${personalAgentId}:cron:job-1`;
    mocks.listSessionsFromStore.mockImplementation(({ entryFilter }) => {
      expect(entryFilter(cronKey, {})).toBe(false);
      expect(entryFilter(`${cronKey}:run:run-1`, {})).toBe(false);
      expect(entryFilter(dashboardKey, {})).toBe(true);
      return { sessions: [{ key: dashboardKey, sessionId: "conversation-1" }] };
    });
    const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
    await expect(
      openEnterpriseUserConversation({
        config,
        context,
        account,
        sessionId: "enterprise-session-1",
        agentKey: "personal",
        mode: "resume-latest",
      }),
    ).resolves.toEqual({
      sessionKey: dashboardKey,
      conversationId: "conversation-1",
      resumed: true,
    });
  });

  it("rechecks the full canonical merge when the bounded target window is truncated", async () => {
    mocks.loadLatestCombinedSessionStoreForGatewayCore.mockReturnValueOnce({
      candidateScanComplete: false,
      durableTargets: [],
      storePath: "/tmp/enterprise-user-sessions.sqlite",
      store: {},
    });
    mocks.loadCombinedSessionStoreForGatewayCore.mockReturnValue({
      durableTargets: [],
      storePath: "/tmp/enterprise-user-sessions.sqlite",
      store: {},
    });
    mocks.listSessionsFromStore.mockReturnValueOnce({ sessions: [] }).mockReturnValueOnce({
      sessions: [
        {
          key: `agent:${personalAgentId}:session-1`,
          sessionId: "session-1",
        },
      ],
    });

    const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
    await expect(
      openEnterpriseUserConversation({
        config,
        context,
        account,
        sessionId: "enterprise-session-1",
        agentKey: "personal",
        mode: "resume-latest",
      }),
    ).resolves.toMatchObject({
      sessionKey: `agent:${personalAgentId}:session-1`,
      resumed: true,
    });

    expect(mocks.loadCombinedSessionStoreForGatewayCore).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "resume-latest without a conversation id",
      mode: "resume-latest" as const,
      latest: { key: `agent:${personalAgentId}:resume` },
      messageCount: undefined,
      created: undefined,
      expected: {
        sessionKey: `agent:${personalAgentId}:resume`,
        conversationId: `agent:${personalAgentId}:resume`,
        resumed: true,
      },
    },
    {
      name: "reuse-empty",
      mode: "new" as const,
      latest: {
        key: `agent:${personalAgentId}:empty`,
        sessionId: "conversation-empty",
      },
      messageCount: 0,
      created: undefined,
      expected: {
        sessionKey: `agent:${personalAgentId}:empty`,
        conversationId: "conversation-empty",
        resumed: true,
      },
    },
    {
      name: "create",
      mode: "new" as const,
      latest: {
        key: `agent:${personalAgentId}:existing`,
        sessionId: "conversation-existing",
      },
      messageCount: 1,
      created: {
        key: `agent:${personalAgentId}:created`,
        sessionId: "conversation-created",
      },
      expected: {
        sessionKey: `agent:${personalAgentId}:created`,
        conversationId: "conversation-created",
        resumed: false,
      },
    },
  ])("passes the Enterprise auth session to prewarm for $name", async (scenario) => {
    mocks.listSessionsFromStore.mockReturnValue({ sessions: [scenario.latest] });
    if (scenario.messageCount !== undefined) {
      mocks.readSessionMessageCountAsync.mockResolvedValue(scenario.messageCount);
    }
    if (scenario.created) {
      mocks.invokeEnterpriseGatewayHandler.mockResolvedValue(scenario.created);
    }

    const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
    await expect(
      openEnterpriseUserConversation({
        config,
        context,
        account,
        sessionId: "enterprise-auth-session",
        agentKey: "personal",
        mode: scenario.mode,
      }),
    ).resolves.toEqual(scenario.expected);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(mocks.scheduleEnterpriseSessionPrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: account.id,
        sessionId: "enterprise-auth-session",
        agentId: personalAgentId,
        sessionKey: scenario.expected.sessionKey,
      }),
    );
  });
});
