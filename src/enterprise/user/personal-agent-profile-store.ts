import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { PersonalAgentProfile } from "./user-api-contracts.js";

type PersonalAgentProfileData = Omit<PersonalAgentProfile, "revision">;

type ProfileRow = {
  profile_json: string;
  revision: number;
};

export function defaultPersonalAgentProfile(displayName: string): PersonalAgentProfileData {
  return {
    name: "Personal Agent",
    avatarPreset: "sparkles",
    greeting: `Xin chào ${displayName}, tôi có thể giúp gì cho bạn?`,
    tone: "professional",
    responseLength: "balanced",
    language: "auto",
    customInstructions: "",
    preferredName: displayName,
    workContext: "",
    preferences: "",
  };
}

function parseStoredProfile(
  row: ProfileRow,
  fallback: PersonalAgentProfileData,
): PersonalAgentProfile {
  try {
    const parsed = JSON.parse(row.profile_json) as Partial<PersonalAgentProfileData>;
    return { ...fallback, ...parsed, revision: row.revision };
  } catch {
    return { ...fallback, revision: row.revision };
  }
}

export function readPersonalAgentProfile(
  accountId: string,
  displayName: string,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentProfile {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT profile_json, revision FROM enterprise_personal_agent_profiles WHERE account_id = ? LIMIT 1",
    )
    .get(accountId) as ProfileRow | undefined; // sqlite-allow-raw -- Account-scoped feature table lookup.
  const fallback = defaultPersonalAgentProfile(displayName);
  return row ? parseStoredProfile(row, fallback) : { ...fallback, revision: 0 };
}

export function writePersonalAgentProfile(
  accountId: string,
  baseRevision: number,
  profile: PersonalAgentProfileData,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentProfile {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare(
          "SELECT profile_json, revision FROM enterprise_personal_agent_profiles WHERE account_id = ? LIMIT 1",
        )
        .get(accountId) as ProfileRow | undefined; // sqlite-allow-raw -- CAS reads the account-owned profile.
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== baseRevision) {
        throw new Error(`PERSONAL_PROFILE_REVISION_CONFLICT:${currentRevision}`);
      }
      const now = Date.now();
      const nextRevision = currentRevision + 1;
      db.prepare(
        `INSERT INTO enterprise_personal_agent_profiles
          (account_id, schema_version, profile_json, revision, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           schema_version = excluded.schema_version,
           profile_json = excluded.profile_json,
           revision = excluded.revision,
           updated_at = excluded.updated_at`,
      ).run(accountId, JSON.stringify(profile), nextRevision, now, now); // sqlite-allow-raw -- Atomic owner-scoped profile CAS.
      return { ...profile, revision: nextRevision };
    },
    options,
    { operationLabel: "enterprise.personal-profile.write" },
  );
}

export function resetPersonalAgentProfile(
  accountId: string,
  displayName: string,
  baseRevision: number,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentProfile {
  return writePersonalAgentProfile(
    accountId,
    baseRevision,
    defaultPersonalAgentProfile(displayName),
    options,
  );
}
