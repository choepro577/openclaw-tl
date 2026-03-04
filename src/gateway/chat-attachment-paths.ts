import fs from "node:fs/promises";
import path from "node:path";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
import type { ActiveMediaModel } from "../media-understanding/runner.js";
import { assertSandboxPath } from "../agents/sandbox-paths.js";
import { buildInboundMediaNote } from "../auto-reply/media-note.js";
import { loadConfig } from "../config/config.js";
import { applyMediaUnderstanding } from "../media-understanding/apply.js";
import { MEDIA_MAX_BYTES, getMediaDir } from "../media/store.js";

const DEFAULT_MAX_PATHS = 5;

type AttachmentPathLog = {
  warn: (message: string) => void;
  info?: (message: string) => void;
};

export type AttachmentPathParseOptions = {
  maxPaths?: number;
  maxBytes?: number;
  log?: AttachmentPathLog;
  cfg?: OpenClawConfig;
  sessionKey?: string;
  surface?: string;
  chatType?: string;
  agentDir?: string;
  activeModel?: ActiveMediaModel;
};

function normalizeSinglePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export function normalizeAttachmentPathsInput(params: {
  attachment_paths?: unknown;
  attachmentPaths?: unknown;
}): string[] {
  const values = [
    ...(Array.isArray(params.attachment_paths) ? params.attachment_paths : []),
    ...(Array.isArray(params.attachmentPaths) ? params.attachmentPaths : []),
  ];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = normalizeSinglePath(value);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
}

async function validateAttachmentPath(params: {
  rawPath: string;
  maxBytes: number;
  mediaDir: string;
}): Promise<string> {
  const { rawPath, maxBytes, mediaDir } = params;
  if (!path.isAbsolute(rawPath)) {
    throw new Error(`attachment path must be absolute: ${rawPath}`);
  }

  const resolved = await assertSandboxPath({
    filePath: rawPath,
    cwd: mediaDir,
    root: mediaDir,
  });
  const stat = await fs.stat(resolved.resolved).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error(`attachment path not found: ${rawPath}`);
  }
  if (stat.size > maxBytes) {
    throw new Error(`attachment path exceeds size limit (${stat.size} > ${maxBytes} bytes)`);
  }
  return resolved.resolved;
}

function createAttachmentContext(params: {
  message: string;
  paths: string[];
  sessionKey?: string;
  surface?: string;
  chatType?: string;
}): MsgContext {
  const { message, paths, sessionKey, surface, chatType } = params;
  return {
    Body: message,
    BodyForAgent: message,
    BodyForCommands: message,
    RawBody: message,
    CommandBody: message,
    MediaPath: paths[0],
    MediaPaths: paths,
    SessionKey: sessionKey,
    Surface: surface,
    Provider: surface,
    ChatType: chatType,
  };
}

export async function parseMessageWithAttachmentPaths(
  message: string,
  attachmentPaths: string[] | undefined,
  opts?: AttachmentPathParseOptions,
): Promise<{ message: string; attachmentPaths: string[]; mediaNote?: string }> {
  if (!attachmentPaths || attachmentPaths.length === 0) {
    return {
      message,
      attachmentPaths: [],
    };
  }
  const maxPaths = opts?.maxPaths ?? DEFAULT_MAX_PATHS;
  const maxBytes = opts?.maxBytes ?? MEDIA_MAX_BYTES;
  if (attachmentPaths.length > maxPaths) {
    throw new Error(`attachment paths exceed limit (${attachmentPaths.length} > ${maxPaths})`);
  }

  const mediaDir = getMediaDir();
  const resolvedPaths: string[] = [];
  for (const rawPath of attachmentPaths) {
    const resolved = await validateAttachmentPath({
      rawPath,
      maxBytes,
      mediaDir,
    });
    resolvedPaths.push(resolved);
  }

  const ctx = createAttachmentContext({
    message,
    paths: resolvedPaths,
    sessionKey: opts?.sessionKey,
    surface: opts?.surface,
    chatType: opts?.chatType,
  });
  const cfg = opts?.cfg ?? loadConfig();
  let nextMessage = message.trim();
  try {
    await applyMediaUnderstanding({
      ctx,
      cfg,
      agentDir: opts?.agentDir,
      activeModel: opts?.activeModel,
    });
  } catch (err) {
    opts?.log?.warn(`ws-attachment-paths: failed to enrich message (${String(err)})`);
  }
  const bodyFromContext = typeof ctx.Body === "string" ? ctx.Body.trim() : "";
  if (bodyFromContext) {
    nextMessage = bodyFromContext;
  }
  const mediaNote = buildInboundMediaNote(ctx);
  const outputsCount = Array.isArray(ctx.MediaUnderstanding) ? ctx.MediaUnderstanding.length : 0;
  const decisionsCount = Array.isArray(ctx.MediaUnderstandingDecisions)
    ? ctx.MediaUnderstandingDecisions.length
    : 0;
  opts?.log?.info?.(
    `ws-attachment-paths: parsed=${resolvedPaths.length} outputs=${outputsCount} decisions=${decisionsCount} mediaNote=${mediaNote ? "yes" : "no"}`,
  );
  return {
    message: nextMessage,
    attachmentPaths: resolvedPaths,
    mediaNote: mediaNote || undefined,
  };
}
