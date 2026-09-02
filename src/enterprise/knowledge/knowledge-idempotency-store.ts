import { createHash } from "node:crypto";
import {
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { integer, text, type KnowledgeStoreRow as Row } from "./knowledge-store-common.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

export function hashKnowledgeIdempotencyRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export type KnowledgeIdempotencyClaim =
  | { state: "claimed" }
  | { state: "replay"; status: number; response: unknown };

export function claimKnowledgeIdempotency(
  params: {
    audience: "admin" | "user";
    actorAccountId: string;
    operation: string;
    key: string;
    requestHash: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeIdempotencyClaim {
  ensureEnterpriseSchema(options);
  const key = params.key.trim();
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
      db.prepare("DELETE FROM enterprise_knowledge_idempotency WHERE expires_at <= ?").run(now);
      const existing = db
        .prepare(
          `SELECT request_hash, response_status, response_json, state
           FROM enterprise_knowledge_idempotency
           WHERE audience = ? AND actor_account_id = ? AND operation = ? AND idempotency_key = ?`,
        )
        .get(params.audience, params.actorAccountId, params.operation, key) as Row | undefined;
      if (existing) {
        if (text(existing, "request_hash") !== params.requestHash) {
          throw new EnterpriseKnowledgeError(
            "IDEMPOTENCY_KEY_REUSED",
            409,
            "The Idempotency-Key was already used for a different request.",
          );
        }
        if (text(existing, "state") === "complete") {
          return {
            state: "replay" as const,
            status: integer(existing, "response_status"),
            response: JSON.parse(text(existing, "response_json")) as unknown,
          };
        }
        throw new EnterpriseKnowledgeError(
          "IDEMPOTENCY_IN_PROGRESS",
          409,
          "An operation with this Idempotency-Key is still in progress.",
        );
      }
      db.prepare(
        `INSERT INTO enterprise_knowledge_idempotency
         (audience, actor_account_id, operation, idempotency_key, request_hash, state, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, 'running', ?, ?)`,
      ).run(
        params.audience,
        params.actorAccountId,
        params.operation,
        key,
        params.requestHash,
        now,
        now + 24 * 60 * 60 * 1_000,
      );
      return { state: "claimed" as const };
    },
    options,
    { operationLabel: "enterprise.knowledge.idempotency.claim" },
  );
}

export function completeKnowledgeIdempotency(
  params: {
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
  ensureEnterpriseSchema(options);
  const responseJson = JSON.stringify(params.response);
  if (Buffer.byteLength(responseJson, "utf8") > 256 * 1024) {
    throw new EnterpriseKnowledgeError(
      "IDEMPOTENCY_RESPONSE_TOO_LARGE",
      500,
      "The operation response could not be recorded safely.",
    );
  }
  const changed = runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_knowledge_idempotency
           SET state = 'complete', response_status = ?, response_json = ?
           WHERE audience = ? AND actor_account_id = ? AND operation = ?
             AND idempotency_key = ? AND request_hash = ? AND state = 'running'`,
        )
        .run(
          params.responseStatus,
          responseJson,
          params.audience,
          params.actorAccountId,
          params.operation,
          params.key.trim(),
          params.requestHash,
        ).changes,
    options,
    { operationLabel: "enterprise.knowledge.idempotency.complete" },
  );
  if (changed !== 1) {
    throw new EnterpriseKnowledgeError(
      "IDEMPOTENCY_FENCE_LOST",
      409,
      "The idempotency claim is no longer active.",
    );
  }
}

export function abandonKnowledgeIdempotency(
  params: {
    audience: "admin" | "user";
    actorAccountId: string;
    operation: string;
    key: string;
    requestHash: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `DELETE FROM enterprise_knowledge_idempotency
           WHERE audience = ? AND actor_account_id = ? AND operation = ?
             AND idempotency_key = ? AND request_hash = ? AND state = 'running'`,
        )
        .run(
          params.audience,
          params.actorAccountId,
          params.operation,
          params.key.trim(),
          params.requestHash,
        ),
    options,
    { operationLabel: "enterprise.knowledge.idempotency.abandon" },
  );
}
