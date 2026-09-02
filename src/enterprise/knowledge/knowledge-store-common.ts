import {
  EnterpriseKnowledgeError,
  type KnowledgeSource,
  type KnowledgeSourceKind,
  type KnowledgeSourceVersion,
  type KnowledgeZone,
} from "./knowledge-types.js";

export type KnowledgeStoreRow = Record<string, unknown>;

export function text(row: KnowledgeStoreRow, key: string): string {
  return String(row[key]);
}

export function nullableText(row: KnowledgeStoreRow, key: string): string | null {
  return typeof row[key] === "string" ? row[key] : null;
}

export function integer(row: KnowledgeStoreRow, key: string): number {
  return Number(row[key]);
}

export function toZone(row: KnowledgeStoreRow): KnowledgeZone {
  return {
    id: text(row, "id"),
    slug: text(row, "slug"),
    name: text(row, "name"),
    description: text(row, "description"),
    status: row.status === "archived" ? "archived" : "active",
    egressPolicy: row.egress_policy === "external_allowed" ? "external_allowed" : "local_only",
    revision: integer(row, "revision"),
    accessRevision: integer(row, "access_revision"),
    sourceSetRevision: integer(row, "source_set_revision"),
    buildRevision:
      row.build_revision === null || row.build_revision === undefined
        ? integer(row, "source_set_revision")
        : integer(row, "build_revision"),
    activePublicationId: nullableText(row, "active_publication_id"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  };
}

export function toSource(row: KnowledgeStoreRow): KnowledgeSource {
  return {
    id: text(row, "id"),
    zoneId: text(row, "zone_id"),
    // SAFETY: persisted source kinds are validated at adapter dispatch and remain extensible by design.
    kind: text(row, "kind") as KnowledgeSourceKind,
    title: text(row, "title"),
    canonicalUrl: nullableText(row, "canonical_url"),
    status:
      row.status === "archived"
        ? "archived"
        : row.status === "staged_remove"
          ? "staged_remove"
          : "active",
    draftRevision: integer(row, "draft_revision"),
    currentVersionNumber: integer(row, "current_version_number"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  };
}

export function toVersion(row: KnowledgeStoreRow): KnowledgeSourceVersion {
  return {
    id: text(row, "id"),
    sourceId: text(row, "source_id"),
    zoneId: text(row, "zone_id"),
    versionNumber: integer(row, "version_number"),
    pipelineGeneration: integer(row, "pipeline_generation"),
    // SAFETY: the schema CHECK constrains publication_status to the public union.
    publicationStatus: text(
      row,
      "publication_status",
    ) as KnowledgeSourceVersion["publicationStatus"],
    // SAFETY: the schema CHECK constrains processing_status to the public union.
    processingStatus: text(row, "processing_status") as KnowledgeSourceVersion["processingStatus"],
    contentHash: text(row, "content_hash"),
    blobHash: nullableText(row, "blob_hash"),
    byteSize: integer(row, "byte_size"),
    mimeType: text(row, "mime_type"),
    originalName: nullableText(row, "original_name"),
    normalizedArtifactHash: nullableText(row, "normalized_artifact_hash"),
    segmentCount: row.segment_count === null ? null : integer(row, "segment_count"),
    // SAFETY: the schema CHECK constrains vector_status to the public union.
    vectorStatus: text(row, "vector_status") as KnowledgeSourceVersion["vectorStatus"],
    safeErrorCode: nullableText(row, "safe_error_code"),
    createdAt: integer(row, "created_at"),
    completedAt: row.completed_at === null ? null : integer(row, "completed_at"),
  };
}

export function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    throw new EnterpriseKnowledgeError(
      "INVALID_SLUG",
      422,
      "Use 3-64 lowercase letters, numbers, or hyphens.",
    );
  }
  return slug;
}

export function normalizeLabel(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || Buffer.byteLength(normalized, "utf8") > max || /[\0]/.test(normalized)) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, `${field} is invalid.`);
  }
  return normalized;
}
