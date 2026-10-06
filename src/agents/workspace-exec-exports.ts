import path from "node:path";
import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { readFileWithinRoot } from "../infra/fs-safe.js";
import { createBoundedOutboundMediaReadFile } from "../media/bounded-read-file.js";
import { resolveOutboundMediaMaxBytes } from "../media/configured-max-bytes.js";
import { resolveOutboundAttachmentFromUrl } from "../media/outbound-attachment.js";
import { resolveAgentScopedOutboundMediaAccess } from "../media/read-capability.js";
import { deleteMediaBuffer } from "../media/store.js";
import { resolveAgentConfig } from "./agent-scope.js";
import { resolveConfiguredToolPolicies } from "./agent-tools.policy.js";
import { createExecHostResolver } from "./bash-tools.exec-support.js";
import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec-types.js";
import type { execSchema } from "./bash-tools.schemas.js";
import type { SandboxFsBridge } from "./sandbox/fs-bridge.types.js";
import { isToolAllowedByPolicies } from "./tool-policy-match.js";
import type { AgentToolWithMeta } from "./tools/common.js";
import { isWorkspaceExportPath, recordWorkspaceExportSnapshots } from "./workspace-write-media.js";

/** Explicit current-call read/export request; never discovers files from commands or history. */
export function createWorkspaceExecExportSnapshot(params: {
  workspaceDir: string;
  bridge?: SandboxFsBridge;
  containerWorkdir?: string;
  cfg: OpenClawConfig;
  agentId?: string;
  sessionKey?: string;
  messageProvider?: string;
  accountId?: string;
  snapshots?: Map<string, string>;
}) {
  const snapshots = params.snapshots ?? new Map<string, string>();
  return async (paths: readonly string[], signal?: AbortSignal) => {
    const policies = resolveConfiguredToolPolicies({
      cfg: params.cfg,
      agentId: params.agentId,
      agentTools: params.agentId
        ? resolveAgentConfig(params.cfg, params.agentId)?.tools
        : undefined,
    });
    if (!isToolAllowedByPolicies("read", policies)) {
      throw new Error("Workspace exports require the existing read permission.");
    }
    const sourceAliases = new Map<string, string[]>();
    const candidates = [
      ...new Set(
        paths.map((input) => {
          const value = input.trim();
          if (
            !value ||
            value.includes("\0") ||
            (!path.isAbsolute(value) && /^[a-z][a-z0-9+.-]*:/i.test(value))
          ) {
            throw new Error(
              "Export paths must name non-private files inside the current workspace.",
            );
          }
          const resolved = params.bridge?.resolvePath({ filePath: value });
          const relative =
            resolved?.relativePath ??
            (path.isAbsolute(value) &&
            params.containerWorkdir &&
            isWorkspaceExportPath(params.containerWorkdir, value)
              ? path.relative(params.containerWorkdir, value)
              : value);
          const candidate = path.resolve(params.workspaceDir, relative);
          if (!isWorkspaceExportPath(params.workspaceDir, candidate)) {
            throw new Error(
              "Export paths must name non-private files inside the current workspace.",
            );
          }
          sourceAliases.set(candidate, [
            ...new Set([candidate, ...(resolved ? [resolved.containerPath] : [])]),
          ]);
          return candidate;
        }),
      ),
    ];
    const saved: string[] = [];
    const maxBytes = resolveOutboundMediaMaxBytes({
      cfg: params.cfg,
      channel: params.messageProvider,
      accountId: params.accountId,
    });
    const readFile = createBoundedOutboundMediaReadFile(async (filePath, limits) =>
      params.bridge
        ? params.bridge.readFile({ filePath, maxBytes: limits?.maxBytes ?? maxBytes, signal })
        : (
            await readFileWithinRoot({
              rootDir: params.workspaceDir,
              relativePath: path.relative(params.workspaceDir, filePath),
              maxBytes: limits?.maxBytes ?? maxBytes,
            })
          ).buffer,
    );
    try {
      for (const source of candidates) {
        signal?.throwIfAborted();
        const mediaAccess = resolveAgentScopedOutboundMediaAccess({
          cfg: params.cfg,
          agentId: params.agentId,
          workspaceDir: params.workspaceDir,
          sessionKey: params.sessionKey,
          messageProvider: params.messageProvider,
          accountId: params.accountId,
          mediaSources: [source],
          mediaReadFile: readFile,
        });
        const result = await resolveOutboundAttachmentFromUrl(source, maxBytes, { mediaAccess });
        saved.push(result.path);
        signal?.throwIfAborted();
      }
      const replacedMediaUrls = recordWorkspaceExportSnapshots(
        snapshots,
        candidates.map((source, index) => ({ source, url: saved[index]! })),
      );
      return {
        mediaUrls: saved,
        stagedFileSources: candidates.map((source, index) => ({
          mediaUrl: saved[index]!,
          sources: sourceAliases.get(source) ?? [source],
        })),
        trustedLocalMedia: true as const,
        ...(replacedMediaUrls.length ? { replacedMediaUrls } : {}),
      };
    } catch (error) {
      await Promise.all(
        saved.map((file) => deleteMediaBuffer(path.basename(file), "outbound").catch(() => {})),
      );
      throw error;
    }
  };
}

/** The exec lifecycle owns completion; exports only follow a proven successful foreground exit. */
export function withWorkspaceExecExports(
  tool: AgentToolWithMeta<typeof execSchema, ExecToolDetails>,
  defaults?: ExecToolDefaults,
) {
  return {
    ...tool,
    execute: async (...args: Parameters<typeof tool.execute>) => {
      const paths = asOptionalRecord(args[1])?.exportPaths;
      if (paths === undefined) {
        return await tool.execute(...args);
      }
      if (
        !Array.isArray(paths) ||
        paths.length < 1 ||
        paths.length > 19 ||
        !paths.every((value) => typeof value === "string" && value.trim())
      ) {
        throw new Error("exportPaths must contain 1 to 19 workspace file paths.");
      }
      if (asOptionalRecord(args[1])?.background === true || !defaults?.snapshotExports) {
        throw new Error(
          "exportPaths requires foreground execution with workspace file access; background exports are unavailable.",
        );
      }
      const host = createExecHostResolver(defaults)(args[1]);
      if (host === "node" || (defaults.sandbox && host !== "sandbox")) {
        throw new Error(
          "exportPaths must execute in the current workspace; remote nodes and sandbox host overrides are unavailable.",
        );
      }
      const result = await tool.execute(...args);
      if (result.details?.status !== "completed" || result.details.exitCode !== 0) {
        return {
          ...result,
          content: [
            ...result.content,
            {
              type: "text" as const,
              text: "No files were exported: execution did not complete successfully in the foreground.",
            },
          ],
        };
      }
      try {
        args[2]?.throwIfAborted();
        const media = await defaults.snapshotExports(paths, args[2]);
        args[2]?.throwIfAborted();
        return { ...result, details: { ...result.details, media } };
      } catch (error) {
        args[2]?.throwIfAborted();
        return {
          ...result,
          content: [
            ...result.content,
            {
              type: "text" as const,
              text: `Command completed, but declared files could not be exported: ${String(error)}. Check the workspace paths and permissions.`,
            },
          ],
        };
      }
    },
  };
}
