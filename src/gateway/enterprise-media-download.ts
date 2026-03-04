import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { SafeOpenError, openFileWithinRoot } from "../infra/fs-safe.js";
import { detectMime } from "../media/mime.js";
import { getMediaDir } from "../media/store.js";
import { sendInvalidRequest, sendMethodNotAllowed } from "./http-common.js";

const MEDIA_ROUTE_PATTERN = /^\/media\/([^/]+)\/([^/]+)$/u;
const OWNER_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SAFE_FILE_NAME_PATTERN = /^[\p{L}\p{N}._-]+$/u;

function decodePathPart(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function sanitizeHeaderFileName(fileName: string): string {
  return fileName.replace(/["\\\r\n]/g, "_").trim() || "download";
}

function applyMediaCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}

function applyMediaResponseHeaders(params: {
  res: ServerResponse;
  contentType: string;
  size: number;
  fileName: string;
  forceDownload: boolean;
}): void {
  const { res, contentType, size, fileName, forceDownload } = params;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(size));
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (forceDownload) {
    const headerFileName = sanitizeHeaderFileName(fileName);
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${headerFileName}"; filename*=UTF-8''${encodedFileName}`,
    );
  } else {
    res.setHeader("Content-Disposition", "inline");
  }
}

function isValidFileName(fileName: string): boolean {
  if (!fileName || !SAFE_FILE_NAME_PATTERN.test(fileName)) {
    return false;
  }
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return false;
  }
  return true;
}

export async function handleEnterpriseMediaDownloadHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const routeMatch = url.pathname.match(MEDIA_ROUTE_PATTERN);
  if (!routeMatch) {
    return false;
  }

  applyMediaCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendMethodNotAllowed(res, "GET, HEAD");
    return true;
  }

  const ownerEncoded = routeMatch[1] ?? "";
  const fileEncoded = routeMatch[2] ?? "";
  const owner = decodePathPart(ownerEncoded);
  const fileName = decodePathPart(fileEncoded);

  if (!owner || !fileName) {
    sendInvalidRequest(res, "invalid media path");
    return true;
  }
  if (!OWNER_CODE_PATTERN.test(owner)) {
    sendInvalidRequest(res, "invalid media owner");
    return true;
  }
  if (!isValidFileName(fileName)) {
    sendInvalidRequest(res, "invalid media filename");
    return true;
  }

  const mediaRoot = getMediaDir();
  const relativePath = path.join(owner, fileName);
  let opened:
    | {
        handle: import("node:fs/promises").FileHandle;
        realPath: string;
        stat: import("node:fs").Stats;
      }
    | undefined;
  try {
    opened = await openFileWithinRoot({
      rootDir: mediaRoot,
      relativePath,
    });
  } catch (err) {
    if (err instanceof SafeOpenError) {
      if (err.code === "not-found") {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not Found");
        return true;
      }
      sendInvalidRequest(res, "invalid media path");
      return true;
    }
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
    return true;
  }

  const forceDownload = url.searchParams.get("download") === "1";
  const contentType =
    (await detectMime({ filePath: opened.realPath })) ?? "application/octet-stream";

  applyMediaResponseHeaders({
    res,
    contentType,
    size: opened.stat.size,
    fileName,
    forceDownload,
  });

  if (req.method === "HEAD") {
    await opened.handle.close().catch(() => {});
    res.statusCode = 200;
    res.end();
    return true;
  }

  try {
    const body = await opened.handle.readFile();
    res.statusCode = 200;
    res.end(body);
    return true;
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
    return true;
  } finally {
    await opened.handle.close().catch(() => {});
  }
}
