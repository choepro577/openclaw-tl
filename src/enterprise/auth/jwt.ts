// Minimal HS256 JWT implementation for same-process Enterprise account sessions.
import { createHmac, timingSafeEqual } from "node:crypto";
import { generateSecureToken } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { EnterprisePortalAudience } from "./session-store.js";

const JWT_SETTING_KEY = "auth.jwt.hs256.v1";
const JWT_ISSUER = "openclaw-enterprise";
const JWT_AUDIENCE = {
  admin: "openclaw-admin",
  user: "openclaw-user",
} as const;

export type EnterpriseJwtClaims = {
  iss: typeof JWT_ISSUER;
  aud: (typeof JWT_AUDIENCE)[EnterprisePortalAudience];
  sub: string;
  sid: string;
  iat: number;
  exp: number;
};

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function getOrCreateSigningSecret(options: OpenClawStateDatabaseOptions): string {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const existing = database.db
    .prepare("SELECT setting_value FROM enterprise_settings WHERE setting_key = ? LIMIT 1")
    .get(JWT_SETTING_KEY) as { setting_value: string } | undefined; // sqlite-allow-raw -- Fixed feature-local lookup.
  if (existing?.setting_value) {
    return existing.setting_value;
  }
  const generated = generateSecureToken(48);
  const now = Date.now();
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_settings (setting_key, setting_value, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(setting_key) DO NOTHING`,
      ).run(JWT_SETTING_KEY, generated, now, now); // sqlite-allow-raw -- Fixed feature-local setting insert.
      const row = db
        .prepare("SELECT setting_value FROM enterprise_settings WHERE setting_key = ? LIMIT 1")
        .get(JWT_SETTING_KEY) as { setting_value: string }; // sqlite-allow-raw -- Fixed feature-local lookup.
      return row.setting_value;
    },
    options,
    { operationLabel: "enterprise.jwt.ensure-secret" },
  );
}

function sign(input: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(input).digest();
}

/** Signs a compact Enterprise-owned opaque reference without exposing its payload fields. */
export function issueEnterpriseOpaqueReference(
  purpose: string,
  payload: Record<string, unknown>,
  options: OpenClawStateDatabaseOptions = {},
): string {
  const encoded = encodeJson({ _v: 1, ...payload });
  const signature = sign(`ref:${purpose}:${encoded}`, getOrCreateSigningSecret(options)).toString(
    "base64url",
  );
  return `${encoded}.${signature}`;
}

/** Verifies an Enterprise opaque reference using timing-safe signature comparison. */
export function verifyEnterpriseOpaqueReference(
  purpose: string,
  reference: string,
  options: OpenClawStateDatabaseOptions = {},
): Record<string, unknown> | undefined {
  const [encoded, signatureRaw, extra] = reference.split(".");
  if (!encoded || !signatureRaw || extra) {
    return undefined;
  }
  try {
    const expected = sign(`ref:${purpose}:${encoded}`, getOrCreateSigningSecret(options));
    const actual = Buffer.from(signatureRaw, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return undefined;
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    return payload._v === 1 || payload.v === 1 ? payload : undefined;
  } catch {
    return undefined;
  }
}

export function issueEnterpriseCsrfToken(
  sessionId: string,
  audience: EnterprisePortalAudience,
  options: OpenClawStateDatabaseOptions = {},
): string {
  return sign(`csrf:${audience}:${sessionId}`, getOrCreateSigningSecret(options)).toString(
    "base64url",
  );
}

export function verifyEnterpriseCsrfToken(
  token: string | undefined,
  sessionId: string,
  audience: EnterprisePortalAudience,
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  if (!token) {
    return false;
  }
  const expected = sign(`csrf:${audience}:${sessionId}`, getOrCreateSigningSecret(options));
  const actual = Buffer.from(token, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function issueEnterpriseJwt(
  params: {
    accountId: string;
    sessionId: string;
    expiresAt: number;
    audience?: EnterprisePortalAudience;
  },
  options: OpenClawStateDatabaseOptions = {},
): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims: EnterpriseJwtClaims = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE[params.audience ?? "user"],
    sub: params.accountId,
    sid: params.sessionId,
    iat: nowSeconds,
    exp: Math.floor(params.expiresAt / 1000),
  };
  const encoded = `${encodeJson({ alg: "HS256", typ: "JWT" })}.${encodeJson(claims)}`;
  return `${encoded}.${sign(encoded, getOrCreateSigningSecret(options)).toString("base64url")}`;
}

export function verifyEnterpriseJwt(
  token: string,
  options: OpenClawStateDatabaseOptions = {},
  audience: EnterprisePortalAudience = "user",
): EnterpriseJwtClaims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }
  const [headerRaw, payloadRaw, signatureRaw] = parts;
  if (!headerRaw || !payloadRaw || !signatureRaw) {
    return undefined;
  }
  try {
    const header = JSON.parse(Buffer.from(headerRaw, "base64url").toString("utf8")) as {
      alg?: unknown;
      typ?: unknown;
    };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return undefined;
    }
    const expected = sign(`${headerRaw}.${payloadRaw}`, getOrCreateSigningSecret(options));
    const actual = Buffer.from(signatureRaw, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return undefined;
    }
    const claims = JSON.parse(
      Buffer.from(payloadRaw, "base64url").toString("utf8"),
    ) as Partial<EnterpriseJwtClaims>;
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.iss !== JWT_ISSUER ||
      claims.aud !== JWT_AUDIENCE[audience] ||
      typeof claims.sub !== "string" ||
      typeof claims.sid !== "string" ||
      typeof claims.iat !== "number" ||
      typeof claims.exp !== "number" ||
      claims.iat > now + 30 ||
      claims.exp <= now
    ) {
      return undefined;
    }
    return claims as EnterpriseJwtClaims;
  } catch {
    return undefined;
  }
}
