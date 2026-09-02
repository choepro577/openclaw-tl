import type { DatabaseSync } from "node:sqlite";
import {
  generateSecureFraction,
  generateSecureToken,
  generateSecureUuid,
} from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { KNOWLEDGE_JOB_LEASE_MS, KNOWLEDGE_RETRY_DELAYS_MS } from "./knowledge-limits.js";
import {
  integer,
  nullableText,
  text,
  type KnowledgeStoreRow as Row,
} from "./knowledge-store-common.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";
import type {
  EnterpriseKnowledgeChangeEvent,
  KnowledgeJobStep,
  KnowledgeJobStepStatus,
} from "./knowledge-types.js";

export type KnowledgeJob = {
  id: string;
  zoneId: string;
  sourceId: string | null;
  sourceVersionId: string | null;
  generationId: string | null;
  kind: "source_ingest" | "zone_build" | "artifact_gc" | "index_gc";
  stage: string;
  status: "queued" | "running" | "retry_wait" | "succeeded" | "failed" | "cancelled";
  attempt: number;
  pipelineGeneration: number;
  claimToken: string | null;
  claimOwner: string | null;
  leaseExpiresAt: number | null;
  progressCurrent: number;
  progressTotal: number;
  safeErrorCode: string | null;
  availableAt: number;
  createdAt: number;
  updatedAt: number;
};

function toJob(row: Row): KnowledgeJob {
  return {
    id: text(row, "id"),
    zoneId: text(row, "zone_id"),
    sourceId: nullableText(row, "source_id"),
    sourceVersionId: nullableText(row, "source_version_id"),
    generationId: nullableText(row, "generation_id"),
    kind: text(row, "kind") as KnowledgeJob["kind"],
    stage: text(row, "stage"),
    status: text(row, "status") as KnowledgeJob["status"],
    attempt: integer(row, "attempt"),
    pipelineGeneration: integer(row, "pipeline_generation"),
    claimToken: nullableText(row, "claim_token"),
    claimOwner: nullableText(row, "claim_owner"),
    leaseExpiresAt: row.lease_expires_at === null ? null : integer(row, "lease_expires_at"),
    progressCurrent: integer(row, "progress_current"),
    progressTotal: integer(row, "progress_total"),
    safeErrorCode: nullableText(row, "safe_error_code"),
    availableAt: integer(row, "available_at"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  };
}

export function appendEnterpriseKnowledgeChangeRow(
  db: DatabaseSync,
  event: {
    zoneId: string;
    entityType: EnterpriseKnowledgeChangeEvent["entityType"];
    entityId?: string;
    operation: EnterpriseKnowledgeChangeEvent["operation"];
    revision?: number;
    status?: string;
    stage?: string;
    progressCurrent?: number;
    progressTotal?: number;
    safeErrorCode?: string;
    occurredAt?: number;
  },
): void {
  db.prepare(
    `INSERT INTO enterprise_knowledge_changes
     (zone_id, entity_type, entity_id, operation, revision, status, stage,
      progress_current, progress_total, safe_error_code, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    event.zoneId,
    event.entityType,
    event.entityId ?? null,
    event.operation,
    event.revision ?? null,
    event.status ?? null,
    event.stage ?? null,
    event.progressCurrent ?? null,
    event.progressTotal ?? null,
    event.safeErrorCode?.slice(0, 128) ?? null,
    event.occurredAt ?? Date.now(),
  );
}

function toKnowledgeJobStep(row: Row): KnowledgeJobStep {
  return {
    jobId: text(row, "job_id"),
    stepId: text(row, "step_id"),
    stage: text(row, "stage"),
    status: text(row, "status") as KnowledgeJobStepStatus,
    progressCurrent: row.progress_current === null ? null : integer(row, "progress_current"),
    progressTotal: row.progress_total === null ? null : integer(row, "progress_total"),
    checkpointRef: nullableText(row, "checkpoint_ref"),
    attempt: integer(row, "attempt"),
    startedAt: row.started_at === null ? null : integer(row, "started_at"),
    updatedAt: integer(row, "updated_at"),
    completedAt: row.completed_at === null ? null : integer(row, "completed_at"),
    safeErrorCode: nullableText(row, "safe_error_code"),
    degradedReason: nullableText(row, "degraded_reason"),
  };
}

export function getKnowledgeJob(
  jobId: string,
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJob | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ? AND zone_id = ?")
    .get(jobId, zoneId) as Row | undefined;
  return row ? toJob(row) : undefined;
}

export function listKnowledgeJobSteps(
  jobId: string,
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJobStep[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT s.* FROM enterprise_knowledge_job_steps s
         JOIN enterprise_knowledge_jobs j ON j.id = s.job_id
         WHERE s.job_id = ? AND j.zone_id = ? ORDER BY s.started_at, s.updated_at, s.step_id`,
      )
      .all(jobId, zoneId) as Row[]
  ).map(toKnowledgeJobStep);
}

export function listEnterpriseKnowledgeChanges(
  params: { afterSequence: number; zoneId?: string; limit?: number },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseKnowledgeChangeEvent[] {
  ensureEnterpriseSchema(options);
  const limit = Math.max(1, Math.min(params.limit ?? 200, 500));
  const rows = params.zoneId
    ? (openOpenClawStateDatabase(options)
        .db.prepare(
          `SELECT * FROM enterprise_knowledge_changes
           WHERE sequence > ? AND zone_id = ? ORDER BY sequence LIMIT ?`,
        )
        .all(params.afterSequence, params.zoneId, limit) as Row[])
    : (openOpenClawStateDatabase(options)
        .db.prepare(
          `SELECT * FROM enterprise_knowledge_changes
           WHERE sequence > ? ORDER BY sequence LIMIT ?`,
        )
        .all(params.afterSequence, limit) as Row[]);
  return rows.map((row) => ({
    sequence: integer(row, "sequence"),
    zoneId: text(row, "zone_id"),
    entityType: text(row, "entity_type") as EnterpriseKnowledgeChangeEvent["entityType"],
    ...(nullableText(row, "entity_id") ? { entityId: nullableText(row, "entity_id")! } : {}),
    operation: text(row, "operation") as EnterpriseKnowledgeChangeEvent["operation"],
    ...(row.revision === null ? {} : { revision: integer(row, "revision") }),
    ...(nullableText(row, "status") ? { status: nullableText(row, "status")! } : {}),
    ...(nullableText(row, "stage") ? { stage: nullableText(row, "stage")! } : {}),
    ...(row.progress_current === null ? {} : { progressCurrent: integer(row, "progress_current") }),
    ...(row.progress_total === null ? {} : { progressTotal: integer(row, "progress_total") }),
    ...(nullableText(row, "safe_error_code")
      ? { safeErrorCode: nullableText(row, "safe_error_code")! }
      : {}),
    occurredAt: new Date(integer(row, "occurred_at")).toISOString(),
  }));
}

export function getEnterpriseKnowledgeChangeFeedBounds(
  zoneId?: string,
  options: OpenClawStateDatabaseOptions = {},
): { firstSequence: number; lastSequence: number } {
  ensureEnterpriseSchema(options);
  const row = zoneId
    ? (openOpenClawStateDatabase(options)
        .db.prepare(
          `SELECT COALESCE(MIN(sequence), 0) AS first_sequence,
                  COALESCE(MAX(sequence), 0) AS last_sequence
           FROM enterprise_knowledge_changes WHERE zone_id = ?`,
        )
        .get(zoneId) as Row)
    : (openOpenClawStateDatabase(options)
        .db.prepare(
          `SELECT COALESCE(MIN(sequence), 0) AS first_sequence,
                  COALESCE(MAX(sequence), 0) AS last_sequence
           FROM enterprise_knowledge_changes`,
        )
        .get() as Row);
  return {
    firstSequence: integer(row, "first_sequence"),
    lastSequence: integer(row, "last_sequence"),
  };
}

export function pruneEnterpriseKnowledgeChanges(
  params: { retentionHours?: number; minimumRecentEvents?: number; now?: number } = {},
  options: OpenClawStateDatabaseOptions = {},
): number {
  ensureEnterpriseSchema(options);
  const now = params.now ?? Date.now();
  const cutoff = now - Math.max(24, params.retentionHours ?? 24) * 60 * 60 * 1_000;
  const minimumRecentEvents = Math.max(100_000, params.minimumRecentEvents ?? 100_000);
  return Number(
    runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `DELETE FROM enterprise_knowledge_changes
           WHERE occurred_at < ?
             AND sequence <= MAX(0, (SELECT COALESCE(MAX(sequence), 0) FROM enterprise_knowledge_changes) - ?)`,
          )
          .run(cutoff, minimumRecentEvents).changes,
      options,
      { operationLabel: "enterprise.knowledge.changes.prune" },
    ),
  );
}

export function appendEnterpriseKnowledgeChange(
  event: Parameters<typeof appendEnterpriseKnowledgeChangeRow>[1],
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => appendEnterpriseKnowledgeChangeRow(db, event),
    options,
    { operationLabel: "enterprise.knowledge.change.append" },
  );
}

export function updateKnowledgeJobStep(
  params: {
    job: Pick<KnowledgeJob, "id" | "zoneId" | "attempt">;
    stepId: string;
    stage: string;
    status: KnowledgeJobStepStatus;
    progressCurrent?: number | null;
    progressTotal?: number | null;
    checkpointRef?: string | null;
    safeErrorCode?: string | null;
    degradedReason?: string | null;
  },
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_knowledge_job_steps
         (job_id, step_id, stage, status, progress_current, progress_total, checkpoint_ref,
          attempt, started_at, updated_at, completed_at, safe_error_code, degraded_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(job_id, step_id) DO UPDATE SET
           status = excluded.status,
           progress_current = excluded.progress_current,
           progress_total = excluded.progress_total,
           checkpoint_ref = COALESCE(excluded.checkpoint_ref, enterprise_knowledge_job_steps.checkpoint_ref),
           attempt = excluded.attempt,
           updated_at = excluded.updated_at,
           completed_at = excluded.completed_at,
           safe_error_code = excluded.safe_error_code,
           degraded_reason = excluded.degraded_reason`,
      ).run(
        params.job.id,
        params.stepId,
        params.stage,
        params.status,
        params.progressCurrent ?? null,
        params.progressTotal ?? null,
        params.checkpointRef ?? null,
        params.job.attempt,
        now,
        now,
        ["completed", "degraded", "failed", "cancelled", "superseded"].includes(params.status)
          ? now
          : null,
        params.safeErrorCode?.slice(0, 128) ?? null,
        params.degradedReason?.slice(0, 256) ?? null,
      );
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: params.job.zoneId,
        entityType: "job_step",
        entityId: params.job.id,
        operation: ["completed", "degraded", "failed", "cancelled", "superseded"].includes(
          params.status,
        )
          ? "completed"
          : "updated",
        status: params.status,
        stage: params.stage,
        ...(params.progressCurrent === undefined || params.progressCurrent === null
          ? {}
          : { progressCurrent: params.progressCurrent }),
        ...(params.progressTotal === undefined || params.progressTotal === null
          ? {}
          : { progressTotal: params.progressTotal }),
        ...(params.safeErrorCode ? { safeErrorCode: params.safeErrorCode } : {}),
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.job-step.update" },
  );
}

export function listKnowledgeJobs(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJob[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT * FROM enterprise_knowledge_jobs WHERE zone_id = ? ORDER BY created_at DESC LIMIT 500",
      )
      .all(zoneId) as Row[]
  ).map(toJob);
}

export function claimNextKnowledgeJob(
  claimOwner: string,
  now = Date.now(),
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJob | undefined {
  ensureEnterpriseSchema(options);
  const claimToken = generateSecureToken(24);
  const claimedId = runOpenClawStateWriteTransaction(
    ({ db }) => {
      const candidate = db
        .prepare(
          `SELECT id, zone_id FROM enterprise_knowledge_jobs
         WHERE ((status IN ('queued', 'retry_wait') AND available_at <= ?)
             OR (status = 'running' AND lease_expires_at <= ?))
         ORDER BY available_at ASC, created_at ASC LIMIT 1`,
        )
        .get(now, now) as Row | undefined;
      if (!candidate) {
        return undefined;
      }
      const result = db
        .prepare(
          `UPDATE enterprise_knowledge_jobs SET status = 'running', attempt = attempt + 1,
         claim_token = ?, claim_owner = ?, lease_expires_at = ?, heartbeat_at = ?, updated_at = ?
         WHERE id = ? AND ((status IN ('queued', 'retry_wait') AND available_at <= ?)
             OR (status = 'running' AND lease_expires_at <= ?))`,
        )
        .run(
          claimToken,
          claimOwner,
          now + KNOWLEDGE_JOB_LEASE_MS,
          now,
          now,
          text(candidate, "id"),
          now,
          now,
        );
      if (result.changes !== 1) {
        return undefined;
      }
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId: text(candidate, "zone_id"),
        entityType: "job",
        entityId: text(candidate, "id"),
        operation: "updated",
        status: "running",
        occurredAt: now,
      });
      return text(candidate, "id");
    },
    options,
    { operationLabel: "enterprise.knowledge.job.claim" },
  );
  if (!claimedId) {
    return undefined;
  }
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ?")
    .get(claimedId) as Row;
  return toJob(row);
}

export function fenceKnowledgeJobUpdate(
  params: {
    jobId: string;
    claimToken: string;
    claimOwner: string;
    pipelineGeneration: number;
    stage?: string;
    progressCurrent?: number;
    progressTotal?: number;
  },
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const changes = db
        .prepare(
          `UPDATE enterprise_knowledge_jobs SET stage = COALESCE(?, stage),
       progress_current = COALESCE(?, progress_current), progress_total = COALESCE(?, progress_total),
       heartbeat_at = ?, lease_expires_at = ?, updated_at = ?
       WHERE id = ? AND claim_token = ? AND claim_owner = ? AND pipeline_generation = ? AND status = 'running'`,
        )
        .run(
          params.stage ?? null,
          params.progressCurrent ?? null,
          params.progressTotal ?? null,
          now,
          now + KNOWLEDGE_JOB_LEASE_MS,
          now,
          params.jobId,
          params.claimToken,
          params.claimOwner,
          params.pipelineGeneration,
        ).changes;
      if (changes === 1 && (params.stage !== undefined || params.progressCurrent !== undefined)) {
        const row = db
          .prepare(
            "SELECT zone_id, stage, progress_current, progress_total FROM enterprise_knowledge_jobs WHERE id = ?",
          )
          .get(params.jobId) as Row;
        appendEnterpriseKnowledgeChangeRow(db, {
          zoneId: text(row, "zone_id"),
          entityType: "job",
          entityId: params.jobId,
          operation: "updated",
          status: "running",
          stage: text(row, "stage"),
          progressCurrent: integer(row, "progress_current"),
          progressTotal: integer(row, "progress_total"),
          occurredAt: now,
        });
      }
      return changes === 1;
    },
    options,
    { operationLabel: "enterprise.knowledge.job.heartbeat" },
  );
}

export function finishKnowledgeJob(
  job: KnowledgeJob,
  result: {
    status: "succeeded" | "failed" | "cancelled";
    safeErrorCode?: string;
    transient?: boolean;
    retryAfterMs?: number;
  },
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  if (!job.claimToken || !job.claimOwner) {
    return false;
  }
  const now = Date.now();
  const canRetry = result.transient && job.attempt < KNOWLEDGE_RETRY_DELAYS_MS.length;
  const delay = canRetry
    ? Math.max(
        result.retryAfterMs ?? 0,
        Math.floor(KNOWLEDGE_RETRY_DELAYS_MS[job.attempt - 1]! * generateSecureFraction()),
      )
    : 0;
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const finalStatus = canRetry ? "retry_wait" : result.status;
      const changes = db
        .prepare(
          `UPDATE enterprise_knowledge_jobs SET status = ?, safe_error_code = ?, retry_after_ms = ?,
       available_at = ?, claim_token = NULL, claim_owner = NULL, lease_expires_at = NULL,
       heartbeat_at = NULL,
       progress_current = CASE
         WHEN ? = 'succeeded' AND progress_total > 0 THEN progress_total
         ELSE progress_current
       END,
       completed_at = ?, updated_at = ?
       WHERE id = ? AND claim_token = ? AND claim_owner = ? AND pipeline_generation = ? AND status = 'running'`,
        )
        .run(
          canRetry ? "retry_wait" : result.status,
          result.safeErrorCode?.slice(0, 128) ?? null,
          canRetry ? delay : null,
          now + delay,
          canRetry ? "retry_wait" : result.status,
          canRetry ? null : now,
          now,
          job.id,
          job.claimToken,
          job.claimOwner,
          job.pipelineGeneration,
        ).changes;
      if (changes === 1) {
        appendEnterpriseKnowledgeChangeRow(db, {
          zoneId: job.zoneId,
          entityType: "job",
          entityId: job.id,
          operation: canRetry ? "updated" : "completed",
          status: finalStatus,
          stage: job.stage,
          ...(result.safeErrorCode ? { safeErrorCode: result.safeErrorCode } : {}),
          occurredAt: now,
        });
      }
      return changes === 1;
    },
    options,
    { operationLabel: "enterprise.knowledge.job.finish" },
  );
}

export function cancelKnowledgeJob(
  jobId: string,
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJob {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const row = db
        .prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ? AND zone_id = ?")
        .get(jobId, zoneId) as Row | undefined;
      if (!row) {
        throw new EnterpriseKnowledgeError("JOB_NOT_FOUND", 404, "Knowledge job not found.");
      }
      if (["succeeded", "failed", "cancelled"].includes(text(row, "status"))) {
        return;
      }
      const now = Date.now();
      db.prepare(
        `UPDATE enterprise_knowledge_jobs SET status = 'cancelled', claim_token = NULL,
         claim_owner = NULL, lease_expires_at = NULL, heartbeat_at = NULL,
         completed_at = ?, updated_at = ? WHERE id = ? AND zone_id = ?`,
      ).run(now, now, jobId, zoneId);
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId,
        entityType: "job",
        entityId: jobId,
        operation: "completed",
        status: "cancelled",
        safeErrorCode: "CANCELLED",
        occurredAt: now,
      });
      const versionId = nullableText(row, "source_version_id");
      if (versionId) {
        db.prepare(
          `UPDATE enterprise_knowledge_source_versions SET processing_status = 'cancelled',
           safe_error_code = 'CANCELLED', completed_at = ?
           WHERE id = ? AND processing_status NOT IN ('ready', 'degraded')`,
        ).run(now, versionId);
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.job.cancel" },
  );
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ? AND zone_id = ?")
    .get(jobId, zoneId) as Row;
  return toJob(row);
}

export function retryKnowledgeJob(
  jobId: string,
  zoneId: string,
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeJob {
  ensureEnterpriseSchema(options);
  const nextJobId = generateSecureUuid();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const row = db
        .prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ? AND zone_id = ?")
        .get(jobId, zoneId) as Row | undefined;
      if (!row) {
        throw new EnterpriseKnowledgeError("JOB_NOT_FOUND", 404, "Knowledge job not found.");
      }
      if (!["failed", "cancelled"].includes(text(row, "status"))) {
        throw new EnterpriseKnowledgeError(
          "JOB_RETRY_CONFLICT",
          409,
          "Only failed or cancelled jobs can be retried.",
        );
      }
      const now = Date.now();
      let pipelineGeneration = integer(row, "pipeline_generation") + 1;
      const versionId = nullableText(row, "source_version_id");
      if (versionId) {
        const version = db
          .prepare(
            `SELECT v.source_id,
                    (SELECT COALESCE(MAX(v2.pipeline_generation), 0) + 1
                     FROM enterprise_knowledge_source_versions v2
                     WHERE v2.source_id = v.source_id) AS next_pipeline_generation
             FROM enterprise_knowledge_source_versions v WHERE v.id = ?`,
          )
          .get(versionId) as Row | undefined;
        if (!version) {
          throw new EnterpriseKnowledgeError(
            "VERSION_NOT_FOUND",
            404,
            "Knowledge version not found.",
          );
        }
        pipelineGeneration = integer(version, "next_pipeline_generation");
        db.prepare(
          `UPDATE enterprise_knowledge_source_versions SET pipeline_generation = ?,
           processing_status = 'queued', vector_status = 'pending', safe_error_code = NULL,
           normalized_artifact_hash = NULL, segment_count = NULL, completed_at = NULL
           WHERE id = ?`,
        ).run(pipelineGeneration, versionId);
      } else if (text(row, "kind") === "zone_build") {
        const zone = db
          .prepare(
            "SELECT COALESCE(build_revision, source_set_revision) AS build_revision FROM enterprise_knowledge_zones WHERE id = ?",
          )
          .get(zoneId) as Row;
        pipelineGeneration = integer(zone, "build_revision");
      }
      db.prepare(
        `INSERT INTO enterprise_knowledge_jobs
         (id, zone_id, source_id, source_version_id, kind, stage, status, attempt,
          pipeline_generation, available_at, created_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?)`,
      ).run(
        nextJobId,
        zoneId,
        nullableText(row, "source_id"),
        versionId,
        text(row, "kind"),
        text(row, "kind") === "zone_build" ? "zone_build" : "validate",
        pipelineGeneration,
        now,
        actorAccountId,
        now,
        now,
      );
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId,
        entityType: "job",
        entityId: nextJobId,
        operation: "created",
        status: "queued",
        stage: text(row, "kind") === "zone_build" ? "zone_build" : "validate",
        occurredAt: now,
      });
    },
    options,
    { operationLabel: "enterprise.knowledge.job.retry" },
  );
  const created = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_jobs WHERE id = ?")
    .get(nextJobId) as Row;
  return toJob(created);
}

export function enqueueKnowledgeZoneBuild(
  zoneId: string,
  actorAccountId: string | null,
  options: OpenClawStateDatabaseOptions = {},
): string {
  ensureEnterpriseSchema(options);
  const jobId = generateSecureUuid();
  const now = Date.now();
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare(
          "SELECT COALESCE(build_revision, source_set_revision) AS build_revision FROM enterprise_knowledge_zones WHERE id = ?",
        )
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      const existing = db
        .prepare(
          `SELECT id, stage, status, attempt, pipeline_generation
           FROM enterprise_knowledge_jobs
           WHERE zone_id = ? AND kind = 'zone_build'
             AND status IN ('queued', 'running', 'retry_wait')`,
        )
        .get(zoneId) as Row | undefined;
      const buildRevision = integer(zone, "build_revision");
      if (existing && integer(existing, "pipeline_generation") === buildRevision) {
        return text(existing, "id");
      }
      if (existing) {
        const supersededJobId = text(existing, "id");
        db.prepare(
          `UPDATE enterprise_knowledge_jobs
           SET status = 'cancelled', safe_error_code = 'SUPERSEDED_BUILD_REVISION',
               claim_token = NULL, claim_owner = NULL, lease_expires_at = NULL,
               heartbeat_at = NULL, completed_at = ?, updated_at = ?
           WHERE id = ? AND status IN ('queued', 'running', 'retry_wait')`,
        ).run(now, now, supersededJobId);
        db.prepare(
          `INSERT INTO enterprise_knowledge_job_steps
           (job_id, step_id, stage, status, attempt, started_at, updated_at, completed_at,
            safe_error_code, degraded_reason)
           VALUES (?, 'superseded', ?, 'superseded', ?, ?, ?, ?,
                   'SUPERSEDED_BUILD_REVISION', 'A newer Zone build revision replaced this job.')
           ON CONFLICT(job_id, step_id) DO UPDATE SET
             status = 'superseded', attempt = excluded.attempt, updated_at = excluded.updated_at,
             completed_at = excluded.completed_at, safe_error_code = excluded.safe_error_code,
             degraded_reason = excluded.degraded_reason`,
        ).run(
          supersededJobId,
          text(existing, "stage"),
          integer(existing, "attempt"),
          now,
          now,
          now,
        );
        appendEnterpriseKnowledgeChangeRow(db, {
          zoneId,
          entityType: "job",
          entityId: supersededJobId,
          operation: "completed",
          revision: integer(existing, "pipeline_generation"),
          status: "superseded",
          stage: text(existing, "stage"),
          safeErrorCode: "SUPERSEDED_BUILD_REVISION",
          occurredAt: now,
        });
      }
      db.prepare(
        `INSERT INTO enterprise_knowledge_jobs
         (id, zone_id, kind, stage, status, attempt, pipeline_generation, available_at,
          created_by_account_id, created_at, updated_at)
         VALUES (?, ?, 'zone_build', 'zone_build', 'queued', 0, ?, ?, ?, ?, ?)`,
      ).run(jobId, zoneId, buildRevision, now, actorAccountId, now, now);
      appendEnterpriseKnowledgeChangeRow(db, {
        zoneId,
        entityType: "job",
        entityId: jobId,
        operation: "created",
        revision: buildRevision,
        status: "queued",
        stage: "zone_build",
        occurredAt: now,
      });
      return jobId;
    },
    options,
    { operationLabel: "enterprise.knowledge.zone-build.enqueue" },
  );
}
