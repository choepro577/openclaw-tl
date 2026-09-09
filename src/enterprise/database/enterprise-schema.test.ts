import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "./enterprise-schema.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise Knowledge additive schema", () => {
  it("is idempotent, preserves global user_version, and reopens with the generated columns", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-schema-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const database = openOpenClawStateDatabase(options).db;
    const before = database.prepare("PRAGMA user_version").get() as { user_version: number };
    ensureEnterpriseSchema(options);
    ensureEnterpriseSchema(options);
    const after = database.prepare("PRAGMA user_version").get() as { user_version: number };
    expect(after.user_version).toBe(before.user_version);
    expect(
      database
        .prepare(
          "SELECT name FROM pragma_table_info('enterprise_knowledge_evidence_transfer_grants') ORDER BY cid",
        )
        .all(),
    ).toEqual([
      { name: "zone_id" },
      { name: "target_agent_resource_key" },
      { name: "created_by_account_id" },
      { name: "created_at" },
    ]);
    expect(
      database
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN
           ('enterprise_user_skill_installs', 'enterprise_plugin_requests',
            'enterprise_account_plugin_grants', 'enterprise_extension_idempotency')
           ORDER BY name`,
        )
        .all(),
    ).toEqual([
      { name: "enterprise_account_plugin_grants" },
      { name: "enterprise_extension_idempotency" },
      { name: "enterprise_plugin_requests" },
      { name: "enterprise_user_skill_installs" },
    ]);
    expect(
      database
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN
           ('enterprise_delegation_policy', 'enterprise_delegation_overrides',
            'enterprise_delegation_events') ORDER BY name`,
        )
        .all(),
    ).toEqual([
      { name: "enterprise_delegation_events" },
      { name: "enterprise_delegation_overrides" },
      { name: "enterprise_delegation_policy" },
    ]);
    expect(
      database
        .prepare(
          `SELECT name FROM pragma_table_info('enterprise_knowledge_uploads')
           WHERE name IN ('target_source_id', 'chunk_claim_token', 'chunk_claim_expires_at')
           ORDER BY name`,
        )
        .all(),
    ).toEqual([
      { name: "chunk_claim_expires_at" },
      { name: "chunk_claim_token" },
      { name: "target_source_id" },
    ]);
    database
      .prepare(`INSERT INTO enterprise_knowledge_zones
      (id, slug, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run("compat-zone", "compat-zone", "Legacy reader contract", 1, 1);
    database
      .prepare(`INSERT INTO enterprise_knowledge_agent_zone_bindings
      (zone_id, agent_resource_key, created_at) VALUES (?, ?, ?)`)
      .run("compat-zone", "agent:shared:main", 1);
    database
      .prepare(`INSERT INTO enterprise_knowledge_evidence_transfer_grants
      (zone_id, target_agent_resource_key, created_at) VALUES (?, ?, ?)`)
      .run("compat-zone", "agent:shared:contracts", 1);
    closeOpenClawStateDatabaseForTest();
    const reopened = openOpenClawStateDatabase(options).db;
    expect(
      reopened.prepare("SELECT COUNT(*) AS count FROM enterprise_knowledge_zones").get(),
    ).toEqual({ count: 1 });
    expect(reopened.prepare("PRAGMA user_version").get()).toEqual(before);
    // The pre-transfer reader's exact table/column contract remains readable after reopen.
    expect(
      reopened
        .prepare(`SELECT b.agent_resource_key, z.slug FROM enterprise_knowledge_agent_zone_bindings b
      JOIN enterprise_knowledge_zones z ON z.id = b.zone_id WHERE b.zone_id = ?`)
        .all("compat-zone"),
    ).toEqual([{ agent_resource_key: "agent:shared:main", slug: "compat-zone" }]);
    expect(
      reopened
        .prepare(
          "SELECT target_agent_resource_key FROM enterprise_knowledge_evidence_transfer_grants WHERE zone_id = ?",
        )
        .all("compat-zone"),
    ).toEqual([{ target_agent_resource_key: "agent:shared:contracts" }]);
  });

  it("accepts the pre-graph tables and backfills graph lifecycle columns on first use", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-graph-schema-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const database = openOpenClawStateDatabase(options).db;
    ensureEnterpriseSchema(options);

    for (const column of [
      "graph_enrichment_identity_json",
      "graph_orphan_count",
      "graph_proposed_count",
      "graph_edge_count",
      "graph_node_count",
      "graph_schema_version",
      "graph_status",
      "build_revision",
    ]) {
      database.exec(`ALTER TABLE enterprise_knowledge_index_generations DROP COLUMN "${column}"`);
    }
    database.exec('ALTER TABLE enterprise_knowledge_zones DROP COLUMN "build_revision"');
    database
      .prepare(
        `INSERT INTO enterprise_knowledge_zones
         (id, slug, name, source_set_revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run("zone-legacy", "legacy", "Legacy", 4, 1_000, 1_000);
    database
      .prepare(
        `INSERT INTO enterprise_knowledge_index_generations
         (id, zone_id, source_set_revision, status, lexical_status, vector_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("generation-legacy", "zone-legacy", 4, "candidate", "ready", "ready", 1_000);
    closeOpenClawStateDatabaseForTest();

    expect(() => ensureEnterpriseSchema(options)).not.toThrow();
    const migrated = openOpenClawStateDatabase(options).db;
    expect(
      migrated
        .prepare(
          `SELECT build_revision, graph_status, graph_schema_version,
                  graph_node_count, graph_edge_count, graph_proposed_count,
                  graph_orphan_count, graph_enrichment_identity_json
           FROM enterprise_knowledge_index_generations
           WHERE id = ?`,
        )
        .get("generation-legacy"),
    ).toEqual({
      build_revision: 4,
      graph_edge_count: 0,
      graph_enrichment_identity_json: null,
      graph_node_count: 0,
      graph_orphan_count: 0,
      graph_proposed_count: 0,
      graph_schema_version: 1,
      graph_status: "not_built",
    });
    expect(
      migrated
        .prepare("SELECT build_revision FROM enterprise_knowledge_zones WHERE id = ?")
        .get("zone-legacy"),
    ).toEqual({ build_revision: 4 });
  });
});
