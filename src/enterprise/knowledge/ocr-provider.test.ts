import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.js";

const resolveAutoImageModel = vi.hoisted(() => vi.fn());
const describePreparedImageWithModel = vi.hoisted(() => vi.fn());

vi.mock("../../media-understanding/runner.js", () => ({ resolveAutoImageModel }));
vi.mock("../../media-understanding/runtime.js", () => ({ describePreparedImageWithModel }));

import {
  registerEnterpriseKnowledgeOcrProvider,
  resolveEnterpriseKnowledgeOcrProvider,
  type EnterpriseKnowledgeOcrProvider,
} from "./ocr-provider.js";

const imageConfig: OpenClawConfig = {
  tools: { media: { image: { enabled: true } } },
};

afterEach(() => {
  registerEnterpriseKnowledgeOcrProvider(undefined);
  resolveAutoImageModel.mockReset();
  describePreparedImageWithModel.mockReset();
});

describe("Enterprise Knowledge OCR provider resolution", () => {
  it("does not resolve a remote image model for a local-only Zone", async () => {
    const provider = await resolveEnterpriseKnowledgeOcrProvider({
      config: imageConfig,
      allowRemoteFallback: false,
    });

    expect(provider).toBeUndefined();
    expect(resolveAutoImageModel).not.toHaveBeenCalled();
  });

  it("uses the configured image-understanding model when external OCR is allowed", async () => {
    resolveAutoImageModel.mockResolvedValue({ provider: "openai", model: "gpt-5.6-vision" });
    describePreparedImageWithModel.mockResolvedValue({
      text: "Chính sách nghỉ phép",
      model: "gpt-5.6-vision",
    });
    const provider = await resolveEnterpriseKnowledgeOcrProvider({
      config: imageConfig,
      allowRemoteFallback: true,
    });
    const signal = new AbortController().signal;
    const result = await provider?.recognize(
      {
        data: Buffer.from("image"),
        mimeType: "image/png",
        locator: { kind: "ocr", page: 2 },
      },
      { signal },
    );

    expect(provider).toMatchObject({
      id: "media-understanding:openai/gpt-5.6-vision",
      transport: "remote",
    });
    expect(result).toMatchObject({
      text: "Chính sách nghỉ phép",
      provider: "media-understanding:openai",
      model: "gpt-5.6-vision",
    });
    expect(describePreparedImageWithModel).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        model: "gpt-5.6-vision",
        prompt: expect.stringContaining("Return only the extracted text"),
        signal,
      }),
    );
  });

  it("prefers an explicitly registered local OCR provider", async () => {
    const local: EnterpriseKnowledgeOcrProvider = {
      id: "local-ocr",
      transport: "local",
      async recognize() {
        return { text: "local", provider: "local", model: "fixture" };
      },
    };
    registerEnterpriseKnowledgeOcrProvider(local);

    await expect(
      resolveEnterpriseKnowledgeOcrProvider({ config: imageConfig, allowRemoteFallback: true }),
    ).resolves.toBe(local);
    expect(resolveAutoImageModel).not.toHaveBeenCalled();
  });
});
