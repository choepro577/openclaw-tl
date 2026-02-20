import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cfg: {
    agents: {
      list: [
        {
          id: "main",
          memorySearch: {
            extraPaths: [],
          },
        },
      ],
    },
  } as Record<string, unknown>,
  writeConfigFile: vi.fn(async (next: Record<string, unknown>) => {
    mocks.cfg = next;
  }),
  getMemorySearchManager: vi.fn(async () => ({
    manager: {
      status: () => ({ backend: "builtin", files: 3, chunks: 9 }),
      sync: vi.fn(async () => {}),
    },
  })),
  startKbSyncAllJob: vi.fn(async () => ({
    ok: true as const,
    jobId: "kb_sync_1",
    state: "queued" as const,
  })),
  getKbSyncAllStatus: vi.fn(() => ({
    jobId: "kb_sync_1",
    state: "running" as const,
    kbPath: "/tmp/kb",
    unionPaths: ["/tmp/kb"],
    progress: {
      totalAgents: 1,
      doneAgents: 0,
      currentAgentId: "main",
    },
    results: [],
    startedAtMs: Date.now(),
  })),
}));

vi.mock("../../config/config.js", () => ({
  loadConfig: () => mocks.cfg,
  writeConfigFile: mocks.writeConfigFile,
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: (cfg: { agents?: { list?: Array<{ id?: string }> } }) =>
    cfg.agents?.list?.map((entry) => String(entry.id ?? "")).filter(Boolean) ?? [],
}));

vi.mock("../../commands/agents.config.js", () => ({
  listAgentEntries: (cfg: { agents?: { list?: unknown[] } }) =>
    Array.isArray(cfg.agents?.list) ? cfg.agents.list : [],
  findAgentEntryIndex: (list: Array<{ id?: string }>, agentId: string) =>
    list.findIndex((entry) => String(entry.id ?? "") === agentId),
}));

vi.mock("../../memory/search-manager.js", () => ({
  getMemorySearchManager: mocks.getMemorySearchManager,
}));

vi.mock("../kb-sync-all-jobs.js", () => ({
  startKbSyncAllJob: mocks.startKbSyncAllJob,
  getKbSyncAllStatus: mocks.getKbSyncAllStatus,
}));

const { agentsKbHandlers } = await import("./agents-kb.js");

function makeCall(
  method: keyof typeof agentsKbHandlers,
  params: Record<string, unknown>,
  client: Record<string, unknown> | null = null,
) {
  const respond = vi.fn();
  const handler = agentsKbHandlers[method];
  const promise = handler({
    params,
    respond,
    context: {} as never,
    req: { type: "req" as const, id: "1", method },
    client: client as never,
    isWebchatConnect: () => false,
  });
  return { respond, promise };
}

let tmpDir = "";
let prevStateDir: string | undefined;

beforeEach(async () => {
  vi.clearAllMocks();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-kb-test-"));
  prevStateDir = process.env.OPENCLAW_STATE_DIR;
  process.env.OPENCLAW_STATE_DIR = tmpDir;

  mocks.cfg = {
    agents: {
      list: [
        {
          id: "main",
          memorySearch: {
            extraPaths: [],
          },
        },
      ],
    },
  };
});

afterEach(async () => {
  if (prevStateDir === undefined) {
    delete process.env.OPENCLAW_STATE_DIR;
  } else {
    process.env.OPENCLAW_STATE_DIR = prevStateDir;
  }
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

describe("agents.kb handlers", () => {
  it("creates nested folders/files and returns recursive tree", async () => {
    await makeCall("agents.kb.mkdir", {
      agentId: "main",
      parentPath: "",
      name: "policies",
    }).promise;

    await makeCall("agents.kb.mkdir", {
      agentId: "main",
      parentPath: "policies",
      name: "hr",
    }).promise;

    await makeCall("agents.kb.file.set", {
      agentId: "main",
      path: "policies/hr/rules.md",
      content: "# Rules",
      createIfMissing: true,
    }).promise;

    const { respond, promise } = makeCall("agents.kb.tree", {
      agentId: "main",
      path: "",
    });
    await promise;

    const payload = respond.mock.calls[0]?.[1] as {
      entries?: Array<{ path: string }>;
      kbRootAbs?: string;
    };
    expect(respond).toHaveBeenCalledWith(true, expect.any(Object), undefined);
    expect(payload.entries?.map((entry) => entry.path)).toEqual([
      "policies",
      "policies/hr",
      "policies/hr/rules.md",
    ]);
    expect(payload.kbRootAbs).toBe(path.join(tmpDir, "KB"));
  });

  it("rejects creating or writing non-md files", async () => {
    await makeCall("agents.kb.mkdir", {
      agentId: "main",
      parentPath: "",
      name: "docs",
    }).promise;

    const { respond, promise } = makeCall("agents.kb.file.set", {
      agentId: "main",
      path: "docs/readme.txt",
      content: "nope",
      createIfMissing: true,
    });

    await promise;

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({ message: expect.stringContaining(".md") }),
    );
  });

  it("rejects creating file directly under KB root", async () => {
    const { respond, promise } = makeCall("agents.kb.file.set", {
      agentId: "main",
      path: "root.md",
      content: "root",
      createIfMissing: true,
    });

    await promise;

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({ message: expect.stringContaining("KB root") }),
    );
  });

  it("requires recursive flag for folder deletion", async () => {
    await makeCall("agents.kb.mkdir", {
      agentId: "main",
      parentPath: "",
      name: "ops",
    }).promise;

    const { respond, promise } = makeCall("agents.kb.delete", {
      agentId: "main",
      path: "ops",
      recursive: false,
    });

    await promise;

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({ message: expect.stringContaining("recursive=true") }),
    );
  });

  it("sync reindexes agent without mutating extraPaths", async () => {
    const syncMock = vi.fn(async () => {});
    mocks.getMemorySearchManager.mockResolvedValue({
      manager: {
        status: () => ({ backend: "builtin", files: 42, chunks: 77 }),
        sync: syncMock,
      },
    });

    const { respond, promise } = makeCall("agents.kb.sync", {
      agentId: "main",
      forceReindex: true,
    });
    await promise;

    const payload = respond.mock.calls[0]?.[1] as {
      extraPaths: { added: boolean; before: string[]; after: string[] };
      index: { ok: boolean; files?: number; chunks?: number };
    };

    expect(payload.extraPaths.added).toBe(false);
    expect(payload.extraPaths.before).toEqual([]);
    expect(payload.extraPaths.after).toEqual([]);
    expect(payload.index.ok).toBe(true);
    expect(payload.index.files).toBe(42);
    expect(payload.index.chunks).toBe(77);
    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(mocks.writeConfigFile).not.toHaveBeenCalled();
  });

  it("sets and gets absolute extraPaths for an agent", async () => {
    const validDir = path.join(tmpDir, "enterprise-docs");
    await fs.mkdir(validDir, { recursive: true });
    const canonicalDir = await fs.realpath(validDir).catch(() => validDir);

    const { respond: setRespond, promise: setPromise } = makeCall("agents.kb.extraPaths.set", {
      agentId: "main",
      paths: [validDir, validDir],
    });
    await setPromise;

    const setPayload = setRespond.mock.calls[0]?.[1] as { after: string[]; added: string[] };
    expect(setPayload.after).toEqual([canonicalDir]);
    expect(setPayload.added).toEqual([canonicalDir]);
    expect(mocks.writeConfigFile).toHaveBeenCalledTimes(1);

    const { respond: getRespond, promise: getPromise } = makeCall("agents.kb.extraPaths.get", {
      agentId: "main",
    });
    await getPromise;

    const getPayload = getRespond.mock.calls[0]?.[1] as {
      kbPath: string;
      paths: Array<{ path: string; exists: boolean; isKb: boolean }>;
    };
    expect(getPayload.kbPath).toBe(path.join(tmpDir, "KB"));
    expect(getPayload.paths).toEqual([{ path: canonicalDir, exists: true, isKb: false }]);
  });

  it("rejects relative extraPaths", async () => {
    const { respond, promise } = makeCall("agents.kb.extraPaths.set", {
      agentId: "main",
      paths: ["relative/path"],
    });
    await promise;

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({ message: expect.stringContaining("absolute") }),
    );
  });

  it("starts and queries sync-all jobs", async () => {
    const { respond: startRespond, promise: startPromise } = makeCall("agents.kb.syncAll.start", {
      forceReindex: true,
    });
    await startPromise;

    expect(startRespond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ ok: true, jobId: "kb_sync_1", state: "queued" }),
      undefined,
    );

    const { respond: statusRespond, promise: statusPromise } = makeCall(
      "agents.kb.syncAll.status",
      {
        jobId: "kb_sync_1",
      },
    );
    await statusPromise;

    expect(statusRespond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ ok: true, jobId: "kb_sync_1", state: "running" }),
      undefined,
    );
  });

  it("enforces enterprise agent scope", async () => {
    const { respond, promise } = makeCall(
      "agents.kb.tree",
      {
        agentId: "main",
        path: "",
      },
      {
        authKind: "enterprise-token",
        boundAgentId: "other-agent",
        connect: {
          role: "operator",
          scopes: ["operator.read", "operator.write"],
        },
      },
    );

    await promise;

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({ message: expect.stringContaining("scope violation") }),
    );
  });
});
