import { open, stat, unlink } from "node:fs/promises";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  ensureEnterpriseKnowledgeArtifactDirectories,
  importKnowledgeBlobFile,
  resolveKnowledgeUploadStagingPath,
} from "./artifact-store.js";
import { appendEnterpriseKnowledgeChangeRow } from "./knowledge-job-store.js";
import {
  KNOWLEDGE_FILE_MAX_BYTES,
  KNOWLEDGE_UPLOAD_CHUNK_MAX_BYTES,
  KNOWLEDGE_UPLOAD_TTL_MS,
  KNOWLEDGE_UPLOADS_PER_ACTOR,
} from "./knowledge-limits.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

type UploadRow = {
  id: string;
  zone_id: string;
  owner_account_id: string;
  target_source_id: string | null;
  title: string;
  original_name: string;
  declared_mime_type: string;
  expected_size: number;
  expected_hash: string | null;
  received_size: number;
  chunk_claim_token: string | null;
  chunk_claim_offset: number | null;
  chunk_claim_size: number | null;
  chunk_claim_expires_at: number | null;
  state: "active" | "committing" | "committed" | "cancelled" | "expired" | "error";
  staging_name: string;
  expires_at: number;
  revision: number;
  created_at: number;
  updated_at: number;
  committed_source_version_id: string | null;
};

export type KnowledgeUpload = {
  id: string;
  zoneId: string;
  ownerAccountId: string;
  targetSourceId: string | null;
  title: string;
  originalName: string;
  declaredMimeType: string;
  expectedSize: number;
  receivedSize: number;
  state: UploadRow["state"];
  expiresAt: number;
  revision: number;
  committedSourceVersionId: string | null;
};

function toUpload(row: UploadRow): KnowledgeUpload {
  return {
    id: row.id,
    zoneId: row.zone_id,
    ownerAccountId: row.owner_account_id,
    targetSourceId: row.target_source_id,
    title: row.title,
    originalName: row.original_name,
    declaredMimeType: row.declared_mime_type,
    expectedSize: row.expected_size,
    receivedSize: row.received_size,
    state: row.state,
    expiresAt: row.expires_at,
    revision: row.revision,
    committedSourceVersionId: row.committed_source_version_id,
  };
}

function safeFilename(value: string): string {
  const normalized = value.normalize("NFC").trim();
  if (
    !normalized ||
    normalized.length > 255 ||
    normalized.includes("\0") ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized === "." ||
    normalized === ".."
  ) {
    throw new EnterpriseKnowledgeError("INVALID_FILENAME", 422, "Filename is invalid.");
  }
  return normalized;
}

function getUploadRow(
  uploadId: string,
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions,
): UploadRow | undefined {
  ensureEnterpriseSchema(options);
  return openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_uploads WHERE id = ? AND owner_account_id = ?")
    .get(uploadId, ownerAccountId) as UploadRow | undefined;
}

export function getKnowledgeUpload(
  uploadId: string,
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeUpload | undefined {
  const row = getUploadRow(uploadId, ownerAccountId, options);
  return row ? toUpload(row) : undefined;
}

export function listKnowledgeUploads(
  zoneId: string,
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeUpload[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_knowledge_uploads
       WHERE zone_id = ? AND owner_account_id = ?
       ORDER BY created_at DESC LIMIT 100`,
    )
    .all(zoneId, ownerAccountId) as UploadRow[];
  return rows.map(toUpload);
}

export async function expireKnowledgeUploads(
  now = Date.now(),
  options: OpenClawStateDatabaseOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  ensureEnterpriseSchema(options);
  const stagingNames = runOpenClawStateWriteTransaction(
    ({ db }) => {
      const rows = db
        .prepare(
          `SELECT staging_name FROM enterprise_knowledge_uploads
           WHERE state IN ('active', 'error') AND expires_at <= ?`,
        )
        .all(now) as Array<{ staging_name: string }>;
      db.prepare(
        `UPDATE enterprise_knowledge_uploads SET state = 'expired', revision = revision + 1,
         chunk_claim_token = NULL, chunk_claim_offset = NULL, chunk_claim_size = NULL,
         chunk_claim_expires_at = NULL, updated_at = ?
         WHERE state IN ('active', 'error') AND expires_at <= ?`,
      ).run(now, now);
      return rows.map((row) => row.staging_name);
    },
    options,
    { operationLabel: "enterprise.knowledge.upload.expire" },
  );
  await Promise.all(
    stagingNames.map((name) =>
      unlink(resolveKnowledgeUploadStagingPath(name, env)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }),
    ),
  );
  return stagingNames.length;
}

export async function beginKnowledgeUpload(
  input: {
    zoneId: string;
    title: string;
    originalName: string;
    declaredMimeType: string;
    expectedSize: number;
    expectedHash?: string;
    targetSourceId?: string;
  },
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<KnowledgeUpload> {
  ensureEnterpriseSchema(options);
  if (!Number.isSafeInteger(input.expectedSize) || input.expectedSize <= 0) {
    throw new EnterpriseKnowledgeError("UPLOAD_EMPTY", 422, "File is empty.");
  }
  if (input.expectedSize > KNOWLEDGE_FILE_MAX_BYTES) {
    throw new EnterpriseKnowledgeError("UPLOAD_TOO_LARGE", 413, "File exceeds the 50 MiB limit.");
  }
  if (input.expectedHash && !/^[a-fA-F0-9]{64}$/.test(input.expectedHash)) {
    throw new EnterpriseKnowledgeError("INVALID_HASH", 422, "Expected SHA-256 hash is invalid.");
  }
  const title = input.title.normalize("NFC").trim();
  if (!title || Buffer.byteLength(title, "utf8") > 300) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "Title is invalid.");
  }
  const id = generateSecureUuid();
  const stagingName = `${id}.upload`;
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const active = db
        .prepare(
          `SELECT COUNT(*) AS count FROM enterprise_knowledge_uploads
         WHERE owner_account_id = ? AND state IN ('active', 'committing') AND expires_at > ?`,
        )
        .get(ownerAccountId, now) as { count: number };
      if (active.count >= KNOWLEDGE_UPLOADS_PER_ACTOR) {
        throw new EnterpriseKnowledgeError("UPLOAD_QUOTA", 429, "Too many active uploads.");
      }
      const zone = db
        .prepare("SELECT status FROM enterprise_knowledge_zones WHERE id = ?")
        .get(input.zoneId) as { status?: string } | undefined;
      if (!zone || zone.status !== "active") {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      if (input.targetSourceId) {
        const source = db
          .prepare(
            "SELECT kind FROM enterprise_knowledge_sources WHERE id = ? AND zone_id = ? AND status = 'active'",
          )
          .get(input.targetSourceId, input.zoneId) as { kind?: string } | undefined;
        if (!source || source.kind !== "file") {
          throw new EnterpriseKnowledgeError(
            "SOURCE_NOT_FOUND",
            404,
            "Knowledge source not found.",
          );
        }
      }
      db.prepare(
        `INSERT INTO enterprise_knowledge_uploads
         (id, zone_id, owner_account_id, target_source_id, title, original_name, declared_mime_type,
          expected_size, expected_hash, received_size, state, staging_name, expires_at,
          revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?, 1, ?, ?)`,
      ).run(
        id,
        input.zoneId,
        ownerAccountId,
        input.targetSourceId ?? null,
        title,
        safeFilename(input.originalName),
        input.declaredMimeType.trim().toLowerCase().slice(0, 160),
        input.expectedSize,
        input.expectedHash?.toLowerCase() ?? null,
        stagingName,
        now + KNOWLEDGE_UPLOAD_TTL_MS,
        now,
        now,
      );
    },
    options,
    { operationLabel: "enterprise.knowledge.upload.begin" },
  );
  await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const file = await open(resolveKnowledgeUploadStagingPath(stagingName, env), "wx", 0o600);
  await file.close();
  return getKnowledgeUpload(id, ownerAccountId, options)!;
}

export async function appendKnowledgeUploadChunk(
  uploadId: string,
  ownerAccountId: string,
  offset: number,
  chunk: Buffer,
  options: OpenClawStateDatabaseOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<KnowledgeUpload> {
  if (chunk.length === 0 || chunk.length > KNOWLEDGE_UPLOAD_CHUNK_MAX_BYTES) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_CHUNK_SIZE",
      413,
      "Chunk must contain at most 4 MiB.",
    );
  }
  const row = getUploadRow(uploadId, ownerAccountId, options);
  const now = Date.now();
  if (!row || row.state !== "active") {
    throw new EnterpriseKnowledgeError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
  }
  if (row.expires_at <= now) {
    throw new EnterpriseKnowledgeError("UPLOAD_EXPIRED", 410, "Upload expired.");
  }
  if (offset !== row.received_size) {
    if (offset >= 0 && offset + chunk.length <= row.received_size) {
      const existingFile = await open(
        resolveKnowledgeUploadStagingPath(row.staging_name, env),
        "r",
      );
      try {
        const existing = Buffer.allocUnsafe(chunk.length);
        const read = await existingFile.read(existing, 0, chunk.length, offset);
        if (read.bytesRead === chunk.length && existing.equals(chunk)) {
          return toUpload(row);
        }
      } finally {
        await existingFile.close();
      }
    }
    throw new EnterpriseKnowledgeError(
      "UPLOAD_OFFSET_CONFLICT",
      409,
      "Upload offset does not match.",
      {
        expectedOffset: row.received_size,
      },
    );
  }
  if (offset + chunk.length > row.expected_size) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_SIZE_MISMATCH",
      422,
      "Chunk exceeds expected file size.",
    );
  }
  const claimToken = generateSecureUuid();
  const claimed = runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_knowledge_uploads
           SET chunk_claim_token = ?, chunk_claim_offset = ?, chunk_claim_size = ?,
               chunk_claim_expires_at = ?, updated_at = ?
           WHERE id = ? AND owner_account_id = ? AND state = 'active'
             AND revision = ? AND received_size = ?
             AND (chunk_claim_token IS NULL OR chunk_claim_expires_at <= ?)`,
        )
        .run(
          claimToken,
          offset,
          chunk.length,
          now + 60_000,
          now,
          uploadId,
          ownerAccountId,
          row.revision,
          offset,
          now,
        ).changes,
    options,
    { operationLabel: "enterprise.knowledge.upload.chunk-claim" },
  );
  if (claimed !== 1) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_CHUNK_BUSY",
      409,
      "Another worker is writing this upload offset.",
      { expectedOffset: getKnowledgeUpload(uploadId, ownerAccountId, options)?.receivedSize },
    );
  }
  const file = await open(resolveKnowledgeUploadStagingPath(row.staging_name, env), "r+");
  try {
    const written = await file.write(chunk, 0, chunk.length, offset);
    if (written.bytesWritten !== chunk.length) {
      throw new Error("UPLOAD_SHORT_WRITE");
    }
    await file.sync();
  } catch (error) {
    runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `UPDATE enterprise_knowledge_uploads SET chunk_claim_token = NULL,
             chunk_claim_offset = NULL, chunk_claim_size = NULL, chunk_claim_expires_at = NULL
             WHERE id = ? AND owner_account_id = ? AND chunk_claim_token = ?`,
          )
          .run(uploadId, ownerAccountId, claimToken),
      options,
      { operationLabel: "enterprise.knowledge.upload.chunk-release" },
    );
    throw error;
  } finally {
    await file.close();
  }
  const changed = runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_knowledge_uploads SET received_size = ?, revision = revision + 1,
           chunk_claim_token = NULL, chunk_claim_offset = NULL, chunk_claim_size = NULL,
           chunk_claim_expires_at = NULL, updated_at = ?
           WHERE id = ? AND owner_account_id = ? AND state = 'active' AND revision = ?
             AND received_size = ? AND chunk_claim_token = ? AND chunk_claim_offset = ?
             AND chunk_claim_size = ?`,
        )
        .run(
          offset + chunk.length,
          now,
          uploadId,
          ownerAccountId,
          row.revision,
          offset,
          claimToken,
          offset,
          chunk.length,
        ).changes,
    options,
    { operationLabel: "enterprise.knowledge.upload.chunk" },
  );
  if (changed !== 1) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_OFFSET_CONFLICT",
      409,
      "The upload chunk lease was lost before commit.",
    );
  }
  return getKnowledgeUpload(uploadId, ownerAccountId, options)!;
}

export async function commitKnowledgeUpload(
  uploadId: string,
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ upload: KnowledgeUpload; sourceId: string; sourceVersionId: string; jobId: string }> {
  const row = getUploadRow(uploadId, ownerAccountId, options);
  if (!row) {
    throw new EnterpriseKnowledgeError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
  }
  if (row.state === "committed" && row.committed_source_version_id) {
    return resolveCommittedUpload(row, options);
  }
  if (!(["active", "committing"] as const).includes(row.state as "active" | "committing")) {
    throw new EnterpriseKnowledgeError("UPLOAD_INCOMPLETE", 409, "Upload is not active.");
  }
  if (row.received_size !== row.expected_size) {
    throw new EnterpriseKnowledgeError("UPLOAD_INCOMPLETE", 409, "Upload is not complete.");
  }
  const filePath = resolveKnowledgeUploadStagingPath(row.staging_name, env);
  const fileStat = await stat(filePath);
  if (fileStat.size !== row.expected_size) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_SIZE_MISMATCH",
      422,
      "Uploaded file size does not match.",
    );
  }
  if (row.state === "active") {
    const claimed = runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `UPDATE enterprise_knowledge_uploads SET state = 'committing', revision = revision + 1, updated_at = ?
         WHERE id = ? AND owner_account_id = ? AND state = 'active' AND revision = ?`,
          )
          .run(Date.now(), uploadId, ownerAccountId, row.revision).changes,
      options,
      { operationLabel: "enterprise.knowledge.upload.commit-claim" },
    );
    if (claimed !== 1) {
      const current = getUploadRow(uploadId, ownerAccountId, options);
      if (current?.state === "committed" && current.committed_source_version_id) {
        return resolveCommittedUpload(current, options);
      }
      if (current?.state !== "committing") {
        throw new EnterpriseKnowledgeError(
          "UPLOAD_COMMIT_CONFLICT",
          409,
          "Upload is already being committed.",
        );
      }
    }
  }
  try {
    const blob = await importKnowledgeBlobFile(filePath, row.expected_hash ?? undefined, env);
    const sourceId = row.target_source_id ?? generateSecureUuid();
    const sourceVersionId = generateSecureUuid();
    const jobId = generateSecureUuid();
    const committedVersionId = runOpenClawStateWriteTransaction(
      ({ db }) => {
        const current = db
          .prepare(
            "SELECT state, committed_source_version_id FROM enterprise_knowledge_uploads WHERE id = ? AND owner_account_id = ?",
          )
          .get(uploadId, ownerAccountId) as
          | { state: string; committed_source_version_id: string | null }
          | undefined;
        if (current?.state === "committed" && current.committed_source_version_id) {
          return current.committed_source_version_id;
        }
        if (current?.state !== "committing") {
          throw new EnterpriseKnowledgeError(
            "UPLOAD_COMMIT_CONFLICT",
            409,
            "Upload commit state changed.",
          );
        }
        const now = Date.now();
        let versionNumber = 1;
        let pipelineGeneration = 1;
        if (row.target_source_id) {
          const target = db
            .prepare(
              `SELECT current_version_number,
                      (SELECT COALESCE(MAX(v.pipeline_generation), 0) + 1
                       FROM enterprise_knowledge_source_versions v WHERE v.source_id = s.id)
                         AS next_pipeline_generation
               FROM enterprise_knowledge_sources s
               WHERE s.id = ? AND s.zone_id = ? AND s.kind = 'file' AND s.status = 'active'`,
            )
            .get(row.target_source_id, row.zone_id) as
            | { current_version_number: number; next_pipeline_generation: number }
            | undefined;
          if (!target) {
            throw new EnterpriseKnowledgeError(
              "SOURCE_NOT_FOUND",
              404,
              "Knowledge source not found.",
            );
          }
          versionNumber = Number(target.current_version_number) + 1;
          pipelineGeneration = Number(target.next_pipeline_generation);
          db.prepare(
            `UPDATE enterprise_knowledge_sources SET title = ?, current_version_number = ?,
             draft_revision = draft_revision + 1, updated_by_account_id = ?, updated_at = ?
             WHERE id = ?`,
          ).run(row.title, versionNumber, ownerAccountId, now, sourceId);
        } else {
          db.prepare(
            `INSERT INTO enterprise_knowledge_sources
             (id, zone_id, kind, title, canonical_url, status, draft_revision,
              current_version_number, created_by_account_id, updated_by_account_id, created_at, updated_at)
             VALUES (?, ?, 'file', ?, NULL, 'active', 1, 1, ?, ?, ?, ?)`,
          ).run(sourceId, row.zone_id, row.title, ownerAccountId, ownerAccountId, now, now);
        }
        db.prepare(
          `INSERT INTO enterprise_knowledge_source_versions
           (id, source_id, zone_id, version_number, pipeline_generation, publication_status,
            processing_status, content_hash, blob_hash, byte_size, mime_type, original_name,
            vector_status, created_by_account_id, created_at)
           VALUES (?, ?, ?, ?, ?, 'draft', 'queued', ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        ).run(
          sourceVersionId,
          sourceId,
          row.zone_id,
          versionNumber,
          pipelineGeneration,
          blob.hash,
          blob.hash,
          blob.byteSize,
          row.declared_mime_type,
          row.original_name,
          ownerAccountId,
          now,
        );
        db.prepare(
          `INSERT INTO enterprise_knowledge_jobs
           (id, zone_id, source_id, source_version_id, kind, stage, status, attempt,
            pipeline_generation, available_at, created_by_account_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'source_ingest', 'validate', 'queued', 0, ?, ?, ?, ?, ?)`,
        ).run(
          jobId,
          row.zone_id,
          sourceId,
          sourceVersionId,
          pipelineGeneration,
          now,
          ownerAccountId,
          now,
          now,
        );
        db.prepare(
          `UPDATE enterprise_knowledge_zones SET source_set_revision = source_set_revision + 1,
           build_revision = COALESCE(build_revision, source_set_revision) + 1,
           revision = revision + 1, updated_by_account_id = ?, updated_at = ? WHERE id = ?`,
        ).run(ownerAccountId, now, row.zone_id);
        db.prepare(
          `UPDATE enterprise_knowledge_uploads SET state = 'committed', committed_source_version_id = ?,
           revision = revision + 1, updated_at = ?
           WHERE id = ? AND owner_account_id = ? AND state = 'committing'`,
        ).run(sourceVersionId, now, uploadId, ownerAccountId);
        appendEnterpriseKnowledgeChangeRow(db, {
          zoneId: String(row.zone_id),
          entityType: "upload",
          entityId: uploadId,
          operation: "completed",
          revision: Number(row.revision ?? 0) + 1,
          status: "committed",
          occurredAt: now,
        });
        appendEnterpriseKnowledgeChangeRow(db, {
          zoneId: String(row.zone_id),
          entityType: "job",
          entityId: jobId,
          operation: "created",
          status: "queued",
          stage: "validate",
          occurredAt: now,
        });
        return sourceVersionId;
      },
      options,
      { operationLabel: "enterprise.knowledge.upload.commit-atomic" },
    );
    await unlink(filePath).catch(() => undefined);
    const committed = getUploadRow(uploadId, ownerAccountId, options);
    if (!committed || committedVersionId !== committed.committed_source_version_id) {
      throw new Error("UPLOAD_COMMIT_LEDGER_MISMATCH");
    }
    return resolveCommittedUpload(committed, options);
  } catch (error) {
    if (error instanceof EnterpriseKnowledgeError && error.code === "UPLOAD_COMMIT_CONFLICT") {
      throw error;
    }
    runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `UPDATE enterprise_knowledge_uploads SET state = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND owner_account_id = ? AND state = 'committing'`,
          )
          .run(
            String(error).includes("HASH_MISMATCH") ? "error" : "active",
            Date.now(),
            uploadId,
            ownerAccountId,
          ),
      options,
      { operationLabel: "enterprise.knowledge.upload.commit-fail" },
    );
    if (String(error).includes("HASH_MISMATCH")) {
      throw new EnterpriseKnowledgeError(
        "UPLOAD_HASH_MISMATCH",
        422,
        "Uploaded file hash does not match.",
      );
    }
    throw error;
  }
}

function resolveCommittedUpload(
  row: UploadRow,
  options: OpenClawStateDatabaseOptions,
): { upload: KnowledgeUpload; sourceId: string; sourceVersionId: string; jobId: string } {
  const resolved = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT v.source_id, v.id AS source_version_id, j.id AS job_id
       FROM enterprise_knowledge_source_versions v
       LEFT JOIN enterprise_knowledge_jobs j ON j.source_version_id = v.id AND j.kind = 'source_ingest'
       WHERE v.id = ? LIMIT 1`,
    )
    .get(row.committed_source_version_id) as
    | { source_id: string; source_version_id: string; job_id: string | null }
    | undefined;
  if (!resolved) {
    throw new EnterpriseKnowledgeError(
      "UPLOAD_COMMIT_LEDGER_CORRUPT",
      503,
      "Committed upload record is unavailable.",
    );
  }
  return {
    upload: toUpload(row),
    sourceId: resolved.source_id,
    sourceVersionId: resolved.source_version_id,
    jobId: resolved.job_id ?? "",
  };
}

export async function cancelKnowledgeUpload(
  uploadId: string,
  ownerAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const row = getUploadRow(uploadId, ownerAccountId, options);
  if (!row) {
    return;
  }
  runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `UPDATE enterprise_knowledge_uploads SET state = 'cancelled', revision = revision + 1, updated_at = ?
       WHERE id = ? AND owner_account_id = ? AND state IN ('active', 'error')`,
        )
        .run(Date.now(), uploadId, ownerAccountId),
    options,
    { operationLabel: "enterprise.knowledge.upload.cancel" },
  );
  await unlink(resolveKnowledgeUploadStagingPath(row.staging_name, env)).catch(() => undefined);
}
