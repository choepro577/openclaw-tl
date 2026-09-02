import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { appendEnterpriseAuditEvent, listEnterpriseAuditEvents } from "../audit/audit-store.js";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import {
  deleteKnowledgeBlobIfPresent,
  deleteKnowledgeZoneIndexesIfPresent,
  deleteNormalizedKnowledgeArtifactIfPresent,
} from "./artifact-store.js";
import { createEnterpriseKnowledgeEmbeddingRuntime } from "./embedding-runtime.js";
import {
  ROLE_LEVEL,
  auditMutation,
  integerField,
  readJson,
  requestId,
  requireMutationCsrf,
  requirePrincipal,
  requireZoneAccess,
  routeParts,
  sendError,
  sendIdempotentMutation,
  sendJson,
  stringField,
  type JsonObject,
  type KnowledgeAudience,
} from "./enterprise-knowledge-http-common.js";
import { handleEnterpriseKnowledgeGraphHttpRoutes } from "./enterprise-knowledge-http-graph-routes.js";
import { handleEnterpriseKnowledgeSourceHttpRoutes } from "./enterprise-knowledge-http-source-routes.js";
import { resolveKnowledgeGraphEnrichmentProvider } from "./graph-enrichment-provider.js";
import { readKnowledgeGraphSummary } from "./graph-query.js";
import { searchKnowledgeGenerationIndex } from "./index-store.js";
import { doctorEnterpriseKnowledge } from "./knowledge-doctor.js";
import { getKnowledgeGraphSettings } from "./knowledge-graph-control-store.js";
import { resolveKnowledgeGraphSnapshotContext } from "./knowledge-graph-service.js";
import {
  createKnowledgeZone,
  cancelKnowledgeJob,
  enqueueKnowledgeZoneBuild,
  getKnowledgeZone,
  getKnowledgeJob,
  getEnterpriseKnowledgeChangeFeedBounds,
  getLatestKnowledgeCandidate,
  isKnowledgeArtifactReferenced,
  listKnowledgeAgentBindings,
  listKnowledgeJobs,
  listKnowledgeJobSteps,
  listEnterpriseKnowledgeChanges,
  listKnowledgePublications,
  listKnowledgeSources,
  listKnowledgeZoneMemberships,
  listKnowledgeZones,
  publishKnowledgeCandidate,
  previewKnowledgeZonePurge,
  purgeKnowledgeZone,
  retryKnowledgeJob,
  replaceKnowledgeAgentBindings,
  replaceKnowledgeZoneMemberships,
  rollbackKnowledgePublication,
  setKnowledgeZoneArchived,
  updateKnowledgeZone,
} from "./knowledge-store.js";
import { EnterpriseKnowledgeError, type KnowledgeZoneRole } from "./knowledge-types.js";
import { resolveEnterpriseKnowledgeOcrProvider } from "./ocr-provider.js";

const ADMIN_PREFIX = "/api/enterprise/admin/knowledge";
const USER_PREFIX = "/api/enterprise/user/v2/knowledge";

export async function handleEnterpriseKnowledgeHttpRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  config: OpenClawConfig;
  pathname: string;
}): Promise<boolean> {
  const { req, res, pathname } = params;
  const audience: KnowledgeAudience | undefined = pathname.startsWith(ADMIN_PREFIX)
    ? "admin"
    : pathname.startsWith(USER_PREFIX)
      ? "user"
      : undefined;
  if (!audience) {
    return false;
  }
  const prefix = audience === "admin" ? ADMIN_PREFIX : USER_PREFIX;
  const parts = routeParts(pathname, prefix);
  let principal: EnterprisePrincipal | undefined;
  try {
    principal = requirePrincipal(req, audience);
    const actor = principal;
    requireMutationCsrf(req, principal, audience);
    const query = new URL(req.url ?? "/", "http://localhost").searchParams;

    if (parts.length === 0 && req.method === "GET") {
      const result = listKnowledgeZones({
        ...(audience === "user" ? { accountId: principal.account.id } : {}),
        includeArchived: audience === "admin" && query.get("includeArchived") === "true",
        limit: Number(query.get("limit") ?? 50),
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      });
      return sendJson(res, 200, result);
    }
    if (parts[0] === "changes" && parts.length === 1 && req.method === "GET") {
      const requestedZoneId = query.get("zoneId")?.trim() || undefined;
      let changeFeedRole: KnowledgeZoneRole = "manager";
      if (audience === "user") {
        if (!requestedZoneId) {
          throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "zoneId is required.");
        }
        changeFeedRole = requireZoneAccess(requestedZoneId, principal, audience, "viewer");
      } else if (requestedZoneId) {
        requireZoneAccess(requestedZoneId, principal, audience, "viewer");
      }
      const afterSequence = Number(query.get("afterSequence") ?? 0);
      if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
        throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "afterSequence is invalid.");
      }
      const scanned = listEnterpriseKnowledgeChanges({
        afterSequence,
        ...(requestedZoneId ? { zoneId: requestedZoneId } : {}),
        limit: Number(query.get("limit") ?? 200),
      });
      const items =
        audience === "user" && changeFeedRole === "viewer"
          ? scanned.filter((item) => ["publication", "graph"].includes(item.entityType))
          : scanned;
      const bounds = getEnterpriseKnowledgeChangeFeedBounds(requestedZoneId);
      return sendJson(res, 200, {
        items,
        lastSequence: scanned.at(-1)?.sequence ?? Math.max(afterSequence, bounds.lastSequence),
        gap:
          afterSequence > 0 && bounds.firstSequence > 0 && afterSequence + 1 < bounds.firstSequence,
      });
    }
    if (
      parts[0] === "graph" &&
      parts[1] === "overview" &&
      parts.length === 2 &&
      req.method === "GET"
    ) {
      const zones = listKnowledgeZones({
        ...(audience === "user" ? { accountId: principal.account.id } : {}),
        includeArchived: false,
        limit: 100,
      }).items;
      const clusters = zones.flatMap((zone) => {
        try {
          const summary = readKnowledgeGraphSummary(
            resolveKnowledgeGraphSnapshotContext({ zoneId: zone.id, snapshot: "active" }),
          );
          return [
            { zoneId: zone.id, zoneSlug: zone.slug, zoneName: zone.name, role: zone.role, summary },
          ];
        } catch (error) {
          if (
            error instanceof EnterpriseKnowledgeError &&
            ["GRAPH_NOT_BUILT", "PUBLICATION_NOT_FOUND"].includes(error.code)
          ) {
            return [];
          }
          throw error;
        }
      });
      return sendJson(res, 200, {
        clusters,
        totals: {
          zones: clusters.length,
          nodes: clusters.reduce((sum, cluster) => sum + cluster.summary.nodeCount, 0),
          edges: clusters.reduce((sum, cluster) => sum + cluster.summary.edgeCount, 0),
        },
      });
    }
    if (parts.length === 0 && req.method === "POST") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can create a zone.",
        );
      }
      const body = await readJson(req);
      const graphBody =
        body.graph && typeof body.graph === "object" && !Array.isArray(body.graph)
          ? (body.graph as JsonObject)
          : undefined;
      return await sendIdempotentMutation({
        req,
        res,
        audience,
        principal,
        operation: "zone.create",
        request: body,
        execute: () => {
          const zone = createKnowledgeZone(
            {
              slug: stringField(body, "slug", 64),
              name: stringField(body, "name", 160),
              description: typeof body.description === "string" ? body.description : undefined,
              egressPolicy:
                body.egressPolicy === "external_allowed" ? "external_allowed" : "local_only",
              graph: {
                enabled:
                  typeof graphBody?.enabled === "boolean"
                    ? graphBody.enabled
                    : params.config.enterprise?.knowledge?.graph?.enabled === true,
                enrichmentEnabled:
                  typeof graphBody?.enrichmentEnabled === "boolean"
                    ? graphBody.enrichmentEnabled
                    : true,
                autoApprovalThreshold:
                  typeof graphBody?.autoApprovalThreshold === "number"
                    ? graphBody.autoApprovalThreshold
                    : 0.92,
              },
            },
            actor.account.id,
          );
          auditMutation({
            principal: actor,
            action: "knowledge.zone.create",
            targetType: "knowledge_zone",
            targetId: zone.id,
            req,
            after: zone,
          });
          return { status: 201, response: { zone } };
        },
      });
    }
    if (parts[0] === "readiness" && parts.length === 1 && req.method === "GET") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Administrator access is required.");
      }
      const embedding = await createEnterpriseKnowledgeEmbeddingRuntime({
        config: params.config,
        externalAllowed: true,
      });
      const vectorReady = !embedding.unavailableReason;
      const vectorStatus = embedding.unavailableReason ?? "configured";
      await embedding.close();
      const ocrProvider = await resolveEnterpriseKnowledgeOcrProvider({
        config: params.config,
        allowRemoteFallback: true,
      });
      const graphEnrichment = await resolveKnowledgeGraphEnrichmentProvider({
        config: params.config,
        allowRemoteFallback: true,
      });
      return sendJson(res, 200, {
        worker: { ready: true, concurrency: 2, leaseSeconds: 60 },
        lexical: { ready: true, backend: "sqlite-fts5" },
        vector: {
          ready: vectorReady,
          status: vectorStatus,
          provider: params.config.memory?.search?.provider ?? null,
          model: params.config.memory?.search?.model ?? null,
        },
        ocr: {
          ready: Boolean(ocrProvider),
          provider: ocrProvider?.id ?? null,
          transport: ocrProvider?.transport ?? null,
        },
        graph: {
          enabled: params.config.enterprise?.knowledge?.graph?.enabled === true,
          aiAnalysis: params.config.enterprise?.knowledge?.graph?.aiAnalysis ?? "off",
          agentExpansion: params.config.enterprise?.knowledge?.graph?.agentExpansion ?? "off",
          enrichmentReady: Boolean(graphEnrichment),
          enrichmentProvider: graphEnrichment?.id ?? null,
          enrichmentTransport: graphEnrichment?.transport ?? null,
          maxConcurrentZoneBuilds:
            params.config.enterprise?.knowledge?.graph?.maxConcurrentZoneBuilds ?? 1,
          maxConcurrentAiCallsPerZone:
            params.config.enterprise?.knowledge?.graph?.maxConcurrentAiCallsPerZone ?? 2,
        },
      });
    }
    if (parts[0] === "doctor" && parts.length === 1 && req.method === "GET") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Administrator access is required.");
      }
      return sendJson(res, 200, { report: await doctorEnterpriseKnowledge({}) });
    }
    if (parts[0] === "activity" && parts.length === 1 && req.method === "GET") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Administrator access is required.");
      }
      return sendJson(res, 200, {
        items: listEnterpriseAuditEvents(Number(query.get("limit") ?? 100)),
      });
    }

    const zoneId = parts[0];
    if (!zoneId) {
      throw new EnterpriseKnowledgeError("NOT_FOUND", 404, "Endpoint not found.");
    }
    const minimum: KnowledgeZoneRole = req.method === "GET" ? "viewer" : "curator";
    const role = requireZoneAccess(zoneId, principal, audience, minimum);
    const zone = getKnowledgeZone(zoneId)!;

    if (parts.length === 1 && req.method === "GET") {
      return sendJson(res, 200, {
        zone,
        role,
        candidate:
          audience === "admin" || ROLE_LEVEL[role] >= ROLE_LEVEL.curator
            ? getLatestKnowledgeCandidate(zone.id)
            : null,
        counts: {
          sources: listKnowledgeSources(zone.id).length,
          jobs: listKnowledgeJobs(zone.id).filter((job) =>
            ["queued", "running", "retry_wait"].includes(job.status),
          ).length,
          bindings: audience === "admin" ? listKnowledgeAgentBindings(zone.id).length : undefined,
        },
        ...(audience === "admin" ? { graphSettings: getKnowledgeGraphSettings(zone.id) } : {}),
      });
    }
    if (parts.length === 1 && req.method === "PATCH") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can update zone policy.",
        );
      }
      const body = await readJson(req);
      const updated = updateKnowledgeZone(
        zone.id,
        {
          baseRevision: integerField(body, "baseRevision"),
          name: typeof body.name === "string" ? body.name : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          egressPolicy:
            body.egressPolicy === "external_allowed" || body.egressPolicy === "local_only"
              ? body.egressPolicy
              : undefined,
        },
        principal.account.id,
      );
      auditMutation({
        principal,
        action: "knowledge.zone.update",
        targetType: "knowledge_zone",
        targetId: zone.id,
        req,
        after: updated,
      });
      const jobId = getKnowledgeGraphSettings(zone.id).enabled
        ? enqueueKnowledgeZoneBuild(zone.id, principal.account.id)
        : null;
      return sendJson(res, 200, { zone: updated, jobId });
    }
    if (
      (parts[1] === "archive" || parts[1] === "restore") &&
      parts.length === 2 &&
      req.method === "POST"
    ) {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can archive a zone.",
        );
      }
      const body = await readJson(req);
      const updated = setKnowledgeZoneArchived(
        zone.id,
        parts[1] === "archive",
        integerField(body, "baseRevision"),
        principal.account.id,
      );
      auditMutation({
        principal,
        action: `knowledge.zone.${parts[1]}`,
        targetType: "knowledge_zone",
        targetId: zone.id,
        req,
        after: updated,
      });
      return sendJson(res, 200, { zone: updated });
    }
    if (parts[1] === "purge-preview" && parts.length === 2 && req.method === "GET") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can preview a Zone purge.",
        );
      }
      return sendJson(res, 200, { preview: previewKnowledgeZonePurge(zone.id) });
    }
    if (parts.length === 1 && req.method === "DELETE") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can permanently purge a Zone.",
        );
      }
      const body = await readJson(req);
      return await sendIdempotentMutation({
        req,
        res,
        audience,
        principal,
        operation: `zone.purge:${zone.id}`,
        request: body,
        execute: async () => {
          const artifacts = purgeKnowledgeZone({
            zoneId: zone.id,
            baseRevision: integerField(body, "baseRevision"),
            confirmation: stringField(body, "confirmation", 64),
          });
          // Recheck refcounts after the metadata transaction. CAS bytes are
          // shared physically only; a still-referenced object is never removed.
          for (const hash of artifacts.blobHashes) {
            if (!isKnowledgeArtifactReferenced("blob", hash)) {
              await deleteKnowledgeBlobIfPresent(hash);
            }
          }
          for (const hash of artifacts.normalizedArtifactHashes) {
            if (!isKnowledgeArtifactReferenced("normalized", hash)) {
              await deleteNormalizedKnowledgeArtifactIfPresent(hash);
            }
          }
          await deleteKnowledgeZoneIndexesIfPresent(zone.id);
          auditMutation({
            principal: actor,
            action: "knowledge.zone.purge",
            targetType: "knowledge_zone",
            targetId: zone.id,
            req,
            after: {
              slug: zone.slug,
              deletedBlobCandidates: artifacts.blobHashes.length,
              deletedNormalizedCandidates: artifacts.normalizedArtifactHashes.length,
              deletedGenerations: artifacts.generationIds.length,
            },
          });
          return { status: 200, response: { ok: true } };
        },
      });
    }
    if (parts[1] === "members" && parts.length === 2 && req.method === "GET") {
      if (audience === "user" && role !== "manager") {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      return sendJson(res, 200, {
        items: listKnowledgeZoneMemberships(zone.id),
        revision: zone.revision,
      });
    }
    if (parts[1] === "members" && parts.length === 2 && req.method === "PUT") {
      if (audience === "user" && role !== "manager") {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      const body = await readJson(req);
      if (!Array.isArray(body.members)) {
        throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "members is invalid.");
      }
      const members = body.members.map((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "members is invalid.");
        }
        // SAFETY: object validation above excludes null and array values.
        const item = value as JsonObject;
        return {
          accountId: stringField(item, "accountId", 128),
          // SAFETY: the role is validated against the role allowlist immediately below.
          role: stringField(item, "role", 16) as KnowledgeZoneRole,
        };
      });
      const updated = replaceKnowledgeZoneMemberships(
        zone.id,
        members,
        integerField(body, "baseRevision"),
        principal.account.id,
        audience === "admin",
      );
      auditMutation({
        principal,
        action: "knowledge.members.replace",
        targetType: "knowledge_zone",
        targetId: zone.id,
        req,
        after: { count: members.length },
      });
      return sendJson(res, 200, { zone: updated, items: listKnowledgeZoneMemberships(zone.id) });
    }
    if (parts[1] === "agents" && parts.length === 2 && req.method === "GET") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can view Agent bindings.",
        );
      }
      return sendJson(res, 200, {
        items: listKnowledgeAgentBindings(zone.id),
        revision: zone.revision,
      });
    }
    if (parts[1] === "agents" && parts.length === 2 && req.method === "PUT") {
      if (audience !== "admin") {
        throw new EnterpriseKnowledgeError(
          "FORBIDDEN",
          403,
          "Only an administrator can bind Agents.",
        );
      }
      const body = await readJson(req);
      if (
        !Array.isArray(body.agentResourceKeys) ||
        !body.agentResourceKeys.every((value) => typeof value === "string")
      ) {
        throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, "agentResourceKeys is invalid.");
      }
      const updated = replaceKnowledgeAgentBindings(
        zone.id,
        body.agentResourceKeys,
        integerField(body, "baseRevision"),
        principal.account.id,
      );
      auditMutation({
        principal,
        action: "knowledge.bindings.replace",
        targetType: "knowledge_zone",
        targetId: zone.id,
        req,
        after: { count: body.agentResourceKeys.length, accessRevision: updated.accessRevision },
      });
      return sendJson(res, 200, { zone: updated, items: listKnowledgeAgentBindings(zone.id) });
    }
    if (
      await handleEnterpriseKnowledgeGraphHttpRoutes({
        req,
        res,
        audience,
        principal,
        role,
        zone,
        parts,
      })
    ) {
      return true;
    }
    if (
      await handleEnterpriseKnowledgeSourceHttpRoutes({
        req,
        res,
        audience,
        principal,
        actor,
        role,
        zone,
        parts,
      })
    ) {
      return true;
    }
    if (parts[1] === "jobs" && parts.length === 2 && req.method === "GET") {
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      return sendJson(res, 200, { items: listKnowledgeJobs(zone.id) });
    }
    if (parts[1] === "jobs" && parts[2] && parts.length === 3 && req.method === "GET") {
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      const job = getKnowledgeJob(parts[2], zone.id);
      if (!job) {
        throw new EnterpriseKnowledgeError("JOB_NOT_FOUND", 404, "Knowledge job not found.");
      }
      return sendJson(res, 200, { job, steps: listKnowledgeJobSteps(job.id, zone.id) });
    }
    if (
      parts[1] === "jobs" &&
      parts[2] &&
      parts[3] === "steps" &&
      parts.length === 4 &&
      req.method === "GET"
    ) {
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      const job = getKnowledgeJob(parts[2], zone.id);
      if (!job) {
        throw new EnterpriseKnowledgeError("JOB_NOT_FOUND", 404, "Knowledge job not found.");
      }
      return sendJson(res, 200, { items: listKnowledgeJobSteps(job.id, zone.id) });
    }
    if (parts[1] === "publications" && parts.length === 2 && req.method === "GET") {
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      return sendJson(res, 200, { items: listKnowledgePublications(zone.id) });
    }
    if (
      parts[1] === "jobs" &&
      parts[3] === "cancel" &&
      parts.length === 4 &&
      req.method === "POST"
    ) {
      await readJson(req);
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      const job = cancelKnowledgeJob(parts[2]!, zone.id);
      auditMutation({
        principal,
        action: "knowledge.job.cancel",
        targetType: "knowledge_job",
        targetId: job.id,
        req,
        after: { status: job.status },
      });
      return sendJson(res, 200, { job });
    }
    if (
      parts[1] === "jobs" &&
      parts[3] === "retry" &&
      parts.length === 4 &&
      req.method === "POST"
    ) {
      const body = await readJson(req);
      if (audience === "user" && ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      return await sendIdempotentMutation({
        req,
        res,
        audience,
        principal,
        operation: `job.retry:${parts[2]}`,
        request: body,
        execute: () => {
          const job = retryKnowledgeJob(parts[2]!, zone.id, actor.account.id);
          auditMutation({
            principal: actor,
            action: "knowledge.job.retry",
            targetType: "knowledge_job",
            targetId: job.id,
            req,
            after: { status: job.status, pipelineGeneration: job.pipelineGeneration },
          });
          return { status: 202, response: { job } };
        },
      });
    }
    if (parts[1] === "build" && parts.length === 2 && req.method === "POST") {
      const body = await readJson(req);
      if (role !== "manager" && audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Manager access is required.");
      }
      if (integerField(body, "baseRevision") !== zone.revision) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed. Reload and retry.",
        );
      }
      const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
      return sendJson(res, 202, { jobId });
    }
    if (parts[1] === "preview-search" && parts.length === 2 && req.method === "POST") {
      if (ROLE_LEVEL[role] < ROLE_LEVEL.curator) {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Curator access is required.");
      }
      const body = await readJson(req);
      const candidate = getLatestKnowledgeCandidate(zone.id);
      if (!candidate) {
        throw new EnterpriseKnowledgeError(
          "CANDIDATE_NOT_READY",
          422,
          "No candidate generation is ready.",
        );
      }
      const queryText = stringField(body, "query", 2_000);
      const config = params.config;
      const embedding = await createEnterpriseKnowledgeEmbeddingRuntime({
        config,
        externalAllowed: zone.egressPolicy === "external_allowed",
      });
      let queryVector: number[] | undefined;
      try {
        if (!embedding.unavailableReason && candidate.vectorStatus === "ready") {
          queryVector = await embedding.embedQuery(queryText);
        }
      } catch {
        queryVector = undefined;
      }
      try {
        const hits = await searchKnowledgeGenerationIndex({
          zoneId: zone.id,
          zoneLabel: zone.name,
          generationId: candidate.id,
          publicationId: `candidate:${candidate.id}`,
          publishedAt: candidate.createdAt,
          query: queryText,
          queryVector,
          queryEmbeddingIdentity: embedding.identity ?? undefined,
          vectorExtensionPath: config.memory?.search?.store?.vector?.extensionPath,
          maxResults: Math.max(1, Math.min(Number(body.maxResults ?? 8), 20)),
        });
        return sendJson(res, 200, { hits, candidate });
      } finally {
        await embedding.close();
      }
    }
    if (parts[1] === "publish" && parts.length === 2 && req.method === "POST") {
      if (role !== "manager" && audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Manager access is required.");
      }
      const body = await readJson(req);
      return await sendIdempotentMutation({
        req,
        res,
        audience,
        principal,
        operation: `publish:${zone.id}`,
        request: body,
        execute: () => {
          const published = publishKnowledgeCandidate({
            zoneId: zone.id,
            baseRevision: integerField(body, "baseRevision"),
            generationId: stringField(body, "generationId", 128),
            degradedReason:
              typeof body.degradedReason === "string" ? body.degradedReason : undefined,
            actorAccountId: actor.account.id,
          });
          auditMutation({
            principal: actor,
            action: "knowledge.publish",
            targetType: "knowledge_publication",
            targetId: published.publicationId,
            req,
            after: published,
          });
          return { status: 201, response: published };
        },
      });
    }
    if (parts[1] === "rollback" && parts.length === 2 && req.method === "POST") {
      if (role !== "manager" && audience !== "admin") {
        throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Manager access is required.");
      }
      const body = await readJson(req);
      return await sendIdempotentMutation({
        req,
        res,
        audience,
        principal,
        operation: `rollback:${zone.id}`,
        request: body,
        execute: () => {
          const updated = rollbackKnowledgePublication({
            zoneId: zone.id,
            publicationId: stringField(body, "publicationId", 128),
            baseRevision: integerField(body, "baseRevision"),
            actorAccountId: actor.account.id,
          });
          auditMutation({
            principal: actor,
            action: "knowledge.rollback",
            targetType: "knowledge_zone",
            targetId: zone.id,
            req,
            after: { activePublicationId: updated.activePublicationId },
          });
          return { status: 200, response: { zone: updated } };
        },
      });
    }
    return sendError(req, res, 404, "NOT_FOUND", "Endpoint not found.");
  } catch (error) {
    const knowledgeError =
      error instanceof EnterpriseKnowledgeError
        ? error
        : error instanceof SyntaxError
          ? new EnterpriseKnowledgeError("BODY_INVALID", 422, "Request body is invalid.")
          : new EnterpriseKnowledgeError(
              "KNOWLEDGE_INTERNAL_ERROR",
              500,
              "Knowledge service encountered an error.",
            );
    if (principal && knowledgeError.status >= 400) {
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "knowledge.request",
        targetType: "knowledge_endpoint",
        targetId: pathname.slice(0, 256),
        requestId: requestId(req),
        before: null,
        after: { code: knowledgeError.code, method: req.method },
        outcome: "failure",
      });
    }
    return sendError(
      req,
      res,
      knowledgeError.status,
      knowledgeError.code,
      knowledgeError.message,
      knowledgeError.safeDetails,
    );
  }
}
