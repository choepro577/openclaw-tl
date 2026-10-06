import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCodexDynamicToolBridge } from "../../../extensions/codex/api.js";
import { createCoreCodingTools } from "../../agents/core-coding-tools.js";
import { createMemoryWriteProvenanceObserver } from "../../agents/memory-write-provenance.js";
import type { SandboxFsBridge } from "../../agents/sandbox/fs-bridge.types.js";
import { createSandboxTestContext } from "../../agents/sandbox/test-fixtures.js";
import { readMemoryArtifactProvenance } from "../../memory/memory-artifact-provenance.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";

describe("sandbox mutation provenance identity", () => {
  it("maps virtual write/edit paths before the real memory observer when workspaceOnly is false", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("sandbox-provenance");
      await fs.mkdir(root);
      const source = (filePath: string) =>
        path.resolve(
          root,
          filePath.startsWith("/workspace/") || filePath === "/workspace"
            ? path.relative("/workspace", filePath)
            : filePath,
        );
      const bridge: SandboxFsBridge = {
        resolvePath: ({ filePath }) => ({
          hostPath: source(filePath),
          relativePath: path.relative(root, source(filePath)),
          containerPath: `/workspace/${path.relative(root, source(filePath))}`,
        }),
        readFile: ({ filePath }) => fs.readFile(source(filePath)),
        writeFile: ({ filePath, data }) => fs.writeFile(source(filePath), data),
        mkdirp: async ({ filePath }) => {
          await fs.mkdir(source(filePath), { recursive: true });
        },
        remove: ({ filePath }) => fs.rm(source(filePath), { force: true }),
        rename: ({ from, to }) => fs.rename(source(from), source(to)),
        stat: async ({ filePath }) => {
          const found = await fs.stat(source(filePath)).catch(() => null);
          return found
            ? {
                type: found.isFile() ? "file" : "directory",
                size: found.size,
                mtimeMs: found.mtimeMs,
              }
            : null;
        },
      };
      const tools = createCoreCodingTools({
        codingRoot: root,
        containmentRoot: root,
        includeBaseCodingTools: true,
        baseToolNames: ["write", "edit"],
        includeShellTools: false,
        workspaceOnly: false,
        readOnly: false,
        sandbox: createSandboxTestContext({
          overrides: { workspaceDir: root, agentWorkspaceDir: root, fsBridge: bridge },
        }),
        memoryWriteProvenance: createMemoryWriteProvenanceObserver({
          mutationRoot: root,
          workspaceDir: root,
          resolveOriginClass: () => "untrusted",
          now: () => 1,
        }),
        applyPatchEnabled: false,
        applyPatchWorkspaceOnly: true,
        execDefaults: {},
        processDefaults: {},
      });
      const native = createCodexDynamicToolBridge({ tools, signal: new AbortController().signal });
      const call = (tool: string, args: Record<string, unknown>, callId: string) =>
        native.handleToolCall({
          threadId: "provenance-thread",
          turnId: "provenance-turn",
          callId,
          namespace: null,
          tool,
          arguments: args,
        });
      const csv = await call(
        "write",
        { path: "/workspace/QA đường dẫn sandbox.csv", content: "QA_ABSOLUTE,20\n" },
        "write-csv",
      );
      expect(csv.success, JSON.stringify(csv)).toBe(true);
      expect(native.telemetry.toolMediaUrls).toHaveLength(1);
      expect(await fs.readFile(native.telemetry.toolMediaUrls[0]!, "utf8")).toBe(
        "QA_ABSOLUTE,20\n",
      );
      const memory = await call(
        "write",
        { path: "/workspace/MEMORY.md", content: "untrusted first\n" },
        "write-memory",
      );
      expect(memory.success, JSON.stringify(memory)).toBe(true);
      const edited = await call(
        "edit",
        { path: "/workspace/MEMORY.md", oldText: "first", newText: "second" },
        "edit-memory",
      );
      expect(edited.success, JSON.stringify(edited)).toBe(true);
      const content = "untrusted second\n";
      expect(await fs.readFile(path.join(root, "MEMORY.md"), "utf8")).toBe(content);
      expect(
        await readMemoryArtifactProvenance({ workspaceDir: root, relativePath: "MEMORY.md" }),
      ).toEqual({
        fileHash: createHash("sha256").update(content).digest("hex"),
        originClass: "untrusted",
        observedAt: 1,
      });
      // Memory content retains its provenance and never becomes a downloadable user export.
      expect(native.telemetry.toolMediaUrls).toHaveLength(1);
    });
  });
});
