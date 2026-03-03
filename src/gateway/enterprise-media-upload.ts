import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { saveMediaBuffer } from "../media/store.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth.js";
import { verifyEnterpriseSocketToken } from "./enterprise-socket-auth.js";
import {
  sendInvalidRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
} from "./http-common.js";
import { getBearerToken } from "./http-utils.js";

const ENTERPRISE_MEDIA_UPLOAD_PATH = "/v1/enterprise/media/upload";
const OWNER_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const DEFAULT_OWNER_CODE = "dynamic";
const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 6 * 1024 * 1024;
const logMediaUpload = createSubsystemLogger("gateway/enterprise-media-upload");
const DEFAULT_CORS_HEADERS = "authorization, content-type";

type UploadFileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function resolveOwnerCode(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_OWNER_CODE;
  }
  return OWNER_CODE_PATTERN.test(normalized) ? normalized : DEFAULT_OWNER_CODE;
}

function isUploadFileLike(value: FormDataEntryValue | null): value is UploadFileLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    typeof (value as { name?: unknown }).name === "string" &&
    typeof (value as { type?: unknown }).type === "string" &&
    typeof (value as { size?: unknown }).size === "number" &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

async function readBodyBuffer(
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ ok: true; value: Buffer } | { ok: false; error: string }> {
  return await new Promise((resolve) => {
    let done = false;
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      if (done) {
        return;
      }
      total += chunk.length;
      if (total > maxBytes) {
        done = true;
        resolve({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) {
        return;
      }
      done = true;
      resolve({ ok: true, value: Buffer.concat(chunks) });
    });
    req.on("error", (err) => {
      if (done) {
        return;
      }
      done = true;
      resolve({ ok: false, error: String(err) });
    });
  });
}

function buildHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
      continue;
    }
    if (Array.isArray(value) && value.length > 0) {
      headers.set(key, value.join(", "));
    }
  }
  return headers;
}

async function parseMultipartBody(req: IncomingMessage): Promise<FormData> {
  const read = await readBodyBuffer(req, MAX_UPLOAD_BODY_BYTES);
  if (!read.ok) {
    throw new Error(read.error);
  }
  const host = typeof req.headers.host === "string" ? req.headers.host : "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const webReq = new Request(url.toString(), {
    method: req.method ?? "POST",
    headers: buildHeaders(req),
    body: read.value,
  });
  return await webReq.formData();
}

function applyUploadCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin.trim() : "";
  const requestHeaders =
    typeof req.headers["access-control-request-headers"] === "string"
      ? req.headers["access-control-request-headers"].trim()
      : "";

  res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
  res.setHeader("Vary", "Origin, Access-Control-Request-Headers");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", requestHeaders || DEFAULT_CORS_HEADERS);
  res.setHeader("Access-Control-Max-Age", "600");
}

export async function handleEnterpriseMediaUploadHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { auth: ResolvedGatewayAuth; trustedProxies?: string[] },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname !== ENTERPRISE_MEDIA_UPLOAD_PATH) {
    return false;
  }

  applyUploadCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, "POST");
    return true;
  }

  const cfg = loadConfig();
  const token = getBearerToken(req);
  const enterpriseAuth = verifyEnterpriseSocketToken({ token });
  let authorized = enterpriseAuth.ok;
  if (!authorized) {
    const authResult = await authorizeGatewayConnect({
      auth: opts.auth,
      connectAuth: token ? { token, password: token } : null,
      req,
      trustedProxies: opts.trustedProxies ?? cfg.gateway?.trustedProxies,
    });
    authorized = authResult.ok;
  }
  if (!authorized) {
    sendUnauthorized(res);
    return true;
  }

  let formData: FormData;
  try {
    formData = await parseMultipartBody(req);
  } catch (err) {
    const message = String(err);
    if (/payload too large/i.test(message)) {
      sendJson(res, 413, {
        ok: false,
        error: { message: "payload too large", type: "invalid_request_error" },
      });
      return true;
    }
    sendInvalidRequest(res, `invalid multipart body: ${message}`);
    return true;
  }

  const ownerCodeRaw = formData.get("ownerCode");
  const ownerCodeResolved = resolveOwnerCode(typeof ownerCodeRaw === "string" ? ownerCodeRaw : "");

  const fileEntries = formData.getAll("file");
  if (fileEntries.length !== 1 || !isUploadFileLike(fileEntries[0] ?? null)) {
    sendInvalidRequest(res, "multipart field 'file' is required");
    return true;
  }
  const file = fileEntries[0];
  if (!isUploadFileLike(file)) {
    sendInvalidRequest(res, "invalid multipart file");
    return true;
  }
  if (file.size <= 0) {
    sendInvalidRequest(res, "file is empty");
    return true;
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    sendJson(res, 413, {
      ok: false,
      error: { message: "file exceeds 5MB limit", type: "invalid_request_error" },
    });
    return true;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_FILE_BYTES) {
      sendJson(res, 413, {
        ok: false,
        error: { message: "file exceeds 5MB limit", type: "invalid_request_error" },
      });
      return true;
    }
    const saved = await saveMediaBuffer(
      buffer,
      file.type || undefined,
      ownerCodeResolved,
      MAX_UPLOAD_FILE_BYTES,
      file.name,
    );
    sendJson(res, 200, {
      ok: true,
      path: saved.path,
      mimeType: saved.contentType ?? file.type ?? "application/octet-stream",
      fileName: file.name || "upload",
      sizeBytes: saved.size,
      ownerCodeResolved,
    });
  } catch (err) {
    logMediaUpload.error(`enterprise media upload failed: ${String(err)}`);
    sendJson(res, 500, {
      ok: false,
      error: { message: String(err), type: "server_error" },
    });
  }
  return true;
}
