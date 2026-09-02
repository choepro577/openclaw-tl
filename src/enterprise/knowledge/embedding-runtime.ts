import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { getMemoryEmbeddingProvider } from "../../plugins/memory-embedding-provider-runtime.js";
import type { MemoryEmbeddingProvider } from "../../plugins/memory-embedding-providers.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

export type KnowledgeEmbeddingIdentity = {
  provider: string;
  model: string;
  dimension: number;
};

export type EnterpriseKnowledgeEmbeddingRuntime = {
  identity: KnowledgeEmbeddingIdentity | null;
  unavailableReason?: "disabled" | "not_configured" | "egress_blocked" | "provider_unavailable";
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  close(): Promise<void>;
};

function assertVector(vector: number[], expectedDimension?: number): number {
  if (
    vector.length === 0 ||
    (expectedDimension !== undefined && vector.length !== expectedDimension) ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new EnterpriseKnowledgeError(
      "VECTOR_CONTRACT_INVALID",
      422,
      "Embedding provider returned an invalid vector.",
    );
  }
  return vector.length;
}

function unavailable(
  reason: NonNullable<EnterpriseKnowledgeEmbeddingRuntime["unavailableReason"]>,
): EnterpriseKnowledgeEmbeddingRuntime {
  const fail = async (): Promise<never> => {
    throw new EnterpriseKnowledgeError(
      "EMBEDDING_UNAVAILABLE",
      503,
      "Embedding provider is unavailable.",
    );
  };
  return {
    identity: null,
    unavailableReason: reason,
    embedDocuments: fail,
    embedQuery: fail,
    async close() {},
  };
}

function configuredProviderId(config: OpenClawConfig): string | undefined {
  const provider = config.memory?.search?.provider?.trim();
  if (!provider) {
    return undefined;
  }
  return provider === "auto" ? "openai" : provider;
}

function remoteConfig(config: OpenClawConfig) {
  const remote = config.memory?.search?.remote;
  return remote
    ? {
        baseUrl: remote.baseUrl,
        apiKey: remote.apiKey,
        headers: remote.headers,
      }
    : undefined;
}

export async function createEnterpriseKnowledgeEmbeddingRuntime(params: {
  config: OpenClawConfig;
  externalAllowed: boolean;
}): Promise<EnterpriseKnowledgeEmbeddingRuntime> {
  const search = params.config.memory?.search;
  if (search?.enabled === false || search?.store?.vector?.enabled === false) {
    return unavailable("disabled");
  }
  const providerId = configuredProviderId(params.config);
  if (!providerId) {
    return unavailable("not_configured");
  }
  const adapter = getMemoryEmbeddingProvider(providerId, params.config);
  if (!adapter) {
    return unavailable("provider_unavailable");
  }
  if (adapter.transport === "remote" && !params.externalAllowed) {
    return unavailable("egress_blocked");
  }
  let provider: MemoryEmbeddingProvider | null = null;
  try {
    const created = await adapter.create({
      config: params.config,
      provider: providerId,
      model: search?.model?.trim() || adapter.defaultModel || "",
      local: search?.local,
      remote: remoteConfig(params.config),
      inputType: search?.inputType,
      queryInputType: search?.queryInputType,
      documentInputType: search?.documentInputType,
      outputDimensionality: search?.outputDimensionality,
      taskType: "RETRIEVAL_DOCUMENT",
    });
    provider = created.provider;
  } catch {
    return unavailable("provider_unavailable");
  }
  if (!provider) {
    return unavailable("provider_unavailable");
  }

  let dimension: number | undefined;
  const validateBatch = (vectors: number[][], expectedCount: number): number[][] => {
    if (vectors.length !== expectedCount) {
      throw new EnterpriseKnowledgeError(
        "VECTOR_CONTRACT_INVALID",
        422,
        "Embedding provider returned the wrong vector count.",
      );
    }
    for (const vector of vectors) {
      dimension = assertVector(vector, dimension);
    }
    return vectors;
  };

  return {
    get identity() {
      return dimension ? { provider: provider!.id, model: provider!.model, dimension } : null;
    },
    async embedDocuments(texts) {
      const all: number[][] = [];
      for (let offset = 0; offset < texts.length; offset += 64) {
        const batch = texts.slice(offset, offset + 64);
        all.push(...validateBatch(await provider!.embedBatch(batch), batch.length));
      }
      return all;
    },
    async embedQuery(text) {
      const vector = await provider!.embedQuery(text);
      dimension = assertVector(vector, dimension);
      return vector;
    },
    async close() {
      await provider?.close?.();
    },
  };
}

export function embeddingIdentityMatches(
  expected: KnowledgeEmbeddingIdentity | null | undefined,
  actual: KnowledgeEmbeddingIdentity | null | undefined,
): boolean {
  return Boolean(
    expected &&
    actual &&
    expected.provider === actual.provider &&
    expected.model === actual.model &&
    expected.dimension === actual.dimension,
  );
}
