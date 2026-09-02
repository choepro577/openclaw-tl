import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  KNOWLEDGE_GRAPH_EDGE_KINDS,
  KNOWLEDGE_GRAPH_NODE_KINDS,
  KNOWLEDGE_GRAPH_ORIGINS,
  KNOWLEDGE_GRAPH_REVIEW_STATUSES,
  type KnowledgeGraphEdgeKind,
} from "@openclaw/knowledge-graph-core";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import {
  auditMutation,
  integerField,
  readJson,
  requestId,
  ROLE_LEVEL,
  sendIdempotentMutation,
  sendJson,
  stringField,
  type JsonObject,
  type KnowledgeAudience,
} from "./enterprise-knowledge-http-common.js";
import {
  compareKnowledgeGraphs,
  readKnowledgeGraphNeighborhood,
  readKnowledgeGraphAnalysisSummary,
  readKnowledgeGraphNodeDetail,
  readKnowledgeGraphSummary,
  resolveKnowledgeGraphEdgeForReview,
  resolveKnowledgeGraphNodeCanonicalKey,
  searchKnowledgeGraphNodes,
} from "./graph-query.js";
import { verifyKnowledgeCitationReference } from "./index-store.js";
import {
  createKnowledgeGraphManualEdge,
  deleteKnowledgeGraphManualEdge,
  getKnowledgeGraphSettings,
  listKnowledgeGraphManualEdges,
  listKnowledgeGraphReviewOverlays,
  applyKnowledgeGraphReviewDecisions,
  updateKnowledgeGraphSettings,
  updateKnowledgeGraphManualEdge,
} from "./knowledge-graph-control-store.js";
import {
  createKnowledgeGraphExport,
  getKnowledgeGraphExport,
  readKnowledgeGraphExportDownload,
} from "./knowledge-graph-export.js";
import { resolveKnowledgeGraphSnapshotContext } from "./knowledge-graph-service.js";
import { enqueueKnowledgeZoneBuild } from "./knowledge-store.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeGraphReviewDecision,
  type KnowledgeGraphSnapshot,
  type KnowledgeLocator,
  type KnowledgeZone,
  type KnowledgeZoneRole,
} from "./knowledge-types.js";

function stringArray<T extends string>(
  query: URLSearchParams,
  name: string,
  allowed: readonly T[],
): T[] | undefined {
  const raw = query.get(name);
  if (!raw) {
    return undefined;
  }
  const values = raw.split(",").filter((value): value is T => allowed.includes(value as T));
  return values.length ? values : undefined;
}

function snapshotFromQuery(
  query: URLSearchParams,
  role: KnowledgeZoneRole,
  audience: KnowledgeAudience,
): KnowledgeGraphSnapshot {
  const requested = query.get("snapshot") === "candidate" ? "candidate" : "active";
  if (requested === "candidate" && audience !== "admin" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge graph not found.");
  }
  return requested;
}

function requireCurator(role: KnowledgeZoneRole, audience: KnowledgeAudience): void {
  if (audience !== "admin" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge graph not found.");
  }
}

function requireManager(role: KnowledgeZoneRole, audience: KnowledgeAudience): void {
  if (audience !== "admin" && ROLE_LEVEL[role] < ROLE_LEVEL.manager) {
    throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Manager access is required.");
  }
}

function objectArray(body: JsonObject, key: string): JsonObject[] {
  const raw = body[key];
  if (
    !Array.isArray(raw) ||
    !raw.every((item) => item && typeof item === "object" && !Array.isArray(item))
  ) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, `${key} is invalid.`);
  }
  return raw as JsonObject[];
}

function parseLocator(value: unknown): KnowledgeLocator {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "evidenceLocator is invalid.");
  }
  const locator = value as Record<string, unknown>;
  if (!["page", "docx", "sheet", "slide", "ocr", "text"].includes(String(locator.kind))) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "evidenceLocator is invalid.");
  }
  return locator as KnowledgeLocator;
}

function privacyHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function handleEnterpriseKnowledgeGraphHttpRoutes(params: {
  req: IncomingMessage;
  res: ServerResponse;
  audience: KnowledgeAudience;
  principal: EnterprisePrincipal;
  role: KnowledgeZoneRole;
  zone: KnowledgeZone;
  parts: string[];
}): Promise<boolean> {
  const { req, res, audience, principal, role, zone, parts } = params;
  if (parts[1] !== "graph") {
    return false;
  }
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;

  if (parts[2] === "settings" && parts.length === 3 && req.method === "GET") {
    if (audience !== "admin") {
      throw new EnterpriseKnowledgeError(
        "FORBIDDEN",
        403,
        "Only an administrator can view graph policy.",
      );
    }
    return sendJson(res, 200, {
      settings: getKnowledgeGraphSettings(zone.id),
      revision: zone.revision,
    });
  }
  if (parts[2] === "settings" && parts.length === 3 && req.method === "PATCH") {
    if (audience !== "admin") {
      throw new EnterpriseKnowledgeError(
        "FORBIDDEN",
        403,
        "Only an administrator can change graph policy.",
      );
    }
    const body = await readJson(req);
    const updated = updateKnowledgeGraphSettings(
      zone.id,
      {
        baseRevision: integerField(body, "baseRevision"),
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        enrichmentEnabled:
          typeof body.enrichmentEnabled === "boolean" ? body.enrichmentEnabled : undefined,
        autoApprovalThreshold:
          typeof body.autoApprovalThreshold === "number" ? body.autoApprovalThreshold : undefined,
      },
      principal.account.id,
    );
    const jobId = updated.settings.enabled
      ? enqueueKnowledgeZoneBuild(zone.id, principal.account.id)
      : null;
    auditMutation({
      principal,
      action: "knowledge.graph.settings.update",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: {
        enabled: updated.settings.enabled,
        enrichmentEnabled: updated.settings.enrichmentEnabled,
        autoApprovalThreshold: updated.settings.autoApprovalThreshold,
        buildRevision: updated.zone.buildRevision,
      },
    });
    return sendJson(res, 200, { ...updated, jobId });
  }

  const snapshot = snapshotFromQuery(query, role, audience);
  const context = () => resolveKnowledgeGraphSnapshotContext({ zoneId: zone.id, snapshot });

  if (parts[2] === "summary" && parts.length === 3 && req.method === "GET") {
    return sendJson(res, 200, { summary: readKnowledgeGraphSummary(context()) });
  }
  if (parts[2] === "analysis-summary" && parts.length === 3 && req.method === "GET") {
    return sendJson(res, 200, {
      analysis: readKnowledgeGraphAnalysisSummary(context()),
    });
  }
  if (parts[2] === "search" && parts.length === 3 && req.method === "GET") {
    const graphContext = context();
    const searchQuery = query.get("query") ?? "";
    const nodes = searchKnowledgeGraphNodes(graphContext, {
      query: searchQuery,
      limit: Number(query.get("limit") ?? 100),
      kinds: stringArray(query, "nodeKinds", KNOWLEDGE_GRAPH_NODE_KINDS),
    });
    const summary = readKnowledgeGraphSummary(graphContext);
    auditMutation({
      principal,
      action: "knowledge.graph.search",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: {
        snapshot,
        queryHash: privacyHash(searchQuery),
        resultCount: nodes.length,
        generationIdHash: privacyHash(graphContext.generationId),
      },
    });
    return sendJson(res, 200, { summary, nodes });
  }
  if (parts[2] === "neighborhood" && parts.length === 3 && req.method === "GET") {
    const startedAt = Date.now();
    const graph = readKnowledgeGraphNeighborhood(context(), {
      nodeRef: query.get("nodeRef") ?? undefined,
      depth: Number(query.get("depth") ?? 1),
      nodeLimit: Number(query.get("nodeLimit") ?? 100),
      edgeLimit: Number(query.get("edgeLimit") ?? 300),
      nodeKinds: stringArray(query, "nodeKinds", KNOWLEDGE_GRAPH_NODE_KINDS),
      edgeKinds: stringArray(query, "edgeKinds", KNOWLEDGE_GRAPH_EDGE_KINDS),
      origins: stringArray(query, "origins", KNOWLEDGE_GRAPH_ORIGINS),
      reviewStatuses: stringArray(query, "reviewStatuses", KNOWLEDGE_GRAPH_REVIEW_STATUSES),
      minConfidence: Number(query.get("minConfidence") ?? 0),
    });
    auditMutation({
      principal,
      action: "knowledge.graph.view",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: {
        snapshot,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        depth: graph.depth,
        truncated: graph.truncated,
        latencyMs: Date.now() - startedAt,
      },
    });
    return sendJson(res, 200, graph);
  }
  if (parts[2] === "nodes" && parts[3] && parts.length === 4 && req.method === "GET") {
    return sendJson(res, 200, { node: readKnowledgeGraphNodeDetail(context(), parts[3]) });
  }
  if (parts[2] === "diff" && parts.length === 3 && req.method === "GET") {
    requireCurator(role, audience);
    return sendJson(res, 200, {
      diff: compareKnowledgeGraphs(
        resolveKnowledgeGraphSnapshotContext({ zoneId: zone.id, snapshot: "active" }),
        resolveKnowledgeGraphSnapshotContext({ zoneId: zone.id, snapshot: "candidate" }),
      ),
    });
  }
  if (parts[2] === "reviews" && parts.length === 3 && req.method === "GET") {
    requireCurator(role, audience);
    const candidate = resolveKnowledgeGraphSnapshotContext({
      zoneId: zone.id,
      snapshot: "candidate",
    });
    const queue = readKnowledgeGraphNeighborhood(candidate, {
      reviewStatuses: ["proposed"],
      nodeLimit: Number(query.get("nodeLimit") ?? 200),
      edgeLimit: Number(query.get("edgeLimit") ?? 300),
    });
    return sendJson(res, 200, {
      queue,
      decisions: listKnowledgeGraphReviewOverlays(zone.id),
      revision: zone.revision,
    });
  }
  if (
    parts[2] === "reviews" &&
    parts[3] === "batch" &&
    parts.length === 4 &&
    req.method === "POST"
  ) {
    requireCurator(role, audience);
    const body = await readJson(req);
    const candidate = resolveKnowledgeGraphSnapshotContext({
      zoneId: zone.id,
      snapshot: "candidate",
    });
    const decisions = objectArray(body, "decisions").map((item) => {
      const edgeRef = stringField(item, "edgeRef", 4_000);
      const decision = stringField(
        item,
        "decision",
        32,
      ) as KnowledgeGraphReviewDecision["decision"];
      if (!["approve", "reject", "change_kind"].includes(decision)) {
        throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "Review decision is invalid.");
      }
      const edge = resolveKnowledgeGraphEdgeForReview(candidate, edgeRef);
      return {
        edgeRef,
        decision,
        edgeKind:
          typeof item.edgeKind === "string" ? (item.edgeKind as KnowledgeGraphEdgeKind) : undefined,
        note: typeof item.note === "string" ? item.note : undefined,
        fingerprint: edge.fingerprint,
        evidenceHash: edge.evidenceHash,
      };
    });
    const updated = applyKnowledgeGraphReviewDecisions(zone.id, {
      baseRevision: integerField(body, "baseRevision"),
      decisions,
      actorAccountId: principal.account.id,
    });
    const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.graph.review.batch",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: { count: decisions.length, buildRevision: updated.buildRevision },
    });
    return sendJson(res, 202, { zone: updated, jobId });
  }
  if (parts[2] === "manual-edges" && parts.length === 3 && req.method === "GET") {
    requireCurator(role, audience);
    return sendJson(res, 200, {
      items: listKnowledgeGraphManualEdges(zone.id),
      revision: zone.revision,
    });
  }
  if (parts[2] === "manual-edges" && parts.length === 3 && req.method === "POST") {
    requireCurator(role, audience);
    const body = await readJson(req);
    const candidate = resolveKnowledgeGraphSnapshotContext({
      zoneId: zone.id,
      snapshot: "candidate",
    });
    const sourceNodeRef = stringField(body, "sourceNodeRef", 4_000);
    const targetNodeRef = stringField(body, "targetNodeRef", 4_000);
    const citationId = stringField(body, "evidenceCitationId", 4_000);
    const citation = verifyKnowledgeCitationReference(citationId);
    if (
      !citation ||
      citation.zoneId !== zone.id ||
      citation.generationId !== candidate.generationId
    ) {
      throw new EnterpriseKnowledgeError("EVIDENCE_NOT_FOUND", 404, "Evidence not found.");
    }
    const created = createKnowledgeGraphManualEdge(
      zone.id,
      {
        baseRevision: integerField(body, "baseRevision"),
        sourceCanonicalKey: resolveKnowledgeGraphNodeCanonicalKey(candidate, sourceNodeRef),
        targetCanonicalKey: resolveKnowledgeGraphNodeCanonicalKey(candidate, targetNodeRef),
        edgeKind: stringField(body, "edgeKind", 64),
        evidenceSourceVersionId: citation.sourceVersionId,
        evidenceSegmentId: citation.segmentId,
        evidenceLocator: parseLocator(body.evidenceLocator),
        note: typeof body.note === "string" ? body.note : undefined,
      },
      principal.account.id,
    );
    const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.graph.manual.create",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: { edgeKind: created.edge.edgeKind, buildRevision: created.zone.buildRevision },
    });
    return sendJson(res, 202, { ...created, jobId });
  }
  if (parts[2] === "manual-edges" && parts[3] && parts.length === 4 && req.method === "PATCH") {
    requireCurator(role, audience);
    const body = await readJson(req);
    const candidate = resolveKnowledgeGraphSnapshotContext({
      zoneId: zone.id,
      snapshot: "candidate",
    });
    const citation = verifyKnowledgeCitationReference(
      stringField(body, "evidenceCitationId", 4_000),
    );
    if (
      !citation ||
      citation.zoneId !== zone.id ||
      citation.generationId !== candidate.generationId
    ) {
      throw new EnterpriseKnowledgeError("EVIDENCE_NOT_FOUND", 404, "Evidence not found.");
    }
    const updated = updateKnowledgeGraphManualEdge(
      zone.id,
      parts[3],
      {
        baseRevision: integerField(body, "baseRevision"),
        edgeRevision: integerField(body, "edgeRevision"),
        sourceCanonicalKey: resolveKnowledgeGraphNodeCanonicalKey(
          candidate,
          stringField(body, "sourceNodeRef", 4_000),
        ),
        targetCanonicalKey: resolveKnowledgeGraphNodeCanonicalKey(
          candidate,
          stringField(body, "targetNodeRef", 4_000),
        ),
        edgeKind: stringField(body, "edgeKind", 64),
        evidenceSourceVersionId: citation.sourceVersionId,
        evidenceSegmentId: citation.segmentId,
        evidenceLocator: parseLocator(body.evidenceLocator),
        note: typeof body.note === "string" ? body.note : undefined,
      },
      principal.account.id,
    );
    const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.graph.manual.update",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: { edgeKind: updated.edge.edgeKind, buildRevision: updated.zone.buildRevision },
    });
    return sendJson(res, 202, { ...updated, jobId });
  }
  if (parts[2] === "manual-edges" && parts[3] && parts.length === 4 && req.method === "DELETE") {
    requireCurator(role, audience);
    const body = await readJson(req);
    const updated = deleteKnowledgeGraphManualEdge(zone.id, parts[3], {
      baseRevision: integerField(body, "baseRevision"),
      edgeRevision: integerField(body, "edgeRevision"),
      actorAccountId: principal.account.id,
    });
    const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.graph.manual.delete",
      targetType: "knowledge_zone",
      targetId: zone.id,
      req,
      after: { count: 1, buildRevision: updated.buildRevision },
    });
    return sendJson(res, 202, { zone: updated, jobId });
  }
  if (parts[2] === "exports" && parts.length === 3 && req.method === "POST") {
    requireManager(role, audience);
    const body = await readJson(req);
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `graph.export:${zone.id}`,
      request: body,
      execute: async () => {
        const exportRecord = await createKnowledgeGraphExport({
          zoneId: zone.id,
          actorAccountId: principal.account.id,
          idempotencyKey: requestId(req),
        });
        auditMutation({
          principal,
          action: "knowledge.graph.export.complete",
          targetType: "knowledge_graph_export",
          targetId: exportRecord.id,
          req,
          after: {
            status: exportRecord.status,
            entryCount: exportRecord.entryCount,
            uncompressedBytes: exportRecord.uncompressedBytes,
          },
        });
        return { status: 201, response: { export: exportRecord } };
      },
    });
  }
  if (parts[2] === "exports" && parts[3] && parts.length === 4 && req.method === "GET") {
    requireManager(role, audience);
    const record = getKnowledgeGraphExport(parts[3], {
      zoneId: zone.id,
      actorAccountId: principal.account.id,
    });
    if (!record) {
      throw new EnterpriseKnowledgeError("GRAPH_EXPORT_NOT_FOUND", 404, "Graph export not found.");
    }
    return sendJson(res, 200, { export: record });
  }
  if (
    parts[2] === "exports" &&
    parts[3] &&
    parts[4] === "download" &&
    parts.length === 5 &&
    req.method === "GET"
  ) {
    requireManager(role, audience);
    const download = await readKnowledgeGraphExportDownload(parts[3], {
      zoneId: zone.id,
      actorAccountId: principal.account.id,
    });
    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zone.slug}-obsidian.zip"`);
    res.setHeader("Content-Length", String(download.buffer.byteLength));
    res.end(download.buffer);
    return true;
  }
  return false;
}
