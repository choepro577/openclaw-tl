import { createHash } from "node:crypto";
import { loadConfig } from "../../config/config.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import {
  deleteKnowledgeWorkerCheckpointIfPresent,
  putNormalizedKnowledgeArtifact,
  putKnowledgeWorkerCheckpoint,
  readKnowledgeBlob,
  readKnowledgeWorkerCheckpoint,
  readNormalizedKnowledgeArtifact,
} from "./artifact-store.js";
import { createEnterpriseKnowledgeEmbeddingRuntime } from "./embedding-runtime.js";
import { resolveKnowledgeGraphEnrichmentProvider } from "./graph-enrichment-provider.js";
import type {
  KnowledgeGraphEnrichmentNode,
  KnowledgeGraphEnrichmentRelation,
} from "./graph-index.js";
import { buildKnowledgeGenerationIndex } from "./index-store.js";
import {
  extractAndNormalizeKnowledgeArtifact,
  extractAndNormalizeKnowledgeUrlPages,
} from "./ingestion.js";
import {
  bindKnowledgeGenerationArtifacts,
  recordKnowledgeArtifactRevision,
} from "./knowledge-artifact-revision-store.js";
import {
  getKnowledgeGraphSettings,
  listKnowledgeGraphManualEdges,
  listKnowledgeGraphReviewOverlays,
} from "./knowledge-graph-control-store.js";
import { expireKnowledgeGraphExports } from "./knowledge-graph-export.js";
import { KNOWLEDGE_JOB_HEARTBEAT_MS, KNOWLEDGE_WORKER_CONCURRENCY } from "./knowledge-limits.js";
import {
  claimNextKnowledgeJob,
  appendEnterpriseKnowledgeChange,
  completeKnowledgeSourceVersion,
  createKnowledgeGeneration,
  enqueueKnowledgeZoneBuild,
  fenceKnowledgeJobUpdate,
  finishKnowledgeGeneration,
  finishKnowledgeJob,
  getKnowledgeSource,
  getKnowledgeSourceVersion,
  getKnowledgeZone,
  listKnowledgeJobSteps,
  listReadyKnowledgeVersionsForZone,
  pruneEnterpriseKnowledgeChanges,
  setKnowledgeVersionsVectorStatus,
  updateKnowledgeJobStep,
  type KnowledgeJob,
} from "./knowledge-store.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeGraphEnrichmentIdentity,
  type NormalizedKnowledgeArtifact,
} from "./knowledge-types.js";
import { expireKnowledgeUploads } from "./upload-service.js";
import { crawlKnowledgeUrl } from "./url-crawler.js";

const log = createSubsystemLogger("enterprise/knowledge-worker");
const AI_BATCH_SIZE = 30;
const MAX_AI_STRUCTURAL_UNITS = 50_000;
let lastChangePruneAt = 0;

type KnowledgeAiCheckpoint = {
  schemaVersion: 1;
  jobId: string;
  pipelineGeneration: number;
  checkpointIdentity: string;
  phase: "map" | "relations";
  nextOffset: number;
  nodes: KnowledgeGraphEnrichmentNode[];
  relations: KnowledgeGraphEnrichmentRelation[];
  failedBatches: number;
  relationFailedBatches: number;
  enrichmentIdentity?: KnowledgeGraphEnrichmentIdentity;
};

function parseKnowledgeAiCheckpoint(
  value: unknown,
  expected: {
    jobId: string;
    pipelineGeneration: number;
    checkpointIdentity: string;
    totalCandidates: number;
  },
): KnowledgeAiCheckpoint | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const checkpoint = value as Partial<KnowledgeAiCheckpoint>;
  if (
    checkpoint.schemaVersion !== 1 ||
    checkpoint.jobId !== expected.jobId ||
    checkpoint.pipelineGeneration !== expected.pipelineGeneration ||
    checkpoint.checkpointIdentity !== expected.checkpointIdentity ||
    (checkpoint.phase !== "map" && checkpoint.phase !== "relations") ||
    !Number.isSafeInteger(checkpoint.nextOffset) ||
    checkpoint.nextOffset! < 0 ||
    checkpoint.nextOffset! > expected.totalCandidates ||
    !Array.isArray(checkpoint.nodes) ||
    !Array.isArray(checkpoint.relations) ||
    !Number.isSafeInteger(checkpoint.failedBatches) ||
    !Number.isSafeInteger(checkpoint.relationFailedBatches)
  ) {
    return undefined;
  }
  return checkpoint as KnowledgeAiCheckpoint;
}

function privacySafeId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isTransientKnowledgeError(error: unknown): boolean {
  if (error instanceof EnterpriseKnowledgeError) {
    return error.status === 429 || error.status === 503;
  }
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return Boolean(
    code && ["EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "SQLITE_BUSY", "ENOSPC"].includes(code),
  );
}

function safeKnowledgeErrorCode(error: unknown): string {
  if ((error as { name?: string } | undefined)?.name === "AbortError") {
    return "CANCELLED";
  }
  if (error instanceof EnterpriseKnowledgeError) {
    return error.code;
  }
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOSPC") {
    return "STORAGE_FULL";
  }
  if (code === "SQLITE_BUSY") {
    return "DATABASE_BUSY";
  }
  return "PIPELINE_FAILED";
}

function assertJobFence(job: KnowledgeJob, options: OpenClawStateDatabaseOptions): void {
  if (!job.claimToken || !job.claimOwner) {
    throw new Error("JOB_FENCE_MISSING");
  }
  const accepted = fenceKnowledgeJobUpdate(
    {
      jobId: job.id,
      claimToken: job.claimToken,
      claimOwner: job.claimOwner,
      pipelineGeneration: job.pipelineGeneration,
    },
    options,
  );
  if (!accepted) {
    throw new Error("JOB_FENCE_LOST");
  }
}

function updateWorkerStep(
  job: KnowledgeJob,
  params: {
    stage: string;
    status: "queued" | "running" | "completed" | "degraded" | "failed" | "cancelled";
    progressCurrent?: number | null;
    progressTotal?: number | null;
    checkpointRef?: string | null;
    safeErrorCode?: string | null;
    degradedReason?: string | null;
  },
  options: OpenClawStateDatabaseOptions,
): void {
  if (job.claimToken && job.claimOwner && params.status === "running") {
    fenceKnowledgeJobUpdate(
      {
        jobId: job.id,
        claimToken: job.claimToken,
        claimOwner: job.claimOwner,
        pipelineGeneration: job.pipelineGeneration,
        stage: params.stage,
        ...(params.progressCurrent === undefined || params.progressCurrent === null
          ? {}
          : { progressCurrent: params.progressCurrent }),
        ...(params.progressTotal === undefined || params.progressTotal === null
          ? {}
          : { progressTotal: params.progressTotal }),
      },
      options,
    );
  }
  updateKnowledgeJobStep(
    {
      job,
      stepId: params.stage,
      stage: params.stage,
      status: params.status,
      progressCurrent: params.progressCurrent,
      progressTotal: params.progressTotal,
      checkpointRef: params.checkpointRef,
      safeErrorCode: params.safeErrorCode,
      degradedReason: params.degradedReason,
    },
    options,
  );
}

async function processSourceJob(
  job: KnowledgeJob,
  options: OpenClawStateDatabaseOptions,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  if (!job.sourceId || !job.sourceVersionId) {
    throw new Error("JOB_SOURCE_MISSING");
  }
  const source = getKnowledgeSource(job.sourceId, options);
  const version = getKnowledgeSourceVersion(job.sourceVersionId, options);
  const zone = getKnowledgeZone(job.zoneId, options);
  if (!source || !version || !zone || !version.blobHash) {
    throw new EnterpriseKnowledgeError(
      "SOURCE_VERSION_UNAVAILABLE",
      422,
      "Source version is unavailable.",
    );
  }
  assertJobFence(job, options);
  updateWorkerStep(
    job,
    { stage: "checking", status: "running", progressCurrent: 0, progressTotal: 1 },
    options,
  );
  const buffer = await readKnowledgeBlob(version.blobHash, env);
  updateWorkerStep(
    job,
    { stage: "checking", status: "completed", progressCurrent: 1, progressTotal: 1 },
    options,
  );
  updateWorkerStep(job, { stage: "parsing", status: "running" }, options);
  const declaredMimeType = version.mimeType;
  const originalName = version.originalName ?? undefined;
  let artifact: NormalizedKnowledgeArtifact | undefined;
  if (source.kind === "url") {
    const raw = buffer.toString("utf8").trim();
    let manifest: { url: string; crawlSameOrigin: boolean };
    try {
      const parsed = JSON.parse(raw) as { url?: unknown; crawlSameOrigin?: unknown };
      manifest = {
        url: typeof parsed.url === "string" ? parsed.url : raw,
        crawlSameOrigin: parsed.crawlSameOrigin === true,
      };
    } catch {
      manifest = { url: raw, crawlSameOrigin: false };
    }
    const pages = await crawlKnowledgeUrl({
      url: manifest.url,
      sameOrigin: manifest.crawlSameOrigin,
    });
    artifact = await extractAndNormalizeKnowledgeUrlPages({
      pages,
      sourceId: source.id,
      sourceVersionId: version.id,
      sourceVersion: version.versionNumber,
      title: source.title,
      externalAllowed: zone.egressPolicy === "external_allowed",
      config: loadConfig(),
    });
  }
  artifact ??= await extractAndNormalizeKnowledgeArtifact({
    buffer,
    declaredMimeType,
    originalName,
    sourceId: source.id,
    sourceVersionId: version.id,
    sourceVersion: version.versionNumber,
    title: source.title,
    externalAllowed: zone.egressPolicy === "external_allowed",
    config: loadConfig(),
  });
  assertJobFence(job, options);
  updateWorkerStep(job, { stage: "parsing", status: "completed" }, options);
  updateWorkerStep(
    job,
    {
      stage: "ocr",
      status: "completed",
      ...(artifact.ocrProvenance ? {} : { degradedReason: "not_required_native_text" }),
    },
    options,
  );
  updateWorkerStep(
    job,
    {
      stage: "structure",
      status: "completed",
      progressCurrent:
        artifact.schemaVersion === 3
          ? artifact.graphSignals.blocks.length
          : artifact.segments.length,
      progressTotal:
        artifact.schemaVersion === 3
          ? artifact.graphSignals.blocks.length
          : artifact.segments.length,
    },
    options,
  );
  updateWorkerStep(job, { stage: "normalizing", status: "running" }, options);
  const normalized = await putNormalizedKnowledgeArtifact(artifact, env);
  recordKnowledgeArtifactRevision({ artifactHash: normalized.hash, artifact }, options);
  assertJobFence(job, options);
  completeKnowledgeSourceVersion(
    {
      versionId: version.id,
      pipelineGeneration: version.pipelineGeneration,
      processingStatus: "degraded",
      normalizedArtifactHash: normalized.hash,
      segmentCount: artifact.segments.length,
      vectorStatus: "unavailable",
      parserProvenance: artifact.parserProvenance,
      ocrProvenance: artifact.ocrProvenance,
      jobFence: {
        jobId: job.id,
        claimToken: job.claimToken!,
        claimOwner: job.claimOwner!,
      },
    },
    options,
  );
  updateWorkerStep(job, { stage: "normalizing", status: "completed" }, options);
  appendEnterpriseKnowledgeChange(
    {
      zoneId: zone.id,
      entityType: "source",
      entityId: source.id,
      operation: "completed",
      revision: version.versionNumber,
      status: artifact.ocrProvenance ? "parsed_with_ocr" : "parsed_native_no_ocr",
      stage: "candidate_queued",
    },
    options,
  );
  enqueueKnowledgeZoneBuild(zone.id, null, options);
}

async function processZoneBuildJob(
  job: KnowledgeJob,
  options: OpenClawStateDatabaseOptions,
  env: NodeJS.ProcessEnv,
  signal: AbortSignal,
): Promise<void> {
  const buildStartedAt = Date.now();
  const zone = getKnowledgeZone(job.zoneId, options);
  if (!zone || zone.status !== "active") {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
  }
  if (zone.buildRevision !== job.pipelineGeneration) {
    throw new EnterpriseKnowledgeError(
      "STALE_BUILD",
      409,
      "Source set changed before build began.",
    );
  }
  const ready = listReadyKnowledgeVersionsForZone(zone.id, options);
  const artifacts = [];
  for (const item of ready) {
    if (!item.version.normalizedArtifactHash) {
      continue;
    }
    const artifact = await readNormalizedKnowledgeArtifact(
      item.version.normalizedArtifactHash,
      env,
    );
    // Legacy V1/V2 artifacts predate the immutable revision registry. Registering
    // them lazily keeps existing zones buildable while preserving the exact hash
    // used by this generation.
    recordKnowledgeArtifactRevision(
      { artifactHash: item.version.normalizedArtifactHash, artifact },
      options,
    );
    artifacts.push(artifact);
  }
  assertJobFence(job, options);
  const generation = createKnowledgeGeneration(
    zone.id,
    zone.sourceSetRevision,
    zone.buildRevision,
    options,
  );
  bindKnowledgeGenerationArtifacts(
    {
      generationId: generation.id,
      artifacts: ready.flatMap((item) =>
        item.version.normalizedArtifactHash
          ? [
              {
                sourceVersionId: item.version.id,
                artifactHash: item.version.normalizedArtifactHash,
              },
            ]
          : [],
      ),
    },
    options,
  );
  try {
    const config = loadConfig();
    const storedGraphSettings = getKnowledgeGraphSettings(zone.id, options);
    const graphSettings = {
      ...storedGraphSettings,
      enabled: config.enterprise?.knowledge?.graph?.enabled === true && storedGraphSettings.enabled,
    };
    const graphRuntimeConfig = config.enterprise?.knowledge?.graph;
    const aiAnalysisMode = graphRuntimeConfig?.aiAnalysis ?? "off";
    const deliberateV3Analysis = artifacts.some((artifact) => artifact.schemaVersion === 3);
    const aiAnalysisEnabled = aiAnalysisMode !== "off" || deliberateV3Analysis;
    const embedding = await createEnterpriseKnowledgeEmbeddingRuntime({
      config,
      externalAllowed: zone.egressPolicy === "external_allowed",
    });
    try {
      updateWorkerStep(job, { stage: "structural_graph", status: "running" }, options);
      const structuralBlockCount = artifacts.reduce(
        (count, artifact) =>
          count +
          (artifact.schemaVersion === 3
            ? artifact.graphSignals.blocks.filter((block) => !block.isToc && !block.isHeaderFooter)
                .length
            : artifact.segments.length),
        0,
      );
      updateWorkerStep(
        job,
        {
          stage: "structural_graph",
          status: "completed",
          progressCurrent: structuralBlockCount,
          progressTotal: structuralBlockCount,
        },
        options,
      );
      let enrichmentNodes: KnowledgeGraphEnrichmentNode[] | undefined;
      let enrichmentRelations: KnowledgeGraphEnrichmentRelation[] | undefined;
      let enrichmentIdentity: KnowledgeGraphEnrichmentIdentity | undefined;
      let enrichmentDegraded = false;
      if (graphSettings.enabled && graphSettings.enrichmentEnabled && aiAnalysisEnabled) {
        const provider = await resolveKnowledgeGraphEnrichmentProvider({
          config,
          allowRemoteFallback: zone.egressPolicy === "external_allowed",
        });
        if (
          !provider ||
          (provider.transport === "remote" && zone.egressPolicy !== "external_allowed")
        ) {
          enrichmentDegraded = true;
          updateWorkerStep(
            job,
            {
              stage: "ai_read",
              status: "degraded",
              degradedReason:
                zone.egressPolicy === "local_only"
                  ? "local_ai_provider_not_configured"
                  : "ai_provider_not_configured",
            },
            options,
          );
        } else {
          const candidates = artifacts.flatMap((artifact) => {
            if (artifact.schemaVersion !== 3) {
              return artifact.segments.map((segment) => ({
                id: segment.id,
                sourceVersionId: artifact.sourceVersionId,
                text: segment.text,
                locator: segment.locator,
              }));
            }
            const segmentById = new Map(artifact.segments.map((segment) => [segment.id, segment]));
            return artifact.graphSignals.blocks.flatMap((block) => {
              if (block.isToc || block.isHeaderFooter) {
                return [];
              }
              const evidence = block.segmentIds.map((id) => segmentById.get(id)).find(Boolean);
              return evidence
                ? [
                    {
                      id: evidence.id,
                      sourceVersionId: artifact.sourceVersionId,
                      text: block.text,
                      locator: block.locator,
                      blockId: block.blockId,
                      headingPath: block.headingPath,
                      structuralKind: block.semanticKind ?? block.kind,
                    },
                  ]
                : [];
            });
          });
          if (candidates.length > MAX_AI_STRUCTURAL_UNITS) {
            throw new EnterpriseKnowledgeError(
              "CAPACITY_EXCEEDED",
              422,
              "Document exceeds the configured AI analysis capacity.",
              { totalBlocks: candidates.length, maxBlocks: MAX_AI_STRUCTURAL_UNITS },
            );
          }
          const totalBatches = Math.ceil(candidates.length / AI_BATCH_SIZE);
          const artifactAnalysisChecksum = createHash("sha256")
            .update(
              ready
                .map((entry) => entry.version.normalizedArtifactHash ?? "")
                .toSorted()
                .join("\0"),
            )
            .digest("hex");
          const checkpointIdentity = createHash("sha256")
            .update(
              [
                zone.id,
                String(job.pipelineGeneration),
                artifactAnalysisChecksum,
                provider.id,
                provider.transport,
                "ai-graph-v3.1",
              ].join("\0"),
            )
            .digest("hex");
          const priorSteps = listKnowledgeJobSteps(job.id, zone.id, options);
          const priorCheckpointRef =
            priorSteps.find((step) => step.stage === "ai_relations")?.checkpointRef ??
            priorSteps.find((step) => step.stage === "ai_read")?.checkpointRef;
          const priorCheckpoint = priorCheckpointRef
            ? parseKnowledgeAiCheckpoint(
                await readKnowledgeWorkerCheckpoint(priorCheckpointRef, env).catch(() => undefined),
                {
                  jobId: job.id,
                  pipelineGeneration: job.pipelineGeneration,
                  checkpointIdentity,
                  totalCandidates: candidates.length,
                },
              )
            : undefined;
          let retainedCheckpointRef = priorCheckpointRef;
          updateWorkerStep(
            job,
            {
              stage: "ai_read",
              status: "running",
              progressCurrent:
                priorCheckpoint?.phase === "relations"
                  ? candidates.length
                  : (priorCheckpoint?.nextOffset ?? 0),
              progressTotal: candidates.length,
            },
            options,
          );
          const nodes = new Map<string, KnowledgeGraphEnrichmentNode>(
            (priorCheckpoint?.nodes ?? []).map((node) => [
              `${node.kind}:${node.canonicalKey.normalize("NFC").toLocaleLowerCase()}`,
              node,
            ]),
          );
          const relations: KnowledgeGraphEnrichmentRelation[] =
            priorCheckpoint?.phase === "relations" ? [...priorCheckpoint.relations] : [];
          let failedBatches = priorCheckpoint?.failedBatches ?? 0;
          enrichmentIdentity = priorCheckpoint?.enrichmentIdentity;
          const aiConcurrency = Math.max(
            1,
            Math.min(graphRuntimeConfig?.maxConcurrentAiCallsPerZone ?? 2, 8),
          );
          for (
            let groupOffset =
              priorCheckpoint?.phase === "relations"
                ? candidates.length
                : (priorCheckpoint?.nextOffset ?? 0);
            groupOffset < candidates.length;
            groupOffset += AI_BATCH_SIZE * aiConcurrency
          ) {
            signal.throwIfAborted();
            const work = Array.from({ length: aiConcurrency }, (_, index) => {
              const offset = groupOffset + index * AI_BATCH_SIZE;
              const batch = candidates.slice(offset, offset + AI_BATCH_SIZE);
              if (batch.length === 0) {
                return undefined;
              }
              const catalog = [...nodes.values()].slice(0, 2_000).map((node) => ({
                canonicalKey: node.canonicalKey,
                label: node.label,
                kind: node.kind,
                aliases: node.aliases,
              }));
              return (async () => {
                let lastError: unknown;
                for (let attempt = 0; attempt < 3; attempt += 1) {
                  signal.throwIfAborted();
                  try {
                    const result = await provider.enrich(
                      { segments: batch, canonicalCatalog: catalog },
                      { signal },
                    );
                    return { offset, result };
                  } catch (error) {
                    lastError = error;
                    if (attempt < 2 && isTransientKnowledgeError(error)) {
                      await new Promise<void>((resolve, reject) => {
                        const timer = setTimeout(resolve, 250 * 4 ** attempt);
                        signal.addEventListener(
                          "abort",
                          () => {
                            clearTimeout(timer);
                            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
                          },
                          { once: true },
                        );
                        timer.unref();
                      });
                      continue;
                    }
                    break;
                  }
                }
                return { offset, error: lastError };
              })();
            }).filter((item) => item !== undefined);
            const completed = await Promise.all(work);
            for (const item of completed) {
              if ("error" in item) {
                failedBatches += 1;
                log.warn(
                  `Knowledge AI batch ${Math.floor(item.offset / AI_BATCH_SIZE) + 1}/${totalBatches} failed: ${safeKnowledgeErrorCode(item.error)}`,
                );
              } else {
                for (const node of item.result.nodes ?? []) {
                  const key = `${node.kind}:${node.canonicalKey.normalize("NFC").toLocaleLowerCase()}`;
                  const existing = nodes.get(key);
                  nodes.set(
                    key,
                    existing
                      ? {
                          ...existing,
                          aliases: [...new Set([...existing.aliases, ...node.aliases, node.label])],
                          confidence: Math.max(existing.confidence, node.confidence),
                        }
                      : node,
                  );
                }
                relations.push(...item.result.relations);
                enrichmentIdentity = {
                  provider: item.result.provider,
                  model: item.result.model,
                  transport: provider.transport,
                  promptSchemaVersion: "ai-graph-v3.1",
                  analysisChecksum: artifactAnalysisChecksum,
                };
              }
            }
            const progressCurrent = Math.min(
              candidates.length,
              groupOffset + AI_BATCH_SIZE * aiConcurrency,
            );
            const checkpoint = await putKnowledgeWorkerCheckpoint(
              {
                schemaVersion: 1,
                jobId: job.id,
                pipelineGeneration: job.pipelineGeneration,
                checkpointIdentity,
                phase: "map",
                nextOffset: progressCurrent,
                nodes: [...nodes.values()],
                relations: [],
                failedBatches,
                relationFailedBatches: 0,
                enrichmentIdentity,
              } satisfies KnowledgeAiCheckpoint,
              env,
            );
            updateWorkerStep(
              job,
              {
                stage: "ai_read",
                status: "running",
                progressCurrent,
                progressTotal: candidates.length,
                checkpointRef: checkpoint.hash,
              },
              options,
            );
            if (retainedCheckpointRef && retainedCheckpointRef !== checkpoint.hash) {
              await deleteKnowledgeWorkerCheckpointIfPresent(retainedCheckpointRef, env);
            }
            retainedCheckpointRef = checkpoint.hash;
            assertJobFence(job, options);
          }
          enrichmentNodes = [...nodes.values()];
          enrichmentRelations = relations;
          enrichmentDegraded = failedBatches > 0;
          updateWorkerStep(
            job,
            {
              stage: "ai_read",
              status: failedBatches > 0 ? "degraded" : "completed",
              progressCurrent: candidates.length,
              progressTotal: candidates.length,
              ...(failedBatches > 0 ? { degradedReason: "ai_batch_failed" } : {}),
            },
            options,
          );
          updateWorkerStep(
            job,
            {
              stage: "ai_canonicalize",
              status: "completed",
              progressCurrent: enrichmentNodes.length,
              progressTotal: enrichmentNodes.length,
            },
            options,
          );
          if (priorCheckpoint?.phase !== "relations") {
            relations.length = 0;
          }
          let relationFailedBatches = priorCheckpoint?.relationFailedBatches ?? 0;
          const canonicalCatalog = enrichmentNodes.slice(0, 10_000).map((node) => ({
            canonicalKey: node.canonicalKey,
            label: node.label,
            kind: node.kind,
            aliases: node.aliases,
          }));
          updateWorkerStep(
            job,
            {
              stage: "ai_relations",
              status: "running",
              progressCurrent:
                priorCheckpoint?.phase === "relations" ? priorCheckpoint.nextOffset : 0,
              progressTotal: candidates.length,
            },
            options,
          );
          for (
            let groupOffset =
              priorCheckpoint?.phase === "relations" ? priorCheckpoint.nextOffset : 0;
            groupOffset < candidates.length;
            groupOffset += AI_BATCH_SIZE * aiConcurrency
          ) {
            signal.throwIfAborted();
            const work = Array.from({ length: aiConcurrency }, (_, index) => {
              const offset = groupOffset + index * AI_BATCH_SIZE;
              const batch = candidates.slice(offset, offset + AI_BATCH_SIZE);
              if (batch.length === 0) {
                return undefined;
              }
              return provider
                .enrich({ segments: batch, canonicalCatalog }, { signal })
                .then((result) => ({ offset, result }))
                .catch((error: unknown) => ({ offset, error }));
            }).filter((item) => item !== undefined);
            const completed = await Promise.all(work);
            for (const item of completed) {
              if ("error" in item) {
                relationFailedBatches += 1;
                log.warn(
                  `Knowledge AI relation batch ${Math.floor(item.offset / AI_BATCH_SIZE) + 1}/${totalBatches} failed: ${safeKnowledgeErrorCode(item.error)}`,
                );
              } else {
                relations.push(...item.result.relations);
              }
            }
            const progressCurrent = Math.min(
              candidates.length,
              groupOffset + AI_BATCH_SIZE * aiConcurrency,
            );
            const checkpoint = await putKnowledgeWorkerCheckpoint(
              {
                schemaVersion: 1,
                jobId: job.id,
                pipelineGeneration: job.pipelineGeneration,
                checkpointIdentity,
                phase: "relations",
                nextOffset: progressCurrent,
                nodes: enrichmentNodes,
                relations,
                failedBatches,
                relationFailedBatches,
                enrichmentIdentity,
              } satisfies KnowledgeAiCheckpoint,
              env,
            );
            updateWorkerStep(
              job,
              {
                stage: "ai_relations",
                status: "running",
                progressCurrent,
                progressTotal: candidates.length,
                checkpointRef: checkpoint.hash,
              },
              options,
            );
            if (retainedCheckpointRef && retainedCheckpointRef !== checkpoint.hash) {
              await deleteKnowledgeWorkerCheckpointIfPresent(retainedCheckpointRef, env);
            }
            retainedCheckpointRef = checkpoint.hash;
            assertJobFence(job, options);
          }
          enrichmentRelations = [
            ...new Map(
              relations.map((relation) => [
                [
                  relation.sourceCanonicalKey,
                  relation.targetCanonicalKey,
                  relation.kind,
                  relation.evidenceSourceVersionId,
                  relation.evidenceSegmentId,
                ].join("\0"),
                relation,
              ]),
            ).values(),
          ];
          enrichmentDegraded = failedBatches > 0 || relationFailedBatches > 0;
          updateWorkerStep(
            job,
            {
              stage: "ai_relations",
              status: relationFailedBatches > 0 ? "degraded" : "completed",
              progressCurrent: candidates.length,
              progressTotal: candidates.length,
              ...(relationFailedBatches > 0 ? { degradedReason: "ai_relation_batch_failed" } : {}),
            },
            options,
          );
        }
      } else {
        updateWorkerStep(
          job,
          { stage: "ai_read", status: "degraded", degradedReason: "ai_analysis_off" },
          options,
        );
      }
      let vectors: Map<string, number[]> | undefined;
      let embeddingFailed = false;
      updateWorkerStep(job, { stage: "embedding", status: "running" }, options);
      try {
        if (!embedding.unavailableReason) {
          const segments = artifacts.flatMap((artifact) => artifact.segments);
          const values = await embedding.embedDocuments(
            segments.map((segment) => segment.normalizedText),
          );
          vectors = new Map(segments.map((segment, index) => [segment.id, values[index]!]));
        }
      } catch {
        embeddingFailed = true;
        vectors = undefined;
      }
      updateWorkerStep(
        job,
        {
          stage: "embedding",
          status: embeddingFailed || embedding.unavailableReason ? "degraded" : "completed",
          ...(embeddingFailed || embedding.unavailableReason
            ? { degradedReason: "vector_provider_not_ready" }
            : {}),
        },
        options,
      );
      updateWorkerStep(job, { stage: "graph_build", status: "running" }, options);
      const built = await buildKnowledgeGenerationIndex({
        zoneId: zone.id,
        generationId: generation.id,
        sourceSetRevision: zone.sourceSetRevision,
        buildRevision: zone.buildRevision,
        artifacts,
        vectors,
        embeddingIdentity: embedding.identity ?? undefined,
        vectorExtensionPath: config.memory?.search?.store?.vector?.extensionPath,
        env,
        graph: {
          settings: graphSettings,
          reviewOverlays: listKnowledgeGraphReviewOverlays(zone.id, options),
          manualEdges: listKnowledgeGraphManualEdges(zone.id, options),
          enrichmentNodes,
          enrichmentRelations,
          enrichmentIdentity,
          enrichmentDegraded,
        },
      });
      updateWorkerStep(
        job,
        {
          stage: "graph_build",
          status: built.graphStatus === "degraded" ? "degraded" : "completed",
          progressCurrent: built.graphNodeCount + built.graphEdgeCount,
          progressTotal: built.graphNodeCount + built.graphEdgeCount,
          ...(built.graphStatus === "degraded"
            ? { degradedReason: "graph_enrichment_degraded" }
            : {}),
        },
        options,
      );
      updateWorkerStep(job, { stage: "validating", status: "running" }, options);
      assertJobFence(job, options);
      const currentZone = getKnowledgeZone(zone.id, options);
      if (
        !currentZone ||
        currentZone.sourceSetRevision !== generation.sourceSetRevision ||
        currentZone.buildRevision !== generation.buildRevision
      ) {
        throw new EnterpriseKnowledgeError(
          "STALE_BUILD",
          409,
          "Source set changed while the candidate generation was building.",
        );
      }
      const vectorStatus = embeddingFailed ? "error" : built.vectorStatus;
      finishKnowledgeGeneration(
        generation.id,
        {
          lexicalStatus: "ready",
          vectorStatus,
          artifactChecksum: built.checksum,
          embeddingIdentity:
            vectorStatus === "ready" ? (embedding.identity ?? undefined) : undefined,
          graphStatus: built.graphStatus,
          graphSchemaVersion: built.graphSchemaVersion,
          graphNodeCount: built.graphNodeCount,
          graphEdgeCount: built.graphEdgeCount,
          graphProposedCount: built.graphProposedCount,
          graphOrphanCount: built.graphOrphanCount,
          graphEnrichmentIdentity: enrichmentIdentity,
        },
        options,
      );
      updateWorkerStep(job, { stage: "validating", status: "completed" }, options);
      updateWorkerStep(
        job,
        {
          stage: "candidate_ready",
          status: built.graphStatus === "degraded" ? "degraded" : "completed",
          ...(built.graphStatus === "degraded"
            ? { degradedReason: "candidate_ready_with_degradation" }
            : {}),
        },
        options,
      );
      appendEnterpriseKnowledgeChange(
        {
          zoneId: zone.id,
          entityType: "candidate",
          entityId: generation.id,
          operation: "completed",
          revision: generation.buildRevision,
          status: "ready",
          stage: "candidate_ready",
        },
        options,
      );
      appendEnterpriseKnowledgeChange(
        {
          zoneId: zone.id,
          entityType: "graph",
          entityId: generation.id,
          operation: "completed",
          revision: generation.buildRevision,
          status: built.graphStatus,
          stage: "candidate_ready",
        },
        options,
      );
      appendEnterpriseAuditEvent(
        {
          actorAccountId: null,
          actorSessionId: null,
          action: "knowledge.graph.build",
          targetType: "knowledge_generation",
          targetId: generation.id,
          requestId: null,
          before: null,
          after: {
            zoneIdHash: privacySafeId(zone.id),
            status: built.graphStatus,
            nodeCount: built.graphNodeCount,
            edgeCount: built.graphEdgeCount,
            proposedCount: built.graphProposedCount,
            orphanCount: built.graphOrphanCount,
            schemaVersion: built.graphSchemaVersion,
            extractorIdentity: enrichmentIdentity ?? null,
            latencyMs: Date.now() - buildStartedAt,
          },
          outcome: "success",
        },
        options,
      );
      setKnowledgeVersionsVectorStatus(
        ready.map((item) => item.version.id),
        vectorStatus,
        options,
      );
    } finally {
      await embedding.close();
    }
  } catch (error) {
    finishKnowledgeGeneration(
      generation.id,
      {
        lexicalStatus: "error",
        vectorStatus: "error",
        graphStatus: "error",
        graphSchemaVersion: 2,
      },
      options,
    );
    appendEnterpriseAuditEvent(
      {
        actorAccountId: null,
        actorSessionId: null,
        action: "knowledge.graph.build",
        targetType: "knowledge_generation",
        targetId: generation.id,
        requestId: null,
        before: null,
        after: {
          zoneIdHash: privacySafeId(zone.id),
          status: "error",
          code: safeKnowledgeErrorCode(error),
          latencyMs: Date.now() - buildStartedAt,
        },
        outcome: "failure",
      },
      options,
    );
    throw error;
  }
}

async function executeClaimedKnowledgeJob(
  job: KnowledgeJob,
  options: OpenClawStateDatabaseOptions,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const abortController = new AbortController();
  const heartbeat = setInterval(() => {
    if (job.claimToken && job.claimOwner) {
      const retained = fenceKnowledgeJobUpdate(
        {
          jobId: job.id,
          claimToken: job.claimToken,
          claimOwner: job.claimOwner,
          pipelineGeneration: job.pipelineGeneration,
        },
        options,
      );
      if (!retained) {
        abortController.abort(new DOMException("Knowledge job cancelled", "AbortError"));
      }
    }
  }, KNOWLEDGE_JOB_HEARTBEAT_MS);
  heartbeat.unref();
  try {
    if (job.kind === "source_ingest") {
      await processSourceJob(job, options, env);
    } else if (job.kind === "zone_build") {
      await processZoneBuildJob(job, options, env, abortController.signal);
    } else {
      throw new EnterpriseKnowledgeError("JOB_KIND_UNSUPPORTED", 422, "Job kind is not supported.");
    }
    finishKnowledgeJob(job, { status: "succeeded" }, options);
  } catch (error) {
    if (
      abortController.signal.aborted ||
      (error instanceof Error && error.message === "JOB_FENCE_LOST")
    ) {
      updateWorkerStep(job, { stage: job.stage, status: "cancelled" }, options);
      finishKnowledgeJob(job, { status: "cancelled", safeErrorCode: "CANCELLED" }, options);
      return;
    }
    const code = safeKnowledgeErrorCode(error);
    updateWorkerStep(job, { stage: job.stage, status: "failed", safeErrorCode: code }, options);
    if (job.sourceVersionId && code === "OCR_REQUIRED") {
      completeKnowledgeSourceVersion(
        {
          versionId: job.sourceVersionId,
          pipelineGeneration: job.pipelineGeneration,
          processingStatus: "needs_ocr",
          vectorStatus: "unavailable",
          safeErrorCode: code,
          jobFence: {
            jobId: job.id,
            claimToken: job.claimToken!,
            claimOwner: job.claimOwner!,
          },
        },
        options,
      );
    } else if (job.sourceVersionId && !isTransientKnowledgeError(error)) {
      completeKnowledgeSourceVersion(
        {
          versionId: job.sourceVersionId,
          pipelineGeneration: job.pipelineGeneration,
          processingStatus: "error",
          vectorStatus: "error",
          safeErrorCode: code,
          jobFence: {
            jobId: job.id,
            claimToken: job.claimToken!,
            claimOwner: job.claimOwner!,
          },
        },
        options,
      );
    }
    finishKnowledgeJob(
      job,
      {
        status: "failed",
        safeErrorCode: code,
        transient: isTransientKnowledgeError(error),
      },
      options,
    );
    if (job.kind === "zone_build" && code === "STALE_BUILD") {
      enqueueKnowledgeZoneBuild(job.zoneId, null, options);
    }
    log.warn(`Knowledge job ${job.id} failed at ${job.stage}: ${code}`);
  } finally {
    clearInterval(heartbeat);
  }
}

export async function runEnterpriseKnowledgeWorkerOnce(
  params: {
    owner?: string;
    concurrency?: number;
    options?: OpenClawStateDatabaseOptions;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<number> {
  const options = params.options ?? {};
  const env = params.env ?? process.env;
  const now = Date.now();
  if (now - lastChangePruneAt >= 60_000) {
    const retentionHours =
      loadConfig().enterprise?.knowledge?.graph?.changeFeedRetentionHours ?? 24;
    pruneEnterpriseKnowledgeChanges({ retentionHours, now }, options);
    lastChangePruneAt = now;
  }
  await Promise.all([
    expireKnowledgeUploads(now, options, env),
    expireKnowledgeGraphExports(now, options),
  ]);
  const owner = params.owner ?? `gateway:${process.pid}:${generateSecureUuid()}`;
  const jobs = Array.from(
    { length: Math.max(1, Math.min(params.concurrency ?? KNOWLEDGE_WORKER_CONCURRENCY, 8)) },
    () => claimNextKnowledgeJob(owner, Date.now(), options),
  ).filter((job): job is KnowledgeJob => Boolean(job));
  await Promise.all(jobs.map((job) => executeClaimedKnowledgeJob(job, options, env)));
  return jobs.length;
}

export function startEnterpriseKnowledgeWorker(
  params: {
    options?: OpenClawStateDatabaseOptions;
    env?: NodeJS.ProcessEnv;
    intervalMs?: number;
  } = {},
): { stop(): Promise<void> } {
  const owner = `gateway:${process.pid}:${generateSecureUuid()}`;
  let stopped = false;
  let running: Promise<number> | undefined;
  const tick = () => {
    if (stopped || running) {
      return;
    }
    running = runEnterpriseKnowledgeWorkerOnce({
      owner,
      options: params.options,
      env: params.env,
    }).finally(() => {
      running = undefined;
    });
  };
  tick();
  const timer = setInterval(tick, Math.max(250, params.intervalMs ?? 1_000));
  timer.unref();
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
