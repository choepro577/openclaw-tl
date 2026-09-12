import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
import { isPathInside } from "../../infra/path-guards.js";
import { resolveSkillHostEnv } from "../../skills/runtime/env-overrides.js";
import type { SkillScriptAuth, SkillScriptEntrypoint, SkillSnapshot } from "../../skills/types.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
} from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { resolveEnterpriseSharedAgentCapabilities } from "../isolation/enterprise-agent-capabilities.js";
import { cancelEnterpriseSkillAuthForAccountSkill } from "./skill-auth-request.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const OUTPUT_LIMIT_BYTES = 1_048_576;
const INPUT_LIMIT_BYTES = 1_048_576;
const TOKEN_SCHEMA_VERSION = 1;
const TOKEN_KEY_ENV = "OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY";
const SCRIPT_ID_PATTERN = /^[a-z][a-z0-9_-]{0,127}$/;
const SECRET_KEY_PATTERN = /^(?:authorization|password|token|access_?token|secret|secretkey)$/i;
const HOST_SCRIPT_SOURCES = new Set([
  "openclaw-bundled",
  "openclaw-custodian",
  "openclaw-extra",
  "openclaw-managed",
]);

type SnapshotSkill = SkillSnapshot["skills"][number];

export class EnterpriseSkillScriptError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "EnterpriseSkillScriptError";
  }
}

export type ResolvedEnterpriseSkillScript = {
  skill: SnapshotSkill;
  skillKey: string;
  entrypointName: string;
  entrypoint: SkillScriptEntrypoint;
};

type SkillTokenRow = {
  schema_version: number;
  iv: string;
  auth_tag: string;
  ciphertext: string;
  expires_at: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function hashSkillScriptArguments(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function tokenKey(): Buffer {
  const raw = process.env[TOKEN_KEY_ENV]?.trim();
  if (!raw) {
    throw new EnterpriseSkillScriptError("SKILL_TOKEN_KEY_UNAVAILABLE", 503);
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) {
    throw new EnterpriseSkillScriptError("SKILL_TOKEN_KEY_UNAVAILABLE", 503);
  }
  return decoded;
}

function tokenAad(accountId: string, skillKey: string, version = TOKEN_SCHEMA_VERSION): Buffer {
  return Buffer.from(`${accountId}\0${skillKey}\0${version}`, "utf8");
}

function deleteToken(accountId: string, skillKey: string): void {
  ensureEnterpriseSchema();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare("DELETE FROM enterprise_skill_tokens WHERE account_id = ? AND skill_key = ?").run(
        accountId,
        skillKey,
      ); // sqlite-allow-raw -- Exact account and skill credential removal.
    },
    {},
    { operationLabel: "enterprise.skill-token.delete" },
  );
}

export function clearEnterpriseSkillToken(accountId: string, skillKey: string): void {
  const normalizedSkillKey = skillKey.trim();
  deleteToken(accountId, normalizedSkillKey);
  cancelEnterpriseSkillAuthForAccountSkill(accountId, normalizedSkillKey);
}

export function clearEnterpriseSkillTokensForAccount(accountId: string): void {
  ensureEnterpriseSchema();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare("DELETE FROM enterprise_skill_tokens WHERE account_id = ?").run(accountId); // sqlite-allow-raw -- Exact disabled account credential removal.
    },
    {},
    { operationLabel: "enterprise.skill-token.delete-account" },
  );
  cancelEnterpriseSkillAuthForAccountSkill(accountId);
}

export function pruneRevokedEnterpriseSkillTokens(
  accountId: string,
  allowedSkillKeys: ReadonlySet<string>,
): void {
  ensureEnterpriseSchema();
  const skillKeys = openOpenClawStateDatabase()
    .db.prepare("SELECT skill_key FROM enterprise_skill_tokens WHERE account_id = ?")
    .all(accountId) // sqlite-allow-raw -- Bounded account token inventory for grant pruning.
    .flatMap((row) => (isRecord(row) && typeof row.skill_key === "string" ? [row.skill_key] : []));
  for (const skillKey of skillKeys) {
    if (!allowedSkillKeys.has(skillKey)) {
      deleteToken(accountId, skillKey);
      cancelEnterpriseSkillAuthForAccountSkill(accountId, skillKey);
    }
  }
}

function readToken(
  accountId: string,
  skillKey: string,
): { token: string; expiresAt: number } | undefined {
  ensureEnterpriseSchema();
  const stored = openOpenClawStateDatabase()
    .db.prepare(
      `SELECT schema_version, iv, auth_tag, ciphertext, expires_at
       FROM enterprise_skill_tokens WHERE account_id = ? AND skill_key = ? LIMIT 1`,
    )
    .get(accountId, skillKey); // sqlite-allow-raw -- Exact account and skill token lookup.
  if (!stored) {
    return undefined;
  }
  if (
    !isRecord(stored) ||
    typeof stored.schema_version !== "number" ||
    typeof stored.iv !== "string" ||
    typeof stored.auth_tag !== "string" ||
    typeof stored.ciphertext !== "string" ||
    typeof stored.expires_at !== "number"
  ) {
    deleteToken(accountId, skillKey);
    throw new EnterpriseSkillScriptError("SKILL_AUTH_INVALID", 401);
  }
  const row: SkillTokenRow = {
    schema_version: stored.schema_version,
    iv: stored.iv,
    auth_tag: stored.auth_tag,
    ciphertext: stored.ciphertext,
    expires_at: stored.expires_at,
  };
  if (row.expires_at <= Date.now()) {
    deleteToken(accountId, skillKey);
    return undefined;
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(row.iv, "base64"));
    decipher.setAAD(tokenAad(accountId, skillKey, row.schema_version));
    decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
    const token = Buffer.concat([
      decipher.update(Buffer.from(row.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return { token, expiresAt: row.expires_at };
  } catch (error) {
    deleteToken(accountId, skillKey);
    if (error instanceof EnterpriseSkillScriptError) {
      throw error;
    }
    throw new EnterpriseSkillScriptError("SKILL_AUTH_INVALID", 401);
  }
}

function writeToken(accountId: string, skillKey: string, token: string, expiresAt: number): void {
  if (!token.trim() || Buffer.byteLength(token, "utf8") > 65_536) {
    throw new EnterpriseSkillScriptError("SKILL_AUTH_INVALID", 401);
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAAD(tokenAad(accountId, skillKey));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const now = Date.now();
  ensureEnterpriseSchema();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_skill_tokens
          (account_id, skill_key, schema_version, iv, auth_tag, ciphertext,
           expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id, skill_key) DO UPDATE SET
           schema_version = excluded.schema_version,
           iv = excluded.iv,
           auth_tag = excluded.auth_tag,
           ciphertext = excluded.ciphertext,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at`,
      ).run(
        accountId,
        skillKey,
        TOKEN_SCHEMA_VERSION,
        iv.toString("base64"),
        cipher.getAuthTag().toString("base64"),
        ciphertext.toString("base64"),
        expiresAt,
        now,
        now,
      ); // sqlite-allow-raw -- Ciphertext-only generic skill token upsert.
    },
    {},
    { operationLabel: "enterprise.skill-token.upsert" },
  );
}

export function enterpriseSkillAuthStatus(
  accountId: string,
  skillKey: string,
): {
  connected: boolean;
  expiresAt?: number;
} {
  const active = readToken(accountId, skillKey.trim());
  return active ? { connected: true, expiresAt: active.expiresAt } : { connected: false };
}

export function isEnterpriseHostScriptSource(source: string): boolean {
  return HOST_SCRIPT_SOURCES.has(source);
}

export function requireEnterpriseSkillCapabilities(params: {
  config?: OpenClawConfig;
  accountId: string;
  agentId: string;
}) {
  if (!params.config) {
    throw new EnterpriseSkillScriptError("SKILL_RUNTIME_CONFIG_MISSING", 503);
  }
  const resolver = readGatewayRequestRuntimeMetadata(params.config)?.enterpriseCapabilities;
  const account = getEnterpriseAccountById(params.accountId);
  if (!account?.enabled) {
    throw new EnterpriseSkillScriptError("SKILL_NOT_GRANTED", 403);
  }
  const capability = resolver
    ? resolver.resolve(params.agentId)
    : resolveEnterpriseSharedAgentCapabilities({
        config: params.config,
        account,
        agentId: params.agentId,
      });
  if (!capability.allowed || capability.accountId !== params.accountId) {
    throw new EnterpriseSkillScriptError("SKILL_NOT_GRANTED", 403);
  }
  return capability;
}

export function resolveEnterpriseSkillScript(params: {
  snapshot?: SkillSnapshot;
  skillKey: string;
  entrypointName: string;
}): ResolvedEnterpriseSkillScript {
  const matches = (params.snapshot?.skills ?? []).filter(
    (skill) => (skill.skillKey ?? skill.name) === params.skillKey,
  );
  if (matches.length === 0) {
    throw new EnterpriseSkillScriptError("SKILL_NOT_GRANTED", 403);
  }
  const skill = matches.length === 1 ? matches[0] : undefined;
  const entrypoint = skill?.scriptRuntime?.entrypoints[params.entrypointName];
  if (!skill?.baseDir || !entrypoint) {
    throw new EnterpriseSkillScriptError("SKILL_ENTRYPOINT_INVALID", 400);
  }
  return {
    skill,
    skillKey: params.skillKey,
    entrypointName: params.entrypointName,
    entrypoint,
  };
}

export function skillScriptRisk(params: {
  snapshot?: SkillSnapshot;
  skillKey: string;
  entrypointName: string;
  operation?: string;
}): "read" | "approval" {
  const resolved = resolveEnterpriseSkillScript(params);
  if (resolved.entrypoint.kind === "fixed") {
    return resolved.entrypoint.risk === "read" ? "read" : "approval";
  }
  const operation = params.operation?.trim();
  return operation && resolved.entrypoint.readOperations?.includes(operation) ? "read" : "approval";
}

function assertNoSecrets(value: unknown, depth = 0): void {
  if (depth > 16) {
    throw new EnterpriseSkillScriptError("SKILL_ARGUMENTS_INVALID", 400);
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      assertNoSecrets(child, depth + 1);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new EnterpriseSkillScriptError("SKILL_SECRET_ARGUMENT_FORBIDDEN", 400);
    }
    assertNoSecrets(child, depth + 1);
  }
}

async function resolveExecutable(resolved: ResolvedEnterpriseSkillScript): Promise<{
  executable: string;
  scriptsDir: string;
}> {
  const declared = path.resolve(resolved.skill.baseDir!, resolved.entrypoint.path);
  const scriptsDir = await realpath(path.resolve(resolved.skill.baseDir!, "scripts"));
  const stat = await lstat(declared).catch(() => undefined);
  if (!stat?.isFile() || stat.isSymbolicLink() || (stat.mode & 0o111) === 0) {
    throw new EnterpriseSkillScriptError("SKILL_ENTRYPOINT_INVALID", 400);
  }
  const executable = await realpath(declared).catch(() => undefined);
  if (!executable || !isPathInside(scriptsDir, executable)) {
    throw new EnterpriseSkillScriptError("SKILL_ENTRYPOINT_INVALID", 400);
  }
  return { executable, scriptsDir };
}

async function spawnScript(params: {
  executable: string;
  scriptsDir: string;
  operation?: string;
  payload: string;
  env: Record<string, string>;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<{ stdout: string; stderr: string; code: number }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      params.executable,
      params.operation ? [params.operation, "--payload-stdin"] : ["--payload-stdin"],
      {
        cwd: params.scriptsDir,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        env: params.env,
      },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    let overflow = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      params.signal?.removeEventListener("abort", abort);
      fn();
    };
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > OUTPUT_LIMIT_BYTES) {
        overflow = true;
        child.kill("SIGKILL");
        return;
      }
      target.push(chunk);
    };
    const abort = () => child.kill("SIGKILL");
    const timeout = setTimeout(() => child.kill("SIGKILL"), params.timeoutMs);
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code, signal) =>
      finish(() => {
        if (overflow) {
          reject(new EnterpriseSkillScriptError("SKILL_OUTPUT_LIMIT", 502));
        } else if (params.signal?.aborted) {
          reject(new EnterpriseSkillScriptError("SKILL_SCRIPT_ABORTED", 499));
        } else if (signal === "SIGKILL" && code === null) {
          reject(new EnterpriseSkillScriptError("SKILL_SCRIPT_TIMEOUT", 504));
        } else {
          resolve({
            stdout: Buffer.concat(stdout).toString("utf8"),
            stderr: Buffer.concat(stderr).toString("utf8"),
            code: code ?? 1,
          });
        }
      }),
    );
    params.signal?.addEventListener("abort", abort, { once: true });
    child.stdin.end(params.payload);
  });
}

function safeScriptFailure(stderr: string): string {
  for (const code of [
    "AUTH_REQUIRED",
    "CONNECT_TIMEOUT",
    "UNREACHABLE",
    "HTTP_ERROR",
    "TOOL_ERROR",
  ] as const) {
    if (stderr.split(/\s+/u).includes(code)) {
      return code;
    }
  }
  return "SKILL_SCRIPT_FAILED";
}

function authFailure(value: unknown): boolean {
  const text = JSON.stringify(value)?.toLowerCase() ?? "";
  return [
    "auth_required",
    "unauthorized",
    "token expired",
    "authorization required",
    "chưa đăng nhập",
  ].some((needle) => text.includes(needle));
}

function scrubSecrets(value: unknown, token: string): unknown {
  if (typeof value === "string") {
    return token && value.includes(token) ? value.replaceAll(token, "<redacted>") : value;
  }
  if (Array.isArray(value)) {
    return value.map((child) => scrubSecrets(child, token));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "<redacted>" : scrubSecrets(child, token),
    ]),
  );
}

function readTokenAtPath(value: unknown, tokenPath: string): string | undefined {
  let current = value;
  for (const key of tokenPath.split(".")) {
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
      } catch {
        return undefined;
      }
    }
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : undefined;
}

function extractToken(value: unknown, auth: SkillScriptAuth): string | undefined {
  for (const tokenPath of auth.tokenPaths) {
    const token = readTokenAtPath(value, tokenPath);
    if (token) {
      return token;
    }
  }
  return undefined;
}

export function extractRoutedSkillOperations(value: unknown): Set<string> {
  const names = new Set<string>();
  const visit = (item: unknown, depth: number) => {
    if (depth > 6 || names.size >= 50) {
      return;
    }
    if (typeof item === "string" && item.length <= OUTPUT_LIMIT_BYTES) {
      try {
        visit(JSON.parse(item), depth + 1);
      } catch {
        // Plain text is not a router result.
      }
      return;
    }
    if (!isRecord(item)) {
      return;
    }
    if (Array.isArray(item.results)) {
      for (const result of item.results) {
        if (!isRecord(result)) {
          continue;
        }
        const name = result.tool_name ?? result.toolName ?? result.name;
        if (typeof name === "string" && SCRIPT_ID_PATTERN.test(name)) {
          names.add(name);
        }
      }
    }
    for (const key of ["data", "result", "content"] as const) {
      const child = item[key];
      if (Array.isArray(child)) {
        child.forEach((entry) => visit(entry, depth + 1));
      } else {
        visit(child, depth + 1);
      }
    }
  };
  visit(value, 0);
  return names;
}

export async function runEnterpriseSkillScript(params: {
  config?: OpenClawConfig;
  snapshot?: SkillSnapshot;
  accountId: string;
  sessionId?: string;
  agentId: string;
  skillKey: string;
  entrypointName: string;
  operation?: string;
  arguments: Record<string, unknown>;
  login?: boolean;
  signal?: AbortSignal;
  expectedRevision?: string;
  assertActive?: () => void;
}): Promise<unknown> {
  const capability = requireEnterpriseSkillCapabilities(params);
  const assertActive = () => {
    params.signal?.throwIfAborted();
    params.assertActive?.();
    const current = requireEnterpriseSkillCapabilities(params);
    if (current.revision !== (params.expectedRevision ?? capability.revision)) {
      throw new EnterpriseSkillScriptError("SKILL_CAPABILITY_CHANGED", 409);
    }
  };
  assertActive();
  if (
    !capability.skillsSnapshot.skills.some(
      (skill) => (skill.skillKey ?? skill.name) === params.skillKey,
    )
  ) {
    throw new EnterpriseSkillScriptError("SKILL_NOT_GRANTED", 403);
  }
  const resolved = resolveEnterpriseSkillScript({ ...params, snapshot: capability.skillsSnapshot });
  if (!resolved.skill.source || !isEnterpriseHostScriptSource(resolved.skill.source)) {
    deleteToken(params.accountId, params.skillKey);
    throw new EnterpriseSkillScriptError("SKILL_NOT_GRANTED", 403);
  }
  const operation = params.operation?.trim();
  if (
    resolved.entrypoint.kind === "operation" &&
    (!operation || !SCRIPT_ID_PATTERN.test(operation))
  ) {
    throw new EnterpriseSkillScriptError("SKILL_OPERATION_INVALID", 400);
  }
  if (resolved.entrypoint.kind === "fixed" && operation) {
    throw new EnterpriseSkillScriptError("SKILL_OPERATION_INVALID", 400);
  }
  const auth = resolved.skill.scriptRuntime?.auth;
  if (params.login !== true && auth && operation === auth.loginOperation) {
    throw new EnterpriseSkillScriptError("SKILL_LOGIN_FORBIDDEN", 403);
  }
  if (params.login !== true) {
    assertNoSecrets(params.arguments);
  }
  let token = "";
  const authExempt =
    params.login === true ||
    (resolved.entrypoint.kind === "operation" &&
      Boolean(operation && resolved.entrypoint.authExemptOperations?.includes(operation)));
  if (auth && !authExempt) {
    const active = readToken(params.accountId, params.skillKey);
    if (!active) {
      throw new EnterpriseSkillScriptError("SKILL_AUTH_REQUIRED", 401);
    }
    token = active.token;
  }
  const runtimeArguments = {
    ...params.arguments,
    ...(token && auth ? { [auth.injectArgument]: token } : {}),
  };
  const payload = JSON.stringify({ arguments: runtimeArguments });
  if (Buffer.byteLength(payload, "utf8") > INPUT_LIMIT_BYTES) {
    throw new EnterpriseSkillScriptError("SKILL_ARGUMENTS_INVALID", 400);
  }
  const { executable, scriptsDir } = await resolveExecutable(resolved);
  const systemEnv = Object.fromEntries(
    ["PATH", "LANG", "LC_ALL", "TMPDIR", "TEMP", "TMP"]
      .map((key) => [key, process.env[key]])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const startedAt = Date.now();
  let outcome: "success" | "failure" = "failure";
  try {
    // No async gap between the live authority fence and starting the process.
    assertActive();
    const result = await spawnScript({
      executable,
      scriptsDir,
      operation,
      payload,
      env: {
        ...systemEnv,
        ...resolveSkillHostEnv({ config: capability.config, skill: resolved.skill }),
      },
      timeoutMs: resolved.entrypoint.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      signal: params.signal,
    });
    if (result.code !== 0) {
      const code = safeScriptFailure(result.stderr);
      if (code === "AUTH_REQUIRED") {
        deleteToken(params.accountId, params.skillKey);
      }
      throw new EnterpriseSkillScriptError(
        code === "AUTH_REQUIRED" ? "SKILL_AUTH_REQUIRED" : code,
        code === "AUTH_REQUIRED" ? 401 : 502,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      throw new EnterpriseSkillScriptError("SKILL_RESULT_INVALID", 502);
    }
    if (token && authFailure(parsed)) {
      deleteToken(params.accountId, params.skillKey);
      throw new EnterpriseSkillScriptError("SKILL_AUTH_REQUIRED", 401);
    }
    outcome = "success";
    return params.login === true ? parsed : scrubSecrets(parsed, token);
  } finally {
    appendEnterpriseAuditEvent({
      actorAccountId: params.accountId,
      actorSessionId: params.sessionId ?? null,
      action: "skill.script.run",
      targetType: "skill",
      targetId: params.skillKey,
      requestId: null,
      before: null,
      after: {
        skill: params.skillKey,
        entrypoint: params.entrypointName,
        operation: operation ?? null,
        argumentsHash: hashSkillScriptArguments(
          params.login ? Object.keys(params.arguments).toSorted() : params.arguments,
        ),
        durationMs: Date.now() - startedAt,
        status: outcome,
      },
      outcome,
    });
  }
}

export async function loginEnterpriseSkill(params: {
  config?: OpenClawConfig;
  snapshot?: SkillSnapshot;
  accountId: string;
  sessionId?: string;
  agentId: string;
  skillKey: string;
  fields: Record<string, string>;
}): Promise<{ connected: true; expiresAt: number }> {
  const capability = requireEnterpriseSkillCapabilities(params);
  const skill = capability.skillsSnapshot.skills.find(
    (entry) => (entry.skillKey ?? entry.name) === params.skillKey,
  );
  const auth = skill?.scriptRuntime?.auth;
  if (!auth) {
    throw new EnterpriseSkillScriptError("SKILL_AUTH_NOT_CONFIGURED", 400);
  }
  const expectedIds = new Set(auth.fields.map((field) => field.id));
  if (
    Object.keys(params.fields).length !== expectedIds.size ||
    Object.entries(params.fields).some(
      ([id, value]) =>
        !expectedIds.has(id) || typeof value !== "string" || !value || value.length > 512,
    )
  ) {
    throw new EnterpriseSkillScriptError("SKILL_AUTH_FIELDS_INVALID", 400);
  }
  const args = Object.fromEntries(
    auth.fields.map((field) => [field.argument, params.fields[field.id]!]),
  );
  const result = await runEnterpriseSkillScript({
    ...params,
    entrypointName: auth.loginEntrypoint,
    operation: auth.loginOperation,
    arguments: args,
    login: true,
    expectedRevision: capability.revision,
  });
  const token = extractToken(result, auth);
  if (!token) {
    throw new EnterpriseSkillScriptError("SKILL_AUTH_INVALID", 401);
  }
  const expiresAt = Date.now() + auth.ttlSeconds * 1000;
  if (requireEnterpriseSkillCapabilities(params).revision !== capability.revision) {
    throw new EnterpriseSkillScriptError("SKILL_CAPABILITY_CHANGED", 409);
  }
  writeToken(params.accountId, params.skillKey, token, expiresAt);
  return { connected: true, expiresAt };
}
