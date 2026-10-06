import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createSolidPngBuffer } from "../../../test/helpers/image-fixtures.js";
import { setReplyPayloadMetadata } from "../../auto-reply/reply-payload.js";
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
