import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  executeSqliteQuerySync,
  executeSqliteQueryTakeFirstSync,
  getNodeSqliteKysely,
} from "../../infra/kysely-sync.js";
import type { DB } from "../../state/openclaw-state-db.generated.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  parseEnterpriseResourceKey,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { deferKnowledgeAccessChange } from "./knowledge-access-changes.js";
import { isKnowledgeEvidenceTransferTarget } from "./knowledge-evidence-transfer-policy.js";
import { toZone } from "./knowledge-store-common.js";
import {
  assertBaseRevision,
  EnterpriseKnowledgeError,
  type KnowledgeZone,
} from "./knowledge-types.js";

export function listKnowledgeEvidenceTransferGrants(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): string[] {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  return executeSqliteQuerySync(
    db,
    getNodeSqliteKysely<DB>(db)
      .selectFrom("enterprise_knowledge_evidence_transfer_grants")
      .select("target_agent_resource_key")
      .where("zone_id", "=", zoneId)
      .orderBy("target_agent_resource_key"),
  ).rows.map((row) => row.target_agent_resource_key);
}

export function replaceKnowledgeEvidenceTransferGrants(
  input: {
    zoneId: string;
    targetAgentResourceKeys: string[];
    baseRevision: number;
    actorAccountId: string;
    config: OpenClawConfig;
    audit?: { actorSessionId: string; requestId: string | null };
  },
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  if (
    input.targetAgentResourceKeys.length > 1_000 ||
    input.targetAgentResourceKeys.some(
      (key) => !isKnowledgeEvidenceTransferTarget(input.config, key),
    )
  ) {
    throw new EnterpriseKnowledgeError(
      "INVALID_EVIDENCE_TRANSFER_TARGET",
      422,
      "Select an active shared specialist from the catalog.",
    );
  }
  const keys = [...new Set(input.targetAgentResourceKeys)].toSorted();
  return runOpenClawStateWriteTransaction(
    (database) => {
      const { db } = database;
      const query = getNodeSqliteKysely<DB>(db);
      const current = executeSqliteQueryTakeFirstSync(
        db,
        query.selectFrom("enterprise_knowledge_zones").selectAll().where("id", "=", input.zoneId),
      );
      if (!current) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(input.baseRevision, current.revision);
      const before = listKnowledgeEvidenceTransferGrants(input.zoneId, options);
      const now = Date.now();
      executeSqliteQuerySync(
        db,
        query
          .deleteFrom("enterprise_knowledge_evidence_transfer_grants")
          .where("zone_id", "=", input.zoneId),
      );
      for (const key of keys) {
        executeSqliteQuerySync(
          db,
          query.insertInto("enterprise_knowledge_evidence_transfer_grants").values({
            zone_id: input.zoneId,
            target_agent_resource_key: key,
            created_by_account_id: input.actorAccountId,
            created_at: now,
          }),
        );
      }
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        query
          .updateTable("enterprise_knowledge_zones")
          .set({
            revision: current.revision + 1,
            access_revision: current.access_revision + 1,
            updated_by_account_id: input.actorAccountId,
            updated_at: now,
          })
          .where("id", "=", input.zoneId)
          .where("revision", "=", input.baseRevision)
          .returningAll(),
      );
      if (!updated) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The resource changed. Reload and retry.",
        );
      }
      // Nested audit writes use the state owner's savepoint: a failed audit rolls back the grant too.
      appendEnterpriseAuditEvent(
        {
          actorAccountId: input.actorAccountId,
          actorSessionId: input.audit?.actorSessionId ?? null,
          action: "knowledge.evidence_transfers.replace",
          targetType: "knowledge_zone",
          targetId: input.zoneId,
          requestId: input.audit?.requestId ?? null,
          before: { targetAgentResourceKeys: before, accessRevision: current.access_revision },
          after: { targetAgentResourceKeys: keys, accessRevision: updated.access_revision },
          outcome: "success",
        },
        options,
      );
      deferKnowledgeAccessChange(database, input.zoneId);
      return toZone(updated);
    },
    options,
    { operationLabel: "enterprise.knowledge.evidence-transfers.replace" },
  );
}

/** A receive-use check is deliberately stricter than Admin's draft grant listing. */
export function resolveKnowledgeEvidenceTransferGrant(
  input: {
    zoneId: string;
    targetAgentResourceKey: string;
  },
  options: OpenClawStateDatabaseOptions = {},
):
  | {
      zoneId: string;
      accessRevision: number;
      activePublicationId: string;
      egressPolicy: KnowledgeZone["egressPolicy"];
    }
  | undefined {
  const parsed = parseEnterpriseResourceKey("agent", input.targetAgentResourceKey);
  if (
    parsed.scope !== "shared" ||
    sharedAgentResourceKey(parsed.runtimeId) !== input.targetAgentResourceKey
  ) {
    return undefined;
  }
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const row = executeSqliteQueryTakeFirstSync(
    db,
    getNodeSqliteKysely<DB>(db)
      .selectFrom("enterprise_knowledge_evidence_transfer_grants as t")
      .innerJoin("enterprise_knowledge_zones as z", "z.id", "t.zone_id")
      .innerJoin("enterprise_knowledge_publications as p", (join) =>
        join.onRef("p.id", "=", "z.active_publication_id").onRef("p.zone_id", "=", "z.id"),
      )
      .innerJoin("enterprise_knowledge_index_generations as g", (join) =>
        join.onRef("g.id", "=", "p.generation_id").onRef("g.zone_id", "=", "z.id"),
      )
      .select(["z.id", "z.access_revision", "p.id as publication_id", "z.egress_policy"])
      .where("t.zone_id", "=", input.zoneId)
      .where("t.target_agent_resource_key", "=", input.targetAgentResourceKey)
      .where("z.status", "=", "active")
      .where("g.integrity_status", "=", "valid"),
  );
  return row
    ? {
        zoneId: row.id,
        accessRevision: row.access_revision,
        activePublicationId: row.publication_id,
        egressPolicy: row.egress_policy === "external_allowed" ? "external_allowed" : "local_only",
      }
    : undefined;
}
