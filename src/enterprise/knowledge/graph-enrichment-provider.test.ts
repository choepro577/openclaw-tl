import { afterEach, describe, expect, it } from "vitest";
import {
  parseKnowledgeGraphEnrichmentRelations,
  registerKnowledgeGraphEnrichmentProvider,
  resolveKnowledgeGraphEnrichmentProvider,
  type KnowledgeGraphEnrichmentProvider,
} from "./graph-enrichment-provider.js";

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe("Knowledge Graph enrichment boundary", () => {
  it("rejects malformed output and drops foreign evidence locators", () => {
    const segments = [
      {
        id: "segment-1",
        sourceVersionId: "version-1",
        text: "Policy A applies to team B.",
        locator: { kind: "text" as const, section: "Policy" },
      },
    ];
    expect(() => parseKnowledgeGraphEnrichmentRelations("not-json", segments)).toThrow();
    expect(() =>
      parseKnowledgeGraphEnrichmentRelations(
        JSON.stringify({ relations: [{ kind: "unknown" }] }),
        segments,
      ),
    ).toThrow();
    expect(
      parseKnowledgeGraphEnrichmentRelations(
        JSON.stringify({
          relations: [
            {
              sourceCanonicalKey: "Policy A",
              targetCanonicalKey: "Team B",
              kind: "applies_to",
              confidence: 0.99,
              evidenceSegmentId: "foreign-segment",
            },
          ],
        }),
        segments,
      ),
    ).toEqual([]);
  });

  it("never resolves a registered remote provider for a local-only Zone", async () => {
    const provider: KnowledgeGraphEnrichmentProvider = {
      id: "remote-test",
      transport: "remote",
      async enrich() {
        throw new Error("must not run");
      },
    };
    unregister = registerKnowledgeGraphEnrichmentProvider(provider);
    await expect(
      resolveKnowledgeGraphEnrichmentProvider({
        config: { enterprise: { enabled: true } },
        allowRemoteFallback: false,
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveKnowledgeGraphEnrichmentProvider({
        config: { enterprise: { enabled: true } },
        allowRemoteFallback: true,
      }),
    ).resolves.toBe(provider);
  });
});
