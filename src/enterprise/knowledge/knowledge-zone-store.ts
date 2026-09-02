import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { parseEnterpriseResourceKey } from "../entitlements/resource-keys.js";
import {
  integer,
  normalizeLabel,
  normalizeSlug,
  nullableText,
  text,
  toZone,
  type KnowledgeStoreRow as Row,
} from "./knowledge-store-common.js";
import {
  assertBaseRevision,
  EnterpriseKnowledgeError,
  type KnowledgeZone,
  type KnowledgeZoneRole,
} from "./knowledge-types.js";

export function createKnowledgeZone(
  input: {
    slug: string;
    name: string;
    description?: string;
    egressPolicy?: "local_only" | "external_allowed";
    graph?: {
      enabled: boolean;
      enrichmentEnabled?: boolean;
      autoApprovalThreshold?: number;
    };
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  const id = generateSecureUuid();
  const now = Date.now();
  try {
    runOpenClawStateWriteTransaction(
      ({ db }) => {
        db.prepare(
          `INSERT INTO enterprise_knowledge_zones
            (id, slug, name, description, status, egress_policy, revision, access_revision,
             source_set_revision, build_revision, active_publication_id, created_by_account_id,
             updated_by_account_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, 1, 1, 1, 1, NULL, ?, ?, ?, ?)`,
        ).run(
          id,
          normalizeSlug(input.slug),
          normalizeLabel(input.name, "name", 160),
          (input.description ?? "").trim().slice(0, 4_000),
          input.egressPolicy ?? "local_only",
          actorAccountId,
          actorAccountId,
          now,
          now,
        );
        db.prepare(
          `INSERT INTO enterprise_knowledge_graph_settings
           (zone_id, enabled, enrichment_enabled, auto_approval_threshold, revision,
            updated_by_account_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        ).run(
          id,
          input.graph?.enabled ? 1 : 0,
          input.graph?.enrichmentEnabled === false ? 0 : 1,
          Math.max(0.92, Math.min(1, input.graph?.autoApprovalThreshold ?? 0.92)),
          actorAccountId,
          now,
          now,
        );
      },
      options,
      { operationLabel: "enterprise.knowledge.zone.create" },
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new EnterpriseKnowledgeError(
        "ZONE_SLUG_CONFLICT",
        409,
        "That zone slug already exists.",
      );
    }
    throw error;
  }
  return getKnowledgeZone(id, options)!;
}

export function getKnowledgeZone(
  idOrSlug: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_knowledge_zones WHERE id = ? OR slug = ? LIMIT 1")
    .get(idOrSlug, idOrSlug) as Row | undefined;
  return row ? toZone(row) : undefined;
}

export function listKnowledgeZones(
  input: {
    accountId?: string;
    includeArchived?: boolean;
    limit?: number;
    cursor?: string;
    query?: string;
  } = {},
  options: OpenClawStateDatabaseOptions = {},
): { items: Array<KnowledgeZone & { role?: KnowledgeZoneRole }>; nextCursor: string | null } {
  ensureEnterpriseSchema(options);
  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
  const values: Array<string | number> = [];
  const conditions: string[] = [];
  let join = "";
  let roleSelect = "";
  if (input.accountId) {
    join = "JOIN enterprise_knowledge_zone_memberships m ON m.zone_id = z.id";
    roleSelect = ", m.role AS membership_role";
    conditions.push("m.account_id = ?");
    values.push(input.accountId);
  }
  if (!input.includeArchived) {
    conditions.push("z.status = 'active'");
  }
  if (input.query?.trim()) {
    conditions.push("(z.name LIKE ? ESCAPE '\\' OR z.slug LIKE ? ESCAPE '\\')");
    const escaped = input.query
      .trim()
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");
    values.push(`%${escaped}%`, `%${escaped}%`);
  }
  if (input.cursor) {
    conditions.push("z.id > ?");
    values.push(input.cursor);
  }
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT z.*${roleSelect} FROM enterprise_knowledge_zones z ${join}
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY z.id ASC LIMIT ?`,
    )
    .all(...values, limit + 1) as Row[];
  return {
    items: rows
      .slice(0, limit)
      .map((row) =>
        Object.assign(
          toZone(row),
          row.membership_role ? { role: text(row, "membership_role") as KnowledgeZoneRole } : {},
        ),
      ),
    nextCursor: rows.length > limit ? text(rows[limit - 1]!, "id") : null,
  };
}

export function updateKnowledgeZone(
  zoneId: string,
  input: {
    baseRevision: number;
    name?: string;
    description?: string;
    egressPolicy?: "local_only" | "external_allowed";
  },
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare("SELECT * FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!current) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(input.baseRevision, integer(current, "revision"));
      const result = db
        .prepare(
          `UPDATE enterprise_knowledge_zones SET name = ?, description = ?, egress_policy = ?,
         revision = revision + 1, build_revision = COALESCE(build_revision, source_set_revision) + 1,
         updated_by_account_id = ?, updated_at = ?
         WHERE id = ? AND revision = ?`,
        )
        .run(
          input.name === undefined
            ? text(current, "name")
            : normalizeLabel(input.name, "name", 160),
          input.description === undefined
            ? text(current, "description")
            : input.description.trim().slice(0, 4_000),
          input.egressPolicy ?? text(current, "egress_policy"),
          actorAccountId,
          Date.now(),
          zoneId,
          input.baseRevision,
        );
      if (result.changes !== 1) {
        throw new EnterpriseKnowledgeError(
          "STALE_REVISION",
          409,
          "The zone changed. Reload and retry.",
        );
      }
    },
    options,
    { operationLabel: "enterprise.knowledge.zone.update" },
  );
  return getKnowledgeZone(zoneId, options)!;
}

export function setKnowledgeZoneArchived(
  zoneId: string,
  archived: boolean,
  baseRevision: number,
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!current) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(baseRevision, integer(current, "revision"));
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET status = ?, revision = revision + 1,
         access_revision = access_revision + 1, updated_by_account_id = ?, updated_at = ?
         WHERE id = ? AND revision = ?`,
      ).run(archived ? "archived" : "active", actorAccountId, Date.now(), zoneId, baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.zone.archive" },
  );
  return getKnowledgeZone(zoneId, options)!;
}

export type KnowledgeZonePurgePreview = {
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

export function previewKnowledgeZonePurge(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZonePurgePreview | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT z.id AS zone_id, z.slug, z.status,
        (SELECT COUNT(*) FROM enterprise_knowledge_sources s WHERE s.zone_id = z.id) AS sources,
        (SELECT COUNT(*) FROM enterprise_knowledge_source_versions v WHERE v.zone_id = z.id) AS versions,
        (SELECT COUNT(*) FROM enterprise_knowledge_publications p WHERE p.zone_id = z.id) AS publications,
        (SELECT COUNT(*) FROM enterprise_knowledge_index_generations g WHERE g.zone_id = z.id) AS generations,
        (SELECT COUNT(*) FROM enterprise_knowledge_jobs j WHERE j.zone_id = z.id
          AND j.status IN ('queued', 'running', 'retry_wait')) AS active_jobs,
        (SELECT COUNT(*) FROM enterprise_knowledge_uploads u WHERE u.zone_id = z.id
          AND u.state IN ('active', 'committing')) AS active_uploads
       FROM enterprise_knowledge_zones z WHERE z.id = ?`,
    )
    .get(zoneId) as Row | undefined;
  return row
    ? {
        zoneId: text(row, "zone_id"),
        slug: text(row, "slug"),
        status: text(row, "status"),
        sources: integer(row, "sources"),
        versions: integer(row, "versions"),
        publications: integer(row, "publications"),
        generations: integer(row, "generations"),
        activeJobs: integer(row, "active_jobs"),
        activeUploads: integer(row, "active_uploads"),
      }
    : undefined;
}

export function purgeKnowledgeZone(
  params: { zoneId: string; baseRevision: number; confirmation: string },
  options: OpenClawStateDatabaseOptions = {},
): { blobHashes: string[]; normalizedArtifactHashes: string[]; generationIds: string[] } {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT slug, status, revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(params.zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(params.baseRevision, integer(zone, "revision"));
      if (text(zone, "status") !== "archived") {
        throw new EnterpriseKnowledgeError(
          "ZONE_MUST_BE_ARCHIVED",
          409,
          "Archive the Zone before permanent purge.",
        );
      }
      if (params.confirmation !== text(zone, "slug")) {
        throw new EnterpriseKnowledgeError(
          "PURGE_CONFIRMATION_INVALID",
          422,
          "Typed confirmation does not match the Zone slug.",
        );
      }
      const blockers = db
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM enterprise_knowledge_jobs WHERE zone_id = ?
             AND status IN ('queued', 'running', 'retry_wait')) AS active_jobs,
            (SELECT COUNT(*) FROM enterprise_knowledge_uploads WHERE zone_id = ?
             AND state IN ('active', 'committing')) AS active_uploads`,
        )
        .get(params.zoneId, params.zoneId) as Row;
      if (integer(blockers, "active_jobs") > 0 || integer(blockers, "active_uploads") > 0) {
        throw new EnterpriseKnowledgeError(
          "PURGE_BLOCKED",
          409,
          "Cancel active jobs and uploads before purge.",
        );
      }
      const artifacts = db
        .prepare(
          `SELECT blob_hash, normalized_artifact_hash
           FROM enterprise_knowledge_source_versions WHERE zone_id = ?`,
        )
        .all(params.zoneId) as Row[];
      const generations = db
        .prepare("SELECT id FROM enterprise_knowledge_index_generations WHERE zone_id = ?")
        .all(params.zoneId) as Row[];
      // The immutable publication/version graph deliberately uses RESTRICT so an
      // accidental Zone delete cannot silently erase evidence. A typed purge is
      // the only place where the graph is removed, in dependency order, inside
      // the same revision-fenced transaction.
      db.prepare(
        `DELETE FROM enterprise_knowledge_publication_sources
         WHERE publication_id IN (
           SELECT id FROM enterprise_knowledge_publications WHERE zone_id = ?
         )`,
      ).run(params.zoneId);
      db.prepare("DELETE FROM enterprise_knowledge_publications WHERE zone_id = ?").run(
        params.zoneId,
      );
      db.prepare("DELETE FROM enterprise_knowledge_jobs WHERE zone_id = ?").run(params.zoneId);
      db.prepare("DELETE FROM enterprise_knowledge_uploads WHERE zone_id = ?").run(params.zoneId);
      db.prepare("DELETE FROM enterprise_knowledge_source_versions WHERE zone_id = ?").run(
        params.zoneId,
      );
      db.prepare("DELETE FROM enterprise_knowledge_sources WHERE zone_id = ?").run(params.zoneId);
      db.prepare("DELETE FROM enterprise_knowledge_index_generations WHERE zone_id = ?").run(
        params.zoneId,
      );
      db.prepare("DELETE FROM enterprise_knowledge_zones WHERE id = ?").run(params.zoneId);
      const blobHashes = new Set<string>();
      const normalizedArtifactHashes = new Set<string>();
      for (const artifact of artifacts) {
        const blobHash = nullableText(artifact, "blob_hash");
        if (
          blobHash &&
          !(db
            .prepare(
              "SELECT 1 FROM enterprise_knowledge_source_versions WHERE blob_hash = ? LIMIT 1",
            )
            .get(blobHash) as Row | undefined)
        ) {
          blobHashes.add(blobHash);
        }
        const normalizedHash = nullableText(artifact, "normalized_artifact_hash");
        if (
          normalizedHash &&
          !(db
            .prepare(
              `SELECT 1 FROM enterprise_knowledge_source_versions
               WHERE normalized_artifact_hash = ? LIMIT 1`,
            )
            .get(normalizedHash) as Row | undefined)
        ) {
          normalizedArtifactHashes.add(normalizedHash);
        }
      }
      return {
        blobHashes: [...blobHashes],
        normalizedArtifactHashes: [...normalizedArtifactHashes],
        generationIds: generations.map((row) => text(row, "id")),
      };
    },
    options,
    { operationLabel: "enterprise.knowledge.zone.purge" },
  );
}

export function isKnowledgeArtifactReferenced(
  kind: "blob" | "normalized",
  hash: string,
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  const column = kind === "blob" ? "blob_hash" : "normalized_artifact_hash";
  return Boolean(
    openOpenClawStateDatabase(options)
      .db.prepare(`SELECT 1 FROM enterprise_knowledge_source_versions WHERE ${column} = ? LIMIT 1`)
      .get(hash),
  );
}

export function listKnowledgeZoneMemberships(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): Array<{ accountId: string; role: KnowledgeZoneRole; createdAt: number; updatedAt: number }> {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT account_id, role, created_at, updated_at FROM enterprise_knowledge_zone_memberships
     WHERE zone_id = ? ORDER BY role DESC, account_id ASC`,
      )
      .all(zoneId) as Row[]
  ).map((row) => ({
    accountId: text(row, "account_id"),
    role: text(row, "role") as KnowledgeZoneRole,
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  }));
}

export function replaceKnowledgeZoneMemberships(
  zoneId: string,
  members: Array<{ accountId: string; role: KnowledgeZoneRole }>,
  baseRevision: number,
  actorAccountId: string,
  allowManagerChanges: boolean,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  if (members.length > 2_000) {
    throw new EnterpriseKnowledgeError("MEMBERSHIP_LIMIT", 422, "Too many memberships.");
  }
  const unique = new Map<string, KnowledgeZoneRole>();
  for (const member of members) {
    if (!(["viewer", "curator", "manager"] as const).includes(member.role)) {
      throw new EnterpriseKnowledgeError("INVALID_ROLE", 422, "Knowledge role is invalid.");
    }
    if (!allowManagerChanges && member.role === "manager") {
      throw new EnterpriseKnowledgeError(
        "MANAGER_GRANT_FORBIDDEN",
        403,
        "Only an administrator can grant Manager.",
      );
    }
    unique.set(member.accountId, member.role);
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(baseRevision, integer(zone, "revision"));
      if (!allowManagerChanges) {
        const existingManagers = db
          .prepare(
            "SELECT account_id FROM enterprise_knowledge_zone_memberships WHERE zone_id = ? AND role = 'manager'",
          )
          .all(zoneId) as Row[];
        for (const manager of existingManagers) {
          unique.set(text(manager, "account_id"), "manager");
        }
      }
      db.prepare("DELETE FROM enterprise_knowledge_zone_memberships WHERE zone_id = ?").run(zoneId);
      const insert = db.prepare(
        `INSERT INTO enterprise_knowledge_zone_memberships
         (zone_id, account_id, role, created_by_account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const now = Date.now();
      for (const [accountId, role] of unique) {
        const account = db
          .prepare("SELECT enabled FROM enterprise_accounts WHERE id = ?")
          .get(accountId) as Row | undefined;
        if (!account) {
          throw new EnterpriseKnowledgeError(
            "ACCOUNT_NOT_FOUND",
            422,
            "A selected account does not exist.",
          );
        }
        insert.run(zoneId, accountId, role, actorAccountId, now, now);
      }
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
         access_revision = access_revision + 1, updated_by_account_id = ?, updated_at = ?
         WHERE id = ? AND revision = ?`,
      ).run(actorAccountId, now, zoneId, baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.members.replace" },
  );
  return getKnowledgeZone(zoneId, options)!;
}

export function getKnowledgeZoneRole(
  zoneId: string,
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZoneRole | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT role FROM enterprise_knowledge_zone_memberships WHERE zone_id = ? AND account_id = ?",
    )
    .get(zoneId, accountId) as Row | undefined;
  return row ? (text(row, "role") as KnowledgeZoneRole) : undefined;
}

export function listKnowledgeAgentBindings(
  zoneId: string,
  options: OpenClawStateDatabaseOptions = {},
): string[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT agent_resource_key FROM enterprise_knowledge_agent_zone_bindings WHERE zone_id = ? ORDER BY agent_resource_key",
      )
      .all(zoneId) as Row[]
  ).map((row) => text(row, "agent_resource_key"));
}

export function replaceKnowledgeAgentBindings(
  zoneId: string,
  agentResourceKeys: string[],
  baseRevision: number,
  actorAccountId: string,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeZone {
  ensureEnterpriseSchema(options);
  const normalized = [...new Set(agentResourceKeys.map((value) => value.trim()))];
  if (normalized.length > 1_000) {
    throw new EnterpriseKnowledgeError("BINDING_LIMIT", 422, "Too many Agent bindings.");
  }
  for (const key of normalized) {
    const parsed = parseEnterpriseResourceKey("agent", key);
    if (parsed.scope !== "shared" && parsed.scope !== "personal") {
      throw new EnterpriseKnowledgeError(
        "INVALID_AGENT_KEY",
        422,
        "Use a canonical shared or personal Agent key.",
      );
    }
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const zone = db
        .prepare("SELECT revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get(zoneId) as Row | undefined;
      if (!zone) {
        throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
      }
      assertBaseRevision(baseRevision, integer(zone, "revision"));
      db.prepare("DELETE FROM enterprise_knowledge_agent_zone_bindings WHERE zone_id = ?").run(
        zoneId,
      );
      const insert = db.prepare(
        `INSERT INTO enterprise_knowledge_agent_zone_bindings
         (zone_id, agent_resource_key, created_by_account_id, created_at) VALUES (?, ?, ?, ?)`,
      );
      const now = Date.now();
      for (const key of normalized) {
        insert.run(zoneId, key, actorAccountId, now);
      }
      db.prepare(
        `UPDATE enterprise_knowledge_zones SET revision = revision + 1,
         access_revision = access_revision + 1, updated_by_account_id = ?, updated_at = ?
         WHERE id = ? AND revision = ?`,
      ).run(actorAccountId, now, zoneId, baseRevision);
    },
    options,
    { operationLabel: "enterprise.knowledge.bindings.replace" },
  );
  return getKnowledgeZone(zoneId, options)!;
}

export type KnowledgeAgentZoneAccess = {
  zoneId: string;
  slug: string;
  name: string;
  accessRevision: number;
  activePublicationId: string;
  generationId: string;
  publishedAt: number;
  vectorStatus: "ready" | "unavailable" | "error";
  embeddingIdentity: {
    provider: string;
    model: string;
    dimension: number;
  } | null;
  egressPolicy: "local_only" | "external_allowed";
};

export function listPublishedZonesForAgent(
  agentResourceKey: string,
  zoneSlug: string | undefined,
  options: OpenClawStateDatabaseOptions = {},
): KnowledgeAgentZoneAccess[] {
  ensureEnterpriseSchema(options);
  const values: Array<string | number> = [agentResourceKey];
  const zoneFilter = zoneSlug ? "AND z.slug = ?" : "";
  if (zoneSlug) {
    values.push(zoneSlug);
  }
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT z.id AS zone_id, z.slug, z.name, z.access_revision, z.active_publication_id,
            z.egress_policy, p.generation_id, p.published_at, g.vector_status,
            g.embedding_identity_json
     FROM enterprise_knowledge_agent_zone_bindings b
     JOIN enterprise_knowledge_zones z ON z.id = b.zone_id
     JOIN enterprise_knowledge_publications p ON p.id = z.active_publication_id
     JOIN enterprise_knowledge_index_generations g ON g.id = p.generation_id
     WHERE b.agent_resource_key = ? AND z.status = 'active' ${zoneFilter}
     ORDER BY z.id`,
      )
      .all(...values) as Row[]
  ).map((row) => ({
    zoneId: text(row, "zone_id"),
    slug: text(row, "slug"),
    name: text(row, "name"),
    accessRevision: integer(row, "access_revision"),
    activePublicationId: text(row, "active_publication_id"),
    generationId: text(row, "generation_id"),
    publishedAt: integer(row, "published_at"),
    vectorStatus: text(row, "vector_status") as KnowledgeAgentZoneAccess["vectorStatus"],
    embeddingIdentity: nullableText(row, "embedding_identity_json")
      ? (JSON.parse(
          text(row, "embedding_identity_json"),
        ) as KnowledgeAgentZoneAccess["embeddingIdentity"])
      : null,
    egressPolicy: row.egress_policy === "external_allowed" ? "external_allowed" : "local_only",
  }));
}

export function resolveKnowledgeCitationAccessForAgent(
  params: {
    agentResourceKey: string;
    zoneId: string;
    publicationId: string;
    generationId: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): { zoneLabel: string; accessRevision: number; publishedAt: number } | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT z.name, z.access_revision, p.published_at
     FROM enterprise_knowledge_agent_zone_bindings b
     JOIN enterprise_knowledge_zones z ON z.id = b.zone_id
     JOIN enterprise_knowledge_publications p ON p.zone_id = z.id
     JOIN enterprise_knowledge_index_generations g ON g.id = p.generation_id
     WHERE b.agent_resource_key = ? AND z.id = ? AND z.status = 'active'
       AND p.id = ? AND p.generation_id = ? AND g.integrity_status = 'valid' LIMIT 1`,
    )
    .get(params.agentResourceKey, params.zoneId, params.publicationId, params.generationId) as
    | Row
    | undefined;
  return row
    ? {
        zoneLabel: text(row, "name"),
        accessRevision: integer(row, "access_revision"),
        publishedAt: integer(row, "published_at"),
      }
    : undefined;
}
