import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { SharedAgentRelationshipProfile } from "./user-api-contracts.js";

export type SharedAgentRelationshipDraft = Omit<
  SharedAgentRelationshipProfile,
  "revision" | "updatedAt"
>;

type RelationshipRow = {
  account_id: string;
  profile_json: string;
  revision: number;
  updated_at: number;
};

function normalizedAgentId(agentId: string): string {
  const normalized = agentId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(normalized)) {
    throw new Error("AGENT_ID_INVALID");
  }
  return normalized;
}

export function defaultSharedAgentRelationship(displayName: string): SharedAgentRelationshipDraft {
  return {
    agentAlias: "",
    agentSelfReference: "",
    userAddress: displayName.trim(),
    customInstructions: "",
  };
}

function storedText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toRelationship(
  row: Pick<RelationshipRow, "profile_json" | "revision" | "updated_at"> | undefined,
  displayName: string,
): SharedAgentRelationshipProfile {
  const fallback = defaultSharedAgentRelationship(displayName);
  if (!row) {
    return { ...fallback, revision: 0, updatedAt: 0 };
  }
  try {
    const parsed = JSON.parse(row.profile_json) as Record<string, unknown>;
    return {
      agentAlias: storedText(parsed.agentAlias, fallback.agentAlias),
      agentSelfReference: storedText(parsed.agentSelfReference, fallback.agentSelfReference),
      userAddress: storedText(parsed.userAddress, fallback.userAddress),
      customInstructions: storedText(parsed.customInstructions, fallback.customInstructions),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...fallback, revision: row.revision, updatedAt: row.updated_at };
  }
}

export function readSharedAgentRelationship(
  accountId: string,
  agentId: string,
  displayName: string,
  options: OpenClawStateDatabaseOptions = {},
): SharedAgentRelationshipProfile {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT profile_json, revision, updated_at
       FROM enterprise_shared_agent_relationships
       WHERE account_id = ? AND agent_id = ? LIMIT 1`,
    )
    .get(accountId, normalizedAgentId(agentId)) as RelationshipRow | undefined; // sqlite-allow-raw -- Account and runtime Agent id are the relationship boundary.
  return toRelationship(row, displayName);
}

export function listSharedAgentRelationshipAccountIds(
  agentId: string,
  options: OpenClawStateDatabaseOptions = {},
): string[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT account_id FROM enterprise_shared_agent_relationships
       WHERE agent_id = ? ORDER BY updated_at DESC, account_id ASC`,
    )
    .all(normalizedAgentId(agentId)) as Array<Pick<RelationshipRow, "account_id">>; // sqlite-allow-raw -- Admin inventory for one canonical shared Agent.
  return rows.map((row) => row.account_id);
}

export function writeSharedAgentRelationship(
  accountId: string,
  agentId: string,
  baseRevision: number,
  profile: SharedAgentRelationshipDraft,
  options: OpenClawStateDatabaseOptions = {},
): SharedAgentRelationshipProfile {
  ensureEnterpriseSchema(options);
  const normalized = normalizedAgentId(agentId);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare(
          `SELECT revision FROM enterprise_shared_agent_relationships
           WHERE account_id = ? AND agent_id = ? LIMIT 1`,
        )
        .get(accountId, normalized) as Pick<RelationshipRow, "revision"> | undefined; // sqlite-allow-raw -- CAS is scoped by account and canonical Agent id.
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== baseRevision) {
        throw new Error(`SHARED_RELATIONSHIP_REVISION_CONFLICT:${currentRevision}`);
      }
      const now = Date.now();
      const revision = currentRevision + 1;
      db.prepare(
        `INSERT INTO enterprise_shared_agent_relationships
          (account_id, agent_id, schema_version, profile_json, revision, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT(account_id, agent_id) DO UPDATE SET
           schema_version = excluded.schema_version,
           profile_json = excluded.profile_json,
           revision = excluded.revision,
           updated_at = excluded.updated_at`,
      ).run(accountId, normalized, JSON.stringify(profile), revision, now, now); // sqlite-allow-raw -- Atomic account-Agent relationship update.
      return { ...profile, revision, updatedAt: now };
    },
    options,
    { operationLabel: "enterprise.shared-agent-relationship.write" },
  );
}
