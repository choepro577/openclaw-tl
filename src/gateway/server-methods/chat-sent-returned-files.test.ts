import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import {
  createCodexDynamicToolBridge,
  CodexGeneratedMediaProjection,
} from "../../../extensions/codex/api.js";
import { createHostWorkspaceWriteTool } from "../../agents/agent-tools.read.js";
import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import { getReplyPayloadMetadata } from "../../auto-reply/reply-payload.js";
import {
  createReplyMediaPathNormalizer,
  normalizeAgentRunReplyMedia,
} from "../../auto-reply/reply/reply-media-paths.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";

describe("current-source sends of produced files", () => {
  it.each([
    "source",
    "internal",
    "changed",
    "failed",
    "off-target",
    "rewrite",
    "batch",
    "file-url",
  ])("keeps exact sealed ownership after a %s send", async (mode) => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("sent-exports");
      await fs.mkdir(root);
      const a = path.join(root, "Báo cáo A.csv");
      const b = path.join(root, "Báo cáo B.csv");
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      let sentPath: string | undefined;
      const native = createCodexDynamicToolBridge({
        tools: [
          createHostWorkspaceWriteTool(root),
          {
            name: "message",
            label: "Message",
            description: "Fixture delivery receipt, without external sends.",
            parameters: Type.Object({
              action: Type.String(),
              media: Type.Optional(Type.String()),
              mediaUrls: Type.Optional(Type.Array(Type.String())),
              target: Type.Optional(Type.String()),
              final: Type.Optional(Type.Boolean()),
            }),
            execute: async (_id, args) => {
              if (mode === "failed") {
                return {
                  content: [{ type: "text" as const, text: "Failed send." }],
                  details: { status: "error", error: "fixture send failed" },
                };
              }
              const staged = await createReplyMediaPathNormalizer({
                cfg,
                agentId: "main",
                workspaceDir: root,
              })({ mediaUrls: args.mediaUrls ?? [args.media!] });
              sentPath = staged.mediaUrls?.[0];
              return {
                content: [{ type: "text" as const, text: "Sent." }],
                details: ["internal", "changed", "rewrite", "batch"].includes(mode)
                  ? {
                      status: "ok",
                      deliveryStatus: "sent",
                      messageDelivery: {
                        status: "settled",
                        partialDelivery: false,
                        createdThreadIds: [],
                      },
                      sourceReplySink: "internal-ui",
                      sourceReply: staged,
                    }
                  : {
                      status: "sent",
                      messageId: "fixture-sent",
                      ...(mode !== "off-target" ? { sourceReplyRoute: "current-source" } : {}),
                    },
              };
            },
          },
        ],
        signal: new AbortController().signal,
        hookContext: {
          config: cfg,
          agentId: "main",
          sessionKey: "agent:main:sent-fixture",
          workspaceDir: root,
          currentChannelProvider: "slack",
          currentChannelId: "C123",
          currentMessagingTarget: "C123",
          sourceReplyDeliveryMode: "message_tool_only",
        },
      });
      const call = (tool: string, args: Record<string, unknown>, callId: string) =>
        native.handleToolCall({
          threadId: "sent-thread",
          turnId: "sent-turn",
          callId,
          namespace: null,
          tool,
          arguments: args,
        });
      expect((await call("write", { path: a, content: "A_ORIGINAL,1\n" }, "a")).success).toBe(true);
      expect((await call("write", { path: b, content: "B_ORIGINAL,2\n" }, "b")).success).toBe(true);
      const originalA = native.telemetry.toolMediaUrls[0]!;
      if (mode === "changed" || mode === "file-url") {
        await fs.writeFile(a, "A_CHANGED_SEND,9\n");
      }
      const result = await call(
        "message",
        {
          action: "send",
          ...(mode === "batch" ? { mediaUrls: [a, b] } : { media: a }),
          ...(!["internal", "changed", "rewrite", "batch"].includes(mode)
            ? { target: mode === "off-target" ? "C456" : "C123" }
            : {}),
          final: false,
        },
        "send-a",
      );
      expect(result.success).toBe(mode !== "failed");
      const delivered = ["internal", "rewrite", "batch"].includes(mode);
      expect(
        native.telemetry.toolStagedFileSources?.find((entry) => entry.mediaUrl === originalA)
          ?.deliveredToSource,
      ).toBe(delivered ? true : undefined);
      if (delivered) {
        expect(sentPath).not.toBe(originalA);
        expect(await fs.readFile(sentPath!, "utf8")).toBe("A_ORIGINAL,1\n");
      }
      if (mode === "changed") {
        expect(await fs.readFile(sentPath!, "utf8")).toBe("A_CHANGED_SEND,9\n");
      }
      if (mode === "rewrite") {
        expect(
          (await call("write", { path: a, content: "A_REWRITE,3\n" }, "rewrite-a")).success,
        ).toBe(true);
        expect(
          native.telemetry.toolStagedFileSources?.some((entry) => entry.deliveredToSource),
        ).toBe(false);
      }
      const projection = new CodexGeneratedMediaProjection(cfg);
      const candidates = projection.buildToolMediaUrls(native.telemetry);
      const owned = projection.buildHostOwnedMediaUrls(native.telemetry);
      expect(candidates).toHaveLength(
        mode === "batch" ? 0 : delivered && mode !== "rewrite" ? 1 : 2,
      );
      expect(owned ?? []).toEqual(candidates);
      // A model's duplicate Markdown cannot re-read/re-stage A; unrelated B stays deliverable.
      await fs.rm(root, { recursive: true });
      const finalText = `[A](<${mode === "file-url" ? pathToFileURL(a).href : a}>)\n[B](<${b}>)`;
      const normalized = await normalizeAgentRunReplyMedia({
        cfg,
        agentId: "main",
        workspaceDir: root,
        payloads: mergeAttemptToolMediaPayloads({
          payloads: [{ text: finalText }],
          toolMediaUrls: candidates,
          hostOwnedToolMediaUrls: owned,
          toolStagedFileSources: native.telemetry.toolStagedFileSources,
        }),
        terminalReply: { disposition: "visible", text: finalText },
      });
      expect(normalized.terminalReply).toEqual({ disposition: "visible", text: "A\nB" });
      const payload = normalized.payloads![0]!;
      expect(payload.mediaUrls ?? []).toHaveLength(
        mode === "batch" ? 0 : delivered && mode !== "rewrite" ? 1 : 2,
      );
      const contents = await Promise.all(
        (payload.mediaUrls ?? []).map((url) => fs.readFile(url, "utf8")),
      );
      if (mode !== "batch") {
        expect(contents).toContain("B_ORIGINAL,2\n");
      }
      expect(contents).toEqual(
        mode === "batch"
          ? []
          : mode === "rewrite"
            ? ["B_ORIGINAL,2\n", "A_REWRITE,3\n"]
            : delivered
              ? ["B_ORIGINAL,2\n"]
              : ["A_ORIGINAL,1\n", "B_ORIGINAL,2\n"],
      );
      expect(await fs.readFile(originalA, "utf8")).toBe("A_ORIGINAL,1\n");
      expect(JSON.stringify(payload)).not.toContain("deliveredToSource");
      expect(
        getReplyPayloadMetadata(payload)?.stagedFileSources?.some(
          (entry) => entry.deliveredToSource,
        ),
      ).toBe(delivered && mode !== "rewrite");
    });
  });
});
