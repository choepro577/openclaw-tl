import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadSessionEntryReadOnly,
  upsertSessionEntryCore,
} from "../../config/sessions/session-accessor.js";
import { closeOpenClawAgentDatabasesForTest } from "../../state/openclaw-agent-db.js";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import {
  authenticateDeveloperApiKey,
  claimDeveloperBackgroundResponse,
  completeDeveloperResponse,
  createDeveloperIntegration,
  createDeveloperSessionKey,
  createDeveloperWebhookSignature,
  deleteExpiredDeveloperData,
  deliverDueDeveloperWebhooks,
  findDeveloperResponseByIdempotencyKey,
  getDeveloperResponse,
  insertDeveloperResponse,
  listQueuedDeveloperResponses,
  recoverInterruptedDeveloperResponses,
  rotateDeveloperApiKey,
  updateDeveloperIntegration,
  validateDeveloperWebhookUrl,
} from "./developer-store.js";

const { fetchWithSsrFGuardMock } = vi.hoisted(() => ({
  fetchWithSsrFGuardMock: vi.fn(),
}));

vi.mock("../../infra/net/fetch-guard.js", () => ({
  fetchWithSsrFGuard: (...args: unknown[]) => fetchWithSsrFGuardMock(...args),
}));

const directories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-developer-api-"));
  directories.push(directory);
  return {
    path: join(directory, "state.sqlite"),
    env: {
      ...process.env,
      OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY: randomBytes(32).toString("base64"),
    },
  };
}

afterEach(() => {
  fetchWithSsrFGuardMock.mockReset();
  closeOpenClawAgentDatabasesForTest();
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise Developer integration persistence", () => {
  it("signs the exact timestamp, stable event ID, and raw body", () => {
    expect(createDeveloperWebhookSignature("secret", "1789344000", "evt_01", '{"ok":true}')).toBe(
      "v1=dc0ce53e4e25ac1b510b98578432489ec64fe90117af716b96e24ddd17e49969",
    );
  });

  it("rejects non-HTTPS and private webhook targets before saving them", async () => {
    await expect(validateDeveloperWebhookUrl("http://example.com/hook")).rejects.toThrow(
      "WEBHOOK_URL_INVALID",
    );
    await expect(validateDeveloperWebhookUrl("https://127.0.0.1/hook")).rejects.toThrow(
      "WEBHOOK_URL_INVALID",
    );
  });

  it("stores only key hashes and invalidates the old key on immediate rotation", async () => {
    const options = stateOptions();
    const created = await createDeveloperIntegration(
      { agentId: "support", name: "CSKH Production" },
      options,
    );

    expect(authenticateDeveloperApiKey(created.apiKey, options)).toMatchObject({
      id: created.integration.id,
      agentId: "support",
      keyPrefix: created.integration.keyPrefix,
    });
    const rotated = rotateDeveloperApiKey(created.integration.id, 0, options);
    expect(authenticateDeveloperApiKey(created.apiKey, options)).toBeNull();
    expect(authenticateDeveloperApiKey(rotated.apiKey, options)?.id).toBe(created.integration.id);

    const overlap = rotateDeveloperApiKey(created.integration.id, 24, options);
    expect(authenticateDeveloperApiKey(rotated.apiKey, options)?.id).toBe(created.integration.id);
    await updateDeveloperIntegration(created.integration.id, { revokePreviousKey: true }, options);
    expect(authenticateDeveloperApiKey(rotated.apiKey, options)).toBeNull();
    expect(authenticateDeveloperApiKey(overlap.apiKey, options)?.id).toBe(created.integration.id);
    await updateDeveloperIntegration(created.integration.id, { status: "disabled" }, options);
    expect(authenticateDeveloperApiKey(overlap.apiKey, options)).toBeNull();
    await updateDeveloperIntegration(created.integration.id, { status: "active" }, options);
    expect(authenticateDeveloperApiKey(overlap.apiKey, options)?.id).toBe(created.integration.id);
    await updateDeveloperIntegration(created.integration.id, { status: "revoked" }, options);
    expect(authenticateDeveloperApiKey(overlap.apiKey, options)).toBeNull();
  });

  it("scopes continuation and idempotency to one integration and conversation", async () => {
    const options = stateOptions();
    const { integration } = await createDeveloperIntegration(
      { agentId: "support", name: "CSKH Staging" },
      options,
    );
    const conversationId = "ticket-8421";
    const sessionKey = createDeveloperSessionKey(
      integration.id,
      integration.agentId,
      conversationId,
      options.env,
    );
    expect(sessionKey).not.toContain(conversationId);

    const first = insertDeveloperResponse(
      {
        id: "resp_first",
        integration,
        externalConversationId: conversationId,
        sessionKey,
        idempotencyKey: "message-1",
        background: true,
        request: {
          model: "support",
          input: "Kiểm tra đơn hàng",
          metadata: { external_conversation_id: conversationId },
        },
      },
      options,
    );
    expect(findDeveloperResponseByIdempotencyKey(integration.id, "message-1", options)?.id).toBe(
      first.id,
    );
    expect(() =>
      insertDeveloperResponse(
        {
          id: "resp_concurrent",
          integration,
          externalConversationId: conversationId,
          sessionKey,
          background: false,
          request: {},
        },
        options,
      ),
    ).toThrow();
    expect(() =>
      insertDeveloperResponse(
        {
          id: "resp_wrong_conversation",
          integration,
          externalConversationId: "ticket-other",
          sessionKey,
          previousResponseId: first.id,
          background: false,
          request: {},
        },
        options,
      ),
    ).toThrow("PREVIOUS_RESPONSE_NOT_FOUND");

    completeDeveloperResponse(
      first.id,
      {
        id: first.id,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: "support",
        output: [],
        usage: {
          input_tokens: 2,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 3,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 5,
        },
      },
      options,
    );
    expect(getDeveloperResponse(first.id, integration.id, options)).toMatchObject({
      status: "completed",
      usage: { total_tokens: 5 },
    });
    const other = await createDeveloperIntegration(
      { agentId: "other-agent", name: "Other Integration" },
      options,
    );
    expect(getDeveloperResponse(first.id, other.integration.id, options)).toBeNull();
    const storePath = join(dirname(options.path), "support.sqlite");
    await upsertSessionEntryCore(
      { agentId: "support", sessionKey, storePath },
      { sessionId: "session-expired", updatedAt: Date.now() },
    );
    expect(loadSessionEntryReadOnly({ agentId: "support", sessionKey, storePath })).toBeDefined();
    openOpenClawStateDatabase(options)
      .db.prepare("UPDATE enterprise_developer_responses SET expires_at = 0 WHERE id = ?")
      .run(first.id);
    expect(
      await deleteExpiredDeveloperData(options, {
        session: { store: storePath },
        agents: { entries: { support: {} } },
      }),
    ).toBe(1);
    expect(getDeveloperResponse(first.id, integration.id, options)).toBeNull();
    expect(loadSessionEntryReadOnly({ agentId: "support", sessionKey, storePath })).toBeUndefined();
  });

  it("requeues interrupted background work and retries one stable webhook event", async () => {
    const options = stateOptions();
    const { integration } = await createDeveloperIntegration(
      { agentId: "support", name: "CSKH", webhookUrl: "https://1.1.1.1/hook" },
      options,
    );
    const queued = insertDeveloperResponse(
      {
        id: "resp_background",
        integration,
        externalConversationId: "ticket-background",
        sessionKey: createDeveloperSessionKey(
          integration.id,
          integration.agentId,
          "ticket-background",
          options.env,
        ),
        idempotencyKey: "message-background",
        background: true,
        request: {},
      },
      options,
    );
    expect(claimDeveloperBackgroundResponse(queued.id, options)?.status).toBe("in_progress");
    recoverInterruptedDeveloperResponses(options);
    expect(listQueuedDeveloperResponses(20, options).map((item) => item.id)).toContain(queued.id);
    expect(claimDeveloperBackgroundResponse(queued.id, options)?.status).toBe("in_progress");
    completeDeveloperResponse(
      queued.id,
      {
        id: queued.id,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: "support",
        output: [],
        usage: {
          input_tokens: 0,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 0,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 0,
        },
      },
      options,
    );

    fetchWithSsrFGuardMock.mockResolvedValue({
      response: new Response("", { status: 500 }),
      release: vi.fn().mockResolvedValue(undefined),
    });
    await deliverDueDeveloperWebhooks(options);
    const db = openOpenClawStateDatabase(options).db;
    const first = db
      .prepare(
        "SELECT event_id, status, attempt_count FROM enterprise_developer_webhook_deliveries LIMIT 1",
      )
      .get() as { event_id: string; status: string; attempt_count: number };
    expect(first).toMatchObject({ status: "pending", attempt_count: 1 });

    db.prepare(
      "UPDATE enterprise_developer_webhook_deliveries SET next_attempt_at = 0 WHERE event_id = ?",
    ).run(first.event_id);
    fetchWithSsrFGuardMock.mockResolvedValue({
      response: new Response("", { status: 400 }),
      release: vi.fn().mockResolvedValue(undefined),
    });
    await deliverDueDeveloperWebhooks(options);
    expect(
      db
        .prepare(
          "SELECT event_id, status, attempt_count FROM enterprise_developer_webhook_deliveries LIMIT 1",
        )
        .get(),
    ).toMatchObject({ event_id: first.event_id, status: "permanent_failure", attempt_count: 2 });
  });
});
