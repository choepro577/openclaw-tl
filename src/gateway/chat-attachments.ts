import path from "node:path";
import { estimateBase64DecodedBytes } from "../media/base64.js";
import {
  DEFAULT_INPUT_FILE_MAX_BYTES,
  DEFAULT_INPUT_FILE_MAX_CHARS,
  DEFAULT_INPUT_FILE_MIMES,
  DEFAULT_INPUT_MAX_REDIRECTS,
  DEFAULT_INPUT_PDF_MAX_PAGES,
  DEFAULT_INPUT_PDF_MAX_PIXELS,
  DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
  DEFAULT_INPUT_TIMEOUT_MS,
  extractFileContentFromSource,
  normalizeMimeList,
  type InputFileExtractResult,
  type InputFileLimits,
} from "../media/input-files.js";
import { sniffMimeFromBase64 } from "../media/sniff-mime-from-base64.js";

export type ChatAttachment = {
  type?: string;
  mimeType?: string;
  fileName?: string;
  content?: unknown;
};

export type ChatImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

export type ParsedMessageWithImages = {
  message: string;
  images: ChatImageContent[];
};

type AttachmentLog = {
  warn: (message: string) => void;
};

type ChatAttachmentParserOptions = {
  maxBytes?: number;
  log?: AttachmentLog;
  allowFiles?: boolean;
  fileLimits?: InputFileLimits;
  extractFileContent?: typeof extractFileContentFromSource;
};

type NormalizedAttachment = {
  label: string;
  mime: string;
  base64: string;
};

const EXTRA_TEXT_MIMES = [
  "application/xml",
  "text/xml",
  "application/x-yaml",
  "text/yaml",
  "application/yaml",
  "application/javascript",
  "text/javascript",
  "text/tab-separated-values",
];

const TEXT_EXT_MIME = new Map<string, string>([
  [".csv", "text/csv"],
  [".tsv", "text/tab-separated-values"],
  [".txt", "text/plain"],
  [".md", "text/markdown"],
  [".log", "text/plain"],
  [".ini", "text/plain"],
  [".cfg", "text/plain"],
  [".conf", "text/plain"],
  [".env", "text/plain"],
  [".json", "application/json"],
  [".yaml", "text/yaml"],
  [".yml", "text/yaml"],
  [".xml", "application/xml"],
  [".html", "text/html"],
  [".htm", "text/html"],
]);

const XML_ESCAPE_MAP: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};

function normalizeMime(mime?: string): string | undefined {
  if (!mime) {
    return undefined;
  }
  const cleaned = mime.split(";")[0]?.trim().toLowerCase();
  return cleaned || undefined;
}

function isImageMime(mime?: string): boolean {
  return typeof mime === "string" && mime.startsWith("image/");
}

function xmlEscapeAttr(value: string): string {
  return value.replace(/[<>&"']/g, (char) => XML_ESCAPE_MAP[char] ?? char);
}

function escapeFileBlockContent(value: string): string {
  return value.replace(/<\s*\/\s*file\s*>/gi, "&lt;/file&gt;").replace(/<\s*file\b/gi, "&lt;file");
}

function sanitizeMimeType(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }
  const match = trimmed.match(/^([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)/);
  return match?.[1];
}

function resolveTextMimeFromName(name?: string): string | undefined {
  if (!name) {
    return undefined;
  }
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXT_MIME.get(ext);
}

function formatFileBlock(name: string, mime: string, content: string): string {
  const safeName = name.replace(/[\r\n\t]+/g, " ").trim() || "file";
  const safeMime = sanitizeMimeType(mime) ?? "application/octet-stream";
  return `<file name="${xmlEscapeAttr(safeName)}" mime="${xmlEscapeAttr(safeMime)}">\n${escapeFileBlockContent(content)}\n</file>`;
}

function formatMetadataNote(params: {
  name: string;
  mime?: string;
  sizeBytes: number;
  reason: "unsupported" | "extract-error";
}): string {
  const mime = sanitizeMimeType(params.mime) ?? "application/octet-stream";
  const reasonText =
    params.reason === "unsupported" ? "unsupported-for-extraction" : "extract-failed";
  return formatFileBlock(
    params.name,
    mime,
    `[File received; mime=${mime}; size=${params.sizeBytes} bytes; extraction=${reasonText}]`,
  );
}

function appendFileBlocks(message: string, blocks: string[]): string {
  if (blocks.length === 0) {
    return message;
  }
  const base = message.trim();
  const suffix = blocks.join("\n\n").trim();
  if (!base) {
    return suffix;
  }
  return `${base}\n\n${suffix}`.trim();
}

function resolveDefaultFileLimits(): InputFileLimits {
  return {
    allowUrl: false,
    allowedMimes: normalizeMimeList(undefined, DEFAULT_INPUT_FILE_MIMES),
    maxBytes: DEFAULT_INPUT_FILE_MAX_BYTES,
    maxChars: DEFAULT_INPUT_FILE_MAX_CHARS,
    maxRedirects: DEFAULT_INPUT_MAX_REDIRECTS,
    timeoutMs: DEFAULT_INPUT_TIMEOUT_MS,
    pdf: {
      maxPages: DEFAULT_INPUT_PDF_MAX_PAGES,
      maxPixels: DEFAULT_INPUT_PDF_MAX_PIXELS,
      minTextChars: DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
    },
  };
}

async function extractFileBlock(params: {
  attachment: ChatAttachment;
  label: string;
  b64: string;
  sizeBytes: number;
  mimeHint?: string;
  fileLimits: InputFileLimits;
  extractFileContent: typeof extractFileContentFromSource;
  log?: AttachmentLog;
}): Promise<string> {
  const { attachment, label, b64, sizeBytes, mimeHint, fileLimits, extractFileContent, log } =
    params;
  const name = attachment.fileName?.trim() || label;
  const forcedTextMime = resolveTextMimeFromName(name);
  const mimeType = sanitizeMimeType(forcedTextMime ?? mimeHint) ?? "application/octet-stream";

  const allowedMimes = new Set(fileLimits.allowedMimes);
  for (const extra of EXTRA_TEXT_MIMES) {
    allowedMimes.add(extra);
  }
  if (mimeType.startsWith("text/")) {
    allowedMimes.add(mimeType);
  }

  if (!allowedMimes.has(mimeType)) {
    log?.warn(
      `ws-file-attachments: attachment ${label}: unsupported mime ${mimeType}, keeping metadata only`,
    );
    return formatMetadataNote({
      name,
      mime: mimeType,
      sizeBytes,
      reason: "unsupported",
    });
  }

  let extracted: InputFileExtractResult;
  try {
    extracted = await extractFileContent({
      source: {
        type: "base64",
        data: b64,
        mediaType: mimeType,
        filename: name,
      },
      limits: {
        ...fileLimits,
        allowedMimes,
      },
    });
  } catch (err) {
    log?.warn(`ws-file-attachments: attachment ${label}: extract failed (${String(err)})`);
    return formatMetadataNote({
      name,
      mime: mimeType,
      sizeBytes,
      reason: "extract-error",
    });
  }

  const extractedText = extracted.text?.trim() ?? "";
  let blockText = extractedText;
  if (!blockText) {
    blockText =
      extracted.images && extracted.images.length > 0
        ? "[PDF content rendered to images; images not forwarded to model]"
        : "[No extractable text]";
  }

  return formatFileBlock(name, mimeType, blockText);
}

function isValidBase64(value: string): boolean {
  // Minimal validation; avoid full decode allocations for large payloads.
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function normalizeAttachment(
  att: ChatAttachment,
  idx: number,
  opts: { stripDataUrlPrefix: boolean; requireImageMime: boolean },
): NormalizedAttachment {
  const mime = att.mimeType ?? "";
  const content = att.content;
  const label = att.fileName || att.type || `attachment-${idx + 1}`;

  if (typeof content !== "string") {
    throw new Error(`attachment ${label}: content must be base64 string`);
  }
  if (opts.requireImageMime && !mime.startsWith("image/")) {
    throw new Error(`attachment ${label}: only image/* supported`);
  }

  let base64 = content.trim();
  if (opts.stripDataUrlPrefix) {
    // Strip data URL prefix if present (e.g., "data:image/jpeg;base64,...").
    const dataUrlMatch = /^data:[^;]+;base64,(.*)$/.exec(base64);
    if (dataUrlMatch) {
      base64 = dataUrlMatch[1];
    }
  }
  return { label, mime, base64 };
}

function validateAttachmentBase64OrThrow(
  normalized: NormalizedAttachment,
  opts: { maxBytes: number },
): number {
  if (!isValidBase64(normalized.base64)) {
    throw new Error(`attachment ${normalized.label}: invalid base64 content`);
  }
  const sizeBytes = estimateBase64DecodedBytes(normalized.base64);
  if (sizeBytes <= 0 || sizeBytes > opts.maxBytes) {
    throw new Error(
      `attachment ${normalized.label}: exceeds size limit (${sizeBytes} > ${opts.maxBytes} bytes)`,
    );
  }
  return sizeBytes;
}

/**
 * Parse attachments and extract images as structured content blocks.
 * Returns the message text and an array of image content blocks
 * compatible with Claude API's image format.
 */
export async function parseMessageWithAttachments(
  message: string,
  attachments: ChatAttachment[] | undefined,
  opts?: ChatAttachmentParserOptions,
): Promise<ParsedMessageWithImages> {
  const maxBytes = opts?.maxBytes ?? 5_000_000; // decoded bytes (5,000,000)
  const log = opts?.log;
  if (!attachments || attachments.length === 0) {
    return { message, images: [] };
  }

  const images: ChatImageContent[] = [];
  const fileBlocks: string[] = [];
  const fileLimits = opts?.fileLimits ?? resolveDefaultFileLimits();
  const allowFiles = opts?.allowFiles === true;
  const extractFileContent = opts?.extractFileContent ?? extractFileContentFromSource;

  for (const [idx, att] of attachments.entries()) {
    if (!att) {
      continue;
    }
    const normalized = normalizeAttachment(att, idx, {
      stripDataUrlPrefix: true,
      requireImageMime: false,
    });
    validateAttachmentBase64OrThrow(normalized, { maxBytes });
    const { base64: b64, label, mime } = normalized;

    const providedMime = sanitizeMimeType(normalizeMime(mime));
    const sniffedMime = sanitizeMimeType(normalizeMime(await sniffMimeFromBase64(b64)));
    const resolvedMime = sniffedMime ?? providedMime;
    if (isImageMime(resolvedMime) || (!sniffedMime && isImageMime(providedMime))) {
      if (sniffedMime && providedMime && sniffedMime !== providedMime) {
        log?.warn(
          `attachment ${label}: mime mismatch (${providedMime} -> ${sniffedMime}), using sniffed`,
        );
      }
      images.push({
        type: "image",
        data: b64,
        mimeType: resolvedMime ?? providedMime ?? mime,
      });
      continue;
    }

    if (!allowFiles) {
      if (sniffedMime && !isImageMime(sniffedMime)) {
        log?.warn(`attachment ${label}: detected non-image (${sniffedMime}), dropping`);
      } else {
        log?.warn(`attachment ${label}: unable to detect image mime type, dropping`);
      }
      continue;
    }

    fileBlocks.push(
      await extractFileBlock({
        attachment: att,
        label,
        b64,
        sizeBytes,
        mimeHint: resolvedMime ?? providedMime,
        fileLimits,
        extractFileContent,
        log,
      }),
    );
  }

  return {
    message: appendFileBlocks(message, fileBlocks),
    images,
  };
}

/**
 * @deprecated Use parseMessageWithAttachments instead.
 * This function converts images to markdown data URLs which Claude API cannot process as images.
 */
export function buildMessageWithAttachments(
  message: string,
  attachments: ChatAttachment[] | undefined,
  opts?: { maxBytes?: number },
): string {
  const maxBytes = opts?.maxBytes ?? 2_000_000; // 2 MB
  if (!attachments || attachments.length === 0) {
    return message;
  }

  const blocks: string[] = [];

  for (const [idx, att] of attachments.entries()) {
    if (!att) {
      continue;
    }
    const normalized = normalizeAttachment(att, idx, {
      stripDataUrlPrefix: false,
      requireImageMime: true,
    });
    validateAttachmentBase64OrThrow(normalized, { maxBytes });
    const { base64, label, mime } = normalized;

    const safeLabel = label.replace(/\s+/g, "_");
    const dataUrl = `![${safeLabel}](data:${mime};base64,${base64})`;
    blocks.push(dataUrl);
  }

  if (blocks.length === 0) {
    return message;
  }
  const separator = message.trim().length > 0 ? "\n\n" : "";
  return `${message}${separator}${blocks.join("\n\n")}`;
}
