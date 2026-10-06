import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createCodexDynamicToolBridge,
  CodexGeneratedMediaProjection,
} from "../../../extensions/codex/api.js";
import { createSolidPngBuffer } from "../../../test/helpers/image-fixtures.js";
import { createHostWorkspaceWriteTool } from "../../agents/agent-tools.read.js";
import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import { createWriteTool } from "../../agents/sessions/tools/write.js";
import { createWorkspaceWriteMediaSnapshot } from "../../agents/workspace-write-media.js";
import {
  setReplyPayloadMetadata,
  getReplyPayloadMetadata,
} from "../../auto-reply/reply-payload.js";
import { normalizeAgentRunReplyMedia } from "../../auto-reply/reply/reply-media-paths.js";
import { resolveSessionStorePathCore } from "../../config/sessions/paths.js";
import { upsertSessionEntryCore } from "../../config/sessions/session-accessor.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { resolveManagedOutgoingMediaArtifactSource } from "../managed-image-attachments.js";
import { listManagedImageRecordEntries } from "../managed-image-record-store.js";
import { readSessionMessagesAsync } from "../session-transcript-readers.js";
import { createChatSendReplyDispatch } from "./chat-send-reply-dispatch.js";

describe("direct chat returned files", () => {
  it("does not bind an MCP claimed workspace alias to an HTTP result", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("untrusted-alias");
      await fs.mkdir(root, { recursive: true });
      const source = path.join(root, "missing.csv");
      const remote = "https://example.com/remote.csv";
      const writer = createHostWorkspaceWriteTool(root);
      const bridge = createCodexDynamicToolBridge({
        tools: [
          {
            ...writer,
            name: "remote_tool",
            outputSchema: undefined,
            execute: async () => ({
              content: [{ type: "text" as const, text: "External result." }],
              details: {
                mcpServer: "untrusted",
                mcpTool: "remote_tool",
                media: {
                  mediaUrls: [remote],
                  trustedLocalMedia: true,
                  stagedFileSources: [{ mediaUrl: remote, sources: [source] }],
                },
              },
            }),
          },
        ],
        signal: new AbortController().signal,
      });
      const reply = await bridge.handleToolCall({
        threadId: "untrusted-thread",
        turnId: "untrusted-turn",
        callId: "untrusted",
        namespace: null,
        tool: "remote_tool",
        arguments: { path: "unused", content: "unused" },
      });
      expect(reply.success).toBe(true);
      expect(bridge.telemetry.toolStagedFileSources).toBeUndefined();
      expect(
        new CodexGeneratedMediaProjection({}).buildHostOwnedMediaUrls(bridge.telemetry),
      ).toBeUndefined();
      const payloads = mergeAttemptToolMediaPayloads({
        payloads: [{ text: `[File](<${source}>)` }],
        toolMediaUrls: bridge.telemetry.toolMediaUrls,
        hostOwnedToolMediaUrls: new CodexGeneratedMediaProjection({}).buildHostOwnedMediaUrls(
          bridge.telemetry,
        ),
        toolStagedFileSources: bridge.telemetry.toolStagedFileSources,
      });
      expect(getReplyPayloadMetadata(payloads![0]!)?.stagedFileSources).toBeUndefined();
      const normalized = await normalizeAgentRunReplyMedia({
        cfg: {},
        workspaceDir: root,
        payloads,
      });
      expect(normalized.payloads?.[0]?.mediaUrls).toEqual([remote]);
      expect(normalized.payloads?.[0]?.text).toContain("Media failed");
    });
  });
  it.each(["bare", "markdown"])(
    "delivers only the latest verified relative write with a %s native final",
    async (style) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("written-exports");
        await fs.mkdir(root, { recursive: true });
        const name = "QA live không F5.csv";
        const content = "Mã,Ngày công\nQA_LIVE_01,20\nQA_LIVE_02,21\n";
        const cfg: OpenClawConfig = {
          agents: { list: [{ id: "main", default: true, workspace: root }] },
        };
        const scope = {
          agentId: "main",
          sessionKey: "agent:main:dashboard:written-exports",
          sessionId: "written-exports",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        await upsertSessionEntryCore(scope, {
          sessionId: scope.sessionId,
          updatedAt: 1,
          spawnedWorkspaceDir: root,
        });
        const bridge = createCodexDynamicToolBridge({
          tools: [createHostWorkspaceWriteTool(root)],
          signal: new AbortController().signal,
        });
        const result = await bridge.handleToolCall({
          threadId: "thread-written",
          turnId: "turn-written",
          callId: "write-export",
          namespace: null,
          tool: "write",
          arguments: { path: name, content },
        });
        expect(result.success).toBe(true);
        expect(bridge.telemetry.toolMediaUrls).toHaveLength(1);
        const firstSnapshot = bridge.telemetry.toolMediaUrls[0]!;
        const latestContent = `${content}QA_LIVE_03,22\n`;
        const rewritten = await bridge.handleToolCall({
          threadId: "thread-written",
          turnId: "turn-written",
          callId: "rewrite-export",
          namespace: null,
          tool: "write",
          arguments: { path: name, content: latestContent },
        });
        expect(rewritten.success).toBe(true);
        expect(bridge.telemetry.toolMediaUrls).toHaveLength(1);
        const rewrittenSnapshot = bridge.telemetry.toolMediaUrls[0]!;
        const noOp = await bridge.handleToolCall({
          threadId: "thread-repeated",
          turnId: "turn-repeated",
          callId: "repeat-export",
          namespace: null,
          tool: "write",
          arguments: { path: name, content: latestContent },
        });
        expect(noOp.success).toBe(true);
        expect(noOp).toHaveProperty("terminate", true);
        expect(bridge.telemetry.toolMediaUrls).toHaveLength(1);
        expect(await fs.readFile(firstSnapshot, "utf8")).toBe(content);
        expect(await fs.readFile(rewrittenSnapshot, "utf8")).toBe(latestContent);
        expect(
          mergeAttemptToolMediaPayloads({
            toolMediaUrls: bridge.telemetry.toolMediaUrls,
            toolStagedFileSources: bridge.telemetry.toolStagedFileSources,
            hostOwnedToolMediaUrls: new CodexGeneratedMediaProjection(cfg).buildHostOwnedMediaUrls(
              bridge.telemetry,
            ),
          })?.[0]?.mediaUrls,
        ).toEqual(bridge.telemetry.toolMediaUrls);
        const projection = new CodexGeneratedMediaProjection(cfg);
        expect(projection.buildHostOwnedMediaUrls(bridge.telemetry)).toEqual(
          bridge.telemetry.toolMediaUrls,
        );
        expect(
          projection.buildHostOwnedMediaUrls({
            ...bridge.telemetry,
            messagingToolSentMediaUrls: bridge.telemetry.toolMediaUrls,
          }),
        ).toBeUndefined();
        // Snapshot belongs to this verified write, even if another write reuses the filename.
        await fs.writeFile(path.join(root, name), "other session bytes");
        const text =
          style === "bare"
            ? `Đã tạo **${name}**.`
            : `Đã tạo [báo cáo](<${path.join(root, name)}>) và [cùng file](<${name}>).`;
        const key = "native-written-final";
        await appendAssistantMessageToSessionTranscript({
          ...scope,
          config: cfg,
          text,
          idempotencyKey: key,
        });
        const payloads = mergeAttemptToolMediaPayloads({
          payloads: [
            setReplyPayloadMetadata(
              { text },
              { assistantTranscriptOwned: true, assistantTranscriptIdempotencyKey: key },
            ),
          ],
          toolMediaUrls: bridge.telemetry.toolMediaUrls,
          toolStagedFileSources: bridge.telemetry.toolStagedFileSources,
          hostOwnedToolMediaUrls: projection.buildHostOwnedMediaUrls(bridge.telemetry),
        });
        const normalized = await normalizeAgentRunReplyMedia({
          cfg,
          ...scope,
          runId: "written-run",
          workspaceDir: root,
          payloads,
          terminalReply: { disposition: "visible", text },
        });
        const dispatch = createChatSendReplyDispatch({
          accountId: undefined,
          isAgentRunStarted: () => true,
          logGateway: createSubsystemLogger("gateway/chat/written-exports-test"),
          session: {
            agentId: scope.agentId,
            backingSessionId: scope.sessionId,
            cfg,
            clientRunId: "written-run",
            sessionKey: scope.sessionKey,
            sessionLoadOptions: { agentId: scope.agentId },
          },
          userTurnRecorder: { markBlocked: vi.fn() },
        });
        await dispatch.runAgentMediaTranscript(
          { run: async (operation) => await operation() },
          async () => {
            for (const final of normalized.payloads ?? []) {
              await dispatch.dispatcherOptions.deliver(final, { kind: "final" });
            }
          },
        );
        const rows = await readSessionMessagesAsync(scope, { mode: "full" });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ idempotencyKey: key });
        const blocks = (rows[0] as { content: Record<string, unknown>[] }).content.filter(
          (block) => block.type === "file",
        );
        expect(blocks).toHaveLength(1);
        expect(blocks[0]?.fileName).toBe(name);
        await fs.rm(root, { recursive: true });
        const source = await resolveManagedOutgoingMediaArtifactSource({
          sessionKey: scope.sessionKey,
          artifactId: String(blocks[0]?.artifactId),
        });
        expect(source).not.toBeNull();
        expect(await fs.readFile(source!.path, "utf8")).toBe(latestContent);
        expect(await readSessionMessagesAsync(scope, { mode: "full" })).toEqual(rows);
        expect(listManagedImageRecordEntries({})).toHaveLength(1);
        const snapshot = createWorkspaceWriteMediaSnapshot(state.path("policy-root"));
        for (const file of [
          ".env",
          "memory/report.csv",
          "config/export.txt",
          "AGENTS.md",
          "source.ts",
          "fake.xlsx",
          "fake.png",
          "../outside.csv",
        ]) {
          expect(
            await snapshot({
              absolutePath: path.resolve(state.path("policy-root"), file),
              content,
            }),
          ).toBeUndefined();
        }
        const failed = createWriteTool(state.path("failed"), {
          snapshotMedia: snapshot,
          operations: {
            mkdir: async () => {},
            writeFile: async () => {
              throw new Error("denied");
            },
            readFile: async () => {
              throw new Error("missing");
            },
          },
        });
        await expect(
          failed.execute("denied-write", { path: "report.csv", content }),
        ).rejects.toThrow("denied");
      });
    },
  );

  it("keeps direct producer media on one canonical runtime-owned row through the webchat finalizer", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("direct-files");
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "QA giao diện.csv"), "agent,total\nPERSONAL,42\n");
      await fs.writeFile(
        path.join(root, "preview.png"),
        createSolidPngBuffer(2, 2, { r: 20, g: 90, b: 50 }),
      );
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const scope = {
        agentId: "main",
        sessionKey: "agent:main:dashboard:direct-files",
        sessionId: "direct-files",
        storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
      };
      await upsertSessionEntryCore(scope, {
        sessionId: scope.sessionId,
        updatedAt: 1,
        spawnedWorkspaceDir: root,
      });
      const key = "runtime-owned-direct-final";
      const text = "[Download](./QA%20giao%20diện.csv) ![Preview](./preview.png)";
      const dispatch = createChatSendReplyDispatch({
        accountId: undefined,
        isAgentRunStarted: () => true,
        logGateway: createSubsystemLogger("gateway/chat/direct-files-test"),
        session: {
          agentId: scope.agentId,
          backingSessionId: scope.sessionId,
          cfg,
          clientRunId: "direct-run",
          sessionKey: scope.sessionKey,
          sessionLoadOptions: { agentId: scope.agentId },
        },
        userTurnRecorder: { markBlocked: vi.fn() },
      });
      dispatch.captureAgentTranscriptStart();
      await appendAssistantMessageToSessionTranscript({
        ...scope,
        config: cfg,
        text,
        idempotencyKey: key,
      });
      const payload = setReplyPayloadMetadata(
        { text },
        { assistantTranscriptOwned: true, assistantTranscriptIdempotencyKey: key },
      );
      const result = await normalizeAgentRunReplyMedia({
        cfg,
        ...scope,
        workspaceDir: root,
        runId: "direct-run",
        payloads: [payload],
        terminalReply: { disposition: "visible", text },
      });
      expect(result.payloads?.[0]?.mediaUrls).toHaveLength(2);
      await dispatch.runAgentMediaTranscript(
        { run: async (operation) => await operation() },
        async () => {
          for (const final of result.payloads ?? []) {
            await dispatch.dispatcherOptions.deliver(final, { kind: "final" });
          }
        },
      );
      const rows = await readSessionMessagesAsync(scope, { mode: "full" });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ idempotencyKey: key });
      const content = (rows[0] as { content: Record<string, unknown>[] }).content;
      expect(content.filter((block) => block.type === "file")).toHaveLength(1);
      expect(content.filter((block) => block.type === "image")).toHaveLength(1);
      expect(listManagedImageRecordEntries({})).toHaveLength(2);
      await fs.rm(root, { recursive: true });
      expect(await readSessionMessagesAsync(scope, { mode: "full" })).toEqual(rows);
      for (const block of content.filter((value) => value.artifactId)) {
        const source = await resolveManagedOutgoingMediaArtifactSource({
          sessionKey: scope.sessionKey,
          artifactId: String(block.artifactId),
        });
        expect(source).not.toBeNull();
        if (block.type === "file") {
          expect(await fs.readFile(source!.path, "utf8")).toBe("agent,total\nPERSONAL,42\n");
        }
      }
    });
  });
});
