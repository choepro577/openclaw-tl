import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import { createEnterpriseSession } from "../auth/session-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { putNormalizedKnowledgeArtifact } from "./artifact-store.js";
import { createEnterpriseKnowledgeAuthority } from "./authority.js";
import { buildKnowledgeGenerationIndex } from "./index-store.js";
import {
  completeKnowledgeSourceVersion,
  createKnowledgeGeneration,
  createKnowledgeSourceWithVersion,
  createKnowledgeZone,
  finishKnowledgeGeneration,
  getKnowledgeZone,
  publishKnowledgeCandidate,
  replaceKnowledgeAgentBindings,
} from "./knowledge-store.js";
import type { NormalizedKnowledgeArtifact } from "./knowledge-types.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-authority-"));
  directories.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
  const account = createEnterpriseAccount(
    {
      username: "knowledge.reader",
      displayName: "Knowledge Reader",
      passwordHash: "test-only",
      role: "employee",
      mustChangePassword: false,
    },
    options,
  );
  const agentResourceKey = "agent:shared:main";
  replaceEnterpriseEntitlements(
    account.id,
    [{ resourceType: "agent", resourceId: agentResourceKey, effect: "allow" }],
    options,
  );
  const session = createEnterpriseSession(account.id, options, "user");
  let zone = createKnowledgeZone({ slug: "hr-policy", name: "Nhân sự" }, account.id, options);
  zone = replaceKnowledgeAgentBindings(
    zone.id,
    [agentResourceKey],
    zone.revision,
    account.id,
    options,
  );
  const created = createKnowledgeSourceWithVersion(
    {
      zoneId: zone.id,
      kind: "note",
      title: "Chính sách nghỉ phép",
      mimeType: "text/markdown",
      contentHash: "a".repeat(64),
      blobHash: "a".repeat(64),
      byteSize: 64,
    },
    account.id,
    options,
  );
  const artifact: NormalizedKnowledgeArtifact = {
    schemaVersion: 1,
    sourceId: created.source.id,
    sourceVersionId: created.version.id,
    sourceVersion: 1,
    title: created.source.title,
    mimeType: "text/markdown",
    createdAt: Date.now(),
    parserProvenance: { parser: "test" },
    segments: [
      {
        id: "segment-leave-policy",
        text: "Nhân viên có mười hai ngày phép mỗi năm.",
        normalizedText: "Nhân viên có mười hai ngày phép mỗi năm.",
        locator: { kind: "text", section: "Điều 4" },
        ordinal: 0,
      },
    ],
  };
  const stored = await putNormalizedKnowledgeArtifact(artifact, env);
  completeKnowledgeSourceVersion(
    {
      versionId: created.version.id,
      pipelineGeneration: created.version.pipelineGeneration,
      processingStatus: "ready",
      normalizedArtifactHash: stored.hash,
      segmentCount: 1,
      vectorStatus: "unavailable",
      parserProvenance: artifact.parserProvenance,
    },
    options,
  );
  const current = getKnowledgeZone(zone.id, options)!;
  const generation = createKnowledgeGeneration(
    zone.id,
    current.sourceSetRevision,
    current.buildRevision,
    options,
  );
  const built = await buildKnowledgeGenerationIndex({
    zoneId: zone.id,
    generationId: generation.id,
    sourceSetRevision: current.sourceSetRevision,
    buildRevision: current.buildRevision,
    artifacts: [artifact],
    env,
  });
  finishKnowledgeGeneration(
    generation.id,
    { lexicalStatus: "ready", vectorStatus: "unavailable", artifactChecksum: built.checksum },
    options,
  );
  const publication = publishKnowledgeCandidate(
    {
      zoneId: zone.id,
      baseRevision: current.revision,
      generationId: generation.id,
      degradedReason: "Test fixture uses FTS only.",
      actorAccountId: account.id,
    },
    options,
  );
  const authority = createEnterpriseKnowledgeAuthority({
    accountId: account.id,
    sessionId: session.sessionId,
    agentResourceKey,
    databaseOptions: options,
    env,
  });
  return { authority, account, agentResourceKey, options, zoneId: zone.id, publication };
}

describe("Enterprise Knowledge Agent authority", () => {
  it("requires exact evidence after search and rejects get immediately after unbind", async () => {
    const setup = await fixture();
    const result = await setup.authority.search({ query: "ngày phép" });
    expect(result.hits).toHaveLength(1);
    expect(setup.authority.evaluateGrounding("Mỗi năm có 12 ngày phép.")).toMatchObject({
      action: "revise",
    });

    const evidenceAuthority = createEnterpriseKnowledgeAuthority({
      accountId: setup.account.id,
      sessionId: setup.authority.sessionId,
      agentResourceKey: setup.agentResourceKey,
      databaseOptions: setup.options,
      env: { ...process.env, OPENCLAW_STATE_DIR: directories[0]! },
    });
    const evidenceSearch = await evidenceAuthority.search({ query: "ngày phép" });
    const evidence = await evidenceAuthority.get(evidenceSearch.hits[0]!.citationId);
    expect(evidence.evidence).toContain("mười hai ngày");
    expect(evidenceAuthority.evaluateGrounding("Mỗi năm có mười hai ngày phép.")).toEqual({
      action: "accept",
    });

    const current = getKnowledgeZone(setup.zoneId, setup.options)!;
    replaceKnowledgeAgentBindings(
      setup.zoneId,
      [],
      current.revision,
      setup.account.id,
      setup.options,
    );
    await expect(evidenceAuthority.get(evidenceSearch.hits[0]!.citationId)).rejects.toMatchObject({
      code: "CITATION_NOT_AUTHORIZED",
    });
    const audit = listEnterpriseAuditEvents(20, setup.options).filter((event) =>
      event.action.startsWith("knowledge.agent."),
    );
    expect(audit.map((event) => `${event.action}:${event.outcome}`)).toEqual(
      expect.arrayContaining([
        "knowledge.agent.search:success",
        "knowledge.agent.get:success",
        "knowledge.agent.get:failure",
      ]),
    );
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain("ngày phép");
    expect(serializedAudit).not.toContain("mười hai ngày");
    expect(serializedAudit).not.toContain(evidenceSearch.hits[0]!.citationId);
  });
});
