import { sha256Hex } from "../../infra/crypto-digest.js";
import {
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { EnterpriseKnowledgeError } from "../knowledge/knowledge-types.js";

type Row = Record<string, unknown>;

export function hashEnterpriseExtensionRequest(value: unknown): string {
  return sha256Hex(JSON.stringify(value));
}

export type EnterpriseExtensionIdempotencyClaim =
  | { state: "claimed" }
  | { state: "replay"; status: number; response: unknown };

export function claimEnterpriseExtensionIdempotency(
  input: {
    audience: "admin" | "user";
    actorAccountId: string;
    operation: string;
    key: string;
    requestHash: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseExtensionIdempotencyClaim {
  ensureEnterpriseSchema(options);
  const key = input.key.trim();
  if (!key || key.length > 200) {
    throw new EnterpriseKnowledgeError(
      "IDEMPOTENCY_KEY_REQUIRED",
      422,
      "A valid Idempotency-Key header is required.",
    );
  }
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const now = Date.now();
      db.prepare("DELETE FROM enterprise_extension_idempotency WHERE expires_at <= ?").run(now); // sqlite-allow-raw -- Bounded idempotency retention.
      const existing = db
        .prepare(
          `SELECT request_hash, response_status, response_json, state
           FROM enterprise_extension_idempotency
           WHERE audience = ? AND actor_account_id = ? AND operation = ? AND idempotency_key = ?`,
        )
        .get(input.audience, input.actorAccountId, input.operation, key) as Row | undefined; // sqlite-allow-raw -- Exact idempotency fence lookup.
      if (existing) {
        if (String(existing.request_hash) !== input.requestHash) {
          throw new EnterpriseKnowledgeError(
            "IDEMPOTENCY_KEY_REUSED",
            409,
            "The Idempotency-Key was already used for a different request.",
          );
        }
        if (existing.state === "complete") {
          return {
            state: "replay" as const,
            status: Number(existing.response_status),
            response: JSON.parse(String(existing.response_json)) as unknown,
          };
        }
        throw new EnterpriseKnowledgeError(
          "IDEMPOTENCY_IN_PROGRESS",
          409,
          "An operation with this Idempotency-Key is still in progress.",
        );
      }
      db.prepare(
        `INSERT INTO enterprise_extension_idempotency
         (audience, actor_account_id, operation, idempotency_key, request_hash, state,
          created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?)`,
      ).run(
        input.audience,
        input.actorAccountId,
        input.operation,
        key,
        input.requestHash,
        now,
        now,
        now + 24 * 60 * 60 * 1_000,
      ); // sqlite-allow-raw -- Atomic mutation fence claim.
      return { state: "claimed" as const };
    },
    options,
    { operationLabel: "enterprise.extension.idempotency.claim" },
  );
}

export function completeEnterpriseExtensionIdempotency(
  input: {
    audience: "admin" | "user";
    actorAccountId: string;
    operation: string;
    key: string;
    requestHash: string;
    responseStatus: number;
    response: unknown;
  },
  options: OpenClawStateDatabaseOptions = {},
): void {
  const responseJson = JSON.stringify(input.response);
  if (Buffer.byteLength(responseJson, "utf8") > 256 * 1024) {
    throw new Error("IDEMPOTENCY_RESPONSE_TOO_LARGE");
  }
  const changed = runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_extension_idempotency SET state = 'complete', response_status = ?,
           response_json = ?, updated_at = ? WHERE audience = ? AND actor_account_id = ?
           AND operation = ? AND idempotency_key = ? AND request_hash = ? AND state = 'running'`,
        )
        .run(
          input.responseStatus,
          responseJson,
          Date.now(),
          input.audience,
          input.actorAccountId,
          input.operation,
          input.key.trim(),
          input.requestHash,
        ).changes, // sqlite-allow-raw -- Complete the owned idempotency fence.
    options,
    { operationLabel: "enterprise.extension.idempotency.complete" },
  );
  if (changed !== 1) {
    throw new Error("IDEMPOTENCY_FENCE_LOST");
  }
}

export function abandonEnterpriseExtensionIdempotency(
  input: {
    audience: "admin" | "user";
    actorAccountId: string;
    operation: string;
    key: string;
    requestHash: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): void {
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `DELETE FROM enterprise_extension_idempotency WHERE audience = ? AND actor_account_id = ?
         AND operation = ? AND idempotency_key = ? AND request_hash = ? AND state = 'running'`,
      ).run(
        input.audience,
        input.actorAccountId,
        input.operation,
        input.key.trim(),
        input.requestHash,
      ); // sqlite-allow-raw -- Release a failed mutation fence for safe retry.
    },
    options,
    { operationLabel: "enterprise.extension.idempotency.abandon" },
  );
}
