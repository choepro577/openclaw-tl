import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ENTERPRISE_WORKSPACE_FILE_NAMES,
  ensureEnterpriseWorkspaceScaffold,
  resetEnterpriseWorkspaceTemplateCacheForTest,
} from "./enterprise-workspace-scaffold.js";

describe("enterprise workspace scaffold", () => {
  let workspaceDir = "";

  beforeEach(async () => {
    resetEnterpriseWorkspaceTemplateCacheForTest();
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-enterprise-workspace-"));
  });

  afterEach(async () => {
    if (workspaceDir) {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
    resetEnterpriseWorkspaceTemplateCacheForTest();
  });

  it("creates all enterprise workspace files for a new workspace", async () => {
    const result = await ensureEnterpriseWorkspaceScaffold({
      workspaceDir,
      agentId: "nv00123",
      staffCode: "NV00123",
      displayName: "Nguyen Van A",
      createdAt: new Date("2026-02-11T10:00:00.000Z"),
    });

    expect(result.profile).toBe("enterprise-employee-v1");
    expect(result.createdFiles).toEqual(ENTERPRISE_WORKSPACE_FILE_NAMES);
    expect(result.existingFiles).toEqual([]);

    for (const name of ENTERPRISE_WORKSPACE_FILE_NAMES) {
      const filePath = path.join(workspaceDir, name);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("openclaw-enterprise-template: employee-v1");
      expect(content).not.toContain("{{agentId}}");
      expect(content).not.toContain("{{staffCode}}");
      expect(content).not.toContain("{{displayName}}");
    }
    const agentsContent = await fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf-8");
    const toolsContent = await fs.readFile(path.join(workspaceDir, "TOOLS.md"), "utf-8");
    expect(agentsContent).toContain("nv00123");
    expect(agentsContent).toContain("NV00123");
    expect(agentsContent).toContain("Nguyen Van A");
    expect(agentsContent).toContain("## HR Request Routing Policy");
    expect(toolsContent).toContain("## Tool Policy: Internal vs External");
    expect(agentsContent).not.toContain("Tài");
    expect(agentsContent).not.toContain("Tai");
  });

  it("backfills missing files and does not overwrite existing ones", async () => {
    const identityPath = path.join(workspaceDir, "IDENTITY.md");
    const customIdentity = "# custom identity\n- Name: Existing User\n";
    await fs.writeFile(identityPath, customIdentity, "utf-8");

    const result = await ensureEnterpriseWorkspaceScaffold({
      workspaceDir,
      agentId: "nv00999",
      staffCode: "NV00999",
      displayName: "Existing User",
      createdAt: new Date("2026-02-11T10:10:00.000Z"),
    });

    expect(result.createdFiles).toEqual(["AGENTS.md", "SOUL.md", "TOOLS.md", "USER.md"]);
    expect(result.existingFiles).toEqual(["IDENTITY.md"]);
    await expect(fs.readFile(identityPath, "utf-8")).resolves.toBe(customIdentity);
  });

  it("is idempotent across repeated calls", async () => {
    await ensureEnterpriseWorkspaceScaffold({
      workspaceDir,
      agentId: "nv00888",
      staffCode: "NV00888",
      displayName: "Repeat User",
    });
    const second = await ensureEnterpriseWorkspaceScaffold({
      workspaceDir,
      agentId: "nv00888",
      staffCode: "NV00888",
      displayName: "Repeat User",
    });

    expect(second.createdFiles).toEqual([]);
    expect(second.existingFiles).toEqual(ENTERPRISE_WORKSPACE_FILE_NAMES);
  });
});
