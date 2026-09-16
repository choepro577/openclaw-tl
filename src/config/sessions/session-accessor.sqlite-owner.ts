import { sql } from "kysely";
import { executeSqliteQuerySync } from "../../infra/kysely-sync.js";
import { FIRST_USE_ADDITIVE_AGENT_COLUMN_DEFINITIONS } from "../../state/openclaw-agent-db-additive-columns.js";
import { withOpenClawAgentDatabaseReadOnly } from "../../state/openclaw-agent-db-readonly.js";
import {
  runOpenClawAgentWriteTransaction,
  type OpenClawAgentDatabase,
} from "../../state/openclaw-agent-db.js";
import { ensureColumn } from "../../state/openclaw-state-db-schema-helpers.js";
import { isInternalSessionEffectsKey } from "./internal-session-key.js";
import type { SessionAccessScope } from "./session-accessor.sqlite-contract.js";
import { publishSessionEntryCacheInvalidation } from "./session-accessor.sqlite-entry-cache.js";
import { parseReadableSqliteSessionEntryRow } from "./session-accessor.sqlite-entry-store.js";
import { hasSqliteSessionOwnerColumns } from "./session-accessor.sqlite-owner-projection.js";
import {
  cloneSessionEntry,
  getSessionKysely,
  resolveSqliteScope,
  toDatabaseOptions,
} from "./session-accessor.sqlite-scope.js";
import type {
  SessionEntryLatestReadResult,
  SessionEntryLatestReadScope,
} from "./session-accessor.types.js";
import { assertCanonicalSqliteSessionKeysCurrent } from "./session-canonical-key.js";
import type { SessionCreatedActor, SessionOwnerAssignment } from "./session-entry-provenance.js";

function escapeSqliteLikePattern(value: string): string {
  // Agent ids may contain `_`, which LIKE treats as a one-character wildcard.
  // Bind an escaped pattern and the escape character so a canonical prefix
  // cannot widen the probe beyond that agent's rows.
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Probes a bounded set of newest rows without materializing the complete entry
 * snapshot. The caller must provide an owner, a canonical key prefix, or
 * explicit canonical keys; otherwise this intentionally returns no rows.
 *
 * A one-row look-ahead reports truncation to callers that apply a second,
 * request-specific visibility predicate. Those callers can fall back to the
 * canonical full listing whenever the window is truncated, preserving the
 * exact existing semantics across multiple stores and malformed/legacy rows.
 */
export function listLatestSessionEntriesReadOnly(
  scope: SessionEntryLatestReadScope = {},
): SessionEntryLatestReadResult {
  const limit = Math.max(1, Math.min(256, Math.floor(scope.limit ?? 32)));
  const resolved = resolveSqliteScope({ ...scope, sessionKey: "" });
  const result = withOpenClawAgentDatabaseReadOnly((database) => {
    assertCanonicalSqliteSessionKeysCurrent(database);
    const db = getSessionKysely(database.db);
    const exactSessionKeys = (scope.exactSessionKeys ?? [])
      .map((key) => key.trim())
      .filter(Boolean);
    const prefixPredicates = scope.sessionKeyPrefix
      ? [
          /* kysely-allow-raw: The canonical agent prefix is bound as a value, not SQL text. */
          sql<boolean>`session_key LIKE ${`${escapeSqliteLikePattern(scope.sessionKeyPrefix)}%`} ESCAPE ${"\\"}`,
        ]
      : [];
    const exactPredicates =
      exactSessionKeys.length > 0
        ? [
            /* kysely-allow-raw: Exact canonical keys are parameter-bound for the bounded probe. */
            sql<boolean>`session_key in (${sql.join(exactSessionKeys.map((key) => sql.val(key)))})`,
          ]
        : [];
    const ownerId = scope.createdActorId?.trim();
    const ownerPredicates = ownerId
      ? [
          /* kysely-allow-raw: Promoted creator identity is compared with a bound value. */
          sql<boolean>`created_actor_id = ${ownerId}`,
          /* kysely-allow-raw: JSON fallback preserves legacy createdActor rows while values remain bound. */
          sql<boolean>`CASE WHEN json_valid(entry_json) = 1 THEN json_extract(entry_json, '$.createdActor.id') ELSE NULL END = ${ownerId}`,
          /* kysely-allow-raw: JSON fallback preserves legacy createdBy rows while values remain bound. */
          sql<boolean>`CASE WHEN json_valid(entry_json) = 1 THEN json_extract(entry_json, '$.createdBy.id') ELSE NULL END = ${ownerId}`,
        ]
      : [];
    const ownerPredicate =
      ownerPredicates.length > 0
        ? sql<boolean>`(${sql.join(ownerPredicates, sql` OR `)})`
        : undefined;
    const prefixPredicate =
      prefixPredicates.length > 0
        ? sql<boolean>`(${sql.join(prefixPredicates, sql` OR `)})`
        : undefined;
    const exactPredicate =
      exactPredicates.length > 0
        ? sql<boolean>`(${sql.join(exactPredicates, sql` OR `)})`
        : undefined;
    // The Enterprise portal may see an administrator home key in addition to
    // rows owned by the current profile. Keep those two ACL branches separate:
    // owner rows must also belong to the requested agent prefix, while an exact
    // home key is admitted independently of its creator metadata.
    const ownedAgentPredicate =
      ownerPredicate && prefixPredicate
        ? sql<boolean>`(${ownerPredicate} AND ${prefixPredicate})`
        : (ownerPredicate ?? prefixPredicate);
    const predicates = [
      ...(exactPredicate ? [exactPredicate] : []),
      ...(ownedAgentPredicate ? [ownedAgentPredicate] : []),
    ];
    if (predicates.length === 0) {
      return { entries: [], hasMore: false };
    }
    const rows = executeSqliteQuerySync(
      database.db,
      db
        .selectFrom("session_nodes")
        .selectAll()
        .where("session_key", "!=", "unknown")
        .where("archived_at", "is", null)
        .where((expression) => expression.or(predicates))
        .orderBy("pinned_at", "desc")
        .orderBy("updated_at", "desc")
        .orderBy("session_key", "asc")
        .limit(limit + 1),
    ).rows;
    const entries = rows.slice(0, limit).flatMap((row) => {
      if (isInternalSessionEffectsKey(row.session_key)) {
        return [];
      }
      const entry = parseReadableSqliteSessionEntryRow(database, row);
      return entry
        ? [
            {
              sessionKey: row.session_key,
              entry: scope.clone === false ? entry : cloneSessionEntry(entry),
            },
          ]
        : [];
    });
    return { entries, hasMore: rows.length > limit };
  }, toDatabaseOptions(resolved));
  return result.found ? result.value : { entries: [], hasMore: false };
}

export function replaceSessionOwnerInTransaction(
  database: OpenClawAgentDatabase,
  sessionKey: string,
  owner: SessionOwnerAssignment | undefined,
): boolean {
  if (!hasSqliteSessionOwnerColumns(database.db)) {
    if (!owner?.actor.id) {
      return false;
    }
    for (const { columnName, dataType, tableName } of FIRST_USE_ADDITIVE_AGENT_COLUMN_DEFINITIONS) {
      ensureColumn(database.db, tableName, `${columnName} ${dataType}`);
    }
  }
  const result = executeSqliteQuerySync(
    database.db,
    getSessionKysely(database.db)
      .updateTable("session_nodes")
      .set({
        owner_actor_type: owner?.actor.type ?? null,
        owner_actor_id: owner?.actor.id ?? null,
        owner_assigned_by_type: owner?.assignedBy?.type ?? null,
        owner_assigned_by_id: owner?.assignedBy?.id ?? null,
        owner_assigned_at: owner?.assignedAt ?? null,
      })
      .where("session_key", "=", sessionKey),
  );
  if (result.numAffectedRows !== 1n) {
    return false;
  }
  publishSessionEntryCacheInvalidation(database);
  return true;
}

export function assignSessionOwner(
  scope: SessionAccessScope,
  params: {
    owner: SessionCreatedActor & { id: string };
    assignedBy: SessionCreatedActor & { id: string };
    assignedAt?: number;
    assertCurrent?: () => void;
  },
): SessionOwnerAssignment | null {
  const resolved = resolveSqliteScope(scope);
  const options = toDatabaseOptions(resolved);
  const owner: SessionOwnerAssignment = {
    actor: params.owner,
    assignedBy: params.assignedBy,
    assignedAt: params.assignedAt ?? Date.now(),
  };
  const updated = runOpenClawAgentWriteTransaction(
    (database) => {
      params.assertCurrent?.();
      return replaceSessionOwnerInTransaction(database, resolved.sessionKey, owner);
    },
    options,
    { operationLabel: "sessions.assign-owner" },
  );
  return updated ? owner : null;
}
