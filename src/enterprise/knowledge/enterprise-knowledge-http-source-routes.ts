import type { IncomingMessage, ServerResponse } from "node:http";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import {
  putKnowledgeBlob,
  readKnowledgeBlob,
  readNormalizedKnowledgeArtifact,
} from "./artifact-store.js";
import {
  auditMutation,
  canonicalizeUrl,
  createNoteOrUrl,
  integerField,
  readBody,
  readJson,
  sendIdempotentMutation,
  sendJson,
  stringField,
  type KnowledgeAudience,
} from "./enterprise-knowledge-http-common.js";
import { KNOWLEDGE_NOTE_MAX_BYTES, KNOWLEDGE_UPLOAD_CHUNK_MAX_BYTES } from "./knowledge-limits.js";
import {
  createKnowledgeSourceVersion,
  enqueueKnowledgeZoneBuild,
  getKnowledgeSource,
  getKnowledgeSourceVersion,
  getPublishedKnowledgeSourceVersion,
  listKnowledgeSourceVersions,
  listKnowledgeArtifactRevisions,
  listKnowledgeSources,
  listPublishedKnowledgeSources,
  setKnowledgeSourceStagedRemove,
  reprocessKnowledgeSourceVersion,
} from "./knowledge-store.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeZone,
  type KnowledgeZoneRole,
} from "./knowledge-types.js";
import {
  appendKnowledgeUploadChunk,
  beginKnowledgeUpload,
  cancelKnowledgeUpload,
  commitKnowledgeUpload,
  getKnowledgeUpload,
  listKnowledgeUploads,
} from "./upload-service.js";

export type EnterpriseKnowledgeSourceRouteContext = {
  req: IncomingMessage;
  res: ServerResponse;
  audience: KnowledgeAudience;
  principal: EnterprisePrincipal;
  actor: EnterprisePrincipal;
  role: KnowledgeZoneRole;
  zone: KnowledgeZone;
  parts: string[];
};

export async function handleEnterpriseKnowledgeSourceHttpRoutes(
  context: EnterpriseKnowledgeSourceRouteContext,
): Promise<boolean> {
  const { req, res, audience, principal, actor, role, zone, parts } = context;
  if (parts[1] === "sources" && parts.length === 2 && req.method === "GET") {
    return sendJson(res, 200, {
      items:
        audience === "user" && role === "viewer"
          ? listPublishedKnowledgeSources(zone.id)
          : listKnowledgeSources(zone.id),
    });
  }
  if (
    parts[1] === "sources" &&
    parts[3] === "versions" &&
    parts[5] === "reprocess" &&
    parts.length === 6 &&
    req.method === "POST"
  ) {
    if (audience === "user" && role === "viewer") {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    const source = getKnowledgeSource(parts[2]!);
    const version = getKnowledgeSourceVersion(parts[4]!);
    if (
      !source ||
      source.zoneId !== zone.id ||
      !version ||
      version.zoneId !== zone.id ||
      version.sourceId !== source.id
    ) {
      throw new EnterpriseKnowledgeError("VERSION_NOT_FOUND", 404, "Knowledge version not found.");
    }
    const body = await readJson(req);
    if (body.targetArtifactSchema !== 3 || body.runAiAnalysis !== true) {
      throw new EnterpriseKnowledgeError(
        "INVALID_INPUT",
        422,
        "Reprocess requires Artifact V3 and AI analysis.",
      );
    }
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `source.reprocess-v3:${version.id}`,
      request: body,
      execute: () => {
        const result = reprocessKnowledgeSourceVersion({
          zoneId: zone.id,
          sourceId: source.id,
          versionId: version.id,
          baseBuildRevision: integerField(body, "baseBuildRevision"),
          actorAccountId: actor.account.id,
        });
        auditMutation({
          principal: actor,
          action: "knowledge.source.reprocess-v3",
          targetType: "knowledge_source_version",
          targetId: version.id,
          req,
          after: { jobId: result.jobId, buildRevision: result.buildRevision },
        });
        return { status: 202, response: result };
      },
    });
  }
  if (
    parts[1] === "sources" &&
    (parts[2] === "note" || parts[2] === "url") &&
    parts.length === 3 &&
    req.method === "POST"
  ) {
    const body = await readJson(req, KNOWLEDGE_NOTE_MAX_BYTES + 16 * 1024);
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `source.${parts[2]}.create:${zone.id}`,
      request: body,
      execute: async () => {
        const created = await createNoteOrUrl({
          body,
          zoneId: zone.id,
          // SAFETY: the surrounding route guard only admits note or url at this segment.
          kind: parts[2] as "note" | "url",
          principal: actor,
        });
        auditMutation({
          principal: actor,
          action: `knowledge.source.${parts[2]}.create`,
          targetType: "knowledge_source",
          targetId: created.source.id,
          req,
          after: { zoneId: zone.id, version: 1 },
        });
        return { status: 202, response: created };
      },
    });
  }
  if (parts[1] === "sources" && parts.length === 3 && req.method === "GET") {
    const source = getKnowledgeSource(parts[2]!);
    if (!source || source.zoneId !== zone.id) {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    const publishedVersion = getPublishedKnowledgeSourceVersion(zone.id, source.id);
    if (audience === "user" && role === "viewer" && !publishedVersion) {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    return sendJson(res, 200, {
      source,
      versions:
        audience === "user" && role === "viewer"
          ? [publishedVersion]
          : listKnowledgeSourceVersions(source.id),
    });
  }
  if (
    parts[1] === "sources" &&
    parts[3] === "versions" &&
    parts.length === 4 &&
    req.method === "POST"
  ) {
    const source = getKnowledgeSource(parts[2]!);
    if (!source || source.zoneId !== zone.id || source.status === "archived") {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    const body = await readJson(req, KNOWLEDGE_NOTE_MAX_BYTES + 16 * 1024);
    let buffer: Buffer;
    let mimeType: string;
    if (source.kind === "note") {
      const content = stringField(body, "content", KNOWLEDGE_NOTE_MAX_BYTES);
      buffer = Buffer.from(content, "utf8");
      if (buffer.byteLength > KNOWLEDGE_NOTE_MAX_BYTES) {
        throw new EnterpriseKnowledgeError(
          "NOTE_TOO_LARGE",
          413,
          "Note exceeds the 256 KiB limit.",
        );
      }
      mimeType = "text/markdown";
    } else if (source.kind === "url") {
      const url = canonicalizeUrl(
        typeof body.url === "string" ? body.url : (source.canonicalUrl ?? ""),
      );
      buffer = Buffer.from(
        JSON.stringify({ url, crawlSameOrigin: body.crawlSameOrigin === true }),
        "utf8",
      );
      mimeType = "text/uri-list";
    } else {
      throw new EnterpriseKnowledgeError(
        "UPLOAD_REQUIRED",
        422,
        "Use resumable upload to create a new file version.",
      );
    }
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `source.version.create:${source.id}`,
      request: body,
      execute: async () => {
        const blob = await putKnowledgeBlob(buffer);
        const created = createKnowledgeSourceVersion(
          source.id,
          {
            mimeType,
            contentHash: blob.hash,
            blobHash: blob.hash,
            byteSize: blob.byteSize,
          },
          actor.account.id,
        );
        auditMutation({
          principal: actor,
          action: "knowledge.source.version.create",
          targetType: "knowledge_source_version",
          targetId: created.version.id,
          req,
          after: { sourceId: source.id, version: created.version.versionNumber },
        });
        return { status: 202, response: created };
      },
    });
  }
  if (
    parts[1] === "sources" &&
    parts[3] === "stage-remove" &&
    parts.length === 4 &&
    req.method === "POST"
  ) {
    const body = await readJson(req);
    const source = getKnowledgeSource(parts[2]!);
    if (!source || source.zoneId !== zone.id) {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    const updated = setKnowledgeSourceStagedRemove(
      source.id,
      body.staged !== false,
      principal.account.id,
    );
    const jobId = enqueueKnowledgeZoneBuild(zone.id, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.source.stage-remove",
      targetType: "knowledge_source",
      targetId: source.id,
      req,
      after: { status: updated.status, jobId },
    });
    return sendJson(res, 202, { source: updated, jobId });
  }
  if (
    parts[1] === "sources" &&
    parts[3] === "versions" &&
    parts.length === 4 &&
    req.method === "GET"
  ) {
    if (audience === "user" && role === "viewer") {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    const source = getKnowledgeSource(parts[2]!);
    if (!source || source.zoneId !== zone.id) {
      throw new EnterpriseKnowledgeError("SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
    }
    return sendJson(res, 200, { items: listKnowledgeSourceVersions(source.id) });
  }
  if (
    parts[1] === "versions" &&
    parts[3] === "preview" &&
    parts.length === 4 &&
    req.method === "GET"
  ) {
    const version = getKnowledgeSourceVersion(parts[2]!);
    if (!version || version.zoneId !== zone.id || !version.normalizedArtifactHash) {
      throw new EnterpriseKnowledgeError("VERSION_NOT_FOUND", 404, "Knowledge version not found.");
    }
    if (
      audience === "user" &&
      role === "viewer" &&
      getPublishedKnowledgeSourceVersion(zone.id, version.sourceId)?.id !== version.id
    ) {
      throw new EnterpriseKnowledgeError("VERSION_NOT_FOUND", 404, "Knowledge version not found.");
    }
    const artifact = await readNormalizedKnowledgeArtifact(version.normalizedArtifactHash);
    return sendJson(res, 200, {
      version,
      title: artifact.title,
      segments: artifact.segments.slice(0, 200),
      truncated: artifact.segments.length > 200,
      parserProvenance: artifact.parserProvenance,
      ocrProvenance: artifact.ocrProvenance,
      artifactSchemaVersion: artifact.schemaVersion,
      analysisStatus: artifact.schemaVersion === 3 ? "structure_ready" : "reprocess_v3_available",
      artifactRevisions: listKnowledgeArtifactRevisions(version.id),
      ...(artifact.schemaVersion === 3
        ? {
            structuralBlocks: artifact.graphSignals.blocks.slice(0, 500),
            structuralReferences: artifact.graphSignals.references.slice(0, 500),
          }
        : {}),
    });
  }
  if (
    parts[1] === "versions" &&
    parts[3] === "download" &&
    parts.length === 4 &&
    req.method === "GET"
  ) {
    const version = getKnowledgeSourceVersion(parts[2]!);
    if (!version || version.zoneId !== zone.id || !version.blobHash) {
      throw new EnterpriseKnowledgeError("VERSION_NOT_FOUND", 404, "Knowledge version not found.");
    }
    if (
      audience === "user" &&
      role === "viewer" &&
      getPublishedKnowledgeSourceVersion(zone.id, version.sourceId)?.id !== version.id
    ) {
      throw new EnterpriseKnowledgeError("VERSION_NOT_FOUND", 404, "Knowledge version not found.");
    }
    const content = await readKnowledgeBlob(version.blobHash);
    const safeName = (version.originalName ?? `source-v${version.versionNumber}`)
      .replaceAll(/[\r\n"\\/]/g, "_")
      .slice(0, 180);
    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", version.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", String(content.byteLength));
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.end(content);
    return true;
  }
  if (parts[1] === "uploads" && parts.length === 2 && req.method === "GET") {
    return sendJson(res, 200, {
      items: listKnowledgeUploads(zone.id, principal.account.id),
    });
  }
  if (parts[1] === "uploads" && parts.length === 2 && req.method === "POST") {
    const body = await readJson(req);
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `upload.begin:${zone.id}`,
      request: body,
      execute: async () => {
        const upload = await beginKnowledgeUpload(
          {
            zoneId: zone.id,
            title: stringField(body, "title", 300),
            originalName: stringField(body, "originalName", 255),
            declaredMimeType: stringField(body, "mimeType", 160),
            expectedSize: integerField(body, "size"),
            expectedHash: typeof body.sha256 === "string" ? body.sha256 : undefined,
            targetSourceId:
              typeof body.targetSourceId === "string" ? body.targetSourceId : undefined,
          },
          actor.account.id,
        );
        auditMutation({
          principal: actor,
          action: "knowledge.upload.begin",
          targetType: "knowledge_upload",
          targetId: upload.id,
          req,
          after: { zoneId: zone.id, size: upload.expectedSize },
        });
        return { status: 201, response: { upload } };
      },
    });
  }
  if (parts[1] === "uploads" && parts.length === 3 && req.method === "GET") {
    const upload = getKnowledgeUpload(parts[2]!, principal.account.id);
    if (!upload || upload.zoneId !== zone.id) {
      throw new EnterpriseKnowledgeError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
    }
    return sendJson(res, 200, { upload });
  }
  if (
    parts[1] === "uploads" &&
    parts[3] === "chunk" &&
    parts.length === 4 &&
    req.method === "PUT"
  ) {
    if (req.headers["content-type"]?.split(";", 1)[0] !== "application/octet-stream") {
      throw new EnterpriseKnowledgeError(
        "CONTENT_TYPE_REQUIRED",
        415,
        "Chunk must be application/octet-stream.",
      );
    }
    const offset = Number(req.headers["upload-offset"]);
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new EnterpriseKnowledgeError("UPLOAD_OFFSET_INVALID", 422, "Upload-Offset is invalid.");
    }
    const chunk = await readBody(req, KNOWLEDGE_UPLOAD_CHUNK_MAX_BYTES);
    const upload = await appendKnowledgeUploadChunk(parts[2]!, principal.account.id, offset, chunk);
    return sendJson(res, 200, { upload });
  }
  if (
    parts[1] === "uploads" &&
    parts[3] === "commit" &&
    parts.length === 4 &&
    req.method === "POST"
  ) {
    const body = await readJson(req);
    return await sendIdempotentMutation({
      req,
      res,
      audience,
      principal,
      operation: `upload.commit:${parts[2]}`,
      request: body,
      execute: async () => {
        const committed = await commitKnowledgeUpload(parts[2]!, actor.account.id);
        auditMutation({
          principal: actor,
          action: "knowledge.upload.commit",
          targetType: "knowledge_upload",
          targetId: parts[2]!,
          req,
          after: { sourceVersionId: committed.sourceVersionId },
        });
        return { status: 202, response: committed };
      },
    });
  }
  if (parts[1] === "uploads" && parts.length === 3 && req.method === "DELETE") {
    await cancelKnowledgeUpload(parts[2]!, principal.account.id);
    auditMutation({
      principal,
      action: "knowledge.upload.cancel",
      targetType: "knowledge_upload",
      targetId: parts[2]!,
      req,
      after: null,
    });
    return sendJson(res, 200, { ok: true });
  }
  return false;
}
