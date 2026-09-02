import type { SharedAgentRelationshipDraft } from "./shared-agent-relationship-store.js";

type JsonRecord = Record<string, unknown>;

function exactKeys(value: JsonRecord, allowed: readonly string[], field: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
}

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  return value as JsonRecord;
}

function text(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.includes("\0") || value.length > maxLength) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  return value.trim();
}

function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error("FIELD_INVALID:baseRevision");
  }
  return Number(value);
}

export function parseSharedAgentRelationshipPatch(body: JsonRecord): {
  baseRevision: number;
  profile: SharedAgentRelationshipDraft;
} {
  exactKeys(body, ["baseRevision", "profile"], "body");
  const profile = record(body.profile, "profile");
  exactKeys(
    profile,
    ["agentAlias", "agentSelfReference", "userAddress", "customInstructions"],
    "profile",
  );
  return {
    baseRevision: revision(body.baseRevision),
    profile: {
      agentAlias: text(profile.agentAlias, "agentAlias", 64),
      agentSelfReference: text(profile.agentSelfReference, "agentSelfReference", 64),
      userAddress: text(profile.userAddress, "userAddress", 128),
      // Keep this injected prompt section bounded well below the model-context review threshold.
      customInstructions: text(profile.customInstructions, "customInstructions", 1_200),
    },
  };
}
