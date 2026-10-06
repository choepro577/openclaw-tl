import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCodexDynamicToolBridge,
  CodexGeneratedMediaProjection,
} from "../../../extensions/codex/api.js";
import { createCoreCodingTools } from "../../agents/core-coding-tools.js";
import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import { createMemoryWriteProvenanceObserver } from "../../agents/memory-write-provenance.js";
import type { SandboxBackendCommandParams } from "../../agents/sandbox/backend-handle.types.js";
import { createRemoteShellSandboxFsBridge } from "../../agents/sandbox/remote-fs-bridge.js";
import { createLocalRemoteShellScriptRunner } from "../../agents/sandbox/remote-fs-bridge.test-helpers.js";
import { createSandboxTestContext } from "../../agents/sandbox/test-fixtures.js";
import { createWorkspaceExecExportSnapshot } from "../../agents/workspace-exec-exports.js";
import { normalizeAgentRunReplyMedia } from "../../auto-reply/reply/reply-media-paths.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

describe("remote sandbox returned files", () => {
  it.runIf(process.platform !== "win32")(
    "seals verified remote writes and declared exports without reading a stale local mirror",
    async () => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("local-mirror");
        const remote = state.path("remote-workspace");
        await Promise.all([fs.mkdir(root), fs.mkdir(remote)]);
        const name = "QA báo cáo remote.csv";
        const localPath = path.join(root, name);
        const remotePath = path.join(remote, name);
        await fs.writeFile(localPath, "STALE_LOCAL,0\n");
        const runScript = createLocalRemoteShellScriptRunner();
        const runShellCommand = async (command: SandboxBackendCommandParams) => {
          // macOS stat has a different CLI; return GNU metadata from the real fixture inode.
          if (process.platform === "darwin" && command.script.includes('stat -c "%F|')) {
            const stat = await fs.lstat(command.args![0]!).catch(() => null);
            const kind = stat?.isFile() ? "regular file" : "directory";
            const metadata = stat
              ? command.script.includes("%h")
                ? `${kind}|${stat.nlink}`
                : `${kind}|${stat.size}|${stat.mtimeMs / 1000}`
              : "";
            return { stdout: Buffer.from(metadata), stderr: Buffer.alloc(0), code: 0 };
          }
          return await runScript(command);
        };
        const sandbox = createSandboxTestContext({
          overrides: {
            backendId: "ssh",
            workspaceDir: root,
            agentWorkspaceDir: root,
            containerWorkdir: remote,
            backend: {
              id: "ssh",
              runtimeId: "remote-fixture",
              runtimeLabel: "remote-fixture",
              workdir: remote,
              runShellCommand,
              buildExecSpec: async ({ command }) => ({
                // Exercise the existing remote contract locally, without an SSH server.
                argv: ["sh", "-c", command],
                env: process.env,
                stdinMode: "pipe-closed",
              }),
            },
          },
        });
        const fsBridge = createRemoteShellSandboxFsBridge({
          sandbox,
          runtime: {
            remoteWorkspaceDir: remote,
            remoteAgentWorkspaceDir: remote,
            runRemoteShellScript: runShellCommand,
          },
        });
        sandbox.fsBridge = fsBridge;
        expect(fsBridge.resolvePath({ filePath: remotePath })).toEqual({
          relativePath: name,
          containerPath: remotePath,
        });
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
          sandbox,
          memoryWriteProvenance: createMemoryWriteProvenanceObserver({
            mutationRoot: root,
            workspaceDir: root,
            resolveOriginClass: () => "untrusted",
          }),
          applyPatchEnabled: false,
          applyPatchWorkspaceOnly: true,
          processDefaults: {},
          execDefaults: { config: cfg, agentId: "main", host: "sandbox" },
        });
        const native = createCodexDynamicToolBridge({
          tools,
          signal: new AbortController().signal,
        });
        const written = await native.handleToolCall({
          threadId: "remote-thread",
          turnId: "remote-turn",
          callId: "remote-write",
          namespace: null,
          tool: "write",
          arguments: { path: remotePath, content: "VERIFIED_WRITE,1\n" },
        });
        expect(written.success, JSON.stringify(written)).toBe(true);
        expect(native.telemetry.toolMediaUrls).toHaveLength(1);
        const writeSnapshot = native.telemetry.toolMediaUrls[0]!;
        expect(await fs.readFile(writeSnapshot, "utf8")).toBe("VERIFIED_WRITE,1\n");
        expect(await fs.readFile(localPath, "utf8")).toBe("STALE_LOCAL,0\n");
        const latest = "VERIFIED_REMOTE_EXEC,2\n";
        const script = `require('node:fs').writeFileSync(${JSON.stringify(remotePath)},${JSON.stringify(latest)})`;
        const exported = await native.handleToolCall({
          threadId: "remote-thread",
          turnId: "remote-turn",
          callId: "remote-exec",
          namespace: null,
          tool: "exec",
          arguments: {
            command: `${shellQuote(process.execPath)} -e ${shellQuote(script)}`,
            exportPaths: [remotePath, localPath, name],
          },
        });
        expect(exported.success, JSON.stringify(exported)).toBe(true);
        expect(native.telemetry.toolMediaUrls).toHaveLength(1);
        expect(native.telemetry.toolStagedFileSources).toEqual([
          { mediaUrl: native.telemetry.toolMediaUrls[0], sources: [localPath, remotePath] },
        ]);
        expect(await fs.readFile(writeSnapshot, "utf8")).toBe("VERIFIED_WRITE,1\n");
        expect(await fs.readFile(localPath, "utf8")).toBe("STALE_LOCAL,0\n");
        const snapshot = createWorkspaceExecExportSnapshot({
          workspaceDir: root,
          bridge: fsBridge,
          cfg,
          agentId: "main",
        });
        await fs.writeFile(path.join(remote, ".env"), "PRIVATE\n");
        await fs.symlink(path.join(remote, ".env"), path.join(remote, "private.csv"));
        await fs.link(remotePath, path.join(remote, "hardlink.csv"));
        for (const source of [
          ".env",
          "memory/report.csv",
          "../outside.csv",
          "private.csv",
          "hardlink.csv",
        ]) {
          await expect(snapshot([source])).rejects.toThrow();
        }
        await fs.unlink(path.join(remote, "hardlink.csv"));
        await expect(fsBridge.readFile({ filePath: name, maxBytes: 1 })).rejects.toThrow(
          /bounded read limit/i,
        );
        await expect(
          createWorkspaceExecExportSnapshot({
            workspaceDir: root,
            bridge: fsBridge,
            cfg: { ...cfg, tools: { deny: ["read"] } },
            agentId: "main",
          })([name]),
        ).rejects.toThrow(/read permission/i);
        const outbound = path.dirname(native.telemetry.toolMediaUrls[0]!);
        const before = await fs.readdir(outbound);
        await expect(snapshot([name, "missing.csv"])).rejects.toThrow();
        expect(await fs.readdir(outbound)).toEqual(before);
        await fs.unlink(remotePath);
        const normalized = await normalizeAgentRunReplyMedia({
          cfg,
          agentId: "main",
          workspaceDir: root,
          sandboxRoot: root,
          payloads: mergeAttemptToolMediaPayloads({
            payloads: [
              { text: `Đã tạo [báo cáo](<${remotePath}>) và [cùng file](<${localPath}>).` },
            ],
            toolMediaUrls: native.telemetry.toolMediaUrls,
            hostOwnedToolMediaUrls: new CodexGeneratedMediaProjection(cfg).buildHostOwnedMediaUrls(
              native.telemetry,
            ),
            toolStagedFileSources: native.telemetry.toolStagedFileSources,
          }),
        });
        expect(normalized.payloads?.[0]?.mediaUrls).toEqual(native.telemetry.toolMediaUrls);
        expect(normalized.payloads?.[0]?.attachments?.[0]?.name).toBe(name);
        expect(normalized.payloads?.[0]?.text).toBe("Đã tạo báo cáo và cùng file.");
        expect(await fs.readFile(normalized.payloads![0]!.mediaUrls![0]!, "utf8")).toBe(latest);
        expect(JSON.stringify(normalized.payloads)).not.toContain(remotePath);
        const remoteReports = path.join(remote, "reports");
        await fs.mkdir(remoteReports);
        await expect(fs.access(path.join(root, "reports"))).rejects.toThrow();
        const nested = await native.handleToolCall({
          threadId: "remote-thread",
          turnId: "remote-turn",
          callId: "remote-nested-write",
          namespace: null,
          tool: "write",
          arguments: {
            path: path.join(remoteReports, "QA remote.csv"),
            content: "VERIFIED_NESTED_REMOTE,3\n",
          },
        });
        expect(nested.success, JSON.stringify(nested)).toBe(true);
        expect(native.telemetry.toolMediaUrls).toHaveLength(2);
        expect(await fs.readFile(native.telemetry.toolMediaUrls[1]!, "utf8")).toBe(
          "VERIFIED_NESTED_REMOTE,3\n",
        );
        await expect(fs.access(path.join(root, "reports"))).rejects.toThrow();
      });
    },
  );
});
