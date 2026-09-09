import type { DatabaseSync } from "node:sqlite";
// Enterprise account persistence and durable OpenClaw profile binding.
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import {
  provisionEnterpriseDefaultAutomations,
  removeEnterpriseDefaultAutomations,
} from "../automations/default-automations.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  ENTERPRISE_ACCESS_PRESET_NONE,
  ENTERPRISE_ACCESS_PRESET_BASIC,
  normalizeEnterpriseAccessPresetKey,
} from "../entitlements/resource-keys.js";
import { applyAccountAccessPreset, readAccountPresetState } from "./account-access-preset.js";
import type {
  EnterpriseAccount,
  EnterpriseAccountRole,
  EnterpriseAccountWithPassword,
} from "./account-types.js";

type AccountRow = {
  id: string;
  profile_id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: EnterpriseAccountRole;
  must_change_password: number;
  enabled: number;
  personal_agent_enabled: number;
  default_agent_id: string | null;
  access_preset_key: string;
  policy_revision: number;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
};

function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) {
    throw new Error("USERNAME_INVALID");
  }
  return normalized;
}

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (!normalized || normalized.length > 128) {
    throw new Error("DISPLAY_NAME_INVALID");
  }
  return normalized;
}

function toAccount(row: AccountRow): EnterpriseAccountWithPassword {
  return {
    id: row.id,
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    mustChangePassword: row.must_change_password === 1,
    enabled: row.enabled === 1,
    personalAgentEnabled: row.personal_agent_enabled === 1,
    defaultAgentId: row.default_agent_id,
    accessPresetKey: row.access_preset_key,
    policyRevision: row.policy_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function withoutPassword(account: EnterpriseAccountWithPassword): EnterpriseAccount {
  const { passwordHash: _passwordHash, ...safe } = account;
  return safe;
}

function selectAccount(
  db: DatabaseSync,
  clause: "id" | "username",
  value: string,
): AccountRow | undefined {
  return db.prepare(`SELECT * FROM enterprise_accounts WHERE ${clause} = ? LIMIT 1`).get(value) as
    | AccountRow
    | undefined; // sqlite-allow-raw -- Clause is a closed internal union.
}

export function getEnterpriseAccountByUsername(
  username: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountWithPassword | undefined {
  ensureEnterpriseSchema(options);
  const row = selectAccount(
    openOpenClawStateDatabase(options).db,
    "username",
    normalizeUsername(username),
  );
  return row ? toAccount(row) : undefined;
}

export function getEnterpriseAccountById(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccount | undefined {
  ensureEnterpriseSchema(options);
  const row = selectAccount(openOpenClawStateDatabase(options).db, "id", accountId);
  return row ? withoutPassword(toAccount(row)) : undefined;
}

export function getEnterpriseAccountByProfileId(
  profileId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccount | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_accounts WHERE profile_id = ? LIMIT 1")
    .get(profileId) as AccountRow | undefined; // sqlite-allow-raw -- Fixed profile binding lookup.
  return row ? withoutPassword(toAccount(row)) : undefined;
}

export function listEnterpriseAccounts(
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccount[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_accounts ORDER BY username ASC")
    .all() as AccountRow[]; // sqlite-allow-raw -- Fixed feature-local query.
  return rows.map((row) => withoutPassword(toAccount(row)));
}

export function countEnterpriseAdministrators(options: OpenClawStateDatabaseOptions = {}): number {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT COUNT(*) AS count FROM enterprise_accounts WHERE role = 'administrator' AND enabled = 1",
    )
    .get() as { count: number }; // sqlite-allow-raw -- Fixed feature-local query.
  return row.count;
}

export function createEnterpriseAccount(
  input: {
    username: string;
    displayName: string;
    passwordHash: string;
    role: EnterpriseAccountRole;
    mustChangePassword?: boolean;
    enabled?: boolean;
    personalAgentEnabled?: boolean;
    defaultAgentId?: string | null;
    accessPresetKey?: string;
    config?: OpenClawConfig;
    initialEntitlements?: Array<{
      resourceType: "agent" | "skill" | "tool";
      resourceId: string;
      effect: "allow" | "deny";
    }>;
    audit?: {
      actorAccountId: string;
      actorSessionId: string;
      requestId: string | null;
    };
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccount {
  ensureEnterpriseSchema(options);
  const username = normalizeUsername(input.username);
  const displayName = normalizeDisplayName(input.displayName);
  const now = Date.now();
  const accountId = generateSecureUuid();
  const profileId = generateSecureUuid();
  const accessPresetKey = normalizeEnterpriseAccessPresetKey(
    input.accessPresetKey ??
      (input.role === "employee" ? ENTERPRISE_ACCESS_PRESET_BASIC : ENTERPRISE_ACCESS_PRESET_NONE),
  );
  const personalAgentEnabled = input.personalAgentEnabled ?? input.role === "employee";
  const enabled = input.enabled ?? true;
  const initialEntitlements = input.initialEntitlements ?? [];
  if (
    initialEntitlements.length > 2_000 ||
    initialEntitlements.some(
      (item) =>
        !item.resourceId.trim() ||
        item.resourceId.length > 256 ||
        !item.resourceId.startsWith(`${item.resourceType}:`),
    )
  ) {
    throw new Error("RESOURCE_ID_INVALID");
  }
  return runOpenClawStateWriteTransaction(
    (database) => {
      const { db } = database;
      db.prepare(
        `INSERT INTO user_profiles
          (id, display_name, avatar, avatar_mime, avatar_sha256, merged_into, role, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
      ).run(profileId, displayName, input.role, now, now); // sqlite-allow-raw -- Additive profile binding.
      db.prepare(
        `INSERT INTO user_profile_identities
          (provider, subject, profile_id, canonical_login, created_at)
         VALUES ('openclaw-account', ?, ?, ?, ?)`,
      ).run(accountId, profileId, username, now); // sqlite-allow-raw -- Additive identity binding.
      db.prepare(
        `INSERT INTO enterprise_accounts
          (id, profile_id, username, display_name, password_hash, role, must_change_password,
           enabled, personal_agent_enabled, default_agent_id, access_preset_key, policy_revision,
           created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)`,
      ).run(
        accountId,
        profileId,
        username,
        displayName,
        input.passwordHash,
        input.role,
        input.mustChangePassword === false ? 0 : 1,
        enabled ? 1 : 0,
        personalAgentEnabled ? 1 : 0,
        input.defaultAgentId?.trim() || null,
        accessPresetKey,
        now,
        now,
      ); // sqlite-allow-raw -- Fixed feature-local insert.
      const insertEntitlement = db.prepare(
        `INSERT INTO enterprise_entitlements
          (account_id, resource_type, resource_id, resource_state, effect, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      );
      for (const entitlement of initialEntitlements) {
        insertEntitlement.run(
          accountId,
          entitlement.resourceType,
          entitlement.resourceId.trim(),
          entitlement.effect,
          now,
          now,
        ); // sqlite-allow-raw -- Initial grants are committed with the account.
      }
      applyAccountAccessPreset(
        db,
        withoutPassword(toAccount(selectAccount(db, "id", accountId)!)),
        input.config ?? {},
        now,
      );
      if (input.audit) {
        db.prepare(
          `INSERT INTO enterprise_audit_events
            (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
             before_json, after_json, outcome, created_at)
           VALUES (?, ?, ?, 'account.create', 'account', ?, ?, NULL, ?, 'success', ?)`,
        ).run(
          generateSecureUuid(),
          input.audit.actorAccountId,
          input.audit.actorSessionId,
          accountId,
          input.audit.requestId,
          JSON.stringify({
            accountId,
            username,
            displayName,
            role: input.role,
            enabled,
            personalAgentEnabled,
            grants: initialEntitlements,
            accessPresetKey,
            permissions: readAccountPresetState(db, accountId),
          }),
          now,
        ); // sqlite-allow-raw -- Account, grants, and audit are one transaction.
      }
      const account = withoutPassword(toAccount(selectAccount(db, "id", accountId)!));
      provisionEnterpriseDefaultAutomations(database, account, options.env);
      return account;
    },
    options,
    { operationLabel: "enterprise.accounts.create" },
  );
}

export function updateEnterpriseAccount(
  accountId: string,
  patch: Partial<
    Pick<
      EnterpriseAccount,
      | "displayName"
      | "role"
      | "enabled"
      | "personalAgentEnabled"
      | "defaultAgentId"
      | "mustChangePassword"
      | "accessPresetKey"
    >
  > & {
    passwordHash?: string;
    applyAccessPreset?: boolean;
    config?: OpenClawConfig;
    audit?: { actorAccountId: string; actorSessionId: string; requestId: string | null };
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccount {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const currentRow = selectAccount(db, "id", accountId);
      if (!currentRow) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      const current = toAccount(currentRow);
      const beforePermissions = readAccountPresetState(db, accountId);
      const nextDisplayName =
        patch.displayName === undefined
          ? current.displayName
          : normalizeDisplayName(patch.displayName);
      const nextRole = patch.role ?? current.role;
      const nextEnabled = patch.enabled ?? current.enabled;
      const nextAccessPresetKey =
        patch.accessPresetKey === undefined
          ? current.accessPresetKey
          : normalizeEnterpriseAccessPresetKey(patch.accessPresetKey);
      if (
        current.role === "administrator" &&
        current.enabled &&
        (nextRole !== "administrator" || !nextEnabled)
      ) {
        const row = db
          .prepare(
            "SELECT COUNT(*) AS count FROM enterprise_accounts WHERE role = 'administrator' AND enabled = 1",
          )
          .get() as { count: number }; // sqlite-allow-raw -- Last-admin invariant in the write transaction.
        if (row.count <= 1) {
          throw new Error("LAST_ADMIN_REQUIRED");
        }
      }
      const applyPreset =
        patch.applyAccessPreset === true || nextAccessPresetKey !== current.accessPresetKey;
      const policyChanged =
        applyPreset ||
        nextRole !== current.role ||
        nextEnabled !== current.enabled ||
        (patch.personalAgentEnabled ?? current.personalAgentEnabled) !==
          current.personalAgentEnabled ||
        (patch.defaultAgentId === undefined ? current.defaultAgentId : patch.defaultAgentId) !==
          current.defaultAgentId ||
        nextAccessPresetKey !== current.accessPresetKey;
      const now = Date.now();
      db.prepare(
        `UPDATE enterprise_accounts SET
          display_name = ?, password_hash = ?, role = ?, must_change_password = ?, enabled = ?,
          personal_agent_enabled = ?, default_agent_id = ?, access_preset_key = ?,
          policy_revision = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        nextDisplayName,
        patch.passwordHash ?? current.passwordHash,
        nextRole,
        (patch.mustChangePassword ?? current.mustChangePassword) ? 1 : 0,
        nextEnabled ? 1 : 0,
        (patch.personalAgentEnabled ?? current.personalAgentEnabled) ? 1 : 0,
        patch.defaultAgentId === undefined ? current.defaultAgentId : patch.defaultAgentId,
        nextAccessPresetKey,
        policyChanged ? current.policyRevision + 1 : current.policyRevision,
        now,
        accountId,
      ); // sqlite-allow-raw -- Fixed feature-local update.
      db.prepare(
        "UPDATE user_profiles SET display_name = ?, role = ?, updated_at = ? WHERE id = ?",
      ).run(nextDisplayName, nextRole, now, current.profileId); // sqlite-allow-raw -- Bound profile projection.
      if (!nextEnabled || nextRole !== current.role) {
        db.prepare(
          "UPDATE enterprise_auth_sessions SET revoked_at = ?, revoke_reason = ? WHERE account_id = ? AND revoked_at IS NULL",
        ).run(now, !nextEnabled ? "account_disabled" : "account_role_changed", accountId); // sqlite-allow-raw -- Policy identity changes revoke every active session.
      }
      const account = withoutPassword(toAccount(selectAccount(db, "id", accountId)!));
      if (applyPreset) {
        applyAccountAccessPreset(db, account, patch.config ?? {}, now, current.accessPresetKey);
      }
      if (patch.audit) {
        db.prepare(`INSERT INTO enterprise_audit_events
          (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
           before_json, after_json, outcome, created_at)
          VALUES (?, ?, ?, 'account.update', 'account', ?, ?, ?, ?, 'success', ?)`).run(
          generateSecureUuid(),
          patch.audit.actorAccountId,
          patch.audit.actorSessionId,
          accountId,
          patch.audit.requestId,
          JSON.stringify({ account: withoutPassword(current), permissions: beforePermissions }),
          JSON.stringify({
            account,
            appliedAccessPreset: applyPreset,
            permissions: readAccountPresetState(db, accountId),
          }),
          now,
        );
        // sqlite-allow-raw -- Account, effective overrides, and redacted audit are atomic.
      }
      return account;
    },
    options,
    { operationLabel: "enterprise.accounts.update" },
  );
}

export function markEnterpriseAccountLogin(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        "UPDATE enterprise_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?",
      ).run(now, now, accountId); // sqlite-allow-raw -- Fixed feature-local update.
    },
    options,
    { operationLabel: "enterprise.accounts.login" },
  );
}

/** Removes a just-created bootstrap account if enabling the module cannot be persisted. */
export function deleteEnterpriseAccountForBootstrapRollback(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    (database) => {
      const { db } = database;
      const account = selectAccount(db, "id", accountId);
      if (!account) {
        return;
      }
      removeEnterpriseDefaultAutomations(database, accountId, options.env);
      db.prepare("DELETE FROM enterprise_accounts WHERE id = ?").run(accountId); // sqlite-allow-raw -- Feature-local rollback.
      db.prepare(
        "DELETE FROM user_profile_identities WHERE provider = 'openclaw-account' AND subject = ? AND profile_id = ?",
      ).run(accountId, account.profile_id); // sqlite-allow-raw -- Removes only the bootstrap identity binding.
      db.prepare("DELETE FROM user_profiles WHERE id = ?").run(account.profile_id); // sqlite-allow-raw -- Profile was created in the same bootstrap attempt.
    },
    options,
    { operationLabel: "enterprise.accounts.bootstrap-rollback" },
  );
}
