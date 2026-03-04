import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  mediaDir: "",
  enrichError: null as Error | null,
  successAttachmentIndex: null as number | null,
}));

const mockApplyMediaUnderstanding = vi.hoisted(() =>
  vi.fn(async ({ ctx }: { ctx: Record<string, unknown> }) => {
    if (mockState.enrichError) {
      throw mockState.enrichError;
    }
    const base = typeof ctx.Body === "string" ? ctx.Body.trim() : "";
    ctx.Body = base ? `${base}\n[enriched-from-media]` : "[enriched-from-media]";
    if (typeof mockState.successAttachmentIndex === "number") {
      const existing = Array.isArray(ctx.MediaUnderstanding) ? ctx.MediaUnderstanding : [];
      ctx.MediaUnderstanding = [
        ...existing,
        {
          kind: "image.description",
          attachmentIndex: mockState.successAttachmentIndex,
          text: "ok",
          provider: "mock",
          model: "mock-model",
        },
      ];
    }
  }),
);

const mockAssertSandboxPath = vi.hoisted(() =>
  vi.fn(async ({ filePath }: { filePath: string }) => ({
    resolved: filePath,
  })),
);

vi.mock("../config/config.js", () => ({
  loadConfig: () => ({}),
}));

vi.mock("../media-understanding/apply.js", () => ({
  applyMediaUnderstanding: mockApplyMediaUnderstanding,
}));

vi.mock("../media/store.js", () => ({
  MEDIA_MAX_BYTES: 5 * 1024 * 1024,
  getMediaDir: () => mockState.mediaDir,
}));

vi.mock("../agents/sandbox-paths.js", () => ({
  assertSandboxPath: mockAssertSandboxPath,
}));

import {
  normalizeAttachmentPathsInput,
  parseMessageWithAttachmentPaths,
} from "./chat-attachment-paths.js";

describe("chat attachment paths", () => {
  beforeEach(async () => {
    mockState.enrichError = null;
    mockState.successAttachmentIndex = null;
    mockState.mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-att-paths-"));
    mockApplyMediaUnderstanding.mockClear();
    mockAssertSandboxPath.mockClear();
  });

  it("normalizes and de-duplicates snake_case and camelCase inputs", () => {
    const values = normalizeAttachmentPathsInput({
      attachment_paths: ["/tmp/a", "/tmp/b", "/tmp/a", ""],
      attachmentPaths: ["/tmp/c", "/tmp/b", "   ", 123],
    });
    expect(values).toEqual(["/tmp/a", "/tmp/b", "/tmp/c"]);
  });

  it("rejects non-absolute attachment paths", async () => {
    await expect(parseMessageWithAttachmentPaths("x", ["relative/path.txt"])).rejects.toThrow(
      /must be absolute/i,
    );
  });

  it("enriches message with validated attachment paths", async () => {
    const filePath = path.join(mockState.mediaDir, "sample.txt");
    await fs.writeFile(filePath, "hello", "utf-8");
    mockState.successAttachmentIndex = 0;
    const logs: string[] = [];

    const parsed = await parseMessageWithAttachmentPaths("please read", [filePath], {
      maxPaths: 5,
      maxBytes: 5_000_000,
      log: { warn: (message) => logs.push(message) },
    });

    expect(parsed.attachmentPaths).toEqual([filePath]);
    expect(parsed.message).toContain("[enriched-from-media]");
    expect(parsed.mediaNote).toBeUndefined();
    expect(mockApplyMediaUnderstanding).toHaveBeenCalledTimes(1);
    expect(logs).toHaveLength(0);
  });

  it("includes media note when attachment was not successfully understood", async () => {
    const filePath = path.join(mockState.mediaDir, "sample.txt");
    await fs.writeFile(filePath, "hello", "utf-8");

    const parsed = await parseMessageWithAttachmentPaths("please read", [filePath]);

    expect(parsed.mediaNote).toContain(filePath);
    expect(parsed.message).toContain("please read");
  });

  it("passes context fields and runtime options to media understanding", async () => {
    const filePath = path.join(mockState.mediaDir, "sample.txt");
    await fs.writeFile(filePath, "hello", "utf-8");
    const cfg = { tools: { media: { image: { enabled: true } } } };

    await parseMessageWithAttachmentPaths("please read", [filePath], {
      cfg: cfg as unknown as import("../config/config.js").OpenClawConfig,
      sessionKey: "agent:main:session-1",
      surface: "internal",
      chatType: "direct",
      agentDir: "/tmp/mock-agent",
      activeModel: { provider: "anthropic", model: "claude-opus-4-5" },
    });

    expect(mockApplyMediaUnderstanding).toHaveBeenCalledWith(
      expect.objectContaining({
        cfg,
        agentDir: "/tmp/mock-agent",
        activeModel: { provider: "anthropic", model: "claude-opus-4-5" },
        ctx: expect.objectContaining({
          SessionKey: "agent:main:session-1",
          Surface: "internal",
          Provider: "internal",
          ChatType: "direct",
        }),
      }),
    );
  });

  it("suppresses successful attachment from media note when multiple files are provided", async () => {
    const filePathA = path.join(mockState.mediaDir, "sample-a.txt");
    const filePathB = path.join(mockState.mediaDir, "sample-b.txt");
    await fs.writeFile(filePathA, "hello a", "utf-8");
    await fs.writeFile(filePathB, "hello b", "utf-8");
    mockState.successAttachmentIndex = 0;

    const parsed = await parseMessageWithAttachmentPaths("please read", [filePathA, filePathB]);

    expect(parsed.mediaNote).toContain(filePathB);
    expect(parsed.mediaNote).not.toContain(filePathA);
  });

  it("falls back to original message when media enrichment fails", async () => {
    const filePath = path.join(mockState.mediaDir, "sample.txt");
    await fs.writeFile(filePath, "hello", "utf-8");
    mockState.enrichError = new Error("enrich failed");
    const logs: string[] = [];

    const parsed = await parseMessageWithAttachmentPaths("  keep this text  ", [filePath], {
      log: { warn: (message) => logs.push(message) },
    });

    expect(parsed.message).toBe("keep this text");
    expect(parsed.attachmentPaths).toEqual([filePath]);
    expect(parsed.mediaNote).toContain(filePath);
    expect(logs.some((line) => /ws-attachment-paths/i.test(line))).toBe(true);
  });
});
