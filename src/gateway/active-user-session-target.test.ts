import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions.js";
import { toAgentStoreSessionKey } from "../routing/session-key.js";
import { resolveActiveUserSessionTarget } from "./active-user-session-target.js";

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

describe("resolveActiveUserSessionTarget", () => {
  it("prefers the newest active non-technical user session", async () => {
    const storePath = await createStorePath("active-user-target");
    const cfg = makeCfg(storePath);
    const now = Date.now();
    const staleKey = toAgentStoreSessionKey({
      agentId: "target",
      requestKey: "openai-user:stale",
      mainKey: "main",
    });
    const activeKey = toAgentStoreSessionKey({
      agentId: "target",
      requestKey: "openai-user:active",
      mainKey: "main",
    });
    await writeStore(storePath, {
      [staleKey]: {
        sessionId: "sess-stale",
        updatedAt: now - 26 * 60 * 60 * 1000,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
      "agent:target:a2a:from:main": {
        sessionId: "sess-a2a",
        updatedAt: now,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
      [activeKey]: {
        sessionId: "sess-active",
        updatedAt: now - 5 * 60 * 1000,
        deliveryContext: { channel: "webchat" },
        lastChannel: "webchat",
      },
    });

    const resolved = await resolveActiveUserSessionTarget({
      cfg,
      agentId: "target",
    });

    expect(resolved).toMatchObject({
      ok: true,
      sessionKey: activeKey,
      reason: "active",
    });
  });

  it("falls back to the agent main session when no active user session exists", async () => {
    const storePath = await createStorePath("active-user-main-fallback");
    const cfg = makeCfg(storePath);

    const resolved = await resolveActiveUserSessionTarget({
      cfg,
      agentId: "target",
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      throw new Error("expected fallback main session");
    }
    expect(resolved.reason).toBe("main");
    expect(resolved.sessionKey).toBe(
      resolveAgentMainSessionKey({
        cfg,
        agentId: "target",
      }),
    );
    expect(resolved.entry.sessionId).toBeTruthy();
  });
});
