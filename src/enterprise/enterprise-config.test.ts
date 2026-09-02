import { describe, expect, it } from "vitest";
import { EnterpriseConfigSchema } from "./enterprise-config.js";

describe("Enterprise user extensions config", () => {
  it("is opt-in and rejects unknown extension controls", () => {
    expect(
      EnterpriseConfigSchema.parse({ enabled: true })?.userExtensions?.enabled,
    ).toBeUndefined();
    expect(
      EnterpriseConfigSchema.parse({
        enabled: true,
        userExtensions: { enabled: true },
      })?.userExtensions?.enabled,
    ).toBe(true);
    expect(() =>
      EnterpriseConfigSchema.parse({
        enabled: true,
        userExtensions: { enabled: true, alternateRegistry: "https://example.test" },
      }),
    ).toThrow();
  });
});

describe("Enterprise Knowledge Graph config", () => {
  it("keeps graph rollout off by default and accepts the canonical rollout controls", () => {
    expect(EnterpriseConfigSchema.parse({ enabled: true })?.knowledge?.graph).toBeUndefined();
    expect(
      EnterpriseConfigSchema.parse({
        enabled: true,
        knowledge: {
          graph: {
            enabled: true,
            aiAnalysis: "shadow",
            agentExpansion: "shadow",
            enrichmentProvider: "local",
            enrichmentModel: "enterprise-relations",
            localEnrichmentProvider: "local-runtime",
            localEnrichmentModel: "enterprise-relations-local",
            autoApprovalThreshold: 0.94,
            maxConcurrentZoneBuilds: 1,
            maxConcurrentAiCallsPerZone: 2,
            changeFeedRetentionHours: 48,
          },
        },
      })?.knowledge?.graph,
    ).toEqual({
      enabled: true,
      aiAnalysis: "shadow",
      agentExpansion: "shadow",
      enrichmentProvider: "local",
      enrichmentModel: "enterprise-relations",
      localEnrichmentProvider: "local-runtime",
      localEnrichmentModel: "enterprise-relations-local",
      autoApprovalThreshold: 0.94,
      maxConcurrentZoneBuilds: 1,
      maxConcurrentAiCallsPerZone: 2,
      changeFeedRetentionHours: 48,
    });
    expect(() =>
      EnterpriseConfigSchema.parse({
        enabled: true,
        knowledge: { graph: { enabled: true, agentExpansion: "all" } },
      }),
    ).toThrow();
  });
});
