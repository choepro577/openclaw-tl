import { createHash } from "node:crypto";
import { chmodSync, existsSync, linkSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  resolveEnterpriseKnowledgeArtifactPaths,
  resolveKnowledgeGenerationDatabasePath,
  resolveKnowledgeGenerationGraphDatabasePath,
} from "./artifact-store.js";
import { buildKnowledgeGraphInDatabase } from "./graph-index.js";
import { appendEnterpriseKnowledgeChangeRow } from "./knowledge-job-store.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeLocator,
  type NormalizedKnowledgeArtifact,
} from "./knowledge-types.js";

type Row = Record<string, unknown>;
type GraphCounts = ReturnType<typeof buildKnowledgeGraphInDatabase>;

function integrityError(): EnterpriseKnowledgeError {
  return new EnterpriseKnowledgeError(
    "GRAPH_INTEGRITY_FAILED",
    422,
    "The immutable knowledge snapshot failed validation.",
  );
}

function readSnapshotArtifacts(
  source: DatabaseSync,
  state: DatabaseSync,
  generationId: string,
  env: NodeJS.ProcessEnv,
): NormalizedKnowledgeArtifact[] {
  // SAFETY: these rows come from the fixed generation chunks SELECT below.
  const chunks = source
    .prepare("SELECT * FROM chunks ORDER BY source_version_id, ordinal")
    .all() as Row[];
  const groups = new Map<string, Row[]>();
  for (const chunk of chunks) {
    const key = String(chunk.source_version_id);
    const group = groups.get(key) ?? [];
    group.push(chunk);
    groups.set(key, group);
  }
  // Use generation-bound artifacts, never the source version's latest reanalysis.
  // Older generations without bindings still have authoritative frozen chunks.
  // SAFETY: selected columns are strings in the generation-artifact binding table.
  const bindings = state
    .prepare(
      "SELECT source_version_id, artifact_hash FROM enterprise_knowledge_generation_artifacts WHERE generation_id = ?",
    )
    .all(generationId) as Array<{ source_version_id: string; artifact_hash: string }>;
  const hashes = new Map(bindings.map((row) => [row.source_version_id, row.artifact_hash]));
  return [...groups].map(([versionId, rows]) => {
    const first = rows[0]!;
    const artifactHash = hashes.get(versionId);
    if (artifactHash && /^[a-f0-9]{64}$/.test(artifactHash)) {
      try {
        const bytes = readFileSync(
          path.join(
            resolveEnterpriseKnowledgeArtifactPaths(env).normalized,
            artifactHash.slice(0, 2),
            `${artifactHash}.json`,
          ),
        );
        if (createHash("sha256").update(bytes).digest("hex") !== artifactHash) {
          throw integrityError();
        }
        // SAFETY: stored normalized artifacts are producer-owned and hash verified;
        // identity and every evidence segment must also match the frozen index.
        const artifact = JSON.parse(bytes.toString("utf8")) as NormalizedKnowledgeArtifact;
        const byId = new Map(rows.map((row) => [String(row.segment_id), row]));
        if (
          artifact.sourceId === first.source_id &&
          artifact.sourceVersionId === versionId &&
          artifact.title === first.source_title &&
          artifact.segments.length === rows.length &&
          artifact.segments.every((segment) => {
            const row = byId.get(segment.id);
            return (
              row &&
              segment.text === row.original_text &&
              segment.normalizedText === row.normalized_text &&
              segment.ordinal === row.ordinal &&
              JSON.stringify(segment.locator) === row.locator_json
            );
          })
        ) {
          return artifact;
        }
      } catch {
        // A missing or unusable normalized artifact cannot replace frozen evidence.
        // The structural projection below is derived entirely from this index.
      }
    }
    return {
      schemaVersion: 1,
      sourceId: String(first.source_id),
      sourceVersionId: versionId,
      sourceVersion: Number(first.source_version),
      title: String(first.source_title),
      mimeType: "text/plain",
      createdAt: 0,
      parserProvenance: { parser: "immutable-generation-graph" },
      segments: rows.map((row) => ({
        id: String(row.segment_id),
        text: String(row.original_text),
        normalizedText: String(row.normalized_text),
        ordinal: Number(row.ordinal),
        // SAFETY: the locator is the original producer-validated index value.
        locator: JSON.parse(String(row.locator_json)) as KnowledgeLocator,
      })),
    };
  });
}

function cachedCounts(file: string, zoneId: string, generationId: string): GraphCounts | undefined {
  if (!existsSync(file)) return undefined;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    // Metadata/stat reads keep subsequent views independent of corpus size.
    // SAFETY: metadata and graph_stats are key/value tables owned by the builder.
    const metadata = new Map(
      (
        db.prepare("SELECT key, value FROM metadata").all() as Array<{ key: string; value: string }>
      ).map((row) => [row.key, row.value]),
    );
    if (metadata.get("zoneId") !== zoneId || metadata.get("generationId") !== generationId)
      return undefined;
    // SAFETY: same graph builder key/value table as above.
    const stats = new Map(
      (
        db.prepare("SELECT key, value FROM graph_stats").all() as Array<{
          key: string;
          value: string;
        }>
      ).map((row) => [row.key, row.value]),
    );
    db.prepare("SELECT id FROM graph_nodes LIMIT 1").get();
    return {
      status: "ready",
      nodeCount: Number(stats.get("nodeCount")),
      edgeCount: Number(stats.get("edgeCount")),
      proposedCount: Number(stats.get("proposedCount")),
      orphanCount: Number(stats.get("orphanCount")),
      componentCount: Number(stats.get("componentCount")),
    };
  } catch {
    return undefined;
  } finally {
    db?.close();
  }
}

/** Provision a disposable structural graph without rewriting published indexes. */
export function ensureKnowledgeGraphGenerationGraph(params: {
  zoneId: string;
  generationId: string;
  options?: OpenClawStateDatabaseOptions;
  env?: NodeJS.ProcessEnv;
}): string {
  const options = params.options ?? {};
  const env = params.env ?? process.env;
  ensureEnterpriseSchema(options);
  const state = openOpenClawStateDatabase(options).db;
  // SAFETY: fixed generation query; the request owner already checked Zone ACL.
  const generation = state
    .prepare(
      "SELECT * FROM enterprise_knowledge_index_generations WHERE id = ? AND zone_id = ? AND status IN ('active', 'candidate')",
    )
    .get(params.generationId, params.zoneId) as Row | undefined;
  if (!generation || generation.graph_status === "error") throw integrityError();
  const target = resolveKnowledgeGenerationGraphDatabasePath(
    params.zoneId,
    params.generationId,
    env,
  );
  let counts: GraphCounts | undefined;
  try {
    counts = cachedCounts(target, params.zoneId, params.generationId);
  } catch {
    /* Rebuild a disposable corrupt cache. */
  }
  if (!counts) {
    const original = resolveKnowledgeGenerationDatabasePath(
      params.zoneId,
      params.generationId,
      env,
    );
    const checksum = createHash("sha256").update(readFileSync(original)).digest("hex");
    if (generation.artifact_checksum && checksum !== generation.artifact_checksum)
      throw integrityError();
    const source = new DatabaseSync(original, { readOnly: true });
    const temporary = `${target}.${generateSecureUuid()}.tmp`;
    let graph: DatabaseSync | undefined;
    try {
      if (source.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok")
        throw integrityError();
      const artifacts = readSnapshotArtifacts(source, state, params.generationId, env);
      graph = new DatabaseSync(temporary);
      graph.exec(
        "PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;",
      );
      const insert = graph.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)");
      // SAFETY: original metadata is a fixed key/value table, copied without content changes.
      for (const row of source.prepare("SELECT key, value FROM metadata").all() as Array<{
        key: string;
        value: string;
      }>)
        insert.run(row.key, row.value);
      counts = buildKnowledgeGraphInDatabase({
        db: graph,
        artifacts,
        settings: {
          enabled: true,
          enrichmentEnabled: false,
          autoApprovalThreshold: 0.92,
          updatedAt: 0,
        },
        reviewOverlays: [],
        manualEdges: [],
      });
      graph
        .prepare("INSERT OR REPLACE INTO metadata (key,value) VALUES ('graphStatus','ready')")
        .run();
      if (graph.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok")
        throw integrityError();
      graph.close();
      graph = undefined;
      chmodSync(temporary, 0o600);
      if (existsSync(target) && !cachedCounts(target, params.zoneId, params.generationId))
        unlinkSync(target);
      // Only a completed private database becomes visible; concurrent builders
      // keep the first installed graph, all derived from the same frozen index.
      try {
        linkSync(temporary, target);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      }
    } finally {
      graph?.close();
      source.close();
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
  if (generation.graph_status === "not_built" || generation.graph_status == null) {
    const built = counts;
    runOpenClawStateWriteTransaction(
      ({ db }) => {
        const updated = db
          .prepare(
            `UPDATE enterprise_knowledge_index_generations SET graph_status = 'ready', graph_schema_version = 2,
         graph_node_count = ?, graph_edge_count = ?, graph_proposed_count = ?, graph_orphan_count = ?
         WHERE id = ? AND zone_id = ? AND (graph_status IS NULL OR graph_status = 'not_built')`,
          )
          .run(
            built.nodeCount,
            built.edgeCount,
            built.proposedCount,
            built.orphanCount,
            params.generationId,
            params.zoneId,
          );
        if (updated.changes)
          appendEnterpriseKnowledgeChangeRow(db, {
            zoneId: params.zoneId,
            entityType: "graph",
            entityId: params.generationId,
            operation: "updated",
            revision: Number(generation.build_revision ?? generation.source_set_revision),
            status: "ready",
            stage: "backfilled",
            occurredAt: Date.now(),
          });
      },
      options,
      { operationLabel: "enterprise.knowledge.graph.backfill" },
    );
  }
  return target;
}
