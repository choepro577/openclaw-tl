import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeAgentId } from "../routing/session-key.js";

const DEFAULT_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const TOKEN_PREFIX = "ent_";
const TOKEN_VERSION = 1;

type EnterpriseSocketClaims = {
  v: number;
  kind: "enterprise";
  agentId: string;
  iat: number;
  exp: number;
  nonce: string;
};

type CachedEnterpriseToken = {
  token: string;
  expiresAtMs: number;
};

const tokenCacheByAgent = new Map<string, CachedEnterpriseToken>();
let generatedSecret: string | null = null;

function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4;
  const padded = padLength === 0 ? normalized : normalized + "=".repeat(4 - padLength);
  return Buffer.from(padded, "base64");
}

function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function resolveTokenTtlMs(): number {
  const raw = process.env.OPENCLAW_ENTERPRISE_SOCKET_TTL_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TOKEN_TTL_MS;
  }
  return Math.floor(parsed);
}

function resolveRefreshWindowMs(): number {
  const raw = process.env.OPENCLAW_ENTERPRISE_SOCKET_REFRESH_WINDOW_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_REFRESH_WINDOW_MS;
  }
  return Math.floor(parsed);
}

function resolveEnterpriseSocketSecret(): string {
  const fromEnv = process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const fromGatewayAuth =
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ??
    process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ??
    process.env.OPENCLAW_GATEWAY_PASSWORD?.trim() ??
    process.env.CLAWDBOT_GATEWAY_PASSWORD?.trim();
  if (fromGatewayAuth) {
    return fromGatewayAuth;
  }

  if (!generatedSecret) {
    generatedSecret = randomBytes(32).toString("base64url");
  }
  return generatedSecret;
}

function signPayload(encodedPayload: string): string {
  const secret = resolveEnterpriseSocketSecret();
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function parseClaims(encodedPayload: string): EnterpriseSocketClaims | null {
  try {
    const parsed = JSON.parse(
      decodeBase64Url(encodedPayload).toString("utf-8"),
    ) as Partial<EnterpriseSocketClaims>;
    if (parsed?.kind !== "enterprise") {
      return null;
    }
    if (typeof parsed.agentId !== "string" || !parsed.agentId.trim()) {
      return null;
    }
    if (typeof parsed.iat !== "number" || !Number.isFinite(parsed.iat)) {
      return null;
    }
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }
    if (typeof parsed.nonce !== "string" || !parsed.nonce.trim()) {
      return null;
    }
    return {
      v: typeof parsed.v === "number" ? parsed.v : TOKEN_VERSION,
      kind: "enterprise",
      agentId: normalizeAgentId(parsed.agentId),
      iat: Math.floor(parsed.iat),
      exp: Math.floor(parsed.exp),
      nonce: parsed.nonce.trim(),
    };
  } catch {
    return null;
  }
}

export function issueEnterpriseSocketToken(params: {
  agentId: string;
  forceRefresh?: boolean;
  nowMs?: number;
}): { token: string; expiresAtMs: number } {
  const nowMs = params.nowMs ?? Date.now();
  const agentId = normalizeAgentId(params.agentId);
  const refreshWindowMs = resolveRefreshWindowMs();
  const ttlMs = resolveTokenTtlMs();

  if (!params.forceRefresh) {
    const cached = tokenCacheByAgent.get(agentId);
    if (cached && cached.expiresAtMs - nowMs > refreshWindowMs) {
      return cached;
    }
  }

  const claims: EnterpriseSocketClaims = {
    v: TOKEN_VERSION,
    kind: "enterprise",
    agentId,
    iat: nowMs,
    exp: nowMs + ttlMs,
    nonce: randomBytes(12).toString("base64url"),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const signature = signPayload(encodedPayload);
  const token = `${TOKEN_PREFIX}${encodedPayload}.${signature}`;
  const issued = { token, expiresAtMs: claims.exp };
  tokenCacheByAgent.set(agentId, issued);
  return issued;
}

export function verifyEnterpriseSocketToken(params: {
  token: string | undefined;
  nowMs?: number;
}): { ok: true; agentId: string; expiresAtMs: number } | { ok: false; reason: string } {
  const token = params.token?.trim() ?? "";
  if (!token) {
    return { ok: false, reason: "token_missing" };
  }
  if (!token.startsWith(TOKEN_PREFIX)) {
    return { ok: false, reason: "token_prefix_invalid" };
  }
  const body = token.slice(TOKEN_PREFIX.length);
  const dot = body.lastIndexOf(".");
  if (dot <= 0 || dot >= body.length - 1) {
    return { ok: false, reason: "token_format_invalid" };
  }
  const encodedPayload = body.slice(0, dot);
  const signature = body.slice(dot + 1);
  const expected = signPayload(encodedPayload);
  if (!safeEqual(signature, expected)) {
    return { ok: false, reason: "token_signature_invalid" };
  }

  const claims = parseClaims(encodedPayload);
  if (!claims || claims.v !== TOKEN_VERSION) {
    return { ok: false, reason: "token_payload_invalid" };
  }
  const nowMs = params.nowMs ?? Date.now();
  if (claims.exp <= nowMs) {
    return { ok: false, reason: "token_expired" };
  }
  return {
    ok: true,
    agentId: claims.agentId,
    expiresAtMs: claims.exp,
  };
}

export function resetEnterpriseSocketTokenCacheForTest(): void {
  tokenCacheByAgent.clear();
  generatedSecret = null;
}
