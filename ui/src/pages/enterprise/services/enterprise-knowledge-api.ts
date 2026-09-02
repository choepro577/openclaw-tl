import type { EnterprisePersonalAgent, EnterpriseSharedAgent } from "./enterprise-api-types.ts";
import {
  EnterpriseApiError,
  enterpriseApiPath,
  getEnterprisePortalCsrfToken,
  requestEnterprisePortalJson as requestJson,
  type EnterprisePortalAudience,
} from "./enterprise-api.ts";

export type EnterpriseKnowledgeZoneRole = "viewer" | "curator" | "manager";
export type EnterpriseKnowledgeZone = {
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
  role?: EnterpriseKnowledgeZoneRole;
};
export type EnterpriseKnowledgeSource = {
  id: string;
  zoneId: string;
  kind: string;
  title: string;
  canonicalUrl: string | null;
  status: "active" | "staged_remove" | "archived";
  draftRevision: number;
  currentVersionNumber: number;
  createdAt: number;
  updatedAt: number;
};
export type EnterpriseKnowledgeVersion = {
  id: string;
  sourceId: string;
  zoneId: string;
  versionNumber: number;
  pipelineGeneration: number;
  publicationStatus: "draft" | "published" | "superseded" | "archived";
  processingStatus: string;
  mimeType: string;
  originalName: string | null;
  byteSize: number;
  segmentCount: number | null;
  vectorStatus: string;
  safeErrorCode: string | null;
  createdAt: number;
  completedAt: number | null;
};
export type EnterpriseKnowledgeAgentCatalog = {
  shared: EnterpriseSharedAgent[];
  personal: EnterprisePersonalAgent[];
};
export type EnterpriseKnowledgeSegment = {
  id: string;
  text: string;
  normalizedText: string;
  locator: Record<string, unknown> & { kind: string };
  ordinal: number;
};
export type EnterpriseKnowledgeVersionPreview = {
  version: EnterpriseKnowledgeVersion;
  title: string;
  segments: EnterpriseKnowledgeSegment[];
  truncated: boolean;
  parserProvenance: Record<string, unknown>;
  ocrProvenance?: Record<string, unknown>;
  artifactSchemaVersion: 1 | 2 | 3;
  analysisStatus: "structure_ready" | "reprocess_v3_available";
  structuralBlocks?: Array<Record<string, unknown>>;
  structuralReferences?: Array<Record<string, unknown>>;
};
export type EnterpriseKnowledgeReadiness = {
  worker: { ready: boolean; concurrency: number; leaseSeconds?: number };
  lexical: { ready: boolean; backend: string };
  vector: {
    ready: boolean;
    status: string;
    provider?: string | null;
    model?: string | null;
  };
  ocr: { ready: boolean; provider: string | null; transport?: "local" | "remote" | null };
  graph: {
    enabled: boolean;
    aiAnalysis: "off" | "shadow" | "on";
    agentExpansion: "off" | "shadow" | "on";
    enrichmentReady: boolean;
    enrichmentProvider: string | null;
    enrichmentTransport: "local" | "remote" | null;
    maxConcurrentZoneBuilds: number;
    maxConcurrentAiCallsPerZone: number;
  };
};

export type EnterpriseKnowledgeGraphSnapshot = "active" | "candidate";
export type EnterpriseKnowledgeGraphNodeKind =
  | "source"
  | "section"
  | "entity"
  | "concept"
  | "claim";
export type EnterpriseKnowledgeGraphEdgeKind =
  | "contains"
  | "references"
  | "mentions"
  | "similar"
  | "supports"
  | "contradicts"
  | "supersedes"
  | "depends_on"
  | "applies_to"
  | "custom";
export type EnterpriseKnowledgeGraphOrigin = "deterministic" | "semantic" | "ai" | "manual";
export type EnterpriseKnowledgeGraphReviewStatus = "accepted" | "proposed" | "rejected";
export type EnterpriseKnowledgeGraphSettings = {
  enabled: boolean;
  enrichmentEnabled: boolean;
  autoApprovalThreshold: number;
  updatedAt: number;
};
export type EnterpriseKnowledgeGraphSummary = {
  snapshot: EnterpriseKnowledgeGraphSnapshot;
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
  enrichmentIdentity: {
    provider: string;
    model: string;
    transport: "local" | "remote";
    promptSchemaVersion?: string;
    analysisChecksum?: string;
  } | null;
};
export type EnterpriseKnowledgeGraphNode = {
  nodeRef: string;
  kind: EnterpriseKnowledgeGraphNodeKind;
  label: string;
  aliases: string[];
  confidence: number;
  origin: EnterpriseKnowledgeGraphOrigin;
  degree: number;
  sourceTitle: string;
  locator: Record<string, unknown> & { kind: string };
  changed?: "added" | "removed" | "changed";
};
export type EnterpriseKnowledgeGraphEdge = {
  edgeRef: string;
  sourceNodeRef: string;
  targetNodeRef: string;
  kind: EnterpriseKnowledgeGraphEdgeKind;
  origin: EnterpriseKnowledgeGraphOrigin;
  reviewStatus: EnterpriseKnowledgeGraphReviewStatus;
  confidence: number;
  changed?: "added" | "removed" | "changed";
};
export type EnterpriseKnowledgeGraphNeighborhood = {
  summary: EnterpriseKnowledgeGraphSummary;
  nodes: EnterpriseKnowledgeGraphNode[];
  edges: EnterpriseKnowledgeGraphEdge[];
  depth: 1 | 2;
  truncated: boolean;
};
export type EnterpriseKnowledgeGraphNodeDetail = EnterpriseKnowledgeGraphNode & {
  incoming: EnterpriseKnowledgeGraphEdge[];
  outgoing: EnterpriseKnowledgeGraphEdge[];
  evidence: Array<{
    citationId: string;
    sourceVersion: number;
    sourceTitle: string;
    locator: Record<string, unknown> & { kind: string };
    excerpt: string;
  }>;
};
export type EnterpriseKnowledgeGraphExport = {
  id: string;
  zoneId: string;
  publicationId: string;
  generationId: string;
  status: "running" | "complete" | "failed" | "expired";
  checksum: string | null;
  entryCount: number;
  uncompressedBytes: number;
  createdAt: number;
  completedAt: number | null;
  expiresAt: number;
  safeErrorCode: string | null;
};
export type EnterpriseKnowledgeGraphOverview = {
  clusters: Array<{
    zoneId: string;
    zoneSlug: string;
    zoneName: string;
    role?: EnterpriseKnowledgeZoneRole;
    summary: EnterpriseKnowledgeGraphSummary;
  }>;
  totals: { zones: number; nodes: number; edges: number };
};
export type EnterpriseKnowledgeDoctorReport = {
  ok: boolean;
  checkedAt: number;
  artifacts: {
    checked: number;
    missing: number;
    permissionErrors: number;
    issues: Array<{ kind: string; identity: string; code: string }>;
  };
  indexes: {
    checked: number;
    invalid: number;
    issues: Array<{ zoneId: string; generationId: string; code: string }>;
  };
  jobs: {
    queued: number;
    running: number;
    retryWait: number;
    failed24h: number;
    completed24h: number;
    stuckOver10m: number;
    failureRate24h: number;
  };
  search: {
    count: number;
    p50Ms: number | null;
    p95Ms: number | null;
    p99Ms: number | null;
    partialRate: number;
    zeroHitRate: number;
    citationAuthorizationFailures: number;
  };
  graph: {
    generationsV2: number;
    ready: number;
    degraded: number;
    error: number;
    proposedEdges: number;
    orphanNodes: number;
    enrichmentIdentities: number;
    buildP50Ms: number | null;
    buildP95Ms: number | null;
    retrievalP95Ms: number | null;
    timeouts: number;
    truncations: number;
  };
  exports: {
    running: number;
    complete: number;
    failed: number;
    expired: number;
    storageBytes: number;
  };
  storage: { artifactBytes: number; filesystemUsedPercent: number | null };
};
export type EnterpriseKnowledgeAuditEvent = {
  id: string;
  actorAccountId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "failure";
  after: unknown;
  createdAt: number;
};
export type EnterpriseKnowledgeJob = {
  id: string;
  zoneId: string;
  sourceId: string | null;
  kind: string;
  stage: string;
  status: string;
  attempt: number;
  progressCurrent: number;
  progressTotal: number;
  safeErrorCode: string | null;
  updatedAt: number;
};
export type EnterpriseKnowledgeJobStep = {
  jobId: string;
  stepId: string;
  stage: string;
  status:
    | "queued"
    | "running"
    | "retry_wait"
    | "completed"
    | "degraded"
    | "failed"
    | "cancelled"
    | "superseded";
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
export type EnterpriseKnowledgePublication = {
  id: string;
  zoneId: string;
  generationId: string;
  sourceSetRevision: number;
  publicationNumber: number;
  lexicalStatus: string;
  vectorStatus: string;
  degradedOverride: boolean;
  degradedReason: string | null;
  publishedAt: number;
  sourceCount: number;
};
export type EnterpriseKnowledgeUpload = {
  id: string;
  zoneId: string;
  targetSourceId: string | null;
  title: string;
  originalName: string;
  declaredMimeType: string;
  expectedSize: number;
  receivedSize: number;
  state: "active" | "committing" | "committed" | "cancelled" | "expired" | "error";
  expiresAt: number;
  revision: number;
  committedSourceVersionId: string | null;
};
export type EnterpriseKnowledgePurgePreview = {
  zoneId: string;
  slug: string;
  status: string;
  sources: number;
  versions: number;
  publications: number;
  generations: number;
  activeJobs: number;
  activeUploads: number;
};

function knowledgePrefix(audience: EnterprisePortalAudience): string {
  return audience === "admin"
    ? "/api/enterprise/admin/knowledge"
    : "/api/enterprise/user/v2/knowledge";
}

function knowledgeIdempotencyHeaders(stableKey?: string): HeadersInit {
  const generated = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return { "Idempotency-Key": (stableKey ?? `knowledge-${generated}`).slice(0, 200) };
}

export function listEnterpriseKnowledgeZones(
  audience: EnterprisePortalAudience,
  filters: Record<string, string> = {},
) {
  return requestJson<{ items: EnterpriseKnowledgeZone[]; nextCursor: string | null }>(
    `${knowledgePrefix(audience)}${queryString(filters)}`,
    undefined,
    audience,
  );
}

export function createEnterpriseKnowledgeZone(input: {
  slug: string;
  name: string;
  description: string;
  egressPolicy: "local_only" | "external_allowed";
  graph?: {
    enabled: boolean;
    enrichmentEnabled: boolean;
    autoApprovalThreshold: number;
  };
}) {
  return requestJson<{ zone: EnterpriseKnowledgeZone }>(
    knowledgePrefix("admin"),
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: JSON.stringify(input) },
    "admin",
  );
}

export function loadEnterpriseKnowledgeZone(audience: EnterprisePortalAudience, zoneId: string) {
  return requestJson<{
    zone: EnterpriseKnowledgeZone;
    role: EnterpriseKnowledgeZoneRole;
    candidate: null | {
      id: string;
      sourceSetRevision: number;
      buildRevision: number;
      lexicalStatus: string;
      vectorStatus: string;
      integrityStatus: string;
      graphStatus: "not_built" | "ready" | "degraded" | "error";
      graphSchemaVersion: number;
      graphNodeCount: number;
      graphEdgeCount: number;
      graphProposedCount: number;
      graphOrphanCount: number;
      snapshotRevision: number;
      artifactSchemaVersion: 1 | 2 | 3;
      aiAnalysisStatus: "off" | "ready" | "degraded";
      degradationReasons: string[];
      createdAt: number;
    };
    counts: { sources: number; jobs: number; bindings?: number };
    graphSettings: EnterpriseKnowledgeGraphSettings;
  }>(`${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}`, undefined, audience);
}

export function loadEnterpriseKnowledgeGraphSettings(
  audience: EnterprisePortalAudience,
  zoneId: string,
) {
  return requestJson<{ settings: EnterpriseKnowledgeGraphSettings; revision: number }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/settings`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphOverview(audience: EnterprisePortalAudience) {
  return requestJson<EnterpriseKnowledgeGraphOverview>(
    `${knowledgePrefix(audience)}/graph/overview`,
    undefined,
    audience,
  );
}

export function updateEnterpriseKnowledgeGraphSettings(
  zoneId: string,
  input: {
    baseRevision: number;
    enabled: boolean;
    enrichmentEnabled: boolean;
    autoApprovalThreshold: number;
  },
) {
  return requestJson<{
    zone: EnterpriseKnowledgeZone;
    settings: EnterpriseKnowledgeGraphSettings;
    jobId: string | null;
  }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}/graph/settings`,
    { method: "PATCH", body: JSON.stringify(input) },
    "admin",
  );
}

export function loadEnterpriseKnowledgeGraphSummary(
  audience: EnterprisePortalAudience,
  zoneId: string,
  snapshot: EnterpriseKnowledgeGraphSnapshot,
) {
  return requestJson<{ summary: EnterpriseKnowledgeGraphSummary }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/summary${queryString({ snapshot })}`,
    undefined,
    audience,
  );
}

export function searchEnterpriseKnowledgeGraph(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: { snapshot: EnterpriseKnowledgeGraphSnapshot; query: string; nodeKinds?: string[] },
) {
  return requestJson<{
    summary: EnterpriseKnowledgeGraphSummary;
    nodes: EnterpriseKnowledgeGraphNode[];
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/search${queryString({
      snapshot: input.snapshot,
      query: input.query,
      nodeKinds: input.nodeKinds?.join(","),
    })}`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphNeighborhood(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: {
    snapshot: EnterpriseKnowledgeGraphSnapshot;
    nodeRef?: string;
    depth?: 1 | 2;
    nodeKinds?: string[];
    edgeKinds?: string[];
    origins?: string[];
    reviewStatuses?: string[];
    minConfidence?: number;
  },
  signal?: AbortSignal,
) {
  return requestJson<EnterpriseKnowledgeGraphNeighborhood>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/neighborhood${queryString({
      snapshot: input.snapshot,
      nodeRef: input.nodeRef,
      depth: input.depth,
      nodeKinds: input.nodeKinds?.join(","),
      edgeKinds: input.edgeKinds?.join(","),
      origins: input.origins?.join(","),
      reviewStatuses: input.reviewStatuses?.join(","),
      minConfidence: input.minConfidence,
    })}`,
    { signal },
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphNode(
  audience: EnterprisePortalAudience,
  zoneId: string,
  snapshot: EnterpriseKnowledgeGraphSnapshot,
  nodeRef: string,
  signal?: AbortSignal,
) {
  return requestJson<{ node: EnterpriseKnowledgeGraphNodeDetail }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/nodes/${encodeURIComponent(nodeRef)}${queryString({ snapshot })}`,
    { signal },
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphDiff(
  audience: EnterprisePortalAudience,
  zoneId: string,
) {
  return requestJson<{
    diff: {
      activeGenerationId: string;
      candidateGenerationId: string;
      nodes: EnterpriseKnowledgeGraphNode[];
      edges: EnterpriseKnowledgeGraphEdge[];
      counts: { added: number; removed: number; changed: number };
      truncated: boolean;
    };
  }>(`${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/diff`, undefined, audience);
}

export function reviewEnterpriseKnowledgeGraphEdges(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: {
    baseRevision: number;
    decisions: Array<{
      edgeRef: string;
      decision: "approve" | "reject" | "change_kind";
      edgeKind?: EnterpriseKnowledgeGraphEdgeKind;
      note?: string;
    }>;
  },
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone; jobId: string }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/reviews/batch`,
    { method: "POST", body: JSON.stringify(input) },
    audience,
  );
}

export function createEnterpriseKnowledgeGraphManualEdge(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: {
    baseRevision: number;
    sourceNodeRef: string;
    targetNodeRef: string;
    edgeKind: EnterpriseKnowledgeGraphEdgeKind;
    evidenceCitationId: string;
    evidenceLocator: Record<string, unknown> & { kind: string };
    note?: string;
  },
) {
  return requestJson<{
    zone: EnterpriseKnowledgeZone;
    edge: { id: string; edgeKind: EnterpriseKnowledgeGraphEdgeKind };
    jobId: string;
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/manual-edges`,
    { method: "POST", body: JSON.stringify(input) },
    audience,
  );
}

export function updateEnterpriseKnowledgeGraphManualEdge(
  audience: EnterprisePortalAudience,
  zoneId: string,
  edgeId: string,
  input: {
    baseRevision: number;
    edgeRevision: number;
    sourceNodeRef: string;
    targetNodeRef: string;
    edgeKind: EnterpriseKnowledgeGraphEdgeKind;
    evidenceCitationId: string;
    evidenceLocator: Record<string, unknown> & { kind: string };
    note?: string;
  },
) {
  return requestJson<{
    zone: EnterpriseKnowledgeZone;
    edge: { id: string; edgeKind: EnterpriseKnowledgeGraphEdgeKind; revision: number };
    jobId: string;
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/manual-edges/${encodeURIComponent(edgeId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    audience,
  );
}

export function deleteEnterpriseKnowledgeGraphManualEdge(
  audience: EnterprisePortalAudience,
  zoneId: string,
  edgeId: string,
  input: { baseRevision: number; edgeRevision: number },
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone; jobId: string }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/manual-edges/${encodeURIComponent(edgeId)}`,
    { method: "DELETE", body: JSON.stringify(input) },
    audience,
  );
}

export function createEnterpriseKnowledgeGraphExport(
  audience: EnterprisePortalAudience,
  zoneId: string,
) {
  return requestJson<{ export: EnterpriseKnowledgeGraphExport }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/exports`,
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: "{}" },
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphExport(
  audience: EnterprisePortalAudience,
  zoneId: string,
  exportId: string,
) {
  return requestJson<{ export: EnterpriseKnowledgeGraphExport }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/exports/${encodeURIComponent(exportId)}`,
    undefined,
    audience,
  );
}

export function enterpriseKnowledgeGraphExportDownloadUrl(
  audience: EnterprisePortalAudience,
  zoneId: string,
  exportId: string,
): string {
  return enterpriseApiPath(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/exports/${encodeURIComponent(exportId)}/download`,
  );
}

export function updateEnterpriseKnowledgeZone(
  zoneId: string,
  input: {
    baseRevision: number;
    name: string;
    description: string;
    egressPolicy: "local_only" | "external_allowed";
  },
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "admin",
  );
}

export function setEnterpriseKnowledgeZoneArchived(
  zoneId: string,
  archived: boolean,
  baseRevision: number,
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}/${archived ? "archive" : "restore"}`,
    { method: "POST", body: JSON.stringify({ baseRevision }) },
    "admin",
  );
}

export function previewEnterpriseKnowledgeZonePurge(zoneId: string) {
  return requestJson<{ preview: EnterpriseKnowledgePurgePreview }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}/purge-preview`,
    undefined,
    "admin",
  );
}

export function purgeEnterpriseKnowledgeZone(
  zoneId: string,
  baseRevision: number,
  confirmation: string,
) {
  return requestJson<{ ok: true }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}`,
    {
      method: "DELETE",
      headers: knowledgeIdempotencyHeaders(
        `knowledge-zone-purge-${zoneId}-${baseRevision}-${confirmation}`,
      ),
      body: JSON.stringify({ baseRevision, confirmation }),
    },
    "admin",
  );
}

export function listEnterpriseKnowledgeSources(audience: EnterprisePortalAudience, zoneId: string) {
  return requestJson<{ items: EnterpriseKnowledgeSource[] }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeSource(
  audience: EnterprisePortalAudience,
  zoneId: string,
  sourceId: string,
) {
  return requestJson<{
    source: EnterpriseKnowledgeSource;
    versions: EnterpriseKnowledgeVersion[];
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/${encodeURIComponent(sourceId)}`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeVersionPreview(
  audience: EnterprisePortalAudience,
  zoneId: string,
  versionId: string,
) {
  return requestJson<EnterpriseKnowledgeVersionPreview>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/versions/${encodeURIComponent(versionId)}/preview`,
    undefined,
    audience,
  );
}

export function createEnterpriseKnowledgeNote(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: { title: string; content: string },
) {
  return requestJson<Record<string, unknown>>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/note`,
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: JSON.stringify(input) },
    audience,
  );
}

export function createEnterpriseKnowledgeUrl(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: { title: string; url: string; crawlSameOrigin?: boolean },
) {
  return requestJson<Record<string, unknown>>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/url`,
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: JSON.stringify(input) },
    audience,
  );
}

export function createEnterpriseKnowledgeSourceVersion(
  audience: EnterprisePortalAudience,
  zoneId: string,
  sourceId: string,
  input: { content?: string; url?: string; crawlSameOrigin?: boolean },
) {
  return requestJson<Record<string, unknown>>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/${encodeURIComponent(sourceId)}/versions`,
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: JSON.stringify(input) },
    audience,
  );
}

export function reprocessEnterpriseKnowledgeVersionV3(
  audience: EnterprisePortalAudience,
  zoneId: string,
  sourceId: string,
  versionId: string,
  baseBuildRevision: number,
) {
  return requestJson<{
    version: EnterpriseKnowledgeVersion;
    jobId: string;
    buildRevision: number;
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/${encodeURIComponent(sourceId)}/versions/${encodeURIComponent(versionId)}/reprocess`,
    {
      method: "POST",
      headers: knowledgeIdempotencyHeaders(
        `knowledge-reprocess-v3-${versionId}-${baseBuildRevision}`,
      ),
      body: JSON.stringify({
        baseBuildRevision,
        targetArtifactSchema: 3,
        runAiAnalysis: true,
      }),
    },
    audience,
  );
}

export function setEnterpriseKnowledgeSourceStagedRemove(
  audience: EnterprisePortalAudience,
  zoneId: string,
  sourceId: string,
  staged: boolean,
) {
  return requestJson<{ source: EnterpriseKnowledgeSource; jobId: string }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/sources/${encodeURIComponent(sourceId)}/stage-remove`,
    { method: "POST", body: JSON.stringify({ staged }) },
    audience,
  );
}

export function listEnterpriseKnowledgeJobs(audience: EnterprisePortalAudience, zoneId: string) {
  return requestJson<{ items: EnterpriseKnowledgeJob[] }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/jobs`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeJob(
  audience: EnterprisePortalAudience,
  zoneId: string,
  jobId: string,
) {
  return requestJson<{ job: EnterpriseKnowledgeJob; steps: EnterpriseKnowledgeJobStep[] }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/jobs/${encodeURIComponent(jobId)}`,
    undefined,
    audience,
  );
}

export function listEnterpriseKnowledgeChanges(
  audience: EnterprisePortalAudience,
  params: { afterSequence: number; zoneId?: string; limit?: number },
) {
  return requestJson<{
    items: EnterpriseKnowledgeChangeEvent[];
    lastSequence: number;
    gap?: boolean;
  }>(
    `${knowledgePrefix(audience)}/changes${queryString({
      afterSequence: String(params.afterSequence),
      ...(params.zoneId ? { zoneId: params.zoneId } : {}),
      limit: String(params.limit ?? 200),
    })}`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeGraphAnalysis(
  audience: EnterprisePortalAudience,
  zoneId: string,
  snapshot: EnterpriseKnowledgeGraphSnapshot,
) {
  return requestJson<{
    analysis: {
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
    };
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/graph/analysis-summary?snapshot=${snapshot}`,
    undefined,
    audience,
  );
}

export function cancelEnterpriseKnowledgeJob(
  audience: EnterprisePortalAudience,
  zoneId: string,
  jobId: string,
) {
  return requestJson<{ job: EnterpriseKnowledgeJob }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST", body: "{}" },
    audience,
  );
}

export function retryEnterpriseKnowledgeJob(
  audience: EnterprisePortalAudience,
  zoneId: string,
  jobId: string,
) {
  return requestJson<{ job: EnterpriseKnowledgeJob }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: "POST",
      headers: knowledgeIdempotencyHeaders(`knowledge-job-retry-${jobId}`),
      body: "{}",
    },
    audience,
  );
}

export function beginEnterpriseKnowledgeUpload(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: {
    title: string;
    originalName: string;
    mimeType: string;
    size: number;
    sha256?: string;
    targetSourceId?: string;
  },
) {
  return requestJson<{
    upload: {
      id: string;
      expectedSize: number;
      receivedSize: number;
      state: string;
      revision: number;
    };
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/uploads`,
    { method: "POST", headers: knowledgeIdempotencyHeaders(), body: JSON.stringify(input) },
    audience,
  );
}

export function listEnterpriseKnowledgeUploads(audience: EnterprisePortalAudience, zoneId: string) {
  return requestJson<{ items: EnterpriseKnowledgeUpload[] }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/uploads`,
    undefined,
    audience,
  );
}

export function cancelEnterpriseKnowledgeUpload(
  audience: EnterprisePortalAudience,
  zoneId: string,
  uploadId: string,
) {
  return requestJson<{ ok: true }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/uploads/${encodeURIComponent(uploadId)}`,
    { method: "DELETE", body: "{}" },
    audience,
  );
}

export async function appendEnterpriseKnowledgeUploadChunk(
  audience: EnterprisePortalAudience,
  zoneId: string,
  uploadId: string,
  offset: number,
  chunk: Blob,
) {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/octet-stream",
    "Upload-Offset": String(offset),
  });
  const csrf = getEnterprisePortalCsrfToken(audience);
  if (csrf) {
    headers.set("X-CSRF-Token", csrf);
  }
  const response = await fetch(
    enterpriseApiPath(
      `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/uploads/${encodeURIComponent(uploadId)}/chunk`,
    ),
    { method: "PUT", credentials: "include", cache: "no-store", headers, body: chunk },
  );
  const parsedBody: unknown = await response.json();
  const body =
    parsedBody && typeof parsedBody === "object"
      ? Object.fromEntries(Object.entries(parsedBody))
      : {};
  if (!response.ok) {
    throw new EnterpriseApiError(
      response.status,
      typeof body.code === "string" ? body.code : "HTTP_ERROR",
      typeof body.message === "string" ? body.message : `HTTP ${response.status}`,
      body,
    );
  }
  return body;
}

export function commitEnterpriseKnowledgeUpload(
  audience: EnterprisePortalAudience,
  zoneId: string,
  uploadId: string,
) {
  return requestJson<Record<string, unknown>>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/uploads/${encodeURIComponent(uploadId)}/commit`,
    {
      method: "POST",
      headers: knowledgeIdempotencyHeaders(`knowledge-upload-commit-${uploadId}`),
      body: "{}",
    },
    audience,
  );
}

export function publishEnterpriseKnowledgeCandidate(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: { baseRevision: number; generationId: string; degradedReason?: string },
) {
  return requestJson<{ publicationId: string; publicationNumber: number }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/publish`,
    {
      method: "POST",
      headers: knowledgeIdempotencyHeaders(`knowledge-publish-${zoneId}-${input.generationId}`),
      body: JSON.stringify(input),
    },
    audience,
  );
}

export function buildEnterpriseKnowledgeCandidate(
  audience: EnterprisePortalAudience,
  zoneId: string,
  baseRevision: number,
) {
  return requestJson<{ jobId: string }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/build`,
    { method: "POST", body: JSON.stringify({ baseRevision }) },
    audience,
  );
}

export function listEnterpriseKnowledgePublications(
  audience: EnterprisePortalAudience,
  zoneId: string,
) {
  return requestJson<{ items: EnterpriseKnowledgePublication[] }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/publications`,
    undefined,
    audience,
  );
}

export function rollbackEnterpriseKnowledgePublication(
  audience: EnterprisePortalAudience,
  zoneId: string,
  input: { baseRevision: number; publicationId: string },
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/rollback`,
    {
      method: "POST",
      headers: knowledgeIdempotencyHeaders(
        `knowledge-rollback-${zoneId}-${input.publicationId}-${input.baseRevision}`,
      ),
      body: JSON.stringify(input),
    },
    audience,
  );
}

export function enterpriseKnowledgeVersionDownloadUrl(
  audience: EnterprisePortalAudience,
  zoneId: string,
  versionId: string,
): string {
  return enterpriseApiPath(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/versions/${encodeURIComponent(versionId)}/download`,
  );
}

export function searchEnterpriseKnowledgeCandidate(
  audience: EnterprisePortalAudience,
  zoneId: string,
  query: string,
) {
  return requestJson<{ hits: Array<Record<string, unknown>> }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/preview-search`,
    { method: "POST", body: JSON.stringify({ query }) },
    audience,
  );
}

export function listEnterpriseKnowledgeMembers(audience: EnterprisePortalAudience, zoneId: string) {
  return requestJson<{
    items: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }>;
    revision: number;
  }>(`${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/members`, undefined, audience);
}

export function replaceEnterpriseKnowledgeMembers(
  audience: EnterprisePortalAudience,
  zoneId: string,
  baseRevision: number,
  members: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }>,
) {
  return requestJson<{
    zone: EnterpriseKnowledgeZone;
    items: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }>;
  }>(
    `${knowledgePrefix(audience)}/${encodeURIComponent(zoneId)}/members`,
    { method: "PUT", body: JSON.stringify({ baseRevision, members }) },
    audience,
  );
}

export function listEnterpriseKnowledgeAgentBindings(zoneId: string) {
  return requestJson<{ items: string[]; revision: number }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}/agents`,
    undefined,
    "admin",
  );
}

export function replaceEnterpriseKnowledgeAgentBindings(
  zoneId: string,
  baseRevision: number,
  agentResourceKeys: string[],
) {
  return requestJson<{ zone: EnterpriseKnowledgeZone; items: string[] }>(
    `${knowledgePrefix("admin")}/${encodeURIComponent(zoneId)}/agents`,
    { method: "PUT", body: JSON.stringify({ baseRevision, agentResourceKeys }) },
    "admin",
  );
}

export function loadEnterpriseKnowledgeReadiness(audience: EnterprisePortalAudience) {
  return requestJson<EnterpriseKnowledgeReadiness>(
    `${knowledgePrefix(audience)}/readiness`,
    undefined,
    audience,
  );
}

export function loadEnterpriseKnowledgeDoctor() {
  return requestJson<{ report: EnterpriseKnowledgeDoctorReport }>(
    `${knowledgePrefix("admin")}/doctor`,
    undefined,
    "admin",
  );
}

export function listEnterpriseKnowledgeActivity(limit = 100) {
  return requestJson<{ items: EnterpriseKnowledgeAuditEvent[] }>(
    `${knowledgePrefix("admin")}/activity${queryString({ limit })}`,
    undefined,
    "admin",
  );
}

function queryString(values: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}
