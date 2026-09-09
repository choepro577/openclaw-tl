import { afterEach, describe, expect, it } from "vitest";
import { resolveAgentConfig } from "../../agents/agent-scope.js";
import { resolveSandboxToolPolicyForAgent } from "../../agents/sandbox/tool-policy.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import { resolveEffectiveToolInventory } from "../../agents/tools-effective-inventory.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { createEnterpriseSession } from "../auth/session-store.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { personalAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  createKnowledgeGeneration,
  createKnowledgeZone,
  finishKnowledgeGeneration,
  getKnowledgeZone,
  publishKnowledgeCandidate,
  replaceKnowledgeAgentBindings,
} from "../knowledge/knowledge-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { createEnterpriseUserGatewayClient } from "../user/user-gateway-client.js";
import {
  prepareEnterpriseGatewayRequest,
  projectEnterpriseRuntimeConfig,
  resolveEnterpriseAllowedAgentIds,
} from "./enterprise-gateway-policy.js";

const knowledgeTools = ["enterprise_knowledge_get", "enterprise_knowledge_search"];

afterEach(() => closeOpenClawStateDatabaseForTest());

function setup(workspace: string) {
  const account = createEnterpriseAccount({
    username: "knowledge.personal",
    displayName: "Knowledge Personal",
    passwordHash: "test-only",
    role: "employee",
    personalAgentEnabled: true,
    mustChangePassword: false,
  });
  const config: OpenClawConfig = {
    enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
    gateway: { auth: { mode: "accounts" } },
    agents: { entries: { main: { workspace, tools: { profile: "minimal" } } } },
  };
  replaceEnterpriseEntitlements(account.id, [
    { resourceType: "agent", resourceId: "agent:shared:main", effect: "allow" },
  ]);
  const personalId = resolveEnterprisePersonalAgentId(config, account);
  const resourceKey = personalAgentResourceKey(account.id);
  let zone = createKnowledgeZone(
    { slug: "knowledge-policy", name: "Knowledge Policy" },
    account.id,
  );
  zone = replaceKnowledgeAgentBindings(zone.id, [resourceKey], zone.revision, account.id);
  const session = createEnterpriseSession(account.id, {}, "user");
  const gatewayClient = createEnterpriseUserGatewayClient(account, session.sessionId);
  const admit = () => {
    const admission = prepareEnterpriseGatewayRequest({
      client: gatewayClient,
      context: { getRuntimeConfig: () => config } as GatewayRequestContext,
      method: "chat.send",
      requestParams: { agentId: personalId },
    });
    if (!admission.allowed) {
      throw new Error(admission.reason);
    }
    return admission.context.getRuntimeConfig();
  };
  const inventory = (scoped: OpenClawConfig, agentId = personalId) =>
    resolveEffectiveToolInventory({
      cfg: scoped,
      agentId,
      sessionKey: `agent:${agentId}:knowledge-projection`,
      workspaceDir: resolveAgentConfig(scoped, agentId)?.workspace,
      modelApi: null,
    }).groups.flatMap((group) => group.tools.map((tool) => tool.id));
  const publish = () => {
    const generation = createKnowledgeGeneration(
      zone.id,
      zone.sourceSetRevision,
      zone.buildRevision,
    );
    finishKnowledgeGeneration(generation.id, {
      lexicalStatus: "ready",
      vectorStatus: "unavailable",
      artifactChecksum: "test-publication-metadata",
    });
    publishKnowledgeCandidate({
      zoneId: zone.id,
      generationId: generation.id,
      baseRevision: zone.revision,
      actorAccountId: account.id,
      degradedReason: "Capability test: FTS-only publication metadata.",
    });
  };
  return { account, config, personalId, resourceKey, zone, admit, inventory, publish };
}

describe("Enterprise Knowledge request-scoped capability", () => {
  it("appears after publish on the next request and disappears after unbind without extra tool grants", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const fixture = setup(state.workspaceDir);
      expect(fixture.inventory(fixture.admit())).not.toEqual(
        expect.arrayContaining(knowledgeTools),
      );
      fixture.publish();
      const scoped = fixture.admit();
      expect(fixture.inventory(scoped)).toEqual(expect.arrayContaining(knowledgeTools));
      expect(fixture.inventory(scoped, "main")).not.toEqual(expect.arrayContaining(knowledgeTools));
      const sandbox = resolveSandboxToolPolicyForAgent(scoped, fixture.personalId);
      for (const tool of knowledgeTools) {
        expect(isToolAllowedByPolicyName(tool, sandbox)).toBe(true);
      }
      expect(scoped.tools?.deny).toEqual(expect.arrayContaining(["agents_list", "sessions_spawn"]));
      expect(fixture.config.tools).toBeUndefined();
      const current = getKnowledgeZone(fixture.zone.id)!;
      replaceKnowledgeAgentBindings(current.id, [], current.revision, fixture.account.id);
      expect(fixture.inventory(fixture.admit())).not.toEqual(
        expect.arrayContaining(knowledgeTools),
      );
    });
  });

  it.each(["account", "agent", "sandbox"] as const)(
    "keeps explicit %s tool denies effective after a zone binding",
    async (boundary) => {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const fixture = setup(state.workspaceDir);
        fixture.publish();
        if (boundary === "account") {
          replaceEnterpriseEntitlements(fixture.account.id, [
            {
              resourceType: "tool",
              resourceId: "tool:core:enterprise_knowledge_get",
              effect: "deny",
            },
          ]);
        } else if (boundary === "agent") {
          fixture.config.agents!.entries!.main!.tools!.deny = ["enterprise_knowledge_get"];
        } else {
          fixture.config.tools = { sandbox: { tools: { deny: ["enterprise_knowledge_get"] } } };
        }
        const scoped = fixture.admit();
        const sandbox = resolveSandboxToolPolicyForAgent(scoped, fixture.personalId);
        expect(isToolAllowedByPolicyName("enterprise_knowledge_get", sandbox)).toBe(false);
        if (boundary !== "sandbox") {
          expect(fixture.inventory(scoped)).not.toContain("enterprise_knowledge_get");
        }
      });
    },
  );

  it("does not grant Knowledge capability to background projections or another account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const fixture = setup(state.workspaceDir);
      fixture.publish();
      const background = projectEnterpriseRuntimeConfig(fixture.config, fixture.account);
      expect(background.tools?.allow).not.toEqual(expect.arrayContaining(knowledgeTools));
      const other = createEnterpriseAccount({
        username: "knowledge.other",
        displayName: "Other",
        passwordHash: "test-only",
        role: "employee",
      });
      const scopedOther = projectEnterpriseRuntimeConfig(fixture.config, other, {
        userAudience: true,
      });
      expect(scopedOther.tools?.allow).not.toEqual(expect.arrayContaining(knowledgeTools));
    });
  });

  it("uses the canonical Personal deny instead of admitting its synthetic runtime identity", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const fixture = setup(state.workspaceDir);
      replaceEnterpriseEntitlements(fixture.account.id, [
        { resourceType: "agent", resourceId: fixture.resourceKey, effect: "deny" },
      ]);
      expect(resolveEnterpriseAllowedAgentIds(fixture.config, fixture.account)).not.toContain(
        fixture.personalId,
      );
      expect(
        resolveAgentConfig(
          projectEnterpriseRuntimeConfig(fixture.config, fixture.account),
          fixture.personalId,
        ),
      ).toBeUndefined();
      expect(fixture.admit).toThrow("ENTERPRISE_AGENT_DENIED");
    });
  });
});
