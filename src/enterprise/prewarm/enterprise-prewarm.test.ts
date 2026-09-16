import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";

const mocks = vi.hoisted(() => ({
  getRuntimeConfig: vi.fn(),
  registerRuntimeConfigWriteListener: vi.fn(),
  getActivePluginRegistryVersion: vi.fn(),
  getSkillsSnapshotVersion: vi.fn(),
  registerSkillsChangeListener: vi.fn(),
  resolveAgentWorkspaceDir: vi.fn(),
  getEnterpriseAccountById: vi.fn(),
  getActiveEnterpriseSession: vi.fn(),
  registerEnterpriseSessionRevocationListener: vi.fn(),
  prepareEnterpriseGatewayRequest: vi.fn(),
  resolveSessionSharingRole: vi.fn(),
  resolveSessionSharingTarget: vi.fn(),
  resolveEnterprisePersonalAgentId: vi.fn(),
  resolveEnterpriseWorkspacePath: vi.fn(),
  createEnterpriseUserGatewayClient: vi.fn(),
  prewarmSandboxForSession: vi.fn(async () => true),
  emitDiagnosticsTimelineEvent: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  resolveAgentWorkspaceDir: mocks.resolveAgentWorkspaceDir,
}));
vi.mock("../../agents/sandbox.js", () => ({
  prewarmSandboxForSession: mocks.prewarmSandboxForSession,
}));
vi.mock("../../config/config.js", () => ({ getRuntimeConfig: mocks.getRuntimeConfig }));
vi.mock("../../config/runtime-snapshot.js", () => ({
  registerRuntimeConfigWriteListener: mocks.registerRuntimeConfigWriteListener,
}));
vi.mock("../../infra/diagnostics-timeline.js", async () => {
  const actual = await vi.importActual<typeof import("../../infra/diagnostics-timeline.js")>(
    "../../infra/diagnostics-timeline.js",
  );
  return {
    ...actual,
    emitDiagnosticsTimelineEvent: mocks.emitDiagnosticsTimelineEvent,
  };
});
vi.mock("../../logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ warn: vi.fn() }),
}));
vi.mock("../../plugins/runtime.js", () => ({
  getActivePluginRegistryVersion: mocks.getActivePluginRegistryVersion,
}));
vi.mock("../../routing/session-key.js", () => ({
  normalizeAgentId: (value: string) => value,
}));
vi.mock("../../skills/runtime/refresh-state.js", () => ({
  getSkillsSnapshotVersion: mocks.getSkillsSnapshotVersion,
  registerSkillsChangeListener: mocks.registerSkillsChangeListener,
}));
vi.mock("../../gateway/session-sharing.js", () => ({
  resolveSessionSharingRole: mocks.resolveSessionSharingRole,
  resolveSessionSharingTarget: mocks.resolveSessionSharingTarget,
}));
vi.mock("../accounts/account-store.js", () => ({
  getEnterpriseAccountById: mocks.getEnterpriseAccountById,
}));
vi.mock("../auth/session-store.js", () => ({
  getActiveEnterpriseSession: mocks.getActiveEnterpriseSession,
  registerEnterpriseSessionRevocationListener: mocks.registerEnterpriseSessionRevocationListener,
}));
vi.mock("../isolation/enterprise-gateway-policy.js", () => ({
  prepareEnterpriseGatewayRequest: mocks.prepareEnterpriseGatewayRequest,
}));
vi.mock("../personal-agent/personal-agent-config.js", () => ({
  resolveEnterprisePersonalAgentId: mocks.resolveEnterprisePersonalAgentId,
}));
vi.mock("../personal-agent/personal-workspace.js", () => ({
  resolveEnterpriseWorkspacePath: mocks.resolveEnterpriseWorkspacePath,
}));
vi.mock("../user/user-gateway-client.js", () => ({
  createEnterpriseUserGatewayClient: mocks.createEnterpriseUserGatewayClient,
}));

import {
  invalidateAllEnterprisePrewarms,
  invalidateEnterprisePrewarmForAccount,
  scheduleEnterpriseLoginPrewarm,
  scheduleEnterpriseSessionPrewarm,
} from "./enterprise-prewarm.js";

const config = {
  enterprise: { enabled: true },
  gateway: { auth: { mode: "accounts" } },
} as never;

function account(id: string) {
  return {
    id,
    profileId: `profile-${id}`,
    username: id,
    displayName: id,
    role: "employee",
    mustChangePassword: false,
    enabled: true,
    personalAgentEnabled: true,
    defaultAgentId: null,
    accessPresetKey: "none",
    policyRevision: 1,
    createdAt: 1,
    updatedAt: 1,
    lastLoginAt: null,
  };
}

function context(activeRuns: Map<string, unknown> = new Map()): GatewayRequestContext {
  return {
    getRuntimeConfig: () => config,
    readChatMetadata: vi.fn(async () => ({ swarmEnabled: false })),
    readChatStartupProjection: vi.fn(async () => undefined),
    chatAbortControllers: activeRuns,
  } as unknown as GatewayRequestContext;
}

function prepareMocks(accounts: Record<string, ReturnType<typeof account>>) {
  mocks.prewarmSandboxForSession.mockReset();
  mocks.prewarmSandboxForSession.mockResolvedValue(true);
  mocks.getRuntimeConfig.mockReturnValue(config);
  mocks.getActivePluginRegistryVersion.mockReturnValue(1);
  mocks.getSkillsSnapshotVersion.mockReturnValue(1);
  mocks.resolveAgentWorkspaceDir.mockReturnValue("/state/workspace");
  mocks.resolveEnterpriseWorkspacePath.mockImplementation(
    (profileId: string, agentId: string) => `/state/${profileId}/${agentId}`,
  );
  mocks.resolveEnterprisePersonalAgentId.mockImplementation(
    (_config: unknown, current: { id: string }) => `personal-${current.id}`,
  );
  mocks.getEnterpriseAccountById.mockImplementation((id: string) => accounts[id]);
  mocks.getActiveEnterpriseSession.mockImplementation((sessionId: string) => ({
    id: sessionId,
    accountId: sessionId.startsWith("session-") ? sessionId.slice("session-".length) : "a",
    audience: "user",
  }));
  mocks.createEnterpriseUserGatewayClient.mockImplementation((current: unknown) => current);
  mocks.resolveSessionSharingTarget.mockImplementation(
    ({ sessionKey }: { sessionKey: string }) => ({
      agentId: sessionKey.split(":")[1] ?? "personal-a",
      canonicalKey: sessionKey,
      entry: {},
      storeKey: sessionKey,
      storeKeys: [sessionKey],
      storePath: "/state/sessions.sqlite",
    }),
  );
  mocks.resolveSessionSharingRole.mockReturnValue("owner");
  mocks.prepareEnterpriseGatewayRequest.mockImplementation(
    ({ context: current }: { context: unknown }) => ({
      allowed: true,
      context: current,
    }),
  );
}

function flushImmediate(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function diagnosticsEvents(): Array<Record<string, unknown>> {
  return mocks.emitDiagnosticsTimelineEvent.mock.calls.map(
    ([event]) => event as Record<string, unknown>,
  );
}

afterEach(() => {
  invalidateAllEnterprisePrewarms();
  vi.clearAllMocks();
});

describe("Enterprise active-user prewarm", () => {
  it("coalesces duplicate login work and never creates a session job", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    const currentContext = context();
    scheduleEnterpriseLoginPrewarm({
      accountId: current.id,
      sessionId: "session-a",
      getContext: () => currentContext,
    });
    scheduleEnterpriseLoginPrewarm({
      accountId: current.id,
      sessionId: "session-a",
      getContext: () => currentContext,
    });

    await flushImmediate();
    expect(currentContext.readChatMetadata).not.toHaveBeenCalled();
    expect(mocks.prepareEnterpriseGatewayRequest).toHaveBeenCalledOnce();
    expect(mocks.prewarmSandboxForSession).not.toHaveBeenCalled();
  });

  it("emits ready after Enterprise admission and runtime without operator metadata or auth session ids", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    const currentContext = context();
    // Synthetic Enterprise agents have no owner in the operator metadata store.
    vi.mocked(currentContext.readChatMetadata).mockRejectedValue(
      new Error("missing operator owner"),
    );
    vi.mocked(currentContext.readChatStartupProjection).mockRejectedValue(
      new Error("missing operator owner"),
    );
    scheduleEnterpriseSessionPrewarm({
      accountId: current.id,
      // This value must remain absent from payload-free diagnostics.
      sessionId: "auth-session-secret-a",
      sessionKey: "agent:personal-a:main",
      agentId: "personal-a",
      getContext: () => currentContext,
    });

    await flushImmediate();

    const events = diagnosticsEvents();
    const ready = events.find((event) => event.name === "enterprise.prewarm.ready");
    expect(ready).toMatchObject({
      type: "mark",
      name: "enterprise.prewarm.ready",
      monotonicMs: expect.any(Number),
      durationMs: expect.any(Number),
      attributes: {
        kind: "session-runtime",
        outcome: "ready",
        sessionKey: "agent:personal-a:main",
        agentId: "personal-a",
      },
    });
    expect(currentContext.readChatMetadata).not.toHaveBeenCalled();
    expect(currentContext.readChatStartupProjection).not.toHaveBeenCalled();
    expect(mocks.prepareEnterpriseGatewayRequest).toHaveBeenCalledOnce();
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledOnce();
    expect(JSON.stringify(events)).not.toContain("auth-session-secret-a");
  });

  it("does not emit ready when runtime preparation reports failure", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    mocks.prewarmSandboxForSession.mockResolvedValue(false);
    scheduleEnterpriseSessionPrewarm({
      accountId: current.id,
      sessionId: "session-a",
      sessionKey: "agent:personal-a:main",
      agentId: "personal-a",
      getContext: context,
    });

    await flushImmediate();

    const events = diagnosticsEvents();
    expect(events.some((event) => event.name === "enterprise.prewarm.ready")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "mark",
        name: "enterprise.prewarm.failure",
        monotonicMs: expect.any(Number),
        attributes: expect.objectContaining({
          outcome: "failure",
          reasonCode: "runtime_failed",
        }),
      }),
    );
  });

  it("limits active work to two and puts an executing user turn first", async () => {
    const accounts = {
      a: account("a"),
      b: account("b"),
      c: account("c"),
      d: account("d"),
    };
    prepareMocks(accounts);
    const deferred = new Map<string, { resolve: () => void }>();
    mocks.prewarmSandboxForSession.mockImplementation(async (input: { sessionKey: string }) => {
      await new Promise<void>((resolve) => {
        deferred.set(input.sessionKey, { resolve });
      });
      return true;
    });

    for (const id of ["a", "b"]) {
      scheduleEnterpriseSessionPrewarm({
        accountId: id,
        sessionId: `session-${id}`,
        sessionKey: `agent:personal-${id}:main`,
        agentId: `personal-${id}`,
        getContext: context,
      });
    }
    scheduleEnterpriseLoginPrewarm({
      accountId: "c",
      sessionId: "session-c",
      getContext: context,
    });
    const executingUserContext = context(
      new Map([
        [
          "run-d",
          {
            sessionId: "session-d",
            sessionKey: "agent:personal-d:main",
            agentId: "personal-d",
            kind: "chat-send",
            executionStarted: true,
          },
        ],
      ]),
    );
    scheduleEnterpriseSessionPrewarm({
      accountId: "d",
      sessionId: "session-d",
      sessionKey: "agent:personal-d:main",
      agentId: "personal-d",
      getContext: () => executingUserContext,
    });

    await flushImmediate();
    expect(deferred.size).toBe(2);
    expect(deferred.has("agent:personal-d:main")).toBe(false);

    deferred.get("agent:personal-a:main")?.resolve();
    await flushImmediate();
    // A foreground run keeps the queue paused even after a prewarm slot frees.
    expect(deferred.has("agent:personal-d:main")).toBe(false);

    executingUserContext.chatAbortControllers.clear();
    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });
    expect(deferred.has("agent:personal-d:main")).toBe(true);
    expect(executingUserContext.readChatMetadata).not.toHaveBeenCalled();
    expect(executingUserContext.readChatStartupProjection).not.toHaveBeenCalled();

    for (const item of deferred.values()) {
      item.resolve();
    }
    await flushImmediate();
  });

  it("does not reuse a session preparation after targeted invalidation", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    const preparations: Array<() => void> = [];
    mocks.prewarmSandboxForSession.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        preparations.push(resolve);
      });
      return true;
    });
    const currentContext = context();
    const schedule = () =>
      scheduleEnterpriseSessionPrewarm({
        accountId: current.id,
        sessionId: "session-a",
        sessionKey: "agent:personal-a:main",
        agentId: "personal-a",
        getContext: () => currentContext,
      });

    schedule();
    await flushImmediate();
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledOnce();
    invalidateEnterprisePrewarmForAccount({
      accountId: current.id,
      sessionId: "session-a",
      sessionKey: "agent:personal-a:main",
      reason: "logout",
    });
    preparations.shift()?.();
    await flushImmediate();
    schedule();
    await flushImmediate();
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledTimes(2);
    preparations.forEach((resolve) => resolve());
    await flushImmediate();
  });

  it("does not let an old-session unsubscribe cancel the newer selected session", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    mocks.getActiveEnterpriseSession.mockImplementation((sessionId: string) => ({
      id: sessionId,
      accountId: "a",
      audience: "user",
    }));
    const preparations = new Map<string, () => void>();
    mocks.prewarmSandboxForSession.mockImplementation(async (input: { sessionKey: string }) => {
      await new Promise<void>((resolve) => {
        preparations.set(input.sessionKey, resolve);
      });
      return true;
    });
    const schedule = (sessionId: string, sessionKey: string) =>
      scheduleEnterpriseSessionPrewarm({
        accountId: current.id,
        sessionId,
        sessionKey,
        agentId: "personal-a",
        getContext: context,
      });

    schedule("session-old", "agent:personal-a:old");
    await flushImmediate();
    schedule("session-new", "agent:personal-a:new");
    invalidateEnterprisePrewarmForAccount({
      accountId: current.id,
      sessionId: "session-old",
      sessionKey: "agent:personal-a:old",
      reason: "old tab unsubscribed",
    });
    preparations.get("agent:personal-a:old")?.();
    await flushImmediate();
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledTimes(2);
    expect(preparations.has("agent:personal-a:new")).toBe(true);
    preparations.get("agent:personal-a:new")?.();
    await flushImmediate();
  });

  it("invalidates a running prewarm when the runtime config snapshot changes", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    let resolvePreparation!: () => void;
    mocks.prewarmSandboxForSession.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        resolvePreparation = resolve;
      });
      return true;
    });
    scheduleEnterpriseSessionPrewarm({
      accountId: current.id,
      sessionId: "session-a",
      sessionKey: "agent:personal-a:main",
      agentId: "personal-a",
      getContext: context,
    });
    await flushImmediate();
    mocks.getRuntimeConfig.mockReturnValue({ ...config });
    resolvePreparation();
    await flushImmediate();
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledOnce();
  });

  it("invalidates a running prewarm when session ownership changes", async () => {
    const current = account("a");
    prepareMocks({ a: current });
    let resolvePreparation!: () => void;
    let assertSandboxCurrent!: () => void;
    mocks.prewarmSandboxForSession.mockImplementation(
      async (input: { assertCurrent?: () => void }) => {
        assertSandboxCurrent = input.assertCurrent ?? (() => undefined);
        await new Promise<void>((resolve) => {
          resolvePreparation = resolve;
        });
        return true;
      },
    );
    const currentContext = context();
    scheduleEnterpriseSessionPrewarm({
      accountId: current.id,
      sessionId: "session-a",
      sessionKey: "agent:personal-a:main",
      agentId: "personal-a",
      getContext: () => currentContext,
    });
    await flushImmediate();

    // The canonical runtime owner receives the same admission guard. Once
    // ownership is revoked, that guard must reject before another runtime
    // side effect can start or publish a prepared result.
    mocks.resolveSessionSharingRole.mockReturnValue("viewer");
    expect(assertSandboxCurrent).toBeTypeOf("function");
    expect(() => assertSandboxCurrent()).toThrow(/enterprise prewarm was superseded/);
    resolvePreparation();
    await flushImmediate();

    // The in-flight task is discarded at the post-await boundary. No retry or
    // second preparation is started for the revoked session.
    expect(mocks.prewarmSandboxForSession).toHaveBeenCalledOnce();
    expect(currentContext.readChatMetadata).not.toHaveBeenCalled();
    expect(currentContext.readChatStartupProjection).not.toHaveBeenCalled();
    const events = diagnosticsEvents();
    expect(events.some((event) => event.name === "enterprise.prewarm.ready")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "mark",
        name: "enterprise.prewarm.failure",
        attributes: expect.objectContaining({ outcome: "aborted" }),
      }),
    );
    expect(JSON.stringify(events)).not.toContain("session-a");
  });
});
