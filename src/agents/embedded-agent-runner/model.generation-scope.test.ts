import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthProfileStore } from "../auth-profiles/types.js";

const ensureAuthProfileStoreMock = vi.hoisted(() => vi.fn());

vi.mock("../auth-profiles.js", async (importActual) => {
  const actual = await importActual<typeof import("../auth-profiles.js")>();
  return { ...actual, ensureAuthProfileStore: ensureAuthProfileStoreMock };
});

import type { OpenClawConfig } from "../../config/types.openclaw.js";
import * as manifestNormalization from "../../plugins/manifest-model-id-normalization.js";
import { clearPluginMetadataLifecycleCaches } from "../../plugins/plugin-metadata-lifecycle.js";
import type { ProviderRuntimeModel } from "../../plugins/provider-runtime-model.types.js";
import { withPluginRuntimeGenerationScope } from "../../plugins/runtime/generation-scope.js";
import { setPreparedModelRuntimeAuthStore } from "../prepared-model-runtime-auth.js";
import {
  createModelGenerationFixture,
  publishCurrentModelGeneration,
  resetModelGenerationFixtureState,
} from "./model.generation-scope.test-support.js";
import { resolveModel, resolveModelAsync } from "./model.js";

async function resolveGeneration(generation: ReturnType<typeof createModelGenerationFixture>) {
  const { preparedModelRuntime } = generation;
  const stores = preparedModelRuntime.createStores();
  return await resolveModelAsync(
    generation.requestProvider,
    generation.modelId,
    preparedModelRuntime.agentDir,
    preparedModelRuntime.config,
    {
      ...stores,
      allowBundledStaticCatalogFallback: true,
      preparedModelRuntime,
      skipAgentDiscovery: true,
      workspaceDir: preparedModelRuntime.workspaceDir,
    },
  );
}

describe("model runtime generation scope", () => {
  beforeEach(() => {
    clearPluginMetadataLifecycleCaches();
    ensureAuthProfileStoreMock.mockReset();
    ensureAuthProfileStoreMock.mockReturnValue({ version: 1, profiles: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetModelGenerationFixtureState();
  });

  it("keeps alias, suppression, static metadata, and runtime hooks on the prepared generation", async () => {
    const config = {} satisfies OpenClawConfig;
    const generationA = createModelGenerationFixture({ config, label: "a" });
    const generationB = createModelGenerationFixture({ config, label: "b", suppress: true });
    publishCurrentModelGeneration(generationB);

    const result = await resolveGeneration(generationA);

    expect(result.error).toBeUndefined();
    expect(result.model).toMatchObject({
      provider: generationA.provider,
      name: "Runtime A",
      mediaInput: { image: generationA.staticImagePolicy },
    });
    expect(generationA.resolveDynamicModel).toHaveBeenCalled();
    expect(generationB.resolveDynamicModel).not.toHaveBeenCalled();
  });

  it("keeps concurrent prepared generations isolated across awaited runtime hooks", async () => {
    const config = {} satisfies OpenClawConfig;
    let arrivals = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prepareDynamicModel = async () => {
      arrivals += 1;
      if (arrivals === 2) {
        release();
      }
      await gate;
    };
    const generationA = createModelGenerationFixture({
      config,
      label: "a",
      prepareDynamicModel,
    });
    const generationB = createModelGenerationFixture({
      config,
      label: "b",
      prepareDynamicModel,
    });
    publishCurrentModelGeneration(generationB);

    const [resultA, resultB] = await Promise.all([
      resolveGeneration(generationA),
      resolveGeneration(generationB),
    ]);

    expect(resultA.model).toMatchObject({
      provider: generationA.provider,
      name: "Runtime A",
      mediaInput: { image: generationA.staticImagePolicy },
    });
    expect(resultB.model).toMatchObject({
      provider: generationB.provider,
      name: "Runtime B",
      mediaInput: { image: generationB.staticImagePolicy },
    });
  });

  it("keeps metadata-only prepared generations from borrowing current runtime hooks", async () => {
    const config = {} satisfies OpenClawConfig;
    const generationA = createModelGenerationFixture({
      config,
      label: "a",
      withRegistry: false,
    });
    const generationB = createModelGenerationFixture({ config, label: "b" });
    publishCurrentModelGeneration(generationB);

    const result = await resolveGeneration(generationA);

    expect(result.error).toBeUndefined();
    expect(result.model).toMatchObject({
      provider: generationA.provider,
      name: "Static A",
      mediaInput: { image: generationA.staticImagePolicy },
    });
    expect(generationB.resolveDynamicModel).not.toHaveBeenCalled();
  });

  it("matches configured static models with the prepared id policy without rediscovery", async () => {
    const config = {} satisfies OpenClawConfig;
    const generation = createModelGenerationFixture({
      config,
      label: "a",
      modelIdNormalization: {
        providers: { "generation-a": { aliases: { "legacy-model": "generation-model" } } },
      },
      withRegistry: false,
    });
    const configuredModel = {
      id: "legacy-model",
      name: "Prepared Configured A",
      provider: generation.provider,
      api: "openai-completions" as const,
      baseUrl: `https://${generation.provider}.example.test/v1`,
      reasoning: false,
      input: ["text"] as const,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8_192,
      maxTokens: 2_048,
    } satisfies ProviderRuntimeModel;
    Object.assign(generation.preparedModelRuntime, {
      configuredRuntimeModels: [
        { provider: generation.provider, modelId: "legacy-model", model: configuredModel },
      ],
    });
    generation.metadataSnapshot.pluginIds = ["generation-plugin-a"];
    publishCurrentModelGeneration(createModelGenerationFixture({ config, label: "b" }));
    const normalizeFromDiscovery = vi.spyOn(
      manifestNormalization,
      "normalizeProviderModelIdWithManifest",
    );

    const result = await resolveGeneration(generation);

    expect(result.error).toBeUndefined();
    expect(result.model).toMatchObject({
      provider: generation.provider,
      id: "legacy-model",
      name: "Prepared Configured A",
    });
    expect(normalizeFromDiscovery).not.toHaveBeenCalled();
  });

  it("keeps synchronous resolution on the exact scoped generation", () => {
    const config = {} satisfies OpenClawConfig;
    const generationA = createModelGenerationFixture({ config, label: "a" });
    const generationB = createModelGenerationFixture({ config, label: "b" });
    publishCurrentModelGeneration(generationB);
    const stores = generationA.preparedModelRuntime.createStores();

    const result = withPluginRuntimeGenerationScope(generationA.preparedModelRuntime, () =>
      resolveModel(
        generationA.requestProvider,
        generationA.modelId,
        generationA.preparedModelRuntime.agentDir,
        config,
        {
          ...stores,
          workspaceDir: generationA.preparedModelRuntime.workspaceDir,
        },
      ),
    );

    expect(result.model).toMatchObject({
      provider: generationA.provider,
      name: "Runtime A",
    });
    expect(generationB.resolveDynamicModel).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "keeps provider and configured model aliases on prepared policies without rediscovery (runtime=%s)",
    async (withRegistry) => {
      const config: OpenClawConfig = {
        agents: {
          defaults: {
            models: {
              "generation-a/unrelated": { params: { temperature: 0.9 } },
              "generation-a/legacy-model": { params: { temperature: 0.2 } },
            },
          },
        },
      };
      const generation = createModelGenerationFixture({
        config,
        label: "a",
        withRegistry,
        modelIdNormalization: {
          providers: { "generation-a": { aliases: { "legacy-model": "generation-model" } } },
        },
      });
      // A scoped execution generation must not fall back to global discovery in model loops.
      generation.metadataSnapshot.pluginIds = ["generation-plugin-a"];
      publishCurrentModelGeneration(createModelGenerationFixture({ config, label: "b" }));
      const normalizeFromDiscovery = vi.spyOn(
        manifestNormalization,
        "normalizeProviderModelIdWithManifest",
      );

      const result = await resolveGeneration(generation);

      expect(result.error).toBeUndefined();
      expect(result.model).toMatchObject({
        provider: generation.provider,
        params: { temperature: 0.2 },
      });
      expect(normalizeFromDiscovery).not.toHaveBeenCalled();
    },
  );

  it("uses the prepared auth owner for dynamic model resolution without rehydrating auth", async () => {
    const config = {} satisfies OpenClawConfig;
    const generation = createModelGenerationFixture({ config, label: "prepared-auth" });
    const preparedAuthStore: AuthProfileStore = {
      version: 1,
      profiles: {
        prepared: {
          type: "api_key",
          provider: generation.provider,
          key: "prepared-key",
        },
      },
    };
    const globalAuthStore: AuthProfileStore = {
      version: 1,
      profiles: {
        global: {
          type: "oauth",
          provider: generation.provider,
          access: "global-access",
          refresh: "global-refresh",
          expires: Date.now() + 60_000,
        },
      },
    };
    setPreparedModelRuntimeAuthStore(generation.preparedModelRuntime, preparedAuthStore);
    ensureAuthProfileStoreMock.mockReturnValue(globalAuthStore);
    const stores = generation.preparedModelRuntime.createStores();

    const result = await resolveModelAsync(
      generation.provider,
      generation.modelId,
      generation.preparedModelRuntime.agentDir,
      config,
      {
        ...stores,
        authProfileId: "prepared",
        preparedModelRuntime: generation.preparedModelRuntime,
        skipAgentDiscovery: true,
        workspaceDir: generation.preparedModelRuntime.workspaceDir,
      },
    );

    expect(result.model).toMatchObject({ provider: generation.provider });
    expect(generation.resolveDynamicModel).toHaveBeenCalledWith(
      expect.objectContaining({
        authProfileId: "prepared",
        authProfileMode: "api_key",
      }),
    );
    expect(ensureAuthProfileStoreMock).not.toHaveBeenCalled();
  });

  it("falls back to the requested auth owner for a foreign prepared generation", async () => {
    const config = {} satisfies OpenClawConfig;
    const generation = createModelGenerationFixture({ config, label: "foreign-auth" });
    const preparedAuthStore: AuthProfileStore = {
      version: 1,
      profiles: {
        prepared: {
          type: "api_key",
          provider: generation.provider,
          key: "prepared-key",
        },
      },
    };
    const foreignAuthStore: AuthProfileStore = {
      version: 1,
      profiles: {
        foreign: {
          type: "oauth",
          provider: generation.provider,
          access: "foreign-access",
          refresh: "foreign-refresh",
          expires: Date.now() + 60_000,
        },
      },
    };
    setPreparedModelRuntimeAuthStore(generation.preparedModelRuntime, preparedAuthStore);
    ensureAuthProfileStoreMock.mockReturnValue(foreignAuthStore);
    const stores = generation.preparedModelRuntime.createStores();

    const result = await resolveModelAsync(
      generation.provider,
      generation.modelId,
      "/tmp/openclaw-foreign-auth-agent",
      config,
      {
        ...stores,
        authProfileId: "foreign",
        preparedModelRuntime: generation.preparedModelRuntime,
        skipAgentDiscovery: true,
        workspaceDir: generation.preparedModelRuntime.workspaceDir,
      },
    );

    expect(result.model).toMatchObject({ provider: generation.provider });
    expect(generation.resolveDynamicModel).toHaveBeenCalledWith(
      expect.objectContaining({
        authProfileId: "foreign",
        authProfileMode: "oauth",
      }),
    );
    expect(ensureAuthProfileStoreMock).toHaveBeenCalledWith("/tmp/openclaw-foreign-auth-agent", {
      allowKeychainPrompt: false,
    });
  });
});
