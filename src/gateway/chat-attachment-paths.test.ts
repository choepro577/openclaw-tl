import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  mediaDir: "",
  enrichError: null as Error | null,
}));

const mockApplyMediaUnderstanding = vi.hoisted(() =>
  vi.fn(async ({ ctx }: { ctx: { Body?: string } }) => {
    if (mockState.enrichError) {
      throw mockState.enrichError;
    }
    const base = typeof ctx.Body === "string" ? ctx.Body.trim() : "";
    ctx.Body = base ? `${base}\n[enriched-from-media]` : "[enriched-from-media]";
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
    const logs: string[] = [];

    const parsed = await parseMessageWithAttachmentPaths("please read", [filePath], {
      maxPaths: 5,
      maxBytes: 5_000_000,
      log: { warn: (message) => logs.push(message) },
    });

    expect(parsed.attachmentPaths).toEqual([filePath]);
    expect(parsed.message).toContain("[enriched-from-media]");
    expect(mockApplyMediaUnderstanding).toHaveBeenCalledTimes(1);
    expect(logs).toHaveLength(0);
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
    expect(logs.some((line) => /ws-attachment-paths/i.test(line))).toBe(true);
  });
});
