import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";

const mocks = vi.hoisted(() => ({
  skillsVersion: 1,
  pluginVersion: 1,
  clearPluginCache: undefined as (() => void) | undefined,
  buildSkills: vi.fn(),
  buildTools: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentEntries: () => [{ id: "research", name: "Research" }],
  resolveAgentWorkspaceDir: () => "/tmp/research",
}));
vi.mock("../../gateway/server-methods/tools-catalog.js", () => ({
  buildToolsCatalogResult: mocks.buildTools,
}));
vi.mock("../../agents/tool-catalog.js", () => ({
  listCoreToolSections: () => [],
}));
vi.mock("../../plugins/plugin-metadata-lifecycle.js", () => ({
  registerPluginMetadataProcessMemoLifecycleClear: (clear: () => void) => {
    mocks.clearPluginCache = clear;
  },
}));
vi.mock("../../plugins/runtime.js", () => ({
  getActivePluginRegistryVersion: () => mocks.pluginVersion,
}));
vi.mock("../../skills/discovery/status.js", () => ({
  buildWorkspaceSkillStatus: mocks.buildSkills,
}));
vi.mock("../../skills/loading/workspace-skill-loader.js", () => ({
  loadWorkspaceSkills: () => [],
}));
vi.mock("../../skills/runtime/refresh-state.js", () => ({
  getSkillsSnapshotVersion: () => mocks.skillsVersion,
}));
vi.mock("../../system-agent/agent-id.js", () => ({
  isReservedSystemAgentId: () => false,
}));
vi.mock("../accounts/account-store.js", () => ({
  listEnterpriseAccounts: () => [],
}));
vi.mock("../delegation/delegation-candidates.js", () => ({
  enterpriseDelegationCountsForAgent: () => ({ assigned: 0, effective: 0, routable: 0 }),
}));
vi.mock("../entitlements/entitlement-store.js", () => ({
  listEnterpriseEntitlements: () => [],
  listEnterpriseEntitlementsForResource: () => [],
  resolveEnterpriseResourceAccess: () => ({ allowed: false, reason: "not_granted" }),
}));
vi.mock("../knowledge/knowledge-evidence-transfer-policy.js", () => ({
  isKnowledgeEvidenceTransferTarget: () => false,
}));

const {
  listEnterpriseAgentCatalog,
  listEnterpriseSkillCatalog,
  listEnterpriseToolCatalog,
  prewarmEnterpriseCatalogs,
} = await import("./enterprise-catalog.js");

describe("Enterprise Agent catalog capability cache", () => {
  beforeEach(() => {
    mocks.skillsVersion += 1;
    mocks.buildSkills.mockReset().mockReturnValue({ skills: [{}, {}] });
    mocks.buildTools.mockReset().mockReturnValue({ groups: [{ tools: [{}] }] });
  });

  it("reuses capability counts until skills, plugins, or config change", () => {
    const config = { agents: { entries: { research: { name: "Research" } } } } as OpenClawConfig;

    expect(listEnterpriseAgentCatalog(config).shared[0]).toMatchObject({
      skillCount: 2,
      toolCount: 1,
    });
    listEnterpriseAgentCatalog(config);
    expect(mocks.buildSkills).toHaveBeenCalledTimes(2);
    expect(mocks.buildTools).toHaveBeenCalledTimes(1);

    mocks.skillsVersion += 1;
    listEnterpriseAgentCatalog(config);
    mocks.clearPluginCache?.();
    listEnterpriseAgentCatalog(config);
    listEnterpriseAgentCatalog({ ...config, enterprise: { enabled: true } });

    expect(mocks.buildSkills).toHaveBeenCalledTimes(8);
    expect(mocks.buildTools).toHaveBeenCalledTimes(3);
  });

  it("reuses intrinsic skill and tool inventory without caching account access", () => {
    const config = { agents: { entries: { research: { name: "Research" } } } } as OpenClawConfig;
    mocks.buildSkills.mockReturnValue({
      skills: [
        {
          source: "openclaw-workspace",
          bundled: false,
          skillKey: "research",
          name: "Research",
          description: "",
          disabled: false,
          eligible: true,
          platformIncompatible: false,
          missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
        },
      ],
    });
    mocks.buildTools.mockReturnValue({
      groups: [
        {
          tools: [{ id: "read", label: "Read", description: "", source: "core", risk: "low" }],
        },
      ],
    });

    prewarmEnterpriseCatalogs(config);
    listEnterpriseSkillCatalog(config);
    expect(mocks.buildSkills).toHaveBeenCalledTimes(2);

    listEnterpriseToolCatalog(config);
    expect(mocks.buildTools).toHaveBeenCalledTimes(1);

    mocks.skillsVersion += 1;
    listEnterpriseSkillCatalog(config);
    expect(mocks.buildSkills).toHaveBeenCalledTimes(4);

    mocks.clearPluginCache?.();
    listEnterpriseToolCatalog(config);
    expect(mocks.buildTools).toHaveBeenCalledTimes(2);
  });
});
