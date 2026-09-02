import type {
  PersonalAgentKnowledgeItem,
  PersonalAgentProfile,
  PersonalAgentResponseLength,
  PersonalAgentTone,
} from "./user-api-contracts.js";

type JsonRecord = Record<string, unknown>;

const AVATAR_PRESETS = new Set(["sparkles", "briefcase", "message-circle", "bot", "user"]);
const TONES = new Set<PersonalAgentTone>(["professional", "friendly", "concise"]);
const RESPONSE_LENGTHS = new Set<PersonalAgentResponseLength>(["brief", "balanced", "detailed"]);
const LANGUAGES = new Set(["auto", "vi", "en"]);

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, allowed: readonly string[], field: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
}

function text(
  value: unknown,
  field: string,
  maxLength: number,
  options: { required?: boolean } = {},
): string {
  if (typeof value !== "string" || value.includes("\0") || value.length > maxLength) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  const normalized = value.trim();
  if (options.required && !normalized) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  return normalized;
}

function revision(value: unknown, field = "baseRevision"): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`FIELD_INVALID:${field}`);
  }
  return Number(value);
}

export function parsePersonalAgentProfilePatch(body: JsonRecord): {
  baseRevision: number;
  profile: Omit<PersonalAgentProfile, "revision">;
} {
  exactKeys(body, ["baseRevision", "profile"], "body");
  const profile = record(body.profile, "profile");
  exactKeys(
    profile,
    [
      "name",
      "avatarPreset",
      "greeting",
      "tone",
      "responseLength",
      "language",
      "customInstructions",
      "preferredName",
      "workContext",
      "preferences",
    ],
    "profile",
  );
  const avatarPreset =
    profile.avatarPreset === null
      ? null
      : text(profile.avatarPreset, "avatarPreset", 32, { required: true });
  if (avatarPreset !== null && !AVATAR_PRESETS.has(avatarPreset)) {
    throw new Error("FIELD_INVALID:avatarPreset");
  }
  const tone = text(profile.tone, "tone", 32, { required: true }) as PersonalAgentTone;
  const responseLength = text(profile.responseLength, "responseLength", 32, {
    required: true,
  }) as PersonalAgentResponseLength;
  const language = text(profile.language, "language", 16, { required: true });
  if (!TONES.has(tone) || !RESPONSE_LENGTHS.has(responseLength) || !LANGUAGES.has(language)) {
    throw new Error("FIELD_INVALID:profile");
  }
  return {
    baseRevision: revision(body.baseRevision),
    profile: {
      name: text(profile.name, "name", 64, { required: true }),
      avatarPreset,
      greeting: text(profile.greeting, "greeting", 240),
      tone,
      responseLength,
      language,
      customInstructions: text(profile.customInstructions, "customInstructions", 4_000),
      preferredName: text(profile.preferredName, "preferredName", 128),
      workContext: text(profile.workContext, "workContext", 4_000),
      preferences: text(profile.preferences, "preferences", 4_000),
    },
  };
}

export function parsePersonalAgentProfileReset(body: JsonRecord): number {
  exactKeys(body, ["baseRevision"], "body");
  return revision(body.baseRevision);
}

export function parseKnowledgeCreate(body: JsonRecord): {
  title: string;
  kind: PersonalAgentKnowledgeItem["kind"];
  sourceName: string | null;
  content: string;
} {
  exactKeys(body, ["title", "kind", "sourceName", "mimeType", "content"], "body");
  const kind = text(body.kind, "kind", 16, { required: true });
  if (kind !== "note" && kind !== "upload") {
    throw new Error("FIELD_INVALID:kind");
  }
  const sourceName =
    body.sourceName === null || body.sourceName === undefined
      ? null
      : text(body.sourceName, "sourceName", 255, { required: true });
  const content = text(body.content, "content", 8_000, { required: true });
  if (kind === "upload") {
    const mimeType = text(body.mimeType, "mimeType", 64, { required: true }).toLowerCase();
    const extension = sourceName?.toLowerCase().match(/\.(md|txt)$/)?.[1];
    if (!sourceName || !extension || !["text/plain", "text/markdown"].includes(mimeType)) {
      throw new Error("KNOWLEDGE_FILE_INVALID");
    }
    if (Buffer.byteLength(content, "utf8") > 64 * 1024) {
      throw new Error("KNOWLEDGE_FILE_TOO_LARGE");
    }
  }
  return {
    title: text(body.title, "title", 128, { required: true }),
    kind,
    sourceName: kind === "upload" ? sourceName : null,
    content,
  };
}

export function parseKnowledgePatch(body: JsonRecord): {
  baseRevision: number;
  title: string;
  content: string;
} {
  exactKeys(body, ["baseRevision", "title", "content"], "body");
  return {
    baseRevision: revision(body.baseRevision),
    title: text(body.title, "title", 128, { required: true }),
    content: text(body.content, "content", 8_000, { required: true }),
  };
}
