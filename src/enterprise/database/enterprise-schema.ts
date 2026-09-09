// Enterprise account storage is feature-local and additive to OpenClaw shared state.
import type { DatabaseSync } from "node:sqlite";
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureUserProfileRoleSchema } from "../../state/user-profiles-schema.js";

const ENTERPRISE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS enterprise_accounts (
  id TEXT NOT NULL PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'employee')),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  personal_agent_enabled INTEGER NOT NULL DEFAULT 1 CHECK (personal_agent_enabled IN (0, 1)),
  default_agent_id TEXT,
  access_preset_key TEXT NOT NULL DEFAULT 'none',
  policy_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_accounts_enabled
  ON enterprise_accounts(enabled, username);

CREATE TABLE IF NOT EXISTS enterprise_auth_sessions (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('admin', 'user', 'legacy')),
  revoked_at INTEGER,
  revoke_reason TEXT,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_auth_sessions_account
  ON enterprise_auth_sessions(account_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS enterprise_entitlements (
  account_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('agent', 'skill', 'tool')),
  resource_id TEXT NOT NULL,
  resource_state TEXT NOT NULL DEFAULT 'active' CHECK (resource_state IN ('active', 'legacy', 'orphaned')),
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, resource_type, resource_id),
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_entitlements_lookup
  ON enterprise_entitlements(account_id, resource_type, effect);

CREATE INDEX IF NOT EXISTS idx_enterprise_entitlements_resource
  ON enterprise_entitlements(resource_type, resource_id, effect, account_id);

CREATE TABLE IF NOT EXISTS enterprise_agent_access_requests (
  id TEXT NOT NULL PRIMARY KEY,
  requester_account_id TEXT NOT NULL,
  agent_resource_key TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_account_id TEXT,
  decision_reason TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  decided_at INTEGER,
  FOREIGN KEY (requester_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_agent_access_requests_account
  ON enterprise_agent_access_requests(requester_account_id, agent_resource_key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_agent_access_requests_admin
  ON enterprise_agent_access_requests(state, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_agent_access_requests_pending
  ON enterprise_agent_access_requests(requester_account_id, agent_resource_key)
  WHERE state = 'pending';

CREATE TABLE IF NOT EXISTS enterprise_audit_events (
  id TEXT NOT NULL PRIMARY KEY,
  actor_account_id TEXT,
  actor_session_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  request_id TEXT,
  before_json TEXT,
  after_json TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (actor_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_events_created
  ON enterprise_audit_events(created_at DESC, action, target_type);

CREATE TABLE IF NOT EXISTS enterprise_settings (
  setting_key TEXT NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_delegation_policy (
  singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
  rollout TEXT NOT NULL CHECK (rollout IN ('off', 'shadow', 'on')),
  router_model TEXT NOT NULL,
  auto_threshold REAL NOT NULL CHECK (auto_threshold >= 0 AND auto_threshold <= 1),
  clarify_threshold REAL NOT NULL CHECK (clarify_threshold >= 0 AND clarify_threshold <= 1),
  minimum_margin REAL NOT NULL CHECK (minimum_margin >= 0 AND minimum_margin <= 1),
  max_delegates_per_turn INTEGER NOT NULL CHECK (max_delegates_per_turn BETWEEN 1 AND 3),
  event_retention_days INTEGER NOT NULL CHECK (event_retention_days BETWEEN 1 AND 3650),
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_delegation_overrides (
  account_id TEXT NOT NULL,
  agent_resource_key TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('inherit', 'confirm_before_handoff', 'explicit_only', 'disabled')),
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, agent_resource_key),
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_delegation_overrides_agent
  ON enterprise_delegation_overrides(agent_resource_key, updated_at DESC, account_id);

CREATE TABLE IF NOT EXISTS enterprise_delegation_events (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  personal_agent_id TEXT NOT NULL,
  shared_agent_ids_json TEXT NOT NULL,
  parent_session_key_hash TEXT,
  parent_run_id_hash TEXT,
  child_run_ids_json TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  decision_source TEXT NOT NULL CHECK (decision_source IN ('explicit', 'rule', 'ai', 'system')),
  outcome TEXT NOT NULL CHECK (outcome IN ('delegated', 'clarified', 'local', 'blocked', 'failed', 'cancelled', 'shadow')),
  confidence_band TEXT CHECK (confidence_band IS NULL OR confidence_band IN ('clear', 'ambiguous', 'low')),
  reason_code TEXT NOT NULL,
  policy_revision INTEGER NOT NULL,
  profile_revisions_json TEXT NOT NULL,
  confirmation_state TEXT NOT NULL CHECK (confirmation_state IN ('not_required', 'pending', 'approved', 'denied', 'expired')),
  latency_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_delegation_events_created
  ON enterprise_delegation_events(created_at DESC, outcome, decision_source);

CREATE INDEX IF NOT EXISTS idx_enterprise_delegation_events_account
  ON enterprise_delegation_events(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_personal_agent_profiles (
  account_id TEXT NOT NULL PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  profile_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_shared_agent_relationships (
  account_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  profile_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, agent_id),
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_shared_agent_relationships_agent
  ON enterprise_shared_agent_relationships(agent_id, updated_at DESC, account_id);

CREATE TABLE IF NOT EXISTS enterprise_account_tool_policies (
  account_id TEXT NOT NULL PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  profile TEXT CHECK (profile IS NULL OR profile IN ('minimal', 'coding', 'messaging', 'full')),
  also_allow_json TEXT NOT NULL,
  deny_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_personal_agent_knowledge (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('note', 'upload')),
  source_name TEXT,
  content TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  UNIQUE (account_id, title)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_personal_knowledge_account
  ON enterprise_personal_agent_knowledge(account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_conversation_projects (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  UNIQUE (account_id, id),
  UNIQUE (account_id, idempotency_key)
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_conversation_projects_name
  ON enterprise_conversation_projects(account_id, name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_enterprise_conversation_projects_order
  ON enterprise_conversation_projects(account_id, position, id);

CREATE TABLE IF NOT EXISTS enterprise_conversation_project_sessions (
  account_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  session_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, session_key),
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id, project_id)
    REFERENCES enterprise_conversation_projects(account_id, id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_conversation_project_sessions_project
  ON enterprise_conversation_project_sessions(account_id, project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_user_skill_installs (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  agent_key TEXT NOT NULL,
  runtime_agent_id TEXT NOT NULL,
  clawhub_ref TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  exact_version TEXT NOT NULL,
  integrity TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  tree_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  state TEXT NOT NULL CHECK (state IN ('ready', 'needs_setup', 'disabled', 'modified', 'error')),
  safe_error_code TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  UNIQUE (account_id, agent_key, clawhub_ref),
  UNIQUE (account_id, agent_key, skill_name)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_user_skill_installs_agent
  ON enterprise_user_skill_installs(account_id, agent_key, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_plugin_requests (
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

CREATE INDEX IF NOT EXISTS idx_enterprise_plugin_requests_account
  ON enterprise_plugin_requests(requester_account_id, state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_plugin_requests_admin
  ON enterprise_plugin_requests(state, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_plugin_requests_open
  ON enterprise_plugin_requests(requester_account_id, package_name, exact_version)
  WHERE state IN ('pending', 'approving');

CREATE TABLE IF NOT EXISTS enterprise_account_plugin_grants (
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

CREATE INDEX IF NOT EXISTS idx_enterprise_account_plugin_grants_active
  ON enterprise_account_plugin_grants(account_id, state, updated_at DESC);

-- Codex plugins are owned by the Codex app-server and have a different
-- identity/install contract from ClawHub native plugins. Keep their request
-- and grant lifecycle in additive tables instead of widening the ClawHub
-- package-family CHECK above.
CREATE TABLE IF NOT EXISTS enterprise_codex_plugin_requests (
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

CREATE INDEX IF NOT EXISTS idx_enterprise_codex_plugin_requests_account
  ON enterprise_codex_plugin_requests(requester_account_id, runtime_agent_id, state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_codex_plugin_requests_admin
  ON enterprise_codex_plugin_requests(state, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_codex_plugin_requests_open
  ON enterprise_codex_plugin_requests(
    requester_account_id, runtime_agent_id, plugin_name, marketplace_name
  ) WHERE state IN ('pending', 'approving');

CREATE TABLE IF NOT EXISTS enterprise_codex_plugin_grants (
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

CREATE INDEX IF NOT EXISTS idx_enterprise_codex_plugin_grants_active
  ON enterprise_codex_plugin_grants(account_id, runtime_agent_id, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_extension_idempotency (
  audience TEXT NOT NULL CHECK (audience IN ('admin', 'user')),
  actor_account_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_json TEXT,
  state TEXT NOT NULL CHECK (state IN ('running', 'complete')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (audience, actor_account_id, operation, idempotency_key),
  FOREIGN KEY (actor_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_extension_idempotency_expiry
  ON enterprise_extension_idempotency(expires_at);

`;

const ENTERPRISE_KNOWLEDGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS enterprise_knowledge_zones (
  id TEXT NOT NULL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  egress_policy TEXT NOT NULL DEFAULT 'local_only' CHECK (egress_policy IN ('local_only', 'external_allowed')),
  revision INTEGER NOT NULL DEFAULT 1,
  access_revision INTEGER NOT NULL DEFAULT 1,
  source_set_revision INTEGER NOT NULL DEFAULT 1,
  build_revision INTEGER,
  active_publication_id TEXT,
  created_by_account_id TEXT,
  updated_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_zones_status
  ON enterprise_knowledge_zones(status, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_zone_memberships (
  zone_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'curator', 'manager')),
  created_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (zone_id, account_id),
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_memberships_account
  ON enterprise_knowledge_zone_memberships(account_id, role, zone_id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_agent_zone_bindings (
  zone_id TEXT NOT NULL,
  agent_resource_key TEXT NOT NULL,
  created_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (zone_id, agent_resource_key),
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_bindings_agent
  ON enterprise_knowledge_agent_zone_bindings(agent_resource_key, zone_id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_evidence_transfer_grants (
  zone_id TEXT NOT NULL,
  target_agent_resource_key TEXT NOT NULL,
  created_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (zone_id, target_agent_resource_key),
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_sources (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  canonical_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'staged_remove', 'archived')),
  draft_revision INTEGER NOT NULL DEFAULT 1,
  current_version_number INTEGER NOT NULL DEFAULT 0,
  created_by_account_id TEXT,
  updated_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  UNIQUE (zone_id, id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_sources_zone
  ON enterprise_knowledge_sources(zone_id, status, updated_at DESC, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_knowledge_sources_url
  ON enterprise_knowledge_sources(zone_id, canonical_url)
  WHERE canonical_url IS NOT NULL AND status != 'archived';

CREATE TABLE IF NOT EXISTS enterprise_knowledge_source_versions (
  id TEXT NOT NULL PRIMARY KEY,
  source_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  pipeline_generation INTEGER NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'superseded', 'archived')),
  processing_status TEXT NOT NULL DEFAULT 'queued' CHECK (processing_status IN ('queued', 'validating', 'scanning', 'extracting', 'needs_ocr', 'normalizing', 'chunking', 'indexing', 'embedding', 'building', 'ready', 'degraded', 'error', 'cancelled')),
  content_hash TEXT NOT NULL,
  blob_hash TEXT,
  byte_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  original_name TEXT,
  parser_provenance_json TEXT,
  ocr_provenance_json TEXT,
  normalized_artifact_hash TEXT,
  segment_count INTEGER,
  vector_status TEXT NOT NULL DEFAULT 'pending' CHECK (vector_status IN ('pending', 'ready', 'unavailable', 'error')),
  safe_error_code TEXT,
  created_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (source_id) REFERENCES enterprise_knowledge_sources(id) ON DELETE RESTRICT,
  FOREIGN KEY (zone_id, source_id) REFERENCES enterprise_knowledge_sources(zone_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  UNIQUE (source_id, version_number),
  UNIQUE (source_id, pipeline_generation)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_versions_source
  ON enterprise_knowledge_source_versions(source_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_versions_processing
  ON enterprise_knowledge_source_versions(zone_id, processing_status, created_at);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_index_generations (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  source_set_revision INTEGER NOT NULL,
  build_revision INTEGER,
  status TEXT NOT NULL CHECK (status IN ('building', 'candidate', 'active', 'retired', 'orphaned', 'error')),
  lexical_status TEXT NOT NULL CHECK (lexical_status IN ('pending', 'ready', 'error')),
  vector_status TEXT NOT NULL CHECK (vector_status IN ('pending', 'ready', 'unavailable', 'error')),
  artifact_checksum TEXT,
  embedding_identity_json TEXT,
  graph_status TEXT,
  graph_schema_version INTEGER,
  graph_node_count INTEGER,
  graph_edge_count INTEGER,
  graph_proposed_count INTEGER,
  graph_orphan_count INTEGER,
  graph_enrichment_identity_json TEXT,
  integrity_status TEXT NOT NULL DEFAULT 'unknown' CHECK (integrity_status IN ('unknown', 'valid', 'corrupt', 'missing')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  retired_at INTEGER,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE RESTRICT,
  UNIQUE (zone_id, source_set_revision, id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_generations_zone
  ON enterprise_knowledge_index_generations(zone_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_graph_settings (
  zone_id TEXT NOT NULL PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  enrichment_enabled INTEGER NOT NULL DEFAULT 1 CHECK (enrichment_enabled IN (0, 1)),
  auto_approval_threshold REAL NOT NULL DEFAULT 0.92 CHECK (auto_approval_threshold >= 0.92 AND auto_approval_threshold <= 1.0),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_graph_edge_reviews (
  zone_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('accepted', 'rejected')),
  edge_kind TEXT,
  note TEXT,
  evidence_hash TEXT NOT NULL,
  reviewed_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (zone_id, fingerprint),
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_graph_reviews_status
  ON enterprise_knowledge_graph_edge_reviews(zone_id, review_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_graph_manual_edges (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  source_canonical_key TEXT NOT NULL,
  target_canonical_key TEXT NOT NULL,
  edge_kind TEXT NOT NULL,
  evidence_source_version_id TEXT NOT NULL,
  evidence_segment_id TEXT NOT NULL,
  evidence_locator_json TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by_account_id TEXT,
  updated_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_graph_manual_edges_zone
  ON enterprise_knowledge_graph_manual_edges(zone_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_graph_exports (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  publication_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'complete', 'failed', 'expired')),
  file_path TEXT,
  checksum TEXT,
  entry_count INTEGER NOT NULL DEFAULT 0,
  uncompressed_bytes INTEGER NOT NULL DEFAULT 0,
  requested_by_account_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  safe_error_code TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (publication_id) REFERENCES enterprise_knowledge_publications(id) ON DELETE CASCADE,
  FOREIGN KEY (generation_id) REFERENCES enterprise_knowledge_index_generations(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  UNIQUE (requested_by_account_id, zone_id, publication_id, idempotency_key)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_graph_exports_expiry
  ON enterprise_knowledge_graph_exports(status, expires_at);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_publications (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  source_set_revision INTEGER NOT NULL,
  publication_number INTEGER NOT NULL,
  lexical_status TEXT NOT NULL CHECK (lexical_status = 'ready'),
  vector_status TEXT NOT NULL CHECK (vector_status IN ('ready', 'unavailable', 'error')),
  degraded_override INTEGER NOT NULL DEFAULT 0 CHECK (degraded_override IN (0, 1)),
  degraded_reason TEXT,
  published_by_account_id TEXT,
  published_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (generation_id) REFERENCES enterprise_knowledge_index_generations(id) ON DELETE RESTRICT,
  FOREIGN KEY (published_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  UNIQUE (zone_id, publication_number)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_publications_zone
  ON enterprise_knowledge_publications(zone_id, published_at DESC, id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_publication_sources (
  publication_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (publication_id, source_id),
  FOREIGN KEY (publication_id) REFERENCES enterprise_knowledge_publications(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES enterprise_knowledge_sources(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_publication_versions
  ON enterprise_knowledge_publication_sources(source_version_id, publication_id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_jobs (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  source_id TEXT,
  source_version_id TEXT,
  generation_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('source_ingest', 'zone_build', 'artifact_gc', 'index_gc')),
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'retry_wait', 'succeeded', 'failed', 'cancelled')),
  attempt INTEGER NOT NULL DEFAULT 0,
  pipeline_generation INTEGER NOT NULL,
  claim_token TEXT,
  claim_owner TEXT,
  lease_expires_at INTEGER,
  heartbeat_at INTEGER,
  available_at INTEGER NOT NULL,
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  safe_error_code TEXT,
  retry_after_ms INTEGER,
  created_by_account_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES enterprise_knowledge_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (generation_id) REFERENCES enterprise_knowledge_index_generations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_account_id) REFERENCES enterprise_accounts(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_jobs_claim
  ON enterprise_knowledge_jobs(status, available_at, lease_expires_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_knowledge_jobs_source_active
  ON enterprise_knowledge_jobs(source_id)
  WHERE source_id IS NOT NULL AND kind = 'source_ingest' AND status IN ('queued', 'running', 'retry_wait');
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_knowledge_jobs_zone_active
  ON enterprise_knowledge_jobs(zone_id)
  WHERE kind = 'zone_build' AND status IN ('queued', 'running', 'retry_wait');

CREATE TABLE IF NOT EXISTS enterprise_knowledge_job_steps (
  job_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'retry_wait', 'completed', 'degraded', 'failed', 'cancelled', 'superseded')),
  progress_current INTEGER,
  progress_total INTEGER,
  checkpoint_ref TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  safe_error_code TEXT,
  degraded_reason TEXT,
  PRIMARY KEY (job_id, step_id),
  FOREIGN KEY (job_id) REFERENCES enterprise_knowledge_jobs(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_job_steps_status
  ON enterprise_knowledge_job_steps(job_id, status, updated_at, step_id);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_changes (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('job', 'job_step', 'source', 'candidate', 'publication', 'graph', 'upload', 'readiness')),
  entity_id TEXT,
  operation TEXT NOT NULL CHECK (operation IN ('created', 'updated', 'completed', 'deleted')),
  revision INTEGER,
  status TEXT,
  stage TEXT,
  progress_current INTEGER,
  progress_total INTEGER,
  safe_error_code TEXT,
  occurred_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_changes_zone_sequence
  ON enterprise_knowledge_changes(zone_id, sequence);
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_changes_occurred
  ON enterprise_knowledge_changes(occurred_at, sequence);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_artifact_revisions (
  artifact_hash TEXT PRIMARY KEY,
  source_version_id TEXT NOT NULL,
  artifact_schema_version INTEGER NOT NULL CHECK (artifact_schema_version IN (1, 2, 3)),
  extractor_identity TEXT NOT NULL,
  artifact_checksum TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_artifact_revisions_source
  ON enterprise_knowledge_artifact_revisions(source_version_id, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_generation_artifacts (
  generation_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  artifact_hash TEXT NOT NULL,
  PRIMARY KEY (generation_id, source_version_id),
  FOREIGN KEY (generation_id) REFERENCES enterprise_knowledge_index_generations(id) ON DELETE CASCADE,
  FOREIGN KEY (source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (artifact_hash) REFERENCES enterprise_knowledge_artifact_revisions(artifact_hash) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_uploads (
  id TEXT NOT NULL PRIMARY KEY,
  zone_id TEXT NOT NULL,
  owner_account_id TEXT NOT NULL,
  target_source_id TEXT,
  title TEXT NOT NULL,
  original_name TEXT NOT NULL,
  declared_mime_type TEXT NOT NULL,
  expected_size INTEGER NOT NULL,
  expected_hash TEXT,
  received_size INTEGER NOT NULL DEFAULT 0,
  chunk_claim_token TEXT,
  chunk_claim_offset INTEGER,
  chunk_claim_size INTEGER,
  chunk_claim_expires_at INTEGER,
  state TEXT NOT NULL CHECK (state IN ('active', 'committing', 'committed', 'cancelled', 'expired', 'error')),
  staging_name TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  committed_source_version_id TEXT,
  FOREIGN KEY (zone_id) REFERENCES enterprise_knowledge_zones(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (target_source_id) REFERENCES enterprise_knowledge_sources(id) ON DELETE SET NULL,
  FOREIGN KEY (committed_source_version_id) REFERENCES enterprise_knowledge_source_versions(id) ON DELETE SET NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_uploads_owner
  ON enterprise_knowledge_uploads(owner_account_id, state, expires_at);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_idempotency (
  audience TEXT NOT NULL,
  actor_account_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_json TEXT,
  state TEXT NOT NULL CHECK (state IN ('running', 'complete', 'failed')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (audience, actor_account_id, operation, idempotency_key),
  FOREIGN KEY (actor_account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_idempotency_expiry
  ON enterprise_knowledge_idempotency(expires_at);
`;

const ensuredDatabases = new WeakSet<DatabaseSync>();

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(
    rows.flatMap((row) => (isRecord(row) && typeof row.name === "string" ? [row.name] : [])),
  );
}

function ensureAdditiveColumns(db: DatabaseSync): void {
  const accountColumns = tableColumns(db, "enterprise_accounts");
  if (!accountColumns.has("access_preset_key")) {
    db.exec(
      "ALTER TABLE enterprise_accounts ADD COLUMN access_preset_key TEXT NOT NULL DEFAULT 'none'",
    );
  }
  if (!accountColumns.has("policy_revision")) {
    db.exec(
      "ALTER TABLE enterprise_accounts ADD COLUMN policy_revision INTEGER NOT NULL DEFAULT 1",
    );
  }
  const sessionColumns = tableColumns(db, "enterprise_auth_sessions");
  if (!sessionColumns.has("audience")) {
    db.exec(
      "ALTER TABLE enterprise_auth_sessions ADD COLUMN audience TEXT NOT NULL DEFAULT 'legacy'",
    );
    const now = Date.now();
    db.prepare(
      "UPDATE enterprise_auth_sessions SET revoked_at = ?, revoke_reason = 'portal_split_migration' WHERE revoked_at IS NULL",
    ).run(now);
  }
  const entitlementColumns = tableColumns(db, "enterprise_entitlements");
  if (!entitlementColumns.has("resource_state")) {
    db.exec(
      "ALTER TABLE enterprise_entitlements ADD COLUMN resource_state TEXT NOT NULL DEFAULT 'active'",
    );
    db.exec(
      `UPDATE enterprise_entitlements SET resource_state = 'legacy'
      WHERE (resource_type = 'agent' AND resource_id NOT LIKE 'agent:%')
          OR (resource_type = 'skill' AND resource_id NOT LIKE 'skill:%')
          OR (resource_type = 'tool' AND resource_id NOT LIKE 'tool:%')`,
    );
  }
  const projectSessionColumns = tableColumns(db, "enterprise_conversation_project_sessions");
  if (!projectSessionColumns.has("position")) {
    db.exec(
      "ALTER TABLE enterprise_conversation_project_sessions ADD COLUMN position INTEGER NOT NULL DEFAULT 0",
    );
    const assignments = db
      .prepare(
        `SELECT account_id, project_id, session_key
         FROM enterprise_conversation_project_sessions
         ORDER BY account_id ASC, project_id ASC, updated_at DESC, session_key ASC`,
      )
      .all()
      .flatMap((row) =>
        isRecord(row) &&
        typeof row.account_id === "string" &&
        typeof row.project_id === "string" &&
        typeof row.session_key === "string"
          ? [
              {
                account_id: row.account_id,
                project_id: row.project_id,
                session_key: row.session_key,
              },
            ]
          : [],
      );
    const nextPosition = new Map<string, number>();
    const updatePosition = db.prepare(
      `UPDATE enterprise_conversation_project_sessions SET position = ?
       WHERE account_id = ? AND project_id = ? AND session_key = ?`,
    );
    for (const assignment of assignments) {
      const groupKey = `${assignment.account_id}\u0000${assignment.project_id}`;
      const position = nextPosition.get(groupKey) ?? 0;
      updatePosition.run(
        position,
        assignment.account_id,
        assignment.project_id,
        assignment.session_key,
      );
      nextPosition.set(groupKey, position + 1);
    }
  }
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_enterprise_conversation_project_sessions_order
     ON enterprise_conversation_project_sessions(account_id, project_id, position, session_key)`,
  );
  const knowledgeUploadColumns = tableColumns(db, "enterprise_knowledge_uploads");
  if (!knowledgeUploadColumns.has("target_source_id")) {
    db.exec("ALTER TABLE enterprise_knowledge_uploads ADD COLUMN target_source_id TEXT");
  }
  for (const [name, definition] of [
    ["chunk_claim_token", "TEXT"],
    ["chunk_claim_offset", "INTEGER"],
    ["chunk_claim_size", "INTEGER"],
    ["chunk_claim_expires_at", "INTEGER"],
  ] as const) {
    if (!knowledgeUploadColumns.has(name)) {
      db.exec(`ALTER TABLE enterprise_knowledge_uploads ADD COLUMN ${name} ${definition}`);
    }
  }
  const codexRequestColumns = tableColumns(db, "enterprise_codex_plugin_requests");
  for (const [name, definition] of [
    ["auth_required", "INTEGER NOT NULL DEFAULT 0"],
    ["apps_needing_auth_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["connect_urls_json", "TEXT NOT NULL DEFAULT '[]'"],
  ] as const) {
    if (!codexRequestColumns.has(name)) {
      db.exec(`ALTER TABLE enterprise_codex_plugin_requests ADD COLUMN ${name} ${definition}`);
    }
  }
  const codexGrantColumns = tableColumns(db, "enterprise_codex_plugin_grants");
  for (const [name, definition] of [
    ["auth_required", "INTEGER NOT NULL DEFAULT 0"],
    ["apps_needing_auth_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["connect_urls_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["ready", "INTEGER NOT NULL DEFAULT 0"],
  ] as const) {
    if (!codexGrantColumns.has(name)) {
      db.exec(`ALTER TABLE enterprise_codex_plugin_grants ADD COLUMN ${name} ${definition}`);
    }
  }
  const knowledgeZoneColumns = tableColumns(db, "enterprise_knowledge_zones");
  if (!knowledgeZoneColumns.has("build_revision")) {
    db.exec("ALTER TABLE enterprise_knowledge_zones ADD COLUMN build_revision INTEGER");
    db.exec(
      "UPDATE enterprise_knowledge_zones SET build_revision = source_set_revision WHERE build_revision IS NULL",
    );
  }
  const generationColumns = tableColumns(db, "enterprise_knowledge_index_generations");
  for (const [name, definition] of [
    ["build_revision", "INTEGER"],
    ["graph_status", "TEXT"],
    ["graph_schema_version", "INTEGER"],
    ["graph_node_count", "INTEGER"],
    ["graph_edge_count", "INTEGER"],
    ["graph_proposed_count", "INTEGER"],
    ["graph_orphan_count", "INTEGER"],
    ["graph_enrichment_identity_json", "TEXT"],
  ] as const) {
    if (!generationColumns.has(name)) {
      db.exec(
        `ALTER TABLE enterprise_knowledge_index_generations ADD COLUMN ${name} ${definition}`,
      );
    }
  }
  db.exec(
    `UPDATE enterprise_knowledge_index_generations SET
       build_revision = COALESCE(build_revision, source_set_revision),
       graph_status = COALESCE(graph_status, 'not_built'),
       graph_schema_version = COALESCE(graph_schema_version, 1),
       graph_node_count = COALESCE(graph_node_count, 0),
       graph_edge_count = COALESCE(graph_edge_count, 0),
       graph_proposed_count = COALESCE(graph_proposed_count, 0),
       graph_orphan_count = COALESCE(graph_orphan_count, 0)`,
  );
}

/** Lazily creates Enterprise-only tables without altering canonical OpenClaw tables. */
export function ensureEnterpriseSchema(options: OpenClawStateDatabaseOptions = {}): void {
  const database = openOpenClawStateDatabase(options);
  if (ensuredDatabases.has(database.db)) {
    return;
  }
  ensureUserProfileRoleSchema(options, database);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.exec(ENTERPRISE_SCHEMA_SQL); // sqlite-allow-raw -- Feature-local additive DDL.
      db.exec(ENTERPRISE_KNOWLEDGE_SCHEMA_SQL); // sqlite-allow-raw -- Canonical Knowledge Zone additive DDL.
      ensureAdditiveColumns(db);
    },
    { ...options, database },
    { operationLabel: "enterprise.schema.ensure" },
  );
  ensuredDatabases.add(database.db);
}
