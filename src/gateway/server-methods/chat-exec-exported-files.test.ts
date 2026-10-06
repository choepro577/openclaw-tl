import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import {
  createCodexDynamicToolBridge,
  CodexGeneratedMediaProjection,
} from "../../../extensions/codex/api.js";
import { createSolidPngBuffer } from "../../../test/helpers/image-fixtures.js";
import { createSandboxedWriteTool } from "../../agents/agent-tools.read.js";
import { createCoreCodingTools } from "../../agents/core-coding-tools.js";
import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import type { SandboxFsBridge } from "../../agents/sandbox/fs-bridge.types.js";
import { createWorkspaceExecExportSnapshot } from "../../agents/workspace-exec-exports.js";
import { isWorkspaceExportPath } from "../../agents/workspace-write-media.js";
import { setReplyPayloadMetadata } from "../../auto-reply/reply-payload.js";
import { normalizeAgentRunReplyMedia } from "../../auto-reply/reply/reply-media-paths.js";
import { resolveSessionStorePathCore } from "../../config/sessions/paths.js";
import { upsertSessionEntryCore } from "../../config/sessions/session-accessor.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { resolveManagedOutgoingMediaArtifactSource } from "../managed-image-attachments.js";
import { readSessionMessagesAsync } from "../session-transcript-readers.js";
import { createChatSendReplyDispatch } from "./chat-send-reply-dispatch.js";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function workbookBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  zip.file(
    "xl/workbook.xml",
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="QA" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>QA_BINARY_01</t></is></c><c r="B1"><v>20</v></c></row></sheetData></worksheet>',
  );
  return await zip.generateAsync({ type: "nodebuffer" });
}

describe("declared native exec exports", () => {
  it("maps an absolute container write to its host source and reuses that sealed file for virtual Markdown", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("sandbox-virtual-write");
      await fs.mkdir(root, { recursive: true });
      const hostPath = (filePath: string) =>
        path.resolve(
          root,
          filePath.startsWith("/workspace/") || filePath === "/workspace"
            ? path.relative("/workspace", filePath)
            : filePath,
        );
      const bridge: SandboxFsBridge = {
        resolvePath: ({ filePath }) => ({
          hostPath: hostPath(filePath),
          relativePath: path.relative(root, hostPath(filePath)),
          containerPath: `/workspace/${path.relative(root, hostPath(filePath))}`,
        }),
        readFile: ({ filePath }) => fs.readFile(hostPath(filePath)),
        writeFile: async ({ filePath, data }) => {
          await fs.writeFile(hostPath(filePath), data);
        },
        mkdirp: async ({ filePath }) => {
          await fs.mkdir(hostPath(filePath), { recursive: true });
        },
        remove: async ({ filePath }) => {
          await fs.rm(hostPath(filePath), { force: true });
        },
        rename: async ({ from, to }) => {
          await fs.rename(hostPath(from), hostPath(to));
        },
        stat: async ({ filePath }) => {
          const found = await fs.stat(hostPath(filePath)).catch(() => null);
          return found
            ? {
                type: found.isFile() ? "file" : "directory",
                size: found.size,
                mtimeMs: found.mtimeMs,
              }
            : null;
        },
      };
      const native = createCodexDynamicToolBridge({
        tools: [createSandboxedWriteTool({ root, bridge })],
        signal: new AbortController().signal,
      });
      const written = await native.handleToolCall({
        threadId: "virtual-thread",
        turnId: "virtual-turn",
        callId: "virtual-write",
        namespace: null,
        tool: "write",
        arguments: { path: "/workspace/QA virtual.csv", content: "QA_ORIGINAL,20\n" },
      });
      expect(written.success).toBe(true);
      expect(native.telemetry.toolMediaUrls).toHaveLength(1);
      expect(native.telemetry.toolStagedFileSources).toEqual([
        {
          mediaUrl: native.telemetry.toolMediaUrls[0],
          sources: [path.join(root, "QA virtual.csv"), "/workspace/QA virtual.csv"],
        },
      ]);
      await fs.unlink(path.join(root, "QA virtual.csv"));
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const payloads = mergeAttemptToolMediaPayloads({
        payloads: [{ text: "[File](</workspace/QA virtual.csv>)" }],
        toolMediaUrls: native.telemetry.toolMediaUrls,
        hostOwnedToolMediaUrls: new CodexGeneratedMediaProjection(cfg).buildHostOwnedMediaUrls(
          native.telemetry,
        ),
        toolStagedFileSources: native.telemetry.toolStagedFileSources,
      });
      const normalized = await normalizeAgentRunReplyMedia({
        cfg,
        agentId: "main",
        workspaceDir: root,
        sandboxRoot: root,
        payloads,
      });
      expect(normalized.payloads?.[0]?.mediaUrls).toEqual(native.telemetry.toolMediaUrls);
      expect(normalized.payloads?.[0]?.text).toBe("File");
      expect(await fs.readFile(normalized.payloads![0]!.mediaUrls![0]!, "utf8")).toBe(
        "QA_ORIGINAL,20\n",
      );
      expect(JSON.stringify(normalized.payloads)).not.toContain("stagedFileSources");
    });
  });

  it("keeps only the latest successful snapshot across write and repeated exec exports", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("shared-exports");
      await fs.mkdir(root, { recursive: true });
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const tools = createCoreCodingTools({
        codingRoot: root,
        containmentRoot: root,
        includeBaseCodingTools: true,
        baseToolNames: ["write"],
        includeShellTools: true,
        workspaceOnly: true,
        readOnly: false,
        applyPatchEnabled: false,
        applyPatchWorkspaceOnly: true,
        processDefaults: {},
        execDefaults: {
          config: cfg,
          agentId: "main",
          host: "gateway",
          mode: "full",
          security: "full",
          ask: "off",
          bypassHostApprovalFloors: true,
          autoReviewer: async () => ({
            decision: "allow-once",
            rationale: "isolated fixture",
            risk: "low",
          }),
        },
      });
      const bridge = createCodexDynamicToolBridge({ tools, signal: new AbortController().signal });
      const call = async (tool: string, args: Record<string, unknown>, callId: string) =>
        bridge.handleToolCall({
          threadId: "shared-thread",
          turnId: "shared-turn",
          callId,
          namespace: null,
          tool,
          arguments: args,
        });
      expect(
        (await call("write", { path: "report.csv", content: "QA,1\n" }, "write-first")).success,
      ).toBe(true);
      const first = bridge.telemetry.toolMediaUrls[0]!;
      const script = "require('node:fs').writeFileSync('report.csv','QA,2\\n')";
      const args = {
        command: `${shellQuote(process.execPath)} -e ${shellQuote(script)}`,
        exportPaths: ["report.csv"],
      };
      expect((await call("exec", args, "exec-rewrite")).success).toBe(true);
      expect(bridge.telemetry.toolMediaUrls).toHaveLength(1);
      const second = bridge.telemetry.toolMediaUrls[0]!;
      expect(await fs.readFile(first, "utf8")).toBe("QA,1\n");
      expect((await call("exec", args, "exec-again")).success).toBe(true);
      expect(bridge.telemetry.toolMediaUrls).toHaveLength(1);
      expect(await fs.readFile(second, "utf8")).toBe("QA,2\n");
      expect(await fs.readFile(bridge.telemetry.toolMediaUrls[0]!, "utf8")).toBe("QA,2\n");
      expect(
        new CodexGeneratedMediaProjection(cfg).buildHostOwnedMediaUrls(bridge.telemetry),
      ).toEqual(bridge.telemetry.toolMediaUrls);
    });
  });

  it("rejects NTFS alternate-stream components without blocking ordinary export names", () => {
    const platform = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    try {
      expect(isWorkspaceExportPath("/workspace", "/workspace/report.csv")).toBe(true);
      expect(isWorkspaceExportPath("/workspace", "/workspace/USER.md::$DATA")).toBe(false);
      expect(isWorkspaceExportPath("/workspace", "/workspace/report.csv:private")).toBe(false);
    } finally {
      platform.mockRestore();
    }
  });

  it("seals declared XLSX and PNG before a bare-filename final and restores one canonical direct row", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("exec-exports");
      await fs.mkdir(root, { recursive: true });
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const scope = {
        agentId: "main",
        sessionKey: "agent:main:dashboard:exec-exports",
        sessionId: "exec-exports",
        storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
      };
      await upsertSessionEntryCore(scope, {
        sessionId: scope.sessionId,
        updatedAt: 1,
        spawnedWorkspaceDir: root,
      });
      const exec = createCoreCodingTools({
        codingRoot: root,
        containmentRoot: root,
        includeBaseCodingTools: false,
        includeShellTools: true,
        workspaceOnly: true,
        readOnly: false,
        applyPatchEnabled: false,
        applyPatchWorkspaceOnly: true,
        execDefaults: {
          config: cfg,
          ...scope,
          host: "gateway",
          mode: "full",
          security: "full",
          ask: "off",
          bypassHostApprovalFloors: true,
          autoReviewer: async () => ({
            decision: "allow-once",
            rationale: "isolated fixture workspace",
            risk: "low",
          }),
        },
        processDefaults: {},
      }).find((tool) => tool.name === "exec")!;
      expect(exec.description).toContain("exportPaths");
      expect(exec.parameters).toHaveProperty("properties.exportPaths");
      // Native sandbox alias uses this same exec owner; collector must preserve the exact sealed sources.
      const bridge = createCodexDynamicToolBridge({
        tools: [{ ...exec, name: "sandbox_exec" }],
        signal: new AbortController().signal,
      });
      const xlsx = await workbookBuffer();
      const png = createSolidPngBuffer(8, 6, { r: 20, g: 100, b: 180 });
      const names = ["QA Excel chỉ tên.xlsx", "QA hình chỉ tên.png"];
      const script = `const fs=require('node:fs');setTimeout(()=>{fs.writeFileSync(${JSON.stringify(names[0])},Buffer.from(${JSON.stringify(xlsx.toString("base64"))},'base64'));fs.writeFileSync(${JSON.stringify(names[1])},Buffer.from(${JSON.stringify(png.toString("base64"))},'base64'));},50);`;
      const result = await bridge.handleToolCall({
        threadId: "thread-exec",
        turnId: "turn-exec",
        callId: "export-binary",
        namespace: null,
        tool: "sandbox_exec",
        arguments: {
          command: `${shellQuote(process.execPath)} -e ${shellQuote(script)}`,
          exportPaths: names,
          yieldMs: 10,
          timeoutSeconds: 10,
        },
      });
      expect(result.success).toBe(true);
      expect(bridge.telemetry.toolMediaUrls).toHaveLength(2);
      const projection = new CodexGeneratedMediaProjection(cfg);
      expect(projection.buildHostOwnedMediaUrls(bridge.telemetry)).toEqual(
        bridge.telemetry.toolMediaUrls,
      );
      const aliasSnapshot = createWorkspaceExecExportSnapshot({
        cfg,
        ...scope,
        workspaceDir: root,
        containerWorkdir: "/workspace",
      });
      const aliases = await aliasSnapshot([path.join(root, names[0]!), `/workspace/${names[0]}`]);
      expect(aliases.mediaUrls).toHaveLength(1);
      expect(await fs.readFile(aliases.mediaUrls[0]!)).toEqual(xlsx);
      await fs.writeFile(path.join(root, names[0]!), "newer unrelated bytes");
      await fs.rm(path.join(root, names[1]!));
      const text = `Đã tạo **${names[0]}** và **${names[1]}**.`;
      const key = "native-binary-final";
      await appendAssistantMessageToSessionTranscript({
        ...scope,
        config: cfg,
        text,
        idempotencyKey: key,
      });
      const normalized = await normalizeAgentRunReplyMedia({
        cfg,
        ...scope,
        runId: "exec-run",
        workspaceDir: root,
        payloads: mergeAttemptToolMediaPayloads({
          payloads: [
            setReplyPayloadMetadata(
              { text },
              { assistantTranscriptOwned: true, assistantTranscriptIdempotencyKey: key },
            ),
          ],
          toolMediaUrls: bridge.telemetry.toolMediaUrls,
          toolStagedFileSources: bridge.telemetry.toolStagedFileSources,
          hostOwnedToolMediaUrls: projection.buildHostOwnedMediaUrls(bridge.telemetry),
        }),
        terminalReply: { disposition: "visible", text },
      });
      const dispatch = createChatSendReplyDispatch({
        accountId: undefined,
        isAgentRunStarted: () => true,
        logGateway: createSubsystemLogger("gateway/chat/exec-export-test"),
        userTurnRecorder: { markBlocked: vi.fn() },
        session: {
          agentId: scope.agentId,
          backingSessionId: scope.sessionId,
          cfg,
          clientRunId: "exec-run",
          sessionKey: scope.sessionKey,
          sessionLoadOptions: { agentId: scope.agentId },
        },
      });
      await dispatch.runAgentMediaTranscript(
        { run: async (operation) => await operation() },
        async () => {
          for (const payload of normalized.payloads ?? []) {
            await dispatch.dispatcherOptions.deliver(payload, { kind: "final" });
          }
        },
      );
      const rows = await readSessionMessagesAsync(scope, { mode: "full" });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ idempotencyKey: key });
      const blocks = (rows[0] as { content: Record<string, unknown>[] }).content.filter(
        (block) => block.type === "file" || block.type === "image",
      );
      expect(blocks.map((block) => block.type)).toEqual(["file", "image"]);
      expect(blocks[0]?.fileName).toBe(names[0]);
      await fs.rm(root, { recursive: true });
      const sources = await Promise.all(
        blocks.map((block) =>
          resolveManagedOutgoingMediaArtifactSource({
            sessionKey: scope.sessionKey,
            artifactId: String(block.artifactId),
          }),
        ),
      );
      expect(await fs.readFile(sources[0]!.path)).toEqual(xlsx);
      expect(await fs.readFile(sources[1]!.path)).toEqual(png);
      expect(await readSessionMessagesAsync(scope, { mode: "full" })).toEqual(rows);
      // Unsupported execution must not run first then export a same-named local file.
      for (const args of [{ background: true }, { host: "node" }]) {
        const rejected = await bridge.handleToolCall({
          threadId: "thread-exec",
          turnId: "turn-exec",
          callId: "unsupported",
          namespace: null,
          tool: "sandbox_exec",
          arguments: { command: "echo should-not-run", exportPaths: ["report.xlsx"], ...args },
        });
        expect(rejected.success).toBe(false);
      }
      expect(bridge.telemetry.toolMediaUrls).toHaveLength(2);
    });
  });

  it("denies private, outside, symlink and read-disallowed sources and removes partially sealed files", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("export-boundary");
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "good.csv"), "QA,1\n");
      await fs.writeFile(state.path("outside.csv"), "private\n");
      await fs.symlink(state.path("outside.csv"), path.join(root, "linked.csv"));
      await fs.writeFile(path.join(root, ".env"), "private\n");
      await fs.symlink(path.join(root, ".env"), path.join(root, "private-alias.csv"));
      await fs.link(state.path("outside.csv"), path.join(root, "hardlink.csv"));
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const snapshot = createWorkspaceExecExportSnapshot({
        cfg,
        agentId: "main",
        workspaceDir: root,
      });
      for (const source of [
        ".env",
        "memory/report.csv",
        "config/export.csv",
        "AGENTS.md",
        "../outside.csv",
        "linked.csv",
        "private-alias.csv",
        "hardlink.csv",
        "https://example.com/report.csv",
      ]) {
        await expect(snapshot([source])).rejects.toThrow();
      }
      const denied = createWorkspaceExecExportSnapshot({
        cfg: { ...cfg, tools: { deny: ["read"] } },
        agentId: "main",
        workspaceDir: root,
      });
      await expect(denied(["good.csv"])).rejects.toThrow();
      await expect(snapshot(["good.csv", "missing.csv"])).rejects.toThrow();
      const outbound = state.path("media", "outbound");
      expect(await fs.readdir(outbound).catch(() => [])).toEqual([]);
    });
  });
});
