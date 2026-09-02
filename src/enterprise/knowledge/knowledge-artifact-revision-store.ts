import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { NormalizedKnowledgeArtifact } from "./knowledge-types.js";

export function recordKnowledgeArtifactRevision(
  params: { artifactHash: string; artifact: NormalizedKnowledgeArtifact },
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const extractorIdentity =
    params.artifact.schemaVersion === 3
      ? params.artifact.extractorIdentity
      : String(
          params.artifact.parserProvenance.extractor ??
            params.artifact.parserProvenance.parser ??
            "legacy",
        );
  const checksum =
    params.artifact.schemaVersion === 3 ? params.artifact.artifactChecksum : params.artifactHash;
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT OR IGNORE INTO enterprise_knowledge_artifact_revisions
         (artifact_hash, source_version_id, artifact_schema_version, extractor_identity,
          artifact_checksum, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        params.artifactHash,
        params.artifact.sourceVersionId,
        params.artifact.schemaVersion,
        extractorIdentity,
        checksum,
        params.artifact.createdAt,
      );
    },
    options,
    { operationLabel: "enterprise.knowledge.artifact-revision.record" },
  );
}

export function bindKnowledgeGenerationArtifacts(
  params: {
    generationId: string;
    artifacts: Array<{ sourceVersionId: string; artifactHash: string }>;
  },
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const insert = db.prepare(
        `INSERT INTO enterprise_knowledge_generation_artifacts
         (generation_id, source_version_id, artifact_hash) VALUES (?, ?, ?)`,
      );
      for (const artifact of params.artifacts) {
        insert.run(params.generationId, artifact.sourceVersionId, artifact.artifactHash);
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.generation-artifacts.bind" },
  );
}

export function listKnowledgeArtifactRevisions(
  sourceVersionId: string,
  options: OpenClawStateDatabaseOptions = {},
): Array<{
  artifactHash: string;
  schemaVersion: 1 | 2 | 3;
  extractorIdentity: string;
  artifactChecksum: string;
  createdAt: number;
}> {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT artifact_hash, artifact_schema_version, extractor_identity, artifact_checksum, created_at
       FROM enterprise_knowledge_artifact_revisions
       WHERE source_version_id = ? ORDER BY created_at DESC`,
    )
    .all(sourceVersionId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    artifactHash: String(row.artifact_hash),
    schemaVersion: Number(row.artifact_schema_version) as 1 | 2 | 3,
    extractorIdentity: String(row.extractor_identity),
    artifactChecksum: String(row.artifact_checksum),
    createdAt: Number(row.created_at),
  }));
}
