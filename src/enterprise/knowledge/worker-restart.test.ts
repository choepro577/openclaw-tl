import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  deleteKnowledgeWorkerCheckpointIfPresent,
  putKnowledgeWorkerCheckpoint,
  readKnowledgeWorkerCheckpoint,
} from "./artifact-store.js";
import { KNOWLEDGE_JOB_LEASE_MS } from "./knowledge-limits.js";
import {
  claimNextKnowledgeJob,
  createKnowledgeSourceWithVersion,
  createKnowledgeZone,
  fenceKnowledgeJobUpdate,
  listKnowledgeJobSteps,
  updateKnowledgeJobStep,
} from "./knowledge-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise Knowledge worker restart fencing", () => {
  it("reclaims an expired lease and rejects the previous worker token", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-restart-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const account = createEnterpriseAccount(
      {
        username: "worker.owner",
        displayName: "Worker Owner",
        passwordHash: "test-only",
        role: "administrator",
        mustChangePassword: false,
      },
      options,
    );
    const zone = createKnowledgeZone(
      { slug: "restart-zone", name: "Restart" },
      account.id,
      options,
    );
    createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: "Policy",
        mimeType: "text/plain",
        contentHash: "a".repeat(64),
        blobHash: "a".repeat(64),
        byteSize: 10,
      },
      account.id,
      options,
    );
    const claimedAt = Date.now() + 1;
    const first = claimNextKnowledgeJob("worker-before-restart", claimedAt, options)!;
    updateKnowledgeJobStep(
      {
        job: first,
        stepId: "ai_read",
        stage: "ai_read",
        status: "running",
        progressCurrent: 30,
        progressTotal: 90,
        checkpointRef: "a".repeat(64),
      },
      options,
    );
    const second = claimNextKnowledgeJob(
      "worker-after-restart",
      claimedAt + KNOWLEDGE_JOB_LEASE_MS + 1,
      options,
    )!;
    expect(second.id).toBe(first.id);
    expect(second.claimToken).not.toBe(first.claimToken);
    updateKnowledgeJobStep(
      {
        job: second,
        stepId: "ai_read",
        stage: "ai_read",
        status: "running",
        progressCurrent: 30,
        progressTotal: 90,
      },
      options,
    );
    expect(listKnowledgeJobSteps(second.id, zone.id, options)[0]?.checkpointRef).toBe(
      "a".repeat(64),
    );
    expect(
      fenceKnowledgeJobUpdate(
        {
          jobId: first.id,
          claimToken: first.claimToken!,
          claimOwner: first.claimOwner!,
          pipelineGeneration: first.pipelineGeneration,
        },
        options,
      ),
    ).toBe(false);
    expect(
      fenceKnowledgeJobUpdate(
        {
          jobId: second.id,
          claimToken: second.claimToken!,
          claimOwner: second.claimOwner!,
          pipelineGeneration: second.pipelineGeneration,
        },
        options,
      ),
    ).toBe(true);
  });

  it("stores AI batch checkpoints as private content-addressed artifacts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-checkpoint-"));
    directories.push(directory);
    const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
    const checkpoint = { phase: "map", nextOffset: 60, nodes: [{ key: "hr" }] };

    const stored = await putKnowledgeWorkerCheckpoint(checkpoint, env);
    expect(stored.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(statSync(stored.path).mode & 0o777).toBe(0o600);
    await expect(readKnowledgeWorkerCheckpoint(stored.hash, env)).resolves.toEqual(checkpoint);

    await deleteKnowledgeWorkerCheckpointIfPresent(stored.hash, env);
    await expect(readKnowledgeWorkerCheckpoint(stored.hash, env)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
