import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { loadSessionStore } from "../config/sessions.js";
import { toAgentStoreSessionKey } from "../routing/session-key.js";
import { deliverCronResultToInternalSession } from "./cron-internal-session-delivery.js";
import { readSessionMessages, resolveGatewaySessionStoreTarget } from "./session-utils.js";

function makeCfg(storePath: string): OpenClawConfig {
  return {
    session: {
      mainKey: "main",
      store: storePath,
    },
  } as OpenClawConfig;
}

async function writeStore(storePath: string, entries: Record<string, unknown>) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(entries, null, 2), "utf-8");
}

async function createStorePath(name: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
  return path.join(dir, "sessions.json");
}

function readSessionEntry(cfg: OpenClawConfig, sessionKey: string) {
  const target = resolveGatewaySessionStoreTarget({ cfg, key: sessionKey });
  const store = loadSessionStore(target.storePath, { skipCache: true });
  const entry = target.storeKeys.map((key) => store[key]).find(Boolean);
  return {
    target,
    entry,
  };
}

function readAssistantTexts(cfg: OpenClawConfig, sessionKey: string): string[] {
  const { target, entry } = readSessionEntry(cfg, sessionKey);
  if (!entry?.sessionId) {
    return [];
  }
  return readSessionMessages(entry.sessionId, target.storePath, entry.sessionFile)
    .map((message) => {
      const content = (message as { content?: Array<{ text?: string }> }).content;
      return content?.[0]?.text ?? "";
    })
    .filter(Boolean);
}

describe("deliverCronResultToInternalSession", () => {
  it("delivers back into the originating webchat session when the cron source is webchat", async () => {
    const storePath = await createStorePath("cron-internal-same-session");
    const cfg = makeCfg(storePath);
    const sessionKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "openai-user:session-a",
      mainKey: "main",
    });
    await writeStore(storePath, {
      [sessionKey]: {
        sessionId: "sess-ui-a",
        updatedAt: 100,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
    });
    const broadcast = vi.fn();
    const nodeSendToSession = vi.fn();

    const result = await deliverCronResultToInternalSession({
      cfg,
      agentId: "main",
      jobSessionKey: sessionKey,
      message: "Den gio di choi roi!",
      idempotencyKey: "idem-1",
      runId: "run-1",
      context: { broadcast, nodeSendToSession },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        delivered: true,
        sessionKey,
        reason: "job-session",
      }),
    );
    expect(nodeSendToSession).toHaveBeenCalledWith(
      sessionKey,
      "chat",
      expect.objectContaining({
        runId: "run-1",
        sessionKey,
        state: "final",
      }),
    );
    expect(readAssistantTexts(cfg, sessionKey)).toContain("Den gio di choi roi!");
  });

  it("falls back to the newest webchat UI session when the cron source is not webchat", async () => {
    const storePath = await createStorePath("cron-internal-latest-ui");
    const cfg = makeCfg(storePath);
    const nonWebchatKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "slack:direct:U123",
      mainKey: "main",
    });
    const olderUiKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "openai-user:older",
      mainKey: "main",
    });
    const latestUiKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "openai-user:latest",
      mainKey: "main",
    });
    await writeStore(storePath, {
      [nonWebchatKey]: {
        sessionId: "sess-slack",
        updatedAt: 400,
        deliveryContext: { channel: "slack", to: "U123" },
        lastChannel: "slack",
        lastTo: "U123",
      },
      [olderUiKey]: {
        sessionId: "sess-ui-old",
        updatedAt: 100,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
      [latestUiKey]: {
        sessionId: "sess-ui-latest",
        updatedAt: 500,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
    });
    const broadcast = vi.fn();
    const nodeSendToSession = vi.fn();

    const result = await deliverCronResultToInternalSession({
      cfg,
      agentId: "main",
      jobSessionKey: nonWebchatKey,
      message: "Bao cao cron moi nhat",
      idempotencyKey: "idem-2",
      runId: "run-2",
      context: { broadcast, nodeSendToSession },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        delivered: true,
        sessionKey: latestUiKey,
        reason: "latest-ui",
      }),
    );
    expect(nodeSendToSession).toHaveBeenCalledWith(
      latestUiKey,
      "chat",
      expect.objectContaining({ runId: "run-2", sessionKey: latestUiKey }),
    );
    expect(readAssistantTexts(cfg, latestUiKey)).toContain("Bao cao cron moi nhat");
  });

  it("creates and uses the main session when no webchat UI session exists", async () => {
    const storePath = await createStorePath("cron-internal-main-fallback");
    const cfg = makeCfg(storePath);
    const mainSessionKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "main",
      mainKey: "main",
    });
    const broadcast = vi.fn();
    const nodeSendToSession = vi.fn();

    const result = await deliverCronResultToInternalSession({
      cfg,
      agentId: "main",
      jobSessionKey: toAgentStoreSessionKey({
        agentId: "main",
        requestKey: "cron:source",
        mainKey: "main",
      }),
      message: "Fallback vao main session",
      idempotencyKey: "idem-3",
      runId: "run-3",
      context: { broadcast, nodeSendToSession },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        delivered: true,
        sessionKey: mainSessionKey,
        reason: "main",
      }),
    );
    const { entry } = readSessionEntry(cfg, mainSessionKey);
    expect(entry?.sessionId).toBeTruthy();
    expect(readAssistantTexts(cfg, mainSessionKey)).toContain("Fallback vao main session");
  });

  it("keeps internal session delivery idempotent on retries", async () => {
    const storePath = await createStorePath("cron-internal-idempotent");
    const cfg = makeCfg(storePath);
    const sessionKey = toAgentStoreSessionKey({
      agentId: "main",
      requestKey: "openai-user:retry",
      mainKey: "main",
    });
    await writeStore(storePath, {
      [sessionKey]: {
        sessionId: "sess-ui-retry",
        updatedAt: 100,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
    });
    const broadcast = vi.fn();
    const nodeSendToSession = vi.fn();

    await deliverCronResultToInternalSession({
      cfg,
      agentId: "main",
      jobSessionKey: sessionKey,
      message: "Only once",
      idempotencyKey: "idem-4",
      runId: "run-4",
      context: { broadcast, nodeSendToSession },
    });
    await deliverCronResultToInternalSession({
      cfg,
      agentId: "main",
      jobSessionKey: sessionKey,
      message: "Only once",
      idempotencyKey: "idem-4",
      runId: "run-4",
      context: { broadcast, nodeSendToSession },
    });

    expect(nodeSendToSession).toHaveBeenCalledTimes(1);
    expect(readAssistantTexts(cfg, sessionKey)).toEqual(["Only once"]);
  });
});
