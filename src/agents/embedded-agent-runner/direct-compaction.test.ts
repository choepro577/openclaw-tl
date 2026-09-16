import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareDirectCompactionAttemptMock = vi.hoisted(() => vi.fn());
const buildPreparedCompactionRuntimeMock = vi.hoisted(() => vi.fn());
const executePreparedCompactionSessionMock = vi.hoisted(() => vi.fn());

vi.mock("./direct-compaction-preparation.js", () => ({
  prepareDirectCompactionAttempt: (...args: unknown[]) =>
    prepareDirectCompactionAttemptMock(...args),
}));

vi.mock("./prepared-compaction-runtime.js", () => ({
  buildPreparedCompactionRuntime: (...args: unknown[]) =>
    buildPreparedCompactionRuntimeMock(...args),
}));

vi.mock("./compaction-session-execution.js", () => ({
  executePreparedCompactionSession: (...args: unknown[]) =>
    executePreparedCompactionSessionMock(...args),
}));

const { compactEmbeddedAgentSessionDirectOnce } = await import("./direct-compaction.js");

function createPreparedCompactionValue(releaseSandbox: () => void) {
  return {
    fail: vi.fn((reason: string) => ({ ok: false, compacted: false, reason })),
    releaseSandbox,
  };
}

function createParams() {
  return {
    sessionId: "compaction-session",
    sessionFile: "compaction-session.jsonl",
    workspaceDir: "/tmp/openclaw-direct-compaction-test",
    preparedModelRuntime: {},
  } as never;
}

describe("compactEmbeddedAgentSessionDirectOnce sandbox ownership", () => {
  beforeEach(() => {
    prepareDirectCompactionAttemptMock.mockReset();
    buildPreparedCompactionRuntimeMock.mockReset();
    executePreparedCompactionSessionMock.mockReset();
  });

  it("releases its sandbox after a successful compaction and runtime disposal", async () => {
    const order: string[] = [];
    const releaseSandbox = vi.fn(() => order.push("release"));
    const dispose = vi.fn(async () => {
      order.push("dispose");
    });
    const prepared = createPreparedCompactionValue(releaseSandbox);
    prepareDirectCompactionAttemptMock.mockResolvedValue({ ok: true, value: prepared });
    buildPreparedCompactionRuntimeMock.mockResolvedValue({ dispose });
    executePreparedCompactionSessionMock.mockResolvedValue({
      ok: true,
      compacted: true,
    });

    await expect(compactEmbeddedAgentSessionDirectOnce(createParams())).resolves.toEqual({
      ok: true,
      compacted: true,
    });

    expect(dispose).toHaveBeenCalledOnce();
    expect(releaseSandbox).toHaveBeenCalledOnce();
    expect(order).toEqual(["dispose", "release"]);
  });

  it("releases its sandbox when execution fails after preparation", async () => {
    const releaseSandbox = vi.fn();
    const dispose = vi.fn(async () => undefined);
    const prepared = createPreparedCompactionValue(releaseSandbox);
    prepareDirectCompactionAttemptMock.mockResolvedValue({ ok: true, value: prepared });
    buildPreparedCompactionRuntimeMock.mockResolvedValue({ dispose });
    executePreparedCompactionSessionMock.mockRejectedValue(new Error("provider failed"));

    const result = await compactEmbeddedAgentSessionDirectOnce(createParams());

    expect(result).toMatchObject({ ok: false, compacted: false });
    expect(prepared.fail).toHaveBeenCalledWith(
      expect.stringContaining("provider failed"),
      expect.any(Error),
    );
    expect(dispose).toHaveBeenCalledOnce();
    expect(releaseSandbox).toHaveBeenCalledOnce();
  });

  it("returns preparation failures without building or disposing a runtime", async () => {
    const preparationResult = {
      ok: false,
      compacted: false,
      reason: "model unavailable",
    } as const;
    prepareDirectCompactionAttemptMock.mockResolvedValue({
      ok: false,
      result: preparationResult,
    });

    await expect(compactEmbeddedAgentSessionDirectOnce(createParams())).resolves.toEqual(
      preparationResult,
    );

    expect(buildPreparedCompactionRuntimeMock).not.toHaveBeenCalled();
    expect(executePreparedCompactionSessionMock).not.toHaveBeenCalled();
  });

  it("does not release a sandbox borrowed by the enclosing compaction run", async () => {
    const releaseBorrowedSandbox = vi.fn();
    const prepared = {
      fail: vi.fn((reason: string) => ({ ok: false, compacted: false, reason })),
      sandbox: { lifecycleActiveRelease: releaseBorrowedSandbox },
      releaseSandbox: undefined,
    };
    prepareDirectCompactionAttemptMock.mockResolvedValue({ ok: true, value: prepared });
    buildPreparedCompactionRuntimeMock.mockResolvedValue({
      dispose: vi.fn(async () => undefined),
    });
    executePreparedCompactionSessionMock.mockResolvedValue({ ok: true, compacted: true });

    await compactEmbeddedAgentSessionDirectOnce(createParams());

    expect(prepared.releaseSandbox).toBeUndefined();
    expect(releaseBorrowedSandbox).not.toHaveBeenCalled();
  });
});
