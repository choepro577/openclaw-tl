import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import { DEFAULT_PROVIDER } from "../agents/defaults.js";
import {
  connectOk,
  embeddedRunMock,
  getFreePort,
  installGatewayTestHooks,
  piSdkMock,
  rpcReq,
  startGatewayServer,
  testState,
  writeSessionStore,
} from "./test-helpers.js";

const sessionCleanupMocks = vi.hoisted(() => ({
  clearSessionQueues: vi.fn(() => ({ followupCleared: 0, laneCleared: 0, keys: [] })),
  stopSubagentsForRequester: vi.fn(() => ({ stopped: 0 })),
}));

vi.mock("../auto-reply/reply/queue.js", async () => {
  const actual = await vi.importActual<typeof import("../auto-reply/reply/queue.js")>(
    "../auto-reply/reply/queue.js",
  );
  return {
    ...actual,
    clearSessionQueues: sessionCleanupMocks.clearSessionQueues,
  };
});

vi.mock("../auto-reply/reply/abort.js", async () => {
  const actual = await vi.importActual<typeof import("../auto-reply/reply/abort.js")>(
    "../auto-reply/reply/abort.js",
  );
  return {
    ...actual,
    stopSubagentsForRequester: sessionCleanupMocks.stopSubagentsForRequester,
  };
});

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startGatewayServer>>;
let port = 0;
let previousToken: string | undefined;

beforeAll(async () => {
  previousToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  delete process.env.OPENCLAW_GATEWAY_TOKEN;
  port = await getFreePort();
  server = await startGatewayServer(port);
});

afterAll(async () => {
  await server.close();
  if (previousToken === undefined) {
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
  } else {
    process.env.OPENCLAW_GATEWAY_TOKEN = previousToken;
  }
});

const openClient = async (opts?: Parameters<typeof connectOk>[1]) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => ws.once("open", resolve));
  const hello = await connectOk(ws, opts);
  return { ws, hello };
};

describe("gateway server sessions", () => {
  beforeEach(() => {
    sessionCleanupMocks.clearSessionQueues.mockClear();
    sessionCleanupMocks.stopSubagentsForRequester.mockClear();
  });

  test("lists and patches session store via sessions.* RPC", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sessions-"));
    const storePath = path.join(dir, "sessions.json");
    const now = Date.now();
    const recent = now - 30_000;
    const stale = now - 15 * 60_000;
    testState.sessionStorePath = storePath;

    await fs.writeFile(
      path.join(dir, "sess-main.jsonl"),
      `${Array.from({ length: 10 })
        .map((_, idx) => JSON.stringify({ role: "user", content: `line ${idx}` }))
        .join("\n")}\n`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(dir, "sess-group.jsonl"),
      `${JSON.stringify({ role: "user", content: "group line 0" })}\n`,
      "utf-8",
    );

    await writeSessionStore({
      entries: {
        main: {
          sessionId: "sess-main",
          updatedAt: recent,
          inputTokens: 10,
          outputTokens: 20,
          thinkingLevel: "low",
          verboseLevel: "on",
          lastChannel: "whatsapp",
          lastTo: "+1555",
          lastAccountId: "work",
        },
        "discord:group:dev": {
          sessionId: "sess-group",
          updatedAt: stale,
          totalTokens: 50,
        },
        "agent:main:subagent:one": {
          sessionId: "sess-subagent",
          updatedAt: stale,
          spawnedBy: "agent:main:main",
        },
        global: {
          sessionId: "sess-global",
          updatedAt: now - 10_000,
        },
      },
    });

    const { ws, hello } = await openClient();
    expect((hello as unknown as { features?: { methods?: string[] } }).features?.methods).toEqual(
      expect.arrayContaining([
        "sessions.list",
        "sessions.preview",
        "sessions.patch",
        "sessions.reset",
        "sessions.delete",
        "sessions.compact",
      ]),
    );

    const resolvedByKey = await rpcReq<{ ok: true; key: string }>(ws, "sessions.resolve", {
      key: "main",
    });
    expect(resolvedByKey.ok).toBe(true);
    expect(resolvedByKey.payload?.key).toBe("agent:main:main");

    const resolvedBySessionId = await rpcReq<{ ok: true; key: string }>(ws, "sessions.resolve", {
      sessionId: "sess-group",
    });
    expect(resolvedBySessionId.ok).toBe(true);
    expect(resolvedBySessionId.payload?.key).toBe("agent:main:discord:group:dev");

    const list1 = await rpcReq<{
      path: string;
      defaults?: { model?: string | null; modelProvider?: string | null };
      sessions: Array<{
        key: string;
        totalTokens?: number;
        thinkingLevel?: string;
        verboseLevel?: string;
        lastAccountId?: string;
        deliveryContext?: { channel?: string; to?: string; accountId?: string };
      }>;
    }>(ws, "sessions.list", { includeGlobal: false, includeUnknown: false });

    expect(list1.ok).toBe(true);
    expect(list1.payload?.path).toBe(storePath);
    expect(list1.payload?.sessions.some((s) => s.key === "global")).toBe(false);
    expect(list1.payload?.defaults?.modelProvider).toBe(DEFAULT_PROVIDER);
    const main = list1.payload?.sessions.find((s) => s.key === "agent:main:main");
    expect(main?.totalTokens).toBe(30);
    expect(main?.thinkingLevel).toBe("low");
    expect(main?.verboseLevel).toBe("on");
    expect(main?.lastAccountId).toBe("work");
    expect(main?.deliveryContext).toEqual({
      channel: "whatsapp",
      to: "+1555",
      accountId: "work",
    });

    const active = await rpcReq<{
      sessions: Array<{ key: string }>;
    }>(ws, "sessions.list", {
      includeGlobal: false,
      includeUnknown: false,
      activeMinutes: 5,
    });
    expect(active.ok).toBe(true);
    expect(active.payload?.sessions.map((s) => s.key)).toEqual(["agent:main:main"]);

    const limited = await rpcReq<{
      sessions: Array<{ key: string }>;
    }>(ws, "sessions.list", {
      includeGlobal: true,
      includeUnknown: false,
      limit: 1,
    });
    expect(limited.ok).toBe(true);
    expect(limited.payload?.sessions).toHaveLength(1);
    expect(limited.payload?.sessions[0]?.key).toBe("global");

    const patched = await rpcReq<{ ok: true; key: string }>(ws, "sessions.patch", {
      key: "agent:main:main",
      thinkingLevel: "medium",
      verboseLevel: "off",
    });
    expect(patched.ok).toBe(true);
    expect(patched.payload?.ok).toBe(true);
    expect(patched.payload?.key).toBe("agent:main:main");

    const sendPolicyPatched = await rpcReq<{
      ok: true;
      entry: { sendPolicy?: string };
    }>(ws, "sessions.patch", { key: "agent:main:main", sendPolicy: "deny" });
    expect(sendPolicyPatched.ok).toBe(true);
    expect(sendPolicyPatched.payload?.entry.sendPolicy).toBe("deny");

    const labelPatched = await rpcReq<{
      ok: true;
      entry: { label?: string };
    }>(ws, "sessions.patch", {
      key: "agent:main:subagent:one",
      label: "Briefing",
    });
    expect(labelPatched.ok).toBe(true);
    expect(labelPatched.payload?.entry.label).toBe("Briefing");

    const labelPatchedDuplicate = await rpcReq(ws, "sessions.patch", {
      key: "agent:main:discord:group:dev",
      label: "Briefing",
    });
    expect(labelPatchedDuplicate.ok).toBe(false);

    const list2 = await rpcReq<{
      sessions: Array<{
        key: string;
        thinkingLevel?: string;
        verboseLevel?: string;
        sendPolicy?: string;
        label?: string;
        displayName?: string;
      }>;
    }>(ws, "sessions.list", {});
    expect(list2.ok).toBe(true);
    const main2 = list2.payload?.sessions.find((s) => s.key === "agent:main:main");
    expect(main2?.thinkingLevel).toBe("medium");
    expect(main2?.verboseLevel).toBe("off");
    expect(main2?.sendPolicy).toBe("deny");
    const subagent = list2.payload?.sessions.find((s) => s.key === "agent:main:subagent:one");
    expect(subagent?.label).toBe("Briefing");
    expect(subagent?.displayName).toBe("Briefing");

    const clearedVerbose = await rpcReq<{ ok: true; key: string }>(ws, "sessions.patch", {
      key: "agent:main:main",
      verboseLevel: null,
    });
    expect(clearedVerbose.ok).toBe(true);

    const list3 = await rpcReq<{
      sessions: Array<{
        key: string;
        verboseLevel?: string;
      }>;
    }>(ws, "sessions.list", {});
    expect(list3.ok).toBe(true);
    const main3 = list3.payload?.sessions.find((s) => s.key === "agent:main:main");
    expect(main3?.verboseLevel).toBeUndefined();

    const listByLabel = await rpcReq<{
      sessions: Array<{ key: string }>;
    }>(ws, "sessions.list", {
      includeGlobal: false,
      includeUnknown: false,
      label: "Briefing",
    });
    expect(listByLabel.ok).toBe(true);
    expect(listByLabel.payload?.sessions.map((s) => s.key)).toEqual(["agent:main:subagent:one"]);

    const resolvedByLabel = await rpcReq<{ ok: true; key: string }>(ws, "sessions.resolve", {
      label: "Briefing",
      agentId: "main",
    });
    expect(resolvedByLabel.ok).toBe(true);
    expect(resolvedByLabel.payload?.key).toBe("agent:main:subagent:one");

    const spawnedOnly = await rpcReq<{
      sessions: Array<{ key: string }>;
    }>(ws, "sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
      spawnedBy: "agent:main:main",
    });
    expect(spawnedOnly.ok).toBe(true);
    expect(spawnedOnly.payload?.sessions.map((s) => s.key)).toEqual(["agent:main:subagent:one"]);

    const spawnedPatched = await rpcReq<{
      ok: true;
      entry: { spawnedBy?: string };
    }>(ws, "sessions.patch", {
      key: "agent:main:subagent:two",
      spawnedBy: "agent:main:main",
    });
    expect(spawnedPatched.ok).toBe(true);
    expect(spawnedPatched.payload?.entry.spawnedBy).toBe("agent:main:main");

    const spawnedPatchedInvalidKey = await rpcReq(ws, "sessions.patch", {
      key: "agent:main:main",
      spawnedBy: "agent:main:main",
    });
    expect(spawnedPatchedInvalidKey.ok).toBe(false);

    piSdkMock.enabled = true;
    piSdkMock.models = [{ id: "gpt-test-a", name: "A", provider: "openai" }];
    const modelPatched = await rpcReq<{
      ok: true;
      entry: { modelOverride?: string; providerOverride?: string };
    }>(ws, "sessions.patch", {
      key: "agent:main:main",
      model: "openai/gpt-test-a",
    });
    expect(modelPatched.ok).toBe(true);
    expect(modelPatched.payload?.entry.modelOverride).toBe("gpt-test-a");
    expect(modelPatched.payload?.entry.providerOverride).toBe("openai");

    const compacted = await rpcReq<{ ok: true; compacted: boolean }>(ws, "sessions.compact", {
      key: "agent:main:main",
      maxLines: 3,
    });
    expect(compacted.ok).toBe(true);
    expect(compacted.payload?.compacted).toBe(true);
    const compactedLines = (await fs.readFile(path.join(dir, "sess-main.jsonl"), "utf-8"))
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    expect(compactedLines).toHaveLength(3);
    const filesAfterCompact = await fs.readdir(dir);
    expect(filesAfterCompact.some((f) => f.startsWith("sess-main.jsonl.bak."))).toBe(true);

    const deleted = await rpcReq<{ ok: true; deleted: boolean }>(ws, "sessions.delete", {
      key: "agent:main:discord:group:dev",
    });
    expect(deleted.ok).toBe(true);
    expect(deleted.payload?.deleted).toBe(true);
    const listAfterDelete = await rpcReq<{
      sessions: Array<{ key: string }>;
    }>(ws, "sessions.list", {});
    expect(listAfterDelete.ok).toBe(true);
    expect(
      listAfterDelete.payload?.sessions.some((s) => s.key === "agent:main:discord:group:dev"),
    ).toBe(false);
    const filesAfterDelete = await fs.readdir(dir);
    expect(filesAfterDelete.some((f) => f.startsWith("sess-group.jsonl.deleted."))).toBe(true);

    const reset = await rpcReq<{
      ok: true;
      key: string;
      entry: { sessionId: string };
    }>(ws, "sessions.reset", { key: "agent:main:main" });
    expect(reset.ok).toBe(true);
    expect(reset.payload?.key).toBe("agent:main:main");
    expect(reset.payload?.entry.sessionId).not.toBe("sess-main");

    const badThinking = await rpcReq(ws, "sessions.patch", {
      key: "agent:main:main",
      thinkingLevel: "banana",
    });
    expect(badThinking.ok).toBe(false);
    expect((badThinking.error as { message?: unknown } | undefined)?.message ?? "").toMatch(
      /invalid thinkinglevel/i,
    );

    ws.close();
  });

  test("sessions.preview returns transcript previews", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sessions-preview-"));
    const storePath = path.join(dir, "sessions.json");
    testState.sessionStorePath = storePath;
    const sessionId = "sess-preview";
    const transcriptPath = path.join(dir, `${sessionId}.jsonl`);
    const lines = [
      JSON.stringify({ type: "session", version: 1, id: sessionId }),
      JSON.stringify({ message: { role: "user", content: "Hello" } }),
      JSON.stringify({ message: { role: "assistant", content: "Hi" } }),
      JSON.stringify({
        message: { role: "assistant", content: [{ type: "toolcall", name: "weather" }] },
      }),
      JSON.stringify({ message: { role: "assistant", content: "Forecast ready" } }),
    ];
    await fs.writeFile(transcriptPath, lines.join("\n"), "utf-8");

    await writeSessionStore({
      entries: {
        main: {
          sessionId,
          updatedAt: Date.now(),
        },
      },
    });

    const { ws } = await openClient();
    const preview = await rpcReq<{
      previews: Array<{
        key: string;
        status: string;
        items: Array<{ role: string; text: string }>;
      }>;
    }>(ws, "sessions.preview", { keys: ["main"], limit: 3, maxChars: 120 });

    expect(preview.ok).toBe(true);
    const entry = preview.payload?.previews[0];
    expect(entry?.key).toBe("main");
    expect(entry?.status).toBe("ok");
    expect(entry?.items.map((item) => item.role)).toEqual(["assistant", "tool", "assistant"]);
    expect(entry?.items[1]?.text).toContain("call weather");

    ws.close();
  });

  test("sessions.delete rejects main and aborts active runs", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sessions-"));
    const storePath = path.join(dir, "sessions.json");
    testState.sessionStorePath = storePath;

    await fs.writeFile(
      path.join(dir, "sess-main.jsonl"),
      `${JSON.stringify({ role: "user", content: "hello" })}\n`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(dir, "sess-active.jsonl"),
      `${JSON.stringify({ role: "user", content: "active" })}\n`,
      "utf-8",
    );

    await writeSessionStore({
      entries: {
        main: { sessionId: "sess-main", updatedAt: Date.now() },
        "discord:group:dev": {
          sessionId: "sess-active",
          updatedAt: Date.now(),
        },
      },
    });

    embeddedRunMock.activeIds.add("sess-active");
    embeddedRunMock.waitResults.set("sess-active", true);

    const { ws } = await openClient();

    const mainDelete = await rpcReq(ws, "sessions.delete", { key: "main" });
    expect(mainDelete.ok).toBe(false);

    const deleted = await rpcReq<{ ok: true; deleted: boolean }>(ws, "sessions.delete", {
      key: "discord:group:dev",
    });
    expect(deleted.ok).toBe(true);
    expect(deleted.payload?.deleted).toBe(true);
    expect(sessionCleanupMocks.stopSubagentsForRequester).toHaveBeenCalledWith({
      cfg: expect.any(Object),
      requesterSessionKey: "agent:main:discord:group:dev",
    });
    expect(sessionCleanupMocks.clearSessionQueues).toHaveBeenCalledTimes(1);
    const clearedKeys = sessionCleanupMocks.clearSessionQueues.mock.calls[0]?.[0] as string[];
    expect(clearedKeys).toEqual(
      expect.arrayContaining(["discord:group:dev", "agent:main:discord:group:dev", "sess-active"]),
    );
    expect(embeddedRunMock.abortCalls).toEqual(["sess-active"]);
    expect(embeddedRunMock.waitCalls).toEqual(["sess-active"]);

    ws.close();
  });

  test("creates projects and eagerly initializes standalone or project sessions", async () => {
    const { ws } = await openClient();

    const createdProject = await rpcReq<{
      ok: true;
      created: boolean;
      path: string;
      project: { projectId: string; name: string };
    }>(ws, "projects.create", { name: "Recruiting" });
    expect(createdProject.ok).toBe(true);
    expect(createdProject.payload?.created).toBe(true);
    expect(createdProject.payload?.project.name).toBe("Recruiting");

    const projectStoreRaw = await fs.readFile(createdProject.payload!.path, "utf-8");
    expect(projectStoreRaw).toContain(createdProject.payload!.project.projectId);
    expect(projectStoreRaw).toContain('"name": "Recruiting"');

    const listedProjects = await rpcReq<{
      path: string;
      count: number;
      projects: Array<{ projectId: string; name: string }>;
    }>(ws, "projects.list", {});
    expect(listedProjects.ok).toBe(true);
    expect(listedProjects.payload?.count).toBe(1);
    expect(listedProjects.payload?.projects).toEqual([
      {
        projectId: createdProject.payload!.project.projectId,
        name: "Recruiting",
      },
    ]);

    const standaloneKey = "agent:main:openai-user:tester:standalone";
    const standalone = await rpcReq<{
      ok: true;
      created: boolean;
      transcriptPath: string;
      sessionKey: string;
      sessionId: string;
      entry: { sessionId: string; name?: string; projectId?: string | null };
      session: { key: string; title?: string; name?: string; projectId?: string | null };
    }>(ws, "sessions.create", {
      sessionKey: standaloneKey,
      name: "Standalone",
    });
    expect(standalone.ok).toBe(true);
    expect(standalone.payload?.created).toBe(true);
    expect(standalone.payload?.sessionKey).toBe(standaloneKey);
    expect(standalone.payload?.entry.name).toBe("Standalone");
    expect(standalone.payload?.entry.projectId).toBeNull();
    expect(standalone.payload?.session.title).toBe("Standalone");
    const standaloneTranscript = await fs.readFile(standalone.payload!.transcriptPath, "utf-8");
    expect(standaloneTranscript).toContain('"type":"session"');
    expect(standaloneTranscript).toContain(standalone.payload!.sessionId);

    const standaloneHistory = await rpcReq<{
      sessionKey: string;
      messages: unknown[];
    }>(ws, "chat.history", { sessionKey: standaloneKey, limit: 50 });
    expect(standaloneHistory.ok).toBe(true);
    expect(standaloneHistory.payload?.sessionKey).toBe(standaloneKey);
    expect(standaloneHistory.payload?.messages).toEqual([]);

    const projectSessionKey = "agent:main:openai-user:tester:project-session";
    const projectSession = await rpcReq<{
      ok: true;
      created: boolean;
      transcriptPath: string;
      sessionKey: string;
      sessionId: string;
      entry: { sessionId: string; name?: string; projectId?: string | null };
      session: { key: string; title?: string; name?: string; projectId?: string | null };
      project?: { projectId: string; name: string };
    }>(ws, "projects.sessions.create", {
      sessionKey: projectSessionKey,
      projectId: createdProject.payload!.project.projectId,
      name: "Project Session",
    });
    expect(projectSession.ok).toBe(true);
    expect(projectSession.payload?.created).toBe(true);
    expect(projectSession.payload?.entry.projectId).toBe(createdProject.payload!.project.projectId);
    expect(projectSession.payload?.project).toEqual(createdProject.payload!.project);
    const projectTranscript = await fs.readFile(projectSession.payload!.transcriptPath, "utf-8");
    expect(projectTranscript).toContain(projectSession.payload!.sessionId);

    const list = await rpcReq<{
      sessions: Array<{
        key: string;
        title?: string;
        name?: string;
        projectId?: string | null;
      }>;
    }>(ws, "sessions.list", {
      includeGlobal: false,
      includeUnknown: false,
    });
    expect(list.ok).toBe(true);
    expect(list.payload?.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: standaloneKey,
          name: "Standalone",
          title: "Standalone",
          projectId: null,
        }),
        expect.objectContaining({
          key: projectSessionKey,
          name: "Project Session",
          title: "Project Session",
          projectId: createdProject.payload!.project.projectId,
        }),
      ]),
    );

    const standaloneAgain = await rpcReq<{
      ok: true;
      created: boolean;
      sessionId: string;
      entry: { sessionId: string };
    }>(ws, "sessions.create", { sessionKey: standaloneKey });
    expect(standaloneAgain.ok).toBe(true);
    expect(standaloneAgain.payload?.created).toBe(false);
    expect(standaloneAgain.payload?.sessionId).toBe(standalone.payload?.sessionId);
    expect(standaloneAgain.payload?.entry.sessionId).toBe(standalone.payload?.entry.sessionId);

    const missingProject = await rpcReq(ws, "projects.sessions.create", {
      sessionKey: "agent:main:openai-user:tester:missing-project",
      projectId: "missing-project-id",
    });
    expect(missingProject.ok).toBe(false);

    ws.close();
  });

  test("renames sessions with operator.write and falls back to derived title when cleared", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sessions-rename-"));
    const storePath = path.join(dir, "sessions.json");
    const sessionId = "sess-rename";
    const sessionKey = "agent:main:openai-user:tester:rename-me";
    testState.sessionStorePath = storePath;

    await writeSessionStore({
      storePath,
      entries: {
        [sessionKey]: {
          sessionId,
          sessionFile: path.join(dir, `${sessionId}.jsonl`),
          updatedAt: Date.now() - 1_000,
          name: "Old name",
          projectId: "project-123",
        },
      },
    });
    await fs.writeFile(
      path.join(dir, `${sessionId}.jsonl`),
      `${JSON.stringify({
        message: {
          role: "user",
          content: "Hello derived title from transcript",
        },
      })}\n`,
      "utf-8",
    );

    const { ws } = await openClient({ scopes: ["operator.write"] });

    const renamed = await rpcReq<{
      ok: true;
      key: string;
      entry: { name?: string; projectId?: string | null; sessionId: string };
      session: { title?: string; name?: string; projectId?: string | null };
    }>(ws, "sessions.rename", {
      key: sessionKey,
      name: "Renamed session",
    });
    expect(renamed.ok).toBe(true);
    expect(renamed.payload?.key).toBe(sessionKey);
    expect(renamed.payload?.entry.name).toBe("Renamed session");
    expect(renamed.payload?.entry.projectId).toBe("project-123");
    expect(renamed.payload?.entry.sessionId).toBe(sessionId);
    expect(renamed.payload?.session.name).toBe("Renamed session");
    expect(renamed.payload?.session.title).toBe("Renamed session");
    expect(renamed.payload?.session.projectId).toBe("project-123");

    const renamedStoreRaw = await fs.readFile(storePath, "utf-8");
    expect(renamedStoreRaw).toContain('"name": "Renamed session"');

    const cleared = await rpcReq<{
      ok: true;
      entry: { name?: string; projectId?: string | null; sessionId: string };
      session: { title?: string; name?: string; derivedTitle?: string; projectId?: string | null };
    }>(ws, "sessions.rename", {
      key: sessionKey,
      name: null,
    });
    expect(cleared.ok).toBe(true);
    expect(cleared.payload?.entry.name).toBeUndefined();
    expect(cleared.payload?.entry.projectId).toBe("project-123");
    expect(cleared.payload?.entry.sessionId).toBe(sessionId);
    expect(cleared.payload?.session.name).toBeUndefined();
    expect(cleared.payload?.session.title).toContain("Hello derived title");
    expect(cleared.payload?.session.derivedTitle).toContain("Hello derived title");
    expect(cleared.payload?.session.projectId).toBe("project-123");

    const listed = await rpcReq<{
      sessions: Array<{
        key: string;
        title?: string;
        name?: string;
        projectId?: string | null;
      }>;
    }>(ws, "sessions.list", {
      includeDerivedTitles: true,
      includeGlobal: false,
      includeUnknown: false,
    });
    expect(listed.ok).toBe(true);
    const listedSession = listed.payload?.sessions.find((session) => session.key === sessionKey);
    expect(listedSession).toBeTruthy();
    expect(listedSession?.name).toBeUndefined();
    expect(listedSession?.projectId).toBe("project-123");
    expect(listedSession?.title).toContain("Hello derived title");

    const deleted = await rpcReq<{ ok: true; deleted: boolean }>(ws, "sessions.delete", {
      key: sessionKey,
      deleteTranscript: false,
    });
    expect(deleted.ok).toBe(true);
    expect(deleted.payload?.deleted).toBe(true);

    ws.close();
  });
});
