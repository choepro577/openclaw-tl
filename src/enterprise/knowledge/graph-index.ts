import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  normalizeKnowledgeAliases,
  normalizeKnowledgeCanonicalKey,
  type KnowledgeGraphEdgeKind,
  type KnowledgeGraphNodeKind,
  type KnowledgeGraphOrigin,
  type KnowledgeGraphReviewStatus,
} from "@openclaw/knowledge-graph-core";
import type {
  KnowledgeGraphManualEdge,
  KnowledgeGraphReviewOverlay,
} from "./knowledge-graph-control-store.js";
import type {
  KnowledgeGraphSettings,
  KnowledgeGraphEnrichmentIdentity,
  KnowledgeLocator,
  NormalizedKnowledgeArtifact,
} from "./knowledge-types.js";

export const KNOWLEDGE_GRAPH_INDEX_SCHEMA_VERSION = 2;

const GRAPH_INDEX_SCHEMA = `
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('source', 'section', 'entity', 'concept', 'claim')),
  canonical_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  confidence REAL NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('deterministic', 'semantic', 'ai', 'manual')),
  source_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  primary_segment_id TEXT NOT NULL,
  locator_json TEXT NOT NULL,
  degree INTEGER NOT NULL DEFAULT 0,
  component_id INTEGER
) STRICT;
CREATE INDEX idx_graph_nodes_kind ON graph_nodes(kind, degree DESC, canonical_key);
CREATE INDEX idx_graph_nodes_source ON graph_nodes(source_id, source_version_id, primary_segment_id);
CREATE INDEX idx_graph_nodes_component ON graph_nodes(component_id, degree DESC, id);

CREATE TABLE graph_node_aliases (
  node_id TEXT NOT NULL,
  alias_key TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (node_id, alias_key),
  FOREIGN KEY (node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX idx_graph_alias_key ON graph_node_aliases(alias_key, node_id);

CREATE TABLE graph_node_evidence (
  node_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  locator_json TEXT NOT NULL,
  PRIMARY KEY (node_id, segment_id),
  FOREIGN KEY (node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('contains', 'references', 'mentions', 'similar', 'supports', 'contradicts', 'supersedes', 'depends_on', 'applies_to', 'custom')),
  origin TEXT NOT NULL CHECK (origin IN ('deterministic', 'semantic', 'ai', 'manual')),
  review_status TEXT NOT NULL CHECK (review_status IN ('accepted', 'proposed', 'rejected')),
  confidence REAL NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  evidence_hash TEXT NOT NULL,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  CHECK (source_node_id != target_node_id)
) STRICT;
CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id, review_status, kind, confidence DESC);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id, review_status, kind, confidence DESC);
CREATE INDEX idx_graph_edges_review ON graph_edges(review_status, origin, confidence DESC, id);
CREATE INDEX idx_graph_edges_kind ON graph_edges(kind, review_status, confidence DESC, id);

CREATE TABLE graph_edge_evidence (
  edge_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  locator_json TEXT NOT NULL,
  PRIMARY KEY (edge_id, segment_id),
  FOREIGN KEY (edge_id) REFERENCES graph_edges(id) ON DELETE CASCADE
) STRICT;

CREATE VIRTUAL TABLE graph_nodes_fts USING fts5(
  label,
  aliases,
  canonical_key,
  content='',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TABLE graph_stats (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
`;

type DraftNode = {
  id: string;
  kind: KnowledgeGraphNodeKind;
  canonicalKey: string;
  label: string;
  aliases: string[];
  confidence: number;
  origin: KnowledgeGraphOrigin;
  sourceId: string;
  sourceVersionId: string;
  segmentId: string;
  locator: KnowledgeLocator;
  structuralParentKey?: string;
  structuralOrdinal?: number;
  textLength?: number;
};

type DraftEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: KnowledgeGraphEdgeKind;
  origin: KnowledgeGraphOrigin;
  reviewStatus: KnowledgeGraphReviewStatus;
  confidence: number;
  fingerprint: string;
  evidenceHash: string;
  evidence: Array<{ segmentId: string; sourceVersionId: string; locator: KnowledgeLocator }>;
};

export type KnowledgeGraphEnrichmentRelation = {
  sourceCanonicalKey: string;
  targetCanonicalKey: string;
  sourceLabel?: string;
  targetLabel?: string;
  sourceKind?: "entity" | "concept" | "claim";
  targetKind?: "entity" | "concept" | "claim";
  kind: KnowledgeGraphEdgeKind;
  confidence: number;
  evidenceSegmentId: string;
  evidenceSourceVersionId: string;
  evidenceLocator: KnowledgeLocator;
};

export type KnowledgeGraphEnrichmentNode = {
  canonicalKey: string;
  label: string;
  kind: "entity" | "concept" | "claim";
  aliases: string[];
  confidence: number;
  evidenceSegmentId: string;
  evidenceSourceVersionId: string;
  evidenceLocator: KnowledgeLocator;
};

function digest(...values: string[]): string {
  return createHash("sha256").update(values.join("\0")).digest("hex");
}

function graphId(prefix: string, ...values: string[]): string {
  return `${prefix}_${digest(...values).slice(0, 32)}`;
}

function nodeCanonical(kind: KnowledgeGraphNodeKind, value: string): string {
  return `${kind}:${normalizeKnowledgeCanonicalKey(value)}`;
}

function createNode(params: Omit<DraftNode, "id">): DraftNode {
  return { ...params, id: graphId("gn", params.kind, params.canonicalKey) };
}

function evidenceHash(
  evidence: Array<{ segmentId: string; sourceVersionId: string; locator: KnowledgeLocator }>,
): string {
  return digest(
    ...evidence
      .map((item) => `${item.sourceVersionId}:${item.segmentId}:${JSON.stringify(item.locator)}`)
      .toSorted(),
  );
}

function createEdge(params: Omit<DraftEdge, "id" | "fingerprint" | "evidenceHash">): DraftEdge {
  const evidenceDigest = evidenceHash(params.evidence);
  const fingerprint = digest(
    params.sourceNodeId,
    params.targetNodeId,
    params.kind,
    params.origin,
    evidenceDigest,
  );
  return {
    ...params,
    id: graphId("ge", fingerprint),
    fingerprint,
    evidenceHash: evidenceDigest,
  };
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

function semanticEdges(params: {
  sectionNodesBySegment: Map<string, DraftNode>;
  vectors?: Map<string, number[]>;
}): DraftEdge[] {
  if (!params.vectors) {
    return [];
  }
  const items: Array<{ segmentId: string; vector: number[]; node: DraftNode }> = [];
  for (const [segmentId, vector] of params.vectors) {
    const node = params.sectionNodesBySegment.get(segmentId);
    if (
      !node ||
      (node.textLength ?? node.label.length) < 32 ||
      vector.length === 0 ||
      vector.some((value) => !Number.isFinite(value))
    ) {
      continue;
    }
    items.push({ segmentId, vector, node });
  }
  const candidatePairs = new Map<string, [(typeof items)[number], (typeof items)[number]]>();
  const projections = [0, 1, 2, 5];
  for (const projection of projections) {
    const ordered = items.toSorted((left, right) => {
      const project = (vector: number[]) => {
        let total = 0;
        for (let index = projection; index < vector.length; index += 11) {
          total += vector[index]! * ((index + projection) % 2 === 0 ? 1 : -1);
        }
        return total;
      };
      return project(left.vector) - project(right.vector);
    });
    for (let index = 0; index < ordered.length; index += 1) {
      const item = ordered[index]!;
      for (
        let candidateIndex = index + 1;
        candidateIndex < Math.min(ordered.length, index + 9);
        candidateIndex += 1
      ) {
        const other = ordered[candidateIndex]!;
        if (
          item.node.sourceId === other.node.sourceId &&
          ((item.node.structuralParentKey &&
            item.node.structuralParentKey === other.node.structuralParentKey) ||
            Math.abs(
              (item.node.structuralOrdinal ?? Number.MIN_SAFE_INTEGER) -
                (other.node.structuralOrdinal ?? Number.MAX_SAFE_INTEGER),
            ) <= 1)
        ) {
          continue;
        }
        const key = [item.node.id, other.node.id].toSorted().join(":");
        candidatePairs.set(key, [item, other]);
      }
    }
  }
  const edges = new Map<string, DraftEdge>();
  const neighborCounts = new Map<string, number>();
  const rankedPairs = [...candidatePairs.values()]
    .map(([left, right]) => ({ left, right, score: cosineSimilarity(left.vector, right.vector) }))
    .filter((item) => item.score >= 0.84)
    .toSorted((left, right) => right.score - left.score);
  for (const candidate of rankedPairs) {
    if (
      (neighborCounts.get(candidate.left.node.id) ?? 0) >= 3 ||
      (neighborCounts.get(candidate.right.node.id) ?? 0) >= 3
    ) {
      continue;
    }
    const source =
      candidate.left.node.id.localeCompare(candidate.right.node.id) <= 0
        ? candidate.left.node
        : candidate.right.node;
    const target = source === candidate.left.node ? candidate.right.node : candidate.left.node;
    const edge = createEdge({
      sourceNodeId: source.id,
      targetNodeId: target.id,
      kind: "similar",
      origin: "semantic",
      reviewStatus: "accepted",
      confidence: candidate.score,
      evidence: [
        {
          segmentId: source.segmentId,
          sourceVersionId: source.sourceVersionId,
          locator: source.locator,
        },
        {
          segmentId: target.segmentId,
          sourceVersionId: target.sourceVersionId,
          locator: target.locator,
        },
      ],
    });
    edges.set(edge.fingerprint, edge);
    neighborCounts.set(source.id, (neighborCounts.get(source.id) ?? 0) + 1);
    neighborCounts.set(target.id, (neighborCounts.get(target.id) ?? 0) + 1);
  }
  return [...edges.values()];
}

function applyReviewOverlay(
  edge: DraftEdge,
  overlays: Map<string, KnowledgeGraphReviewOverlay>,
): DraftEdge {
  const overlay = overlays.get(edge.fingerprint);
  if (!overlay || overlay.evidenceHash !== edge.evidenceHash) {
    return edge;
  }
  if (!overlay.edgeKind) {
    return { ...edge, reviewStatus: overlay.reviewStatus };
  }
  return createEdge({
    ...edge,
    kind: overlay.edgeKind,
    reviewStatus: overlay.reviewStatus,
  });
}

function shouldAutoAcceptAiEdge(
  kind: KnowledgeGraphEdgeKind,
  confidence: number,
  threshold: number,
): boolean {
  return kind === "mentions" && confidence >= threshold;
}

function computeComponents(nodes: DraftNode[], edges: DraftEdge[]): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    if (edge.reviewStatus !== "accepted") {
      continue;
    }
    adjacency.get(edge.sourceNodeId)?.add(edge.targetNodeId);
    adjacency.get(edge.targetNodeId)?.add(edge.sourceNodeId);
  }
  const components = new Map<string, number>();
  let component = 0;
  for (const node of nodes) {
    if (components.has(node.id)) {
      continue;
    }
    component += 1;
    const pending = [node.id];
    components.set(node.id, component);
    while (pending.length > 0) {
      const current = pending.pop()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!components.has(neighbor)) {
          components.set(neighbor, component);
          pending.push(neighbor);
        }
      }
    }
  }
  return components;
}

export function buildKnowledgeGraphInDatabase(params: {
  db: DatabaseSync;
  artifacts: NormalizedKnowledgeArtifact[];
  vectors?: Map<string, number[]>;
  settings: KnowledgeGraphSettings;
  reviewOverlays: KnowledgeGraphReviewOverlay[];
  manualEdges: KnowledgeGraphManualEdge[];
  enrichmentRelations?: KnowledgeGraphEnrichmentRelation[];
  enrichmentNodes?: KnowledgeGraphEnrichmentNode[];
  enrichmentIdentity?: KnowledgeGraphEnrichmentIdentity;
  enrichmentDegraded?: boolean;
}): {
  status: "ready" | "degraded";
  nodeCount: number;
  edgeCount: number;
  proposedCount: number;
  orphanCount: number;
  componentCount: number;
} {
  params.db.exec(GRAPH_INDEX_SCHEMA);
  const nodes = new Map<string, DraftNode>();
  const sourceAliasLookup = new Map<string, DraftNode>();
  const sectionNodesBySegment = new Map<string, DraftNode>();
  const structuralNodesByBlock = new Map<string, DraftNode>();
  const structuralOwnerByBlock = new Map<string, DraftNode>();
  const segmentsById = new Map<
    string,
    { sourceId: string; sourceVersionId: string; locator: KnowledgeLocator }
  >();

  const addNode = (node: DraftNode): DraftNode => {
    const existing = nodes.get(node.canonicalKey);
    if (existing) {
      existing.aliases = normalizeKnowledgeAliases([...existing.aliases, ...node.aliases]);
      existing.confidence = Math.max(existing.confidence, node.confidence);
      return existing;
    }
    nodes.set(node.canonicalKey, node);
    return node;
  };

  for (const artifact of params.artifacts) {
    if (artifact.segments.length === 0) {
      continue;
    }
    const first = artifact.segments[0]!;
    const sourceNode = addNode(
      createNode({
        kind: "source",
        canonicalKey: nodeCanonical("source", artifact.sourceId),
        label: artifact.title,
        aliases: normalizeKnowledgeAliases([
          artifact.title,
          artifact.sourceId,
          ...(artifact.schemaVersion !== 1 ? artifact.graphSignals.aliases : []),
        ]),
        confidence: 1,
        origin: "deterministic",
        sourceId: artifact.sourceId,
        sourceVersionId: artifact.sourceVersionId,
        segmentId: first.id,
        locator: first.locator,
      }),
    );
    for (const alias of sourceNode.aliases) {
      sourceAliasLookup.set(normalizeKnowledgeCanonicalKey(alias), sourceNode);
    }
    sourceAliasLookup.set(normalizeKnowledgeCanonicalKey(artifact.sourceId), sourceNode);
    for (const segment of artifact.segments) {
      segmentsById.set(segment.id, {
        sourceId: artifact.sourceId,
        sourceVersionId: artifact.sourceVersionId,
        locator: segment.locator,
      });
    }
    if (artifact.schemaVersion === 3) {
      const blocksById = new Map(
        artifact.graphSignals.blocks.map((block) => [block.blockId, block]),
      );
      const visibleBlocks = artifact.graphSignals.blocks.filter(
        (block) =>
          block.kind === "heading" &&
          !block.isToc &&
          !block.isHeaderFooter &&
          block.segmentIds.length > 0,
      );
      for (const block of visibleBlocks) {
        const primarySegment = artifact.segments.find((segment) =>
          block.segmentIds.includes(segment.id),
        );
        if (!primarySegment) {
          continue;
        }
        const sectionNode = addNode(
          createNode({
            kind: "section",
            canonicalKey: nodeCanonical("section", `${artifact.sourceId}:${block.blockId}`),
            label: block.text.slice(0, 240),
            aliases: normalizeKnowledgeAliases([
              block.text,
              block.numberingLabel ?? "",
              ...block.headingPath,
            ]),
            confidence: 1,
            origin: "deterministic",
            sourceId: artifact.sourceId,
            sourceVersionId: artifact.sourceVersionId,
            segmentId: primarySegment.id,
            locator: block.locator,
            structuralParentKey: block.parentBlockId,
            structuralOrdinal: block.ordinal,
            textLength: block.text.length,
          }),
        );
        structuralNodesByBlock.set(`${artifact.sourceVersionId}:${block.blockId}`, sectionNode);
      }
      const nearestVisibleAncestor = (blockId: string): DraftNode | undefined => {
        let block = blocksById.get(blockId);
        while (block) {
          const node = structuralNodesByBlock.get(`${artifact.sourceVersionId}:${block.blockId}`);
          if (node) {
            return node;
          }
          block = block.parentBlockId ? blocksById.get(block.parentBlockId) : undefined;
        }
        return undefined;
      };
      for (const block of artifact.graphSignals.blocks) {
        const owner = nearestVisibleAncestor(block.blockId);
        if (!owner) {
          continue;
        }
        structuralOwnerByBlock.set(`${artifact.sourceVersionId}:${block.blockId}`, owner);
        for (const segmentId of block.segmentIds) {
          sectionNodesBySegment.set(segmentId, owner);
        }
      }
      continue;
    }
    for (const segment of artifact.segments) {
      const heading =
        artifact.schemaVersion === 2
          ? artifact.graphSignals.headings.find((item) => item.segmentId === segment.id)?.text
          : undefined;
      const sectionNode = addNode(
        createNode({
          kind: "section",
          canonicalKey: nodeCanonical("section", `${artifact.sourceVersionId}:${segment.id}`),
          label: heading ?? segment.text.split(/\r?\n/, 1)[0]!.slice(0, 160),
          aliases: heading ? [heading] : [],
          confidence: 1,
          origin: "deterministic",
          sourceId: artifact.sourceId,
          sourceVersionId: artifact.sourceVersionId,
          segmentId: segment.id,
          locator: segment.locator,
        }),
      );
      sectionNodesBySegment.set(segment.id, sectionNode);
    }
  }

  const edges = new Map<string, DraftEdge>();
  const addEdge = (edge: DraftEdge): void => {
    edges.set(edge.fingerprint, edge);
  };

  for (const artifact of params.artifacts) {
    const sourceNode = nodes.get(nodeCanonical("source", artifact.sourceId));
    if (!sourceNode) {
      continue;
    }
    if (artifact.schemaVersion === 3) {
      for (const block of artifact.graphSignals.blocks) {
        const sectionNode = structuralNodesByBlock.get(
          `${artifact.sourceVersionId}:${block.blockId}`,
        );
        if (!sectionNode) {
          continue;
        }
        const parentNode = block.parentBlockId
          ? structuralNodesByBlock.get(`${artifact.sourceVersionId}:${block.parentBlockId}`)
          : undefined;
        const primarySegment = artifact.segments.find((segment) =>
          block.segmentIds.includes(segment.id),
        );
        if (!primarySegment) {
          continue;
        }
        addEdge(
          createEdge({
            sourceNodeId: parentNode?.id ?? sourceNode.id,
            targetNodeId: sectionNode.id,
            kind: "contains",
            origin: "deterministic",
            reviewStatus: "accepted",
            confidence: 1,
            evidence: [
              {
                segmentId: primarySegment.id,
                sourceVersionId: artifact.sourceVersionId,
                locator: block.locator,
              },
            ],
          }),
        );
      }
      for (const reference of artifact.graphSignals.references) {
        if (!reference.resolved || !reference.targetBlockId) {
          continue;
        }
        const source = structuralOwnerByBlock.get(
          `${artifact.sourceVersionId}:${reference.sourceBlockId}`,
        );
        const target = structuralOwnerByBlock.get(
          `${artifact.sourceVersionId}:${reference.targetBlockId}`,
        );
        if (!source || !target || source.id === target.id) {
          continue;
        }
        const evidenceSegment = artifact.graphSignals.blocks
          .find((block) => block.blockId === reference.sourceBlockId)
          ?.segmentIds.at(0);
        if (!evidenceSegment) {
          continue;
        }
        addEdge(
          createEdge({
            sourceNodeId: source.id,
            targetNodeId: target.id,
            kind: "references",
            origin: "deterministic",
            reviewStatus: "accepted",
            confidence: reference.confidence,
            evidence: [
              {
                segmentId: evidenceSegment,
                sourceVersionId: artifact.sourceVersionId,
                locator: reference.locator,
              },
            ],
          }),
        );
      }
    } else {
      for (const segment of artifact.segments) {
        const sectionNode = sectionNodesBySegment.get(segment.id);
        if (!sectionNode) {
          continue;
        }
        addEdge(
          createEdge({
            sourceNodeId: sourceNode.id,
            targetNodeId: sectionNode.id,
            kind: "contains",
            origin: "deterministic",
            reviewStatus: "accepted",
            confidence: 1,
            evidence: [
              {
                segmentId: segment.id,
                sourceVersionId: artifact.sourceVersionId,
                locator: segment.locator,
              },
            ],
          }),
        );
      }
    }
    if (artifact.schemaVersion === 1) {
      continue;
    }
    for (const link of artifact.graphSignals.links) {
      const sourceSection = sectionNodesBySegment.get(link.segmentId);
      if (!sourceSection) {
        continue;
      }
      const targetLookup = normalizeKnowledgeCanonicalKey(link.target);
      let target = sourceAliasLookup.get(targetLookup);
      target ??= addNode(
        createNode({
          kind: "concept",
          canonicalKey: nodeCanonical("concept", link.target),
          label: link.alias ?? link.target,
          aliases: normalizeKnowledgeAliases([link.target, link.alias ?? ""]),
          confidence: 1,
          origin: "deterministic",
          sourceId: artifact.sourceId,
          sourceVersionId: artifact.sourceVersionId,
          segmentId: link.segmentId,
          locator: link.locator,
        }),
      );
      addEdge(
        createEdge({
          sourceNodeId: sourceSection.id,
          targetNodeId: target.id,
          kind: "references",
          origin: "deterministic",
          reviewStatus: "accepted",
          confidence: 1,
          evidence: [
            {
              segmentId: link.segmentId,
              sourceVersionId: artifact.sourceVersionId,
              locator: link.locator,
            },
          ],
        }),
      );
    }
  }

  for (const edge of semanticEdges({ sectionNodesBySegment, vectors: params.vectors })) {
    addEdge(edge);
  }

  for (const enriched of params.enrichmentNodes ?? []) {
    const evidence = segmentsById.get(enriched.evidenceSegmentId);
    if (!evidence || evidence.sourceVersionId !== enriched.evidenceSourceVersionId) {
      continue;
    }
    const canonicalKey = nodeCanonical(enriched.kind, enriched.canonicalKey);
    const node = addNode(
      createNode({
        kind: enriched.kind,
        canonicalKey,
        label: enriched.label,
        aliases: normalizeKnowledgeAliases([
          enriched.label,
          enriched.canonicalKey,
          ...enriched.aliases,
        ]),
        confidence: enriched.confidence,
        origin: "ai",
        sourceId: evidence.sourceId,
        sourceVersionId: evidence.sourceVersionId,
        segmentId: enriched.evidenceSegmentId,
        locator: enriched.evidenceLocator,
      }),
    );
    const structuralOwner = sectionNodesBySegment.get(enriched.evidenceSegmentId);
    if (structuralOwner && structuralOwner.id !== node.id) {
      addEdge(
        createEdge({
          sourceNodeId: structuralOwner.id,
          targetNodeId: node.id,
          kind: "mentions",
          origin: "ai",
          reviewStatus:
            enriched.confidence >= params.settings.autoApprovalThreshold ? "accepted" : "proposed",
          confidence: enriched.confidence,
          evidence: [
            {
              segmentId: enriched.evidenceSegmentId,
              sourceVersionId: enriched.evidenceSourceVersionId,
              locator: enriched.evidenceLocator,
            },
          ],
        }),
      );
    }
  }

  for (const relation of params.enrichmentRelations ?? []) {
    const evidence = segmentsById.get(relation.evidenceSegmentId);
    if (!evidence || evidence.sourceVersionId !== relation.evidenceSourceVersionId) {
      continue;
    }
    const sourceCanonical = nodeCanonical(
      relation.sourceKind ?? "concept",
      relation.sourceCanonicalKey,
    );
    const targetCanonical = nodeCanonical(
      relation.targetKind ?? "concept",
      relation.targetCanonicalKey,
    );
    const source =
      nodes.get(sourceCanonical) ??
      addNode(
        createNode({
          kind: relation.sourceKind ?? "concept",
          canonicalKey: sourceCanonical,
          label: relation.sourceLabel ?? relation.sourceCanonicalKey,
          aliases: normalizeKnowledgeAliases([
            relation.sourceCanonicalKey,
            relation.sourceLabel ?? "",
          ]),
          confidence: relation.confidence,
          origin: "ai",
          sourceId: evidence.sourceId,
          sourceVersionId: evidence.sourceVersionId,
          segmentId: relation.evidenceSegmentId,
          locator: relation.evidenceLocator,
        }),
      );
    const target =
      nodes.get(targetCanonical) ??
      addNode(
        createNode({
          kind: relation.targetKind ?? "concept",
          canonicalKey: targetCanonical,
          label: relation.targetLabel ?? relation.targetCanonicalKey,
          aliases: normalizeKnowledgeAliases([
            relation.targetCanonicalKey,
            relation.targetLabel ?? "",
          ]),
          confidence: relation.confidence,
          origin: "ai",
          sourceId: evidence.sourceId,
          sourceVersionId: evidence.sourceVersionId,
          segmentId: relation.evidenceSegmentId,
          locator: relation.evidenceLocator,
        }),
      );
    if (source.id === target.id) {
      continue;
    }
    addEdge(
      createEdge({
        sourceNodeId: source.id,
        targetNodeId: target.id,
        kind: relation.kind,
        origin: "ai",
        reviewStatus: shouldAutoAcceptAiEdge(
          relation.kind,
          relation.confidence,
          params.settings.autoApprovalThreshold,
        )
          ? "accepted"
          : "proposed",
        confidence: Math.max(0, Math.min(1, relation.confidence)),
        evidence: [
          {
            segmentId: relation.evidenceSegmentId,
            sourceVersionId: relation.evidenceSourceVersionId,
            locator: relation.evidenceLocator,
          },
        ],
      }),
    );
  }

  for (const manual of params.manualEdges) {
    const source = nodes.get(manual.sourceCanonicalKey);
    const target = nodes.get(manual.targetCanonicalKey);
    const evidence = segmentsById.get(manual.evidenceSegmentId);
    if (
      !source ||
      !target ||
      !evidence ||
      evidence.sourceVersionId !== manual.evidenceSourceVersionId ||
      source.id === target.id
    ) {
      throw new Error("GRAPH_MANUAL_EDGE_INTEGRITY_FAILED");
    }
    addEdge(
      createEdge({
        sourceNodeId: source.id,
        targetNodeId: target.id,
        kind: manual.edgeKind,
        origin: "manual",
        reviewStatus: "accepted",
        confidence: 1,
        evidence: [
          {
            segmentId: manual.evidenceSegmentId,
            sourceVersionId: manual.evidenceSourceVersionId,
            locator: manual.evidenceLocator,
          },
        ],
      }),
    );
  }

  const overlays = new Map(params.reviewOverlays.map((overlay) => [overlay.fingerprint, overlay]));
  const finalEdges = [...edges.values()].map((edge) => applyReviewOverlay(edge, overlays));
  const finalNodes = [...nodes.values()];
  const components = computeComponents(finalNodes, finalEdges);
  const degree = new Map<string, number>();
  for (const edge of finalEdges) {
    if (edge.reviewStatus !== "accepted") {
      continue;
    }
    degree.set(edge.sourceNodeId, (degree.get(edge.sourceNodeId) ?? 0) + 1);
    degree.set(edge.targetNodeId, (degree.get(edge.targetNodeId) ?? 0) + 1);
  }

  params.db.exec("BEGIN IMMEDIATE");
  try {
    const insertNode = params.db.prepare(
      `INSERT INTO graph_nodes
       (id, kind, canonical_key, label, confidence, origin, source_id, source_version_id,
        primary_segment_id, locator_json, degree, component_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertAlias = params.db.prepare(
      "INSERT OR IGNORE INTO graph_node_aliases (node_id, alias_key, alias) VALUES (?, ?, ?)",
    );
    const insertNodeEvidence = params.db.prepare(
      `INSERT OR IGNORE INTO graph_node_evidence
       (node_id, segment_id, source_version_id, locator_json) VALUES (?, ?, ?, ?)`,
    );
    const insertNodeFts = params.db.prepare(
      "INSERT INTO graph_nodes_fts(rowid, label, aliases, canonical_key) VALUES (?, ?, ?, ?)",
    );
    for (const [index, node] of finalNodes.entries()) {
      insertNode.run(
        node.id,
        node.kind,
        node.canonicalKey,
        node.label,
        node.confidence,
        node.origin,
        node.sourceId,
        node.sourceVersionId,
        node.segmentId,
        JSON.stringify(node.locator),
        degree.get(node.id) ?? 0,
        components.get(node.id) ?? null,
      );
      for (const alias of normalizeKnowledgeAliases([node.label, ...node.aliases])) {
        insertAlias.run(node.id, normalizeKnowledgeCanonicalKey(alias), alias);
      }
      insertNodeEvidence.run(
        node.id,
        node.segmentId,
        node.sourceVersionId,
        JSON.stringify(node.locator),
      );
      insertNodeFts.run(index + 1, node.label, node.aliases.join(" "), node.canonicalKey);
    }

    const insertEdge = params.db.prepare(
      `INSERT INTO graph_edges
       (id, source_node_id, target_node_id, kind, origin, review_status, confidence,
        fingerprint, evidence_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertEdgeEvidence = params.db.prepare(
      `INSERT OR IGNORE INTO graph_edge_evidence
       (edge_id, segment_id, source_version_id, locator_json) VALUES (?, ?, ?, ?)`,
    );
    for (const edge of finalEdges) {
      insertEdge.run(
        edge.id,
        edge.sourceNodeId,
        edge.targetNodeId,
        edge.kind,
        edge.origin,
        edge.reviewStatus,
        edge.confidence,
        edge.fingerprint,
        edge.evidenceHash,
      );
      for (const evidence of edge.evidence) {
        insertEdgeEvidence.run(
          edge.id,
          evidence.segmentId,
          evidence.sourceVersionId,
          JSON.stringify(evidence.locator),
        );
      }
    }
    const insertStat = params.db.prepare("INSERT INTO graph_stats (key, value) VALUES (?, ?)");
    const proposedCount = finalEdges.filter((edge) => edge.reviewStatus === "proposed").length;
    const orphanCount = finalNodes.filter((node) => (degree.get(node.id) ?? 0) === 0).length;
    const componentCount = Math.max(0, ...components.values());
    insertStat.run("nodeCount", String(finalNodes.length));
    insertStat.run("edgeCount", String(finalEdges.length));
    insertStat.run("proposedCount", String(proposedCount));
    insertStat.run("orphanCount", String(orphanCount));
    insertStat.run("componentCount", String(componentCount));
    insertStat.run("schemaVersion", String(KNOWLEDGE_GRAPH_INDEX_SCHEMA_VERSION));
    insertStat.run(
      "nodeKindCounts",
      JSON.stringify(
        Object.fromEntries(
          ["source", "section", "entity", "concept", "claim"].map((kind) => [
            kind,
            finalNodes.filter((node) => node.kind === kind).length,
          ]),
        ),
      ),
    );
    insertStat.run(
      "edgeKindCounts",
      JSON.stringify(
        Object.fromEntries(
          [
            "contains",
            "references",
            "mentions",
            "similar",
            "supports",
            "contradicts",
            "supersedes",
            "depends_on",
            "applies_to",
            "custom",
          ].map((kind) => [kind, finalEdges.filter((edge) => edge.kind === kind).length]),
        ),
      ),
    );
    insertStat.run(
      "edgeOriginCounts",
      JSON.stringify(
        Object.fromEntries(
          ["deterministic", "semantic", "ai", "manual"].map((origin) => [
            origin,
            finalEdges.filter((edge) => edge.origin === origin).length,
          ]),
        ),
      ),
    );
    insertStat.run(
      "containsRatio",
      String(
        finalEdges.length
          ? finalEdges.filter((edge) => edge.kind === "contains").length / finalEdges.length
          : 0,
      ),
    );
    insertStat.run(
      "maxSourceDegree",
      String(
        Math.max(
          0,
          ...finalNodes
            .filter((node) => node.kind === "source")
            .map((node) => degree.get(node.id) ?? 0),
        ),
      ),
    );
    if (params.enrichmentIdentity) {
      insertStat.run("enrichmentIdentity", JSON.stringify(params.enrichmentIdentity));
    }
    params.db.exec("COMMIT");
    return {
      status: params.enrichmentDegraded ? "degraded" : "ready",
      nodeCount: finalNodes.length,
      edgeCount: finalEdges.length,
      proposedCount,
      orphanCount,
      componentCount,
    };
  } catch (error) {
    params.db.exec("ROLLBACK");
    throw error;
  }
}
