import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountById,
  listEnterpriseAccounts,
} from "../accounts/account-store.js";
import {
  applyEnterpriseAccessChanges,
  listEnterpriseEntitlements,
  markEnterpriseAgentEntitlementsOrphaned,
} from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  activateEnterpriseDelegation,
  appendEnterpriseDelegationEvent,
  listEnterpriseDelegationEvents,
  listEnterpriseDelegationOverrides,
  pruneEnterpriseDelegationEvents,
  readEnterpriseDelegationOverview,
  readEnterpriseDelegationPolicy,
  writeEnterpriseDelegationOverride,
  writeEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const tempDirectories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-delegation-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function policyInput(rollout: "off" | "shadow" | "on" = "shadow") {
  return {
    rollout,
    routerModel: rollout === "off" ? "" : "test/router-model",
    autoThreshold: 0.9,
    clarifyThreshold: 0.7,
    minimumMargin: 0.15,
    maxDelegatesPerTurn: 3,
    eventRetentionDays: 90,
  } as const;
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegation persistence", () => {
  it("rolls back account, profile, grants, and audit as one account-creation unit", () => {
    const options = stateOptions();
    expect(() =>
      createEnterpriseAccount(
        {
          username: "atomic.employee",
          displayName: "Atomic Employee",
          passwordHash: "test-hash",
          role: "employee",
          initialEntitlements: [
            {
              resourceType: "agent",
              resourceId: sharedAgentResourceKey("contracts"),
              effect: "allow",
            },
          ],
          audit: {
            actorAccountId: "missing-admin",
            actorSessionId: "missing-session",
            requestId: "atomic-account-request",
          },
        },
        options,
      ),
    ).toThrow();
    expect(listEnterpriseAccounts(options)).toEqual([]);
  });

  it("starts disabled and enforces policy CAS one revision at a time", () => {
    const options = stateOptions();
    expect(readEnterpriseDelegationPolicy(options)).toMatchObject({ rollout: "off", revision: 0 });

    const first = writeEnterpriseDelegationPolicy(0, policyInput(), options);
    expect(first).toMatchObject({ rollout: "shadow", revision: 1 });
    expect(() => writeEnterpriseDelegationPolicy(0, policyInput("on"), options)).toThrow(
      "DELEGATION_POLICY_REVISION_CONFLICT:1",
    );
    expect(readEnterpriseDelegationPolicy(options).revision).toBe(1);
  });

  it("rolls back a policy mutation when its atomic audit insert fails", () => {
    const options = stateOptions();
    expect(() =>
      writeEnterpriseDelegationPolicy(0, policyInput(), options, {
        actorAccountId: "missing-admin",
        actorSessionId: "missing-session",
        requestId: "test-request",
      }),
    ).toThrow();
    expect(readEnterpriseDelegationPolicy(options)).toMatchObject({ rollout: "off", revision: 0 });
  });

  it("keeps a restrictive override dormant across revoke and restores it on regrant", () => {
    const options = stateOptions();
    const resourceKey = sharedAgentResourceKey("contracts");
    const account = createEnterpriseAccount(
      {
        username: "delegate.employee",
        displayName: "Delegate Employee",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [{ resourceType: "agent", resourceId: resourceKey, effect: "allow" }],
      },
      options,
    );
    const written = writeEnterpriseDelegationOverride(
      {
        accountId: account.id,
        agentResourceKey: resourceKey,
        mode: "explicit_only",
        baseRevision: 0,
        baseAccountPolicyRevision: account.policyRevision,
      },
      options,
    );
    expect(written.override.revision).toBe(1);

    const afterOverride = getEnterpriseAccountById(account.id, options)!;
    const revoked = applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "agent",
          resourceId: resourceKey,
          effect: null,
        },
      ],
      { [account.id]: afterOverride.policyRevision },
      options,
    );
    expect(listEnterpriseDelegationOverrides(account.id, options)).toMatchObject([
      { mode: "explicit_only", revision: 1 },
    ]);

    applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "agent",
          resourceId: resourceKey,
          effect: "allow",
        },
      ],
      { [account.id]: revoked.policyRevisions[account.id]! },
      options,
    );
    expect(listEnterpriseDelegationOverrides(account.id, options)).toMatchObject([
      { mode: "explicit_only", revision: 1 },
    ]);
  });

  it("orphan-marks deleted Agent assignments and only reactivates them on an explicit regrant", () => {
    const options = stateOptions();
    const resourceKey = sharedAgentResourceKey("contracts");
    const account = createEnterpriseAccount(
      {
        username: "orphan.employee",
        displayName: "Orphan Employee",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [{ resourceType: "agent", resourceId: resourceKey, effect: "allow" }],
      },
      options,
    );

    expect(markEnterpriseAgentEntitlementsOrphaned(resourceKey, options)).toBe(1);
    expect(listEnterpriseEntitlements(account.id, options)).toMatchObject([
      { resourceId: resourceKey, resourceState: "orphaned", effect: "allow" },
    ]);
    const orphanRevision = getEnterpriseAccountById(account.id, options)!.policyRevision;
    expect(orphanRevision).toBe(account.policyRevision + 1);
    expect(markEnterpriseAgentEntitlementsOrphaned(resourceKey, options)).toBe(0);
    expect(getEnterpriseAccountById(account.id, options)!.policyRevision).toBe(orphanRevision);

    applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "agent",
          resourceId: resourceKey,
          effect: "allow",
        },
      ],
      { [account.id]: orphanRevision },
      options,
    );
    expect(listEnterpriseEntitlements(account.id, options)).toMatchObject([
      { resourceId: resourceKey, resourceState: "active", effect: "allow" },
    ]);
  });

  it("stores only hashes and compact metadata, then prunes expired events", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "event.employee",
        displayName: "Event Employee",
        passwordHash: "test-hash",
        role: "employee",
      },
      options,
    );
    const prompt = "Hãy kiểm tra hợp đồng tuyệt mật số 42";
    const stored = appendEnterpriseDelegationEvent(
      {
        accountId: account.id,
        personalAgentId: "personal-a",
        sharedAgentIds: ["contracts"],
        childRunIds: [],
        prompt,
        parentSessionKey: "private-session",
        parentRunId: "private-parent-run",
        decisionSource: "rule",
        outcome: "shadow",
        confidenceBand: "clear",
        reasonCode: "deterministic_match",
        policyRevision: 1,
        profileRevisions: { contracts: "profile-1" },
        confirmationState: "not_required",
        latencyMs: 12,
      },
      options,
    );
    expect(stored.promptHash).toHaveLength(64);
    expect(JSON.stringify(listEnterpriseDelegationEvents({}, options))).not.toContain(prompt);

    const db = openOpenClawStateDatabase(options).db;
    const persisted = JSON.stringify(
      db.prepare("SELECT * FROM enterprise_delegation_events WHERE id = ?").get(stored.id),
    );
    expect(persisted).not.toContain(prompt);
    expect(persisted).not.toContain("private-session");
    expect(persisted).not.toContain("private-parent-run");
    db.prepare("UPDATE enterprise_delegation_events SET created_at = ? WHERE id = ?").run(
      Date.now() - 91 * 86_400_000,
      stored.id,
    );
    expect(pruneEnterpriseDelegationEvents(90, options)).toBe(1);
    expect(listEnterpriseDelegationEvents({}, options).total).toBe(0);
  });

  it("counts delegation starts without inflating the metric with confirmation events", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "metric.employee",
        displayName: "Metric Employee",
        passwordHash: "test-hash",
        role: "employee",
      },
      options,
    );
    for (const reasonCode of ["delegate_started", "confirmation_approved"] as const) {
      appendEnterpriseDelegationEvent(
        {
          accountId: account.id,
          personalAgentId: "personal-a",
          sharedAgentIds: ["contracts"],
          childRunIds: reasonCode === "delegate_started" ? ["accepted-child"] : [],
          prompt: "hashed only",
          parentSessionKey: "private-session",
          parentRunId: "private-run",
          decisionSource: "rule",
          outcome: "delegated",
          confidenceBand: "clear",
          reasonCode,
          policyRevision: 1,
          profileRevisions: {},
          confirmationState: reasonCode === "confirmation_approved" ? "approved" : "not_required",
          latencyMs: 5,
        },
        options,
      );
    }
    expect(readEnterpriseDelegationOverview(options)).toMatchObject({
      totalEvents: 2,
      delegated: 1,
    });
  });

  it("filters event ranges, reason codes, and literal Unicode Agent IDs safely", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "filter.employee",
        displayName: "Filter Employee",
        passwordHash: "test-hash",
        role: "employee",
      },
      options,
    );
    const event = appendEnterpriseDelegationEvent(
      {
        accountId: account.id,
        personalAgentId: "personal-filter",
        sharedAgentIds: ["contracts%_漢"],
        childRunIds: [],
        prompt: "hashed filter prompt",
        decisionSource: "rule",
        outcome: "blocked",
        confidenceBand: "ambiguous",
        reasonCode: "permission_changed",
        policyRevision: 1,
        profileRevisions: {},
        confirmationState: "denied",
        latencyMs: 7,
      },
      options,
    );
    expect(
      listEnterpriseDelegationEvents(
        {
          agentId: "contracts%_漢",
          reasonCode: "permission_changed",
          createdFrom: event.createdAt,
          createdTo: event.createdAt,
        },
        options,
      ).total,
    ).toBe(1);
    expect(listEnterpriseDelegationEvents({ agentId: "contracts%" }, options).total).toBe(0);
  });

  it("counts unique accepted children across partial failures without counting completion twice", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "partial.metric",
        displayName: "Partial metric",
        passwordHash: "test",
        role: "employee",
      },
      options,
    );
    for (const entry of [
      { reasonCode: "delegate_started", outcome: "delegated" as const, childRunIds: ["child-one"] },
      {
        reasonCode: "delegate_partial_failure",
        outcome: "failed" as const,
        childRunIds: ["child-two", "child-three"],
      },
      {
        reasonCode: "delegate_completed",
        outcome: "delegated" as const,
        childRunIds: ["child-one"],
      },
      { reasonCode: "confirmation_approved", outcome: "delegated" as const, childRunIds: [] },
      { reasonCode: "delegate_spawn_failed", outcome: "failed" as const, childRunIds: [] },
    ]) {
      appendEnterpriseDelegationEvent(
        {
          accountId: account.id,
          personalAgentId: "personal-a",
          sharedAgentIds: ["contracts"],
          prompt: "private prompt",
          parentSessionKey: "session",
          parentRunId: "run",
          decisionSource: "ai",
          confidenceBand: "clear",
          policyRevision: 1,
          profileRevisions: {},
          confirmationState: "approved",
          latencyMs: 1,
          ...entry,
        },
        options,
      );
    }
    expect(readEnterpriseDelegationOverview(options)).toMatchObject({
      totalEvents: 5,
      delegated: 3,
      failed: 2,
    });
    expect(
      readEnterpriseDelegationOverview(options, { reasonCode: "delegate_partial_failure" }),
    ).toMatchObject({ totalEvents: 1, delegated: 2, failed: 1 });
  });

  it("activates policy and exclusions atomically from the preview revisions", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "pilot.employee",
        displayName: "Pilot Employee",
        passwordHash: "test-hash",
        role: "employee",
      },
      options,
    );
    const admin = createEnterpriseAccount(
      {
        username: "delegation.admin",
        displayName: "Delegation Admin",
        passwordHash: "test-hash",
        role: "administrator",
      },
      options,
    );
    const policy = writeEnterpriseDelegationPolicy(0, policyInput(), options);
    const next = activateEnterpriseDelegation(
      {
        baseRevision: policy.revision,
        expectedAccountRevisions: { [account.id]: account.policyRevision },
        exclusions: [
          { accountId: account.id, agentResourceKey: sharedAgentResourceKey("contracts") },
        ],
        audit: {
          actorAccountId: admin.id,
          actorSessionId: "admin-session",
          requestId: "activation-request",
          previewId: "preview-1",
        },
      },
      options,
    );
    expect(next).toMatchObject({ rollout: "on", revision: 2 });
    expect(listEnterpriseDelegationOverrides(account.id, options)).toMatchObject([
      { mode: "disabled", revision: 1 },
    ]);
  });
});
