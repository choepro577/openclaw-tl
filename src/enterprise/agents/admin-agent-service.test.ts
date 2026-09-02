import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  readEnterpriseAgentFile,
  readEnterpriseAgentPanel,
  updateEnterpriseAgentTools,
  writeEnterpriseAgentFile,
} from "./admin-agent-service.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  closeOpenClawStateDatabaseForTest();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function createWorkspaceConfig(): Promise<{ config: OpenClawConfig; workspace: string }> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-enterprise-agent-"));
  temporaryDirectories.push(workspace);
  return {
    workspace,
    config: {
      agents: {
        entries: {
          main: { name: "Main", workspace },
          support: { name: "Support", workspace: path.join(workspace, "support") },
        },
      },
    },
  };
}

describe("Enterprise admin agent service", () => {
  it("reads, creates, and revision-checks canonical workspace files", async () => {
    const { config } = await createWorkspaceConfig();
    const missing = await readEnterpriseAgentFile(config, "shared", "main", "SOUL.md");
    expect(missing.file).toMatchObject({ missing: true, content: "", contentRevision: null });

    const saved = await writeEnterpriseAgentFile(config, "shared", "main", {
      name: "SOUL.md",
      content: "first revision\n",
      baseRevision: null,
    });
    expect(saved.file).toMatchObject({ missing: false, content: "first revision\n" });
    expect(saved.file.contentRevision).toMatch(/^[a-f0-9]{64}$/);

    await expect(
      writeEnterpriseAgentFile(config, "shared", "main", {
        name: "SOUL.md",
        content: "stale overwrite\n",
        baseRevision: null,
      }),
    ).rejects.toThrow("AGENT_FILE_REVISION_CONFLICT");

    await expect(
      writeEnterpriseAgentFile(config, "shared", "main", {
        name: "../openclaw.json",
        content: "unsafe",
        baseRevision: null,
      }),
    ).rejects.toThrow("AGENT_FILE_UNSUPPORTED");
  });

  it("reads live scheduler status and only jobs owned by the selected agent", async () => {
    const { config } = await createWorkspaceConfig();
    const mainJob = {
      id: "job-main",
      name: "Main job",
      agentId: "main",
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 2,
      schedule: { kind: "every" as const, everyMs: 60_000 },
      sessionTarget: "isolated" as const,
      wakeMode: "now" as const,
      payload: { kind: "agentTurn" as const, message: "tick" },
      state: { nextRunAtMs: 10_000 },
    };
    const supportJob = { ...mainJob, id: "job-support", agentId: "support" };
    const cron = {
      status: vi.fn(async () => ({
        enabled: true,
        triggersEnabled: true,
        jobs: 2,
        nextWakeAtMs: 10_000,
        storePath: "/tmp/cron.db",
        sqlitePath: "/tmp/cron.db",
        storage: "sqlite" as const,
      })),
      list: vi.fn(async () => [mainJob, supportJob]),
      getDefaultAgentId: vi.fn(() => "main"),
    };
    const result = await readEnterpriseAgentPanel(config, "shared", "main", "cron", {
      gatewayContext: { cron } as unknown as GatewayRequestContext,
    });
    if (!("cron" in result)) {
      throw new Error("expected cron panel result");
    }

    expect(result.cron).toMatchObject({
      available: true,
      status: { enabled: true, jobs: 1, nextWakeAtMs: 10_000 },
      jobs: [expect.objectContaining({ id: "job-main" })],
    });
    expect(cron.list).toHaveBeenCalledWith({ includeDisabled: true });
  });

  it("locks non-delegable tools for shared Agents and rejects ordinary grants", async () => {
    const { config } = await createWorkspaceConfig();
    const panel = (await readEnterpriseAgentPanel(config, "shared", "main", "tools")) as Record<
      string,
      unknown
    >;

    expect(panel.lockedToolIds).toEqual(
      expect.arrayContaining(["gateway", "nodes", "portal", "screen", "terminal"]),
    );
    expect(panel.policy).toMatchObject({
      deny: expect.arrayContaining(["gateway", "portal", "terminal"]),
    });
    await expect(
      updateEnterpriseAgentTools(config, "shared", "main", {
        profile: "full",
        alsoAllow: ["gateway"],
        deny: [],
        baseHash: "unused",
      }),
    ).rejects.toThrow("FIELD_INVALID:alsoAllow");
  });

  it("keeps administrator personal files account-scoped and fails closed for unowned runtime panels", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      await fs.writeFile(path.join(state.workspaceDir, "SOUL.md"), "shared template\n");
      const account = createEnterpriseAccount({
        username: "personal.admin.view",
        displayName: "Personal Admin View",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        personalAgentEnabled: true,
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: { entries: { main: { workspace: state.workspaceDir } } },
      };

      await expect(
        readEnterpriseAgentFile(config, "personal", "missing-account", "SOUL.md"),
      ).rejects.toThrow("ACCOUNT_NOT_FOUND");
      const first = await readEnterpriseAgentFile(config, "personal", account.id, "SOUL.md");
      expect(first.file.path).toContain(account.profileId);
      expect(first.file.content).toBe("shared template\n");

      await writeEnterpriseAgentFile(config, "personal", account.id, {
        name: "SOUL.md",
        content: "private revision\n",
        baseRevision: first.file.contentRevision,
      });
      expect(await fs.readFile(path.join(state.workspaceDir, "SOUL.md"), "utf8")).toBe(
        "shared template\n",
      );

      const cron = await readEnterpriseAgentPanel(config, "personal", account.id, "cron", {
        gatewayContext: { cron: { list: vi.fn() } } as unknown as GatewayRequestContext,
      });
      if (!("cron" in cron)) {
        throw new Error("expected cron panel result");
      }
      expect(cron.cron).toMatchObject({
        available: false,
        jobs: [],
        reason: "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE",
      });
    });
  });

  it("reports the account-scoped effective tools for a personal agent", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "personal.tools.view",
        displayName: "Personal Tools View",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const otherAccount = createEnterpriseAccount({
        username: "personal.tools.other",
        displayName: "Personal Tools Other",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          defaults: {
            sandbox: {
              mode: "all",
              scope: "session",
              browser: { enabled: false },
            },
          },
          entries: {
            main: { workspace: state.workspaceDir, tools: { profile: "minimal" } },
          },
        },
        tools: { sandbox: { tools: { deny: ["web_fetch"] } } },
      };

      const result = (await readEnterpriseAgentPanel(
        config,
        "personal",
        account.id,
        "tools",
      )) as Record<string, unknown>;
      const effective = result.effectiveTools as
        | { groups?: Array<{ tools?: Array<{ id?: string }> }> }
        | undefined;
      const effectiveToolIds =
        effective?.groups?.flatMap((group) => group.tools?.map((tool) => tool.id) ?? []) ?? [];

      expect(effectiveToolIds).toEqual([]);
      expect(result).toMatchObject({ editable: true, policyRevision: 0 });

      const sourceConfig = structuredClone(config);
      const saved = await updateEnterpriseAgentTools(config, "personal", account.id, {
        profile: "full",
        alsoAllow: ["web_search"],
        deny: ["write"],
        baseRevision: 0,
      });
      expect(saved).toMatchObject({ accountId: account.id, policyRevision: 1 });

      const after = (await readEnterpriseAgentPanel(
        config,
        "personal",
        account.id,
        "tools",
      )) as Record<string, unknown>;
      const afterEffective = after.effectiveTools as {
        groups?: Array<{ tools?: Array<{ id?: string }> }>;
      };
      const afterToolIds =
        afterEffective.groups?.flatMap((group) => group.tools?.map((tool) => tool.id) ?? []) ?? [];
      expect(after).toMatchObject({
        editable: true,
        policyRevision: 1,
        policy: {
          profile: "full",
          alsoAllow: ["web_search"],
          deny: expect.arrayContaining(["write"]),
        },
      });
      expect(afterToolIds).toContain("web_search");
      expect(afterToolIds).not.toContain("write");
      expect(afterToolIds).not.toContain("gateway");
      const sandboxState = after.sandboxState as {
        enabled: boolean;
        tools: Array<{ id: string; status: string; reason?: string }>;
      };
      const sandboxTools = Object.fromEntries(
        sandboxState.tools.map((tool) => [tool.id, { status: tool.status, reason: tool.reason }]),
      );
      expect(sandboxState.enabled).toBe(true);
      expect(sandboxTools).toMatchObject({
        web_search: { status: "open" },
        web_fetch: { status: "blocked", reason: "SANDBOX_POLICY_DENY" },
        browser: { status: "setup_required", reason: "SANDBOX_BROWSER_DISABLED" },
        write: { status: "blocked", reason: "ADMIN_POLICY_DENY" },
        gateway: { status: "locked", reason: "ENTERPRISE_NON_DELEGABLE" },
        portal: { status: "locked", reason: "ENTERPRISE_NON_DELEGABLE" },
      });
      const cappedConfig = structuredClone(config);
      const cappedMain = cappedConfig.agents?.entries?.main;
      if (!cappedMain) {
        throw new Error("expected main Agent config");
      }
      cappedMain.tools = { ...cappedMain.tools, allow: ["group:fs"] };
      const capped = (await readEnterpriseAgentPanel(
        cappedConfig,
        "personal",
        account.id,
        "tools",
      )) as Record<string, unknown>;
      const cappedSandboxState = capped.sandboxState as {
        tools: Array<{ id: string; status: string; reason?: string }>;
      };
      expect(cappedSandboxState.tools.find((tool) => tool.id === "web_search")).toMatchObject({
        status: "blocked",
        reason: "AGENT_POLICY_DENY",
      });
      expect(config).toEqual(sourceConfig);

      const other = (await readEnterpriseAgentPanel(
        config,
        "personal",
        otherAccount.id,
        "tools",
      )) as Record<string, unknown>;
      const otherEffective = other.effectiveTools as {
        groups?: Array<{ tools?: Array<{ id?: string }> }>;
      };
      expect(
        otherEffective.groups
          ?.flatMap((group) => group.tools?.map((tool) => tool.id) ?? [])
          .toSorted(),
      ).toEqual(["read", "write", "edit", "apply_patch", "exec", "process"].toSorted());
      expect(other).toMatchObject({ editable: true, policyRevision: 0 });
      const otherSandboxState = other.sandboxState as {
        tools: Array<{ id: string; status: string; reason?: string }>;
      };
      expect(otherSandboxState.tools.find((tool) => tool.id === "web_search")).toMatchObject({
        status: "blocked",
        reason: "ADMIN_POLICY_DENY",
      });

      await expect(
        updateEnterpriseAgentTools(config, "personal", account.id, {
          profile: "coding",
          alsoAllow: [],
          deny: [],
          baseRevision: 0,
        }),
      ).rejects.toThrow("ACCOUNT_TOOL_POLICY_REVISION_CONFLICT:1");
      await expect(
        updateEnterpriseAgentTools(config, "personal", account.id, {
          profile: "full",
          alsoAllow: ["gateway"],
          deny: [],
          baseRevision: 1,
        }),
      ).rejects.toThrow("FIELD_INVALID:alsoAllow");
      expect(config).toEqual(sourceConfig);
    });
  });
});
