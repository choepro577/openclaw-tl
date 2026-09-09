import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import { createEnterpriseSession } from "../auth/session-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { personalAgentResourceKey } from "../entitlements/resource-keys.js";
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
  replaceKnowledgeEvidenceTransferGrants,
} from "./knowledge-store.js";
import type { NormalizedKnowledgeArtifact } from "./knowledge-types.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function fixture(
  kind: "shared" | "personal" = "shared",
  egressPolicy: "local_only" | "external_allowed" = "local_only",
  evidenceText = "Nhân viên có mười hai ngày phép mỗi năm.",
) {
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
  const agentResourceKey =
    kind === "personal" ? personalAgentResourceKey(account.id) : "agent:shared:main";
  if (kind === "shared") {
    replaceEnterpriseEntitlements(
      account.id,
      [{ resourceType: "agent", resourceId: agentResourceKey, effect: "allow" }],
      options,
    );
  }
  const session = createEnterpriseSession(account.id, options, "user");
  let zone = createKnowledgeZone(
    { slug: "hr-policy", name: "Nhân sự", egressPolicy },
    account.id,
    options,
  );
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
        text: evidenceText,
        normalizedText: evidenceText,
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
  return { authority, account, agentResourceKey, options, zoneId: zone.id, publication, env };
}

const transferConfig: OpenClawConfig = {
  agents: {
    entries: {
      finance: {
        description: "Review employee budgets and financial policy calculations.",
        delegationTarget: {
          status: "active",
          handlingMode: "confirm_before_handoff",
          aliases: [],
          useWhen: ["Review cash budgets", "Calculate financial policy allowances"],
          avoidWhen: [],
          requiredInputs: [],
        },
      },
    },
  },
};
const transferTarget = "agent:shared:finance";

async function transferFixture(
  egressPolicy: "local_only" | "external_allowed" = "external_allowed",
  evidenceText?: string,
) {
  const setup = await fixture("personal", egressPolicy, evidenceText);
  replaceKnowledgeEvidenceTransferGrants(
    {
      zoneId: setup.zoneId,
      targetAgentResourceKeys: [transferTarget],
      baseRevision: getKnowledgeZone(setup.zoneId, setup.options)!.revision,
      actorAccountId: setup.account.id,
      config: transferConfig,
    },
    setup.options,
  );
  const authority = createEnterpriseKnowledgeAuthority({
    accountId: setup.account.id,
    sessionId: setup.authority.sessionId,
    agentResourceKey: setup.agentResourceKey,
    config: transferConfig,
    databaseOptions: setup.options,
    env: setup.env,
  });
  const search = await authority.search({ query: "ngày phép" });
  const citationId = search.hits[0]!.citationId;
  const selection = {
    citationId,
    quote: evidenceText ?? "Nhân viên có mười hai ngày phép mỗi năm.",
  };
  return { ...setup, authority, selection };
}

describe("Enterprise Knowledge request-bound evidence transfers", () => {
  it("requires a successful get on this exact authority, not a search or another request", async () => {
    const setup = await transferFixture();
    const input = {
      targetAgentResourceKey: transferTarget,
      assignmentId: "cash-analysis",
      selections: [setup.selection],
    };
    expect(() => setup.authority.createEvidenceTransfer(input)).toThrow("EVIDENCE_NOT_RETRIEVED");
    await setup.authority.get(setup.selection.citationId);
    const packet = setup.authority.createEvidenceTransfer(input);
    expect(() => packet.assertAssignment({ ...input, assignmentId: "another-assignment" })).toThrow(
      "EVIDENCE_ASSIGNMENT_MISMATCH",
    );
    expect(() =>
      packet.assertAssignment({ ...input, targetAgentResourceKey: "agent:shared:contracts" }),
    ).toThrow("EVIDENCE_ASSIGNMENT_MISMATCH");
    expect(packet.resolve({ transport: "remote" })).toContain(setup.selection.quote);
    const otherRequest = createEnterpriseKnowledgeAuthority({
      accountId: setup.account.id,
      sessionId: setup.authority.sessionId,
      agentResourceKey: setup.agentResourceKey,
      config: transferConfig,
      databaseOptions: setup.options,
      env: setup.env,
    });
    expect(() => otherRequest.createEvidenceTransfer(input)).toThrow("EVIDENCE_NOT_RETRIEVED");
    expect(JSON.stringify(packet)).not.toContain(setup.selection.quote);
    const audit = JSON.stringify(listEnterpriseAuditEvents(100, setup.options));
    expect(audit).not.toContain(setup.selection.citationId);
    expect(audit).not.toContain(setup.selection.quote);
    packet.close();
    expect(() => packet.resolve({ transport: "remote" })).toThrow("EVIDENCE_TRANSFER_CLOSED");
  });

  it("rejects altered quotes, invented citations, and more than four excerpts without truncation", async () => {
    const setup = await transferFixture();
    await setup.authority.get(setup.selection.citationId);
    const input = { targetAgentResourceKey: transferTarget, assignmentId: "cash-analysis" };
    expect(() =>
      setup.authority.createEvidenceTransfer({
        ...input,
        selections: [{ ...setup.selection, quote: "Hai mươi ngày phép." }],
      }),
    ).toThrow("EVIDENCE_QUOTE_MISMATCH");
    expect(() =>
      setup.authority.createEvidenceTransfer({
        ...input,
        selections: [{ ...setup.selection, citationId: "fabricated" }],
      }),
    ).toThrow("EVIDENCE_NOT_RETRIEVED");
    expect(() =>
      setup.authority.createEvidenceTransfer({
        ...input,
        selections: Array.from({ length: 5 }, () => setup.selection),
      }),
    ).toThrow("EVIDENCE_TRANSFER_LIMIT");
    const failures = listEnterpriseAuditEvents(100, setup.options).filter(
      (event) => event.action === "knowledge.evidence_transfer.rejected",
    );
    expect(failures).toHaveLength(3);
    expect(failures.every((event) => event.outcome === "failure")).toBe(true);
    const serialized = JSON.stringify(failures);
    expect(serialized).toContain("EVIDENCE_QUOTE_MISMATCH");
    expect(serialized).not.toContain(setup.selection.citationId);
    expect(serialized).not.toContain(setup.selection.quote);
    expect(serialized).not.toContain("Hai mươi ngày phép");
  });

  it("denies default transfer even though parent can get and specialist is configured", async () => {
    const setup = await fixture("personal", "external_allowed");
    const authority = createEnterpriseKnowledgeAuthority({
      accountId: setup.account.id,
      sessionId: setup.authority.sessionId,
      agentResourceKey: setup.agentResourceKey,
      config: transferConfig,
      databaseOptions: setup.options,
      env: setup.env,
    });
    const result = await authority.search({ query: "ngày phép" });
    const evidence = await authority.get(result.hits[0]!.citationId);
    expect(() =>
      authority.createEvidenceTransfer({
        targetAgentResourceKey: transferTarget,
        assignmentId: "cash-analysis",
        selections: [{ citationId: evidence.citation.citationId, quote: evidence.evidence }],
      }),
    ).toThrow("EVIDENCE_TRANSFER_NOT_AUTHORIZED");
  });

  it.each(["remote", "unknown"] as const)(
    "blocks local_only evidence at %s destination",
    async (transport) => {
      const setup = await transferFixture("local_only");
      await setup.authority.get(setup.selection.citationId);
      const packet = setup.authority.createEvidenceTransfer({
        targetAgentResourceKey: transferTarget,
        assignmentId: "cash-analysis",
        selections: [setup.selection],
      });
      expect(() => packet.resolve({ transport })).toThrow("EVIDENCE_EGRESS_DENIED");
      expect(packet.resolve({ transport: "local" })).toContain(setup.selection.quote);
    },
  );

  it("rejects overlong individual quotes and an over-budget complete envelope without dropping exceptions", async () => {
    const setup = await transferFixture("external_allowed", `Ngày phép: ${"a".repeat(1_600)}`);
    await setup.authority.get(setup.selection.citationId);
    const input = { targetAgentResourceKey: transferTarget, assignmentId: "cash-analysis" };
    expect(() =>
      setup.authority.createEvidenceTransfer({ ...input, selections: [setup.selection] }),
    ).toThrow("EVIDENCE_TRANSFER_LIMIT");
    const shorter = { ...setup.selection, quote: setup.selection.quote.slice(0, 1_000) };
    expect(() =>
      setup.authority.createEvidenceTransfer({
        ...input,
        selections: [shorter, shorter, shorter, shorter],
      }),
    ).toThrow("EVIDENCE_TRANSFER_LIMIT");
    expect(
      setup.authority
        .createEvidenceTransfer({ ...input, selections: [shorter] })
        .resolve({ transport: "remote" }),
    ).toContain(shorter.quote);
  });

  it("rejects a formerly active publication even if historical citations remain readable", async () => {
    const setup = await transferFixture();
    await setup.authority.get(setup.selection.citationId);
    const packet = setup.authority.createEvidenceTransfer({
      targetAgentResourceKey: transferTarget,
      assignmentId: "cash-analysis",
      selections: [setup.selection],
    });
    const current = getKnowledgeZone(setup.zoneId, setup.options)!;
    const next = createKnowledgeGeneration(
      setup.zoneId,
      current.sourceSetRevision,
      current.buildRevision,
      setup.options,
    );
    finishKnowledgeGeneration(
      next.id,
      { lexicalStatus: "ready", vectorStatus: "unavailable" },
      setup.options,
    );
    publishKnowledgeCandidate(
      {
        zoneId: setup.zoneId,
        generationId: next.id,
        baseRevision: current.revision,
        degradedReason: "Test fixture uses FTS only.",
        actorAccountId: setup.account.id,
      },
      setup.options,
    );
    expect(() => packet.resolve({ transport: "remote" })).toThrow("EVIDENCE_TRANSFER_STALE");
  });

  it.each(["grant", "parent_binding", "account"] as const)(
    "rechecks %s revocation after selection and before each model use",
    async (change) => {
      const setup = await transferFixture();
      await setup.authority.get(setup.selection.citationId);
      const packet = setup.authority.createEvidenceTransfer({
        targetAgentResourceKey: transferTarget,
        assignmentId: "cash-analysis",
        selections: [setup.selection],
      });
      expect(packet.resolve({ transport: "remote" })).toContain(setup.selection.quote);
      const current = getKnowledgeZone(setup.zoneId, setup.options)!;
      if (change === "grant")
        replaceKnowledgeEvidenceTransferGrants(
          {
            zoneId: setup.zoneId,
            targetAgentResourceKeys: [],
            baseRevision: current.revision,
            actorAccountId: setup.account.id,
            config: transferConfig,
          },
          setup.options,
        );
      else if (change === "parent_binding")
        replaceKnowledgeAgentBindings(
          setup.zoneId,
          [],
          current.revision,
          setup.account.id,
          setup.options,
        );
      else updateEnterpriseAccount(setup.account.id, { enabled: false }, setup.options);
      expect(() => packet.resolve({ transport: "remote" })).toThrow();
    },
  );
});

describe("Enterprise Knowledge Agent authority", () => {
  it.each(["personal_disabled", "explicit_deny", "account_disabled"] as const)(
    "serves the owner's published Personal knowledge without an allow grant, then rejects %s",
    async (revocation) => {
      const setup = await fixture("personal");
      expect(setup.authority.hasPublishedKnowledge()).toBe(true);
      const result = await setup.authority.search({ query: "ngày phép" });
      expect(result.hits).toHaveLength(1);
      const citationId = result.hits[0]!.citationId;
      await expect(setup.authority.get(citationId)).resolves.toMatchObject({
        evidence: "Nhân viên có mười hai ngày phép mỗi năm.",
        trust: "untrusted_enterprise_data",
      });

      if (revocation === "explicit_deny") {
        replaceEnterpriseEntitlements(
          setup.account.id,
          [{ resourceType: "agent", resourceId: setup.agentResourceKey, effect: "deny" }],
          setup.options,
        );
      } else {
        updateEnterpriseAccount(
          setup.account.id,
          revocation === "personal_disabled" ? { personalAgentEnabled: false } : { enabled: false },
          setup.options,
        );
      }
      expect(setup.authority.hasPublishedKnowledge()).toBe(false);
      const code = revocation === "account_disabled" ? "SESSION_REVOKED" : "AGENT_ACCESS_REVOKED";
      await expect(setup.authority.search({ query: "ngày phép" })).rejects.toMatchObject({ code });
      await expect(setup.authority.get(citationId)).rejects.toMatchObject({ code });
    },
  );

  it.each(["employee", "administrator"] as const)(
    "rejects a foreign Personal knowledge binding for %s even with an explicit allow",
    async (role) => {
      const setup = await fixture("personal");
      const result = await setup.authority.search({ query: "ngày phép" });
      const other = createEnterpriseAccount(
        {
          username: "other.reader",
          displayName: "Other reader",
          passwordHash: "test-only",
          role,
          personalAgentEnabled: true,
          mustChangePassword: false,
        },
        setup.options,
      );
      replaceEnterpriseEntitlements(
        other.id,
        [{ resourceType: "agent", resourceId: setup.agentResourceKey, effect: "allow" }],
        setup.options,
      );
      const session = createEnterpriseSession(other.id, setup.options, "user");
      const authority = createEnterpriseKnowledgeAuthority({
        accountId: other.id,
        sessionId: session.sessionId,
        agentResourceKey: setup.agentResourceKey,
        databaseOptions: setup.options,
        env: { ...process.env, OPENCLAW_STATE_DIR: directories[0]! },
      });
      expect(authority.hasPublishedKnowledge()).toBe(false);
      await expect(authority.search({ query: "ngày phép" })).rejects.toMatchObject({
        code: "AGENT_ACCESS_REVOKED",
      });
      await expect(authority.get(result.hits[0]!.citationId)).rejects.toMatchObject({
        code: "AGENT_ACCESS_REVOKED",
      });
    },
  );

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
