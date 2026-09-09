import { describe, expect, it } from "vitest";
import {
  accessPresetToolIds,
  normalizeEnterpriseAccessPresetKey,
} from "../entitlements/resource-keys.js";
import {
  createEnterprisePluginRequest,
  upsertEnterprisePluginGrant,
} from "../extensions/extension-store.js";

describe("basic access preset", () => {
  it("has the exact requested 32 tool identities", () => {
    expect(normalizeEnterpriseAccessPresetKey("basic@1")).toBe("basic@1");
    expect(accessPresetToolIds("basic@1").toSorted()).toEqual(
      [
        "read",
        "write",
        "edit",
        "apply_patch",
        "exec",
        "process",
        "memory_search",
        "memory_get",
        "agents_wait",
        "ask_user",
        "automations",
        "progress_card",
        "suggest_task",
        "browser",
        "show_widget",
        "dashboard",
        "canvas",
        "conversations_list",
        "conversations_send",
        "conversations_turn",
        "session_status",
        "sessions",
        "sessions_history",
        "sessions_search",
        "sessions_send",
        "music_generate",
        "tts",
        "video_generate",
        "view_image",
        "web_search",
        "web_fetch",
        "x_search",
      ].toSorted(),
    );
  });
});

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import {
  replaceEnterpriseEntitlements,
  listEnterpriseEntitlements,
} from "../entitlements/entitlement-store.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountById,
  updateEnterpriseAccount,
} from "./account-store.js";
import {
  readEnterpriseAccountToolPolicy,
  writeEnterpriseAccountToolPolicy,
} from "./account-tool-policy-store.js";

const dirs: string[] = [];
afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of dirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "basic-preset-"));
  dirs.push(directory);
  const options = { path: join(directory, "state.sqlite") };
  const account = createEnterpriseAccount(
    {
      username: "preset-test",
      displayName: "Preset",
      passwordHash: "test-only",
      role: "employee",
      accessPresetKey: "standard-coding@1",
    },
    options,
  );
  return { account, options };
}

describe("atomic account preset application", () => {
  it("defaults employees to basic without creating inherited full overrides", () => {
    const { options } = fixture();
    const account = createEnterpriseAccount(
      { username: "new-employee", displayName: "New", passwordHash: "test-only", role: "employee" },
      options,
    );
    expect(account.accessPresetKey).toBe("basic@1");
    expect(readEnterpriseAccountToolPolicy(account.id, options).configured).toBe(false);
    const admin = createEnterpriseAccount(
      {
        username: "new-admin",
        displayName: "Admin",
        passwordHash: "test-only",
        role: "administrator",
      },
      options,
    );
    expect(admin.accessPresetKey).toBe("none");
  });

  it("reconciles both stores and does not reapply on an ordinary save", () => {
    const { account, options } = fixture();
    writeEnterpriseAccountToolPolicy(
      account.id,
      0,
      {
        profile: "coding",
        alsoAllow: ["custom_report"],
        deny: ["browser", "group:web", "cron", "sessions_list"],
      },
      options,
    );
    replaceEnterpriseEntitlements(
      account.id,
      [
        { resourceType: "tool", resourceId: "tool:core:browser", effect: "deny" },
        { resourceType: "agent", resourceId: "agent:shared:main", effect: "allow" },
        { resourceType: "tool", resourceId: "tool:core:pdf", effect: "deny" },
      ],
      options,
    );
    const applied = updateEnterpriseAccount(account.id, { accessPresetKey: "basic@1" }, options);
    expect(applied.policyRevision).toBeGreaterThan(account.policyRevision);
    const policy = readEnterpriseAccountToolPolicy(account.id, options);
    expect(policy.deny).toEqual(["sessions_list"]);
    expect(policy.alsoAllow).toContain("custom_report");
    expect(
      listEnterpriseEntitlements(account.id, options).map((entry) => entry.resourceId),
    ).toEqual(expect.arrayContaining(["agent:shared:main", "tool:core:pdf"]));
    expect(
      listEnterpriseEntitlements(account.id, options).some(
        (entry) => entry.resourceId === "tool:core:browser",
      ),
    ).toBe(false);
    writeEnterpriseAccountToolPolicy(
      account.id,
      policy.revision,
      { ...policy, deny: [...policy.deny, "browser"] },
      options,
    );
    updateEnterpriseAccount(
      account.id,
      { displayName: "Renamed", accessPresetKey: "basic@1" },
      options,
    );
    expect(readEnterpriseAccountToolPolicy(account.id, options).deny).toContain("browser");
    updateEnterpriseAccount(account.id, { applyAccessPreset: true }, options);
    expect(readEnterpriseAccountToolPolicy(account.id, options).deny).not.toContain("browser");
  });

  it.each(["*", "web_*", "sessions_*"])(
    "removes %s conflicts without granting unknown or unrelated tools",
    (pattern) => {
      const { account, options } = fixture();
      writeEnterpriseAccountToolPolicy(
        account.id,
        0,
        { profile: "full", alsoAllow: ["custom_report"], deny: [pattern] },
        options,
      );
      updateEnterpriseAccount(account.id, { accessPresetKey: "basic@1" }, options);
      const policy = readEnterpriseAccountToolPolicy(account.id, options);
      for (const tool of accessPresetToolIds("basic@1"))
        expect(
          isToolAllowedByPolicyName(tool, {
            allow: [...accessPresetToolIds("basic@1"), ...policy.alsoAllow],
            deny: policy.deny,
          }),
        ).toBe(true);
      expect(policy.alsoAllow).not.toContain("*");
      expect(policy.alsoAllow).not.toContain("future_unknown_tool");
      if (pattern === "*") expect(policy.alsoAllow).not.toContain("custom_report");
      if (pattern === "sessions_*") expect(policy.deny).toContain("sessions_list");
    },
  );

  it("preserves inherited legacy rights when applying basic, without inheriting full for an already basic policy", () => {
    const { account, options } = fixture();
    writeEnterpriseAccountToolPolicy(
      account.id,
      0,
      { profile: null, alsoAllow: [], deny: ["browser"] },
      options,
    );
    updateEnterpriseAccount(
      account.id,
      {
        accessPresetKey: "basic@1",
        config: { tools: { profile: "coding", alsoAllow: ["custom_report"] } },
      },
      options,
    );
    const policy = readEnterpriseAccountToolPolicy(account.id, options);
    expect(policy.profile).toBe("coding");
    expect(policy.alsoAllow).toContain("custom_report");
    writeEnterpriseAccountToolPolicy(
      account.id,
      policy.revision,
      { profile: null, alsoAllow: [], deny: ["browser"] },
      options,
    );
    updateEnterpriseAccount(
      account.id,
      { applyAccessPreset: true, config: { tools: { profile: "full" } } },
      options,
    );
    expect(readEnterpriseAccountToolPolicy(account.id, options).profile).toBeNull();
    expect(readEnterpriseAccountToolPolicy(account.id, options).alsoAllow).toEqual([]);
  });

  it("applies initial group denies without creating full access or changing another account", () => {
    const { account: other, options } = fixture();
    const otherBefore = getEnterpriseAccountById(other.id, options);
    const account = createEnterpriseAccount(
      {
        username: "group-employee",
        displayName: "Group",
        passwordHash: "test-only",
        role: "employee",
        initialEntitlements: [
          { resourceType: "tool", resourceId: "tool:core:group%3Asessions", effect: "deny" },
        ],
      },
      options,
    );
    const policy = readEnterpriseAccountToolPolicy(account.id, options);
    expect(policy.profile).toBe("minimal");
    expect(policy.alsoAllow).toEqual([]);
    expect(policy.deny).toContain("sessions_list");
    expect(policy.deny).not.toContain("sessions_send");
    expect(getEnterpriseAccountById(other.id, options)).toEqual(otherBefore);
    expect(readEnterpriseAccountToolPolicy(other.id, options).configured).toBe(false);
  });

  it("keeps dormant plugin tools denied when reconciling a wildcard", () => {
    const { account, options } = fixture();
    const request = createEnterprisePluginRequest(
      {
        requesterAccountId: account.id,
        packageName: "@test/dormant",
        packageFamily: "code_plugin",
        exactVersion: "1.0.0",
        integrity: "sha256:test",
        requestKind: "install",
        trustSnapshot: {},
        capabilitySnapshot: { tools: ["dormant_report"] },
        capabilityDigest: "test",
      },
      options,
    );
    upsertEnterprisePluginGrant(
      {
        accountId: account.id,
        pluginId: "dormant",
        exactVersion: "1.0.0",
        integrity: "sha256:test",
        capabilityDigest: "test",
        approvedTools: ["dormant_report"],
        sourceRequestId: request.id,
        state: "unavailable",
      },
      options,
    );
    writeEnterpriseAccountToolPolicy(
      account.id,
      0,
      { profile: "full", alsoAllow: [], deny: ["*"] },
      options,
    );
    updateEnterpriseAccount(account.id, { accessPresetKey: "basic@1" }, options);
    expect(readEnterpriseAccountToolPolicy(account.id, options).deny).toContain("dormant_report");
  });

  it("commits audit with permissions and rolls everything back when audit fails", () => {
    const { account, options } = fixture();
    const admin = createEnterpriseAccount(
      {
        username: "audit-admin",
        displayName: "Admin",
        passwordHash: "test-only",
        role: "administrator",
      },
      options,
    );
    writeEnterpriseAccountToolPolicy(
      account.id,
      0,
      { profile: "coding", alsoAllow: [], deny: ["browser"] },
      options,
    );
    const before = getEnterpriseAccountById(account.id, options);
    expect(() =>
      updateEnterpriseAccount(
        account.id,
        {
          accessPresetKey: "basic@1",
          audit: { actorAccountId: "missing-admin", actorSessionId: "test", requestId: null },
        },
        options,
      ),
    ).toThrow();
    expect(getEnterpriseAccountById(account.id, options)).toEqual(before);
    expect(readEnterpriseAccountToolPolicy(account.id, options).deny).toEqual(["browser"]);
    updateEnterpriseAccount(
      account.id,
      {
        accessPresetKey: "basic@1",
        audit: { actorAccountId: admin.id, actorSessionId: "test", requestId: null },
      },
      options,
    );
    const events = listEnterpriseAuditEvents(20, options);
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("test-only");
    expect(events[0]?.action).toBe("account.update");
    expect(
      openOpenClawStateDatabase(options)
        .db.prepare("SELECT access_preset_key FROM enterprise_accounts WHERE id = ?")
        .get(account.id),
    ).toEqual(expect.objectContaining({ access_preset_key: "basic@1" }));
  });
});
