import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../../config/types.openclaw.js";
import type { OAuthCredential } from "../../auth-profiles.js";
import { testing as externalAuthTesting } from "../../auth-profiles/external-auth.test-support.js";
import {
  clearRuntimeAuthProfileStoreSnapshots,
  setRuntimeAuthProfileStoreSnapshot,
} from "../../auth-profiles/runtime-snapshots.js";
import { prepareAgentRuntimeAuth } from "../../runtime-plan/prepare-auth.js";
import { testing as authPlanTesting } from "./auth-plan.test-support.js";

const readCodexCliCredentialsCachedMock = vi.hoisted(() =>
  vi.fn<(_options?: unknown) => OAuthCredential | null>(() => null),
);

vi.mock("../../cli-credentials.js", () => ({
  readClaudeCliCredentialsCached: () => null,
  readCodexCliCredentialsCached: readCodexCliCredentialsCachedMock,
  readMiniMaxCliCredentialsCached: () => null,
}));

describe("embedded run auth plan provider pin", () => {
  let agentDir: string;
  let inheritedAuthDir: string;

  beforeEach(async () => {
    agentDir = await mkdtemp(join(tmpdir(), "openclaw-auth-pin-"));
    inheritedAuthDir = await mkdtemp(join(tmpdir(), "openclaw-auth-inherited-"));
    readCodexCliCredentialsCachedMock.mockReset().mockReturnValue({
      type: "oauth",
      provider: "openai",
      access: "codex-access-token",
      refresh: "codex-refresh-token",
      expires: Date.now() + 30 * 60_000,
    });
    externalAuthTesting.setResolveExternalAuthProfilesForTest(() => []);
  });

  afterEach(async () => {
    externalAuthTesting.resetResolveExternalAuthProfilesForTest();
    clearRuntimeAuthProfileStoreSnapshots();
    vi.unstubAllEnvs();
    await rm(agentDir, { recursive: true, force: true });
    await rm(inheritedAuthDir, { recursive: true, force: true });
  });

  it("loads a request-scoped synthetic agent's pinned profile from its auth inheritance owner", () => {
    const profileId = "openai:setup-enterprise-personal";
    setRuntimeAuthProfileStoreSnapshot(
      {
        version: 1,
        profiles: {
          [profileId]: {
            type: "oauth",
            provider: "openai",
            access: "inherited-access-token",
            refresh: "inherited-refresh-token",
            expires: Date.now() + 30 * 60_000,
          },
        },
      },
      inheritedAuthDir,
    );
    const config = {
      auth: {
        profiles: {
          [profileId]: { provider: "openai", mode: "oauth" },
        },
      },
      agents: {
        defaults: { authInheritance: { agentId: "main" } },
        list: [
          { id: "main", agentDir: inheritedAuthDir },
          { id: "enterprise-personal-account", agentDir },
        ],
      },
    } as OpenClawConfig;

    const authProfileStore = authPlanTesting.loadEmbeddedRunAuthProfileStore({
      agentDir,
      config,
      externalCliProviderIds: ["openai"],
    });
    const prepared = prepareAgentRuntimeAuth({
      provider: "openai",
      modelId: "gpt-5.6-sol",
      modelApi: "openai-chatgpt-responses",
      modelBaseUrl: "https://chatgpt.com/backend-api/codex",
      config,
      env: process.env,
      agentDir,
      authProfileStore,
      sessionAuthProfileId: profileId,
      sessionAuthProfileSource: "user",
    });

    expect(authProfileStore.profiles[profileId]).toMatchObject({
      type: "oauth",
      provider: "openai",
      access: "inherited-access-token",
    });
    expect(prepared.attempts[0]).toMatchObject({
      kind: "profile",
      profileId,
    });
  });

  it("keeps ambient Codex OAuth behind an OpenAI api-key pin", () => {
    const config = {
      models: {
        providers: {
          openai: { auth: "api-key", baseUrl: "", models: [] },
        },
      },
    } as OpenClawConfig;
    vi.stubEnv("OPENAI_API_KEY", "platform-api-key");

    const authProfileStore = authPlanTesting.loadEmbeddedRunAuthProfileStore({
      agentDir,
      config,
      externalCliProviderIds: ["openai"],
    });
    expect(authProfileStore.profiles["openai:default"]).toBeUndefined();
    const prepared = prepareAgentRuntimeAuth({
      provider: "openai",
      modelId: "gpt-5.6-luna",
      modelApi: "openai-chatgpt-responses",
      modelBaseUrl: "https://chatgpt.com/backend-api/codex",
      config,
      env: process.env,
      agentDir,
      authProfileStore,
    });

    expect(prepared.attempts[0]).toMatchObject({
      kind: "direct",
      plan: {
        selectedAuthMode: "api-key",
        modelRoute: {
          authRequirement: "api-key",
        },
      },
    });
  });
});
