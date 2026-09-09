import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  markEnterpriseAgentEntitlementsOrphaned,
  replaceEnterpriseEntitlements,
  resolveEnterpriseResourceAccess,
} from "./entitlement-store.js";
import {
  coreToolResourceKey,
  personalAgentResourceKey,
  sharedAgentResourceKey,
} from "./resource-keys.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(role: "employee" | "administrator" = "employee") {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-personal-entitlements-"));
  directories.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const account = createEnterpriseAccount(
    {
      username: "personal.owner",
      displayName: "Personal Owner",
      passwordHash: "test-only",
      role,
      personalAgentEnabled: true,
      mustChangePassword: false,
    },
    options,
  );
  return { account, options };
}

describe("Personal Agent resource access", () => {
  it.each([
    { personal: "allow", shared: null, personalAllowed: true, sharedAllowed: false },
    { personal: "deny", shared: "allow", personalAllowed: false, sharedAllowed: true },
    { personal: null, shared: "deny", personalAllowed: true, sharedAllowed: false },
  ] as const)(
    "separates equal Shared/Personal ids with personal=$personal and shared=$shared",
    ({ personal, shared, personalAllowed, sharedAllowed }) => {
      const { account, options } = fixture();
      const personalKey = personalAgentResourceKey(account.id);
      const sharedKey = sharedAgentResourceKey(account.id);
      replaceEnterpriseEntitlements(
        account.id,
        [
          ...(personal
            ? [{ resourceType: "agent" as const, resourceId: personalKey, effect: personal }]
            : []),
          ...(shared
            ? [{ resourceType: "agent" as const, resourceId: sharedKey, effect: shared }]
            : []),
        ],
        options,
      );
      expect(resolveEnterpriseResourceAccess(account, "agent", personalKey, options).allowed).toBe(
        personalAllowed,
      );
      expect(resolveEnterpriseResourceAccess(account, "agent", sharedKey, options).allowed).toBe(
        sharedAllowed,
      );
    },
  );

  it.each(["employee", "administrator"] as const)(
    "honors an active Personal deny for %s but does not revive an orphaned deny",
    (role) => {
      const { account, options } = fixture(role);
      const personalKey = personalAgentResourceKey(account.id);
      replaceEnterpriseEntitlements(
        account.id,
        [{ resourceType: "agent", resourceId: personalKey, effect: "deny" }],
        options,
      );
      expect(resolveEnterpriseResourceAccess(account, "agent", personalKey, options)).toEqual({
        allowed: false,
        reason: "explicit_deny",
      });
      markEnterpriseAgentEntitlementsOrphaned(personalKey, options);
      expect(resolveEnterpriseResourceAccess(account, "agent", personalKey, options)).toEqual({
        allowed: true,
        reason: "personal_agent_owner",
      });
    },
  );
});

describe("Tool resource access", () => {
  it("uses the basic preset and expands alias, group, and wildcard entitlement denies", () => {
    const { account, options } = fixture();
    expect(resolveEnterpriseResourceAccess(account, "tool", "browser", options)).toEqual({
      allowed: true,
      reason: "access_preset",
    });

    replaceEnterpriseEntitlements(
      account.id,
      [
        {
          resourceType: "tool",
          resourceId: coreToolResourceKey("sessions_*"),
          effect: "deny",
        },
        { resourceType: "tool", resourceId: coreToolResourceKey("group:web"), effect: "deny" },
        { resourceType: "tool", resourceId: coreToolResourceKey("bash"), effect: "deny" },
      ],
      options,
    );

    expect(resolveEnterpriseResourceAccess(account, "tool", "sessions_history", options)).toEqual({
      allowed: false,
      reason: "explicit_deny",
    });
    expect(resolveEnterpriseResourceAccess(account, "tool", "web_search", options)).toEqual({
      allowed: false,
      reason: "explicit_deny",
    });
    expect(resolveEnterpriseResourceAccess(account, "tool", "exec", options)).toEqual({
      allowed: false,
      reason: "explicit_deny",
    });
    expect(resolveEnterpriseResourceAccess(account, "tool", "sessions", options)).toEqual({
      allowed: true,
      reason: "access_preset",
    });
  });

  it("does not treat an empty allowlist as allow-all for the none preset", () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-none-entitlements-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const account = createEnterpriseAccount(
      {
        username: "none.owner",
        displayName: "No Tools",
        passwordHash: "test-only",
        role: "employee",
        accessPresetKey: "none",
        initialEntitlements: [
          { resourceType: "tool", resourceId: coreToolResourceKey("web_search"), effect: "allow" },
        ],
      },
      options,
    );

    expect(resolveEnterpriseResourceAccess(account, "tool", "web_search", options)).toEqual({
      allowed: true,
      reason: "explicit_allow",
    });
    expect(resolveEnterpriseResourceAccess(account, "tool", "browser", options)).toEqual({
      allowed: false,
      reason: "not_granted",
    });
  });
});
