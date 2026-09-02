import type {
  KnowledgeDocumentLink,
  KnowledgeGraphEdgeKind as SharedKnowledgeGraphEdgeKind,
  KnowledgeGraphNodeKind as SharedKnowledgeGraphNodeKind,
  KnowledgeGraphOrigin as SharedKnowledgeGraphOrigin,
  KnowledgeGraphReviewStatus as SharedKnowledgeGraphReviewStatus,
} from "@openclaw/knowledge-graph-core";

export type KnowledgeZoneRole = "viewer" | "curator" | "manager";
export type KnowledgeSourceKind = "note" | "file" | "url" | (string & {});
export type KnowledgePublicationStatus = "draft" | "published" | "superseded" | "archived";
export type KnowledgeProcessingStatus =
  | "queued"
  | "validating"
  | "scanning"
  | "extracting"
  | "needs_ocr"
  | "normalizing"
  | "chunking"
  | "indexing"
  | "embedding"
  | "building"
  | "ready"
  | "degraded"
  | "error"
  | "cancelled";

export type PageLocator = { kind: "page"; page: number; section?: string };
export type DocxLocator = {
  kind: "docx";
  section?: string;
  paragraph?: number;
  table?: number;
  cell?: string;
};
export type SheetLocator = { kind: "sheet"; sheet: string; range: string };
export type SlideLocator = { kind: "slide"; slide: number; shape?: string };
export type OcrLocator = { kind: "ocr"; page?: number; block?: string; confidence?: number };
export type TextLocator = { kind: "text"; section?: string; paragraph?: number };
export type KnowledgeLocator =
  | PageLocator
  | DocxLocator
  | SheetLocator
  | SlideLocator
  | OcrLocator
  | TextLocator;

export type KnowledgeSegment = {
  id: string;
  text: string;
  normalizedText: string;
  locator: KnowledgeLocator;
  ordinal: number;
};

export type KnowledgeStructuralBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "table"
  | "table_row"
  | "table_cell"
  | "ocr_block";

export type KnowledgeStructuralSemanticKind =
  | "part"
  | "chapter"
  | "section"
  | "article"
  | "clause"
  | "point"
  | "content";

export type KnowledgeStructuralBlock = {
  blockId: string;
  kind: KnowledgeStructuralBlockKind;
  semanticKind?: KnowledgeStructuralSemanticKind;
  text: string;
  parentBlockId?: string;
  segmentIds: string[];
  headingLevel?: number;
  headingPath: string[];
  ordinal: number;
  listLevel?: number;
  numberingLabel?: string;
  page?: number;
  paragraph?: number;
  table?: number;
  row?: number;
  column?: number;
  sheet?: string;
  slide?: number;
  isToc: boolean;
  isHeaderFooter: boolean;
  language?: string;
  locator: KnowledgeLocator;
};

export type KnowledgeStructuralReference = {
  referenceId: string;
  sourceBlockId: string;
  rawText: string;
  targetBlockId?: string;
  candidateTargetBlockIds: string[];
  kind: "article" | "clause" | "point" | "bookmark" | "hyperlink" | "wikilink";
  target?: string;
  resolved: boolean;
  confidence: number;
  locator: KnowledgeLocator;
};

export type NormalizedKnowledgeArtifactV1 = {
  schemaVersion: 1;
  sourceId: string;
  sourceVersionId: string;
  sourceVersion: number;
  title: string;
  mimeType: string;
  createdAt: number;
  parserProvenance: Record<string, unknown>;
  ocrProvenance?: Record<string, unknown>;
  segments: KnowledgeSegment[];
};

export type KnowledgeGraphArtifactHeading = {
  text: string;
  level: number;
  segmentId: string;
  locator: KnowledgeLocator;
};

export type KnowledgeGraphArtifactLink = KnowledgeDocumentLink & {
  segmentId: string;
  locator: KnowledgeLocator;
};

export type NormalizedKnowledgeArtifactV2 = Omit<NormalizedKnowledgeArtifactV1, "schemaVersion"> & {
  schemaVersion: 2;
  graphSignals: {
    aliases: string[];
    headings: KnowledgeGraphArtifactHeading[];
    links: KnowledgeGraphArtifactLink[];
  };
};

export type NormalizedKnowledgeArtifactV3 = Omit<NormalizedKnowledgeArtifactV1, "schemaVersion"> & {
  schemaVersion: 3;
  extractorIdentity: string;
  artifactChecksum: string;
  graphSignals: {
    aliases: string[];
    headings: KnowledgeGraphArtifactHeading[];
    links: KnowledgeGraphArtifactLink[];
    blocks: KnowledgeStructuralBlock[];
    references: KnowledgeStructuralReference[];
  };
};

export type NormalizedKnowledgeArtifact =
  | NormalizedKnowledgeArtifactV1
  | NormalizedKnowledgeArtifactV2
  | NormalizedKnowledgeArtifactV3;

export type KnowledgeGraphSnapshot = "active" | "candidate";
export type KnowledgeGraphNodeKind = SharedKnowledgeGraphNodeKind;
export type KnowledgeGraphEdgeKind = SharedKnowledgeGraphEdgeKind;
export type KnowledgeGraphOrigin = SharedKnowledgeGraphOrigin;
export type KnowledgeGraphReviewStatus = SharedKnowledgeGraphReviewStatus;

export type KnowledgeGraphSettings = {
  enabled: boolean;
  enrichmentEnabled: boolean;
  autoApprovalThreshold: number;
  updatedAt: number;
};

export type KnowledgeGraphDegradationReason =
  | "local_ai_provider_not_configured"
  | "remote_ai_blocked_by_egress_policy"
  | "vector_provider_not_ready"
  | "ai_batch_failed"
  | "capacity_exceeded"
  | "graph_not_built";

export type KnowledgeGraphAiAnalysisSummary = {
  generationId: string;
  artifactSchemaVersion: 1 | 2 | 3;
  status: "off" | "queued" | "running" | "ready" | "degraded" | "failed";
  analyzedBlocks: number;
  totalBlocks: number;
  entityCount: number;
  conceptCount: number;
  claimCount: number;
  relationCount: number;
  degradationReasons: KnowledgeGraphDegradationReason[];
  enrichmentIdentity: string | null;
};

export type KnowledgeJobStepStatus =
  | "queued"
  | "running"
  | "retry_wait"
  | "completed"
  | "degraded"
  | "failed"
  | "cancelled"
  | "superseded";

export type KnowledgeJobStep = {
  jobId: string;
  stepId: string;
  stage: string;
  status: KnowledgeJobStepStatus;
  progressCurrent: number | null;
  progressTotal: number | null;
  checkpointRef: string | null;
  attempt: number;
  startedAt: number | null;
  updatedAt: number;
  completedAt: number | null;
  safeErrorCode: string | null;
  degradedReason: string | null;
};

export type EnterpriseKnowledgeChangeEvent = {
  sequence: number;
  zoneId: string;
  entityType:
    | "job"
    | "job_step"
    | "source"
    | "candidate"
    | "publication"
    | "graph"
    | "upload"
    | "readiness";
  entityId?: string;
  operation: "created" | "updated" | "completed" | "deleted";
  revision?: number;
  status?: string;
  stage?: string;
  progressCurrent?: number;
  progressTotal?: number;
  safeErrorCode?: string;
  occurredAt: string;
};

export type KnowledgeGraphSnapshotRevision = {
  generationId: string;
  snapshotRevision: number;
  artifactSchemaVersion: 1 | 2 | 3;
};

export type KnowledgeGraphEnrichmentIdentity = {
  provider: string;
  model: string;
  transport: "local" | "remote";
  promptSchemaVersion?: string;
  analysisChecksum?: string;
};

export type KnowledgeGraphSummary = {
  snapshot: KnowledgeGraphSnapshot;
  generationId: string;
  publicationId: string | null;
  schemaVersion: number;
  status: "ready" | "degraded" | "not_built" | "corrupt";
  nodeCount: number;
  edgeCount: number;
  proposedCount: number;
  orphanCount: number;
  componentCount: number;
  truncated: boolean;
  builtAt: number;
  enrichmentIdentity: KnowledgeGraphEnrichmentIdentity | null;
};

export type KnowledgeGraphNodeSummary = {
  nodeRef: string;
  kind: KnowledgeGraphNodeKind;
  label: string;
  aliases: string[];
  confidence: number;
  origin: KnowledgeGraphOrigin;
  degree: number;
  sourceTitle: string;
  locator: KnowledgeLocator;
  changed?: "added" | "removed" | "changed";
};

export type KnowledgeGraphEdgeSummary = {
  edgeRef: string;
  sourceNodeRef: string;
  targetNodeRef: string;
  kind: KnowledgeGraphEdgeKind;
  origin: KnowledgeGraphOrigin;
  reviewStatus: KnowledgeGraphReviewStatus;
  confidence: number;
  changed?: "added" | "removed" | "changed";
};

export type KnowledgeGraphNeighborhood = {
  summary: KnowledgeGraphSummary;
  nodes: KnowledgeGraphNodeSummary[];
  edges: KnowledgeGraphEdgeSummary[];
  depth: 1 | 2;
  truncated: boolean;
};

export type KnowledgeGraphNodeDetail = KnowledgeGraphNodeSummary & {
  incoming: KnowledgeGraphEdgeSummary[];
  outgoing: KnowledgeGraphEdgeSummary[];
  evidence: Array<{
    citationId: string;
    sourceVersion: number;
    sourceTitle: string;
    locator: KnowledgeLocator;
    excerpt: string;
  }>;
};

export type KnowledgeGraphDiff = {
  activeGenerationId: string;
  candidateGenerationId: string;
  nodes: KnowledgeGraphNodeSummary[];
  edges: KnowledgeGraphEdgeSummary[];
  counts: { added: number; removed: number; changed: number };
  truncated: boolean;
};

export type KnowledgeGraphReviewDecision = {
  edgeRef: string;
  decision: "approve" | "reject" | "change_kind";
  edgeKind?: KnowledgeGraphEdgeKind;
  note?: string;
};

export type KnowledgeZone = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "active" | "archived";
  egressPolicy: "local_only" | "external_allowed";
  revision: number;
  accessRevision: number;
  sourceSetRevision: number;
  buildRevision: number;
  activePublicationId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type KnowledgeSource = {
  id: string;
  zoneId: string;
  kind: KnowledgeSourceKind;
  title: string;
  canonicalUrl: string | null;
  status: "active" | "staged_remove" | "archived";
  draftRevision: number;
  currentVersionNumber: number;
  createdAt: number;
  updatedAt: number;
};

export type KnowledgeSourceVersion = {
  id: string;
  sourceId: string;
  zoneId: string;
  versionNumber: number;
  pipelineGeneration: number;
  publicationStatus: KnowledgePublicationStatus;
  processingStatus: KnowledgeProcessingStatus;
  contentHash: string;
  blobHash: string | null;
  byteSize: number;
  mimeType: string;
  originalName: string | null;
  normalizedArtifactHash: string | null;
  segmentCount: number | null;
  vectorStatus: "pending" | "ready" | "unavailable" | "error";
  safeErrorCode: string | null;
  createdAt: number;
  completedAt: number | null;
};

export type KnowledgeCitation = {
  citationId: string;
  zoneLabel: string;
  sourceTitle: string;
  sourceVersion: number;
  locator: KnowledgeLocator;
  publishedAt: string;
};

export type KnowledgeSearchHit = {
  citationId: string;
  citation: KnowledgeCitation;
  excerpt: string;
  score: number;
};

export type KnowledgeSearchResult = {
  hits: KnowledgeSearchHit[];
  citations: KnowledgeCitation[];
  partial: boolean;
  coverage: {
    searchedZones: number;
    unavailableZones: number;
    graphSeedCount?: number;
    graphExpandedEvidenceCount?: number;
    graphMaxDepth?: number;
    graphTruncated?: boolean;
    graphAvailability?: "available" | "disabled" | "not_built" | "timeout";
  };
  warnings: string[];
};

export class EnterpriseKnowledgeError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly safeDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "EnterpriseKnowledgeError";
  }
}

export function assertBaseRevision(expected: number, actual: number): void {
  if (!Number.isSafeInteger(expected) || expected !== actual) {
    throw new EnterpriseKnowledgeError(
      "STALE_REVISION",
      409,
      "The resource changed. Reload and retry.",
      {
        currentRevision: actual,
      },
    );
  }
}
