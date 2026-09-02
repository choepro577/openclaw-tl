import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  createEnterprisePluginRequest,
  listEnterpriseAccountPluginGrants,
  listEnterprisePluginRequests,
  listEnterpriseUserSkillInstalls,
  transitionEnterprisePluginRequest,
  upsertEnterprisePluginGrant,
  writeEnterpriseUserSkillInstall,
} from "./extension-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-extensions-"));
  directories.push(directory);
  return { path: join(directory, "state.sqlite") };
}

describe("Enterprise extension store", () => {
  it("isolates Skill inventory by account and AgentKey", () => {
    const options = createOptions();
    const first = createEnterpriseAccount(
      {
        username: "first",
        displayName: "First",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const second = createEnterpriseAccount(
      {
        username: "second",
        displayName: "Second",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    writeEnterpriseUserSkillInstall(
      {
        accountId: first.id,
        agentKey: "shared:support",
        runtimeAgentId: "support",
        clawhubRef: "@acme/calendar",
        skillName: "calendar",
        exactVersion: "1.0.0",
        integrity: "sha256:first",
        relativePath: "skills/calendar",
        treeHash: "tree-first",
        enabled: true,
        state: "ready",
        safeErrorCode: null,
      },
      options,
    );
    writeEnterpriseUserSkillInstall(
      {
        accountId: second.id,
        agentKey: "shared:support",
        runtimeAgentId: "support",
        clawhubRef: "@acme/calendar",
        skillName: "calendar",
        exactVersion: "2.0.0",
        integrity: "sha256:second",
        relativePath: "skills/calendar",
        treeHash: "tree-second",
        enabled: true,
        state: "ready",
        safeErrorCode: null,
      },
      options,
    );

    expect(listEnterpriseUserSkillInstalls(first.id, "shared:support", options)).toMatchObject([
      { accountId: first.id, exactVersion: "1.0.0", relativePath: "skills/calendar" },
    ]);
    expect(listEnterpriseUserSkillInstalls(second.id, "shared:support", options)).toMatchObject([
      { accountId: second.id, exactVersion: "2.0.0", relativePath: "skills/calendar" },
    ]);
    expect(listEnterpriseUserSkillInstalls(first.id, "personal", options)).toEqual([]);
  });

  it("keeps native plugin grants separate from stored account policy", () => {
    const options = createOptions();
    const account = createEnterpriseAccount(
      {
        username: "requester",
        displayName: "Requester",
        passwordHash: "test-only",
        role: "employee",
      },
      options,
    );
    const request = createEnterprisePluginRequest(
      {
        requesterAccountId: account.id,
        packageName: "@acme/native-tools",
        packageFamily: "code_plugin",
        exactVersion: "3.1.0",
        integrity: "sha256:artifact",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: { tools: ["acme.search"] },
        capabilityDigest: "capability-digest",
      },
      options,
    );
    const approving = transitionEnterprisePluginRequest(
      {
        id: request.id,
        baseRevision: request.revision,
        from: ["pending"],
        to: "approving",
        reviewerAccountId: account.id,
        installedPluginId: "acme-native",
      },
      options,
    );
    const grant = upsertEnterprisePluginGrant(
      {
        accountId: account.id,
        pluginId: "acme-native",
        exactVersion: approving.exactVersion,
        integrity: approving.integrity,
        capabilityDigest: approving.capabilityDigest,
        approvedTools: ["acme.search"],
        sourceRequestId: approving.id,
        state: "active",
      },
      options,
    );

    expect(listEnterprisePluginRequests({ accountId: account.id }, options)).toHaveLength(1);
    expect(listEnterpriseAccountPluginGrants(account.id, options)).toEqual([grant]);
    expect(grant.approvedTools).toEqual(["acme.search"]);
  });
});
