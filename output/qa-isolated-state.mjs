#!/usr/bin/env node
// QA-only preparation. Default is read-only; --apply seeds a NEW private root.
// Never starts a gateway, changes live state, grants access, or changes models.
// Run with Node 26: node --import tsx output/qa-isolated-state.mjs ...
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { pathToFileURL } from "node:url";

const TABLES = [
  "config_machine_state",
  "auth_profile_stores",
  "auth_profile_state",
  "user_profiles",
  "user_profile_emails",
  "user_profile_identities",
  "enterprise_accounts",
  "enterprise_auth_sessions",
  "enterprise_settings",
  "enterprise_entitlements",
  "enterprise_personal_agent_profiles",
  "enterprise_shared_agent_relationships",
  "enterprise_account_tool_policies",
  "enterprise_personal_agent_knowledge",
  "enterprise_delegation_policy",
  "enterprise_delegation_overrides",
  "enterprise_account_plugin_grants",
  "enterprise_knowledge_zones",
  "enterprise_knowledge_zone_memberships",
  "enterprise_knowledge_agent_zone_bindings",
  "enterprise_knowledge_evidence_transfer_grants",
  "enterprise_knowledge_sources",
  "enterprise_knowledge_source_versions",
  "enterprise_knowledge_index_generations",
  "enterprise_knowledge_publications",
  "enterprise_knowledge_publication_sources",
  "enterprise_knowledge_artifact_revisions",
  "enterprise_knowledge_generation_artifacts",
  "enterprise_knowledge_graph_settings",
  "enterprise_knowledge_graph_edge_reviews",
  "enterprise_knowledge_graph_manual_edges",
];
const EMPTY_OPERATIONAL_TABLES = [
  "sandbox_registry_entries",
  "worker_session_placements",
  "worktrees",
  "delivery_queue_entries",
  "subagent_runs",
  "task_runs",
  "flow_runs",
  "cron_jobs",
  "enterprise_knowledge_jobs",
  "enterprise_knowledge_job_steps",
  "enterprise_knowledge_uploads",
  "enterprise_knowledge_graph_exports",
];
const FLAGS = new Set(["--source-repo", "--snapshot-repo", "--live-state", "--qa-root", "--port"]);
class QaError extends Error {}
function requireQa(condition, code) {
  if (!condition) throw new QaError(code);
}
function inside(root, target) {
  return target === root || target.startsWith(`${root}${path.sep}`);
}
function quote(identifier) {
  requireQa(/^[a-z_][a-z0-9_]*$/u.test(identifier), "INVALID_SQL_IDENTIFIER");
  return `"${identifier}"`;
}
function digestFile(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function privateDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}
function privateJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
function parseArgs() {
  const args = { apply: false };
  for (let i = 2; i < process.argv.length; i++) {
    const flag = process.argv[i];
    if (flag === "--apply") {
      args.apply = true;
      continue;
    }
    requireQa(
      FLAGS.has(flag) && process.argv[i + 1] && !process.argv[i + 1].startsWith("--"),
      "INVALID_ARGUMENTS",
    );
    args[flag.slice(2)] = process.argv[++i];
  }
  for (const flag of FLAGS) requireQa(args[flag.slice(2)], "MISSING_ARGUMENTS");
  return args;
}
function inspectTree(root) {
  const files = [];
  function walk(dir) {
    requireQa(
      fs.lstatSync(dir).isDirectory() && fs.realpathSync(dir) === dir,
      "COPY_DIRECTORY_LINK",
    );
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const stat = fs.lstatSync(file);
      requireQa(!stat.isSymbolicLink(), "COPY_SYMLINK_REJECTED");
      if (stat.isDirectory()) {
        walk(file);
        continue;
      }
      requireQa(stat.isFile() && stat.nlink === 1, "COPY_NONPRIVATE_FILE_REJECTED");
      if (file.endsWith("-wal") || file.endsWith("-shm")) continue;
      files.push({
        file,
        relative: path.relative(root, file),
        size: stat.size,
        hash: digestFile(file),
      });
    }
  }
  walk(root);
  return files;
}
async function copyTree(target, files) {
  privateDir(target);
  for (const entry of files) {
    const destination = path.join(target, entry.relative);
    requireQa(inside(target, destination), "COPY_TARGET_ESCAPE");
    privateDir(path.dirname(destination));
    requireQa(digestFile(entry.file) === entry.hash, "COPY_SOURCE_CHANGED");
    if (entry.file.endsWith(".sqlite")) {
      const db = new DatabaseSync(entry.file, { readOnly: true });
      try {
        await backup(db, destination);
      } finally {
        db.close();
      }
      const copied = new DatabaseSync(destination, { readOnly: true });
      try {
        requireQa(
          copied.prepare("PRAGMA quick_check").get().quick_check === "ok",
          "INDEX_COPY_INVALID",
        );
      } finally {
        copied.close();
      }
    } else {
      fs.copyFileSync(entry.file, destination, fs.constants.COPYFILE_EXCL);
      requireQa(digestFile(destination) === entry.hash, "COPY_HASH_MISMATCH");
    }
    fs.chmodSync(destination, 0o600);
    requireQa(digestFile(entry.file) === entry.hash, "COPY_SOURCE_CHANGED");
  }
}
function containsUnexpectedPath(value, liveState, property = "") {
  if (Array.isArray(value))
    return value.some((child) => containsUnexpectedPath(child, liveState, property));
  if (value && typeof value === "object")
    return Object.entries(value).some(([key, child]) =>
      containsUnexpectedPath(child, liveState, key),
    );
  if (typeof value !== "string") return false;
  if (!path.isAbsolute(value) && !value.startsWith("~/") && !value.startsWith("file:"))
    return false;
  return property !== "workspace" || !inside(liveState, path.resolve(value));
}
function makeConfig(config, liveState, qaState, snapshot, port, prefix) {
  requireQa(config.gateway?.auth?.mode === "accounts", "ACCOUNT_AUTH_REQUIRED");
  requireQa(!containsUnexpectedPath(config, liveState), "CONFIG_PATH_REQUIRES_REVIEW");
  requireQa(Object.keys(config.channels ?? {}).length === 0, "CHANNEL_CONFIG_REQUIRES_REVIEW");
  requireQa(
    Object.keys(config.secrets?.providers ?? {}).length === 0,
    "SECRET_PROVIDER_REQUIRES_REVIEW",
  );
  requireQa(
    Object.keys(config.plugins?.entries ?? {}).every((key) => ["openai", "codex"].includes(key)),
    "PLUGIN_SERVICE_REQUIRES_REVIEW",
  );
  requireQa(!config.plugins?.load?.paths?.length, "PLUGIN_PATH_REQUIRES_REVIEW");
  const next = structuredClone(config);
  next.logging = { ...next.logging, file: path.join(path.dirname(qaState), "gateway.log") };
  next.gateway = {
    ...next.gateway,
    mode: "local",
    bind: "loopback",
    port,
    controlUi: {
      ...next.gateway.controlUi,
      root: path.join(snapshot, "dist/control-ui"),
      allowedOrigins: [`http://127.0.0.1:${port}`],
    },
  };
  next.agents ??= {};
  next.agents.defaults ??= {};
  const workspacePairs = new Map();
  function scopeAgent(agent, isDefault = false) {
    if (isDefault || agent.workspace) {
      const source = path.resolve(agent.workspace ?? path.join(liveState, "workspace"));
      requireQa(inside(liveState, source), "WORKSPACE_SOURCE_ESCAPE");
      const target = path.join(qaState, path.relative(liveState, source));
      agent.workspace = target;
      workspacePairs.set(source, target);
    }
    if (isDefault || agent.sandbox) {
      agent.sandbox = {
        ...agent.sandbox,
        docker: { ...agent.sandbox?.docker, containerPrefix: prefix },
      };
    }
  }
  scopeAgent(next.agents.defaults, true);
  for (const agent of Object.values(next.agents.entries ?? {})) scopeAgent(agent);
  next.cron = { ...next.cron, enabled: false };
  next.hooks = {
    ...next.hooks,
    enabled: false,
    internal: { ...next.hooks?.internal, enabled: false },
  };
  return { next, workspacePairs };
}
async function main() {
  const args = parseArgs();
  const sourceRepo = fs.realpathSync(args["source-repo"]);
  const snapshot = fs.realpathSync(args["snapshot-repo"]);
  requireQa(fs.realpathSync(process.cwd()) === snapshot, "RUN_FROM_SNAPSHOT_ROOT_FOR_TSX_PATHS");
  const liveState = fs.realpathSync(args["live-state"]);
  const requestedRoot = path.resolve(args["qa-root"]);
  const qaRoot = path.join(
    fs.realpathSync(path.dirname(requestedRoot)),
    path.basename(requestedRoot),
  );
  requireQa(
    !inside(sourceRepo, qaRoot) && !inside(liveState, qaRoot) && !inside(qaRoot, liveState),
    "QA_ROOT_OVERLAP",
  );
  requireQa(
    snapshot !== sourceRepo && !inside(sourceRepo, snapshot) && !inside(liveState, snapshot),
    "SNAPSHOT_NOT_ISOLATED",
  );
  requireQa(!fs.existsSync(qaRoot), "QA_ROOT_MUST_NOT_EXIST");
  const port = Number(args.port);
  requireQa(
    Number.isInteger(port) && port >= 1024 && port <= 65000 && Math.abs(port - 18789) >= 20,
    "UNSAFE_QA_PORT",
  );
  const qaState = path.join(qaRoot, "state");
  const configPath = path.join(liveState, "openclaw.json");
  const configHash = digestFile(configPath);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  requireQa(Math.abs(port - (config.gateway?.port ?? 18789)) >= 20, "LIVE_PORT_OVERLAP");
  const prefix = `openclaw-qa-${createHash("sha256").update(qaRoot).digest("hex").slice(0, 12)}-`;
  const { next: qaConfig, workspacePairs } = makeConfig(
    config,
    liveState,
    qaState,
    snapshot,
    port,
    prefix,
  );
  for (const relative of [
    "openclaw.mjs",
    "dist/entry.js",
    "dist/control-ui/index.html",
    "src/enterprise/database/enterprise-schema.ts",
  ]) {
    requireQa(fs.existsSync(path.join(snapshot, relative)), "SNAPSHOT_INCOMPLETE");
    requireQa(
      inside(snapshot, fs.realpathSync(path.join(snapshot, relative))),
      "SNAPSHOT_FILE_ESCAPE",
    );
  }
  // Reject wholesale dependency symlinks that would resolve workspace packages in the live checkout.
  requireQa(fs.existsSync(path.join(snapshot, "node_modules")), "SNAPSHOT_DEPENDENCIES_MISSING");
  requireQa(
    inside(snapshot, fs.realpathSync(path.join(snapshot, "node_modules"))),
    "WHOLE_NODE_MODULES_SYMLINK_UNSAFE",
  );
  for (const name of ["ai", "knowledge-graph-core", "session-url-contract"]) {
    requireQa(
      inside(snapshot, fs.realpathSync(path.join(snapshot, "node_modules/@openclaw", name))),
      "WORKSPACE_DEPENDENCY_ESCAPE",
    );
  }
  const input = new DatabaseSync(path.join(liveState, "state/openclaw.sqlite"), { readOnly: true });
  let canonical;
  try {
    input.exec("BEGIN");
    const tableRows = new Map();
    const count = (table) =>
      Number(input.prepare(`SELECT count(*) AS n FROM ${quote(table)}`).get().n);
    requireQa(count("enterprise_user_skill_installs") === 0, "SKILL_INSTALL_COPY_REQUIRES_REVIEW");
    requireQa(count("secret_store_entries") === 0, "SECRET_STORE_COPY_REQUIRES_REVIEW");
    requireQa(
      input
        .prepare(
          "SELECT count(*) AS n FROM enterprise_knowledge_jobs WHERE status NOT IN ('succeeded','failed','cancelled')",
        )
        .get().n === 0,
      "KNOWLEDGE_JOB_RUNNING",
    );
    requireQa(
      input
        .prepare(
          "SELECT count(*) AS n FROM enterprise_settings WHERE setting_key = 'auth.jwt.hs256.v1'",
        )
        .get().n === 1,
      "JWT_SETTING_MISSING",
    );
    const now = Date.now();
    for (const table of TABLES) {
      const rows =
        table === "config_machine_state"
          ? input
              .prepare("SELECT * FROM config_machine_state WHERE state_key = 'auth.sharedStore'")
              .all()
          : table === "enterprise_auth_sessions"
            ? input
                .prepare(
                  "SELECT * FROM enterprise_auth_sessions WHERE revoked_at IS NULL AND expires_at > ? AND last_seen_at > ? AND audience IN ('admin','user')",
                )
                .all(now, now - 2 * 60 * 60 * 1000)
            : input.prepare(`SELECT * FROM ${quote(table)}`).all();
      tableRows.set(table, rows);
    }
    // Shared credentials and their process-stable owner must be copied together.
    const sharedAuthOwner = tableRows.get("config_machine_state");
    requireQa(
      sharedAuthOwner.length === 1 &&
        JSON.stringify(JSON.parse(sharedAuthOwner[0].value_json)) === '{"location":"state-db"}',
      "SHARED_MODEL_AUTH_OWNER_REQUIRES_REVIEW",
    );
    requireQa(
      ["admin", "user"].every((audience) =>
        tableRows.get("enterprise_auth_sessions").some((row) => row.audience === audience),
      ),
      "ACTIVE_CHROME_SESSIONS_REQUIRED",
    );
    requireQa(
      tableRows.get("auth_profile_stores").some((row) => row.store_key === "shared"),
      "SHARED_MODEL_AUTH_MISSING",
    );
    const trees = [];
    for (const relative of [
      "enterprise-knowledge/blobs",
      "enterprise-knowledge/normalized",
      "enterprise-knowledge/indexes",
      "enterprise/accounts",
    ]) {
      const source = path.join(liveState, relative);
      requireQa(fs.existsSync(source), "QA_DATA_TREE_MISSING");
      trees.push({ source, target: path.join(qaState, relative), files: inspectTree(source) });
    }
    const report = {
      status: args.apply ? "preparing" : "preflight-passed",
      port,
      containerPrefix: prefix,
      tables: Object.fromEntries([...tableRows].map(([table, rows]) => [table, rows.length])),
      copiedFileCount: trees.reduce((total, tree) => total + tree.files.length, 0),
      copiedBytes: trees.reduce(
        (total, tree) => total + tree.files.reduce((sum, file) => sum + file.size, 0),
        0,
      ),
      memoryIndexesCopied: false,
      gatewayStarted: false,
      evidenceRightsChanged: false,
    };
    if (!args.apply) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    process.umask(0o077);
    privateDir(qaRoot);
    privateDir(qaState);
    privateDir(path.join(qaRoot, "home"));
    const env = {
      ...process.env,
      OPENCLAW_HOME: path.join(qaRoot, "home"),
      OPENCLAW_STATE_DIR: qaState,
      OPENCLAW_CONFIG_PATH: path.join(qaState, "openclaw.json"),
    };
    Object.assign(process.env, {
      OPENCLAW_HOME: env.OPENCLAW_HOME,
      OPENCLAW_STATE_DIR: qaState,
      OPENCLAW_CONFIG_PATH: env.OPENCLAW_CONFIG_PATH,
    });
    canonical = await import(
      pathToFileURL(path.join(snapshot, "src/state/openclaw-state-db.ts")).href
    );
    const enterprise = await import(
      pathToFileURL(path.join(snapshot, "src/enterprise/database/enterprise-schema.ts")).href
    );
    const workspace = await import(
      pathToFileURL(path.join(snapshot, "src/agents/workspace.ts")).href
    );
    const options = { env, path: path.join(qaState, "state/openclaw.sqlite") };
    const database = canonical.openOpenClawStateDatabase(options);
    enterprise.ensureEnterpriseSchema({ ...options, database });
    canonical.runOpenClawStateWriteTransaction(
      ({ db }) => {
        for (const [table, rows] of tableRows) {
          const sourceColumns = input
            .prepare(`PRAGMA table_info(${quote(table)})`)
            .all()
            .map((row) => row.name);
          const destinationColumns = new Set(
            db
              .prepare(`PRAGMA table_info(${quote(table)})`)
              .all()
              .map((row) => row.name),
          );
          requireQa(
            sourceColumns.every((column) => destinationColumns.has(column)),
            "SCHEMA_COPY_REQUIRES_REVIEW",
          );
          const existing =
            table === "config_machine_state"
              ? db
                  .prepare(
                    "SELECT count(*) AS n FROM config_machine_state WHERE state_key = 'auth.sharedStore'",
                  )
                  .get().n
              : db.prepare(`SELECT count(*) AS n FROM ${quote(table)}`).get().n;
          requireQa(existing === 0, "FRESH_TABLE_NOT_EMPTY");
          const insert = db.prepare(
            `INSERT INTO ${quote(table)} (${sourceColumns.map(quote).join(",")}) VALUES (${sourceColumns.map(() => "?").join(",")})`,
          );
          for (const row of rows) insert.run(...sourceColumns.map((column) => row[column]));
        }
        requireQa(
          db.prepare("PRAGMA foreign_key_check").all().length === 0,
          "SEEDED_FOREIGN_KEY_FAILURE",
        );
        for (const table of EMPTY_OPERATIONAL_TABLES)
          requireQa(
            db.prepare(`SELECT count(*) AS n FROM ${quote(table)}`).get().n === 0,
            "OPERATIONAL_TABLE_NOT_EMPTY",
          );
      },
      { ...options, database },
      { operationLabel: "qa.isolated-seed" },
    );
    for (const tree of trees) await copyTree(tree.target, tree.files);
    for (const [source, target] of workspacePairs) {
      privateDir(target);
      requireQa(fs.realpathSync(source) === source, "TEMPLATE_WORKSPACE_ESCAPE");
      for (const name of workspace.WORKSPACE_BOOTSTRAP_FILENAMES) {
        const file = path.join(source, name);
        if (!fs.existsSync(file)) continue;
        const stat = fs.lstatSync(file);
        requireQa(
          stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 1024 * 1024,
          "TEMPLATE_FILE_NOT_PRIVATE",
        );
        const hash = digestFile(file);
        fs.copyFileSync(file, path.join(target, name), fs.constants.COPYFILE_EXCL);
        fs.chmodSync(path.join(target, name), 0o600);
        requireQa(
          hash === digestFile(file) && hash === digestFile(path.join(target, name)),
          "TEMPLATE_CHANGED",
        );
      }
    }
    requireQa(configHash === digestFile(configPath), "LIVE_CONFIG_CHANGED");
    privateJson(env.OPENCLAW_CONFIG_PATH, qaConfig);
    const launchEnv = {
      OPENCLAW_HOME: env.OPENCLAW_HOME,
      OPENCLAW_STATE_DIR: qaState,
      OPENCLAW_CONFIG_PATH: env.OPENCLAW_CONFIG_PATH,
      OPENCLAW_SKIP_CRON: "1",
      OPENCLAW_SKIP_CHANNELS: "1",
      OPENCLAW_SKIP_GMAIL_WATCHER: "1",
      OPENCLAW_SKIP_BROWSER_CONTROL_SERVER: "1",
      OPENCLAW_SKIP_CANVAS_HOST: "1",
      OPENCLAW_SKIP_STARTUP_MODEL_PREWARM: "1",
    };
    privateJson(path.join(qaRoot, "launch.json"), {
      cwd: snapshot,
      command: process.execPath,
      args: ["openclaw.mjs", "gateway", "--port", String(port), "--bind", "loopback"],
      env: launchEnv,
    });
    report.status = "seeded-not-started";
    privateJson(path.join(qaRoot, "seed-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (input.isOpen) {
      if (input.isTransaction) input.exec("ROLLBACK");
      input.close();
    }
    canonical?.closeOpenClawStateDatabase();
  }
}
main().catch((error) => {
  // Do not print driver errors, config, SQL rows, auth profiles, or stack traces.
  console.error(
    error instanceof QaError ? error.message : `QA_PREPARATION_FAILED_${error?.name ?? "Error"}`,
  );
  console.error(
    "No gateway was started. Any partial QA root is retained privately for inspection; live state was opened read-only.",
  );
  process.exitCode = 1;
});
