import { clearLiveCatalogCacheForTests } from "openclaw/plugin-sdk/provider-catalog-live-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOpenAIProvider } from "./openai-provider.js";
// Openai tests cover provider catalog.contract plugin behavior.
import { describeOpenAIProviderCatalogContract } from "./test-support/provider-catalog.contract-test-support.js";

vi.mock("openclaw/plugin-sdk/provider-auth-runtime", () => ({
  resolveApiKeyForProvider: vi.fn(async () => undefined),
  resolveProviderAuthProfileMetadata: vi.fn(),
}));

describeOpenAIProviderCatalogContract();

describe("OpenAI Platform account catalog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearLiveCatalogCacheForTests();
  });

  it("discovers future chat models without inventing capabilities or advertising other products", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [
          { id: "gpt-5.4", object: "model" },
          { id: "gpt-6.99", object: "model" },
          { id: "o99", object: "model", context_window: 32768, max_output_tokens: 2048 },
          { id: "gpt-6.99", object: "model" },
          { id: "gpt-6.99-hidden", object: "model", visibility: "hide" },
          { id: "o99-internal", object: "model", show_in_picker: false },
          { id: "gpt-6.99-invalid", object: "event" },
          ...[
            "gpt-image-1",
            "gpt-6.99-image",
            "gpt-6.99-audio-preview",
            "gpt-6.99-realtime",
            "gpt-6.99-transcribe",
            "gpt-6.99-transcription",
            "gpt-6.99-tts",
            "gpt-6.99-speech",
            "gpt-6.99-embedding",
            "o99-moderation",
            "gpt-6.99-video",
            "text-embedding-3-large",
            "omni-moderation-latest",
            "gpt-5.3-codex-spark",
            "not-in-manifest",
          ].map((id) => ({ id, object: "model" })),
        ],
      }),
    );
    const result = await buildOpenAIProvider().catalog?.run({
      config: { auth: { profiles: {} } },
      env: {},
      resolveProviderAuth: () => ({
        mode: "api_key",
        apiKey: "test-platform-catalog",
        source: "profile",
      }),
      resolveProviderApiKey: () => ({ apiKey: "test-platform-catalog" }),
    });
    if (!result || !("providers" in result)) {
      throw new Error("expected account-scoped provider catalog");
    }
    const models = result.providers.openai.models;
    expect(models.map((model) => model.id)).toEqual(["gpt-5.4", "gpt-6.99", "o99"]);
    expect(models[0]).toMatchObject({
      input: ["text", "image"],
      reasoning: true,
      contextWindow: 1050000,
      maxTokens: 128000,
      cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 },
    });
    expect(models[1]).toMatchObject({
      id: "gpt-6.99",
      api: "openai-responses",
      input: ["text"],
      reasoning: true,
      maxTokens: 8192,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
    expect(models[1]).not.toHaveProperty("contextWindow");
    expect(models[1]).not.toHaveProperty("compat");
    expect(models[2]).toMatchObject({ contextWindow: 32768, maxTokens: 2048, reasoning: true });
    expect(result.outcomes).toEqual([{ provider: "openai", status: "ready" }]);
  });
});
