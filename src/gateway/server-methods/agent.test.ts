import { beforeEach, describe, expect, it, vi } from "vitest";
import { BARE_SESSION_RESET_PROMPT } from "../../auto-reply/reply/session-reset-prompt.js";
import { GATEWAY_CLIENT_CAPS, GATEWAY_CLIENT_IDS } from "../protocol/client-info.js";
import { agentHandlers } from "./agent.js";
import type { GatewayRequestContext } from "./types.js";

const mocks = vi.hoisted(() => ({
  loadSessionEntry: vi.fn(),
  updateSessionStore: vi.fn(),
  agentCommand: vi.fn(),
  registerAgentRunContext: vi.fn(),
  performGatewaySessionReset: vi.fn(),
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
    resolveAgentMainSessionKey: ({
      cfg,
      agentId,
    }: {
      cfg?: { session?: { mainKey?: string } };
      agentId: string;
    }) => `agent:${agentId}:${cfg?.session?.mainKey ?? "main"}`,
  };
});

vi.mock("../../commands/agent.js", () => ({
  agentCommand: mocks.agentCommand,
  agentCommandFromIngress: mocks.agentCommand,
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

vi.mock("../session-reset-service.js", () => ({
  performGatewaySessionReset: (...args: unknown[]) =>
    (mocks.performGatewaySessionReset as (...args: unknown[]) => unknown)(...args),
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

type AgentHandlerArgs = Parameters<typeof agentHandlers.agent>[0];
type AgentParams = AgentHandlerArgs["params"];

type AgentIdentityGetHandlerArgs = Parameters<(typeof agentHandlers)["agent.identity.get"]>[0];
type AgentIdentityGetParams = AgentIdentityGetHandlerArgs["params"];

function mockMainSessionEntry(entry: Record<string, unknown>, cfg: Record<string, unknown> = {}) {
  mocks.loadSessionEntry.mockReturnValue({
    cfg,
    storePath: "/tmp/sessions.json",
    entry: {
      sessionId: "existing-session-id",
      updatedAt: Date.now(),
      ...entry,
    },
    canonicalKey: "agent:main:main",
  });
}

function captureUpdatedMainEntry() {
  let capturedEntry: Record<string, unknown> | undefined;
  mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
    const store: Record<string, unknown> = {};
    await updater(store);
    capturedEntry = store["agent:main:main"] as Record<string, unknown>;
  });
  return () => capturedEntry;
}

function buildExistingMainStoreEntry(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "existing-session-id",
    updatedAt: Date.now(),
    ...overrides,
  };
}

async function runMainAgentAndCaptureEntry(idempotencyKey: string) {
  const getCapturedEntry = captureUpdatedMainEntry();
  mocks.agentCommand.mockResolvedValue({
    payloads: [{ text: "ok" }],
    meta: { durationMs: 100 },
  });
  await runMainAgent("test", idempotencyKey);
  expect(mocks.updateSessionStore).toHaveBeenCalled();
  return getCapturedEntry();
}

function setupNewYorkTimeConfig(isoDate: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoDate)); // Wed Jan 28, 8:30 PM EST
  mocks.agentCommand.mockClear();
  mocks.loadConfigReturn = {
    agents: {
      defaults: {
        userTimezone: "America/New_York",
      },
    },
  };
}

function resetTimeConfig() {
  mocks.loadConfigReturn = {};
  vi.useRealTimers();
}

async function expectResetCall(expectedMessage: string) {
  await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
  expect(mocks.performGatewaySessionReset).toHaveBeenCalledTimes(1);
  const call = readLastAgentCommandCall();
  expect(call?.message).toBe(expectedMessage);
  return call;
}

function primeMainAgentRun(params?: { sessionId?: string; cfg?: Record<string, unknown> }) {
  mockMainSessionEntry(
    { sessionId: params?.sessionId ?? "existing-session-id" },
    params?.cfg ?? {},
  );
  mocks.updateSessionStore.mockResolvedValue(undefined);
  mocks.agentCommand.mockResolvedValue({
    payloads: [{ text: "ok" }],
    meta: { durationMs: 100 },
  });
}

async function runMainAgent(message: string, idempotencyKey: string) {
  const respond = vi.fn();
  await invokeAgent(
    {
      message,
      agentId: "main",
      sessionKey: "agent:main:main",
      idempotencyKey,
    },
    { respond, reqId: idempotencyKey },
  );
  return respond;
}

function readLastAgentCommandCall():
  | {
      message?: string;
      sessionId?: string;
    }
  | undefined {
  return mocks.agentCommand.mock.calls.at(-1)?.[0] as
    | { message?: string; sessionId?: string }
    | undefined;
}

function mockSessionResetSuccess(params: {
  reason: "new" | "reset";
  key?: string;
  sessionId?: string;
}) {
  const key = params.key ?? "agent:main:main";
  const sessionId = params.sessionId ?? "reset-session-id";
  mocks.performGatewaySessionReset.mockImplementation(
    async (opts: { key: string; reason: string; commandSource: string }) => {
      expect(opts.key).toBe(key);
      expect(opts.reason).toBe(params.reason);
      expect(opts.commandSource).toBe("gateway:agent");
      return {
        ok: true,
        key,
        entry: { sessionId },
      };
    },
  );
}

async function invokeAgent(
  params: AgentParams,
  options?: {
    respond?: ReturnType<typeof vi.fn>;
    reqId?: string;
    context?: GatewayRequestContext;
    client?: AgentHandlerArgs["client"];
    isWebchatConnect?: AgentHandlerArgs["isWebchatConnect"];
  },
) {
  const respond = options?.respond ?? vi.fn();
  await agentHandlers.agent({
    params,
    respond: respond as never,
    context: options?.context ?? makeContext(),
    req: { type: "req", id: options?.reqId ?? "agent-test-req", method: "agent" },
    client: options?.client ?? null,
    isWebchatConnect: options?.isWebchatConnect ?? (() => false),
  });
  return respond;
}

async function invokeAgentIdentityGet(
  params: AgentIdentityGetParams,
  options?: {
    respond?: ReturnType<typeof vi.fn>;
    reqId?: string;
    context?: GatewayRequestContext;
  },
) {
  const respond = options?.respond ?? vi.fn();
  await agentHandlers["agent.identity.get"]({
    params,
    respond: respond as never,
    context: options?.context ?? makeContext(),
    req: {
      type: "req",
      id: options?.reqId ?? "agent-identity-test-req",
      method: "agent.identity.get",
    },
    client: null,
    isWebchatConnect: () => false,
  });
  return respond;
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

  it("preserves ACP metadata from the current stored session entry", async () => {
    const existingAcpMeta = {
      backend: "acpx",
      agent: "codex",
      runtimeSessionName: "runtime-1",
      mode: "persistent",
      state: "idle",
      lastActivityAt: Date.now(),
    };

    mockMainSessionEntry({
      acp: existingAcpMeta,
    });

    let capturedEntry: Record<string, unknown> | undefined;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {
        "agent:main:main": buildExistingMainStoreEntry({ acp: existingAcpMeta }),
      };
      const result = await updater(store);
      capturedEntry = store["agent:main:main"] as Record<string, unknown>;
      return result;
    });

    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    await runMainAgent("test", "test-idem-acp-meta");

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.acp).toEqual(existingAcpMeta);
  });

  it("forwards provider and model overrides for admin-scoped callers", async () => {
    primeMainAgentRun();

    await invokeAgent(
      {
        message: "test override",
        agentId: "main",
        sessionKey: "agent:main:main",
        provider: "anthropic",
        model: "claude-haiku-4-5",
        idempotencyKey: "test-idem-model-override",
      },
      {
        reqId: "test-idem-model-override",
        client: {
          connect: {
            scopes: ["operator.admin"],
          },
        } as AgentHandlerArgs["client"],
      },
    );

    const lastCall = mocks.agentCommand.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual(
      expect.objectContaining({
        provider: "anthropic",
        model: "claude-haiku-4-5",
      }),
    );
  });

  it("rejects provider and model overrides for write-scoped callers", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();
    const respond = vi.fn();

    await invokeAgent(
      {
        message: "test override",
        agentId: "main",
        sessionKey: "agent:main:main",
        provider: "anthropic",
        model: "claude-haiku-4-5",
        idempotencyKey: "test-idem-model-override-write",
      },
      {
        reqId: "test-idem-model-override-write",
        client: {
          connect: {
            scopes: ["operator.write"],
          },
        } as AgentHandlerArgs["client"],
        respond,
      },
    );

    expect(mocks.agentCommand).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message: "provider/model overrides are not authorized for this caller.",
      }),
    );
  });

  it("forwards provider and model overrides when internal override authorization is set", async () => {
    primeMainAgentRun();

    await invokeAgent(
      {
        message: "test override",
        agentId: "main",
        sessionKey: "agent:main:main",
        provider: "anthropic",
        model: "claude-haiku-4-5",
        idempotencyKey: "test-idem-model-override-internal",
      },
      {
        reqId: "test-idem-model-override-internal",
        client: {
          connect: {
            scopes: ["operator.write"],
          },
          internal: {
            allowModelOverride: true,
          },
        } as AgentHandlerArgs["client"],
      },
    );

    const lastCall = mocks.agentCommand.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual(
      expect.objectContaining({
        provider: "anthropic",
        model: "claude-haiku-4-5",
        senderIsOwner: false,
      }),
    );
  });

  it("preserves cliSessionIds from existing session entry", async () => {
    const existingCliSessionIds = { "claude-cli": "abc-123-def" };
    const existingClaudeCliSessionId = "abc-123-def";

    mockMainSessionEntry({
      cliSessionIds: existingCliSessionIds,
      claudeCliSessionId: existingClaudeCliSessionId,
    });

    const capturedEntry = await runMainAgentAndCaptureEntry("test-idem");
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.cliSessionIds).toEqual(existingCliSessionIds);
    expect(capturedEntry?.claudeCliSessionId).toBe(existingClaudeCliSessionId);
  });

  it("injects a timestamp into the message passed to agentCommand", async () => {
    setupNewYorkTimeConfig("2026-01-29T01:30:00.000Z");

    primeMainAgentRun({ cfg: mocks.loadConfigReturn });

    await invokeAgent(
      {
        message: "Is it the weekend?",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-timestamp-inject",
      },
      { reqId: "ts-1" },
    );

    // Wait for the async agentCommand call
    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());

    const callArgs = mocks.agentCommand.mock.calls[0][0];
    expect(callArgs.message).toBe("[Wed 2026-01-28 20:30 EST] Is it the weekend?");

    resetTimeConfig();
  });

  it.each([
    {
      name: "passes senderIsOwner=false for write-scoped gateway callers",
      scopes: ["operator.write"],
      idempotencyKey: "test-sender-owner-write",
      senderIsOwner: false,
    },
    {
      name: "passes senderIsOwner=true for admin-scoped gateway callers",
      scopes: ["operator.admin"],
      idempotencyKey: "test-sender-owner-admin",
      senderIsOwner: true,
    },
  ])("$name", async ({ scopes, idempotencyKey, senderIsOwner }) => {
    primeMainAgentRun();

    await invokeAgent(
      {
        message: "owner-tools check",
        sessionKey: "agent:main:main",
        idempotencyKey,
      },
      {
        client: {
          connect: {
            role: "operator",
            scopes,
            client: { id: "test-client", mode: "gateway" },
          },
        } as unknown as AgentHandlerArgs["client"],
      },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
    const callArgs = mocks.agentCommand.mock.calls.at(-1)?.[0] as
      | { senderIsOwner?: boolean }
      | undefined;
    expect(callArgs?.senderIsOwner).toBe(senderIsOwner);
  });

  it("respects explicit bestEffortDeliver=false for main session runs", async () => {
    mocks.agentCommand.mockClear();
    primeMainAgentRun();

    await invokeAgent(
      {
        message: "strict delivery",
        agentId: "main",
        sessionKey: "agent:main:main",
        deliver: true,
        replyChannel: "telegram",
        to: "123",
        bestEffortDeliver: false,
        idempotencyKey: "test-strict-delivery",
      },
      { reqId: "strict-1" },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
    const callArgs = mocks.agentCommand.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(callArgs.bestEffortDeliver).toBe(false);
  });

  it("rejects public spawned-run metadata fields", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();
    const respond = vi.fn();

    await invokeAgent(
      {
        message: "spawned run",
        sessionKey: "agent:main:main",
        spawnedBy: "agent:main:subagent:parent",
        workspaceDir: "/tmp/injected",
        idempotencyKey: "workspace-rejected",
      } as AgentParams,
      { reqId: "workspace-rejected-1", respond },
    );

    expect(mocks.agentCommand).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message: expect.stringContaining("invalid agent params"),
      }),
    );
  });

  it("only forwards workspaceDir for spawned sessions with stored workspace inheritance", async () => {
    primeMainAgentRun();
    mockMainSessionEntry({
      spawnedBy: "agent:main:subagent:parent",
      spawnedWorkspaceDir: "/tmp/inherited",
    });
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {
        "agent:main:main": buildExistingMainStoreEntry({
          spawnedBy: "agent:main:subagent:parent",
          spawnedWorkspaceDir: "/tmp/inherited",
        }),
      };
      return await updater(store);
    });
    mocks.agentCommand.mockClear();

    await invokeAgent(
      {
        message: "spawned run",
        sessionKey: "agent:main:main",
        idempotencyKey: "workspace-forwarded",
      },
      { reqId: "workspace-forwarded-1" },
    );
    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
    const spawnedCall = mocks.agentCommand.mock.calls.at(-1)?.[0] as { workspaceDir?: string };
    expect(spawnedCall.workspaceDir).toBe("/tmp/inherited");
  });

  it("keeps origin messageChannel as webchat while delivery channel uses last session channel", async () => {
    mockMainSessionEntry({
      sessionId: "existing-session-id",
      lastChannel: "telegram",
      lastTo: "12345",
    });
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {
        "agent:main:main": buildExistingMainStoreEntry({
          lastChannel: "telegram",
          lastTo: "12345",
        }),
      };
      return await updater(store);
    });
    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    await invokeAgent(
      {
        message: "webchat turn",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-webchat-origin-channel",
      },
      {
        reqId: "webchat-origin-1",
        client: {
          connect: {
            client: { id: "webchat-ui", mode: "webchat" },
          },
        } as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
    const callArgs = mocks.agentCommand.mock.calls.at(-1)?.[0] as {
      channel?: string;
      messageChannel?: string;
      runContext?: { messageChannel?: string };
    };
    expect(callArgs.channel).toBe("telegram");
    expect(callArgs.messageChannel).toBe("webchat");
    expect(callArgs.runContext?.messageChannel).toBe("webchat");
  });

  it("handles missing cliSessionIds gracefully", async () => {
    mockMainSessionEntry({});

    const capturedEntry = await runMainAgentAndCaptureEntry("test-idem-2");
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

    await invokeAgent(
      {
        message: "hi",
        agentId: "main",
        sessionKey: "agent:main:openai-user:tester:project-session",
        idempotencyKey: "test-project-session-preserve",
      },
      { reqId: "preserve-1" },
    );

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.projectId).toBe("project-test");
    expect(capturedEntry?.name).toBe("Project Session");
    expect(capturedEntry?.sessionFile).toBe("/tmp/existing-session-id.jsonl");
  });

  it("drops non-image attachments when file attachment cap is missing", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();

    await invokeAgent(
      {
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
      {
        reqId: "files-off-1",
        client: {
          connect: {
            client: {
              id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
            },
          },
        } as unknown as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    const callArgs = mocks.agentCommand.mock.calls[0]?.[0];
    expect(callArgs.message).toContain("read this");
    expect(callArgs.message).not.toContain("<file ");
  });

  it("appends file block for webchat-ui when file attachment cap is enabled", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();

    await invokeAgent(
      {
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
      {
        reqId: "files-on-1",
        client: {
          connect: {
            client: {
              id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
            },
            caps: [GATEWAY_CLIENT_CAPS.FILE_ATTACHMENTS_V1],
          },
        } as unknown as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    const callArgs = mocks.agentCommand.mock.calls[0]?.[0];
    expect(callArgs.message).toContain("read this");
    expect(callArgs.message).toContain('<file name="note.txt" mime="text/plain">');
    expect(callArgs.message).toContain("hello from file");
  });

  it("prepends media note for attachment_paths when cap is enabled", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();
    const attachmentPath =
      "/root/.openclaw/media/tl00275/0-1590653959375414280410-1590810484480-159081048448019875603---af845831-346f-4138-b125-0a4c5c9e76a6.jpg";
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockResolvedValue({
      message: "khong thay that a?",
      attachmentPaths: [attachmentPath],
      mediaNote: `[media attached: ${attachmentPath}]`,
    });

    await invokeAgent(
      {
        message: "khong thay that a?",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-media-note",
        attachment_paths: [attachmentPath],
      },
      {
        reqId: "paths-on-1",
        client: {
          connect: {
            client: {
              id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
            },
            caps: [GATEWAY_CLIENT_CAPS.ATTACHMENT_PATHS_V1],
          },
        } as unknown as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

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
    primeMainAgentRun();
    mocks.agentCommand.mockClear();
    const attachmentPath = "/root/.openclaw/media/tl00275/example.jpg";

    await invokeAgent(
      {
        message: "test without cap",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-no-cap",
        attachment_paths: [attachmentPath],
      },
      {
        reqId: "paths-off-1",
        client: {
          connect: {
            client: {
              id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
            },
            caps: [],
          },
        } as unknown as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalledTimes(1));
    expect(attachmentPathMocks.parseMessageWithAttachmentPaths).not.toHaveBeenCalled();
  });

  it("returns INVALID_REQUEST when attachment_paths parser throws", async () => {
    primeMainAgentRun();
    mocks.agentCommand.mockClear();
    attachmentPathMocks.parseMessageWithAttachmentPaths.mockRejectedValue(
      new Error("attachment path not found"),
    );
    const respond = vi.fn();

    await invokeAgent(
      {
        message: "bad path",
        agentId: "main",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-attachment-paths-invalid",
        attachment_paths: ["/root/.openclaw/media/tl00275/missing.jpg"],
      },
      {
        reqId: "paths-invalid-1",
        respond,
        client: {
          connect: {
            client: {
              id: GATEWAY_CLIENT_IDS.WEBCHAT_UI,
            },
            caps: [GATEWAY_CLIENT_CAPS.ATTACHMENT_PATHS_V1],
          },
        } as unknown as AgentHandlerArgs["client"],
        isWebchatConnect: () => true,
      },
    );

    expect(mocks.agentCommand).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalled();
    const first = respond.mock.calls[0];
    expect(first?.[0]).toBe(false);
    expect(String(first?.[2]?.message ?? "")).toContain("attachment path not found");
  });

  it("prunes legacy main alias keys when writing a canonical session entry", async () => {
    mocks.loadSessionEntry.mockReturnValue({
      cfg: {
        session: { mainKey: "work" },
        agents: { list: [{ id: "main", default: true }] },
      },
      storePath: "/tmp/sessions.json",
      entry: {
        sessionId: "existing-session-id",
        updatedAt: Date.now(),
      },
      canonicalKey: "agent:main:work",
    });

    let capturedStore: Record<string, unknown> | undefined;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store: Record<string, unknown> = {
        "agent:main:work": { sessionId: "existing-session-id", updatedAt: 10 },
        "agent:main:MAIN": { sessionId: "legacy-session-id", updatedAt: 5 },
      };
      await updater(store);
      capturedStore = store;
    });

    mocks.agentCommand.mockResolvedValue({
      payloads: [{ text: "ok" }],
      meta: { durationMs: 100 },
    });

    await invokeAgent(
      {
        message: "test",
        agentId: "main",
        sessionKey: "main",
        idempotencyKey: "test-idem-alias-prune",
      },
      { reqId: "3" },
    );

    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedStore).toBeDefined();
    expect(capturedStore?.["agent:main:work"]).toBeDefined();
    expect(capturedStore?.["agent:main:MAIN"]).toBeUndefined();
  });

  it("handles bare /new by resetting the same session and sending reset greeting prompt", async () => {
    mockSessionResetSuccess({ reason: "new" });

    primeMainAgentRun({ sessionId: "reset-session-id" });

    await invokeAgent(
      {
        message: "/new",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-idem-new",
      },
      { reqId: "4" },
    );

    await vi.waitFor(() => expect(mocks.agentCommand).toHaveBeenCalled());
    expect(mocks.performGatewaySessionReset).toHaveBeenCalledTimes(1);
    const call = readLastAgentCommandCall();
    // Message is now dynamically built with current date — check key substrings
    expect(call?.message).toContain("Run your Session Startup sequence");
    expect(call?.message).toContain("Current time:");
    expect(call?.message).not.toBe(BARE_SESSION_RESET_PROMPT);
    expect(call?.sessionId).toBe("reset-session-id");
  });

  it("uses /reset suffix as the post-reset message and still injects timestamp", async () => {
    setupNewYorkTimeConfig("2026-01-29T01:30:00.000Z");
    mockSessionResetSuccess({ reason: "reset" });
    mocks.performGatewaySessionReset.mockClear();
    primeMainAgentRun({
      sessionId: "reset-session-id",
      cfg: mocks.loadConfigReturn,
    });

    await invokeAgent(
      {
        message: "/reset check status",
        sessionKey: "agent:main:main",
        idempotencyKey: "test-idem-reset-suffix",
      },
      { reqId: "4b" },
    );

    const call = await expectResetCall("[Wed 2026-01-28 20:30 EST] check status");
    expect(call?.sessionId).toBe("reset-session-id");

    resetTimeConfig();
  });

  it("rejects malformed agent session keys early in agent handler", async () => {
    mocks.agentCommand.mockClear();
    const respond = await invokeAgent(
      {
        message: "test",
        sessionKey: "agent:main",
        idempotencyKey: "test-malformed-session-key",
      },
      { reqId: "4" },
    );

    expect(mocks.agentCommand).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message: expect.stringContaining("malformed session key"),
      }),
    );
  });

  it("rejects malformed session keys in agent.identity.get", async () => {
    const respond = await invokeAgentIdentityGet(
      {
        sessionKey: "agent:main",
      },
      { reqId: "5" },
    );

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message: expect.stringContaining("malformed session key"),
      }),
    );
  });
});
