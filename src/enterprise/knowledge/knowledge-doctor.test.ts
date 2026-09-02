import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { doctorEnterpriseKnowledge } from "./knowledge-doctor.js";
import {
  cancelKnowledgeJob,
  createKnowledgeSourceWithVersion,
  createKnowledgeZone,
} from "./knowledge-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise Knowledge doctor", () => {
  it("reports missing immutable artifacts without exposing a filesystem path", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-doctor-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
    const account = createEnterpriseAccount(
      {
        username: "knowledge.doctor",
        displayName: "Knowledge Doctor",
        passwordHash: "test-only",
        role: "administrator",
        mustChangePassword: false,
      },
      options,
    );
    const zone = createKnowledgeZone({ slug: "doctor-zone", name: "Doctor" }, account.id, options);
    const hash = "a".repeat(64);
    const source = createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "file",
        title: "Missing artifact",
        mimeType: "text/plain",
        contentHash: hash,
        blobHash: hash,
        byteSize: 10,
      },
      account.id,
      options,
    );
    cancelKnowledgeJob(source.jobId, zone.id, options);

    const report = await doctorEnterpriseKnowledge({ databaseOptions: options, env });
    expect(report.ok).toBe(false);
    expect(report.artifacts).toMatchObject({ checked: 1, missing: 1 });
    expect(report.artifacts.issues).toContainEqual({
      kind: "blob",
      identity: hash,
      code: "missing",
    });
    expect(JSON.stringify(report)).not.toContain(directory);
  });
});
