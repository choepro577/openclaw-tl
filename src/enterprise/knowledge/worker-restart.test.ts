import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as configModule from "../../config/config.js";
import { createDeferredCore } from "../../shared/deferred.js";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import {
  resolveKnowledgeGenerationDatabasePath,
  resolveKnowledgeGenerationGraphDatabasePath,
  deleteKnowledgeWorkerCheckpointIfPresent,
  putKnowledgeBlob,
  putKnowledgeWorkerCheckpoint,
  readKnowledgeWorkerCheckpoint,
} from "./artifact-store.js";
import * as embeddingModule from "./embedding-runtime.js";
import {
  readKnowledgeGraphSummary,
  readKnowledgeGraphNeighborhood,
  readKnowledgeGraphNodeDetail,
  compareKnowledgeGraphs,
} from "./graph-query.js";
import { doctorEnterpriseKnowledge } from "./knowledge-doctor.js";
import { updateKnowledgeGraphSettings } from "./knowledge-graph-control-store.js";
import { createKnowledgeGraphExport } from "./knowledge-graph-export.js";
import { resolveKnowledgeGraphSnapshotContext } from "./knowledge-graph-service.js";
import { KNOWLEDGE_JOB_LEASE_MS } from "./knowledge-limits.js";
import {
  claimNextKnowledgeJob,
  createKnowledgeSourceWithVersion,
  createKnowledgeSourceVersion,
  createKnowledgeZone,
  fenceKnowledgeJobUpdate,
  getKnowledgeZone,
  getLatestKnowledgeCandidate,
  listEnterpriseKnowledgeChanges,
  listKnowledgeJobSteps,
  listKnowledgeJobs,
  listKnowledgePublications,
  publishKnowledgeCandidate,
  updateKnowledgeJobStep,
} from "./knowledge-store.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";
import { runEnterpriseKnowledgeWorkerOnce } from "./worker.js";

const directories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function workerFixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-worker-"));
  directories.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.spyOn(configModule, "loadConfig").mockReturnValue({});
  const embedding: embeddingModule.EnterpriseKnowledgeEmbeddingRuntime = {
    identity: null,
    unavailableReason: "disabled",
    embedDocuments: async () => [],
    embedQuery: async () => [],
    close: async () => {},
  };
  const createEmbedding = vi
    .spyOn(embeddingModule, "createEnterpriseKnowledgeEmbeddingRuntime")
    .mockResolvedValue(embedding);
  const account = createEnterpriseAccount(
    {
      username: "build.owner",
      displayName: "Build Owner",
      passwordHash: "test-only",
      role: "administrator",
      mustChangePassword: false,
    },
    options,
  );
  const zone = createKnowledgeZone({ slug: "build-zone", name: "Build" }, account.id, options);
  const addNote = async (title: string, text = title) => {
    // Order job admission explicitly; no timing sleeps or same-millisecond queue ties.
    now += 1;
    const blob = await putKnowledgeBlob(Buffer.from(text), env);
    return createKnowledgeSourceWithVersion(
      {
        zoneId: zone.id,
        kind: "note",
        title,
        mimeType: "text/plain",
        contentHash: blob.hash,
        blobHash: blob.hash,
        byteSize: blob.byteSize,
      },
      account.id,
      options,
    );
  };
  const run = () => runEnterpriseKnowledgeWorkerOnce({ concurrency: 1, options, env });
  return { options, env, account, zone, embedding, createEmbedding, addNote, run };
}

function removeGraphFromLegacyFixture(
  setup: ReturnType<typeof workerFixture>,
  generationId: string,
) {
  const file = resolveKnowledgeGenerationDatabasePath(setup.zone.id, generationId, setup.env);
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys=OFF; DROP TABLE graph_nodes_fts;");
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'graph_%'")
    .all();
  for (const table of tables) {
    const name = String(table.name);
    if (!/^graph_[a-z_]+$/.test(name)) throw new Error("Unexpected graph table");
    db.exec(`DROP TABLE ${name}`);
  }
  db.prepare("DELETE FROM metadata WHERE key='graphStatus'").run();
  db.close();
  const checksum = createHash("sha256").update(readFileSync(file)).digest("hex");
  openOpenClawStateDatabase(setup.options)
    .db.prepare(
      "UPDATE enterprise_knowledge_index_generations SET graph_status='not_built', graph_schema_version=1, artifact_checksum=? WHERE id=?",
    )
    .run(checksum, generationId);
  return { file, checksum };
}

describe("Enterprise Knowledge worker restart fencing", () => {
  it("automatically provisions legacy Active and Candidate graphs without republishing", async () => {
    const setup = workerFixture();
    await setup.addNote("Published leave policy", "Employees receive twelve days of leave.");
    await setup.run();
    await setup.run();
    const first = getLatestKnowledgeCandidate(setup.zone.id, setup.options)!;
    const published = publishKnowledgeCandidate(
      {
        zoneId: setup.zone.id,
        generationId: first.id,
        baseRevision: getKnowledgeZone(setup.zone.id, setup.options)!.revision,
        degradedReason: "Test uses lexical indexing only.",
        actorAccountId: setup.account.id,
      },
      setup.options,
    );
    const legacy = removeGraphFromLegacyFixture(setup, first.id);
    // Simulate older generations without immutable artifact bindings.
    openOpenClawStateDatabase(setup.options)
      .db.prepare("DELETE FROM enterprise_knowledge_generation_artifacts WHERE generation_id=?")
      .run(first.id);
    await setup.addNote("Unpublished policy", "Draft policy must remain in Candidate.");
    await setup.run();
    await setup.run();
    const candidate = getLatestKnowledgeCandidate(setup.zone.id, setup.options)!;
    const legacyCandidate = removeGraphFromLegacyFixture(setup, candidate.id);
    const context = (snapshot: "active" | "candidate") =>
      resolveKnowledgeGraphSnapshotContext({
        zoneId: setup.zone.id,
        snapshot,
        env: setup.env,
        options: setup.options,
      });
    const active = readKnowledgeGraphNeighborhood(context("active"));
    expect(active.nodes.length).toBeGreaterThan(0);
    expect(active.nodes.some((node) => node.label.includes("Unpublished"))).toBe(false);
    expect(
      readKnowledgeGraphNodeDetail(context("active"), active.nodes[0]!.nodeRef).evidence.length,
    ).toBeGreaterThan(0);
    const next = readKnowledgeGraphNeighborhood(context("candidate"));
    expect(next.nodes.some((node) => node.label.includes("Unpublished"))).toBe(true);
    expect(compareKnowledgeGraphs(context("active"), context("candidate"))).toBeDefined();
    const cache = resolveKnowledgeGenerationGraphDatabasePath(setup.zone.id, first.id, setup.env);
    unlinkSync(cache);
    expect(readKnowledgeGraphSummary(context("active")).nodeCount).toBe(active.summary.nodeCount);
    writeFileSync(cache, "corrupt disposable graph");
    expect(readKnowledgeGraphSummary(context("active")).nodeCount).toBe(active.summary.nodeCount);
    unlinkSync(cache);
    const exported = await createKnowledgeGraphExport({
      zoneId: setup.zone.id,
      actorAccountId: setup.account.id,
      idempotencyKey: "legacy-graph-export",
      env: setup.env,
      options: setup.options,
    });
    expect(exported.status).toBe("complete");
    expect(createHash("sha256").update(readFileSync(legacy.file)).digest("hex")).toBe(
      legacy.checksum,
    );
    expect(createHash("sha256").update(readFileSync(legacyCandidate.file)).digest("hex")).toBe(
      legacyCandidate.checksum,
    );
    expect(getKnowledgeZone(setup.zone.id, setup.options)?.activePublicationId).toBe(
      published.publicationId,
    );
    expect(listKnowledgePublications(setup.zone.id, setup.options)).toHaveLength(1);
  });

  it("does not provision a graph from a changed immutable index", async () => {
    const setup = workerFixture();
    await setup.addNote("Policy", "Original approved evidence.");
    await setup.run();
    await setup.run();
    const candidate = getLatestKnowledgeCandidate(setup.zone.id, setup.options)!;
    const legacy = removeGraphFromLegacyFixture(setup, candidate.id);
    const index = new DatabaseSync(legacy.file);
    index.prepare("UPDATE chunks SET original_text='Changed evidence'").run();
    index.close();
    const context = resolveKnowledgeGraphSnapshotContext({
      zoneId: setup.zone.id,
      snapshot: "candidate",
      env: setup.env,
      options: setup.options,
    });
    expect(() => readKnowledgeGraphSummary(context)).toThrow("failed validation");
    expect(getLatestKnowledgeCandidate(setup.zone.id, setup.options)?.graphStatus).toBe(
      "not_built",
    );
  });

  it("builds a default graph on ingestion and rebuilds it when the source changes", async () => {
    const setup = workerFixture();
    const source = await setup.addNote("Leave policy", "Employees receive twelve days of leave.");
    await setup.run();
    await setup.run();
    const context = () =>
      resolveKnowledgeGraphSnapshotContext({
        zoneId: setup.zone.id,
        snapshot: "candidate",
        options: setup.options,
        env: setup.env,
      });
    const first = context();
    expect(readKnowledgeGraphSummary(first).nodeCount).toBeGreaterThan(0);
    const blob = await putKnowledgeBlob(
      Buffer.from("Employees now receive fifteen days of leave."),
      setup.env,
    );
    createKnowledgeSourceVersion(
      source.source.id,
      {
        mimeType: "text/plain",
        contentHash: blob.hash,
        blobHash: blob.hash,
        byteSize: blob.byteSize,
      },
      setup.account.id,
      setup.options,
    );
    await setup.run();
    await setup.run();
    const updated = context();
    expect(updated.generationId).not.toBe(first.generationId);
    expect(readKnowledgeGraphSummary(updated).nodeCount).toBeGreaterThan(0);
    expect(listKnowledgePublications(setup.zone.id, setup.options)).toHaveLength(0);
  });

  it.each(["system", "zone"] as const)(
    "keeps the structural graph available with enrichment disabled at %s level",
    async (level) => {
      const setup = workerFixture();
      if (level === "system") {
        vi.mocked(configModule.loadConfig).mockReturnValue({
          enterprise: { knowledge: { graph: { enabled: false } } },
        });
      } else {
        updateKnowledgeGraphSettings(
          setup.zone.id,
          { baseRevision: setup.zone.revision, enabled: false },
          setup.account.id,
          setup.options,
        );
      }
      await setup.addNote("Leave policy");
      await setup.run();
      await setup.run();
      expect(getLatestKnowledgeCandidate(setup.zone.id, setup.options)?.graphStatus).toBe("ready");
    },
  );

  it.each(["after", "before"] as const)(
    "supersedes an in-flight build with the replacement completed %s the old worker exits",
    async (replacementOrder) => {
      const setup = workerFixture();
      await setup.addNote("First policy", "First policy grants twelve days of leave.");
      await setup.run();
      const firstJob = listKnowledgeJobs(setup.zone.id, setup.options).find(
        (job) => job.kind === "zone_build",
      )!;
      const entered = createDeferredCore();
      const release = createDeferredCore();
      const closing = createDeferredCore();
      const releaseClose = createDeferredCore();
      setup.createEmbedding.mockImplementationOnce(async () => {
        entered.resolve();
        await release.promise;
        return {
          ...setup.embedding,
          close: async () => {
            if (replacementOrder === "before") {
              closing.resolve();
              await releaseClose.promise;
            }
          },
        };
      });
      const firstRun = setup.run();
      try {
        await Promise.race([
          entered.promise,
          firstRun.then(() => {
            throw new Error("Worker exited before the embedding boundary");
          }),
        ]);
        await setup.addNote("Second policy", "Second policy sets the lunch budget to 75 units.");
        release.resolve();
        if (replacementOrder === "before") {
          await Promise.race([
            closing.promise,
            firstRun.then(() => {
              throw new Error("Worker exited before closing its embedding runtime");
            }),
          ]);
        } else {
          await firstRun;
        }
        await setup.run(); // Ingest the second note; coalesce the latest build revision.
        await setup.run(); // Build the current two-note candidate with the real indexer.
      } finally {
        release.resolve();
        releaseClose.resolve();
        await firstRun;
      }

      const jobs = listKnowledgeJobs(setup.zone.id, setup.options);
      expect(jobs.find((job) => job.id === firstJob.id)).toMatchObject({
        status: "cancelled",
        safeErrorCode: "SUPERSEDED_BUILD_REVISION",
        claimToken: null,
        claimOwner: null,
      });
      expect(jobs.filter((job) => job.kind === "zone_build")).toHaveLength(2);
      expect(jobs.filter((job) => job.status === "failed")).toHaveLength(0);
      expect(listKnowledgeJobSteps(firstJob.id, setup.zone.id, setup.options)).toEqual(
        expect.arrayContaining([expect.objectContaining({ status: "superseded" })]),
      );
      expect(
        listKnowledgeJobSteps(firstJob.id, setup.zone.id, setup.options).some(
          (step) => step.status === "failed",
        ),
      ).toBe(false);
      const terminalEvents = listEnterpriseKnowledgeChanges(
        { afterSequence: 0, zoneId: setup.zone.id, limit: 500 },
        setup.options,
      ).filter(
        (event) =>
          event.entityType === "job" &&
          event.entityId === firstJob.id &&
          event.operation === "completed",
      );
      expect(terminalEvents).toEqual([expect.objectContaining({ status: "superseded" })]);
      expect(
        listEnterpriseAuditEvents(100, setup.options).some((event) => event.outcome === "failure"),
      ).toBe(false);
      const generations = openOpenClawStateDatabase(setup.options)
        .db.prepare(
          "SELECT status, integrity_status FROM enterprise_knowledge_index_generations WHERE zone_id = ?",
        )
        .all(setup.zone.id);
      expect(generations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "retired", integrity_status: "unknown" }),
          expect.objectContaining({ status: "candidate", integrity_status: "valid" }),
        ]),
      );
      const currentZone = getKnowledgeZone(setup.zone.id, setup.options)!;
      const candidate = getLatestKnowledgeCandidate(setup.zone.id, setup.options)!;
      expect(candidate).toMatchObject({
        sourceSetRevision: currentZone.sourceSetRevision,
        buildRevision: currentZone.buildRevision,
        integrityStatus: "valid",
      });
      publishKnowledgeCandidate(
        {
          zoneId: setup.zone.id,
          baseRevision: currentZone.revision,
          generationId: candidate.id,
          degradedReason: "This test deliberately uses lexical indexing only.",
          actorAccountId: setup.account.id,
        },
        setup.options,
      );
      expect(listKnowledgePublications(setup.zone.id, setup.options)[0]?.sourceCount).toBe(2);
      const doctor = await doctorEnterpriseKnowledge({
        databaseOptions: setup.options,
        env: setup.env,
      });
      expect(doctor.jobs.failed24h).toBe(0);
      expect(doctor.jobs.failureRate24h).toBe(0);
      expect(await setup.run()).toBe(0);
    },
  );

  it("supersedes a queued build whose revision changed before it began", async () => {
    const setup = workerFixture();
    await setup.addNote("First policy");
    await setup.run();
    const firstJob = listKnowledgeJobs(setup.zone.id, setup.options).find(
      (job) => job.kind === "zone_build",
    )!;
    await setup.addNote("Second policy");
    await setup.run();
    expect(
      listKnowledgeJobs(setup.zone.id, setup.options).find((job) => job.id === firstJob.id),
    ).toMatchObject({
      status: "cancelled",
      safeErrorCode: "SUPERSEDED_BUILD_REVISION",
    });
    await setup.run();
    await setup.run();
    expect(getLatestKnowledgeCandidate(setup.zone.id, setup.options)?.buildRevision).toBe(
      getKnowledgeZone(setup.zone.id, setup.options)?.buildRevision,
    );
    expect(await setup.run()).toBe(0);
  });

  it.each(["parser", "provider"] as const)("preserves genuine %s failures", async (kind) => {
    const setup = workerFixture();
    await setup.addNote("Policy", kind === "parser" ? "   " : "Policy content");
    await setup.run();
    if (kind === "provider") {
      setup.createEmbedding.mockRejectedValueOnce(
        new EnterpriseKnowledgeError("PROVIDER_AUTH_FAILED", 401, "Provider authorization failed."),
      );
      await setup.run();
    }
    expect(listKnowledgeJobs(setup.zone.id, setup.options)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          safeErrorCode: kind === "parser" ? "EXTRACTION_EMPTY" : "PROVIDER_AUTH_FAILED",
        }),
      ]),
    );
    expect(getLatestKnowledgeCandidate(setup.zone.id, setup.options)).toBeUndefined();
  });

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
