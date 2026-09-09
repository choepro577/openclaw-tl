import { mkdirSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { listAgentIds, resolveAgentConfig } from "../../agents/agent-scope.js";
import { resolveSandboxConfigForAgent } from "../../agents/sandbox/config.js";
import {
  isToolAllowed,
  resolveSandboxToolPolicyForAgent,
} from "../../agents/sandbox/tool-policy.js";
import { resolveEffectiveToolInventory } from "../../agents/tools-effective-inventory.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  isGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import type { GatewayClient, GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { writeEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { createEnterpriseSession, revokeEnterpriseSession } from "../auth/session-store.js";
import { writeEnterpriseDelegationPolicy } from "../delegation/delegation-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import {
  createEnterpriseCodexPluginRequest,
  transitionEnterpriseCodexPluginRequest,
  transitionEnterpriseCodexPluginGrant,
  upsertEnterpriseCodexPluginGrant,
} from "../extensions/codex-plugin-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { createEnterpriseUserGatewayClient } from "../user/user-gateway-client.js";
import {
  prepareEnterpriseGatewayRequest,
  projectEnterpriseRuntimeConfig,
  resolveEnterpriseAllowedAgentIds,
} from "./enterprise-gateway-policy.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

function client(profileId: string, sessionId: string, synthetic = false): GatewayClient {
  return {
    connect: {
      minProtocol: 1,
      maxProtocol: 1,
      client: { id: "openclaw-control-ui", version: "test", platform: "test", mode: "webchat" },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
    },
    authenticatedUserProfile: {
      profileId,
      displayName: "Employee",
      hasAvatar: false,
      updatedAt: 1,
    },
    internal: {
      enterpriseSession: {
        sessionId,
        audience: "user",
        accountId: "test-account",
        accountRole: "employee",
      },
      ...(synthetic ? { syntheticClient: true } : {}),
    },
  } as GatewayClient;
}

describe("enterprise gateway policy", () => {
  it("projects only the current account Agent's approved Codex grants and rechecks revocation", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "employee.codex-grants",
        displayName: "Codex User",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: {} } },
      };
      const runtimeAgentId = resolveEnterprisePersonalAgentId(config, account);
      const request = createEnterpriseCodexPluginRequest({
        requesterAccountId: account.id,
        agentKey: "personal",
        runtimeAgentId,
        pluginName: "example",
        marketplaceName: "approved",
        requestKind: "install",
        catalogSnapshot: {},
        capabilitySnapshot: {},
        capabilityDigest: "reviewed",
      });
      const grant = upsertEnterpriseCodexPluginGrant({
        accountId: account.id,
        agentKey: "personal",
        runtimeAgentId,
        pluginName: "example",
        marketplaceName: "approved",
        installedPluginId: "example@approved",
        capabilitySnapshot: {},
        capabilityDigest: "reviewed",
        sourceRequestId: request.id,
        state: "active",
      });
      const session = createEnterpriseSession(account.id);
      const admission = prepareEnterpriseGatewayRequest({
        client: createEnterpriseUserGatewayClient(account, session.sessionId),
        context: { getRuntimeConfig: () => config } as GatewayRequestContext,
        method: "chat.send",
        requestParams: { agentId: runtimeAgentId },
      });
      expect(admission.allowed).toBe(true);
      if (!admission.allowed) throw new Error("Expected admitted user");
      const resolveGrants = readGatewayRequestRuntimeMetadata(
        admission.context.getRuntimeConfig(),
      )!.nativePluginGrants!;
      expect(resolveGrants(runtimeAgentId, "codex")).toEqual([]);
      transitionEnterpriseCodexPluginRequest({
        id: request.id,
        baseRevision: request.revision,
        from: ["pending"],
        to: "available",
        installedPluginId: "example@approved",
      });
      expect(resolveGrants(runtimeAgentId, "codex")).toEqual([
        { pluginName: "example", marketplaceName: "approved", capabilityDigest: "reviewed" },
      ]);
      expect(resolveGrants("main", "codex")).toEqual([]);
      expect(resolveGrants(runtimeAgentId, "other-harness")).toEqual([]);
      const disabled = transitionEnterpriseCodexPluginGrant({
        id: grant.id,
        accountId: account.id,
        baseRevision: grant.revision,
        state: "disabled",
      });
      expect(resolveGrants(runtimeAgentId, "codex")).toEqual([]);
      transitionEnterpriseCodexPluginGrant({
        id: grant.id,
        accountId: account.id,
        baseRevision: disabled.revision,
        state: "active",
      });
      revokeEnterpriseSession(session.sessionId, "test-sign-out");
      expect(resolveGrants(runtimeAgentId, "codex")).toEqual([]);
    });
  });
  it("keeps standard-coding grants effective through a minimal template profile", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.standard-coding",
        accessPresetKey: "standard-coding@1",
        displayName: "Employee Standard Coding",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          entries: {
            main: { workspace: state.workspaceDir, tools: { profile: "minimal" } },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account);
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const projectedAgent = resolveAgentConfig(projected, personalAgentId);
      const inventory = resolveEffectiveToolInventory({
        cfg: projected,
        agentId: personalAgentId,
        sessionKey: `agent:${personalAgentId}:enterprise-standard-coding`,
        workspaceDir: projectedAgent?.workspace,
        modelApi: null,
      });
      const effectiveToolIds = inventory.groups
        .flatMap((group) => group.tools.map((tool) => tool.id))
        .toSorted();

      expect(inventory.profile).toBe("minimal");
      expect(effectiveToolIds).toEqual(
        ["read", "write", "edit", "apply_patch", "exec", "process"].toSorted(),
      );
      expect(projected.tools).toMatchObject({
        allow: ["apply_patch", "edit", "exec", "process", "read", "write"],
      });
      expect(projectedAgent?.tools).toMatchObject({
        profile: "minimal",
        alsoAllow: ["apply_patch", "edit", "exec", "process", "read", "write"],
      });
      expect(projectedAgent?.tools?.allow).toBeUndefined();
      expect(projected.agents?.defaults?.authInheritance?.agentId).toBe("main");
      expect(config.tools).toBeUndefined();
      expect(resolveAgentConfig(config, "main")?.tools).toEqual({ profile: "minimal" });
    });
  });

  it("honors configured tool groups while retaining the account security cap", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.files-only",
        accessPresetKey: "standard-coding@1",
        displayName: "Employee Files Only",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        tools: { allow: ["group:fs"] },
        agents: {
          entries: {
            main: { workspace: state.workspaceDir, tools: { profile: "full" } },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account);
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const inventory = resolveEffectiveToolInventory({
        cfg: projected,
        agentId: personalAgentId,
        sessionKey: `agent:${personalAgentId}:enterprise-files-only`,
        modelApi: null,
      });
      const effectiveToolIds = inventory.groups
        .flatMap((group) => group.tools.map((tool) => tool.id))
        .toSorted();

      expect(projected.tools?.allow).toEqual(["apply_patch", "edit", "read", "write"]);
      expect(effectiveToolIds).toEqual(["apply_patch", "edit", "read", "write"]);
    });
  });

  it("keeps a full Admin grant restricted by the Agent allowlist", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "administrator.agent-cap",
        displayName: "Administrator Agent Cap",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          entries: {
            main: {
              workspace: state.workspaceDir,
              tools: { profile: "minimal", allow: ["group:fs", "web_search"] },
            },
          },
        },
      };
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: "full",
        alsoAllow: [],
        deny: [],
      });

      const projected = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const inventory = resolveEffectiveToolInventory({
        cfg: projected,
        agentId: personalAgentId,
        sessionKey: `agent:${personalAgentId}:enterprise-agent-cap`,
        modelApi: null,
      });
      const effectiveToolIds = inventory.groups.flatMap((group) =>
        group.tools.map((tool) => tool.id),
      );
      const sandboxPolicy = resolveSandboxToolPolicyForAgent(projected, personalAgentId);

      expect(resolveAgentConfig(projected, personalAgentId)?.tools?.allow).toEqual([
        "group:fs",
        "web_search",
      ]);
      expect(effectiveToolIds.toSorted()).toEqual(
        ["apply_patch", "edit", "read", "web_search", "write"].toSorted(),
      );
      expect(effectiveToolIds).not.toContain("process");
      expect(isToolAllowed(sandboxPolicy, "web_search")).toBe(true);
      expect(isToolAllowed(sandboxPolicy, "gateway")).toBe(false);
      expect(config.agents?.entries?.main?.tools).toEqual({
        profile: "minimal",
        allow: ["group:fs", "web_search"],
      });
    });
  });

  it("fails closed when an employee account has no tool grants", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.no-tools",
        displayName: "Employee No Tools",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
        accessPresetKey: "none",
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          entries: {
            main: { workspace: state.workspaceDir, tools: { profile: "full" } },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account);
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const inventory = resolveEffectiveToolInventory({
        cfg: projected,
        agentId: personalAgentId,
        sessionKey: `agent:${personalAgentId}:enterprise-no-tools`,
        modelApi: null,
      });

      expect(projected.tools?.allow).toEqual([]);
      expect(projected.tools?.deny).toContain("*");
      expect(inventory.groups.flatMap((group) => group.tools)).toEqual([]);
    });
  });

  it.each([
    [undefined, undefined, "bridge"],
    ["none", undefined, "none"],
    ["enterprise-lan", undefined, "enterprise-lan"],
    ["none", "bridge", "bridge"],
    ["bridge", "none", "none"],
  ])(
    "resolves Enterprise networking from global %s and agent %s to %s",
    async (globalNetwork, agentNetwork, expectedNetwork) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
        const account = createEnterpriseAccount({
          username: "administrator.network",
          displayName: "Network policy",
          personalAgentEnabled: true,
          passwordHash: await hashEnterprisePassword("enterprise-password"),
          role: "administrator",
          mustChangePassword: false,
        });
        const config: OpenClawConfig = {
          enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
          agents: {
            defaults: { sandbox: { docker: { network: globalNetwork } } },
            entries: {
              main: { sandbox: { workspaceAccess: "rw", docker: { network: agentNetwork } } },
              research: { sandbox: { workspaceAccess: "ro", docker: { network: agentNetwork } } },
            },
          },
        };
        const originalConfig = structuredClone(config);
        const projected = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
        expect(listAgentIds(projected)).toContain(
          resolveEnterprisePersonalAgentId(config, account),
        );
        expect(listAgentIds(projected)).toContain("research");
        for (const agentId of listAgentIds(projected)) {
          expect(resolveSandboxConfigForAgent(projected, agentId)).toMatchObject({
            mode: "all",
            backend: "docker",
            scope: "session",
            docker: { network: expectedNetwork },
          });
        }
        expect(config).toEqual(originalConfig);
      });
    },
  );

  it("projects only granted agents, skills, tools, and a private workspace", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const researchWorkspace = state.path("research-template");
      mkdirSync(researchWorkspace, { recursive: true });
      writeFileSync(`${researchWorkspace}/AGENTS.md`, "shared template");
      const account = createEnterpriseAccount({
        username: "employee.policy",
        accessPresetKey: "standard-coding@1",
        displayName: "Employee Policy",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      replaceEnterpriseEntitlements(account.id, [
        { resourceType: "agent", resourceId: "agent:shared:research", effect: "allow" },
        { resourceType: "agent", resourceId: "agent:shared:finance", effect: "deny" },
        {
          resourceType: "skill",
          resourceId: "skill:agent:research:openclaw-workspace:search",
          effect: "allow",
        },
        { resourceType: "tool", resourceId: "tool:core:read", effect: "allow" },
        { resourceType: "tool", resourceId: "tool:core:exec", effect: "allow" },
      ]);
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: {
          entries: {
            main: { workspace: state.workspaceDir, skills: ["search", "private"] },
            research: { workspace: researchWorkspace, skills: ["search", "private"] },
            finance: { workspace: state.path("finance") },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account);
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      expect(listAgentIds(projected)).toEqual([personalAgentId, "research"]);
      expect(resolveAgentConfig(projected, "research")?.workspace).toContain(account.profileId);
      expect(resolveAgentConfig(projected, "research")?.skills).toEqual(["search"]);
      expect(resolveAgentConfig(projected, "research")?.sandbox).toMatchObject({
        mode: "all",
        scope: "session",
        workspaceAccess: "rw",
      });
      expect(resolveAgentConfig(projected, "research")?.tools).toMatchObject({
        alsoAllow: expect.arrayContaining([
          "read",
          "write",
          "edit",
          "apply_patch",
          "exec",
          "process",
        ]),
        deny: expect.arrayContaining([
          "elevated",
          "gateway",
          "terminal",
          "nodes",
          "computer",
          "file_write",
        ]),
        fs: { workspaceOnly: true },
        elevated: { enabled: false },
        exec: { host: "sandbox", applyPatch: { workspaceOnly: true } },
      });
      expect(projected.tools?.allow).toEqual([
        "apply_patch",
        "edit",
        "enterprise_specialists_list",
        "exec",
        "process",
        "read",
        "write",
      ]);

      const session = createEnterpriseSession(account.id);
      const admission = prepareEnterpriseGatewayRequest({
        client: client(account.profileId, session.sessionId),
        context: { getRuntimeConfig: () => config } as GatewayRequestContext,
        method: "chat.send",
        requestParams: { agentId: personalAgentId },
      });
      expect(admission.allowed).toBe(true);
      if (admission.allowed) {
        const scopedConfig = admission.context.getRuntimeConfig();
        expect(isGatewayRequestScopedRuntimeConfig(scopedConfig)).toBe(true);
        expect(admission.context.resolveGatewayContext?.()?.getRuntimeConfig()).toBe(scopedConfig);
        expect(
          readGatewayRequestRuntimeMetadata(
            scopedConfig,
          )?.enterpriseDelegation?.resolveExplicitAgentIds?.("Gọi Agent finance"),
        ).toEqual(["finance"]);
        expect(listAgentIds(scopedConfig)).not.toContain("finance");
      }
    });
  });

  it("keeps specialist skills on the specialist without granting them to Personal", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.specialist-skill",
        displayName: "Specialist Skill Employee",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      replaceEnterpriseEntitlements(account.id, [
        { resourceType: "agent", resourceId: "agent:shared:hrm", effect: "allow" },
      ]);
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          entries: {
            main: { workspace: state.workspaceDir, skills: ["hr-skill"] },
            hrm: { workspace: state.path("hrm"), skills: ["hr-skill"] },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account);
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);

      expect(resolveAgentConfig(projected, personalAgentId)?.skills).toEqual([]);
      expect(resolveAgentConfig(projected, "hrm")?.skills).toEqual(["hr-skill"]);
      expect(listAgentIds(projected)).toContain("hrm");
    });
  });

  it("authorizes only routable specialists for the managed depth-one delegate spawn", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "employee.managed-delegation",
        displayName: "Managed Delegation Employee",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      replaceEnterpriseEntitlements(account.id, [
        { resourceType: "agent", resourceId: "agent:shared:contracts", effect: "allow" },
        { resourceType: "agent", resourceId: "agent:shared:draft-agent", effect: "allow" },
      ]);
      writeEnterpriseDelegationPolicy(0, {
        rollout: "on",
        routerModel: "test/router-model",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          defaults: { subagents: { allowAgents: ["*"], maxSpawnDepth: 4 } },
          entries: {
            main: {},
            contracts: {
              description: "Reviews business contract terms, obligations, and risks.",
              delegationTarget: {
                status: "active",
                aliases: ["contract specialist"],
                handlingMode: "auto_when_certain",
                useWhen: ["review a contract penalty clause", "assess risks before signing"],
                avoidWhen: [],
                requiredInputs: [],
              },
            },
            "draft-agent": {
              description: "A draft specialist that must not be routed yet.",
              delegationTarget: {
                status: "draft",
                aliases: [],
                handlingMode: "auto_when_certain",
                useWhen: ["handle one draft-only task", "handle another draft-only task"],
                avoidWhen: [],
                requiredInputs: [],
              },
            },
          },
        },
      };

      const projected = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);

      expect(resolveAgentConfig(projected, personalAgentId)?.subagents).toMatchObject({
        allowAgents: ["contracts"],
        requireAgentId: true,
      });
      expect(projected.agents?.defaults?.subagents?.maxSpawnDepth).toBe(1);
      expect(resolveAgentConfig(projected, "contracts")?.tools?.deny).toEqual(
        expect.arrayContaining(["enterprise_delegate", "sessions_yield"]),
      );
      expect(resolveAgentConfig(projected, "draft-agent")?.subagents?.allowAgents).toBeUndefined();
    });
  });

  it("denies ungranted agents and administrative Gateway methods", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "employee.deny",
        displayName: "Employee Deny",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: {}, finance: {} } },
      };
      const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
      const session = createEnterpriseSession(account.id);

      expect(
        prepareEnterpriseGatewayRequest({
          client: client(account.profileId, session.sessionId),
          context,
          method: "chat.send",
          requestParams: { agentId: "finance" },
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_AGENT_DENIED" });
      expect(
        prepareEnterpriseGatewayRequest({
          client: client(account.profileId, session.sessionId, true),
          context,
          method: "cron.update",
          requestParams: { id: "job-1", patch: { agentId: "finance" } },
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_AGENT_DENIED" });
      expect(
        prepareEnterpriseGatewayRequest({
          client: client(account.profileId, session.sessionId),
          context,
          method: "config.set",
          requestParams: {},
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_METHOD_DENIED" });
    });
  });

  it("lets administrators use shared agents through the user portal without admin methods", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "administrator.user-portal",
        displayName: "Administrator User Portal",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
        accessPresetKey: "standard-coding@1",
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: {
          entries: {
            main: { tools: { profile: "minimal" } },
            hieu: {},
            openclaw: {},
          },
        },
      };
      const unconfiguredUserConfig = projectEnterpriseRuntimeConfig(config, account, {
        userAudience: true,
      });
      expect(unconfiguredUserConfig.tools?.allow).toEqual([]);
      expect(unconfiguredUserConfig.tools?.deny).toContain("*");
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: "full",
        alsoAllow: ["web_search"],
        deny: ["write"],
      });
      const context = { getRuntimeConfig: () => config } as GatewayRequestContext;
      const session = createEnterpriseSession(account.id);
      const portalClient = createEnterpriseUserGatewayClient(account, session.sessionId);

      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      expect(
        [...resolveEnterpriseAllowedAgentIds(config, account, { userAudience: true })].toSorted(),
      ).toEqual([personalAgentId, "hieu", "main"].toSorted());
      const admission = prepareEnterpriseGatewayRequest({
        client: portalClient,
        context,
        method: "chat.send",
        requestParams: { agentId: personalAgentId },
      });
      expect(admission.allowed).toBe(true);
      if (admission.allowed) {
        const runtimeConfig = admission.context.getRuntimeConfig();
        expect(listAgentIds(runtimeConfig)).toEqual([personalAgentId, "main", "hieu"]);
        const inventory = resolveEffectiveToolInventory({
          cfg: runtimeConfig,
          agentId: personalAgentId,
          modelApi: null,
        });
        const effectiveToolIds = inventory.groups.flatMap((group) =>
          group.tools.map((tool) => tool.id),
        );
        expect(effectiveToolIds).toContain("web_search");
        expect(effectiveToolIds).not.toContain("write");
        expect(effectiveToolIds).not.toContain("gateway");
      }
      expect(
        prepareEnterpriseGatewayRequest({
          client: portalClient,
          context,
          method: "sessions.create",
          requestParams: { agentId: "openclaw" },
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_AGENT_DENIED" });
      expect(
        prepareEnterpriseGatewayRequest({
          client: portalClient,
          context,
          method: "config.set",
          requestParams: {},
        }),
      ).toMatchObject({ allowed: false, reason: "ENTERPRISE_METHOD_DENIED" });
    });
  });

  it("projects Admin grants through sandbox denies while preserving account denies", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "administrator.sandbox-tools",
        displayName: "Administrator Sandbox Tools",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          defaults: { sandbox: { mode: "all", scope: "session" } },
          entries: {
            main: { workspace: state.workspaceDir, tools: { profile: "minimal" } },
          },
        },
        tools: {
          sandbox: {
            tools: { deny: ["browser"] },
          },
        },
      };
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: "coding",
        alsoAllow: ["browser", "x_search"],
        deny: ["session_status"],
      });

      const projected = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const projectedAgent = resolveAgentConfig(projected, personalAgentId);
      const sandboxPolicy = resolveSandboxToolPolicyForAgent(projected, personalAgentId);
      const sandboxConfig = resolveSandboxConfigForAgent(projected, personalAgentId);

      expect(projectedAgent?.tools?.sandbox?.tools?.alsoAllow).toEqual(
        expect.arrayContaining(["browser", "web_fetch", "web_search", "x_search"]),
      );
      expect(projectedAgent?.tools?.deny).toEqual(
        expect.arrayContaining(["gateway", "session_status", "terminal"]),
      );
      expect(isToolAllowed(sandboxPolicy, "web_fetch")).toBe(true);
      expect(isToolAllowed(sandboxPolicy, "web_search")).toBe(true);
      expect(isToolAllowed(sandboxPolicy, "browser")).toBe(true);
      expect(isToolAllowed(sandboxPolicy, "x_search")).toBe(true);
      expect(isToolAllowed(sandboxPolicy, "session_status")).toBe(false);
      for (const toolId of ["gateway", "terminal", "screen", "nodes"]) {
        expect(isToolAllowed(sandboxPolicy, toolId)).toBe(false);
      }
      expect(sandboxConfig).toMatchObject({
        mode: "all",
        backend: "docker",
        workspaceAccess: "rw",
        docker: { network: "bridge" },
      });
      expect(config.tools?.sandbox?.tools).toEqual({ deny: ["browser"] });
      expect(resolveAgentConfig(config, "main")?.tools).toEqual({ profile: "minimal" });
    });
  });

  it("does not retain a personal agent through defaultAgentId after personal access is disabled", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "employee.revoked-personal",
        displayName: "Employee Revoked Personal",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: false,
        defaultAgentId: "main",
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: {}, research: {} } },
      };

      expect([...resolveEnterpriseAllowedAgentIds(config, account)]).toEqual([]);
    });
  });
});
