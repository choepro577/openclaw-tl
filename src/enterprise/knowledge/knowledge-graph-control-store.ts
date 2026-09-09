import {
  KNOWLEDGE_GRAPH_EDGE_KINDS,
  normalizeKnowledgeCanonicalKey,
  type KnowledgeGraphEdgeKind,
} from "@openclaw/knowledge-graph-core";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  integer,
  nullableText,
  text,
  type KnowledgeStoreRow as Row,
} from "./knowledge-store-common.js";
import {
  assertBaseRevision,
  EnterpriseKnowledgeError,
  type KnowledgeGraphReviewDecision,
  type KnowledgeGraphSettings,
  type KnowledgeLocator,
  type KnowledgeZone,
} from "./knowledge-types.js";
import { getKnowledgeZone } from "./knowledge-zone-store.js";

export type KnowledgeGraphReviewOverlay = {
  fingerprint: string;
  reviewStatus: "accepted" | "rejected";
  edgeKind: KnowledgeGraphEdgeKind | null;
  note: string | null;
  evidenceHash: string;
  updatedAt: number;
};

export type KnowledgeGraphManualEdge = {
  id: string;
  zoneId: string;
  sourceCanonicalKey: string;
  targetCanonicalKey: string;
  edgeKind: KnowledgeGraphEdgeKind;
  evidenceSourceVersionId: string;
  evidenceSegmentId: string;
  evidenceLocator: KnowledgeLocator;
  note: string | null;
  revision: number;
  updatedAt: number;
};

function isGraphEdgeKind(value: string): value is KnowledgeGraphEdgeKind {
  return (KNOWLEDGE_GRAPH_EDGE_KINDS as readonly string[]).includes(value);
}

function settingsFromRow(row: Row): KnowledgeGraphSettings {
  return {
    enabled: integer(row, "enabled") === 1,
    enrichmentEnabled: integer(row, "enrichment_enabled") === 1,
    autoApprovalThreshold: Number(row.auto_approval_threshold),
    updatedAt: integer(row, "updated_at"),
  };
}

export function getKnowledgeGraphSettings(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeGraphSettings {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const row = database.db
    .prepare("SELECT * FROM enterprise_knowledge_graph_settings WHERE zone_id = ?")
    .get(zoneId) as Row | undefined;
  if (row) {
    return settingsFromRow(row);
  }
  if (!getKnowledgeZone(zoneId, { ...options, database })) {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
  }
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO enterprise_knowledge_graph_settings
           (zone_id, enabled, enrichment_enabled, auto_approval_threshold, revision,
            updated_by_account_id, created_at, updated_at)
           VALUES (?, 1, 1, 0.92, 1, NULL, ?, ?)`,
        )
        .run(zoneId, now, now),
    { ...options, database },
    { operationLabel: "enterprise.knowledge.graph.settings.ensure" },
  );
  const created = database.db
    .prepare("SELECT * FROM enterprise_knowledge_graph_settings WHERE zone_id = ?")
    .get(zoneId) as Row;
  return settingsFromRow(created);
}

export function updateKnowledgeGraphSettings(
  zoneId: string,
  input: {
    baseRevision: number;
    enabled?: boolean;
    enrichmentEnabled?: boolean;
    autoApprovalThreshold?: number;
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): { zone: KnowledgeZone; settings: KnowledgeGraphSettings } {
  ensureEnterpriseSchema(options);
  const threshold = input.autoApprovalThreshold;
  if (
    threshold !== undefined &&
    (!Number.isFinite(threshold) || threshold < 0.92 || threshold > 1)
  ) {
    throw new EnterpriseKnowledgeError(
      "INVALID_GRAPH_THRESHOLD",
      422,
      "Auto-approval threshold must be between 0.92 and 1.0.",
    );
  }
  const currentSettings = getKnowledgeGraphSettings(zoneId, options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(input.baseRevision, integer(zone, "revision"));
      const now = Date.now();
      db.prepare(
        `UPDATE enterprise_knowledge_graph_settings SET enabled = ?, enrichment_enabled = ?,
         auto_approval_threshold = ?, revision = revision + 1, updated_by_account_id = ?, updated_at = ?
         WHERE zone_id = ?`,
      ).run(
        (input.enabled ?? currentSettings.enabled) ? 1 : 0,
        (input.enrichmentEnabled ?? currentSettings.enrichmentEnabled) ? 1 : 0,
        threshold ?? currentSettings.autoApprovalThreshold,
        actorAccountId,
        now,
        zoneId,
      );
      const changed = db
        .prepare(
          `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
           build_revision = COALESCE(build_revision, source_set_revision) + 1,
           updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
        )
        .run(actorAccountId, now, zoneId, input.baseRevision);
      if (changed.changes !== 1) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed. Reload and retry.",
        );
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.graph.settings.update" },
  );
  return {
    zone: getKnowledgeZone(zoneId, options)!,
    settings: getKnowledgeGraphSettings(zoneId, options),
  };
}

export function listKnowledgeGraphReviewOverlays(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeGraphReviewOverlay[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT * FROM enterprise_knowledge_graph_edge_reviews
         WHERE zone_id = ? ORDER BY updated_at DESC, fingerprint ASC`,
      )
      .all(zoneId) as Row[]
  ).map((row) => ({
    fingerprint: text(row, "fingerprint"),
    reviewStatus: text(row, "review_status") === "accepted" ? "accepted" : "rejected",
    edgeKind: nullableText(row, "edge_kind") as KnowledgeGraphEdgeKind | null,
    note: nullableText(row, "note"),
    evidenceHash: text(row, "evidence_hash"),
    updatedAt: integer(row, "updated_at"),
  }));
}

export function applyKnowledgeGraphReviewDecisions(
  zoneId: string,
  params: {
    baseRevision: number;
    decisions: Array<KnowledgeGraphReviewDecision & { fingerprint: string; evidenceHash: string }>;
    actorAccountId: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  if (params.decisions.length === 0 || params.decisions.length > 200) {
    throw new EnterpriseKnowledgeError(
      "INVALID_REVIEW_BATCH",
      422,
      "Review 1-200 edges at a time.",
    );
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(params.baseRevision, integer(zone, "revision"));
      const now = Date.now();
      const upsert = db.prepare(
        `INSERT INTO enterprise_knowledge_graph_edge_reviews
         (zone_id, fingerprint, review_status, edge_kind, note, evidence_hash,
          reviewed_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(zone_id, fingerprint) DO UPDATE SET review_status = excluded.review_status,
          edge_kind = excluded.edge_kind, note = excluded.note,
          evidence_hash = excluded.evidence_hash, reviewed_by_account_id = excluded.reviewed_by_account_id,
          updated_at = excluded.updated_at`,
      );
      for (const decision of params.decisions) {
        const edgeKind = decision.edgeKind;
        if (edgeKind && !isGraphEdgeKind(edgeKind)) {
          throw new EnterpriseKnowledgeError(
            "INVALID_EDGE_KIND",
            422,
            "Graph edge kind is invalid.",
          );
        }
        if (decision.decision === "change_kind" && !edgeKind) {
          throw new EnterpriseKnowledgeError(
            "EDGE_KIND_REQUIRED",
            422,
            "Choose a replacement edge kind.",
          );
        }
        upsert.run(
          zoneId,
          decision.fingerprint,
          decision.decision === "reject" ? "rejected" : "accepted",
          decision.decision === "change_kind" ? (edgeKind ?? null) : null,
          decision.note?.trim().slice(0, 1_000) || null,
          decision.evidenceHash,
          params.actorAccountId,
          now,
          now,
        );
      }
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
      ).run(params.actorAccountId, now, zoneId, params.baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.graph.review.batch" },
  );
  return getKnowledgeZone(zoneId, options)!;
}

function manualEdgeFromRow(row: Row): KnowledgeGraphManualEdge {
  return {
    id: text(row, "id"),
    zoneId: text(row, "zone_id"),
    sourceCanonicalKey: text(row, "source_canonical_key"),
    targetCanonicalKey: text(row, "target_canonical_key"),
    edgeKind: text(row, "edge_kind") as KnowledgeGraphEdgeKind,
    evidenceSourceVersionId: text(row, "evidence_source_version_id"),
    evidenceSegmentId: text(row, "evidence_segment_id"),
    evidenceLocator: JSON.parse(text(row, "evidence_locator_json")) as KnowledgeLocator,
    note: nullableText(row, "note"),
    revision: integer(row, "revision"),
    updatedAt: integer(row, "updated_at"),
  };
}

export function listKnowledgeGraphManualEdges(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeGraphManualEdge[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT * FROM enterprise_knowledge_graph_manual_edges
         WHERE zone_id = ? AND status = 'active' ORDER BY updated_at DESC, id ASC`,
      )
      .all(zoneId) as Row[]
  ).map(manualEdgeFromRow);
}

export function createKnowledgeGraphManualEdge(
  zoneId: string,
  input: {
    baseRevision: number;
    sourceCanonicalKey: string;
    targetCanonicalKey: string;
    edgeKind: string;
    evidenceSourceVersionId: string;
    evidenceSegmentId: string;
    evidenceLocator: KnowledgeLocator;
    note?: string;
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): { zone: KnowledgeZone; edge: KnowledgeGraphManualEdge } {
  ensureEnterpriseSchema(options);
  if (!isGraphEdgeKind(input.edgeKind)) {
    throw new EnterpriseKnowledgeError("INVALID_EDGE_KIND", 422, "Graph edge kind is invalid.");
  }
  const sourceCanonicalKey = normalizeKnowledgeCanonicalKey(input.sourceCanonicalKey);
  const targetCanonicalKey = normalizeKnowledgeCanonicalKey(input.targetCanonicalKey);
  if (!sourceCanonicalKey || !targetCanonicalKey || sourceCanonicalKey === targetCanonicalKey) {
    throw new EnterpriseKnowledgeError(
      "INVALID_MANUAL_EDGE",
      422,
      "Choose two different graph nodes.",
    );
  }
  const id = generateSecureUuid();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(input.baseRevision, integer(zone, "revision"));
      const version = db
        .prepare("SELECT 1 FROM enterprise_knowledge_source_versions WHERE id = ? AND zone_id = ?")
        .get(input.evidenceSourceVersionId, zoneId);
      if (!version) {
        throw new EnterpriseKnowledgeError("EVIDENCE_NOT_FOUND", 404, "Evidence was not found.");
      }
      const now = Date.now();
      db.prepare(
        `INSERT INTO enterprise_knowledge_graph_manual_edges
         (id, zone_id, source_canonical_key, target_canonical_key, edge_kind,
          evidence_source_version_id, evidence_segment_id, evidence_locator_json, note,
          status, revision, created_by_account_id, updated_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, ?)`,
      ).run(
        id,
        zoneId,
        sourceCanonicalKey,
        targetCanonicalKey,
        input.edgeKind,
        input.evidenceSourceVersionId,
        input.evidenceSegmentId,
        JSON.stringify(input.evidenceLocator),
        input.note?.trim().slice(0, 1_000) || null,
        actorAccountId,
        actorAccountId,
        now,
        now,
      );
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
      ).run(actorAccountId, now, zoneId, input.baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.graph.manual.create" },
  );
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_graph_manual_edges WHERE id = ?")
    .get(id) as Row;
  return { zone: getKnowledgeZone(zoneId, options)!, edge: manualEdgeFromRow(row) };
}

export function updateKnowledgeGraphManualEdge(
  zoneId: string,
  edgeId: string,
  input: {
    baseRevision: number;
    edgeRevision: number;
    sourceCanonicalKey: string;
    targetCanonicalKey: string;
    edgeKind: string;
    evidenceSourceVersionId: string;
    evidenceSegmentId: string;
    evidenceLocator: KnowledgeLocator;
    note?: string;
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): { zone: KnowledgeZone; edge: KnowledgeGraphManualEdge } {
  ensureEnterpriseSchema(options);
  if (!isGraphEdgeKind(input.edgeKind)) {
    throw new EnterpriseKnowledgeError("INVALID_EDGE_KIND", 422, "Graph edge kind is invalid.");
  }
  const sourceCanonicalKey = normalizeKnowledgeCanonicalKey(input.sourceCanonicalKey);
  const targetCanonicalKey = normalizeKnowledgeCanonicalKey(input.targetCanonicalKey);
  if (!sourceCanonicalKey || !targetCanonicalKey || sourceCanonicalKey === targetCanonicalKey) {
    throw new EnterpriseKnowledgeError(
      "INVALID_MANUAL_EDGE",
      422,
      "Choose two different graph nodes.",
    );
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(input.baseRevision, integer(zone, "revision"));
      const version = db
        .prepare("SELECT 1 FROM enterprise_knowledge_source_versions WHERE id = ? AND zone_id = ?")
        .get(input.evidenceSourceVersionId, zoneId);
      if (!version) {
        throw new EnterpriseKnowledgeError("EVIDENCE_NOT_FOUND", 404, "Evidence was not found.");
      }
      const now = Date.now();
      const changed = db
        .prepare(
          `UPDATE enterprise_knowledge_graph_manual_edges SET source_canonical_key = ?,
           target_canonical_key = ?, edge_kind = ?, evidence_source_version_id = ?,
           evidence_segment_id = ?, evidence_locator_json = ?, note = ?, revision = revision + 1,
           updated_by_account_id = ?, updated_at = ?
           WHERE id = ? AND zone_id = ? AND status = 'active' AND revision = ?`,
        )
        .run(
          sourceCanonicalKey,
          targetCanonicalKey,
          input.edgeKind,
          input.evidenceSourceVersionId,
          input.evidenceSegmentId,
          JSON.stringify(input.evidenceLocator),
          input.note?.trim().slice(0, 1_000) || null,
          actorAccountId,
          now,
          edgeId,
          zoneId,
          input.edgeRevision,
        );
      if (changed.changes !== 1) {
        throw new EnterpriseKnowledgeError("EDGE_NOT_FOUND", 404, "Manual edge not found.");
      }
      const revision = db
        .prepare(
          `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
           build_revision = COALESCE(build_revision, source_set_revision) + 1,
           updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
        )
        .run(actorAccountId, now, zoneId, input.baseRevision);
      if (revision.changes !== 1) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed. Reload and retry.",
        );
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.graph.manual.update" },
  );
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_graph_manual_edges WHERE id = ?")
    .get(edgeId) as Row;
  return { zone: getKnowledgeZone(zoneId, options)!, edge: manualEdgeFromRow(row) };
}

export function deleteKnowledgeGraphManualEdge(
  zoneId: string,
  edgeId: string,
  params: { baseRevision: number; edgeRevision: number; actorAccountId: string },
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(params.baseRevision, integer(zone, "revision"));
      const now = Date.now();
      const edge = db
        .prepare(
          `UPDATE enterprise_knowledge_graph_manual_edges SET status = 'deleted', revision = revision + 1,
           updated_by_account_id = ?, updated_at = ?
           WHERE id = ? AND zone_id = ? AND status = 'active' AND revision = ?`,
        )
        .run(params.actorAccountId, now, edgeId, zoneId, params.edgeRevision);
      if (edge.changes !== 1) {
        throw new EnterpriseKnowledgeError("EDGE_NOT_FOUND", 404, "Manual edge not found.");
      }
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
         build_revision = COALESCE(build_revision, source_set_revision) + 1,
         updated_by_account_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
      ).run(params.actorAccountId, now, zoneId, params.baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.graph.manual.delete" },
  );
  return getKnowledgeZone(zoneId, options)!;
}
