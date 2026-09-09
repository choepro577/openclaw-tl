import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
} from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import { subscribeKnowledgeAccessChanges } from "./knowledge-access-changes.js";
import {
  createKnowledgeGeneration,
  createKnowledgeZone,
  finishKnowledgeGeneration,
  getKnowledgeZone,
  listKnowledgeAgentBindings,
  listKnowledgeEvidenceTransferGrants,
  listPublishedZonesForAgent,
  publishKnowledgeCandidate,
  replaceKnowledgeEvidenceTransferGrants,
  replaceKnowledgeAgentBindings,
  replaceKnowledgeZoneMemberships,
  resolveKnowledgeEvidenceTransferGrant,
  setKnowledgeZoneArchived,
  rollbackKnowledgePublication,
  updateKnowledgeZone,
} from "./knowledge-store.js";

const directories: string[] = [];
const targetAgentResourceKey = "agent:shared:contracts";
const config: OpenClawConfig = {
  agents: {
    entries: {
      contracts: {
        description: "Review contracts, obligations and contractual risks for employees.",
        delegationTarget: {
          status: "active",
          handlingMode: "auto_when_certain",
          aliases: [],
          useWhen: ["Review contract obligations", "Assess liability and penalty clauses"],
          avoidWhen: [],
          requiredInputs: [],
        },
      },
    },
  },
};

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "knowledge-evidence-transfer-"));
  directories.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const admin = createEnterpriseAccount(
    {
      username: "transfer.admin",
      displayName: "Admin",
      role: "administrator",
      passwordHash: "test-only",
      mustChangePassword: false,
    },
    options,
  );
  const zone = createKnowledgeZone(
    { slug: "company-contracts", name: "Contracts" },
    admin.id,
    options,
  );
  return { options, admin, zone };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Knowledge evidence-transfer grants", () => {
  it("notifies all committed access changes synchronously after the state transaction completes", () => {
    const { options, admin, zone } = fixture();
    const database = openOpenClawStateDatabase(options);
    const events: Array<{ zoneId: string; inTransaction: boolean }> = [];
    const unsubscribe = subscribeKnowledgeAccessChanges((zoneId) =>
      events.push({ zoneId, inTransaction: database.db.isTransaction }),
    );
    try {
      let current = replaceKnowledgeAgentBindings(
        zone.id,
        ["agent:shared:main"],
        zone.revision,
        admin.id,
        options,
      );
      current = replaceKnowledgeZoneMemberships(
        zone.id,
        [{ accountId: admin.id, role: "manager" }],
        current.revision,
        admin.id,
        true,
        options,
      );
      current = updateKnowledgeZone(
        zone.id,
        { baseRevision: current.revision, egressPolicy: "external_allowed" },
        admin.id,
        options,
      );
      current = setKnowledgeZoneArchived(zone.id, true, current.revision, admin.id, options);
      current = setKnowledgeZoneArchived(zone.id, false, current.revision, admin.id, options);
      const generation = createKnowledgeGeneration(
        zone.id,
        current.sourceSetRevision,
        current.buildRevision,
        options,
      );
      finishKnowledgeGeneration(
        generation.id,
        { lexicalStatus: "ready", vectorStatus: "ready" },
        options,
      );
      const publication = publishKnowledgeCandidate(
        {
          zoneId: zone.id,
          generationId: generation.id,
          baseRevision: current.revision,
          actorAccountId: admin.id,
        },
        options,
      );
      current = getKnowledgeZone(zone.id, options)!;
      current = rollbackKnowledgePublication(
        {
          zoneId: zone.id,
          publicationId: publication.publicationId,
          baseRevision: current.revision,
          actorAccountId: admin.id,
        },
        options,
      );
      current = replaceKnowledgeEvidenceTransferGrants(
        {
          zoneId: zone.id,
          targetAgentResourceKeys: [targetAgentResourceKey],
          baseRevision: current.revision,
          actorAccountId: admin.id,
          config,
        },
        options,
      );
      replaceKnowledgeEvidenceTransferGrants(
        {
          zoneId: zone.id,
          targetAgentResourceKeys: [],
          baseRevision: current.revision,
          actorAccountId: admin.id,
          config,
        },
        options,
      );
      expect(events).toEqual(
        Array.from({ length: 9 }, () => ({ zoneId: zone.id, inTransaction: false })),
      );
      expect(() =>
        replaceKnowledgeAgentBindings(zone.id, [], zone.revision, admin.id, options),
      ).toThrow("resource changed");
      expect(events).toHaveLength(9);
      unsubscribe();
      current = getKnowledgeZone(zone.id, options)!;
      replaceKnowledgeAgentBindings(zone.id, [], current.revision, admin.id, options);
      expect(events).toHaveLength(9);
    } finally {
      unsubscribe();
    }
  });

  it("does not publish invalidation for an outer rollback and discards only a rolled-back savepoint's callbacks", () => {
    const { options, admin, zone } = fixture();
    const events: string[] = [];
    const unsubscribe = subscribeKnowledgeAccessChanges((zoneId) => events.push(zoneId));
    const grant = (baseRevision: number) =>
      replaceKnowledgeEvidenceTransferGrants(
        {
          zoneId: zone.id,
          targetAgentResourceKeys: [targetAgentResourceKey],
          baseRevision,
          actorAccountId: admin.id,
          config,
        },
        options,
      );
    try {
      expect(() =>
        runOpenClawStateWriteTransaction(() => {
          grant(zone.revision);
          expect(events).toEqual([]);
          throw new Error("outer rollback");
        }, options),
      ).toThrow("outer rollback");
      expect(events).toEqual([]);
      expect(listKnowledgeEvidenceTransferGrants(zone.id, options)).toEqual([]);
      expect(getKnowledgeZone(zone.id, options)?.revision).toBe(zone.revision);

      runOpenClawStateWriteTransaction(() => {
        const bound = replaceKnowledgeAgentBindings(
          zone.id,
          ["agent:shared:main"],
          zone.revision,
          admin.id,
          options,
        );
        expect(() =>
          runOpenClawStateWriteTransaction(() => {
            grant(bound.revision);
            throw new Error("savepoint rollback");
          }, options),
        ).toThrow("savepoint rollback");
        expect(events).toEqual([]);
      }, options);
      expect(events).toEqual([zone.id]);
      expect(listKnowledgeEvidenceTransferGrants(zone.id, options)).toEqual([]);
      expect(listKnowledgeAgentBindings(zone.id, options)).toEqual(["agent:shared:main"]);
    } finally {
      unsubscribe();
    }
  });

  it("preconfigures draft grants, only resolves current published evidence, and revokes without direct bindings", () => {
    const { options, admin, zone } = fixture();
    const receive = { zoneId: zone.id, targetAgentResourceKey };
    expect(resolveKnowledgeEvidenceTransferGrant(receive, options)).toBeUndefined();
    const granted = replaceKnowledgeEvidenceTransferGrants(
      {
        zoneId: zone.id,
        targetAgentResourceKeys: [targetAgentResourceKey],
        baseRevision: zone.revision,
        actorAccountId: admin.id,
        config,
      },
      options,
    );
    expect(listKnowledgeEvidenceTransferGrants(zone.id, options)).toEqual([targetAgentResourceKey]);
    expect(resolveKnowledgeEvidenceTransferGrant(receive, options)).toBeUndefined();
    expect(listKnowledgeAgentBindings(zone.id, options)).toEqual([]);
    const generation = createKnowledgeGeneration(
      zone.id,
      zone.sourceSetRevision,
      zone.buildRevision,
      options,
    );
    finishKnowledgeGeneration(
      generation.id,
      { lexicalStatus: "ready", vectorStatus: "ready" },
      options,
    );
    const publication = publishKnowledgeCandidate(
      {
        zoneId: zone.id,
        generationId: generation.id,
        baseRevision: granted.revision,
        actorAccountId: admin.id,
      },
      options,
    );
    const published = getKnowledgeZone(zone.id, options)!;
    expect(resolveKnowledgeEvidenceTransferGrant(receive, options)).toEqual({
      zoneId: zone.id,
      accessRevision: published.accessRevision,
      activePublicationId: publication.publicationId,
      egressPolicy: "local_only",
    });
    expect(listPublishedZonesForAgent(targetAgentResourceKey, undefined, options)).toEqual([]);
    expect(
      resolveKnowledgeEvidenceTransferGrant(
        { ...receive, targetAgentResourceKey: "agent:shared:other" },
        options,
      ),
    ).toBeUndefined();
    const archived = setKnowledgeZoneArchived(zone.id, true, published.revision, admin.id, options);
    expect(resolveKnowledgeEvidenceTransferGrant(receive, options)).toBeUndefined();
    expect(listKnowledgeEvidenceTransferGrants(zone.id, options)).toEqual([targetAgentResourceKey]);
    const active = setKnowledgeZoneArchived(zone.id, false, archived.revision, admin.id, options);
    const revoked = replaceKnowledgeEvidenceTransferGrants(
      {
        zoneId: zone.id,
        targetAgentResourceKeys: [],
        baseRevision: active.revision,
        actorAccountId: admin.id,
        config,
      },
      options,
    );
    expect(revoked.accessRevision).toBe(active.accessRevision + 1);
    expect(resolveKnowledgeEvidenceTransferGrant(receive, options)).toBeUndefined();
    expect(listKnowledgeAgentBindings(zone.id, options)).toEqual([]);
    expect(
      listEnterpriseAuditEvents(100, options).filter(
        (event) => event.action === "knowledge.evidence_transfers.replace",
      ),
    ).toHaveLength(2);
  });

  it("rolls back grant and revision if the existing audit owner cannot persist the permission change", () => {
    const { options, admin, zone } = fixture();
    const { db } = openOpenClawStateDatabase(options);
    db.exec(`CREATE TRIGGER test_reject_transfer_audit BEFORE INSERT ON enterprise_audit_events
      WHEN NEW.action = 'knowledge.evidence_transfers.replace'
      BEGIN SELECT RAISE(ABORT, 'test audit unavailable'); END`);
    expect(() =>
      replaceKnowledgeEvidenceTransferGrants(
        {
          zoneId: zone.id,
          targetAgentResourceKeys: [targetAgentResourceKey],
          baseRevision: zone.revision,
          actorAccountId: admin.id,
          config,
        },
        options,
      ),
    ).toThrow("test audit unavailable");
    db.exec("DROP TRIGGER test_reject_transfer_audit");
    expect(getKnowledgeZone(zone.id, options)?.revision).toBe(zone.revision);
    expect(getKnowledgeZone(zone.id, options)?.accessRevision).toBe(zone.accessRevision);
    expect(listKnowledgeEvidenceTransferGrants(zone.id, options)).toEqual([]);
  });
});
