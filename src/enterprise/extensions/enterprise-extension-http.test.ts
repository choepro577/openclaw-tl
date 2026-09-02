import { describe, expect, it } from "vitest";
import { enterpriseExtensionHttpTestHooks } from "./enterprise-extension-http.js";

describe("Enterprise User extension DTO boundary", () => {
  it("does not expose account, runtime Agent, filesystem, or capability internals", () => {
    const skill = enterpriseExtensionHttpTestHooks.presentUserSkillInstall({
      id: "install-1",
      accountId: "account-secret",
      agentKey: "personal",
      runtimeAgentId: "runtime-secret",
      clawhubRef: "calendar",
      skillName: "calendar",
      exactVersion: "1.0.0",
      integrity: "sha256:artifact",
      relativePath: "skills/calendar",
      treeHash: "sha256:tree",
      enabled: true,
      state: "ready",
      safeErrorCode: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const request = enterpriseExtensionHttpTestHooks.presentUserPluginRequest({
      id: "request-1",
      requesterAccountId: "account-secret",
      packageName: "native",
      packageFamily: "code_plugin",
      exactVersion: "1.0.0",
      integrity: "sha256:artifact",
      requestKind: "install",
      trustSnapshot: { internal: true },
      capabilitySnapshot: { secrets: true },
      capabilityDigest: "capability-secret",
      state: "pending",
      installedPluginId: null,
      reviewerAccountId: null,
      decisionReason: null,
      safeErrorCode: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      decidedAt: null,
    });

    expect(skill).not.toHaveProperty("accountId");
    expect(skill).not.toHaveProperty("runtimeAgentId");
    expect(skill).not.toHaveProperty("relativePath");
    expect(skill).not.toHaveProperty("treeHash");
    expect(request).not.toHaveProperty("requesterAccountId");
    expect(request).not.toHaveProperty("trustSnapshot");
    expect(request).not.toHaveProperty("capabilitySnapshot");
    expect(request).not.toHaveProperty("capabilityDigest");
  });
});
