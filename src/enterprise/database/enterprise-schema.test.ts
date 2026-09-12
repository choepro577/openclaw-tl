import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { ensureEnterpriseSchema } from "./enterprise-schema.js";

const directories: string[] = [];

function replaceWithPreScopeExtensionSchema(database: DatabaseSync): void {
  // This is the schema shipped before shared-agent ownership. It deliberately
  // keeps the old NOT NULL account/request links and RESTRICT parent FK so the
  // migration test exercises the real dependency boundary.
  database.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS enterprise_account_plugin_grants;
    DROP TABLE IF EXISTS enterprise_plugin_requests;
    DROP TABLE IF EXISTS enterprise_codex_plugin_grants;
    DROP TABLE IF EXISTS enterprise_codex_plugin_requests;

    CREATE TABLE enterprise_plugin_requests (
      id TEXT NOT NULL PRIMARY KEY,
      requester_account_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      package_family TEXT NOT NULL CHECK (package_family IN ('code_plugin', 'bundle_plugin')),
      exact_version TEXT NOT NULL,
      integrity TEXT NOT NULL,
      request_kind TEXT NOT NULL CHECK (request_kind IN ('install', 'access')),
      trust_snapshot_json TEXT NOT NULL,
      capability_snapshot_json TEXT NOT NULL,
      capability_digest TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('pending', 'approving', 'available', 'rejected', 'cancelled', 'install_failed')),
      installed_plugin_id TEXT,
      reviewer_account_id TEXT,
      decision_reason TEXT,
      safe_error_code TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      decided_at INTEGER,
      FOREIGN KEY (requester_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
    ) STRICT;
    CREATE INDEX idx_enterprise_plugin_requests_account
      ON enterprise_plugin_requests(requester_account_id, state, updated_at DESC);
    CREATE INDEX idx_enterprise_plugin_requests_admin
      ON enterprise_plugin_requests(state, created_at ASC);
    CREATE UNIQUE INDEX idx_enterprise_plugin_requests_open
      ON enterprise_plugin_requests(requester_account_id, package_name, exact_version)
      WHERE state IN ('pending', 'approving');

    CREATE TABLE enterprise_account_plugin_grants (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL,
      plugin_id TEXT NOT NULL,
      exact_version TEXT NOT NULL,
      integrity TEXT NOT NULL,
      capability_digest TEXT NOT NULL,
      approved_tools_json TEXT NOT NULL,
      source_request_id TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('active', 'suspended_version_mismatch', 'unavailable', 'orphaned', 'revoked')),
      revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (source_request_id) REFERENCES enterprise_plugin_requests(id) ON DELETE RESTRICT,
      UNIQUE (account_id, plugin_id)
    ) STRICT;
    CREATE INDEX idx_enterprise_account_plugin_grants_active
      ON enterprise_account_plugin_grants(account_id, state, updated_at DESC);

    CREATE TABLE enterprise_codex_plugin_requests (
      id TEXT NOT NULL PRIMARY KEY,
      requester_account_id TEXT NOT NULL,
      agent_key TEXT NOT NULL,
      runtime_agent_id TEXT NOT NULL,
      plugin_name TEXT NOT NULL,
      marketplace_name TEXT NOT NULL,
      remote_plugin_id TEXT,
      request_kind TEXT NOT NULL CHECK (request_kind IN ('install', 'access')),
      catalog_snapshot_json TEXT NOT NULL,
      capability_snapshot_json TEXT NOT NULL,
      capability_digest TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('pending', 'approving', 'available', 'rejected', 'cancelled', 'install_failed')),
      installed_plugin_id TEXT,
      auth_required INTEGER NOT NULL DEFAULT 0 CHECK (auth_required IN (0, 1)),
      apps_needing_auth_json TEXT NOT NULL DEFAULT '[]',
      connect_urls_json TEXT NOT NULL DEFAULT '[]',
      reviewer_account_id TEXT,
      decision_reason TEXT,
      safe_error_code TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      decided_at INTEGER,
      FOREIGN KEY (requester_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
    ) STRICT;
    CREATE INDEX idx_enterprise_codex_plugin_requests_account
      ON enterprise_codex_plugin_requests(requester_account_id, runtime_agent_id, state, updated_at DESC);
    CREATE INDEX idx_enterprise_codex_plugin_requests_admin
      ON enterprise_codex_plugin_requests(state, created_at ASC);
    CREATE UNIQUE INDEX idx_enterprise_codex_plugin_requests_open
      ON enterprise_codex_plugin_requests(requester_account_id, runtime_agent_id, plugin_name, marketplace_name)
      WHERE state IN ('pending', 'approving');

    CREATE TABLE enterprise_codex_plugin_grants (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL,
      agent_key TEXT NOT NULL,
      runtime_agent_id TEXT NOT NULL,
      plugin_name TEXT NOT NULL,
      marketplace_name TEXT NOT NULL,
      remote_plugin_id TEXT,
      installed_plugin_id TEXT,
      capability_snapshot_json TEXT NOT NULL,
      capability_digest TEXT NOT NULL,
      source_request_id TEXT NOT NULL,
      auth_required INTEGER NOT NULL DEFAULT 0 CHECK (auth_required IN (0, 1)),
      apps_needing_auth_json TEXT NOT NULL DEFAULT '[]',
      connect_urls_json TEXT NOT NULL DEFAULT '[]',
      ready INTEGER NOT NULL DEFAULT 0 CHECK (ready IN (0, 1)),
      state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'unavailable', 'revoked')),
      revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (source_request_id) REFERENCES enterprise_codex_plugin_requests(id) ON DELETE RESTRICT,
      UNIQUE (account_id, runtime_agent_id, plugin_name, marketplace_name)
    ) STRICT;
    CREATE INDEX idx_enterprise_codex_plugin_grants_active
      ON enterprise_codex_plugin_grants(account_id, runtime_agent_id, state, updated_at DESC);
    PRAGMA foreign_keys = ON;
  `);
}

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

  it("rebuilds a legacy native grant index shape without collapsing private and shared rows", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-extension-grant-schema-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    ensureEnterpriseSchema(options);
    const account = createEnterpriseAccount(
      {
        username: "grant-schema-owner",
        displayName: "Grant Schema Owner",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      },
      options,
    );
    const database = openOpenClawStateDatabase(options).db;
    const insert = database.prepare(
      `INSERT INTO enterprise_account_plugin_grants
       (id, account_id, scope, agent_key, runtime_agent_id, plugin_id, exact_version, integrity,
        capability_digest, approved_tools_json, state, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insert.run(
      randomUUID(),
      account.id,
      "account",
      null,
      null,
      "same-plugin",
      "1.0.0",
      "sha256:private",
      "private-digest",
      '["private.search"]',
      "active",
      1,
      1,
      1,
    );
    insert.run(
      randomUUID(),
      account.id,
      "shared_agent",
      "shared:support",
      "support",
      "same-plugin",
      "1.0.0",
      "sha256:shared",
      "shared-digest",
      '["shared.search"]',
      "active",
      1,
      2,
      2,
    );
    database.exec(
      "DROP INDEX idx_enterprise_account_plugin_grants_account_unique; DROP INDEX idx_enterprise_account_plugin_grants_shared_unique;",
    );
    closeOpenClawStateDatabaseForTest();

    expect(() => ensureEnterpriseSchema(options)).not.toThrow();
    const migrated = openOpenClawStateDatabase(options).db;
    expect(
      migrated
        .prepare(
          `SELECT scope, account_id, runtime_agent_id, plugin_id
           FROM enterprise_account_plugin_grants ORDER BY scope`,
        )
        .all(),
    ).toEqual([
      {
        scope: "account",
        account_id: account.id,
        runtime_agent_id: null,
        plugin_id: "same-plugin",
      },
      {
        scope: "shared_agent",
        account_id: account.id,
        runtime_agent_id: "support",
        plugin_id: "same-plugin",
      },
    ]);
  });

  it("migrates pre-scope request and grant tables without losing approval links", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-extension-legacy-schema-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    ensureEnterpriseSchema(options);
    const account = createEnterpriseAccount(
      {
        username: "legacy-extension-owner",
        displayName: "Legacy Extension Owner",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      },
      options,
    );
    const database = openOpenClawStateDatabase(options).db;
    replaceWithPreScopeExtensionSchema(database);
    database
      .prepare(
        `INSERT INTO enterprise_plugin_requests
         (id, requester_account_id, package_name, package_family, exact_version, integrity,
          request_kind, trust_snapshot_json, capability_snapshot_json, capability_digest, state,
          installed_plugin_id, revision, created_at, updated_at, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "legacy-native-request",
        account.id,
        "@acme/legacy-native",
        "code_plugin",
        "1.0.0",
        "sha256:legacy-native",
        "install",
        "{}",
        '{"tools":["legacy.search"]}',
        "legacy-native-digest",
        "available",
        "legacy-native-plugin",
        2,
        1,
        2,
        2,
      );
    database
      .prepare(
        `INSERT INTO enterprise_account_plugin_grants
         (id, account_id, plugin_id, exact_version, integrity, capability_digest,
          approved_tools_json, source_request_id, state, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "legacy-native-grant",
        account.id,
        "legacy-native-plugin",
        "1.0.0",
        "sha256:legacy-native",
        "legacy-native-digest",
        '["legacy.search"]',
        "legacy-native-request",
        "active",
        1,
        2,
        2,
      );
    database
      .prepare(
        `INSERT INTO enterprise_codex_plugin_requests
         (id, requester_account_id, agent_key, runtime_agent_id, plugin_name, marketplace_name,
          remote_plugin_id, request_kind, catalog_snapshot_json, capability_snapshot_json,
          capability_digest, state, installed_plugin_id, revision, created_at, updated_at, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "legacy-codex-request",
        account.id,
        "shared:support",
        "support",
        "legacy-codex",
        "openai-curated",
        "legacy-codex",
        "install",
        '{"id":"legacy-codex"}',
        '{"version":1}',
        "legacy-codex-digest",
        "available",
        "legacy-codex",
        2,
        1,
        2,
        2,
      );
    database
      .prepare(
        `INSERT INTO enterprise_codex_plugin_grants
         (id, account_id, agent_key, runtime_agent_id, plugin_name, marketplace_name,
          remote_plugin_id, installed_plugin_id, capability_snapshot_json, capability_digest,
          source_request_id, ready, state, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "legacy-codex-grant",
        account.id,
        "shared:support",
        "support",
        "legacy-codex",
        "openai-curated",
        "legacy-codex",
        "legacy-codex",
        '{"version":1}',
        "legacy-codex-digest",
        "legacy-codex-request",
        1,
        "active",
        1,
        2,
        2,
      );
    closeOpenClawStateDatabaseForTest();

    expect(() => ensureEnterpriseSchema(options)).not.toThrow();
    const migrated = openOpenClawStateDatabase(options).db;
    expect(
      migrated
        .prepare("SELECT id, source_request_id FROM enterprise_account_plugin_grants WHERE id = ?")
        .get("legacy-native-grant"),
    ).toEqual({ id: "legacy-native-grant", source_request_id: "legacy-native-request" });
    expect(
      migrated
        .prepare("SELECT id, source_request_id FROM enterprise_codex_plugin_grants WHERE id = ?")
        .get("legacy-codex-grant"),
    ).toEqual({ id: "legacy-codex-grant", source_request_id: "legacy-codex-request" });
    expect(migrated.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      migrated
        .prepare(
          "SELECT name FROM pragma_table_info('enterprise_plugin_requests') WHERE name = 'scope'",
        )
        .all(),
    ).toEqual([{ name: "scope" }]);
    expect(
      migrated
        .prepare(
          "SELECT name FROM pragma_table_info('enterprise_codex_plugin_grants') WHERE name = 'scope'",
        )
        .all(),
    ).toEqual([{ name: "scope" }]);
  });
});
