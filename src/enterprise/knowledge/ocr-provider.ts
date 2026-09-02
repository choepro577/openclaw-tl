import type { OpenClawConfig } from "../../config/types.js";
import type { KnowledgeLocator } from "./knowledge-types.js";

const KNOWLEDGE_OCR_PROMPT = `Extract all visible text exactly as written. Preserve reading order,
headings, paragraphs, lists, table rows, labels, numbers, and meaningful line breaks. Do not
summarize, translate, explain, or add text that is not visible. Return only the extracted text.`;

export type EnterpriseKnowledgeOcrInput = {
  data: Buffer;
  mimeType: string;
  locator: KnowledgeLocator;
};

export type EnterpriseKnowledgeOcrResult = {
  text: string;
  confidence?: number;
  blocks?: Array<{ id: string; text: string; confidence?: number }>;
  provider: string;
  model: string;
};

export type EnterpriseKnowledgeOcrProvider = {
  id: string;
  transport: "local" | "remote";
  recognize(
    input: EnterpriseKnowledgeOcrInput,
    options?: { signal?: AbortSignal },
  ): Promise<EnterpriseKnowledgeOcrResult>;
};

let registeredProvider: EnterpriseKnowledgeOcrProvider | undefined;

/** Host registration seam for a configured OCR/vision capability. */
export function registerEnterpriseKnowledgeOcrProvider(
  provider: EnterpriseKnowledgeOcrProvider | undefined,
): () => void {
  registeredProvider = provider;
  return () => {
    if (registeredProvider === provider) {
      registeredProvider = undefined;
    }
  };
}

export function getEnterpriseKnowledgeOcrProvider(): EnterpriseKnowledgeOcrProvider | undefined {
  return registeredProvider;
}

/** Resolves an explicit OCR provider first, then the configured image-understanding model. */
export async function resolveEnterpriseKnowledgeOcrProvider(params: {
  config?: OpenClawConfig;
  allowRemoteFallback: boolean;
}): Promise<EnterpriseKnowledgeOcrProvider | undefined> {
  if (registeredProvider) {
    return registeredProvider;
  }
  if (
    !params.allowRemoteFallback ||
    !params.config ||
    params.config.tools?.media?.image?.enabled === false
  ) {
    return undefined;
  }
  const { resolveAutoImageModel } = await import("../../media-understanding/runner.js");
  const resolved = await resolveAutoImageModel({ cfg: params.config });
  if (!resolved?.provider || !resolved.model) {
    return undefined;
  }
  const providerName = resolved.provider;
  const modelName = resolved.model;
  return {
    id: `media-understanding:${providerName}/${modelName}`,
    // Model-backed OCR is conservatively remote. Local-only Zones require an
    // explicitly registered local provider so egress cannot widen by inference.
    transport: "remote",
    async recognize(input, options) {
      const { describePreparedImageWithModel } =
        await import("../../media-understanding/runtime.js");
      const result = await describePreparedImageWithModel({
        cfg: params.config!,
        provider: providerName,
        model: modelName,
        image: {
          buffer: input.data,
          fileName: `enterprise-knowledge-page-${"page" in input.locator ? (input.locator.page ?? 1) : 1}`,
          mime: input.mimeType,
        },
        prompt: KNOWLEDGE_OCR_PROMPT,
        maxTokens: 8192,
        timeoutMs: 120_000,
        signal: options?.signal,
      });
      return {
        text: result.text,
        provider: `media-understanding:${providerName}`,
        model: result.model || modelName,
      };
    },
  };
}
