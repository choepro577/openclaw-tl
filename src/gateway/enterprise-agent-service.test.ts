import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_WORKSPACE_FILE_NAMES,
  ensureEnterpriseWorkspaceScaffold,
} from "./enterprise-workspace-scaffold.js";
import { installGatewayTestHooks } from "./test-helpers.js";

installGatewayTestHooks({ scope: "suite" });

describe("enterprise agent service", () => {
  it("supports enterprise scaffold even when skipBootstrap=true", async () => {
    const { loadConfig, writeConfigFile } = await import("../config/config.js");
    const { ensureAgentProvisioned } = await import("./enterprise-agent-service.js");
    await writeConfigFile({
      agents: {
        defaults: {
          skipBootstrap: true,
        },
      },
    });

    const ensured = await ensureAgentProvisioned({
      cfg: loadConfig(),
      agentId: "nv01001",
      name: "Nhan Vien 1001",
      failIfExists: false,
      ensureBootstrapFiles: false,
    });

    await expect(fs.access(path.join(ensured.workspace, "BOOTSTRAP.md"))).rejects.toThrow();
    await expect(fs.access(path.join(ensured.workspace, "HEARTBEAT.md"))).rejects.toThrow();

    const scaffold = await ensureEnterpriseWorkspaceScaffold({
      workspaceDir: ensured.workspace,
      agentId: ensured.agentId,
      staffCode: "NV01001",
      displayName: "Nhan Vien 1001",
    });

    expect(scaffold.createdFiles).toEqual(ENTERPRISE_WORKSPACE_FILE_NAMES);
    expect(scaffold.existingFiles).toEqual([]);
  });

  it("returns existing status and can backfill missing enterprise files", async () => {
    const { loadConfig, writeConfigFile } = await import("../config/config.js");
    const { ensureAgentProvisioned } = await import("./enterprise-agent-service.js");
    await writeConfigFile({
      agents: {
        defaults: {
          skipBootstrap: true,
        },
      },
    });

    const first = await ensureAgentProvisioned({
      cfg: loadConfig(),
      agentId: "nv01002",
      name: "Nhan Vien 1002",
      failIfExists: false,
      ensureBootstrapFiles: false,
    });
    await ensureEnterpriseWorkspaceScaffold({
      workspaceDir: first.workspace,
      agentId: first.agentId,
      staffCode: "NV01002",
      displayName: "Nhan Vien 1002",
    });

    await fs.rm(path.join(first.workspace, "SOUL.md"), { force: true });

    const second = await ensureAgentProvisioned({
      cfg: loadConfig(),
      agentId: "nv01002",
      name: "Nhan Vien 1002",
      failIfExists: false,
      ensureBootstrapFiles: false,
    });
    expect(second.status).toBe("existing");

    const scaffold = await ensureEnterpriseWorkspaceScaffold({
      workspaceDir: second.workspace,
      agentId: second.agentId,
      staffCode: "NV01002",
      displayName: "Nhan Vien 1002",
    });

    expect(scaffold.createdFiles).toEqual(["SOUL.md"]);
    expect(scaffold.existingFiles).toEqual(["AGENTS.md", "TOOLS.md", "IDENTITY.md", "USER.md"]);
  });
});
