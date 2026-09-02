import { z } from "zod";

export type EnterpriseConfig = {
  /** Enables the additive Enterprise account, policy, and UI module. Default false. */
  enabled?: boolean;
  userPortal?: {
    /** Selects the canaryable User Portal implementation. Default legacy. */
    version?: "legacy" | "v2";
  };
  personalAgent?: {
    /** Existing OpenClaw Agent definition used as the shared Personal Agent template. */
    templateAgentId?: string;
  };
  userExtensions?: {
    /** Enables account-owned Skill installs and native plugin access requests. Default false. */
    enabled?: boolean;
  };
  knowledge?: {
    graph?: {
      /** Enables graph generation and Graph View. Existing Zones stay opt-in. */
      enabled?: boolean;
      /** Controls graph expansion inside enterprise_knowledge_search. */
      agentExpansion?: "off" | "shadow" | "on";
      /** Controls AI document analysis independently from Agent traversal. */
      aiAnalysis?: "off" | "shadow" | "on";
      /** Canonical provider used by isolated relation enrichment. */
      enrichmentProvider?: string;
      /** Canonical model used by isolated relation enrichment. */
      enrichmentModel?: string;
      /** Optional local-only provider identity used for local_only Zones. */
      localEnrichmentProvider?: string;
      /** Optional local-only model identity used for local_only Zones. */
      localEnrichmentModel?: string;
      /** Confidence threshold for low-risk AI mentions. Default 0.92. */
      autoApprovalThreshold?: number;
      /** Maximum Zone builds executed by the worker. */
      maxConcurrentZoneBuilds?: number;
      /** Maximum isolated AI calls per Zone. Default 2. */
      maxConcurrentAiCallsPerZone?: number;
      /** Durable change-feed retention in hours. Minimum 24. */
      changeFeedRetentionHours?: number;
    };
  };
};

export const EnterpriseConfigSchema = z
  .strictObject({
    enabled: z.boolean().optional(),
    userPortal: z
      .strictObject({
        version: z.enum(["legacy", "v2"]).optional(),
      })
      .optional(),
    personalAgent: z
      .strictObject({
        templateAgentId: z.string().min(1).max(128).optional(),
      })
      .optional(),
    userExtensions: z
      .strictObject({
        enabled: z.boolean().optional(),
      })
      .optional(),
    knowledge: z
      .strictObject({
        graph: z
          .strictObject({
            enabled: z.boolean().optional(),
            aiAnalysis: z.enum(["off", "shadow", "on"]).optional(),
            agentExpansion: z.enum(["off", "shadow", "on"]).optional(),
            enrichmentProvider: z.string().min(1).max(128).optional(),
            enrichmentModel: z.string().min(1).max(256).optional(),
            localEnrichmentProvider: z.string().min(1).max(128).optional(),
            localEnrichmentModel: z.string().min(1).max(256).optional(),
            autoApprovalThreshold: z.number().min(0.5).max(1).optional(),
            maxConcurrentZoneBuilds: z.number().int().min(1).max(8).optional(),
            maxConcurrentAiCallsPerZone: z.number().int().min(1).max(8).optional(),
            changeFeedRetentionHours: z.number().int().min(24).max(8_760).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional();

export function isEnterpriseEnabled(config: { enterprise?: EnterpriseConfig }): boolean {
  return config.enterprise?.enabled === true;
}
