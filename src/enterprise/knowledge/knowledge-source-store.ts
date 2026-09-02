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
  normalizeLabel,
  text,
  toSource,
  toVersion,
  type KnowledgeStoreRow as Row,
} from "./knowledge-store-common.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeSource,
  type KnowledgeSourceKind,
  type KnowledgeSourceVersion,
} from "./knowledge-types.js";

export function createKnowledgeSourceWithVersion(
  input: {
    zoneId: string;
    kind: KnowledgeSourceKind;
    title: string;
    canonicalUrl?: string;
    mimeType: string;
    originalName?: string;
    contentHash: string;
    blobHash?: string;
    byteSize: number;
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): { source: KnowledgeSource; version: KnowledgeSourceVersion; jobId: string } {
  ensureEnterpriseSchema(options);
  const sourceId = generateSecureUuid();
  const versionId = generateSecureUuid();
  const jobId = generateSecureUuid();
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT status FROM enterprise_knowledge_zones WHERE id = ?")
        .get(input.zoneId) as Row | undefined;
      if (!zone || zone.status !== "active") {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      db.prepare(
        `INSERT INTO enterprise_knowledge_sources
         (id, zone_id, kind, title, canonical_url, status, draft_revision, current_version_number,
          created_by_account_id, updated_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 1, 1, ?, ?, ?, ?)`,
      ).run(
        sourceId,
        input.zoneId,
        normalizeLabel(input.kind, "kind", 64),
        normalizeLabel(input.title, "title", 300),
        input.canonicalUrl ?? null,
        actorAccountId,
        actorAccountId,
        now,
        now,
      );
      db.prepare(
        `INSERT INTO enterprise_knowledge_source_versions
         (id, source_id, zone_id, version_number, pipeline_generation, publication_status,
          processing_status, content_hash, blob_hash, byte_size, mime_type, original_name,
          vector_status, created_by_account_id, created_at)
         VALUES (?, ?, ?, 1, 1, 'draft', 'queued', ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      ).run(
        versionId,
        sourceId,
        input.zoneId,
        input.contentHash,
        input.blobHash ?? null,
        input.byteSize,
        input.mimeType,
        input.originalName ?? null,
        actorAccountId,
        now,
      );
      db.prepare(
        `INSERT INTO enterprise_knowledge_jobs
         (id, zone_id, source_id, source_version_id, kind, stage, status, attempt,
          pipeline_generation, available_at, created_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'source_ingest', 'validate', 'queued', 0, 1, ?, ?, ?, ?)`,
      ).run(jobId, input.zoneId, sourceId, versionId, now, actorAccountId, now, now);
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET source_set_revision = source_set_revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         revision = revision + 1, updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
      ).run(actorAccountId, now, input.zoneId);
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: input.zoneId,
        entityType: "source",
        entityId: sourceId,
        operation: "created",
        revision: 1,
        status: "queued",
        occurredAt: now,
      });
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: input.zoneId,
        entityType: "job",
        entityId: jobId,
        operation: "created",
        status: "queued",
        stage: "validate",
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.source.create" },
  );
  return {
    source: getKnowledgeSource(sourceId, options)!,
    version: getKnowledgeSourceVersion(versionId, options)!,
    jobId,
  };
}

export function createKnowledgeSourceVersion(
  sourceId: string,
  input: {
    mimeType: string;
    originalName?: string;
    contentHash: string;
    blobHash?: string;
    byteSize: number;
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): { version: KnowledgeSourceVersion; jobId: string } {
  ensureEnterpriseSchema(options);
  const versionId = generateSecureUuid();
  const jobId = generateSecureUuid();
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const source = db
        .prepare("SELECT * FROM enterprise_knowledge_sources WHERE id = ? AND status != 'archived'")
        .get(sourceId) as Row | undefined;
      if (!source) {
        throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
      }
      const activeJob = db
        .prepare(
          `SELECT id FROM enterprise_knowledge_jobs
           WHERE source_id = ? AND status IN ('queued', 'running', 'retry_wait') LIMIT 1`,
        )
        .get(sourceId) as Row | undefined;
      if (activeJob) {
        throw new EnterpriseKnowledgeError(
          "SOURCE_PIPELINE_ACTIVE",
          409,
          "Wait for or cancel the active source pipeline before creating another version.",
        );
      }
      const versionNumber = integer(source, "current_version_number") + 1;
      const generationRow = db
        .prepare(
          `SELECT COALESCE(MAX(pipeline_generation), 0) + 1 AS next_pipeline_generation
           FROM enterprise_knowledge_source_versions WHERE source_id = ?`,
        )
        .get(sourceId) as Row;
      const pipelineGeneration = integer(generationRow, "next_pipeline_generation");
      db.prepare(
        `INSERT INTO enterprise_knowledge_source_versions
         (id, source_id, zone_id, version_number, pipeline_generation, publication_status,
          processing_status, content_hash, blob_hash, byte_size, mime_type, original_name,
          vector_status, created_by_account_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'draft', 'queued', ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      ).run(
        versionId,
        sourceId,
        text(source, "zone_id"),
        versionNumber,
        pipelineGeneration,
        input.contentHash,
        input.blobHash ?? null,
        input.byteSize,
        input.mimeType,
        input.originalName ?? null,
        actorAccountId,
        now,
      );
      db.prepare(
        `UPDATE enterprise_knowledge_sources SET current_version_number = ?,
         draft_revision = draft_revision + 1, updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
      ).run(versionNumber, actorAccountId, now, sourceId);
      db.prepare(
        `INSERT INTO enterprise_knowledge_jobs
         (id, zone_id, source_id, source_version_id, kind, stage, status, attempt,
          pipeline_generation, available_at, created_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'source_ingest', 'validate', 'queued', 0, ?, ?, ?, ?, ?)`,
      ).run(
        jobId,
        text(source, "zone_id"),
        sourceId,
        versionId,
        pipelineGeneration,
        now,
        actorAccountId,
        now,
        now,
      );
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET source_set_revision = source_set_revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         revision = revision + 1, updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
      ).run(actorAccountId, now, text(source, "zone_id"));
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: text(source, "zone_id"),
        entityType: "source",
        entityId: sourceId,
        operation: "updated",
        revision: versionNumber,
        status: "queued",
        occurredAt: now,
      });
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: text(source, "zone_id"),
        entityType: "job",
        entityId: jobId,
        operation: "created",
        status: "queued",
        stage: "validate",
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.source.version.create" },
  );
  return { version: getKnowledgeSourceVersion(versionId, options)!, jobId };
}

export function reprocessKnowledgeSourceVersion(
  params: {
    zoneId: string;
    sourceId: string;
    versionId: string;
    baseBuildRevision: number;
    actorAccountId: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): { version: KnowledgeSourceVersion; jobId: string; buildRevision: number } {
  ensureEnterpriseSchema(options);
  const jobId = generateSecureUuid();
  let nextBuildRevision = 0;
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const version = db
        .prepare(
          `SELECT v.*, z.build_revision FROM enterprise_knowledge_source_versions v
           JOIN enterprise_knowledge_zones z ON z.id = v.zone_id
           WHERE v.id = ? AND v.source_id = ? AND v.zone_id = ?`,
        )
        .get(params.versionId, params.sourceId, params.zoneId) as Row | undefined;
      if (!version) {
        throw new EnterpriseKnowledgeError(
          "VERSION_NOT_FOUND",
          404,
          "Knowledge version not found.",
        );
      }
      const buildRevision = integer(version, "build_revision");
      if (buildRevision !== params.baseBuildRevision) {
        throw new EnterpriseKnowledgeError("STALE_REVISION", 409, "Knowledge zone changed.", {
          currentRevision: buildRevision,
        });
      }
      const activeJob = db
        .prepare(
          `SELECT id FROM enterprise_knowledge_jobs WHERE source_id = ?
           AND status IN ('queued', 'running', 'retry_wait') LIMIT 1`,
        )
        .get(params.sourceId) as Row | undefined;
      if (activeJob) {
        throw new EnterpriseKnowledgeError(
          "SOURCE_PIPELINE_ACTIVE",
          409,
          "Wait for or cancel the active source pipeline before reprocessing.",
        );
      }
      const pipelineGeneration = integer(version, "pipeline_generation") + 1;
      const now = Date.now();
      nextBuildRevision = buildRevision + 1;
      db.prepare(
        `UPDATE enterprise_knowledge_source_versions SET pipeline_generation = ?,
         processing_status = 'queued', vector_status = 'pending', safe_error_code = NULL,
         completed_at = NULL WHERE id = ?`,
      ).run(pipelineGeneration, params.versionId);
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET build_revision = ?, revision = revision + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND build_revision = ?`,
      ).run(nextBuildRevision, params.actorAccountId, now, params.zoneId, buildRevision);
      db.prepare(
        `INSERT INTO enterprise_knowledge_jobs
         (id, zone_id, source_id, source_version_id, kind, stage, status, attempt,
          pipeline_generation, available_at, created_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'source_ingest', 'checking', 'queued', 0, ?, ?, ?, ?, ?)`,
      ).run(
        jobId,
        params.zoneId,
        params.sourceId,
        params.versionId,
        pipelineGeneration,
        now,
        params.actorAccountId,
        now,
        now,
      );
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "source",
        entityId: params.sourceId,
        operation: "updated",
        revision: nextBuildRevision,
        status: "reprocessing_v3",
        stage: "checking",
        occurredAt: now,
      });
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.zoneId,
        entityType: "job",
        entityId: jobId,
        operation: "created",
        revision: nextBuildRevision,
        status: "queued",
        stage: "checking",
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.source-version.reprocess" },
  );
  return {
    version: getKnowledgeSourceVersion(params.versionId, options)!,
    jobId,
    buildRevision: nextBuildRevision,
  };
}

export function getKnowledgeSource(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSource | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_sources WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? toSource(row) : undefined;
}

export function listKnowledgeSources(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSource[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT * FROM enterprise_knowledge_sources WHERE zone_id = ? ORDER BY updated_at DESC, id DESC LIMIT 500",
      )
      .all(zoneId) as Row[]
  ).map(toSource);
}

export function setKnowledgeSourceStagedRemove(
  sourceId: string,
  staged: boolean,
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSource {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const source = db
        .prepare("SELECT zone_id, status FROM enterprise_knowledge_sources WHERE id = ?")
        .get(sourceId) as Row | undefined;
      if (!source || source.status === "archived") {
        throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
      }
      const status = staged ? "staged_remove" : "active";
      if (source.status === status) {
        return;
      }
      const now = Date.now();
      db.prepare(
        `UPDATE enterprise_knowledge_sources SET status = ?, draft_revision = draft_revision + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
      ).run(status, actorAccountId, now, sourceId);
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET source_set_revision = source_set_revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         revision = revision + 1, updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
      ).run(actorAccountId, now, text(source, "zone_id"));
    },
    options,
    { operationLabel: "enterprise.knowledge.source.stage-remove" },
  );
  return getKnowledgeSource(sourceId, options)!;
}

export function listPublishedKnowledgeSources(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSource[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT s.* FROM enterprise_knowledge_zones z
         JOIN enterprise_knowledge_publication_sources ps ON ps.publication_id = z.active_publication_id
         JOIN enterprise_knowledge_sources s ON s.id = ps.source_id
         WHERE z.id = ? AND z.status = 'active' ORDER BY ps.position ASC`,
      )
      .all(zoneId) as Row[]
  ).map(toSource);
}

export function getPublishedKnowledgeSourceVersion(
  zoneId: string,
  sourceId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSourceVersion | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT v.* FROM enterprise_knowledge_zones z
     JOIN enterprise_knowledge_publication_sources ps ON ps.publication_id = z.active_publication_id
     JOIN enterprise_knowledge_source_versions v ON v.id = ps.source_version_id
     WHERE z.id = ? AND ps.source_id = ? AND z.status = 'active' LIMIT 1`,
    )
    .get(zoneId, sourceId) as Row | undefined;
  return row ? toVersion(row) : undefined;
}

export function getKnowledgeSourceVersion(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSourceVersion | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_source_versions WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? toVersion(row) : undefined;
}

export function listKnowledgeSourceVersions(
  sourceId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeSourceVersion[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT * FROM enterprise_knowledge_source_versions WHERE source_id = ? ORDER BY version_number DESC",
      )
      .all(sourceId) as Row[]
  ).map(toVersion);
}

export function completeKnowledgeSourceVersion(
  params: {
    versionId: string;
    pipelineGeneration: number;
    processingStatus: "ready" | "degraded" | "needs_ocr" | "error" | "cancelled";
    normalizedArtifactHash?: string;
    segmentCount?: number;
    vectorStatus: KnowledgeSourceVersion["vectorStatus"];
    parserProvenance?: Record<string, unknown>;
    ocrProvenance?: Record<string, unknown>;
    safeErrorCode?: string;
    jobFence?: {
      jobId: string;
      claimToken: string;
      claimOwner: string;
    };
  },
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_knowledge_source_versions SET processing_status = ?,
       normalized_artifact_hash = ?, segment_count = ?, vector_status = ?,
       parser_provenance_json = ?, ocr_provenance_json = ?, safe_error_code = ?, completed_at = ?
       WHERE id = ? AND pipeline_generation = ?
         AND processing_status NOT IN ('ready', 'degraded', 'error', 'cancelled')
         AND (? IS NULL OR EXISTS (
           SELECT 1 FROM enterprise_knowledge_jobs j
           WHERE j.id = ? AND j.claim_token = ? AND j.claim_owner = ?
             AND j.pipeline_generation = ? AND j.status = 'running'
         ))`,
        )
        .run(
          params.processingStatus,
          params.normalizedArtifactHash ?? null,
          params.segmentCount ?? null,
          params.vectorStatus,
          params.parserProvenance ? JSON.stringify(params.parserProvenance) : null,
          params.ocrProvenance ? JSON.stringify(params.ocrProvenance) : null,
          params.safeErrorCode?.slice(0, 128) ?? null,
          Date.now(),
          params.versionId,
          params.pipelineGeneration,
          params.jobFence?.jobId ?? null,
          params.jobFence?.jobId ?? null,
          params.jobFence?.claimToken ?? null,
          params.jobFence?.claimOwner ?? null,
          params.pipelineGeneration,
        ).changes === 1,
    options,
    { operationLabel: "enterprise.knowledge.version.complete" },
  );
}
