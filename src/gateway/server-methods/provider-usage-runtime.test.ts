import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthProfileStore } from "../../agents/auth-profiles.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";

const mocks = vi.hoisted(() => ({
  createRuntimeProviderAuthLookup: vi.fn(),
  ensureAuthProfileStore: vi.fn(),
  externalCliDiscoveryForConfigStatus: vi.fn(),
  listProviderUsagePluginDescriptors: vi.fn(),
  resolveEnvApiKey: vi.fn(),
  resolveUsableCustomProviderApiKey: vi.fn(),
}));

vi.mock("../../agents/auth-profiles.js", async () => {
  const actual = await vi.importActual<typeof import("../../agents/auth-profiles.js")>(
    "../../agents/auth-profiles.js",
  );
  return {
    ...actual,
    ensureAuthProfileStore: mocks.ensureAuthProfileStore,
    externalCliDiscoveryForConfigStatus: mocks.externalCliDiscoveryForConfigStatus,
  };
});

vi.mock("../../agents/model-auth-env.js", async () => {
  const actual = await vi.importActual<typeof import("../../agents/model-auth-env.js")>(
    "../../agents/model-auth-env.js",
  );
  return { ...actual, resolveEnvApiKey: mocks.resolveEnvApiKey };
});

vi.mock("../../agents/model-auth.js", async () => {
  const actual = await vi.importActual<typeof import("../../agents/model-auth.js")>(
    "../../agents/model-auth.js",
  );
  return {
    ...actual,
    createRuntimeProviderAuthLookup: mocks.createRuntimeProviderAuthLookup,
    resolveUsableCustomProviderApiKey: mocks.resolveUsableCustomProviderApiKey,
  };
});

vi.mock("../../plugins/provider-runtime.js", async () => {
  const actual = await vi.importActual<typeof import("../../plugins/provider-runtime.js")>(
    "../../plugins/provider-runtime.js",
  );
  return {
    ...actual,
    listProviderUsagePluginDescriptors: mocks.listProviderUsagePluginDescriptors,
  };
});

import {
  clearProviderUsageRuntimeSnapshot,
  getProviderUsageRuntimeSnapshot,
} from "./provider-usage-runtime.js";

const config = {} as OpenClawConfig;
const store = {
  version: 1,
  profiles: {},
} as AuthProfileStore;

describe("provider usage runtime preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProviderUsageRuntimeSnapshot();
    mocks.ensureAuthProfileStore.mockReturnValue(store);
    mocks.externalCliDiscoveryForConfigStatus.mockReturnValue(undefined);
    mocks.listProviderUsagePluginDescriptors.mockReturnValue([
      { provider: "alpha", displayName: "Alpha" },
      { provider: "beta", displayName: "Beta" },
    ]);
    mocks.createRuntimeProviderAuthLookup.mockReturnValue({
      envApiKey: {
        aliasMap: { alpha: "alpha" },
        candidateMap: { alpha: ["ALPHA_API_KEY"] },
        authEvidenceMap: {},
        skipSetupProviderFallback: true,
      },
    });
    mocks.resolveUsableCustomProviderApiKey.mockReturnValue(null);
    mocks.resolveEnvApiKey.mockReturnValue(null);
  });

  it("builds env auth lookup maps once for all usage providers", () => {
    getProviderUsageRuntimeSnapshot({ config, agentDir: "agent-dir", agentId: "main" });

    expect(mocks.createRuntimeProviderAuthLookup).toHaveBeenCalledTimes(1);
    expect(mocks.resolveEnvApiKey).toHaveBeenCalledTimes(2);
    for (const call of mocks.resolveEnvApiKey.mock.calls) {
      expect(call[2]).toEqual(
        expect.objectContaining({
          aliasMap: { alpha: "alpha" },
          candidateMap: { alpha: ["ALPHA_API_KEY"] },
          authEvidenceMap: {},
          // Providers without env candidates still retain the setup-provider fallback.
          skipSetupProviderFallback: false,
        }),
      );
    }
  });
});
