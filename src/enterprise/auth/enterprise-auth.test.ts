import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import {
  countEnterpriseAdministrators,
  createEnterpriseAccount,
  deleteEnterpriseAccountForBootstrapRollback,
  getEnterpriseAccountById,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import {
  applyEnterpriseAccessChanges,
  replaceEnterpriseEntitlements,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import {
  authenticateEnterpriseToken,
  loginEnterpriseAccount,
  resetEnterpriseAccountPassword,
} from "./auth-service.js";
import { hashEnterprisePassword, verifyEnterprisePassword } from "./password.js";
import {
  ENTERPRISE_SESSION_TOUCH_INTERVAL_MS,
  createEnterpriseSession,
  getActiveEnterpriseSession,
  revokeEnterpriseSession,
  touchEnterpriseSession,
} from "./session-store.js";

const tempDirectories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-auth-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise account auth", () => {
  it("hashes passwords with scrypt and never stores the plaintext", async () => {
    const encoded = await hashEnterprisePassword("very-secret-password");
    expect(encoded).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(encoded).not.toContain("very-secret-password");
    await expect(verifyEnterprisePassword("very-secret-password", encoded)).resolves.toBe(true);
    await expect(verifyEnterprisePassword("wrong-password", encoded)).resolves.toBe(false);
  });

  it("binds one account to one durable profile and revokes a JWT session", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "employee.a",
        displayName: "Employee A",
        passwordHash: await hashEnterprisePassword("initial-password-a"),
        role: "employee",
      },
      options,
    );

    const login = await loginEnterpriseAccount("EMPLOYEE.A", "initial-password-a", options);
    expect(authenticateEnterpriseToken(login.token, options)?.account.profileId).toBe(
      account.profileId,
    );

    revokeEnterpriseSession(login.principal.sessionId, "test", options);
    expect(authenticateEnterpriseToken(login.token, options)).toBeUndefined();
  });

  it("coalesces last-seen writes without bypassing session expiry or revocation", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "touch.admin",
        displayName: "Touch Admin",
        passwordHash: await hashEnterprisePassword("touch-password"),
        role: "administrator",
      },
      options,
    );
    const baseNow = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(baseNow);
    try {
      const session = createEnterpriseSession(account.id, options, "admin");

      clock.mockReturnValue(baseNow + 1_000);
      touchEnterpriseSession(session.sessionId, options);
      expect(getActiveEnterpriseSession(session.sessionId, options, "admin")?.lastSeenAt).toBe(
        baseNow + 1_000,
      );

      clock.mockReturnValue(baseNow + 2_000);
      touchEnterpriseSession(session.sessionId, options);
      expect(getActiveEnterpriseSession(session.sessionId, options, "admin")?.lastSeenAt).toBe(
        baseNow + 1_000,
      );

      const nextTouchAt = baseNow + 1_000 + ENTERPRISE_SESSION_TOUCH_INTERVAL_MS + 1;
      clock.mockReturnValue(nextTouchAt);
      touchEnterpriseSession(session.sessionId, options);
      expect(getActiveEnterpriseSession(session.sessionId, options, "admin")?.lastSeenAt).toBe(
        nextTouchAt,
      );

      clock.mockReturnValue(session.expiresAt);
      expect(getActiveEnterpriseSession(session.sessionId, options, "admin")).toBeUndefined();

      revokeEnterpriseSession(session.sessionId, "test", options);
      clock.mockReturnValue(session.expiresAt + 1);
      touchEnterpriseSession(session.sessionId, options);
      expect(getActiveEnterpriseSession(session.sessionId, options, "admin")).toBeUndefined();
    } finally {
      clock.mockRestore();
    }
  });

  it("resets a locked-out account password and revokes its existing sessions", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "recovery.admin",
        displayName: "Recovery Admin",
        passwordHash: await hashEnterprisePassword("old-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      },
      options,
    );
    const previousLogin = await loginEnterpriseAccount(
      account.username,
      "old-admin-password",
      options,
      "admin",
    );

    const updated = await resetEnterpriseAccountPassword(
      account.id,
      "recovered-admin-password",
      options,
    );

    expect(updated.mustChangePassword).toBe(true);
    expect(authenticateEnterpriseToken(previousLogin.token, options, "admin")).toBeUndefined();
    await expect(
      loginEnterpriseAccount(account.username, "old-admin-password", options, "admin"),
    ).rejects.toThrow("INVALID_CREDENTIALS");
    await expect(
      loginEnterpriseAccount(account.username, "recovered-admin-password", options, "admin"),
    ).resolves.toMatchObject({ principal: { account: { id: account.id } } });
  });

  it("enforces deny-wins and the employee shell hard deny", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "employee.b",
        displayName: "Employee B",
        passwordHash: await hashEnterprisePassword("initial-password-b"),
        role: "employee",
      },
      options,
    );
    replaceEnterpriseEntitlements(
      account.id,
      [
        { resourceType: "agent", resourceId: "agent:shared:research", effect: "allow" },
        { resourceType: "tool", resourceId: "tool:core:exec", effect: "allow" },
        { resourceType: "skill", resourceId: "skill:global:test:payroll", effect: "deny" },
      ],
      options,
    );

    expect(
      resolveEnterpriseResourceAccess(account, "agent", "agent:shared:research", options).allowed,
    ).toBe(true);
    expect(
      resolveEnterpriseResourceAccess(account, "agent", "agent:shared:finance", options).allowed,
    ).toBe(false);
    expect(resolveEnterpriseResourceAccess(account, "tool", "tool:core:exec", options)).toEqual({
      allowed: true,
      reason: "explicit_allow",
    });
    expect(
      resolveEnterpriseResourceAccess(account, "skill", "skill:global:test:payroll", options)
        .allowed,
    ).toBe(false);

    updateEnterpriseAccount(account.id, { enabled: false }, options);
    expect(getEnterpriseAccountById(account.id, options)?.enabled).toBe(false);
  });

  it("can roll back the first administrator when bootstrap config persistence fails", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "rollback.admin",
        displayName: "Rollback Admin",
        passwordHash: await hashEnterprisePassword("rollback-password"),
        role: "administrator",
      },
      options,
    );

    deleteEnterpriseAccountForBootstrapRollback(account.id, options);

    expect(getEnterpriseAccountById(account.id, options)).toBeUndefined();
    expect(countEnterpriseAdministrators(options)).toBe(0);
  });

  it("keeps one enabled administrator when concurrent updates race", async () => {
    const options = stateOptions();
    const first = createEnterpriseAccount(
      {
        username: "race.admin.a",
        displayName: "Race Admin A",
        passwordHash: await hashEnterprisePassword("race-password-a"),
        role: "administrator",
      },
      options,
    );
    const second = createEnterpriseAccount(
      {
        username: "race.admin.b",
        displayName: "Race Admin B",
        passwordHash: await hashEnterprisePassword("race-password-b"),
        role: "administrator",
      },
      options,
    );

    const results = await Promise.allSettled([
      Promise.resolve().then(() => updateEnterpriseAccount(first.id, { enabled: false }, options)),
      Promise.resolve().then(() => updateEnterpriseAccount(second.id, { enabled: false }, options)),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(countEnterpriseAdministrators(options)).toBe(1);
  });

  it("rejects stale granular entitlement revisions", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "revision.employee",
        displayName: "Revision Employee",
        passwordHash: await hashEnterprisePassword("revision-password"),
        role: "employee",
      },
      options,
    );
    const first = applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "skill",
          resourceId: "skill:global:test:one",
          effect: "allow",
        },
      ],
      { [account.id]: account.policyRevision },
      options,
    );
    expect(first.policyRevisions[account.id]).toBe(account.policyRevision + 1);
    expect(() =>
      applyEnterpriseAccessChanges(
        [
          {
            accountId: account.id,
            resourceType: "tool",
            resourceId: "tool:core:read",
            effect: "allow",
          },
        ],
        { [account.id]: account.policyRevision },
        options,
      ),
    ).toThrow(/POLICY_REVISION_CONFLICT/);
  });

  it("keeps legacy unscoped entitlements visible but fail closed", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "legacy.employee",
        displayName: "Legacy Employee",
        passwordHash: await hashEnterprisePassword("legacy-password"),
        role: "employee",
        accessPresetKey: "none",
      },
      options,
    );
    const stored = replaceEnterpriseEntitlements(
      account.id,
      [{ resourceType: "tool", resourceId: "web_search", effect: "allow" }],
      options,
    );
    expect(stored[0]).toMatchObject({ resourceState: "legacy" });
    expect(resolveEnterpriseResourceAccess(account, "tool", "web_search", options)).toEqual({
      allowed: false,
      reason: "not_granted",
    });
  });
});
