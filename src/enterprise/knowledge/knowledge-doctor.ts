import { stat, statfs } from "node:fs/promises";
import path from "node:path";
import {
  openOpenClawStateDatabase,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  ensureEnterpriseKnowledgeArtifactDirectories,
  resolveEnterpriseKnowledgeArtifactPaths,
} from "./artifact-store.js";
import { doctorKnowledgeGenerationIndex } from "./index-store.js";

type Row = Record<string, unknown>;

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? null;
}

function safeJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function artifactIssue(
  target: string,
  expectedMode: number,
): Promise<"missing" | "permission" | null> {
  try {
    const info = await stat(target);
    return (info.mode & 0o777) === expectedMode ? null : "permission";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "permission";
  }
}

export async function doctorEnterpriseKnowledge(params: {
  databaseOptions?: OpenClawStateDatabaseOptions;
  env?: NodeJS.ProcessEnv;
  now?: number;
}): Promise<{
  ok: boolean;
  checkedAt: number;
  artifacts: {
    checked: number;
    missing: number;
    permissionErrors: number;
    issues: Array<{ kind: "blob" | "normalized" | "directory"; identity: string; code: string }>;
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
}> {
  const options = params.databaseOptions ?? {};
  const env = params.env ?? process.env;
  const now = params.now ?? Date.now();
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const paths = await ensureEnterpriseKnowledgeArtifactDirectories(env);
  const issues: Array<{
    kind: "blob" | "normalized" | "directory";
    identity: string;
    code: string;
  }> = [];
  for (const [label, directory] of Object.entries(paths)) {
    const issue = await artifactIssue(directory, 0o700);
    if (issue) {
      issues.push({ kind: "directory", identity: label, code: issue });
    }
  }
  const versionArtifacts = db
    .prepare(
      `SELECT DISTINCT blob_hash, normalized_artifact_hash
       FROM enterprise_knowledge_source_versions
       WHERE blob_hash IS NOT NULL OR normalized_artifact_hash IS NOT NULL`,
    )
    .all() as Row[];
  let checkedArtifacts = 0;
  let artifactBytes = 0;
  for (const row of versionArtifacts) {
    const blobHash = typeof row.blob_hash === "string" ? row.blob_hash : null;
    const normalizedHash =
      typeof row.normalized_artifact_hash === "string" ? row.normalized_artifact_hash : null;
    for (const [kind, hash, target] of [
      [
        "blob",
        blobHash,
        blobHash ? path.join(paths.blobs, blobHash.slice(0, 2), `${blobHash}.bin`) : null,
      ],
      [
        "normalized",
        normalizedHash,
        normalizedHash
          ? path.join(paths.normalized, normalizedHash.slice(0, 2), `${normalizedHash}.json`)
          : null,
      ],
    ] as const) {
      if (!hash || !target) {
        continue;
      }
      checkedArtifacts += 1;
      const issue = await artifactIssue(target, 0o600);
      if (issue) {
        if (issues.length < 100) {
          issues.push({ kind, identity: hash, code: issue });
        }
      } else {
        artifactBytes += (await stat(target)).size;
      }
    }
  }
  const generationRows = db
    .prepare(
      `SELECT id, zone_id, artifact_checksum, graph_status, graph_schema_version,
              graph_proposed_count, graph_orphan_count, graph_enrichment_identity_json
       FROM enterprise_knowledge_index_generations
       WHERE status IN ('active', 'candidate') ORDER BY created_at`,
    )
    .all() as Row[];
  const indexIssues: Array<{ zoneId: string; generationId: string; code: string }> = [];
  for (const row of generationRows) {
    const zoneId = String(row.zone_id);
    const generationId = String(row.id);
    const result = await doctorKnowledgeGenerationIndex({
      zoneId,
      generationId,
      expectedChecksum: typeof row.artifact_checksum === "string" ? row.artifact_checksum : null,
      env,
    });
    if (!result.ok) {
      indexIssues.push({ zoneId, generationId, code: result.code });
    }
  }
  const jobRows = db
    .prepare(
      `SELECT status, heartbeat_at, updated_at, completed_at FROM enterprise_knowledge_jobs
       WHERE created_at >= ? OR status IN ('queued', 'running', 'retry_wait')`,
    )
    .all(now - 24 * 60 * 60_000) as Row[];
  const countStatus = (status: string) => jobRows.filter((row) => row.status === status).length;
  const failed24h = jobRows.filter(
    (row) => row.status === "failed" && Number(row.completed_at ?? 0) >= now - 24 * 60 * 60_000,
  ).length;
  const completed24h = jobRows.filter(
    (row) =>
      ["succeeded", "failed", "cancelled"].includes(String(row.status)) &&
      Number(row.completed_at ?? 0) >= now - 24 * 60 * 60_000,
  ).length;
  const stuckOver10m = jobRows.filter(
    (row) =>
      ["queued", "running", "retry_wait"].includes(String(row.status)) &&
      Number(row.heartbeat_at ?? row.updated_at ?? 0) < now - 10 * 60_000,
  ).length;
  const searchRows = db
    .prepare(
      `SELECT action, after_json, outcome FROM enterprise_audit_events
       WHERE action IN ('knowledge.agent.search', 'knowledge.agent.get')
       ORDER BY created_at DESC LIMIT 1000`,
    )
    .all() as Row[];
  const searchEvents = searchRows
    .filter((row) => row.action === "knowledge.agent.search" && row.outcome === "success")
    .map((row) => safeJson(row.after_json));
  const latencies = searchEvents.map((event) => Number(event.latencyMs)).filter(Number.isFinite);
  const partial = searchEvents.filter((event) => event.partial === true).length;
  const zeroHit = searchEvents.filter((event) => Number(event.resultCount) === 0).length;
  const citationAuthorizationFailures = searchRows.filter((row) => {
    if (row.action !== "knowledge.agent.get" || row.outcome !== "failure") {
      return false;
    }
    const code = safeJson(row.after_json).code;
    return code === "CITATION_NOT_AUTHORIZED" || code === "KNOWLEDGE_ACCESS_CHANGED";
  }).length;
  const graphAuditRows = db
    .prepare(
      `SELECT action, after_json, outcome FROM enterprise_audit_events
       WHERE action IN ('knowledge.graph.build', 'knowledge.graph.view', 'knowledge.agent.search')
       ORDER BY created_at DESC LIMIT 2000`,
    )
    .all() as Row[];
  const graphBuildLatencies = graphAuditRows
    .filter((row) => row.action === "knowledge.graph.build" && row.outcome === "success")
    .map((row) => Number(safeJson(row.after_json).latencyMs))
    .filter(Number.isFinite);
  const graphRetrievalLatencies = graphAuditRows
    .filter((row) => row.action === "knowledge.graph.view" && row.outcome === "success")
    .map((row) => Number(safeJson(row.after_json).latencyMs))
    .filter(Number.isFinite);
  const agentGraphEvents = graphAuditRows
    .filter((row) => row.action === "knowledge.agent.search" && row.outcome === "success")
    .map((row) => safeJson(row.after_json));
  const exportRows = db
    .prepare(
      `SELECT status, file_path FROM enterprise_knowledge_graph_exports
       WHERE created_at >= ? OR status IN ('running', 'complete')`,
    )
    .all(now - 24 * 60 * 60_000) as Row[];
  let exportStorageBytes = 0;
  for (const row of exportRows) {
    if (row.status !== "complete" || typeof row.file_path !== "string") {
      continue;
    }
    try {
      exportStorageBytes += (await stat(row.file_path)).size;
    } catch {
      // Missing export files are surfaced on download and do not make the knowledge corpus invalid.
    }
  }
  let filesystemUsedPercent: number | null;
  try {
    const filesystem = await statfs(resolveEnterpriseKnowledgeArtifactPaths(env).root);
    const total = filesystem.blocks * filesystem.bsize;
    filesystemUsedPercent = total
      ? ((filesystem.blocks - filesystem.bavail) * filesystem.bsize * 100) / total
      : null;
  } catch {
    filesystemUsedPercent = null;
  }
  const missing = issues.filter((issue) => issue.code === "missing").length;
  const permissionErrors = issues.filter((issue) => issue.code === "permission").length;
  return {
    ok: issues.length === 0 && indexIssues.length === 0 && stuckOver10m === 0,
    checkedAt: now,
    artifacts: { checked: checkedArtifacts, missing, permissionErrors, issues },
    indexes: {
      checked: generationRows.length,
      invalid: indexIssues.length,
      issues: indexIssues.slice(0, 100),
    },
    jobs: {
      queued: countStatus("queued"),
      running: countStatus("running"),
      retryWait: countStatus("retry_wait"),
      failed24h,
      completed24h,
      stuckOver10m,
      failureRate24h: completed24h ? failed24h / completed24h : 0,
    },
    search: {
      count: searchEvents.length,
      p50Ms: percentile(latencies, 0.5),
      p95Ms: percentile(latencies, 0.95),
      p99Ms: percentile(latencies, 0.99),
      partialRate: searchEvents.length ? partial / searchEvents.length : 0,
      zeroHitRate: searchEvents.length ? zeroHit / searchEvents.length : 0,
      citationAuthorizationFailures,
    },
    graph: {
      generationsV2: generationRows.filter((row) => Number(row.graph_schema_version) >= 2).length,
      ready: generationRows.filter((row) => row.graph_status === "ready").length,
      degraded: generationRows.filter((row) => row.graph_status === "degraded").length,
      error: generationRows.filter((row) => row.graph_status === "error").length,
      proposedEdges: generationRows.reduce(
        (sum, row) => sum + Number(row.graph_proposed_count ?? 0),
        0,
      ),
      orphanNodes: generationRows.reduce(
        (sum, row) => sum + Number(row.graph_orphan_count ?? 0),
        0,
      ),
      enrichmentIdentities: generationRows.filter(
        (row) => typeof row.graph_enrichment_identity_json === "string",
      ).length,
      buildP50Ms: percentile(graphBuildLatencies, 0.5),
      buildP95Ms: percentile(graphBuildLatencies, 0.95),
      retrievalP95Ms: percentile(graphRetrievalLatencies, 0.95),
      timeouts: agentGraphEvents.filter((event) => event.graphAvailability === "timeout").length,
      truncations: agentGraphEvents.filter((event) => event.graphTruncated === true).length,
    },
    exports: {
      running: exportRows.filter((row) => row.status === "running").length,
      complete: exportRows.filter((row) => row.status === "complete").length,
      failed: exportRows.filter((row) => row.status === "failed").length,
      expired: exportRows.filter((row) => row.status === "expired").length,
      storageBytes: exportStorageBytes,
    },
    storage: { artifactBytes, filesystemUsedPercent },
  };
}
