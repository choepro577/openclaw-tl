import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  cancelKnowledgeJob,
  claimKnowledgeIdempotency,
  completeKnowledgeIdempotency,
  claimNextKnowledgeJob,
  createKnowledgeSourceVersion,
  createKnowledgeSourceWithVersion,
  createKnowledgeZone,
  enqueueKnowledgeZoneBuild,
  finishKnowledgeJob,
  finishKnowledgeGeneration,
  createKnowledgeGeneration,
  getLatestKnowledgeCandidate,
  getKnowledgeSourceVersion,
  getKnowledgeZone,
  getEnterpriseKnowledgeChangeFeedBounds,
  listEnterpriseKnowledgeChanges,
  listKnowledgeJobSteps,
  listKnowledgeJobs,
  listKnowledgeZoneMemberships,
  previewKnowledgeZonePurge,
  purgeKnowledgeZone,
  replaceKnowledgeAgentBindings,
  replaceKnowledgeZoneMemberships,
  reprocessKnowledgeSourceVersion,
  retryKnowledgeJob,
  publishKnowledgeCandidate,
  setKnowledgeZoneArchived,
  setKnowledgeSourceStagedRemove,
  fenceKnowledgeJobUpdate,
  updateKnowledgeJobStep,
  updateKnowledgeZone,
} from "./knowledge-store.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

const directories: string[] = [];

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-store-"));
  directories.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const admin = createEnterpriseAccount(
    {
      username: "knowledge.admin",
      displayName: "Knowledge Admin",
      passwordHash: "test-only",
      role: "administrator",
      mustChangePassword: false,
    },
    options,
  );
  const employee = createEnterpriseAccount(
    {
      username: "knowledge.employee",
      displayName: "Knowledge Employee",
      passwordHash: "test-only",
      role: "employee",
      mustChangePassword: false,
    },
    options,
  );
  return { options, admin, employee };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise knowledge control plane", () => {
  it("retires superseded candidates when a newer generation finishes", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "candidate-lifecycle", name: "Candidate Lifecycle" },
      admin.id,
      options,
    );
    const first = createKnowledgeGeneration(
      zone.id,
      zone.sourceSetRevision,
      zone.buildRevision,
      options,
    );
    expect(
      finishKnowledgeGeneration(
        first.id,
        { lexicalStatus: "ready", vectorStatus: "ready" },
        options,
      ),
    ).toBe(true);

    const second = createKnowledgeGeneration(
      zone.id,
      zone.sourceSetRevision,
      zone.buildRevision,
      options,
    );
    expect(
      finishKnowledgeGeneration(
        second.id,
        { lexicalStatus: "ready", vectorStatus: "ready" },
        options,
      ),
    ).toBe(true);
    expect(getLatestKnowledgeCandidate(zone.id, options)?.id).toBe(second.id);

    publishKnowledgeCandidate(
      {
        zoneId: zone.id,
        baseRevision: zone.revision,
        generationId: second.id,
        actorAccountId: admin.id,
      },
      options,
    );
    expect(getLatestKnowledgeCandidate(zone.id, options)).toBeUndefined();
  });

  it("enforces revision CAS and preserves manager grants on manager-scoped member edits", () => {
    const { options, admin, employee } = fixture();
    const zone = createKnowledgeZone(
      { slug: "company-handbook", name: "Handbook" },
      admin.id,
      options,
    );
    const withManager = replaceKnowledgeZoneMemberships(
      zone.id,
      [{ accountId: admin.id, role: "manager" }],
      zone.revision,
      admin.id,
      true,
      options,
    );
    const withViewer = replaceKnowledgeZoneMemberships(
      zone.id,
      [{ accountId: employee.id, role: "viewer" }],
      withManager.revision,
      admin.id,
      false,
      options,
    );
    expect(listKnowledgeZoneMemberships(zone.id, options)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: admin.id, role: "manager" }),
        expect.objectContaining({ accountId: employee.id, role: "viewer" }),
      ]),
    );
    expect(() =>
      replaceKnowledgeAgentBindings(
        zone.id,
        ["agent:shared:main"],
        withViewer.revision - 1,
        admin.id,
        options,
      ),
    ).toThrowError(EnterpriseKnowledgeError);
    const bound = replaceKnowledgeAgentBindings(
      zone.id,
      ["agent:shared:main", "agent:shared:main"],
      withViewer.revision,
      admin.id,
      options,
    );
    expect(bound.accessRevision).toBeGreaterThan(zone.accessRevision);
  });

  it("fences cancelled jobs and retries a source with a new pipeline generation", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "job-recovery", name: "Job Recovery" },
      admin.id,
      options,
    );
    const created = createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: "Policy",
        mimeType: "text/markdown",
        contentHash: "a".repeat(64),
        blobHash: "a".repeat(64),
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const claimed = claimNextKnowledgeJob("worker-a", Date.now(), options)!;
    expect(claimed.id).toBe(created.jobId);
    const cancelled = cancelKnowledgeJob(claimed.id, zone.id, options);
    expect(cancelled.status).toBe("cancelled");
    expect(finishKnowledgeJob(claimed, { status: "succeeded" }, options)).toBe(false);

    const retried = retryKnowledgeJob(cancelled.id, zone.id, admin.id, options);
    expect(retried.pipelineGeneration).toBeGreaterThan(claimed.pipelineGeneration);
    expect(getKnowledgeSourceVersion(created.version.id, options)?.processingStatus).toBe("queued");

    expect(() =>
      createKnowledgeSourceVersion(
        created.source.id,
        {
          mimeType: "text/markdown",
          contentHash: "b".repeat(64),
          blobHash: "b".repeat(64),
          byteSize: 12,
        },
        admin.id,
        options,
      ),
    ).toThrowError(expect.objectContaining({ code: "SOURCE_PIPELINE_ACTIVE" }));

    cancelKnowledgeJob(retried.id, zone.id, options);
    const nextVersion = createKnowledgeSourceVersion(
      created.source.id,
      {
        mimeType: "text/markdown",
        contentHash: "c".repeat(64),
        blobHash: "c".repeat(64),
        byteSize: 14,
      },
      admin.id,
      options,
    );
    expect(nextVersion.version.versionNumber).toBe(2);
    expect(nextVersion.version.pipelineGeneration).toBeGreaterThan(retried.pipelineGeneration);
  });

  it("normalizes successful job progress to the declared total", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "job-progress", name: "Job Progress" },
      admin.id,
      options,
    );
    createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: "Policy",
        mimeType: "text/markdown",
        contentHash: "f".repeat(64),
        blobHash: "f".repeat(64),
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const claimed = claimNextKnowledgeJob("worker-a", Date.now(), options)!;
    expect(
      fenceKnowledgeJobUpdate(
        {
          jobId: claimed.id,
          claimToken: claimed.claimToken!,
          claimOwner: claimed.claimOwner!,
          pipelineGeneration: claimed.pipelineGeneration,
          stage: "normalize",
          progressCurrent: 3,
          progressTotal: 5,
        },
        options,
      ),
    ).toBe(true);

    expect(finishKnowledgeJob(claimed, { status: "succeeded" }, options)).toBe(true);
    expect(listKnowledgeJobs(zone.id, options)[0]).toMatchObject({
      status: "succeeded",
      progressCurrent: 5,
      progressTotal: 5,
    });
  });

  it("persists ordered job-step and change-feed updates for realtime replay", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "realtime-queue", name: "Realtime Queue" },
      admin.id,
      options,
    );
    createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: "Policy",
        mimeType: "text/plain",
        contentHash: "9".repeat(64),
        blobHash: "9".repeat(64),
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const claimed = claimNextKnowledgeJob("realtime-worker", Date.now(), options)!;
    updateKnowledgeJobStep(
      {
        job: claimed,
        stepId: "ai_read",
        stage: "ai_read",
        status: "running",
        progressCurrent: 30,
        progressTotal: 60,
        checkpointRef: "checkpoint-1",
      },
      options,
    );
    updateKnowledgeJobStep(
      {
        job: claimed,
        stepId: "ai_read",
        stage: "ai_read",
        status: "completed",
        progressCurrent: 60,
        progressTotal: 60,
        checkpointRef: "checkpoint-2",
      },
      options,
    );
    expect(listKnowledgeJobSteps(claimed.id, zone.id, options)).toEqual([
      expect.objectContaining({
        stage: "ai_read",
        status: "completed",
        progressCurrent: 60,
        progressTotal: 60,
        checkpointRef: "checkpoint-2",
      }),
    ]);
    const changes = listEnterpriseKnowledgeChanges(
      { afterSequence: 0, zoneId: zone.id, limit: 500 },
      options,
    );
    expect(changes.map((change) => change.sequence)).toEqual(
      changes.map((change) => change.sequence).toSorted((left, right) => left - right),
    );
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "job", status: "running" }),
        expect.objectContaining({
          entityType: "job_step",
          stage: "ai_read",
          status: "completed",
          progressCurrent: 60,
          progressTotal: 60,
        }),
      ]),
    );
    const bounds = getEnterpriseKnowledgeChangeFeedBounds(zone.id, options);
    expect(bounds.firstSequence).toBe(changes[0]!.sequence);
    expect(bounds.lastSequence).toBe(changes.at(-1)!.sequence);
  });

  it("supersedes a stale Zone build when buildRevision advances", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "zone-build-coalescing", name: "Zone Build Coalescing" },
      admin.id,
      options,
    );
    const firstJobId = enqueueKnowledgeZoneBuild(zone.id, admin.id, options);
    const changedZone = updateKnowledgeZone(
      zone.id,
      { baseRevision: zone.revision, description: "A newer graph configuration" },
      admin.id,
      options,
    );
    const secondJobId = enqueueKnowledgeZoneBuild(zone.id, admin.id, options);

    expect(secondJobId).not.toBe(firstJobId);
    expect(listKnowledgeJobs(zone.id, options)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstJobId,
          status: "cancelled",
          safeErrorCode: "SUPERSEDED_BUILD_REVISION",
        }),
        expect.objectContaining({
          id: secondJobId,
          status: "queued",
          pipelineGeneration: changedZone.buildRevision,
        }),
      ]),
    );
    expect(listKnowledgeJobSteps(firstJobId, zone.id, options)).toEqual([
      expect.objectContaining({ status: "superseded", stage: "zone_build" }),
    ]);
    expect(
      listEnterpriseKnowledgeChanges({ afterSequence: 0, zoneId: zone.id, limit: 500 }, options),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: firstJobId, status: "superseded" }),
      ]),
    );
  });

  it("reprocesses one immutable Source Version behind build-revision fencing", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "artifact-v3-reprocess", name: "Artifact V3" },
      admin.id,
      options,
    );
    const created = createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "file",
        title: "Nội quy",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentHash: "8".repeat(64),
        blobHash: "8".repeat(64),
        byteSize: 128,
      },
      admin.id,
      options,
    );
    cancelKnowledgeJob(created.jobId, zone.id, options);
    const currentZone = getKnowledgeZone(zone.id, options)!;
    const result = reprocessKnowledgeSourceVersion(
      {
        zoneId: zone.id,
        sourceId: created.source.id,
        versionId: created.version.id,
        baseBuildRevision: currentZone.buildRevision,
        actorAccountId: admin.id,
      },
      options,
    );
    expect(result.buildRevision).toBe(currentZone.buildRevision + 1);
    expect(result.version).toMatchObject({
      id: created.version.id,
      processingStatus: "queued",
    });
    expect(listKnowledgeJobs(zone.id, options)[0]).toMatchObject({
      id: result.jobId,
      stage: "checking",
      status: "queued",
    });
    expect(() =>
      reprocessKnowledgeSourceVersion(
        {
          zoneId: zone.id,
          sourceId: created.source.id,
          versionId: created.version.id,
          baseBuildRevision: currentZone.buildRevision,
          actorAccountId: admin.id,
        },
        options,
      ),
    ).toThrowError(expect.objectContaining({ code: "STALE_REVISION" }));
  });

  it("stages source removal without changing the active publication pointer", () => {
    const { options, admin } = fixture();
    const zone = createKnowledgeZone(
      { slug: "staged-removal", name: "Staged Removal" },
      admin.id,
      options,
    );
    const created = createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title: "Draft",
        mimeType: "text/markdown",
        contentHash: "b".repeat(64),
        blobHash: "b".repeat(64),
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const activePublication = getKnowledgeZone(zone.id, options)?.activePublicationId;
    expect(setKnowledgeSourceStagedRemove(created.source.id, true, admin.id, options).status).toBe(
      "staged_remove",
    );
    expect(getKnowledgeZone(zone.id, options)?.activePublicationId).toBe(activePublication);
  });

  it("replays identical idempotent mutations and rejects key reuse with another payload", () => {
    const { options, admin } = fixture();
    const common = {
      audience: "admin" as const,
      actorAccountId: admin.id,
      operation: "zone.create",
      key: "knowledge-zone-create-1",
      requestHash: "a".repeat(64),
    };
    expect(claimKnowledgeIdempotency(common, options)).toEqual({ state: "claimed" });
    completeKnowledgeIdempotency(
      { ...common, responseStatus: 201, response: { zoneId: "zone-1" } },
      options,
    );
    expect(claimKnowledgeIdempotency(common, options)).toEqual({
      state: "replay",
      status: 201,
      response: { zoneId: "zone-1" },
    });
    expect(() =>
      claimKnowledgeIdempotency({ ...common, requestHash: "b".repeat(64) }, options),
    ).toThrowError(expect.objectContaining({ code: "IDEMPOTENCY_KEY_REUSED" }));
  });

  it("requires archive and typed confirmation, then preserves shared CAS references on purge", () => {
    const { options, admin } = fixture();
    const first = createKnowledgeZone({ slug: "purge-me", name: "Purge Me" }, admin.id, options);
    const second = createKnowledgeZone({ slug: "keep-me", name: "Keep Me" }, admin.id, options);
    const sharedHash = "d".repeat(64);
    const uniqueHash = "e".repeat(64);
    const sharedFirst = createKnowledgeSourceWithVersion(
      {
        zoneId: first.id,
        kind: "file",
        title: "Shared A",
        mimeType: "text/plain",
        contentHash: sharedHash,
        blobHash: sharedHash,
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const uniqueFirst = createKnowledgeSourceWithVersion(
      {
        zoneId: first.id,
        kind: "file",
        title: "Unique",
        mimeType: "text/plain",
        contentHash: uniqueHash,
        blobHash: uniqueHash,
        byteSize: 10,
      },
      admin.id,
      options,
    );
    const sharedSecond = createKnowledgeSourceWithVersion(
      {
        zoneId: second.id,
        kind: "file",
        title: "Shared B",
        mimeType: "text/plain",
        contentHash: sharedHash,
        blobHash: sharedHash,
        byteSize: 10,
      },
      admin.id,
      options,
    );
    cancelKnowledgeJob(sharedFirst.jobId, first.id, options);
    cancelKnowledgeJob(uniqueFirst.jobId, first.id, options);
    cancelKnowledgeJob(sharedSecond.jobId, second.id, options);

    expect(() =>
      purgeKnowledgeZone(
        {
          zoneId: first.id,
          baseRevision: getKnowledgeZone(first.id, options)!.revision,
          confirmation: "purge-me",
        },
        options,
      ),
    ).toThrowError(expect.objectContaining({ code: "ZONE_MUST_BE_ARCHIVED" }));

    const archived = setKnowledgeZoneArchived(
      first.id,
      true,
      getKnowledgeZone(first.id, options)!.revision,
      admin.id,
      options,
    );
    expect(previewKnowledgeZonePurge(first.id, options)).toEqual(
      expect.objectContaining({ sources: 2, versions: 2, activeJobs: 0, status: "archived" }),
    );
    expect(() =>
      purgeKnowledgeZone(
        { zoneId: first.id, baseRevision: archived.revision, confirmation: "wrong" },
        options,
      ),
    ).toThrowError(expect.objectContaining({ code: "PURGE_CONFIRMATION_INVALID" }));

    const purged = purgeKnowledgeZone(
      { zoneId: first.id, baseRevision: archived.revision, confirmation: "purge-me" },
      options,
    );
    expect(getKnowledgeZone(first.id, options)).toBeUndefined();
    expect(getKnowledgeSourceVersion(sharedSecond.version.id, options)).toBeDefined();
    expect(purged.blobHashes).toEqual([uniqueHash]);
  });
});
