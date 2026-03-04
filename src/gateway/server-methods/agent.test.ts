import { beforeEach, describe, expect, it, vi } from "vitest";
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

const attachmentPathMocks = vi.hoisted(() => ({
  normalizeAttachmentPathsInput: vi.fn(
    (params: { attachment_paths?: unknown; attachmentPaths?: unknown }) => {
      const values = [
        ...(Array.isArray(params.attachment_paths) ? params.attachment_paths : []),
        ...(Array.isArray(params.attachmentPaths) ? params.attachmentPaths : []),
      ];
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const value of values) {
        if (typeof value !== "string") {
          continue;
        }
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) {
          continue;
        }
        seen.add(trimmed);
        normalized.push(trimmed);
      }
      return normalized;
    },
  ),
  parseMessageWithAttachmentPaths: vi.fn(),
}));

vi.mock("../session-utils.js", async () => {
  const actual = await vi.importActual<typeof import("../session-utils.js")>("../session-utils.js");
  return {
    ...actual,
    loadSessionEntry: mocks.loadSessionEntry,
  };
});

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

vi.mock("../../agents/agent-scope.js", async () => {
  const actual = await vi.importActual<typeof import("../../agents/agent-scope.js")>(
    "../../agents/agent-scope.js",
  );
  return {
    ...actual,
    listAgentIds: () => ["main"],
    resolveAgentDir: () => "/tmp/mock-agent",
  };
});

vi.mock("../../infra/agent-events.js", () => ({
  registerAgentRunContext: mocks.registerAgentRunContext,
  onAgentEvent: vi.fn(),
}));

vi.mock("../../sessions/send-policy.js", () => ({
  resolveSendPolicy: () => "allow",
}));

vi.mock("../chat-attachment-paths.js", async () => {
  const actual = await vi.importActual<typeof import("../chat-attachment-paths.js")>(
    "../chat-attachment-paths.js",
  );
  return {
    ...actual,
    normalizeAttachmentPathsInput: attachmentPathMocks.normalizeAttachmentPathsInput,
    parseMessageWithAttachmentPaths: attachmentPathMocks.parseMessageWithAttachmentPaths,
  };
});

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
  beforeEach(() => {
    attachmentPathMocks.normalizeAttachmentPathsInput.mockClear();
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockReset();
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockImplementation(
      async (message: string, attachmentPaths: string[] | undefined) => ({
        message: message.trim(),
        attachmentPaths: attachmentPaths ?? [],
        mediaNote: undefined,
      }),
    );
    mocks.loadConfigReturn = {};
  });

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

  it("prepends media note for attachment_paths when cap is enabled", async () => {
    seedAgentRequestMocks();
    mocks.agentCommand.mockClear();
    const attachmentPath =
      "/root/.openclaw/media/tl00275/0-1590653959375414280410-1590810484480-159081048448019875603---af845831-346f-4138-b125-0a4c5c9e76a6.jpg";
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockResolvedValue({
      message: "khong thay that a?",
      attachmentPaths: [attachmentPath],
      mediaNote: `[media attached: ${attachmentPath}]`,
    });

    await agentHandlers.agent({
      params: {
        message: "khong thay that a?",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-media-note",
        attachment_paths: [attachmentPath],
      },
      respond: vi.fn(),
      context: makeContext(),
      req: { type: "req", id: "5", method: "agent" },
      client: {
        connect: {
          client: {
            id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
          },
          caps: [GATEWAY_CLIENT_CAPS.ATTACHMENT_PATHS_V1],
        },
      } as unknown as Parameters<typeof agentHandlers.agent>[0]["client"],
      isWebchatConnect: () => true,
    });

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    const callArgs = mocks.agentCommand.mock.calls[0]?.[0];
    expect(callArgs.message).toContain("[media attached:");
    expect(callArgs.message).toContain("khong thay that a?");
    expect(attachmentPathMocks.parseMessageWithAttachmentPaths).toHaveBeenCalledWith(
      "khong thay that a?",
      [attachmentPath],
      expect.objectContaining({
        sessionKey: "agent:main:main",
        surface: expect.any(String),
        chatType: "direct",
      }),
    );
  });

  it("drops attachment_paths when cap is missing", async () => {
    seedAgentRequestMocks();
    mocks.agentCommand.mockClear();
    const attachmentPath = "/root/.openclaw/media/tl00275/example.jpg";

    await agentHandlers.agent({
      params: {
        message: "test without cap",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-no-cap",
        attachment_paths: [attachmentPath],
      },
      respond: vi.fn(),
      context: makeContext(),
      req: { type: "req", id: "6", method: "agent" },
      client: {
        connect: {
          client: {
            id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
          },
          caps: [],
        },
      } as unknown as Parameters<typeof agentHandlers.agent>[0]["client"],
      isWebchatConnect: () => true,
    });

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    expect(attachmentPathMocks.parseMessageWithAttachmentPaths).not.toHaveBeenCalled();
  });

  it("returns INVALID_REQUEST when attachment_paths parser throws", async () => {
    seedAgentRequestMocks();
    mocks.agentCommand.mockClear();
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockRejectedValue(
      new Error("attachment path not found"),
    );
    const respond = vi.fn();

    await agentHandlers.agent({
      params: {
        message: "bad path",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-invalid",
        attachment_paths: ["/root/.openclaw/media/tl00275/missing.jpg"],
      },
      respond,
      context: makeContext(),
      req: { type: "req", id: "7", method: "agent" },
      client: {
        connect: {
          client: {
            id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
          },
          caps: [GATEWAY_CLIENT_CAPS.ATTACHMENT_PATHS_V1],
        },
      } as unknown as Parameters<typeof agentHandlers.agent>[0]["client"],
      isWebchatConnect: () => true,
    });

    expect(mocks.agentCommand).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalled();
    const first = respond.mock.calls[0];
    expect(first?.[0]).toBe(false);
    expect(String(first?.[2]?.message ?? "")).toContain("attachment path not found");
  });
});
