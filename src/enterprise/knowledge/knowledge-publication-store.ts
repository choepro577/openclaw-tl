import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { appendEnterpriseKnowledgeChangeRow } from "./knowledge-job-store.js";
import {
  integer,
  nullableText,
  text,
  toSource,
  toVersion,
  type KnowledgeStoreRow as Row,
} from "./knowledge-store-common.js";
import {
  assertBaseRevision,
  EnterpriseKnowledgeError,
  type KnowledgeGraphEnrichmentIdentity,
  type KnowledgeSource,
  type KnowledgeSourceVersion,
  type KnowledgeZone,
} from "./knowledge-types.js";
import { getKnowledgeZone } from "./knowledge-zone-store.js";

export type KnowledgeCandidateGeneration = {
  id: string;
  zoneId: string;
  sourceSetRevision: number;
  buildRevision: number;
  status: string;
  lexicalStatus: string;
  vectorStatus: string;
  integrityStatus: string;
  graphStatus: "not_built" | "ready" | "degraded" | "error";
  graphSchemaVersion: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  graphProposedCount: number;
  graphOrphanCount: number;
  graphEnrichmentIdentity: KnowledgeGraphEnrichmentIdentity | null;
  snapshotRevision: number;
  artifactSchemaVersion: 1 | 2 | 3;
  aiAnalysisStatus: "off" | "ready" | "degraded";
  degradationReasons: string[];
  createdAt: number;
};

export function createKnowledgeGeneration(
  zoneId: string,
  sourceSetRevision: number,
  buildRevision: number,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeCandidateGeneration {
  ensureEnterpriseSchema(options);
  const id = generateSecureUuid();
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `INSERT INTO enterprise_knowledge_index_generations
       (id, zone_id, source_set_revision, build_revision, status, lexical_status, vector_status,
        graph_status, graph_schema_version, integrity_status, created_at)
       VALUES (?, ?, ?, ?, 'building', 'pending', 'pending', 'building', 2, 'unknown', ?)`,
        )
        .run(id, zoneId, sourceSetRevision, buildRevision, now),
    options,
    { operationLabel: "enterprise.knowledge.generation.create" },
  );
  return {
    id,
    zoneId,
    sourceSetRevision,
    buildRevision,
    status: "building",
    lexicalStatus: "pending",
    vectorStatus: "pending",
    integrityStatus: "unknown",
    graphStatus: "not_built",
    graphSchemaVersion: 2,
    graphNodeCount: 0,
    graphEdgeCount: 0,
    graphProposedCount: 0,
    graphOrphanCount: 0,
    graphEnrichmentIdentity: null,
    snapshotRevision: buildRevision,
    artifactSchemaVersion: 1,
    aiAnalysisStatus: "off",
    degradationReasons: [],
    createdAt: now,
  };
}

export function finishKnowledgeGeneration(
  generationId: string,
  params: {
    lexicalStatus: "ready" | "error";
    vectorStatus: "ready" | "unavailable" | "error";
    artifactChecksum?: string;
    embeddingIdentity?: { provider: string; model: string; dimension: number };
    graphStatus?: "not_built" | "ready" | "degraded" | "error";
    graphSchemaVersion?: number;
    graphNodeCount?: number;
    graphEdgeCount?: number;
    graphProposedCount?: number;
    graphOrphanCount?: number;
    graphEnrichmentIdentity?: KnowledgeGraphEnrichmentIdentity;
  },
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const now = Date.now();
      const finished = db
        .prepare(
          `UPDATE enterprise_knowledge_index_generations SET status = ?, lexical_status = ?,
       vector_status = ?, artifact_checksum = ?, embedding_identity_json = ?, graph_status = ?,
       graph_schema_version = ?, graph_node_count = ?, graph_edge_count = ?, graph_proposed_count = ?,
       graph_orphan_count = ?, graph_enrichment_identity_json = ?, integrity_status = ?, completed_at = ?
       WHERE id = ? AND status = 'building'`,
        )
        .run(
          params.lexicalStatus === "ready" ? "candidate" : "error",
          params.lexicalStatus,
          params.vectorStatus,
          params.artifactChecksum ?? null,
          params.embeddingIdentity ? JSON.stringify(params.embeddingIdentity) : null,
          params.graphStatus ?? "not_built",
          params.graphSchemaVersion ?? 1,
          params.graphNodeCount ?? 0,
          params.graphEdgeCount ?? 0,
          params.graphProposedCount ?? 0,
          params.graphOrphanCount ?? 0,
          params.graphEnrichmentIdentity ? JSON.stringify(params.graphEnrichmentIdentity) : null,
          params.lexicalStatus === "ready" ? "valid" : "corrupt",
          now,
          generationId,
        );
      if (finished.changes !== 1) {
        return false;
      }
      if (params.lexicalStatus === "ready") {
        db.prepare(
          `UPDATE enterprise_knowledge_index_generations SET status = 'retired', retired_at = ?
           WHERE zone_id = (
             SELECT zone_id FROM enterprise_knowledge_index_generations WHERE id = ?
           ) AND id <> ? AND status = 'candidate'`,
        ).run(now, generationId, generationId);
      }
      return true;
    },
    options,
    { operationLabel: "enterprise.knowledge.generation.finish" },
  );
}

export function setKnowledgeVersionsVectorStatus(
  versionIds: string[],
  vectorStatus: "ready" | "unavailable" | "error",
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  if (versionIds.length === 0) {
    return;
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const update = db.prepare(
        `UPDATE enterprise_knowledge_source_versions
         SET vector_status = ?, processing_status = ?
         WHERE id = ? AND processing_status IN ('ready', 'degraded')`,
      );
      for (const id of versionIds) {
        update.run(vectorStatus, vectorStatus === "ready" ? "ready" : "degraded", id);
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.version.vector-status" },
  );
}

export function getLatestKnowledgeCandidate(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeCandidateGeneration | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT g.*,
              COALESCE((
                SELECT MAX(r.artifact_schema_version)
                FROM enterprise_knowledge_generation_artifacts ga
                JOIN enterprise_knowledge_artifact_revisions r ON r.artifact_hash = ga.artifact_hash
                WHERE ga.generation_id = g.id
              ), 1) AS artifact_schema_version
       FROM enterprise_knowledge_index_generations g
       WHERE g.zone_id = ? AND g.status = 'candidate'
     ORDER BY COALESCE(build_revision, source_set_revision) DESC, created_at DESC LIMIT 1`,
    )
    .get(zoneId) as Row | undefined;
  return row
    ? {
        id: text(row, "id"),
        zoneId: text(row, "zone_id"),
        sourceSetRevision: integer(row, "source_set_revision"),
        buildRevision:
          row.build_revision === null
            ? integer(row, "source_set_revision")
            : integer(row, "build_revision"),
        status: text(row, "status"),
        lexicalStatus: text(row, "lexical_status"),
        vectorStatus: text(row, "vector_status"),
        integrityStatus: text(row, "integrity_status"),
        graphStatus: (nullableText(row, "graph_status") ??
          "not_built") as KnowledgeCandidateGeneration["graphStatus"],
        graphSchemaVersion:
          row.graph_schema_version === null ? 1 : integer(row, "graph_schema_version"),
        graphNodeCount: row.graph_node_count === null ? 0 : integer(row, "graph_node_count"),
        graphEdgeCount: row.graph_edge_count === null ? 0 : integer(row, "graph_edge_count"),
        graphProposedCount:
          row.graph_proposed_count === null ? 0 : integer(row, "graph_proposed_count"),
        graphOrphanCount: row.graph_orphan_count === null ? 0 : integer(row, "graph_orphan_count"),
        graphEnrichmentIdentity: nullableText(row, "graph_enrichment_identity_json")
          ? (JSON.parse(
              text(row, "graph_enrichment_identity_json"),
            ) as KnowledgeCandidateGeneration["graphEnrichmentIdentity"])
          : null,
        snapshotRevision:
          row.build_revision === null
            ? integer(row, "source_set_revision")
            : integer(row, "build_revision"),
        artifactSchemaVersion: Math.max(1, Math.min(3, integer(row, "artifact_schema_version"))) as
          | 1
          | 2
          | 3,
        aiAnalysisStatus:
          nullableText(row, "graph_status") === "degraded"
            ? "degraded"
            : nullableText(row, "graph_enrichment_identity_json")
              ? "ready"
              : "off",
        degradationReasons:
          nullableText(row, "graph_status") === "degraded"
            ? [
                nullableText(row, "graph_enrichment_identity_json")
                  ? "ai_batch_failed"
                  : "ai_enrichment_not_available",
              ]
            : [],
        createdAt: integer(row, "created_at"),
      }
    : undefined;
}

export function listReadyKnowledgeVersionsForZone(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): Array<{ source: KnowledgeSource; version: KnowledgeSourceVersion }> {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT s.id AS s_id, s.zone_id AS s_zone_id, s.kind AS s_kind, s.title AS s_title,
            s.canonical_url AS s_canonical_url, s.status AS s_status, s.draft_revision AS s_draft_revision,
            s.current_version_number AS s_current_version_number, s.created_at AS s_created_at,
            s.updated_at AS s_updated_at, v.*
     FROM enterprise_knowledge_sources s JOIN enterprise_knowledge_source_versions v
       ON v.source_id = s.id AND v.version_number = s.current_version_number
     WHERE s.zone_id = ? AND s.status = 'active' AND v.processing_status IN ('ready', 'degraded')
     ORDER BY s.id`,
    )
    .all(zoneId) as Row[];
  return rows.map((row) => ({
    source: toSource({
      id: row.s_id,
      zone_id: row.s_zone_id,
      kind: row.s_kind,
      title: row.s_title,
      canonical_url: row.s_canonical_url,
      status: row.s_status,
      draft_revision: row.s_draft_revision,
      current_version_number: row.s_current_version_number,
      created_at: row.s_created_at,
      updated_at: row.s_updated_at,
    }),
    version: toVersion(row),
  }));
}

export function publishKnowledgeCandidate(
  params: {
    zoneId: string;
    baseRevision: number;
    generationId: string;
    degradedReason?: string;
    actorAccountId: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): { publicationId: string; publicationNumber: number } {
  ensureEnterpriseSchema(options);
  const publicationId = generateSecureUuid();
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT * FROM enterprise_knowledge_zones WHERE id = ?")
        .get(params.zoneId) as Row | undefined;
      if (!zone || zone.status !== "active") {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(params.baseRevision, integer(zone, "revision"));
      const generation = db
        .prepare(
          "SELECT * FROM enterprise_knowledge_index_generations WHERE id = ? AND zone_id = ? AND status = 'candidate'",
        )
        .get(params.generationId, params.zoneId) as Row | undefined;
      if (!generation || generation.integrity_status !== "valid") {
        throw new EnterpriseKnowledgeError(
          "CANDIDATE_NOT_READY",
          422,
          "Candidate generation is not ready.",
        );
      }
      if (integer(generation, "source_set_revision") !== integer(zone, "source_set_revision")) {
        throw new EnterpriseKnowledgeError(
          "STALE_CANDIDATE",
          409,
          "Sources changed after this candidate was built.",
        );
      }
      if (
        Number(generation.build_revision ?? generation.source_set_revision) !==
        Number(zone.build_revision ?? zone.source_set_revision)
      ) {
        throw new EnterpriseKnowledgeError(
          "STALE_CANDIDATE",
          409,
          "Graph settings or review decisions changed after this candidate was built.",
        );
      }
      if (text(generation, "graph_status") === "error") {
        throw new EnterpriseKnowledgeError(
          "GRAPH_INTEGRITY_FAILED",
          422,
          "Candidate graph integrity checks failed.",
        );
      }
      const vectorStatus = text(generation, "vector_status");
      const degraded = vectorStatus !== "ready";
      if (degraded && !params.degradedReason?.trim()) {
        throw new EnterpriseKnowledgeError(
          "DEGRADED_CONFIRMATION_REQUIRED",
          422,
          "A reason is required to publish FTS-only.",
        );
      }
      const next = (
        db
          .prepare(
            "SELECT COALESCE(MAX(publication_number), 0) + 1 AS value FROM enterprise_knowledge_publications WHERE zone_id = ?",
          )
          .get(params.zoneId) as Row
      ).value as number;
      const now = Date.now();
      db.prepare(
        `INSERT INTO enterprise_knowledge_publications
         (id, zone_id, generation_id, source_set_revision, publication_number, lexical_status,
          vector_status, degraded_override, degraded_reason, published_by_account_id, published_at)
         VALUES (?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?, ?)`,
      ).run(
        publicationId,
        params.zoneId,
        params.generationId,
        integer(generation, "source_set_revision"),
        next,
        vectorStatus,
        degraded ? 1 : 0,
        degraded ? params.degradedReason!.trim().slice(0, 1_000) : null,
        params.actorAccountId,
        now,
      );
      const ready = db
        .prepare(
          `SELECT s.id AS source_id, v.id AS version_id FROM enterprise_knowledge_sources s
         JOIN enterprise_knowledge_source_versions v ON v.source_id = s.id AND v.version_number = s.current_version_number
         WHERE s.zone_id = ? AND s.status = 'active' AND v.processing_status IN ('ready', 'degraded') ORDER BY s.id`,
        )
        .all(params.zoneId) as Row[];
      const insert = db.prepare(
        "INSERT INTO enterprise_knowledge_publication_sources (publication_id, source_id, source_version_id, position) VALUES (?, ?, ?, ?)",
      );
      ready.forEach((row, position) =>
        insert.run(publicationId, text(row, "source_id"), text(row, "version_id"), position),
      );
      db.prepare(
        `UPDATE enterprise_knowledge_source_versions SET publication_status = 'superseded'
         WHERE zone_id = ? AND publication_status = 'published'`,
      ).run(params.zoneId);
      for (const row of ready) {
        db.prepare(
          "UPDATE enterprise_knowledge_source_versions SET publication_status = 'published' WHERE id = ?",
        ).run(text(row, "version_id"));
      }
      db.prepare(
        "UPDATE enterprise_knowledge_index_generations SET status = 'retired', retired_at = ? WHERE zone_id = ? AND status = 'active'",
      ).run(now, params.zoneId);
      db.prepare(
        "UPDATE enterprise_knowledge_index_generations SET status = 'active' WHERE id = ?",
      ).run(params.generationId);
      const flipped = db
        .prepare(
          `UPDATE enterprise_knowledge_zones SET active_publication_id = ?, revision = revision + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
        )
        .run(publicationId, params.actorAccountId, now, params.zoneId, params.baseRevision);
      if (flipped.changes !== 1) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed during publish.",
        );
      }
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "publication",
        entityId: publicationId,
        operation: "completed",
        revision: params.baseRevision + 1,
        status: "active",
        stage: "published",
        occurredAt: now,
      });
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "graph",
        entityId: params.generationId,
        operation: "updated",
        revision: params.baseRevision + 1,
        status: text(generation, "graph_status"),
        stage: "active",
        occurredAt: now,
      });
      return { publicationId, publicationNumber: Number(next) };
    },
    options,
    { operationLabel: "enterprise.knowledge.publish" },
  );
}

export function rollbackKnowledgePublication(
  params: { zoneId: string; publicationId: string; baseRevision: number; actorAccountId: string },
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(params.zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(params.baseRevision, integer(zone, "revision"));
      const publication = db
        .prepare(
          `SELECT p.generation_id FROM enterprise_knowledge_publications p
         JOIN enterprise_knowledge_index_generations g ON g.id = p.generation_id
         WHERE p.id = ? AND p.zone_id = ? AND g.integrity_status = 'valid'`,
        )
        .get(params.publicationId, params.zoneId) as Row | undefined;
      if (!publication) {
        throw new EnterpriseKnowledgeError(
          "ROLLBACK_TARGET_UNAVAILABLE",
          422,
          "Rollback target is unavailable or corrupt.",
        );
      }
      const now = Date.now();
      db.prepare(
        "UPDATE enterprise_knowledge_index_generations SET status = 'retired', retired_at = ? WHERE zone_id = ? AND status = 'active'",
      ).run(now, params.zoneId);
      db.prepare(
        "UPDATE enterprise_knowledge_index_generations SET status = 'active', retired_at = NULL WHERE id = ?",
      ).run(text(publication, "generation_id"));
      const flipped = db
        .prepare(
          `UPDATE enterprise_knowledge_zones SET active_publication_id = ?, revision = revision + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
        )
        .run(params.publicationId, params.actorAccountId, now, params.zoneId, params.baseRevision);
      if (flipped.changes !== 1) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed during rollback.",
        );
      }
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "publication",
        entityId: params.publicationId,
        operation: "updated",
        revision: params.baseRevision + 1,
        status: "active",
        stage: "rolled_back",
        occurredAt: now,
      });
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "graph",
        entityId: text(publication, "generation_id"),
        operation: "updated",
        revision: params.baseRevision + 1,
        status: "ready",
        stage: "active",
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.rollback" },
  );
  return getKnowledgeZone(params.zoneId, options)!;
}

export type KnowledgePublicationRecord = {
  id: string;
  zoneId: string;
  generationId: string;
  sourceSetRevision: number;
  publicationNumber: number;
  lexicalStatus: string;
  vectorStatus: string;
  degradedOverride: boolean;
  degradedReason: string | null;
  publishedByAccountId: string;
  publishedAt: number;
  sourceCount: number;
};

export function listKnowledgePublications(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgePublicationRecord[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM enterprise_knowledge_publication_sources ps
               WHERE ps.publication_id = p.id) AS source_count
       FROM enterprise_knowledge_publications p
       WHERE p.zone_id = ? ORDER BY p.publication_number DESC`,
    )
    .all(zoneId) as Row[];
  return rows.map((row) => ({
    id: text(row, "id"),
    zoneId: text(row, "zone_id"),
    generationId: text(row, "generation_id"),
    sourceSetRevision: integer(row, "source_set_revision"),
    publicationNumber: integer(row, "publication_number"),
    lexicalStatus: text(row, "lexical_status"),
    vectorStatus: text(row, "vector_status"),
    degradedOverride: integer(row, "degraded_override") === 1,
    degradedReason: nullableText(row, "degraded_reason"),
    publishedByAccountId: text(row, "published_by_account_id"),
    publishedAt: integer(row, "published_at"),
    sourceCount: integer(row, "source_count"),
  }));
}
