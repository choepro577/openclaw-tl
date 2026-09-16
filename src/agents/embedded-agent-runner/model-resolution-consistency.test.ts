import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  prepareModelRunCapabilities,
  resolvePreparedModelThinkingCompat,
} from "../model-catalog-lookup.js";
import type { ModelCatalogEntry } from "../model-catalog.types.js";
import { resolveInitialEmbeddedRunModel } from "./run/runtime-resolution.js";

const STATIC_MODEL_ID = "claude-haiku-4-5";
const PROVIDER = "anthropic";
const resolveHookModelSelectionMock = vi.hoisted(() =>
  vi.fn(async ({ provider, modelId }: { provider: string; modelId: string }) => ({
    provider,
    modelId,
  })),
);
const resolveSandboxContextMock = vi.hoisted(() => vi.fn());

const emptyModelRegistry = {
  find: vi.fn((_provider: string, _modelId: string) => null),
};
const authStorage = {
  setRuntimeApiKey: vi.fn(),
};
const staticCatalogModel = {
  provider: PROVIDER,
  id: STATIC_MODEL_ID,
  name: "Claude Haiku 4.5",
  api: "anthropic-messages",
  baseUrl: "https://api.anthropic.com",
  reasoning: true,
  input: ["text", "image"],
  contextWindow: 200_000,
  maxTokens: 64_000,
  compat: { supportsLongCacheRetention: false },
};

const resolveModelAsyncMock = vi.fn(
  async (
    provider: string,
    modelId: string,
    _agentDir?: string,
    _config?: unknown,
    options?: {
      allowBundledStaticCatalogFallback?: boolean;
      authStorage?: unknown;
      modelRegistry?: unknown;
    },
  ) => {
    const stores = {
      authStorage: options?.authStorage ?? authStorage,
      modelRegistry: options?.modelRegistry ?? emptyModelRegistry,
    };
    if (options?.allowBundledStaticCatalogFallback) {
      return {
        ...stores,
        model: { ...staticCatalogModel, provider, id: modelId, name: modelId },
      };
    }
    return {
      ...stores,
      error: `Unknown model: ${provider}/${modelId}`,
    };
  },
);

vi.mock("./model.js", () => ({
  createEmptyAgentDiscoveryStores: () => ({ authStorage, modelRegistry: emptyModelRegistry }),
  resolveModelAsync: resolveModelAsyncMock,
}));

vi.mock("../harness/runtime-plugin.js", () => ({
  ensureSelectedAgentHarnessPlugin: vi.fn(async () => undefined),
}));

vi.mock("../harness/selection.js", () => ({
  selectAgentHarness: vi.fn(() => ({
    id: "openclaw",
    label: "OpenClaw",
    supports: () => ({ supported: true }),
    runAttempt: vi.fn(),
  })),
}));

vi.mock("../openai-routing.js", () => ({
  resolveSelectedOpenAIRuntimeProvider: ({ provider }: { provider: string }) => provider,
}));

vi.mock("../prepared-model-runtime.js", () => ({
  prepareModelRuntimeSnapshot: vi.fn(),
}));

vi.mock("./run/setup.js", () => ({
  buildBeforeModelResolveAttachments: vi.fn(() => []),
  createNativeModelOwnedRuntimeModel: vi.fn(),
  resolveHookModelSelection: resolveHookModelSelectionMock,
  resolveNativeModelOwnedHarnessId: vi.fn(() => undefined),
}));

vi.mock("./compaction-runtime-preparation.js", () => ({
  resolveCompactionRuntimeSelection: ({
    provider,
    modelId,
  }: {
    provider: string;
    modelId: string;
  }) => ({
    runtimePolicySessionKey: "agent:main:test",
    runtimePolicyAgentId: "main",
    boundHarnessRuntime: undefined,
    selectedHarnessRuntimeOverride: undefined,
    runtimeModelAuth: { plan: undefined, authProfileId: undefined, modelAuth: undefined },
    provider,
    runtimeProvider: provider,
    contextConfigProvider: provider,
    modelId,
  }),
  prepareCompactionHarnessAuth: vi.fn(async () => ({
    runtimeAuthProfileStore: {},
    runtimeAuthPreparation: {
      plan: { selectedAuthMode: "api-key" },
      attempts: [{ kind: "direct", plan: { selectedAuthMode: "api-key" } }],
    },
    selectedPreparedHarness: { id: "openclaw" },
    providerUsesProfileScopedModelMetadata: false,
  })),
}));

vi.mock("../runtime-plan/resolve-auth.js", () => ({
  resolvePreparedRuntimeAuthAttempts: vi.fn(async ({ model, attempts }) => ({
    model,
    auth: { apiKey: "test-api-key", mode: "api_key", source: "test" },
    plan: attempts[0].plan,
  })),
  resolvePreparedRuntimeModelAuth: vi.fn(),
}));

vi.mock("../../plugins/provider-runtime.js", () => ({
  prepareProviderRuntimeAuth: vi.fn(async () => undefined),
}));

vi.mock("../provider-secret-egress.js", () => ({
  protectPreparedProviderRuntimeAuth: (value: unknown) => value,
  unwrapSecretSentinelsForProviderEgress: (value: unknown) => value,
}));

vi.mock("../provider-request-config.js", () => ({
  applyPreparedRuntimeAuthToModel: (model: unknown) => model,
}));

vi.mock("../sandbox.js", () => ({
  resolveSandboxContext: (...args: unknown[]) => resolveSandboxContextMock(...args),
}));

vi.mock("./compaction-runtime-context.js", () => ({
  resolveEmbeddedCompactionThinkingLevel: vi.fn(() => "off"),
}));

vi.mock("./logger.js", () => ({
  log: { warn: vi.fn() },
}));

const { resolveEmbeddedRunModelSetup } = await import("./run/model-setup.js");
const { prepareDirectCompactionAttempt } = await import("./direct-compaction-preparation.js");

function createPreparedModelRuntime(config: Record<string, unknown>) {
  return {
    agentDir: "/tmp/agents/main/agent",
    config,
    workspaceDir: "/tmp/openclaw-model-resolution",
    pluginRegistry: {},
    configuredRuntimeModels: [],
    inlineProviderModels: [],
    createStores: () => ({ authStorage, modelRegistry: emptyModelRegistry }),
  };
}

describe("embedded model resolution consistency", () => {
  beforeEach(() => {
    resolveHookModelSelectionMock.mockReset().mockImplementation(async ({ provider, modelId }) => ({
      provider,
      modelId,
    }));
    resolveSandboxContextMock.mockReset().mockResolvedValue(undefined);
  });

  it("resolves an explicit alias configured only on the selected agent", () => {
    const config = {
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.6-luna" },
          models: { "openai/gpt-5.6-luna": { alias: "global-luna" } },
        },
        entries: {
          worker: {
            models: { "anthropic/claude-haiku-4-5": { alias: "worker-haiku" } },
          },
        },
      },
    };

    expect(
      resolveInitialEmbeddedRunModel({
        config,
        agentId: "worker",
        model: "worker-haiku",
      }),
    ).toEqual({ provider: "anthropic", modelId: "claude-haiku-4-5" });
  });

  it("resolves the same undated configured model for chat and manual compaction", async () => {
    const config = {
      agents: {
        defaults: {
          model: { primary: `${PROVIDER}/${STATIC_MODEL_ID}` },
        },
      },
    };
    const target = resolveInitialEmbeddedRunModel({ config });
    const preparedModelRuntime = createPreparedModelRuntime(config);

    const chat = await resolveEmbeddedRunModelSetup({
      runParams: {
        config,
        prompt: "hello",
        sessionId: "chat-session",
        agentId: "main",
      } as never,
      ...target,
      agentDir: preparedModelRuntime.agentDir,
      workspaceDir: preparedModelRuntime.workspaceDir,
      globalLane: "test",
      hookRunner: undefined,
      hookContext: {} as never,
      onHooksResolved: vi.fn(),
      preparedModelRuntime: preparedModelRuntime as never,
    });
    expect(chat.model).toMatchObject({ provider: PROVIDER, id: STATIC_MODEL_ID });

    const compaction = await prepareDirectCompactionAttempt({
      config,
      provider: target.provider,
      model: target.modelId,
      agentId: "main",
      sessionId: "compact-session",
      sessionKey: "agent:main:compact-session",
      sessionFile: "agent:main:compact-session",
      workspaceDir: preparedModelRuntime.workspaceDir,
      preparedModelRuntime: preparedModelRuntime as never,
    });

    expect(emptyModelRegistry.find(PROVIDER, STATIC_MODEL_ID)).toBeNull();
    if (!compaction.ok) {
      throw new Error(`manual compaction failed: ${compaction.result.reason}`);
    }
    expect(compaction.value.runtimeModel).toMatchObject({
      provider: PROVIDER,
      id: STATIC_MODEL_ID,
    });
  });

  it("releases its sandbox lease when preparation fails after sandbox acquisition", async () => {
    const config = {
      agents: {
        defaults: {
          model: { primary: `${PROVIDER}/${STATIC_MODEL_ID}` },
        },
      },
    };
    const preparedModelRuntime = createPreparedModelRuntime(config);
    const releaseSandbox = vi.fn();
    resolveSandboxContextMock.mockResolvedValue({
      enabled: true,
      workspaceAccess: "rw",
      workspaceDir: "/tmp/openclaw-sandbox",
      lifecycleActiveRelease: releaseSandbox,
    });

    await expect(
      prepareDirectCompactionAttempt({
        config,
        provider: PROVIDER,
        model: STATIC_MODEL_ID,
        agentId: "main",
        sessionId: "compact-preparation-error",
        sessionKey: "agent:main:compact-preparation-error",
        sessionFile: "agent:main:compact-preparation-error",
        workspaceDir: preparedModelRuntime.workspaceDir,
        cwd: "/tmp/openclaw-different-cwd",
        abortSignal: new AbortController().signal,
        preparedModelRuntime: preparedModelRuntime as never,
      }),
    ).rejects.toThrow("cwd override is not supported");

    expect(resolveSandboxContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        holdActiveLease: true,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(releaseSandbox).toHaveBeenCalledOnce();
  });

  it("does not release a sandbox borrowed from the enclosing compaction run", async () => {
    const config = {
      agents: {
        defaults: {
          model: { primary: `${PROVIDER}/${STATIC_MODEL_ID}` },
        },
      },
    };
    const preparedModelRuntime = createPreparedModelRuntime(config);
    const releaseSandbox = vi.fn();
    const borrowedSandbox = {
      enabled: true,
      workspaceAccess: "rw",
      workspaceDir: "/tmp/openclaw-sandbox",
      lifecycleActiveRelease: releaseSandbox,
    };

    const compaction = await prepareDirectCompactionAttempt({
      config,
      provider: PROVIDER,
      model: STATIC_MODEL_ID,
      agentId: "main",
      sessionId: "compact-borrowed-sandbox",
      sessionKey: "agent:main:compact-borrowed-sandbox",
      sessionFile: "agent:main:compact-borrowed-sandbox",
      workspaceDir: preparedModelRuntime.workspaceDir,
      sandbox: borrowedSandbox,
      preparedModelRuntime: preparedModelRuntime as never,
    } as never);

    if (!compaction.ok) {
      throw new Error(`manual compaction failed: ${compaction.result.reason}`);
    }
    expect(compaction.value.releaseSandbox).toBeUndefined();
    expect(releaseSandbox).not.toHaveBeenCalled();
    expect(resolveSandboxContextMock).not.toHaveBeenCalled();
  });

  it("resolves route-bound thinking compatibility for the final model", () => {
    const capability = {
      provider: PROVIDER,
      modelId: STATIC_MODEL_ID,
      agentRuntime: "openclaw",
      route: { api: staticCatalogModel.api, baseUrl: staticCatalogModel.baseUrl },
      compat: {
        supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
      },
    } as const;

    expect(
      resolvePreparedModelThinkingCompat({
        capability,
        model: staticCatalogModel,
        agentRuntime: "openclaw",
      }),
    ).toEqual(capability.compat);
  });

  it("keeps configured provider routes off harness-scoped thinking capability", () => {
    const compat = { supportedReasoningEfforts: ["max", "ultra"] };
    const preparedCatalog: ModelCatalogEntry[] = [
      {
        provider: PROVIDER,
        id: STATIC_MODEL_ID,
        name: STATIC_MODEL_ID,
        api: "openai-chatgpt-responses",
        baseUrl: "https://chatgpt.example/codex",
        compat,
      },
    ];
    const configuredCatalog: ModelCatalogEntry[] = [
      {
        provider: PROVIDER,
        id: STATIC_MODEL_ID,
        name: STATIC_MODEL_ID,
        api: "anthropic-messages",
        baseUrl: staticCatalogModel.baseUrl,
      },
    ];

    expect(
      prepareModelRunCapabilities(
        [preparedCatalog, configuredCatalog],
        [PROVIDER, STATIC_MODEL_ID, "codex"],
      ).modelThinkingCapability,
    ).toEqual({
      provider: PROVIDER,
      modelId: STATIC_MODEL_ID,
      agentRuntime: "codex",
      compat,
    });
  });

  it("resolves harness-scoped thinking compatibility across prepared auth routes", () => {
    const compat = { supportedReasoningEfforts: ["max", "ultra"] } as const;

    expect(
      resolvePreparedModelThinkingCompat({
        capability: {
          provider: PROVIDER,
          modelId: STATIC_MODEL_ID,
          agentRuntime: "codex",
          compat,
        },
        model: {
          ...staticCatalogModel,
          api: "openai-responses",
          baseUrl: "https://api.example/v1",
        },
        agentRuntime: "codex",
      }),
    ).toEqual(compat);
  });

  it.each([
    {
      name: "model",
      model: { ...staticCatalogModel, id: "hook-rerouted-model" },
      agentRuntime: "openclaw",
    },
    {
      name: "physical route",
      model: { ...staticCatalogModel, baseUrl: "https://other.example/v1" },
      agentRuntime: "openclaw",
    },
    {
      name: "agent harness",
      model: staticCatalogModel,
      agentRuntime: "codex",
    },
  ])(
    "does not apply prepared thinking compatibility to a different $name",
    ({ model, agentRuntime }) => {
      const result = resolvePreparedModelThinkingCompat({
        capability: {
          provider: PROVIDER,
          modelId: STATIC_MODEL_ID,
          agentRuntime: "openclaw",
          route: { api: staticCatalogModel.api, baseUrl: staticCatalogModel.baseUrl },
          compat: { supportedReasoningEfforts: ["max"] },
        },
        model,
        agentRuntime,
      });

      expect(result).toBeUndefined();
    },
  );
});
