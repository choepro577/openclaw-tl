import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadSqliteVecExtension } from "../../../packages/memory-host-sdk/src/engine-storage.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { issueEnterpriseOpaqueReference, verifyEnterpriseOpaqueReference } from "../auth/jwt.js";
import {
  ensureEnterpriseKnowledgeArtifactDirectories,
  resolveKnowledgeGenerationDatabasePath,
} from "./artifact-store.js";
import type { KnowledgeEmbeddingIdentity } from "./embedding-runtime.js";
import {
  buildKnowledgeGraphInDatabase,
  type KnowledgeGraphEnrichmentNode,
  type KnowledgeGraphEnrichmentRelation,
} from "./graph-index.js";
import type {
  KnowledgeGraphManualEdge,
  KnowledgeGraphReviewOverlay,
} from "./knowledge-graph-control-store.js";
import type {
  KnowledgeCitation,
  KnowledgeGraphEnrichmentIdentity,
  KnowledgeLocator,
  KnowledgeSearchHit,
  NormalizedKnowledgeArtifact,
  KnowledgeGraphSettings,
} from "./knowledge-types.js";

const INDEX_SCHEMA = `
CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  segment_id TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  source_version INTEGER NOT NULL,
  source_title TEXT NOT NULL,
  locator_json TEXT NOT NULL,
  original_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  ordinal INTEGER NOT NULL
) STRICT;
CREATE INDEX idx_chunks_source ON chunks(source_id, ordinal);
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  source_title,
  normalized_text,
  content='chunks',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
`;

function toFtsQuery(query: string): string {
  const tokens = [...knowledgeLexicalTerms(query)];
  if (!tokens.length) {
    return '""';
  }
  return tokens.map((token) => `"${token.replaceAll('"', '""')}"`).join(" OR ");
}

function knowledgeLexicalTerms(text: string): Set<string> {
  const normalized = text.normalize("NFC").toLowerCase();
  return new Set(normalized.match(/[\p{L}\p{N}_-]+/gu));
}

function foldedKnowledgeLexicalTerms(text: string): Set<string> {
  return knowledgeLexicalTerms(text.normalize("NFD").replace(/\p{M}/gu, ""));
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

export async function buildKnowledgeGenerationIndex(params: {
  zoneId: string;
  generationId: string;
  sourceSetRevision: number;
  buildRevision: number;
  artifacts: NormalizedKnowledgeArtifact[];
  vectors?: Map<string, number[]>;
  embeddingIdentity?: KnowledgeEmbeddingIdentity;
  vectorExtensionPath?: string;
  graph?: {
    settings: KnowledgeGraphSettings;
    reviewOverlays: KnowledgeGraphReviewOverlay[];
    manualEdges: KnowledgeGraphManualEdge[];
    enrichmentRelations?: KnowledgeGraphEnrichmentRelation[];
    enrichmentNodes?: KnowledgeGraphEnrichmentNode[];
    enrichmentIdentity?: KnowledgeGraphEnrichmentIdentity;
    enrichmentDegraded?: boolean;
  };
  env?: NodeJS.ProcessEnv;
}): Promise<{
  path: string;
  checksum: string;
  chunkCount: number;
  vectorStatus: "ready" | "unavailable" | "error";
  graphStatus: "not_built" | "ready" | "degraded";
  graphSchemaVersion: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  graphProposedCount: number;
  graphOrphanCount: number;
}> {
  await ensureEnterpriseKnowledgeArtifactDirectories(params.env);
  const target = resolveKnowledgeGenerationDatabasePath(
    params.zoneId,
    params.generationId,
    params.env,
  );
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${generateSecureUuid()}.tmp`;
  const db = new DatabaseSync(temporary, { allowExtension: true });
  let chunkCount = 0;
  let vectorStatus: "ready" | "unavailable" | "error" = params.vectors ? "error" : "unavailable";
  let graphStatus: "not_built" | "ready" | "degraded" = "not_built";
  let graphNodeCount = 0;
  let graphEdgeCount = 0;
  let graphProposedCount = 0;
  let graphOrphanCount = 0;
  try {
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;");
    db.exec(INDEX_SCHEMA);
    db.exec("BEGIN IMMEDIATE");
    try {
      const metadata = db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)");
      metadata.run("zoneId", params.zoneId);
      metadata.run("generationId", params.generationId);
      metadata.run("sourceSetRevision", String(params.sourceSetRevision));
      metadata.run("buildRevision", String(params.buildRevision));
      metadata.run("schemaVersion", "2");
      metadata.run(
        "artifactSchemaVersion",
        String(Math.max(1, ...params.artifacts.map((artifact) => artifact.schemaVersion))),
      );
      metadata.run("builtAt", String(Date.now()));
      if (params.embeddingIdentity) {
        metadata.run("embeddingIdentity", JSON.stringify(params.embeddingIdentity));
      }
      const insert = db.prepare(
        `INSERT INTO chunks
         (segment_id, source_id, source_version_id, source_version, source_title,
          locator_json, original_text, normalized_text, ordinal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      const fts = db.prepare(
        `INSERT INTO chunks_fts(rowid, source_title, normalized_text)
         VALUES (?, ?, ?)`,
      );
      for (const artifact of params.artifacts) {
        for (const segment of artifact.segments) {
          const result = insert.run(
            segment.id,
            artifact.sourceId,
            artifact.sourceVersionId,
            artifact.sourceVersion,
            artifact.title,
            JSON.stringify(segment.locator),
            segment.text,
            segment.normalizedText,
            segment.ordinal,
          );
          fts.run(Number(result.lastInsertRowid), artifact.title, segment.normalizedText);
          chunkCount += 1;
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    if (params.vectors && params.embeddingIdentity && chunkCount > 0) {
      const loaded = await loadSqliteVecExtension({
        db,
        extensionPath: params.vectorExtensionPath,
      });
      if (loaded.ok) {
        db.exec(
          `CREATE VIRTUAL TABLE chunks_vec USING vec0(
             segment_id TEXT PRIMARY KEY,
             embedding FLOAT[${params.embeddingIdentity.dimension}]
           )`,
        );
        const insertVector = db.prepare(
          "INSERT INTO chunks_vec (segment_id, embedding) VALUES (?, ?)",
        );
        db.exec("BEGIN IMMEDIATE");
        try {
          for (const [segmentId, vector] of params.vectors) {
            if (
              vector.length !== params.embeddingIdentity.dimension ||
              vector.some((value) => !Number.isFinite(value))
            ) {
              throw new Error("VECTOR_CONTRACT_INVALID");
            }
            insertVector.run(segmentId, Buffer.from(Float32Array.from(vector).buffer));
          }
          db.exec("COMMIT");
          vectorStatus = "ready";
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
    }
    // Document structure is always available; graph settings control optional enrichment.
    const builtGraph = buildKnowledgeGraphInDatabase({
      db,
      artifacts: params.artifacts,
      vectors: params.vectors,
      settings: params.graph?.settings ?? {
        enabled: true,
        enrichmentEnabled: false,
        autoApprovalThreshold: 0.92,
        updatedAt: 0,
      },
      reviewOverlays: params.graph?.reviewOverlays ?? [],
      manualEdges: params.graph?.manualEdges ?? [],
      enrichmentNodes: params.graph?.enrichmentNodes,
      enrichmentRelations: params.graph?.enrichmentRelations,
      enrichmentIdentity: params.graph?.enrichmentIdentity,
      enrichmentDegraded: params.graph?.enrichmentDegraded,
    });
    graphStatus = builtGraph.status;
    graphNodeCount = builtGraph.nodeCount;
    graphEdgeCount = builtGraph.edgeCount;
    graphProposedCount = builtGraph.proposedCount;
    graphOrphanCount = builtGraph.orphanCount;
    db.prepare("INSERT INTO metadata (key, value) VALUES ('graphStatus', ?)").run(graphStatus);
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
    if (integrity.integrity_check !== "ok") {
      throw new Error("INDEX_INTEGRITY_FAILED");
    }
  } finally {
    db.close();
  }
  await fs.promises.chmod(temporary, 0o600);
  await rename(temporary, target).catch(async (error) => {
    await unlink(temporary).catch(() => undefined);
    throw error;
  });
  return {
    path: target,
    checksum: await sha256File(target),
    chunkCount,
    vectorStatus,
    graphStatus,
    graphSchemaVersion: 2,
    graphNodeCount,
    graphEdgeCount,
    graphProposedCount,
    graphOrphanCount,
  };
}

export async function doctorKnowledgeGenerationIndex(params: {
  zoneId: string;
  generationId: string;
  expectedChecksum?: string | null;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  ok: boolean;
  code: "OK" | "INDEX_MISSING" | "INDEX_CHECKSUM_MISMATCH" | "INDEX_CORRUPT";
  checksum?: string;
  chunkCount?: number;
}> {
  const target = resolveKnowledgeGenerationDatabasePath(
    params.zoneId,
    params.generationId,
    params.env,
  );
  let checksum: string;
  try {
    checksum = await sha256File(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: false, code: "INDEX_MISSING" };
    }
    return { ok: false, code: "INDEX_CORRUPT" };
  }
  if (params.expectedChecksum && checksum !== params.expectedChecksum) {
    return { ok: false, code: "INDEX_CHECKSUM_MISMATCH", checksum };
  }
  try {
    const db = new DatabaseSync(target, { readOnly: true });
    try {
      const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
      const metadata = Object.fromEntries(
        (
          db.prepare("SELECT key, value FROM metadata").all() as Array<{
            key: string;
            value: string;
          }>
        ).map((row) => [row.key, row.value]),
      );
      if (
        integrity.integrity_check !== "ok" ||
        metadata.zoneId !== params.zoneId ||
        metadata.generationId !== params.generationId
      ) {
        return { ok: false, code: "INDEX_CORRUPT", checksum };
      }
      const count = db.prepare("SELECT COUNT(*) AS count FROM chunks").get() as { count: number };
      const graphTable = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'graph_nodes'")
        .get();
      if (graphTable) {
        const danglingEndpoints = db
          .prepare(
            `SELECT COUNT(*) AS count FROM graph_edges e
             LEFT JOIN graph_nodes s ON s.id = e.source_node_id
             LEFT JOIN graph_nodes t ON t.id = e.target_node_id
             WHERE s.id IS NULL OR t.id IS NULL`,
          )
          .get() as { count: number };
        const danglingNodeEvidence = db
          .prepare(
            `SELECT COUNT(*) AS count FROM graph_node_evidence e
             LEFT JOIN graph_nodes n ON n.id = e.node_id
             LEFT JOIN chunks c ON c.segment_id = e.segment_id
             WHERE n.id IS NULL OR c.segment_id IS NULL`,
          )
          .get() as { count: number };
        const danglingEdgeEvidence = db
          .prepare(
            `SELECT COUNT(*) AS count FROM graph_edge_evidence x
             LEFT JOIN graph_edges e ON e.id = x.edge_id
             LEFT JOIN chunks c ON c.segment_id = x.segment_id
             WHERE e.id IS NULL OR c.segment_id IS NULL`,
          )
          .get() as { count: number };
        if (
          Number(danglingEndpoints.count) > 0 ||
          Number(danglingNodeEvidence.count) > 0 ||
          Number(danglingEdgeEvidence.count) > 0
        ) {
          return { ok: false, code: "INDEX_CORRUPT", checksum };
        }
      }
      return { ok: true, code: "OK", checksum, chunkCount: Number(count.count) };
    } finally {
      db.close();
    }
  } catch {
    return { ok: false, code: "INDEX_CORRUPT", checksum };
  }
}

type SearchRow = {
  segment_id: string;
  source_id: string;
  source_version_id: string;
  source_version: number;
  source_title: string;
  locator_json: string;
  original_text: string;
  rank: number;
  embedding?: Buffer;
};

function vectorToBlob(vector: number[]): Buffer {
  return Buffer.from(Float32Array.from(vector).buffer);
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) {
    return 0;
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index]! * right[index]!;
    leftNorm += left[index]! ** 2;
    rightNorm += right[index]! ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function vectorFromBlob(blob: Buffer | undefined): number[] | undefined {
  if (!blob || blob.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    return undefined;
  }
  return [...new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4)];
}

export async function searchKnowledgeGenerationIndex(params: {
  zoneId: string;
  zoneLabel: string;
  generationId: string;
  publicationId: string;
  publishedAt: number;
  query: string;
  queryVector?: number[];
  queryEmbeddingIdentity?: KnowledgeEmbeddingIdentity;
  vectorExtensionPath?: string;
  maxResults: number;
  env?: NodeJS.ProcessEnv;
  databaseOptions?: OpenClawStateDatabaseOptions;
}): Promise<KnowledgeSearchHit[]> {
  const db = new DatabaseSync(
    resolveKnowledgeGenerationDatabasePath(params.zoneId, params.generationId, params.env),
    { readOnly: true, allowExtension: true },
  );
  try {
    const query = params.query.slice(0, 2_000);
    const queryTerms = [...knowledgeLexicalTerms(query)];
    const foldedQueryTerms = [...foldedKnowledgeLexicalTerms(query)];
    const lexicalRows = db
      .prepare(
        `SELECT c.segment_id, c.source_id, c.source_version_id, c.source_version,
              c.source_title, c.locator_json, c.original_text, bm25(chunks_fts, 4.0, 1.0) AS rank
       FROM chunks_fts JOIN chunks c ON c.id = chunks_fts.rowid
       WHERE chunks_fts MATCH ? ORDER BY rank ASC LIMIT ?`,
      )
      .all(toFtsQuery(query), Math.max(params.maxResults * 4, 20)) as SearchRow[];
    let vectorRows: SearchRow[] = [];
    const rawIdentity = db
      .prepare("SELECT value FROM metadata WHERE key = 'embeddingIdentity'")
      .get() as { value?: string } | undefined;
    const indexIdentity = rawIdentity?.value
      ? (JSON.parse(rawIdentity.value) as KnowledgeEmbeddingIdentity)
      : undefined;
    if (
      params.queryVector &&
      params.queryEmbeddingIdentity &&
      indexIdentity?.provider === params.queryEmbeddingIdentity.provider &&
      indexIdentity.model === params.queryEmbeddingIdentity.model &&
      indexIdentity.dimension === params.queryEmbeddingIdentity.dimension &&
      params.queryVector.length === indexIdentity.dimension
    ) {
      const loaded = await loadSqliteVecExtension({
        db,
        extensionPath: params.vectorExtensionPath,
      });
      if (loaded.ok) {
        const queryBlob = vectorToBlob(params.queryVector);
        vectorRows = db
          .prepare(
            `SELECT c.segment_id, c.source_id, c.source_version_id, c.source_version,
                    c.source_title, c.locator_json, c.original_text,
                    vec_distance_cosine(v.embedding, ?) AS rank, v.embedding
             FROM chunks_vec v JOIN chunks c ON c.segment_id = v.segment_id
             WHERE v.embedding MATCH ? AND k = ?
             ORDER BY rank ASC LIMIT ?`,
          )
          .all(
            queryBlob,
            queryBlob,
            Math.max(params.maxResults * 8, 40),
            Math.max(params.maxResults * 4, 20),
          ) as SearchRow[];
      }
    }
    const fused = new Map<string, SearchRow & { fusedScore: number; vector?: number[] }>();
    const addRows = (rows: SearchRow[], weight: number) => {
      rows.forEach((row, index) => {
        const current = fused.get(row.segment_id) ?? { ...row, fusedScore: 0 };
        current.fusedScore += weight / (60 + index + 1);
        current.vector = current.vector ?? vectorFromBlob(row.embedding);
        fused.set(row.segment_id, current);
      });
    };
    addRows(lexicalRows, 1);
    addRows(vectorRows, 1);
    const normalizedTitleQuery = query.normalize("NFC").trim().toLocaleLowerCase();
    for (const row of fused.values()) {
      const text = `${row.source_title} ${row.original_text}`;
      const terms = knowledgeLexicalTerms(text);
      const foldedTerms = foldedKnowledgeLexicalTerms(text);
      const overlap = queryTerms.filter((term) => terms.has(term)).length;
      const foldedOverlap = foldedQueryTerms.filter((term) => foldedTerms.has(term)).length;
      // Comparable coverage breaks zone-local rank ties; preserving accents avoids
      // treating distinct words as exact matches. Both signals share one RRF budget.
      row.fusedScore +=
        (overlap / Math.max(queryTerms.length, 1) +
          foldedOverlap / Math.max(foldedQueryTerms.length, 1)) /
        120;
      if (row.source_title.normalize("NFC").trim().toLocaleLowerCase() === normalizedTitleQuery) {
        row.fusedScore += 0.25;
      }
    }
    const rows = [...fused.values()].toSorted((left, right) => right.fusedScore - left.fusedScore);
    const perSource = new Map<string, number>();
    const candidates = rows
      .map((row) => {
        const locator = JSON.parse(row.locator_json) as KnowledgeLocator;
        const citationId = issueEnterpriseOpaqueReference(
          "knowledge-citation",
          {
            z: params.zoneId,
            p: params.publicationId,
            g: params.generationId,
            s: row.source_id,
            v: row.source_version_id,
            n: row.source_version,
            x: row.segment_id,
          },
          params.databaseOptions,
        );
        const citation: KnowledgeCitation = {
          citationId,
          zoneLabel: params.zoneLabel,
          sourceTitle: row.source_title,
          sourceVersion: row.source_version,
          locator,
          publishedAt: new Date(params.publishedAt).toISOString(),
        };
        return {
          citationId,
          citation,
          excerpt: row.original_text.slice(0, 800),
          score: row.fusedScore,
          sourceId: row.source_id,
          vector: row.vector,
        };
      })
      .filter((hit) => {
        const count = perSource.get(hit.sourceId) ?? 0;
        if (count >= 2) {
          return false;
        }
        perSource.set(hit.sourceId, count + 1);
        return true;
      });
    const selected: typeof candidates = [];
    while (selected.length < params.maxResults && candidates.length > 0) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      candidates.forEach((candidate, index) => {
        const redundancy = candidate.vector
          ? Math.max(
              0,
              ...selected.map((item) =>
                item.vector ? cosineSimilarity(candidate.vector!, item.vector) : 0,
              ),
            )
          : 0;
        const mmr = 0.75 * candidate.score - 0.25 * redundancy;
        if (mmr > bestScore) {
          bestScore = mmr;
          bestIndex = index;
        }
      });
      selected.push(candidates.splice(bestIndex, 1)[0]!);
    }
    return selected.map(({ sourceId: _sourceId, vector: _vector, ...hit }) => hit);
  } finally {
    db.close();
  }
}

export type KnowledgeGenerationGraphCoverage = {
  seedCount: number;
  expandedEvidenceCount: number;
  maxDepth: number;
  truncated: boolean;
  availability: "available" | "disabled" | "not_built" | "timeout";
};

export async function searchKnowledgeGenerationIndexWithGraph(
  params: Parameters<typeof searchKnowledgeGenerationIndex>[0] & {
    graphExpansion: "off" | "shadow" | "on";
    graphBudgetMs?: number;
  },
): Promise<{ hits: KnowledgeSearchHit[]; graph: KnowledgeGenerationGraphCoverage }> {
  const hybridHits = await searchKnowledgeGenerationIndex(params);
  const seeds = hybridHits.slice(0, 8);
  const disabled: KnowledgeGenerationGraphCoverage = {
    seedCount: seeds.length,
    expandedEvidenceCount: 0,
    maxDepth: 0,
    truncated: false,
    availability: "disabled",
  };
  if (params.graphExpansion === "off" || seeds.length === 0) {
    return { hits: hybridHits, graph: disabled };
  }
  const db = new DatabaseSync(
    resolveKnowledgeGenerationDatabasePath(params.zoneId, params.generationId, params.env),
    { readOnly: true },
  );
  const startedAt = Date.now();
  const budgetMs = Math.max(100, Math.min(params.graphBudgetMs ?? 1_500, 1_500));
  try {
    const graphTable = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'graph_nodes'")
      .get();
    if (!graphTable) {
      return {
        hits: hybridHits,
        graph: { ...disabled, availability: "not_built" },
      };
    }
    type Frontier = { nodeId: string; depth: number; score: number; arrivedViaSimilar: boolean };
    const frontier: Frontier[] = [];
    const visited = new Map<string, { depth: number; score: number }>();
    const nodeBySegment = db.prepare(
      `SELECT node_id FROM graph_node_evidence WHERE segment_id = ?
       UNION SELECT id AS node_id FROM graph_nodes WHERE primary_segment_id = ? LIMIT 8`,
    );
    for (const seed of seeds) {
      const reference = verifyKnowledgeCitationReference(seed.citationId, params.databaseOptions);
      if (!reference || reference.generationId !== params.generationId) {
        continue;
      }
      for (const row of nodeBySegment.all(reference.segmentId, reference.segmentId) as Array<{
        node_id: string;
      }>) {
        if (!visited.has(row.node_id)) {
          visited.set(row.node_id, { depth: 0, score: seed.score });
          frontier.push({
            nodeId: row.node_id,
            depth: 0,
            score: seed.score,
            arrivedViaSimilar: false,
          });
        }
      }
    }
    const edgeQuery = db.prepare(
      `SELECT id, source_node_id, target_node_id, kind, origin, confidence
       FROM graph_edges WHERE review_status = 'accepted'
         AND (source_node_id = ? OR target_node_id = ?)
       ORDER BY confidence DESC, id ASC LIMIT 12`,
    );
    const evidenceScores = new Map<string, number>();
    let traversedEdges = 0;
    let maxDepth = 0;
    let truncated = false;
    let timedOut = false;
    while (frontier.length > 0) {
      if (Date.now() - startedAt >= budgetMs) {
        timedOut = true;
        truncated = true;
        break;
      }
      const current = frontier.shift()!;
      if (current.depth >= 2 || current.arrivedViaSimilar) {
        continue;
      }
      for (const edge of edgeQuery.all(current.nodeId, current.nodeId) as Array<{
        id: string;
        source_node_id: string;
        target_node_id: string;
        kind: string;
        origin: string;
        confidence: number;
      }>) {
        if (traversedEdges >= 80 || visited.size >= 40) {
          truncated = true;
          break;
        }
        traversedEdges += 1;
        const neighbor =
          edge.source_node_id === current.nodeId ? edge.target_node_id : edge.source_node_id;
        const depth = current.depth + 1;
        const originWeight =
          edge.origin === "deterministic"
            ? 1
            : edge.origin === "manual"
              ? 0.95
              : edge.origin === "ai"
                ? 0.85
                : 0.55;
        const score = current.score * 0.65 * Number(edge.confidence) * originWeight;
        maxDepth = Math.max(maxDepth, depth);
        const nodeEvidence = db
          .prepare(
            `SELECT segment_id FROM graph_node_evidence WHERE node_id = ?
             UNION SELECT segment_id FROM graph_edge_evidence WHERE edge_id = ? LIMIT 8`,
          )
          .all(neighbor, edge.id) as Array<{ segment_id: string }>;
        for (const evidence of nodeEvidence) {
          evidenceScores.set(
            evidence.segment_id,
            Math.max(evidenceScores.get(evidence.segment_id) ?? 0, score),
          );
        }
        const previous = visited.get(neighbor);
        if (!previous || depth < previous.depth || score > previous.score) {
          visited.set(neighbor, { depth, score });
          if (edge.kind !== "similar" && depth < 2) {
            frontier.push({ nodeId: neighbor, depth, score, arrivedViaSimilar: false });
          }
        }
      }
      if (truncated) {
        break;
      }
    }
    const hybridSegmentIds = new Set(
      hybridHits.flatMap((hit) => {
        const reference = verifyKnowledgeCitationReference(hit.citationId, params.databaseOptions);
        return reference ? [reference.segmentId] : [];
      }),
    );
    const expandedRows: Array<SearchRow & { graphScore: number }> = [];
    const chunkQuery = db.prepare(
      `SELECT segment_id, source_id, source_version_id, source_version, source_title,
              locator_json, original_text, 0 AS rank FROM chunks WHERE segment_id = ?`,
    );
    for (const [segmentId, graphScore] of [...evidenceScores.entries()].toSorted(
      (left, right) => right[1] - left[1],
    )) {
      if (hybridSegmentIds.has(segmentId)) {
        continue;
      }
      const row = chunkQuery.get(segmentId) as SearchRow | undefined;
      if (row) {
        expandedRows.push({ ...row, graphScore });
      }
      if (expandedRows.length >= 40) {
        truncated = true;
        break;
      }
    }
    const expandedHits: KnowledgeSearchHit[] = expandedRows.map((row) => {
      const citationId = issueEnterpriseOpaqueReference(
        "knowledge-citation",
        {
          z: params.zoneId,
          p: params.publicationId,
          g: params.generationId,
          s: row.source_id,
          v: row.source_version_id,
          n: row.source_version,
          x: row.segment_id,
        },
        params.databaseOptions,
      );
      const citation: KnowledgeCitation = {
        citationId,
        zoneLabel: params.zoneLabel,
        sourceTitle: row.source_title,
        sourceVersion: row.source_version,
        locator: JSON.parse(row.locator_json) as KnowledgeLocator,
        publishedAt: new Date(params.publishedAt).toISOString(),
      };
      return {
        citationId,
        citation,
        excerpt: row.original_text.slice(0, 800),
        score: row.graphScore,
      };
    });
    const combined = new Map<string, KnowledgeSearchHit>();
    for (const hit of [...hybridHits, ...(params.graphExpansion === "on" ? expandedHits : [])]) {
      const existing = combined.get(hit.citationId);
      if (!existing || hit.score > existing.score) {
        combined.set(hit.citationId, hit);
      }
    }
    return {
      hits: [...combined.values()]
        .toSorted((left, right) => right.score - left.score)
        .slice(0, params.maxResults),
      graph: {
        seedCount: seeds.length,
        expandedEvidenceCount: expandedHits.length,
        maxDepth,
        truncated,
        availability: timedOut ? "timeout" : "available",
      },
    };
  } catch {
    return {
      hits: hybridHits,
      graph: { ...disabled, availability: "not_built" },
    };
  } finally {
    db.close();
  }
}

export type VerifiedKnowledgeCitationReference = {
  zoneId: string;
  publicationId: string;
  generationId: string;
  sourceId: string;
  sourceVersionId: string;
  sourceVersion: number;
  segmentId: string;
};

export function verifyKnowledgeCitationReference(
  citationId: string,
  databaseOptions: OpenClawStateDatabaseOptions = {},
): VerifiedKnowledgeCitationReference | undefined {
  const payload = verifyEnterpriseOpaqueReference(
    "knowledge-citation",
    citationId,
    databaseOptions,
  );
  if (
    !payload ||
    !["z", "p", "g", "s", "v", "x"].every((key) => typeof payload[key] === "string") ||
    typeof payload.n !== "number"
  ) {
    return undefined;
  }
  return {
    zoneId: String(payload.z),
    publicationId: String(payload.p),
    generationId: String(payload.g),
    sourceId: String(payload.s),
    sourceVersionId: String(payload.v),
    sourceVersion: payload.n,
    segmentId: String(payload.x),
  };
}

export function getKnowledgeGenerationEvidence(params: {
  reference: VerifiedKnowledgeCitationReference;
  env?: NodeJS.ProcessEnv;
}): { text: string; locator: KnowledgeLocator; sourceTitle: string } | undefined {
  const db = new DatabaseSync(
    resolveKnowledgeGenerationDatabasePath(
      params.reference.zoneId,
      params.reference.generationId,
      params.env,
    ),
    { readOnly: true },
  );
  try {
    const row = db
      .prepare(
        `SELECT original_text, locator_json, source_title FROM chunks
       WHERE segment_id = ? AND source_id = ? AND source_version_id = ? LIMIT 1`,
      )
      .get(
        params.reference.segmentId,
        params.reference.sourceId,
        params.reference.sourceVersionId,
      ) as { original_text: string; locator_json: string; source_title: string } | undefined;
    return row
      ? {
          text: row.original_text.slice(0, 12_000),
          locator: JSON.parse(row.locator_json) as KnowledgeLocator,
          sourceTitle: row.source_title,
        }
      : undefined;
  } finally {
    db.close();
  }
}
