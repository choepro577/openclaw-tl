// One authorized QA repair. No credential, model, entitlement or source changes.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { DatabaseSync, backup } from "node:sqlite";
import { pathToFileURL } from "node:url";

const root = "/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime";
const repo = "/private/tmp/openclaw-qa-20260904.yZ2L8w/repo";
const dbPath = `${root}/state/state/openclaw.sqlite`;
const launch = JSON.parse(fs.readFileSync(`${root}/launch.json`, "utf8"));
assert.equal(launch.cwd, repo);
assert.equal(launch.env.OPENCLAW_STATE_DIR, `${root}/state`);
assert.equal(launch.args[3], "19789");
Object.assign(process.env, launch.env);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const configHash = digest(fs.readFileSync(launch.env.OPENCLAW_CONFIG_PATH));
const input = new DatabaseSync(dbPath, { readOnly: true });
const fingerprint = (db, sql) => digest(JSON.stringify(db.prepare(sql).all()));
const protectedSql = {
  auth: "SELECT * FROM auth_profile_stores ORDER BY store_key",
  authState: "SELECT * FROM auth_profile_state ORDER BY store_key",
  grants:
    "SELECT * FROM enterprise_knowledge_evidence_transfer_grants ORDER BY zone_id,target_agent_resource_key",
  zones: "SELECT * FROM enterprise_knowledge_zones ORDER BY id",
};
const before = Object.fromEntries(
  Object.entries(protectedSql).map(([key, sql]) => [key, fingerprint(input, sql)]),
);
assert.equal(
  input
    .prepare("SELECT count(*) n FROM config_machine_state WHERE state_key='auth.sharedStore'")
    .get().n,
  0,
);
assert.equal(
  input.prepare("SELECT count(*) n FROM auth_profile_stores WHERE store_key='shared'").get().n,
  1,
);
assert.equal(input.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
process.umask(0o077);
const backupDir = fs.mkdtempSync(`${root}/auth-owner-backup-`);
fs.chmodSync(backupDir, 0o700);
await backup(input, `${backupDir}/openclaw.sqlite`);
fs.chmodSync(`${backupDir}/openclaw.sqlite`, 0o600);
input.close();
const { importConfigMachineState } = await import(
  pathToFileURL(`${repo}/src/state/config-machine-state.ts`).href
);
const { closeOpenClawStateDatabase } = await import(
  pathToFileURL(`${repo}/src/state/openclaw-state-db.ts`).href
);
try {
  const changed = importConfigMachineState([["auth.sharedStore", { location: "state-db" }]], {
    env: process.env,
    path: dbPath,
  });
  assert.deepEqual(changed, { imported: ["auth.sharedStore"], kept: [] });
} finally {
  closeOpenClawStateDatabase();
}
const after = new DatabaseSync(dbPath, { readOnly: true });
try {
  assert.deepEqual(
    JSON.parse(
      after
        .prepare("SELECT value_json FROM config_machine_state WHERE state_key='auth.sharedStore'")
        .get().value_json,
    ),
    { location: "state-db" },
  );
  for (const [key, sql] of Object.entries(protectedSql))
    assert.equal(fingerprint(after, sql), before[key], `${key} changed`);
  assert.equal(digest(fs.readFileSync(launch.env.OPENCLAW_CONFIG_PATH)), configHash);
  assert.equal(after.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  console.log(
    JSON.stringify({
      status: "repaired",
      updatedKey: "auth.sharedStore",
      location: "state-db",
      backupDir,
      credentialsUnchanged: true,
      configUnchanged: true,
      grantsUnchanged: true,
      zonesUnchanged: true,
      integrity: "ok",
    }),
  );
} finally {
  after.close();
}
