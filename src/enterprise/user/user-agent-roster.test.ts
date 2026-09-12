import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseUserCapabilityLabels } from "./user-agent-roster.js";

const state = vi.hoisted(() => ({
  listAgentEntries: vi.fn(),
  resolveAgentWorkspaceDir: vi.fn(),
  buildWorkspaceSkillStatus: vi.fn(),
  resolveEnterpriseResourceAccess: vi.fn(),
  resolveEnterpriseSharedAgentCapabilities: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentEntries: state.listAgentEntries,
  resolveAgentWorkspaceDir: state.resolveAgentWorkspaceDir,
}));
vi.mock("../../skills/discovery/status.js", () => ({
  buildWorkspaceSkillStatus: state.buildWorkspaceSkillStatus,
}));
vi.mock("../entitlements/entitlement-store.js", () => ({
  resolveEnterpriseResourceAccess: state.resolveEnterpriseResourceAccess,
}));
vi.mock("../isolation/enterprise-agent-capabilities.js", () => ({
  resolveEnterpriseSharedAgentCapabilities: state.resolveEnterpriseSharedAgentCapabilities,
}));

const account: EnterpriseAccount = {
  id: "account-1",
  profileId: "profile-1",
  username: "employee-1",
  displayName: "Employee 1",
  role: "employee",
  mustChangePassword: false,
  enabled: true,
  personalAgentEnabled: true,
  defaultAgentId: null,
  accessPresetKey: "none",
  policyRevision: 7,
  createdAt: 1,
  updatedAt: 1,
  lastLoginAt: null,
};

const config: OpenClawConfig = {
  agents: { entries: { specialist: { name: "Specialist" } } },
};

const skillFixtures = [
  {
    name: "Ready",
    skillKey: "ready",
    source: "openclaw-workspace",
    disabled: false,
    eligible: true,
    platformIncompatible: false,
  },
  {
    name: "Ready",
    skillKey: "ready-duplicate",
    source: "openclaw-workspace",
    disabled: false,
    eligible: true,
    platformIncompatible: false,
  },
  {
    name: "Project ready",
    skillKey: "project-ready",
    source: "agents-skills-project",
    disabled: false,
    eligible: true,
    platformIncompatible: false,
  },
  {
    name: "Denied",
    skillKey: "denied",
    source: "openclaw-workspace",
    disabled: false,
    eligible: true,
    platformIncompatible: false,
  },
  {
    name: "Disabled",
    skillKey: "disabled",
    source: "openclaw-workspace",
    disabled: true,
    eligible: false,
    platformIncompatible: false,
  },
  {
    name: "Wrong platform",
    skillKey: "wrong-platform",
    source: "openclaw-workspace",
    disabled: false,
    eligible: false,
    platformIncompatible: true,
  },
  {
    name: "Needs setup",
    skillKey: "needs-setup",
    source: "openclaw-workspace",
    disabled: false,
    eligible: false,
    platformIncompatible: false,
  },
  {
    name: "Managed",
    skillKey: "managed",
    source: "openclaw-managed",
    disabled: false,
    eligible: true,
    platformIncompatible: false,
  },
].map((fixture) =>
  Object.assign(fixture, {
    description: `${fixture.name} description`,
    filePath: `/fixture/${fixture.skillKey}/SKILL.md`,
    baseDir: `/fixture/${fixture.skillKey}`,
  }),
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("Enterprise user agent roster capability labels", () => {
  it("matches the user-visible catalog predicate for ready, scoped, and allowed skills", () => {
    state.listAgentEntries.mockReturnValue([{ id: "specialist" }]);
    state.resolveAgentWorkspaceDir.mockReturnValue("/fixture/workspace");
    state.buildWorkspaceSkillStatus.mockReturnValue({ skills: skillFixtures });
    state.resolveEnterpriseSharedAgentCapabilities.mockReturnValue({
      allowed: true,
      scope: "shared",
      accountId: account.id,
      agentId: "specialist",
      revision: "fixture-revision",
      config,
      skillsSnapshot: {
        prompt: "",
        skills: [{ name: "Ready" }, { name: "Project ready" }],
      },
    });

    const labels = listEnterpriseUserCapabilityLabels(config, account, "specialist");

    expect(labels).toEqual(["Ready", "Project ready"]);
    expect(state.resolveEnterpriseSharedAgentCapabilities).toHaveBeenCalledWith({
      config,
      account,
      agentId: "specialist",
    });
  });

  it("does not scan an unconfigured personal runtime workspace", () => {
    state.listAgentEntries.mockReturnValue([{ id: "specialist" }]);
    state.resolveEnterpriseSharedAgentCapabilities.mockReturnValue({
      allowed: false,
      accountId: account.id,
      agentId: "enterprise-personal-account-1",
      reason: "agent_not_configured",
    });

    expect(
      listEnterpriseUserCapabilityLabels(config, account, "enterprise-personal-account-1"),
    ).toEqual([]);
    expect(state.resolveEnterpriseSharedAgentCapabilities).toHaveBeenCalledWith({
      config,
      account,
      agentId: "enterprise-personal-account-1",
    });
  });
});
