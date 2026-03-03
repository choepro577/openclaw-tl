import { describe, expect, it, vi } from "vitest";
import type { GatewayRequestContext } from "./types.js";
import { GATEWAY_CLIENT_CAPS, GATEWAY_CLIENT_IDS } from "../protocol/client-info.js";
import { agentHandlers } from "./agent.js";

const mocks = vi.hoisted(() => ({
  loadSessionEntry: vi.fn(),
  updateSessionStore: vi.fn(),
  agentCommand: vi.fn(),
  registerAgentRunContext: vi.fn(),
  loadConfigReturn: {} as Record<string, unknown>,
}));

vi.mock("../session-utils.js", () => ({
  loadSessionEntry: mocks.loadSessionEntry,
}));

vi.mock("../../config/sessions.js", async () => {
  const actual = await vi.importActual<typeof import("../../config/sessions.js")>(
    "../../config/sessions.js",
  );
  return {
    ...actual,
    updateSessionStore: mocks.updateSessionStore,
    resolveAgentIdFromSessionKey: () => "main",
    resolveExplicitAgentSessionKey: () => undefined,
    resolveAgentMainSessionKey: () => "agent:main:main",
  };
});

vi.mock("../../commands/agent.js", () => ({
  agentCommand: mocks.agentCommand,
}));

vi.mock("../../config/config.js", async () => {
  const actual =
    await vi.importActual<typeof import("../../config/config.js")>("../../config/config.js");
  return {
    ...actual,
    loadConfig: () => mocks.loadConfigReturn,
  };
});

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: () => ["main"],
}));

vi.mock("../../infra/agent-events.js", () => ({
  registerAgentRunContext: mocks.registerAgentRunContext,
  onAgentEvent: vi.fn(),
}));

vi.mock("../../sessions/send-policy.js", () => ({
  resolveSendPolicy: () => "allow",
}));

vi.mock("../../utils/delivery-context.js", async () => {
  const actual = await vi.importActual<typeof import("../../utils/delivery-context.js")>(
    "../../utils/delivery-context.js",
  );
  return {
    ...actual,
    normalizeSessionDeliveryFields: () => ({}),
  };
});

const makeContext = (): GatewayRequestContext =>
  ({
    dedupe: new Map(),
    addChatRun: vi.fn(),
    logGateway: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }) as unknown as GatewayRequestContext;

function seedAgentRequestMocks() {
  mocks.loadSessionEntry.mockReturnValue({
    cfg: {},
    storePath: "/tmp/sessions.json",
    entry: {
      sessionId: "existing-session-id",
      updatedAt: Date.now(),
    },
    canonicalKey: "agent:main:main",
  });
  mocks.updateSessionStore.mockResolvedValue(undefined);
  mocks.agentCommand.mockResolvedValue({
    payloads: [{ text: "ok" }],
    meta: { durationMs: 100 },
  });
}

describe("gateway agent handler", () => {
  it("preserves cliSessionIds from existing session entry", async () => {
    const existingCliSessionIds = { "claude-cli": "abc-123-def" };
    const existingClaudeCliSessionId = "abc-123-def";

    mocks.loadSessionEntry.mockReturnValue({
      cfg: {},
      storePath: "/tmp/sessions.json",
      entry: {
        sessionId: "existing-session-id",
        updatedAt: Date.now(),
        cliSessionIds: existingCliSessionIds,
        claudeCliSessionId: existingClaudeCliSessionId,
      },
      canonicalKey: "agent:main:main",
    });

    let capturedEntry: Record<string, unknown> | undefined;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {};
      await updater(store);
      capturedEntry = store["agent:main:main"] as Record<string, unknown>;
    });

    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    const respond = vi.fn();
    await agentHandlers.agent({
      params: {
        message: "test",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-idem",
      },
      respond,
      context: makeContext(),
      req: { type: "req", id: "1", method: "agent" },
      client: null,
      isWebchatConnect: () => false,
    });

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.cliSessionIds).toEqual(existingCliSessionIds);
    expect(capturedEntry?.claudeCliSessionId).toBe(existingClaudeCliSessionId);
  });

  it("injects a timestamp into the message passed to agentCommand", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-29T01:30:00.000Z")); // Wed Jan 28, 8:30 PM EST
    mocks.agentCommand.mockReset();

    mocks.loadConfigReturn = {
      agents: {
        defaults: {
          userTimezone: "America/New_York",
        },
      },
    };

    mocks.loadSessionEntry.mockReturnValue({
      cfg: mocks.loadConfigReturn,
      storePath: "/tmp/sessions.json",
      entry: {
        sessionId: "existing-session-id",
        updatedAt: Date.now(),
      },
      canonicalKey: "agent:main:main",
    });
    mocks.updateSessionStore.mockResolvedValue(undefined);
    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    const respond = vi.fn();
    await agentHandlers.agent({
      params: {
        message: "Is it the weekend?",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-timestamp-inject",
      },
      respond,
      context: makeContext(),
      req: { type: "req", id: "ts-1", method: "agent" },
      client: null,
      isWebchatConnect: () => false,
    });

    // Wait for the async agentCommand call
    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());

    const callArgs = mocks.agentCommand.mock.calls[0][0];
    expect(callArgs.message).toBe("[Wed 2026-01-28 20:30 EST] Is it the weekend?");

    mocks.loadConfigReturn = {};
    vi.useRealTimers();
  });

  it("handles missing cliSessionIds gracefully", async () => {
    mocks.loadSessionEntry.mockReturnValue({
      cfg: {},
      storePath: "/tmp/sessions.json",
      entry: {
        sessionId: "existing-session-id",
        updatedAt: Date.now(),
        // No cliSessionIds or claudeCliSessionId
      },
      canonicalKey: "agent:main:main",
    });

    let capturedEntry: Record<string, unknown> | undefined;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {};
      await updater(store);
      capturedEntry = store["agent:main:main"] as Record<string, unknown>;
    });

    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    const respond = vi.fn();
    await agentHandlers.agent({
      params: {
        message: "test",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-idem-2",
      },
      respond,
      context: makeContext(),
      req: { type: "req", id: "2", method: "agent" },
      client: null,
      isWebchatConnect: () => false,
    });

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    // Should be undefined, not cause an error
    expect(capturedEntry?.cliSessionIds).toBeUndefined();
    expect(capturedEntry?.claudeCliSessionId).toBeUndefined();
  });

  it("preserves project metadata for eagerly created sessions", async () => {
    mocks.loadSessionEntry.mockReturnValue({
      cfg: {},
      storePath: "/tmp/sessions.json",
      entry: {
        sessionId: "existing-session-id",
        updatedAt: Date.now(),
        projectId: "project-test",
        name: "Project Session",
        sessionFile: "/tmp/existing-session-id.jsonl",
      },
      canonicalKey: "agent:main:openai-user:tester:project-session",
    });

    let capturedEntry: Record<string, unknown> | undefined;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {};
      await updater(store);
      capturedEntry = store["agent:main:openai-user:tester:project-session"] as
        | Record<string, unknown>
        | undefined;
    });

    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    const respond = vi.fn();
    await agentHandlers.agent({
      params: {
        message: "hi",
        agentId: "main",
        sessionKey: "agent:main:openai-user:tester:project-session",
        idempotencyKey: "test-project-session-preserve",
      },
      respond,
      context: makeContext(),
      req: { type: "req", id: "preserve-1", method: "agent" },
      client: null,
      isWebchatConnect: () => false,
    });

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.projectId).toBe("project-test");
    expect(capturedEntry?.name).toBe("Project Session");
    expect(capturedEntry?.sessionFile).toBe("/tmp/existing-session-id.jsonl");
  });

  it("drops non-image attachments when file attachment cap is missing", async () => {
    seedAgentRequestMocks();
    mocks.agentCommand.mockClear();

    await agentHandlers.agent({
      params: {
        message: "read this",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-files-cap-off",
        attachments: [
          {
            type: "file",
            mimeType: "text/plain",
            fileName: "note.txt",
            content: Buffer.from("hello from file").toString("base64"),
          },
        ],
      },
      respond: vi.fn(),
      context: makeContext(),
      req: { type: "req", id: "3", method: "agent" },
      client: {
        connect: {
          client: {
            id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
          },
        },
      } as unknown as Parameters<typeof agentHandlers.agent>[0]["client"],
      isWebchatConnect: () => true,
    });

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    const callArgs = mocks.agentCommand.mock.calls[0]?.[0];
    expect(callArgs.message).toContain("read this");
    expect(callArgs.message).not.toContain("<file ");
  });

  it("appends file block for webchat-ui when file attachment cap is enabled", async () => {
    seedAgentRequestMocks();
    mocks.agentCommand.mockClear();

    await agentHandlers.agent({
      params: {
        message: "read this",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-files-cap-on",
        attachments: [
          {
            type: "file",
            mimeType: "text/plain",
            fileName: "note.txt",
            content: Buffer.from("hello from file").toString("base64"),
          },
        ],
      },
      respond: vi.fn(),
      context: makeContext(),
      req: { type: "req", id: "4", method: "agent" },
      client: {
        connect: {
          client: {
            id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
          },
          caps: [GATEWAY_CLIENT_CAPS.FILE_ATTACHMENTS_V1],
        },
      } as unknown as Parameters<typeof agentHandlers.agent>[0]["client"],
      isWebchatConnect: () => true,
    });

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    const callArgs = mocks.agentCommand.mock.calls[0]?.[0];
    expect(callArgs.message).toContain("read this");
    expect(callArgs.message).toContain('<file name="note.txt" mime="text/plain">');
    expect(callArgs.message).toContain("hello from file");
  });
});
