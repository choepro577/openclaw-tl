import { afterEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { buildEnterpriseUserBootstrapV2 } from "./user-bootstrap-service.js";

const catalog = vi.hoisted(() => ({ capabilityLabels: vi.fn() }));
const access = vi.hoisted(() => ({ read: vi.fn() }));
const relationship = vi.hoisted(() => ({ read: vi.fn() }));
afterEach(() => {
  catalog.capabilityLabels.mockReset();
  access.read.mockReset();
  relationship.read.mockReset();
});

vi.mock("./user-agent-roster.js", () => ({
  listEnterpriseUserSharedAgentRoster: () => ({
    catalogRevision: "current",
    shared: ["finance", "support"].map((id) => ({
      agentId: id,
      resourceKey: id,
      name: id,
      description: "",
    })),
  }),
  resolveEnterpriseUserPersonalRuntime: (_config: unknown, account: EnterpriseAccount) => ({
    accountId: account.id,
    enabled: account.enabled && account.personalAgentEnabled,
    runtimeAgentId: `personal-${account.id}`,
  }),
  listEnterpriseUserCapabilityLabels: catalog.capabilityLabels,
}));
vi.mock("../entitlements/entitlement-store.js", () => ({
  resolveEnterpriseResourceAccess: () => ({ allowed: true }),
}));
vi.mock("../agents/agent-access-request-service.js", () => ({
  readEnterpriseUserAgentAccess: access.read,
}));
vi.mock("../knowledge/knowledge-store.js", () => ({ listKnowledgeZones: () => ({ items: [] }) }));
vi.mock("./personal-agent-profile-store.js", () => ({
  readPersonalAgentProfile: () => ({ name: "Personal", greeting: "", avatarPreset: "sparkles" }),
}));
vi.mock("./shared-agent-relationship-store.js", () => ({
  readSharedAgentRelationship: relationship.read,
}));

describe("Enterprise user bootstrap skill catalog", () => {
  it("preserves agent labels and fresh account access", () => {
    access.read.mockReturnValue({ allowed: true, reason: "explicit_allow", request: null });
    relationship.read.mockReturnValue({ agentAlias: "" });
    const first: EnterpriseAccount = {
      id: "first",
      profileId: "profile-first",
      username: "first",
      displayName: "First",
      role: "employee",
      mustChangePassword: false,
      enabled: true,
      personalAgentEnabled: true,
      defaultAgentId: null,
      accessPresetKey: "default",
      policyRevision: 1,
      createdAt: 0,
      updatedAt: 0,
      lastLoginAt: null,
    };
    let financeAllowed = true;
    catalog.capabilityLabels.mockImplementation(
      (_config: unknown, current: EnterpriseAccount, agentId: string) => {
        if (current.id !== "first") {
          return [];
        }
        if (agentId === "personal-first") {
          return ["Personal skill"];
        }
        if (agentId === "finance" && financeAllowed) {
          return ["Finance skill"];
        }
        return agentId === "support" ? ["Support skill"] : [];
      },
    );

    const bootstrap = buildEnterpriseUserBootstrapV2({}, first);
    expect(bootstrap.agents.map((agent) => agent.capabilityLabels)).toEqual([
      ["Personal skill"],
      ["Finance skill"],
      ["Support skill"],
    ]);
    financeAllowed = false;
    const refreshed = buildEnterpriseUserBootstrapV2({}, first);
    expect(refreshed.agents[1].capabilityLabels).toEqual([]);

    const second = { ...first, id: "second", profileId: "profile-second" };
    const otherAccount = buildEnterpriseUserBootstrapV2({}, second);
    expect(otherAccount.agents.every((agent) => agent.capabilityLabels.length === 0)).toBe(true);
    expect(catalog.capabilityLabels).toHaveBeenCalledWith({}, second, "personal-second");
  });

  it("keeps denied shared Agents discoverable without private fields or an invalid default", () => {
    const account: EnterpriseAccount = {
      id: "first",
      profileId: "profile-first",
      username: "first",
      displayName: "First",
      role: "employee",
      mustChangePassword: false,
      enabled: true,
      personalAgentEnabled: true,
      defaultAgentId: "finance",
      accessPresetKey: "default",
      policyRevision: 1,
      createdAt: 0,
      updatedAt: 0,
      lastLoginAt: null,
    };
    access.read.mockImplementation((_account: EnterpriseAccount, resourceKey: string) =>
      resourceKey === "support"
        ? { allowed: true, reason: "explicit_allow", request: null }
        : {
            allowed: false,
            reason: "not_granted",
            request: {
              id: "request-finance",
              agentKey: "shared:finance",
              state: "pending",
              decisionReason: null,
              revision: 1,
              createdAt: 1,
              updatedAt: 1,
              decidedAt: null,
            },
          },
    );
    relationship.read.mockReturnValue({ agentAlias: "Private alias" });
    catalog.capabilityLabels.mockImplementation(
      (_config: unknown, _account: EnterpriseAccount, agentId: string) =>
        agentId === "finance" ? ["Finance private skill"] : ["Support skill"],
    );

    const bootstrap = buildEnterpriseUserBootstrapV2({}, account);
    const finance = bootstrap.agents.find(
      (agent) => agent.kind === "shared" && agent.canonicalName === "finance",
    );
    const support = bootstrap.agents.find(
      (agent) => agent.kind === "shared" && agent.canonicalName === "support",
    );
    expect(finance).toMatchObject({
      name: "finance",
      relationship: null,
      capabilityLabels: [],
      actions: { canChat: false, canSchedule: false, canRequestAccess: false },
    });
    expect(support).toMatchObject({
      name: "Private alias",
      actions: { canChat: true, canSchedule: true },
    });
    expect(bootstrap.defaultAgentKey).toBe("personal");
    expect(relationship.read).toHaveBeenCalledTimes(1);
    expect(relationship.read).toHaveBeenCalledWith("first", "support", "First");
  });
});
