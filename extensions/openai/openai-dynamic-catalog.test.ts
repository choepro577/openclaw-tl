import type { ProviderPrepareDynamicModelContext } from "openclaw/plugin-sdk/plugin-entry";
import { clearLiveCatalogCacheForTests } from "openclaw/plugin-sdk/provider-catalog-live-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPENAI_API_BASE_URL, OPENAI_CODEX_RESPONSES_BASE_URL } from "./base-url.js";
import { buildOpenAIProvider } from "./openai-provider.js";

const mocks = vi.hoisted(() => ({
  resolveApiKeyForProvider: vi.fn(),
  resolveProviderAuthProfileMetadata: vi.fn(),
}));

vi.mock("openclaw/plugin-sdk/provider-auth-runtime", () => mocks);

const futureModelId = "gpt-6.1-sol";
const selectedProfileId = "openai:selected";
const authModes = ["oauth", "api_key"] as const;
type AuthMode = (typeof authModes)[number];

function createContext(mode: AuthMode): ProviderPrepareDynamicModelContext {
  return {
    config: { auth: { profiles: {} } },
    agentDir: "/tmp/openai-dynamic-agent",
    workspaceDir: "/tmp/openai-dynamic-workspace",
    provider: "openai",
    modelId: futureModelId,
    authProfileId: selectedProfileId,
    authProfileMode: mode,
    modelRegistry: {
      find: vi.fn(() => undefined),
    } as unknown as ProviderPrepareDynamicModelContext["modelRegistry"],
  };
}

function setSelectedAuth(mode: AuthMode, accountId = "account-a") {
  const auth = {
    mode,
    profileId: selectedProfileId,
    // OAuth account IDs can share a token; Platform identity is its key.
    apiKey: mode === "oauth" ? "test-oauth-token" : `test-platform-${accountId}`,
    source: "profile",
  };
  mocks.resolveApiKeyForProvider.mockResolvedValue(auth);
  mocks.resolveProviderAuthProfileMetadata.mockReturnValue({
    profileId: selectedProfileId,
    accountId,
  });
  return auth;
}

function catalogBody(mode: AuthMode, rows: Record<string, unknown>[]) {
  return mode === "oauth"
    ? { models: rows.map((row) => ({ slug: row.id, ...row })) }
    : { data: rows.map((row) => ({ object: "model", ...row })) };
}

function visibleFutureRow() {
  return {
    id: futureModelId,
    display_name: "GPT-6.1 Sol",
    visibility: "list",
    supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }],
    input_modalities: ["text", "image", "audio"],
    context_window: 272_000,
    max_context_window: 1_050_000,
    max_output_tokens: 128_000,
  };
}

describe("OpenAI account catalog dynamic model preparation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearLiveCatalogCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLiveCatalogCacheForTests();
  });

  it.each(authModes)(
    "dispatches a discovered future model using selected %s auth",
    async (mode) => {
      const context = createContext(mode);
      const auth = setSelectedAuth(mode);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          Response.json(
            catalogBody(mode, [visibleFutureRow(), { id: "gpt-6-luna", visibility: "list" }]),
          ),
        );
      const provider = buildOpenAIProvider();
      // The same account row already shown in Models settings must be runnable
      // even though the prepared registry has no manifest template for its ID.
      const catalog = await provider.catalog?.run({
        config: context.config!,
        env: {},
        agentDir: context.agentDir,
        workspaceDir: context.workspaceDir,
        resolveProviderAuth: () => auth,
        resolveProviderApiKey: () => ({ apiKey: auth.apiKey }),
      });
      expect(catalog && "providers" in catalog && catalog.providers.openai.models).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: futureModelId })]),
      );

      const resolved = await provider.prepareDynamicModel?.(context);

      expect(resolved).toMatchObject({
        id: futureModelId,
        provider: "openai",
        api: mode === "oauth" ? "openai-chatgpt-responses" : "openai-responses",
        baseUrl: mode === "oauth" ? OPENAI_CODEX_RESPONSES_BASE_URL : OPENAI_API_BASE_URL,
        reasoning: true,
        input: mode === "oauth" ? ["text", "image"] : ["text"],
      });
      if (mode === "oauth") {
        expect(resolved).toMatchObject({
          contextWindow: 1_050_000,
          contextTokens: 272_000,
          maxTokens: 128_000,
          compat: { supportedReasoningEfforts: ["low", "high"] },
        });
      }
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mocks.resolveApiKeyForProvider).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cfg: context.config,
          provider: "openai",
          profileId: selectedProfileId,
          lockedProfile: true,
        }),
      );
      expect(resolved).not.toHaveProperty("apiKey");
      expect(resolved).not.toHaveProperty("accountId");
      expect(context.config).toEqual({ auth: { profiles: {} } });
    },
  );

  it.each(
    authModes.flatMap((mode) =>
      ["hidden", "missing", "auth-rejected", "unavailable"].map((outcome) => ({ mode, outcome })),
    ),
  )("does not invent a future model for $mode $outcome catalogs", async ({ mode, outcome }) => {
    const context = createContext(mode);
    setSelectedAuth(mode);
    const response =
      outcome === "auth-rejected" || outcome === "unavailable"
        ? new Response(null, { status: outcome === "auth-rejected" ? 403 : 503 })
        : Response.json(
            catalogBody(mode, [
              outcome === "hidden"
                ? { ...visibleFutureRow(), show_in_picker: false }
                : { id: "gpt-6-luna", visibility: "list" },
            ]),
          );
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    expect(await buildOpenAIProvider().prepareDynamicModel?.(context)).toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mocks.resolveApiKeyForProvider).toHaveBeenCalledTimes(1);
    expect(mocks.resolveApiKeyForProvider).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: selectedProfileId, lockedProfile: true }),
    );
  });

  it.each([
    { modelId: "gpt-5.6-luna", baseUrl: undefined },
    { modelId: futureModelId, baseUrl: "https://proxy.example/v1" },
    { modelId: futureModelId, baseUrl: "http://api.openai.com/v1" },
  ])(
    "keeps existing routes and non-native endpoints network-free ($modelId $baseUrl)",
    async ({ modelId, baseUrl }) => {
      const context = { ...createContext("oauth"), modelId, providerConfig: { baseUrl } };
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      expect(await buildOpenAIProvider().prepareDynamicModel?.(context)).toBeUndefined();
      expect(mocks.resolveApiKeyForProvider).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each(authModes)("keeps cached %s discovery scoped to the selected account", async (mode) => {
    const context = createContext(mode);
    const provider = buildOpenAIProvider();
    setSelectedAuth(mode, "account-a");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(catalogBody(mode, [visibleFutureRow()])))
      .mockResolvedValueOnce(
        Response.json(catalogBody(mode, [{ id: "gpt-6-luna", visibility: "list" }])),
      );

    expect(await provider.prepareDynamicModel?.(context)).toMatchObject({ id: futureModelId });
    expect(await provider.prepareDynamicModel?.(context)).toMatchObject({ id: futureModelId });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setSelectedAuth(mode, "account-b");
    expect(await provider.prepareDynamicModel?.(context)).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    setSelectedAuth(mode, "account-a");
    expect(await provider.prepareDynamicModel?.(context)).toMatchObject({ id: futureModelId });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
