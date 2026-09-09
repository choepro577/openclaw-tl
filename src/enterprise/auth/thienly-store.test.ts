import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
} from "../../state/openclaw-state-db.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountByUsername,
} from "../accounts/account-store.js";
import {
  bindThienLyIdentity,
  createThienLyAttempt,
  findThienLyAttemptByState,
  getThienLyAttempt,
  getThienLyBinding,
  getThienLyBindingForAccount,
  presentThienLyAttempt,
  updateThienLyAttempt,
  type ThienLyIdentity,
} from "./thienly-store.js";

const directories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-thienly-store-"));
  directories.push(directory);
  return { path: join(directory, "state.sqlite") };
}

function identity(subject = "comnieu:7:42"): ThienLyIdentity {
  return {
    subject,
    company_id: 7,
    user_id: 42,
    staff_code: "TL001",
    display_name: "Nguyễn Văn An",
  };
}

function attemptInput(suffix: string) {
  return {
    browserHash: `browser-${suffix}`,
    stateHash: `state-${suffix}`,
    verifier: `verifier-${suffix}`,
    configFingerprint: `config-${suffix}`,
  };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Thiên Lý durable auth store", () => {
  it("persists across a database reopen and strips private fields from its public projection", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "thienly.employee",
        displayName: "Thiên Lý Employee",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const created = createThienLyAttempt(attemptInput("persist"), options);
    const stored = updateThienLyAttempt(
      created.id,
      ["waiting"],
      {
        phase: "verifying",
        identity: identity(),
        accountId: account.id,
        sessionId: "session-secret-id",
        sessionExpiresAt: Date.now() + 60_000,
        account: { username: account.username, displayName: account.displayName },
      },
      options,
    );

    const presented = presentThienLyAttempt(stored);
    expect(presented).toEqual({
      id: created.id,
      phase: "verifying",
      events: [
        { sequence: 1, phase: "waiting", at: created.events[0]!.at },
        { sequence: 2, phase: "verifying", at: stored.events[1]!.at },
      ],
      expiresAt: created.expiresAt,
      account: { username: account.username, displayName: account.displayName },
    });
    expect(presented).not.toHaveProperty("browserHash");
    expect(presented).not.toHaveProperty("stateHash");
    expect(presented).not.toHaveProperty("verifier");
    expect(presented).not.toHaveProperty("identity");
    expect(presented).not.toHaveProperty("accountId");
    expect(presented).not.toHaveProperty("sessionId");
    expect(JSON.stringify(presented)).not.toContain("verifier-persist");

    closeOpenClawStateDatabaseForTest();
    const reopened = getThienLyAttempt(created.id, options);
    expect(reopened).toMatchObject({
      id: created.id,
      phase: "verifying",
      browserHash: "browser-persist",
      stateHash: "state-persist",
      verifier: "verifier-persist",
      identity: identity(),
      accountId: account.id,
      sessionId: "session-secret-id",
      linkFailures: 0,
      configFingerprint: "config-persist",
    });
    expect(findThienLyAttemptByState("state-persist", options)?.id).toBe(created.id);
  });

  it("rolls back account and binding together, then recreates the lazy schema after rollback", () => {
    const options = stateOptions();
    expect(() =>
      runOpenClawStateWriteTransaction((database) => {
        const account = createEnterpriseAccount(
          {
            username: "rollback.thienly",
            displayName: "Rollback Thiên Lý",
            passwordHash: "test-only",
            role: "employee",
          },
          { database },
        );
        bindThienLyIdentity(identity("comnieu:7:99"), account.id, account.username, {
          database,
        });
        throw new Error("rollback-test");
      }, options),
    ).toThrow("rollback-test");

    closeOpenClawStateDatabaseForTest();
    expect(getEnterpriseAccountByUsername("rollback.thienly", options)).toBeUndefined();
    expect(getThienLyBinding("comnieu:7:99", options)).toBeUndefined();
    expect(createThienLyAttempt(attemptInput("after-rollback"), options)).toBeDefined();
  });

  it("rejects updates after expiry and records one durable expired phase", () => {
    const options = stateOptions();
    const created = createThienLyAttempt(attemptInput("expiry"), options);
    openOpenClawStateDatabase(options)
      .db.prepare("UPDATE enterprise_thienly_attempts SET expires_at = ? WHERE id = ?")
      .run(Date.now() - 1, created.id);

    expect(() =>
      updateThienLyAttempt(created.id, ["waiting"], { phase: "verifying" }, options),
    ).toThrow("THIENLY_ATTEMPT_STATE");
    const expired = getThienLyAttempt(created.id, options)!;
    expect(expired.phase).toBe("expired");
    expect(expired.events).toEqual([
      created.events[0],
      { sequence: 2, phase: "expired", at: expect.any(Number) },
    ]);
    expect(expired.error?.code).toBe("THIENLY_ATTEMPT_EXPIRED");
    expect(() =>
      updateThienLyAttempt(created.id, ["expired"], { phase: "waiting" }, options),
    ).toThrow("THIENLY_ATTEMPT_STATE");
  });

  it("makes identity bindings idempotent and rejects subject or account conflicts", () => {
    const options = stateOptions();
    const first = createEnterpriseAccount(
      {
        username: "binding.first",
        displayName: "Binding First",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const second = createEnterpriseAccount(
      {
        username: "binding.second",
        displayName: "Binding Second",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const firstIdentity = identity("comnieu:7:100");
    const binding = bindThienLyIdentity(firstIdentity, first.id, first.username, options);
    expect(bindThienLyIdentity(firstIdentity, first.id, first.username, options)).toEqual(binding);
    expect(getThienLyBinding(firstIdentity.subject, options)).toEqual(binding);
    expect(getThienLyBindingForAccount(first.id, options)).toEqual(binding);
    expect(() => bindThienLyIdentity(firstIdentity, second.id, second.username, options)).toThrow(
      "THIENLY_IDENTITY_CONFLICT",
    );
    expect(() =>
      bindThienLyIdentity(identity("comnieu:7:101"), first.id, first.username, options),
    ).toThrow("THIENLY_IDENTITY_CONFLICT");
  });

  it("limits active attempts per browser and deletes only a bounded stale batch", () => {
    const options = stateOptions();
    const first = createThienLyAttempt(attemptInput("cap-1"), options);
    const db = openOpenClawStateDatabase(options).db;
    const oldExpiresAt = Date.now() - 24 * 60 * 60 * 1_000 - 1;
    const insertOld = db.prepare(
      `INSERT INTO enterprise_thienly_attempts
       (id, browser_hash, state_hash, verifier, phase, events_json, expires_at,
        link_failures, config_fingerprint, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'failed', ?, ?, 0, ?, ?, ?)`,
    );
    for (let index = 0; index < 201; index += 1) {
      insertOld.run(
        `old-${index}`,
        first.browserHash,
        `old-state-${index}`,
        "old-verifier",
        '[{"sequence":1,"phase":"failed","at":1}]',
        oldExpiresAt,
        "old-config",
        1,
        1,
      );
    }

    createThienLyAttempt({ ...attemptInput("cap-2"), browserHash: first.browserHash }, options);
    const retainedOld = db
      .prepare(
        "SELECT COUNT(*) AS count FROM enterprise_thienly_attempts WHERE browser_hash = ? AND id LIKE 'old-%'",
      )
      .get(first.browserHash) as { count: number };
    expect(retainedOld.count).toBe(1);

    for (let index = 3; index <= 5; index += 1) {
      createThienLyAttempt(
        { ...attemptInput(`cap-${index}`), browserHash: first.browserHash },
        options,
      );
    }
    expect(() =>
      createThienLyAttempt({ ...attemptInput("cap-6"), browserHash: first.browserHash }, options),
    ).toThrow("THIENLY_RATE_LIMITED");
  });
});
