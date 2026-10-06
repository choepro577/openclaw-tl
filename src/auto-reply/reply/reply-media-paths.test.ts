// Tests media path normalization and attachment metadata generation.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureEnv, setTestEnvValue } from "../../test-utils/env.js";
import { getReplyPayloadMetadata, setReplyPayloadMetadata } from "../reply-payload.js";

const ensureSandboxWorkspaceForSession = vi.hoisted(() => vi.fn());
const resolveOutboundAttachmentFromUrl = vi.hoisted(() => vi.fn());
const resolveAgentScopedOutboundMediaAccess = vi.hoisted(() => vi.fn());
const stageRunReplyFiles = vi.hoisted(() => vi.fn());
const stateDirEnvSnapshot = captureEnv(["OPENCLAW_STATE_DIR"]);

vi.mock("../../agents/sandbox.js", () => ({
  ensureSandboxWorkspaceForSession,
}));

vi.mock("../../media/outbound-attachment.js", () => ({
  resolveOutboundAttachmentFromUrl,
}));

vi.mock("../../media/read-capability.js", () => ({
  resolveAgentScopedOutboundMediaAccess,
}));
vi.mock("../../gateway/server-methods/chat-history-files.runtime.js", () => ({
  stageRunReplyFiles,
}));

import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import { consumePendingToolMediaIntoReply } from "../../agents/embedded-agent-subscribe.handlers.messages.replies.js";
import { normalizeReplyPayloadDirectives } from "./reply-delivery.js";
import {
  createReplyMediaPathNormalizer,
  normalizeAgentRunReplyMedia,
} from "./reply-media-paths.js";

type NormalizedReply = {
  mediaUrl?: string;
  mediaUrls?: string[];
  text?: string;
  trustedLocalMedia?: boolean;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  expect(isObjectRecord(value)).toBe(true);
  if (!isObjectRecord(value)) {
    throw new Error(`${label} was not an object`);
  }
  return value;
}

function expectMedia(result: NormalizedReply, mediaUrl: string, mediaUrls: string[]): void {
  expect(result.mediaUrl).toBe(mediaUrl);
  expect(result.mediaUrls).toEqual(mediaUrls);
}

function expectNoMedia(result: NormalizedReply): void {
  expect(result.mediaUrl).toBeUndefined();
  expect(result.mediaUrls).toBeUndefined();
}

function expectOutboundAttachmentCall(
  index: number,
  mediaUrl: string,
  mediaMaxBytes: number,
): Record<string, unknown> {
  const call = resolveOutboundAttachmentFromUrl.mock.calls[index] as unknown[] | undefined;
  if (!call) {
    throw new Error(`missing outbound attachment call ${index + 1}`);
  }
  expect(call[0]).toBe(mediaUrl);
  expect(call[1]).toBe(mediaMaxBytes);
  return requireRecord(call[2], "outbound attachment options");
}

function expectAgentScopedMediaAccessCall(): Record<string, unknown> {
  const call = resolveAgentScopedOutboundMediaAccess.mock.calls[0] as unknown[] | undefined;
  if (!call) {
    throw new Error("missing agent scoped media access call");
  }
  return requireRecord(call[0], "agent scoped media access request");
}

function createTestReplyMediaNormalizer(
  overrides: Omit<
    Parameters<typeof createReplyMediaPathNormalizer>[0],
    "cfg" | "sessionKey" | "workspaceDir"
  > = {},
) {
  return createReplyMediaPathNormalizer({
    cfg: {},
    sessionKey: "session-key",
    workspaceDir: "/tmp/agent-workspace",
    ...overrides,
  });
}

describe("createReplyMediaPathNormalizer", () => {
  beforeEach(() => {
    stageRunReplyFiles.mockReset().mockResolvedValue([]);
    ensureSandboxWorkspaceForSession.mockReset().mockResolvedValue(null);
    resolveOutboundAttachmentFromUrl.mockReset().mockImplementation(async (mediaUrl: string) => ({
      path: path.join("/tmp/outbound-media", path.basename(mediaUrl.replace(/^file:\/\//i, ""))),
    }));
    resolveAgentScopedOutboundMediaAccess
      .mockReset()
      .mockImplementation(({ workspaceDir }: { workspaceDir?: string }) => ({
        workspaceDir,
        localRoots: workspaceDir ? [workspaceDir] : undefined,
        readFile: async () => Buffer.from("image"),
      }));
  });

  afterEach(() => {
    stateDirEnvSnapshot.restore();
  });

  it("stages workspace-relative media through shared outbound attachment loading", async () => {
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["./out/photo.png"],
    });

    expectMedia(result, "/tmp/outbound-media/photo.png", ["/tmp/outbound-media/photo.png"]);
    expect(result.trustedLocalMedia).toBe(true);
    const options = expectOutboundAttachmentCall(
      0,
      path.join("/tmp/agent-workspace", "out", "photo.png"),
      5 * 1024 * 1024,
    );
    const mediaAccess = requireRecord(options.mediaAccess, "media access");
    expect(mediaAccess.workspaceDir).toBe("/tmp/agent-workspace");
  });

  it("stages local markdown files and images with the same sandbox policy as explicit media", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/child" });
    const normalize = createTestReplyMediaNormalizer();
    const result = await normalize({
      text: "[Tải Excel](</workspace/report.xlsx>)\n![Chart](./chart.png)",
      mediaUrls: ["./chart.png"],
    });
    expect(result.mediaUrls).toEqual([
      "/tmp/outbound-media/chart.png",
      "/tmp/outbound-media/report.xlsx",
    ]);
    expect(result.text).toBe("Tải Excel\nChart");
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(2);
    expectOutboundAttachmentCall(1, "/tmp/sandboxes/child/report.xlsx", 5 * 1024 * 1024);
  });

  it("deduplicates repeated MEDIA directives plus an implicit link across producer and final delivery", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
    const managedPath = "/tmp/reply-files-state/media/outbound/report.xlsx";
    resolveOutboundAttachmentFromUrl.mockResolvedValue({ path: managedPath });
    const normalize = createTestReplyMediaNormalizer();
    const producer = await normalize({
      text: "[Tải báo cáo](./out/report.xlsx)\nMEDIA:./out/report.xlsx\nMEDIA:./out/report.xlsx",
    });
    const final = await normalize(normalizeReplyPayloadDirectives({ payload: producer }).payload);
    expect(final.mediaUrls).toEqual([managedPath]);
    expect(final.attachments).toHaveLength(1);
    expect(final.text).toBe("Tải báo cáo");
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(1);
  });

  it("stages child CSV and image links containing mixed raw and encoded spaces", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
    const outboundRoot = "/tmp/reply-files-state/media/outbound";
    resolveOutboundAttachmentFromUrl.mockImplementation(async (source: string) => ({
      path: `${outboundRoot}/${path.basename(source)}`,
    }));
    ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/child" });
    const text =
      '[Báo cáo](sandbox:/workspace/qa/Báo cáo%20nhân%20sự%20QA.csv "Tải CSV")\n![Biểu đồ](/workspace/qa/Biểu đồ%20QA (1).png)';
    const child = await normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [{ text }],
      terminalReply: { disposition: "visible", text },
    });
    expect(child.payloads?.[0]?.mediaUrls).toEqual([
      `${outboundRoot}/Báo cáo nhân sự QA.csv`,
      `${outboundRoot}/Biểu đồ QA (1).png`,
    ]);
    expect(child.payloads?.[0]?.attachments?.map((attachment) => attachment.name)).toEqual([
      "Báo cáo nhân sự QA.csv",
      "Biểu đồ QA (1).png",
    ]);
    expect(child.payloads?.[0]?.text).toBe("Báo cáo\nBiểu đồ");
    expect(child.terminalReply).toEqual({
      disposition: "visible",
      text: "Báo cáo\nBiểu đồ",
    });
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(2);
    expectOutboundAttachmentCall(
      0,
      "/tmp/sandboxes/child/qa/Báo cáo nhân sự QA.csv",
      5 * 1024 * 1024,
    );
    expectOutboundAttachmentCall(1, "/tmp/sandboxes/child/qa/Biểu đồ QA (1).png", 5 * 1024 * 1024);
  });

  it("never attaches ordinary credentials or source file mentions", async () => {
    const payload = {
      text: "Edit `credentials.json`, see `src/config.ts`, or open /workspace/private.json.",
    };
    expect(await createTestReplyMediaNormalizer()(payload)).toBe(payload);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("stages an ordinary terminal-only file independently from a sensitive sibling", async () => {
    const sensitive = { text: "Private image", mediaUrls: ["./private.png"], sensitiveMedia: true };
    const terminalText = "[Report](./report.csv)";
    const result = await normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      sessionId: "child-session",
      runId: "child-run",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [sensitive],
      terminalReply: { disposition: "visible", text: terminalText },
    });
    expect(result.payloads?.[0]).toBe(sensitive);
    expect(result.payloads?.[1]).toMatchObject({
      text: undefined,
      mediaUrls: ["/tmp/outbound-media/report.csv"],
    });
    expect(result.terminalReply).toEqual({ disposition: "visible", text: "Report" });
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(1);
    expectOutboundAttachmentCall(0, "/tmp/hrm-workspace/report.csv", 5 * 1024 * 1024);
    expect(stageRunReplyFiles.mock.calls[0][0].payloads).toHaveLength(1);
    expect(stageRunReplyFiles.mock.calls[0][0].payloads[0].mediaUrls).toEqual([
      "/tmp/outbound-media/report.csv",
    ]);
  });

  it("keeps a sensitive terminal path out of completion text without reading or staging it", async () => {
    const text = "[Private report](./private.csv)";
    const sensitive = { text, sensitiveMedia: true };
    const result = await normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      sessionId: "child-session",
      runId: "child-run",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [sensitive],
      terminalReply: { disposition: "visible", text },
    });
    expect(result.payloads?.[0]).toBe(sensitive);
    expect(result.terminalReply).toEqual({ disposition: "visible", text: "Private report" });
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
    expect(stageRunReplyFiles).not.toHaveBeenCalled();
  });

  it("returns terminal-only files when the producer has no payload array", async () => {
    const result = await normalizeAgentRunReplyMedia({
      cfg: {},
      workspaceDir: "/tmp/hrm-workspace",
      terminalReply: { disposition: "visible", text: "[Report](./report.csv)" },
    });
    expect(result.payloads).toHaveLength(1);
    expect(result.payloads?.[0]).toMatchObject({
      text: undefined,
      mediaUrls: ["/tmp/outbound-media/report.csv"],
    });
    expect(getReplyPayloadMetadata(result.payloads?.[0] ?? {})?.stagedFileSources).toEqual([
      { mediaUrl: "/tmp/outbound-media/report.csv", sources: ["./report.csv"] },
    ]);
  });

  it("strips quoted MEDIA delivery paths from outbound text while retaining attachments", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/child" });
    const result = await createTestReplyMediaNormalizer()({
      text: 'Đã tạo báo cáo.\nMEDIA:"/workspace/Báo cáo%20QA.csv"\nMEDIA:<./Biểu đồ QA.png>',
    });
    expect(result.text?.trim()).toBe("Đã tạo báo cáo.");
    expect(result.text).not.toContain("/tmp");
    expect(result.text).not.toContain("/workspace");
    expect(result.text).not.toContain("MEDIA:");
    expect(result.mediaUrls).toEqual([
      "/tmp/outbound-media/Báo cáo QA.csv",
      "/tmp/outbound-media/Biểu đồ QA.png",
    ]);
    expect(result.attachments?.map((attachment) => attachment.name)).toEqual([
      "Báo cáo QA.csv",
      "Biểu đồ QA.png",
    ]);
  });

  it("retains structured child file payloads while keeping terminal text free of host paths", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
    const managedPath = "/tmp/reply-files-state/media/outbound/report.xlsx";
    resolveOutboundAttachmentFromUrl.mockResolvedValue({ path: managedPath });
    ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/child" });
    const text = "[Tải báo cáo](</workspace/report.xlsx>)";
    const child = await normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [{ text }],
      terminalReply: { disposition: "visible", text },
    });
    expect(child.terminalReply).toEqual({
      disposition: "visible",
      text: "Tải báo cáo",
    });
    expect(expectAgentScopedMediaAccessCall()).toMatchObject({
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
    });
    ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/parent" });
    const parent = await createTestReplyMediaNormalizer()(child.payloads?.[0] ?? {});
    expect(parent.mediaUrls).toEqual([managedPath]);
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed reference and a visible failure receipt while delivering surviving files", async () => {
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(new Error("file not found"));
    const result = await createTestReplyMediaNormalizer()({
      text: "[Missing](./missing.xlsx) [Good](./report.pdf)",
    });
    expect(result.text).toContain("Missing");
    expect(result.text).not.toContain("./missing.xlsx");
    expect(result.text).toContain("Media failed");
    expect(result.mediaUrls).toEqual(["/tmp/outbound-media/report.pdf"]);
  });

  it.each(["path", "file URL"])(
    "rejects a globally managed %s mentioned without host-staged structured media",
    async (style) => {
      setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
      const managedPath = "/tmp/reply-files-state/media/outbound/other-session-secret.csv";
      const source = style === "file URL" ? `file://${managedPath}` : managedPath;
      ensureSandboxWorkspaceForSession.mockResolvedValue({ workspaceDir: "/tmp/sandboxes/child" });
      const result = await createTestReplyMediaNormalizer()({ text: `[Other file](${source})` });
      expectNoMedia(result);
      expect(result.text).toContain("Media failed");
      expect(result.text).not.toContain(managedPath);
      expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "rejects raw managed mediaUrls even with serialized trustedLocalMedia=%s",
    async (trustedLocalMedia) => {
      setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
      const source = "/tmp/reply-files-state/media/outbound/foreign.csv";
      const rawPayload = {
        mediaUrls: [source],
        trustedLocalMedia,
        attachments: [{ path: source, trustedLocalMedia: true }],
        hostProducedMediaSources: [source],
      };
      const result = await createTestReplyMediaNormalizer()(rawPayload);
      expectNoMedia(result);
      expect(result.text).toContain("Media failed");
      expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
    },
  );

  it("preserves host tool provenance through normalization while public cloning cannot replay it", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
    const source = "/tmp/reply-files-state/media/outbound/generated.png";
    const payload = consumePendingToolMediaIntoReply(
      {
        pendingToolMediaUrls: [source],
        pendingToolMediaTrustByUrl: new Map([[source, true]]),
        pendingToolAudioAsVoice: false,
      },
      {},
    );
    const normalized = await createTestReplyMediaNormalizer()(payload);
    expectMedia(normalized, source, [source]);
    expectMedia(await createTestReplyMediaNormalizer()(normalized), source, [source]);
    expectNoMedia(await createTestReplyMediaNormalizer()(structuredClone(normalized)));
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("awaits canonical child artifact persistence before returning terminal output", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/tmp/reply-files-state");
    const stagedPath = "/tmp/reply-files-state/media/outbound/report.csv";
    resolveOutboundAttachmentFromUrl.mockResolvedValue({ path: stagedPath });
    let finishStage: (() => void) | undefined;
    stageRunReplyFiles.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishStage = resolve;
        }),
    );
    const text = "[Report](./report.csv)";
    const resultPromise = normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      sessionId: "child-session",
      runId: "child-run",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [{ text }],
      terminalReply: { disposition: "visible", text },
    });
    await vi.waitFor(() => expect(stageRunReplyFiles).toHaveBeenCalledOnce());
    expect(stageRunReplyFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "hrm",
        sessionKey: "agent:hrm:subagent:child",
        sessionId: "child-session",
        runId: "child-run",
      }),
    );
    const stagedPayload = stageRunReplyFiles.mock.calls[0][0].payloads[0];
    expect(getReplyPayloadMetadata(stagedPayload)?.stagedFileSources).toEqual([
      { mediaUrl: stagedPath, sources: ["./report.csv"] },
    ]);
    finishStage?.();
    expect((await resultPromise).terminalReply).toEqual({ disposition: "visible", text: "Report" });
  });

  it("reports canonical child artifact persistence failure without exposing a host path", async () => {
    stageRunReplyFiles.mockRejectedValueOnce(new Error("stale transcript writer"));
    const text = "[Report](./report.csv)";
    const result = await normalizeAgentRunReplyMedia({
      cfg: {},
      agentId: "hrm",
      sessionKey: "agent:hrm:subagent:child",
      sessionId: "child-session",
      runId: "child-run",
      workspaceDir: "/tmp/hrm-workspace",
      payloads: [{ text }],
      terminalReply: { disposition: "visible", text },
    });
    expect(result.terminalReply?.disposition === "visible" && result.terminalReply.text).toContain(
      "Media failed",
    );
    expect(result.payloads?.[0]?.text).toContain("Media failed");
    expect(result.payloads?.[0]?.text).not.toContain("/tmp");
  });

  it("does not infer sensitive or reasoning file references", async () => {
    const normalize = createTestReplyMediaNormalizer();
    for (const flag of [{ sensitiveMedia: true }, { isReasoning: true }]) {
      const payload = { text: "[Secret](./secret.xlsx)", ...flag };
      expect(await normalize(payload)).toBe(payload);
    }
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("preserves reply metadata when media normalization clones the payload", async () => {
    const normalize = createTestReplyMediaNormalizer();
    const payload = setReplyPayloadMetadata(
      {
        text: "Here is the image",
        mediaUrls: ["./out/photo.png"],
      },
      {
        sourceReplyTranscriptMirror: {
          sessionKey: "main",
          text: "Here is the image",
          mediaUrls: ["./out/photo.png"],
          idempotencyKey: "source-reply:0",
        },
      },
    );

    const result = await normalize(payload);

    expect(result).not.toBe(payload);
    expectMedia(result, "/tmp/outbound-media/photo.png", ["/tmp/outbound-media/photo.png"]);
    expect(getReplyPayloadMetadata(result)?.sourceReplyTranscriptMirror).toEqual({
      sessionKey: "main",
      text: "Here is the image",
      mediaUrls: ["./out/photo.png"],
      idempotencyKey: "source-reply:0",
    });
  });

  it("maps sandbox-relative media back to the host sandbox workspace before staging", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["./out/photo.png", "file:///workspace/screens/final.png"],
    });

    expectMedia(result, "/tmp/outbound-media/photo.png", [
      "/tmp/outbound-media/photo.png",
      "/tmp/outbound-media/final.png",
    ]);
    expectOutboundAttachmentCall(
      0,
      path.join("/tmp/sandboxes/session-1", "out", "photo.png"),
      5 * 1024 * 1024,
    );
    expectOutboundAttachmentCall(
      1,
      path.join("/tmp/sandboxes/session-1", "screens", "final.png"),
      5 * 1024 * 1024,
    );
  });

  it("drops sandbox-mapped media when staging fails instead of retrying the workspace fallback", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(new Error("media too large"));
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["./out/photo.png"],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).toHaveBeenCalledTimes(1);
    expectOutboundAttachmentCall(
      0,
      path.join("/tmp/sandboxes/session-1", "out", "photo.png"),
      5 * 1024 * 1024,
    );
    expect(result.text).toBe(
      "⚠️ Media failed. Try sending a smaller supported file or a different format.",
    );
  });

  it.each([
    ["lowercase triple-slash", "file:///Users/peter/Documents/report.pdf"],
    ["uppercase triple-slash", "FILE:///Users/peter/Documents/report.pdf"],
    ["lowercase single-slash", "file:/Users/peter/Documents/report.pdf"],
    ["uppercase single-slash", "FILE:/Users/peter/Documents/report.pdf"],
    ["remote host", "file://server/share/report.pdf"],
    ["network path", "FILE:////server/share/report.pdf"],
    ["encoded slash", "file:/Users/peter/Documents/%2Freport.pdf"],
    ["encoded backslash", "FILE:/Users/peter/Documents/%5Creport.pdf"],
  ])("drops %s host file URLs when no sandbox mapping applies", async (_label, mediaUrl) => {
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: [mediaUrl],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("drops host file URLs even when sandbox exists", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["file:///Users/peter/Documents/report.pdf"],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("drops absolute host-local media paths when sandbox mapping fails", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    const normalize = createReplyMediaPathNormalizer({
      cfg: { tools: { fs: { workspaceOnly: false } } },
      sessionKey: "session-key",
      workspaceDir: "/tmp/agent-workspace",
    });

    const result = await normalize({
      mediaUrls: ["/Users/peter/Documents/report.pdf"],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("stages absolute workspace media paths before sandbox mapping", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    const absolutePath = "/Users/peter/.openclaw/workspace/reports/screenshot.png";
    const normalize = createReplyMediaPathNormalizer({
      cfg: {},
      sessionKey: "session-key",
      workspaceDir: "/Users/peter/.openclaw/workspace",
    });

    const result = await normalize({
      mediaUrls: [absolutePath],
    });

    expectMedia(result, "/tmp/outbound-media/screenshot.png", [
      "/tmp/outbound-media/screenshot.png",
    ]);
    expectOutboundAttachmentCall(0, absolutePath, 5 * 1024 * 1024);
  });

  it("stages absolute workspace media paths so the PR scenario now works", async () => {
    const absolutePath = "/Users/peter/.openclaw/workspace/exports/images/chart.png";
    const normalize = createReplyMediaPathNormalizer({
      cfg: { agents: { defaults: { mediaMaxMb: 8 } } },
      sessionKey: "session-key",
      workspaceDir: "/Users/peter/.openclaw/workspace",
    });

    const result = await normalize({
      mediaUrls: [absolutePath],
    });

    expectMedia(result, "/tmp/outbound-media/chart.png", ["/tmp/outbound-media/chart.png"]);
    expectOutboundAttachmentCall(0, absolutePath, 8 * 1024 * 1024);
  });

  it("prefers channel account media limits when staging reply attachments", async () => {
    const absolutePath = "/Users/peter/.openclaw/workspace/exports/images/chart.png";
    const normalize = createReplyMediaPathNormalizer({
      cfg: {
        channels: {
          whatsapp: {
            mediaMaxMb: 50,
            accounts: {
              work: {
                mediaMaxMb: 64,
              },
            },
          },
        },
        agents: { defaults: { mediaMaxMb: 8 } },
      },
      sessionKey: undefined,
      workspaceDir: "/Users/peter/.openclaw/workspace",
      messageProvider: "whatsapp",
      accountId: "work",
    });

    await normalize({
      mediaUrls: [absolutePath],
    });

    expectOutboundAttachmentCall(0, absolutePath, 64 * 1024 * 1024);
  });

  it("drops workspace-relative media paths that escape the agent workspace", async () => {
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["../../etc/passwd"],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("drops sandbox-relative media paths that escape both sandbox and workspace", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["../../etc/passwd"],
    });

    expectNoMedia(result);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("keeps managed generated media under the shared media root", async () => {
    setTestEnvValue("OPENCLAW_STATE_DIR", "/Users/peter/.openclaw");
    const normalize = createTestReplyMediaNormalizer();

    const source = "/Users/peter/.openclaw/media/tool-image-generation/generated.png";
    const payload = mergeAttemptToolMediaPayloads({
      toolMediaUrls: [source],
      hostOwnedToolMediaUrls: [source],
    })?.[0];
    const result = await normalize(payload ?? {});

    expectMedia(result, "/Users/peter/.openclaw/media/tool-image-generation/generated.png", [
      "/Users/peter/.openclaw/media/tool-image-generation/generated.png",
    ]);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("keeps managed outbound media under the shared media root with sandbox mapping", async () => {
    ensureSandboxWorkspaceForSession.mockResolvedValue({
      workspaceDir: "/tmp/sandboxes/session-1",
      containerWorkdir: "/workspace",
    });
    setTestEnvValue("OPENCLAW_STATE_DIR", "/Users/peter/.openclaw");
    const normalize = createTestReplyMediaNormalizer();

    const source = "/Users/peter/.openclaw/media/outbound/generated.png";
    const payload = mergeAttemptToolMediaPayloads({
      toolMediaUrls: [source],
      hostOwnedToolMediaUrls: [source],
    })?.[0];
    const result = await normalize(payload ?? {});

    expectMedia(result, "/Users/peter/.openclaw/media/outbound/generated.png", [
      "/Users/peter/.openclaw/media/outbound/generated.png",
    ]);
    expect(result.trustedLocalMedia).toBe(true);
    expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
  });

  it("drops managed outbound media symlinks escaping the shared media root without sandbox mapping", async () => {
    if (process.platform === "win32") {
      return;
    }
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-reply-media-state-"));
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-reply-media-outside-"));
    const outsideFile = path.join(outsideDir, "secret.png");
    const symlinkPath = path.join(stateDir, "media", "outbound", "linked-secret.png");
    try {
      await fs.mkdir(path.dirname(symlinkPath), { recursive: true });
      await fs.writeFile(outsideFile, "secret", "utf8");
      await fs.symlink(outsideFile, symlinkPath);
      setTestEnvValue("OPENCLAW_STATE_DIR", stateDir);
      const normalize = createTestReplyMediaNormalizer();

      const result = await normalize({
        mediaUrls: [symlinkPath],
      });

      expectNoMedia(result);
      expect(resolveOutboundAttachmentFromUrl).not.toHaveBeenCalled();
    } finally {
      await fs.rm(symlinkPath, { force: true });
      await fs.rm(outsideDir, { recursive: true, force: true });
      await fs.rm(stateDir, { recursive: true, force: true });
    }
  });

  it("drops host-local media when shared outbound attachment policy rejects it", async () => {
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(
      new Error("Local media path is not under an allowed directory"),
    );
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["/Users/peter/secrets/photo.png"],
    });

    expectNoMedia(result);
  });

  it("keeps reply text and appends a warning when all reply media is dropped", async () => {
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(new Error("file not found"));
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      text: "WA_MEDIA_DM_07",
      mediaUrls: ["./out/missing.png"],
    });

    expect(result.text).toBe(
      "WA_MEDIA_DM_07\n⚠️ Media failed. Try sending a smaller supported file or a different format.",
    );
    expectNoMedia(result);
  });

  it("keeps surviving media and appends a warning when some reply media is dropped", async () => {
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(new Error("file not found"));
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      text: "Here is the surviving attachment",
      mediaUrls: ["./out/missing.png", "https://example.com/ok.png"],
    });

    expect(result.text).toBe(
      "Here is the surviving attachment\n⚠️ Media failed. Try sending a smaller supported file or a different format.",
    );
    expectMedia(result, "https://example.com/ok.png", ["https://example.com/ok.png"]);
  });

  it("returns a warning-only text reply when media-only output is dropped upstream", async () => {
    resolveOutboundAttachmentFromUrl.mockRejectedValueOnce(new Error("file not found"));
    const normalize = createTestReplyMediaNormalizer();

    const result = await normalize({
      mediaUrls: ["./out/missing.png"],
    });

    expect(result.text).toBe(
      "⚠️ Media failed. Try sending a smaller supported file or a different format.",
    );
    expectNoMedia(result);
  });

  it("threads requester context into shared outbound media access", async () => {
    const normalize = createReplyMediaPathNormalizer({
      cfg: {},
      sessionKey: undefined,
      workspaceDir: "/tmp/agent-workspace",
      messageProvider: "whatsapp",
      accountId: "source-account",
      groupId: "ops",
      groupChannel: "whatsapp",
      groupSpace: "team",
      requesterSenderId: "sender-1",
      requesterSenderName: "Sender Name",
      requesterSenderUsername: "sender-user",
      requesterSenderE164: "+15551234567",
    });

    await normalize({
      mediaUrls: ["./out/photo.png"],
    });

    expect(resolveAgentScopedOutboundMediaAccess).toHaveBeenCalledTimes(1);
    expect(expectAgentScopedMediaAccessCall()).toEqual({
      cfg: {},
      agentId: undefined,
      workspaceDir: "/tmp/agent-workspace",
      mediaSources: [path.join("/tmp/agent-workspace", "out", "photo.png")],
      sessionKey: undefined,
      messageProvider: "whatsapp",
      accountId: "source-account",
      requesterSenderId: "sender-1",
      requesterSenderName: "Sender Name",
      requesterSenderUsername: "sender-user",
      requesterSenderE164: "+15551234567",
      groupId: "ops",
      groupChannel: "whatsapp",
      groupSpace: "team",
    });
  });

  it("passes absolute local media sources into shared outbound media access", async () => {
    const absolutePath = "/Users/peter/Pictures/chart.png";
    const normalize = createReplyMediaPathNormalizer({
      cfg: { tools: { fs: { workspaceOnly: false } } },
      sessionKey: "session-key",
      workspaceDir: "/tmp/agent-workspace",
    });

    await normalize({
      mediaUrls: [absolutePath],
    });

    expect(resolveAgentScopedOutboundMediaAccess).toHaveBeenCalledTimes(1);
    const accessRequest = expectAgentScopedMediaAccessCall();
    expect(typeof accessRequest.agentId).toBe("string");
    expect({ ...accessRequest, agentId: undefined }).toEqual({
      cfg: { tools: { fs: { workspaceOnly: false } } },
      agentId: undefined,
      workspaceDir: "/tmp/agent-workspace",
      mediaSources: [absolutePath],
      sessionKey: "session-key",
      messageProvider: undefined,
      accountId: undefined,
      requesterSenderId: undefined,
      requesterSenderName: undefined,
      requesterSenderUsername: undefined,
      requesterSenderE164: undefined,
      groupId: undefined,
      groupChannel: undefined,
      groupSpace: undefined,
    });
  });

  it("passes home-relative local media sources into shared outbound media access", async () => {
    const homeRelativePath = "~/Pictures/chart.png";
    const normalize = createReplyMediaPathNormalizer({
      cfg: { tools: { fs: { workspaceOnly: false } } },
      sessionKey: "session-key",
      workspaceDir: "/tmp/agent-workspace",
    });

    const result = await normalize({
      mediaUrls: [homeRelativePath],
    });

    expectMedia(result, "/tmp/outbound-media/chart.png", ["/tmp/outbound-media/chart.png"]);
    expect(resolveAgentScopedOutboundMediaAccess).toHaveBeenCalledTimes(1);
    const accessRequest = expectAgentScopedMediaAccessCall();
    expect(typeof accessRequest.agentId).toBe("string");
    expect({ ...accessRequest, agentId: undefined }).toEqual({
      cfg: { tools: { fs: { workspaceOnly: false } } },
      agentId: undefined,
      workspaceDir: "/tmp/agent-workspace",
      mediaSources: [homeRelativePath],
      sessionKey: "session-key",
      messageProvider: undefined,
      accountId: undefined,
      requesterSenderId: undefined,
      requesterSenderName: undefined,
      requesterSenderUsername: undefined,
      requesterSenderE164: undefined,
      groupId: undefined,
      groupChannel: undefined,
      groupSpace: undefined,
    });
  });
});
