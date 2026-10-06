import path from "node:path";
import { detectMime } from "@openclaw/media-core/mime";
import { saveMediaBuffer } from "../media/store.js";
import {
  WORKSPACE_BOOTSTRAP_FILENAMES,
  DEFAULT_TOOLS_FILENAME,
  DEFAULT_HEARTBEAT_FILENAME,
} from "./workspace.js";

const INTERNAL_NAMES = new Set(
  [...WORKSPACE_BOOTSTRAP_FILENAMES, DEFAULT_TOOLS_FILENAME, DEFAULT_HEARTBEAT_FILENAME].map(
    (name) => name.toLowerCase(),
  ),
);

export function isWorkspaceExportPath(workspaceDir: string, absolutePath: string): boolean {
  const relative = path.relative(workspaceDir, absolutePath);
  return (
    Boolean(relative) &&
    !path.isAbsolute(relative) &&
    !relative
      .split(/[\\/]/)
      .some(
        (part) =>
          part.startsWith(".") ||
          (process.platform === "win32" && part.includes(":")) ||
          ["memory", "config", "configuration"].includes(part.toLowerCase()),
      ) &&
    !INTERNAL_NAMES.has(path.basename(relative).toLowerCase()) &&
    !/^(?:auth-profiles|credentials|secrets|openclaw)(?:\.|$)/i.test(path.basename(relative))
  );
}

/** Replace automatic candidates while retaining immutable bytes for any earlier delivery. */
export function recordWorkspaceExportSnapshots(
  snapshots: Map<string, string>,
  entries: Array<{ source: string; url: string }>,
): string[] {
  const replaced: string[] = [];
  for (const { source, url } of entries) {
    const key =
      process.platform === "win32" ? path.resolve(source).toLowerCase() : path.resolve(source);
    const previous = snapshots.get(key);
    if (previous && previous !== url) {
      replaced.push(previous);
    }
    snapshots.set(key, url);
  }
  return replaced;
}

/** Snapshot only deliverable UTF-8 exports after the write owner verifies their exact bytes. */
export function createWorkspaceWriteMediaSnapshot(
  workspaceDir: string,
  snapshots = new Map<string, string>(),
) {
  return async (params: { absolutePath: string; content: string }) => {
    const relative = path.relative(workspaceDir, params.absolutePath);
    if (
      !isWorkspaceExportPath(workspaceDir, params.absolutePath) ||
      params.content.includes("\0")
    ) {
      return undefined;
    }
    const extension = path.extname(relative).toLowerCase();
    const plain = [".csv", ".tsv", ".txt", ".md", ".markdown", ".html", ".htm"].includes(extension);
    const svg =
      extension === ".svg" &&
      /<svg\b/i.test(params.content) &&
      /(?:<\/svg>|\/>)[\s]*$/i.test(params.content);
    const xmlOffice =
      extension === ".xls"
        ? params.content.includes("urn:schemas-microsoft-com:office:spreadsheet") &&
          /<Workbook\b/.test(params.content) &&
          /<\/Workbook>\s*$/.test(params.content)
        : extension === ".doc" &&
          params.content.includes("http://schemas.microsoft.com/office/word/2003/wordml") &&
          /<w:wordDocument\b/.test(params.content) &&
          /<\/w:wordDocument>\s*$/.test(params.content);
    if (!plain && !svg && !xmlOffice) {
      return undefined;
    }
    const buffer = Buffer.from(params.content, "utf8");
    const name = path.basename(params.absolutePath);
    const mime = await detectMime({ buffer, filePath: name });
    const saved = await saveMediaBuffer(buffer, mime, "outbound", undefined, name, name);
    const replacedMediaUrls = recordWorkspaceExportSnapshots(snapshots, [
      { source: params.absolutePath, url: saved.path },
    ]);
    return {
      mediaUrls: [saved.path],
      stagedFileSources: [{ mediaUrl: saved.path, sources: [path.resolve(params.absolutePath)] }],
      trustedLocalMedia: true as const,
      ...(replacedMediaUrls.length ? { replacedMediaUrls } : {}),
    };
  };
}
