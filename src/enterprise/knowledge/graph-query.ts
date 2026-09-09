import { DatabaseSync } from "node:sqlite";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { issueEnterpriseOpaqueReference, verifyEnterpriseOpaqueReference } from "../auth/jwt.js";
import { resolveKnowledgeGenerationDatabasePath } from "./artifact-store.js";
import { ensureKnowledgeGraphGenerationGraph } from "./knowledge-graph-backfill.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";
import type {
  KnowledgeGraphDiff,
  KnowledgeGraphEdgeKind,
  KnowledgeGraphEdgeSummary,
  KnowledgeGraphNeighborhood,
  KnowledgeGraphNodeDetail,
  KnowledgeGraphNodeKind,
  KnowledgeGraphNodeSummary,
  KnowledgeGraphOrigin,
  KnowledgeGraphReviewStatus,
  KnowledgeGraphSnapshot,
  KnowledgeGraphSummary,
  KnowledgeLocator,
} from "./knowledge-types.js";

type Row = Record<string, unknown>;

export type KnowledgeGraphSnapshotContext = {
  zoneId: string;
  zoneLabel: string;
  generationId: string;
  publicationId: string | null;
  snapshot: KnowledgeGraphSnapshot;
  publishedAt: number;
  env?: NodeJS.ProcessEnv;
  databaseOptions?: OpenClawStateDatabaseOptions;
};

type GraphNodeReference = { zoneId: string; generationId: string; nodeId: string };
type GraphEdgeReference = { zoneId: string; generationId: string; edgeId: string };

function graphUnavailable(): never {
  throw new EnterpriseKnowledgeError(
    "GRAPH_NOT_BUILT",
    422,
    "This generation does not contain a knowledge graph. Build a new candidate.",
  );
}

export function openKnowledgeGraphDatabase(context: KnowledgeGraphSnapshotContext): DatabaseSync {
  const generationPath = resolveKnowledgeGenerationDatabasePath(
    context.zoneId,
    context.generationId,
    context.env,
  );
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(generationPath, { readOnly: true });
  } catch {
    return graphUnavailable();
  }
  if (
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'graph_nodes'").get()
  ) {
    return db;
  }
  db.close();
  const graphPath = ensureKnowledgeGraphGenerationGraph({
    zoneId: context.zoneId,
    generationId: context.generationId,
    options: context.databaseOptions,
    env: context.env,
  });
  db = new DatabaseSync(graphPath, { readOnly: true });
  try {
    // Queries join graph evidence to the unchanged generation, not a newer source.
    db.prepare("ATTACH DATABASE ? AS source_index").run(generationPath);
    db.exec("CREATE TEMP VIEW chunks AS SELECT * FROM source_index.chunks");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function issueNodeRef(context: KnowledgeGraphSnapshotContext, nodeId: string): string {
  return issueEnterpriseOpaqueReference(
    "knowledge-graph-node",
    { z: context.zoneId, g: context.generationId, n: nodeId },
    context.databaseOptions,
  );
}

function issueEdgeRef(context: KnowledgeGraphSnapshotContext, edgeId: string): string {
  return issueEnterpriseOpaqueReference(
    "knowledge-graph-edge",
    { z: context.zoneId, g: context.generationId, e: edgeId },
    context.databaseOptions,
  );
}

export function verifyKnowledgeGraphNodeReference(
  reference: string,
  options: OpenClawStateDatabaseOptions = {},
): GraphNodeReference | undefined {
  const payload = verifyEnterpriseOpaqueReference("knowledge-graph-node", reference, options);
  if (
    !payload ||
    typeof payload.z !== "string" ||
    typeof payload.g !== "string" ||
    typeof payload.n !== "string"
  ) {
    return undefined;
  }
  return { zoneId: payload.z, generationId: payload.g, nodeId: payload.n };
}

export function verifyKnowledgeGraphEdgeReference(
  reference: string,
  options: OpenClawStateDatabaseOptions = {},
): GraphEdgeReference | undefined {
  const payload = verifyEnterpriseOpaqueReference("knowledge-graph-edge", reference, options);
  if (
    !payload ||
    typeof payload.z !== "string" ||
    typeof payload.g !== "string" ||
    typeof payload.e !== "string"
  ) {
    return undefined;
  }
  return { zoneId: payload.z, generationId: payload.g, edgeId: payload.e };
}

function metadata(db: DatabaseSync): Record<string, string> {
  return Object.fromEntries(
    (
      db.prepare("SELECT key, value FROM metadata").all() as Array<{ key: string; value: string }>
    ).map((row) => [row.key, row.value]),
  );
}

function stats(db: DatabaseSync): Record<string, string> {
  return Object.fromEntries(
    (
      db.prepare("SELECT key, value FROM graph_stats").all() as Array<{
        key: string;
        value: string;
      }>
    ).map((row) => [row.key, row.value]),
  );
}

function buildSummary(
  context: KnowledgeGraphSnapshotContext,
  db: DatabaseSync,
  truncated = false,
): KnowledgeGraphSummary {
  const meta = metadata(db);
  const values = stats(db);
  const enrichmentIdentity = values.enrichmentIdentity
    ? (JSON.parse(values.enrichmentIdentity) as KnowledgeGraphSummary["enrichmentIdentity"])
    : null;
  return {
    snapshot: context.snapshot,
    generationId: context.generationId,
    publicationId: context.publicationId,
    schemaVersion: Number(values.schemaVersion ?? meta.schemaVersion ?? 1),
    status:
      meta.graphStatus === "degraded" ? "degraded" : values.schemaVersion ? "ready" : "not_built",
    nodeCount: Number(values.nodeCount ?? 0),
    edgeCount: Number(values.edgeCount ?? 0),
    proposedCount: Number(values.proposedCount ?? 0),
    orphanCount: Number(values.orphanCount ?? 0),
    componentCount: Number(values.componentCount ?? 0),
    truncated,
    builtAt: Number(meta.builtAt ?? context.publishedAt),
    enrichmentIdentity,
  };
}

export function readKnowledgeGraphSummary(
  context: KnowledgeGraphSnapshotContext,
): KnowledgeGraphSummary {
  const db = openKnowledgeGraphDatabase(context);
  try {
    return buildSummary(context, db);
  } finally {
    db.close();
  }
}

export function readKnowledgeGraphAnalysisSummary(context: KnowledgeGraphSnapshotContext): {
  generationId: string;
  snapshotRevision: number;
  artifactSchemaVersion: 1 | 2 | 3;
  aiAnalysisStatus: "off" | "ready" | "degraded";
  nodeCounts: Record<string, number>;
  edgeCounts: Record<string, number>;
  originCounts: Record<string, number>;
  containsRatio: number;
  maxSourceDegree: number;
  diagnosis: "relational" | "mostly_structural" | "ai_degraded";
  degradationReasons: string[];
} {
  const db = openKnowledgeGraphDatabase(context);
  try {
    const meta = metadata(db);
    const values = stats(db);
    const parseCounts = (value?: string): Record<string, number> => {
      if (!value) {
        return {};
      }
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).map(([key, count]) => [key, Number(count) || 0]),
      );
    };
    const containsRatio = Number(values.containsRatio ?? 0);
    const hasAi = Number(parseCounts(values.edgeOriginCounts).ai ?? 0) > 0;
    const graphDegraded = meta.graphStatus === "degraded";
    return {
      generationId: context.generationId,
      snapshotRevision: Number(meta.buildRevision ?? meta.sourceSetRevision ?? 0),
      artifactSchemaVersion: Math.max(1, Math.min(3, Number(meta.artifactSchemaVersion ?? 1))) as
        | 1
        | 2
        | 3,
      aiAnalysisStatus: graphDegraded ? "degraded" : hasAi ? "ready" : "off",
      nodeCounts: parseCounts(values.nodeKindCounts),
      edgeCounts: parseCounts(values.edgeKindCounts),
      originCounts: parseCounts(values.edgeOriginCounts),
      containsRatio,
      maxSourceDegree: Number(values.maxSourceDegree ?? 0),
      diagnosis: graphDegraded
        ? "ai_degraded"
        : containsRatio > 0.9
          ? "mostly_structural"
          : "relational",
      degradationReasons: graphDegraded
        ? [hasAi ? "ai_batch_failed" : "ai_enrichment_not_available"]
        : [],
    };
  } finally {
    db.close();
  }
}

function aliasesForNodes(db: DatabaseSync, nodeIds: string[]): Map<string, string[]> {
  if (nodeIds.length === 0) {
    return new Map();
  }
  const rows: Array<{ node_id: string; alias: string }> = [];
  const query = db.prepare(
    "SELECT node_id, alias FROM graph_node_aliases WHERE node_id = ? ORDER BY alias",
  );
  for (const nodeId of nodeIds) {
    rows.push(...(query.all(nodeId) as Array<{ node_id: string; alias: string }>));
  }
  const result = new Map<string, string[]>();
  for (const row of rows) {
    const values = result.get(row.node_id) ?? [];
    values.push(row.alias);
    result.set(row.node_id, values);
  }
  return result;
}

function nodeRowsToSummaries(
  context: KnowledgeGraphSnapshotContext,
  db: DatabaseSync,
  rows: Row[],
): KnowledgeGraphNodeSummary[] {
  const aliases = aliasesForNodes(
    db,
    rows.map((row) => String(row.id)),
  );
  return rows.map((row) => ({
    nodeRef: issueNodeRef(context, String(row.id)),
    kind: String(row.kind) as KnowledgeGraphNodeKind,
    label: String(row.label),
    aliases: aliases.get(String(row.id)) ?? [],
    confidence: Number(row.confidence),
    origin: String(row.origin) as KnowledgeGraphOrigin,
    degree: Number(row.degree),
    sourceTitle: String(row.source_title),
    locator: JSON.parse(String(row.locator_json)) as KnowledgeLocator,
  }));
}

function edgeRowsToSummaries(
  context: KnowledgeGraphSnapshotContext,
  rows: Row[],
): KnowledgeGraphEdgeSummary[] {
  return rows.map((row) => ({
    edgeRef: issueEdgeRef(context, String(row.id)),
    sourceNodeRef: issueNodeRef(context, String(row.source_node_id)),
    targetNodeRef: issueNodeRef(context, String(row.target_node_id)),
    kind: String(row.kind) as KnowledgeGraphEdgeKind,
    origin: String(row.origin) as KnowledgeGraphOrigin,
    reviewStatus: String(row.review_status) as KnowledgeGraphReviewStatus,
    confidence: Number(row.confidence),
  }));
}

function resolveNodeId(context: KnowledgeGraphSnapshotContext, nodeRef: string): string {
  const reference = verifyKnowledgeGraphNodeReference(nodeRef, context.databaseOptions);
  if (
    !reference ||
    reference.zoneId !== context.zoneId ||
    reference.generationId !== context.generationId
  ) {
    throw new EnterpriseKnowledgeError("GRAPH_NODE_NOT_FOUND", 404, "Graph node not found.");
  }
  return reference.nodeId;
}

export function searchKnowledgeGraphNodes(
  context: KnowledgeGraphSnapshotContext,
  input: { query: string; limit?: number; kinds?: KnowledgeGraphNodeKind[] },
): KnowledgeGraphNodeSummary[] {
  const limit = Math.max(1, Math.min(input.limit ?? 100, 200));
  const db = openKnowledgeGraphDatabase(context);
  try {
    const terms = input.query
      .normalize("NFC")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}_-]+/gu)
      ?.slice(0, 16)
      .map((term) => `"${term.replaceAll('"', '""')}"`)
      .join(" OR ");
    let rows: Row[];
    if (terms) {
      rows = db
        .prepare(
          `SELECT n.*, c.source_title FROM graph_nodes_fts f
           JOIN graph_nodes n ON n.rowid = f.rowid
           JOIN chunks c ON c.segment_id = n.primary_segment_id
           WHERE graph_nodes_fts MATCH ? ORDER BY bm25(graph_nodes_fts) ASC, n.degree DESC LIMIT ?`,
        )
        .all(terms, limit * 2) as Row[];
    } else {
      rows = db
        .prepare(
          `SELECT n.*, c.source_title FROM graph_nodes n
           JOIN chunks c ON c.segment_id = n.primary_segment_id
           ORDER BY n.degree DESC, n.label ASC LIMIT ?`,
        )
        .all(limit * 2) as Row[];
    }
    if (input.kinds?.length) {
      const allowed = new Set(input.kinds);
      rows = rows.filter((row) => allowed.has(String(row.kind) as KnowledgeGraphNodeKind));
    }
    return nodeRowsToSummaries(context, db, rows.slice(0, limit));
  } finally {
    db.close();
  }
}

export function readKnowledgeGraphNeighborhood(
  context: KnowledgeGraphSnapshotContext,
  input: {
    nodeRef?: string;
    depth?: number;
    nodeLimit?: number;
    edgeLimit?: number;
    nodeKinds?: KnowledgeGraphNodeKind[];
    edgeKinds?: KnowledgeGraphEdgeKind[];
    origins?: KnowledgeGraphOrigin[];
    reviewStatuses?: KnowledgeGraphReviewStatus[];
    minConfidence?: number;
  } = {},
): KnowledgeGraphNeighborhood {
  const depth = input.depth === 2 ? 2 : 1;
  const nodeLimit = Math.max(1, Math.min(input.nodeLimit ?? 100, 200));
  const edgeLimit = Math.max(1, Math.min(input.edgeLimit ?? 300, 600));
  const db = openKnowledgeGraphDatabase(context);
  try {
    const rootId = input.nodeRef ? resolveNodeId(context, input.nodeRef) : undefined;
    const visited = new Set<string>();
    let frontier: string[];
    if (rootId) {
      const exists = db.prepare("SELECT 1 FROM graph_nodes WHERE id = ?").get(rootId);
      if (!exists) {
        throw new EnterpriseKnowledgeError("GRAPH_NODE_NOT_FOUND", 404, "Graph node not found.");
      }
      visited.add(rootId);
      frontier = [rootId];
    } else {
      frontier = (
        db
          .prepare("SELECT id FROM graph_nodes ORDER BY degree DESC, id ASC LIMIT ?")
          .all(nodeLimit) as Array<{
          id: string;
        }>
      ).map((row) => row.id);
      frontier.forEach((id) => visited.add(id));
    }
    const edgeRows = new Map<string, Row>();
    const edgeQuery = db.prepare(
      `SELECT * FROM graph_edges WHERE (source_node_id = ? OR target_node_id = ?)
       ORDER BY confidence DESC, id ASC LIMIT 50`,
    );
    for (let level = 0; level < depth && frontier.length > 0; level += 1) {
      const next = new Set<string>();
      for (const nodeId of frontier) {
        for (const row of edgeQuery.all(nodeId, nodeId) as Row[]) {
          const reviewStatus = String(row.review_status) as KnowledgeGraphReviewStatus;
          if (context.snapshot === "active" && reviewStatus !== "accepted") {
            continue;
          }
          if (input.reviewStatuses?.length && !input.reviewStatuses.includes(reviewStatus)) {
            continue;
          }
          if (
            input.edgeKinds?.length &&
            !input.edgeKinds.includes(String(row.kind) as KnowledgeGraphEdgeKind)
          ) {
            continue;
          }
          if (
            input.origins?.length &&
            !input.origins.includes(String(row.origin) as KnowledgeGraphOrigin)
          ) {
            continue;
          }
          if (Number(row.confidence) < Math.max(0, Math.min(1, input.minConfidence ?? 0))) {
            continue;
          }
          edgeRows.set(String(row.id), row);
          const neighbor =
            String(row.source_node_id) === nodeId
              ? String(row.target_node_id)
              : String(row.source_node_id);
          if (!visited.has(neighbor) && visited.size < nodeLimit) {
            visited.add(neighbor);
            next.add(neighbor);
          }
          if (edgeRows.size >= edgeLimit) {
            break;
          }
        }
        if (edgeRows.size >= edgeLimit) {
          break;
        }
      }
      frontier = [...next];
    }
    let nodeRows: Row[] = [];
    const nodeQuery = db.prepare(
      `SELECT n.*, c.source_title FROM graph_nodes n
       JOIN chunks c ON c.segment_id = n.primary_segment_id WHERE n.id = ?`,
    );
    for (const nodeId of visited) {
      const row = nodeQuery.get(nodeId) as Row | undefined;
      if (row) {
        nodeRows.push(row);
      }
    }
    if (input.nodeKinds?.length) {
      nodeRows = nodeRows.filter((row) =>
        input.nodeKinds!.includes(String(row.kind) as KnowledgeGraphNodeKind),
      );
    }
    const visibleNodeIds = new Set(nodeRows.map((row) => String(row.id)));
    const visibleEdges = [...edgeRows.values()]
      .filter(
        (row) =>
          visibleNodeIds.has(String(row.source_node_id)) &&
          visibleNodeIds.has(String(row.target_node_id)),
      )
      .slice(0, edgeLimit);
    const summary = buildSummary(
      context,
      db,
      visited.size >= nodeLimit || edgeRows.size >= edgeLimit,
    );
    return {
      summary,
      nodes: nodeRowsToSummaries(context, db, nodeRows.slice(0, nodeLimit)),
      edges: edgeRowsToSummaries(context, visibleEdges),
      depth,
      truncated: summary.truncated,
    };
  } finally {
    db.close();
  }
}

export function readKnowledgeGraphNodeDetail(
  context: KnowledgeGraphSnapshotContext,
  nodeRef: string,
): KnowledgeGraphNodeDetail {
  const nodeId = resolveNodeId(context, nodeRef);
  const db = openKnowledgeGraphDatabase(context);
  try {
    const row = db
      .prepare(
        `SELECT n.*, c.source_title FROM graph_nodes n
         JOIN chunks c ON c.segment_id = n.primary_segment_id WHERE n.id = ?`,
      )
      .get(nodeId) as Row | undefined;
    if (!row) {
      throw new EnterpriseKnowledgeError("GRAPH_NODE_NOT_FOUND", 404, "Graph node not found.");
    }
    const node = nodeRowsToSummaries(context, db, [row])[0]!;
    const statusClause = context.snapshot === "active" ? "AND e.review_status = 'accepted'" : "";
    const incomingRows = db
      .prepare(
        `SELECT e.* FROM graph_edges e WHERE e.target_node_id = ? ${statusClause} ORDER BY e.confidence DESC LIMIT 100`,
      )
      .all(nodeId) as Row[];
    const outgoingRows = db
      .prepare(
        `SELECT e.* FROM graph_edges e WHERE e.source_node_id = ? ${statusClause} ORDER BY e.confidence DESC LIMIT 100`,
      )
      .all(nodeId) as Row[];
    const evidenceRows = db
      .prepare(
        `SELECT c.* FROM graph_node_evidence ne JOIN chunks c ON c.segment_id = ne.segment_id
         WHERE ne.node_id = ? ORDER BY c.ordinal ASC LIMIT 20`,
      )
      .all(nodeId) as Row[];
    return {
      ...node,
      incoming: edgeRowsToSummaries(context, incomingRows),
      outgoing: edgeRowsToSummaries(context, outgoingRows),
      evidence: evidenceRows.map((evidence) => ({
        citationId: issueEnterpriseOpaqueReference(
          "knowledge-citation",
          {
            z: context.zoneId,
            p: context.publicationId ?? `candidate:${context.generationId}`,
            g: context.generationId,
            s: String(evidence.source_id),
            v: String(evidence.source_version_id),
            n: Number(evidence.source_version),
            x: String(evidence.segment_id),
          },
          context.databaseOptions,
        ),
        sourceVersion: Number(evidence.source_version),
        sourceTitle: String(evidence.source_title),
        locator: JSON.parse(String(evidence.locator_json)) as KnowledgeLocator,
        excerpt: String(evidence.original_text).slice(0, 800),
      })),
    };
  } finally {
    db.close();
  }
}

export function resolveKnowledgeGraphEdgeForReview(
  context: KnowledgeGraphSnapshotContext,
  edgeRef: string,
): { fingerprint: string; evidenceHash: string; edgeKind: KnowledgeGraphEdgeKind } {
  const reference = verifyKnowledgeGraphEdgeReference(edgeRef, context.databaseOptions);
  if (
    !reference ||
    reference.zoneId !== context.zoneId ||
    reference.generationId !== context.generationId
  ) {
    throw new EnterpriseKnowledgeError("GRAPH_EDGE_NOT_FOUND", 404, "Graph edge not found.");
  }
  const db = openKnowledgeGraphDatabase(context);
  try {
    const row = db
      .prepare("SELECT fingerprint, evidence_hash, kind FROM graph_edges WHERE id = ?")
      .get(reference.edgeId) as Row | undefined;
    if (!row) {
      throw new EnterpriseKnowledgeError("GRAPH_EDGE_NOT_FOUND", 404, "Graph edge not found.");
    }
    return {
      fingerprint: String(row.fingerprint),
      evidenceHash: String(row.evidence_hash),
      edgeKind: String(row.kind) as KnowledgeGraphEdgeKind,
    };
  } finally {
    db.close();
  }
}

export function resolveKnowledgeGraphNodeCanonicalKey(
  context: KnowledgeGraphSnapshotContext,
  nodeRef: string,
): string {
  const nodeId = resolveNodeId(context, nodeRef);
  const db = openKnowledgeGraphDatabase(context);
  try {
    const row = db.prepare("SELECT canonical_key FROM graph_nodes WHERE id = ?").get(nodeId) as
      | { canonical_key: string }
      | undefined;
    if (!row) {
      throw new EnterpriseKnowledgeError("GRAPH_NODE_NOT_FOUND", 404, "Graph node not found.");
    }
    return row.canonical_key;
  } finally {
    db.close();
  }
}

export function compareKnowledgeGraphs(
  active: KnowledgeGraphSnapshotContext,
  candidate: KnowledgeGraphSnapshotContext,
  limits: { nodeLimit?: number; edgeLimit?: number } = {},
): KnowledgeGraphDiff {
  const nodeLimit = Math.max(1, Math.min(limits.nodeLimit ?? 200, 200));
  const edgeLimit = Math.max(1, Math.min(limits.edgeLimit ?? 600, 600));
  const activeDb = openKnowledgeGraphDatabase(active);
  const candidateDb = openKnowledgeGraphDatabase(candidate);
  try {
    const activeNodes = activeDb
      .prepare("SELECT canonical_key, label, kind FROM graph_nodes")
      .all() as Row[];
    const candidateNodes = candidateDb
      .prepare("SELECT canonical_key, label, kind FROM graph_nodes")
      .all() as Row[];
    const activeNodeMap = new Map(activeNodes.map((row) => [String(row.canonical_key), row]));
    const candidateNodeChanges = new Map<string, "added" | "changed">();
    let added = 0;
    let removed = 0;
    let changed = 0;
    for (const row of candidateNodes) {
      const previous = activeNodeMap.get(String(row.canonical_key));
      if (!previous) {
        added += 1;
        candidateNodeChanges.set(String(row.canonical_key), "added");
      } else if (previous.label !== row.label || previous.kind !== row.kind) {
        changed += 1;
        candidateNodeChanges.set(String(row.canonical_key), "changed");
      }
      activeNodeMap.delete(String(row.canonical_key));
    }
    removed = activeNodeMap.size;
    const candidateNodeRows: Row[] = [];
    const candidateNodeQuery = candidateDb.prepare(
      `SELECT n.*, c.source_title FROM graph_nodes n JOIN chunks c ON c.segment_id = n.primary_segment_id
       WHERE n.canonical_key = ?`,
    );
    for (const [key, nodeChange] of candidateNodeChanges) {
      const row = candidateNodeQuery.get(key) as Row | undefined;
      if (row) {
        candidateNodeRows.push({ ...row, changed: nodeChange });
      }
      if (candidateNodeRows.length >= nodeLimit) {
        break;
      }
    }
    const activeNodeRows: Row[] = [];
    const activeNodeQuery = activeDb.prepare(
      `SELECT n.*, c.source_title FROM graph_nodes n JOIN chunks c ON c.segment_id = n.primary_segment_id
       WHERE n.canonical_key = ?`,
    );
    for (const key of activeNodeMap.keys()) {
      if (candidateNodeRows.length + activeNodeRows.length >= nodeLimit) {
        break;
      }
      const row = activeNodeQuery.get(key) as Row | undefined;
      if (row) {
        activeNodeRows.push({ ...row, changed: "removed" });
      }
    }
    const edgeSql = `SELECT e.*, s.canonical_key AS source_key, t.canonical_key AS target_key
      FROM graph_edges e JOIN graph_nodes s ON s.id = e.source_node_id
      JOIN graph_nodes t ON t.id = e.target_node_id ORDER BY e.id`;
    const activeEdges = activeDb.prepare(edgeSql).all() as Row[];
    const candidateEdges = candidateDb.prepare(edgeSql).all() as Row[];
    const activeFingerprints = new Set(activeEdges.map((row) => String(row.fingerprint)));
    const candidateFingerprints = new Set(candidateEdges.map((row) => String(row.fingerprint)));
    const structuralKey = (row: Row) => `${String(row.source_key)}\0${String(row.target_key)}`;
    const activeStructural = new Set(activeEdges.map(structuralKey));
    const candidateStructural = new Set(candidateEdges.map(structuralKey));
    const changedCandidateEdges = candidateEdges
      .filter((row) => !activeFingerprints.has(String(row.fingerprint)))
      .slice(0, edgeLimit);
    const candidateEdgeSummaries = edgeRowsToSummaries(candidate, changedCandidateEdges).map(
      (edge, index) => ({
        ...edge,
        changed: activeStructural.has(structuralKey(changedCandidateEdges[index]!))
          ? ("changed" as const)
          : ("added" as const),
      }),
    );
    const removedActiveEdges = activeEdges
      .filter(
        (row) =>
          !candidateFingerprints.has(String(row.fingerprint)) &&
          !candidateStructural.has(structuralKey(row)),
      )
      .slice(0, Math.max(0, edgeLimit - candidateEdgeSummaries.length));
    const removedEdgeSummaries = edgeRowsToSummaries(active, removedActiveEdges).map((edge) => ({
      ...edge,
      changed: "removed" as const,
    }));
    const candidateNodeSummaries = nodeRowsToSummaries(
      candidate,
      candidateDb,
      candidateNodeRows,
    ).map((node, index) => ({
      ...node,
      changed: String(candidateNodeRows[index]!.changed) as "added" | "changed",
    }));
    const activeNodeSummaries = nodeRowsToSummaries(active, activeDb, activeNodeRows).map(
      (node) => ({ ...node, changed: "removed" as const }),
    );
    return {
      activeGenerationId: active.generationId,
      candidateGenerationId: candidate.generationId,
      nodes: [...candidateNodeSummaries, ...activeNodeSummaries],
      edges: [...candidateEdgeSummaries, ...removedEdgeSummaries],
      counts: { added, removed, changed },
      truncated:
        candidateNodeChanges.size + activeNodeMap.size > nodeLimit ||
        candidateEdgeSummaries.length + removedEdgeSummaries.length >= edgeLimit,
    };
  } finally {
    activeDb.close();
    candidateDb.close();
  }
}
