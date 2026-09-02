import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { EnterpriseConversationProject } from "./user-api-contracts.js";

type ConversationProjectRow = {
  id: string;
  name: string;
  position: number;
  created_at: number;
  updated_at: number;
};

type ConversationProjectSessionRow = {
  project_id: string;
  session_key: string;
};

function normalizeConversationProjectName(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.length > 80) {
    throw new Error("CONVERSATION_PROJECT_NAME_INVALID");
  }
  return normalized;
}

function projectFromRow(
  row: ConversationProjectRow,
  sessionKeys: readonly string[] = [],
): EnterpriseConversationProject {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    sessionKeys: [...sessionKeys],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function selectConversationProject(
  accountId: string,
  projectId: string,
  options: OpenClawStateDatabaseOptions,
): ConversationProjectRow | undefined {
  return openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT id, name, position, created_at, updated_at
       FROM enterprise_conversation_projects
       WHERE account_id = ? AND id = ? LIMIT 1`,
    )
    .get(accountId, projectId) as ConversationProjectRow | undefined; // sqlite-allow-raw -- Account and project form the ownership boundary.
}

export function listEnterpriseConversationProjects(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseConversationProject[] {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const rows = db
    .prepare(
      `SELECT id, name, position, created_at, updated_at
       FROM enterprise_conversation_projects
       WHERE account_id = ? ORDER BY position ASC, id ASC`,
    )
    .all(accountId) as ConversationProjectRow[]; // sqlite-allow-raw -- Projects never cross the authenticated account.
  const assignments = db
    .prepare(
      `SELECT project_id, session_key
       FROM enterprise_conversation_project_sessions
       WHERE account_id = ? ORDER BY project_id ASC, position ASC, session_key ASC`,
    )
    .all(accountId) as ConversationProjectSessionRow[]; // sqlite-allow-raw -- Assignments share the same account scope.
  const sessionKeysByProject = new Map<string, string[]>();
  for (const assignment of assignments) {
    const keys = sessionKeysByProject.get(assignment.project_id) ?? [];
    keys.push(assignment.session_key);
    sessionKeysByProject.set(assignment.project_id, keys);
  }
  return rows.map((row) => projectFromRow(row, sessionKeysByProject.get(row.id)));
}

export function createEnterpriseConversationProject(
  accountId: string,
  input: { name: string; idempotencyKey: string },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseConversationProject {
  ensureEnterpriseSchema(options);
  const name = normalizeConversationProjectName(input.name);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new Error("CONVERSATION_PROJECT_IDEMPOTENCY_KEY_INVALID");
  }
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const replay = db
        .prepare(
          `SELECT id, name, position, created_at, updated_at
           FROM enterprise_conversation_projects
           WHERE account_id = ? AND idempotency_key = ? LIMIT 1`,
        )
        .get(accountId, idempotencyKey) as ConversationProjectRow | undefined; // sqlite-allow-raw -- Idempotency is reserved per account.
      if (replay) {
        return projectFromRow(replay);
      }
      const duplicate = db
        .prepare(
          `SELECT 1 FROM enterprise_conversation_projects
           WHERE account_id = ? AND name = ? COLLATE NOCASE LIMIT 1`,
        )
        .get(accountId, name); // sqlite-allow-raw -- Names are unique only within one account.
      if (duplicate) {
        throw new Error("CONVERSATION_PROJECT_NAME_DUPLICATE");
      }
      const latest = db
        .prepare(
          `SELECT MAX(position) AS max_position
           FROM enterprise_conversation_projects WHERE account_id = ?`,
        )
        .get(accountId) as { max_position: number | null }; // sqlite-allow-raw -- New projects append inside the owner order.
      const now = Date.now();
      const project: EnterpriseConversationProject = {
        id: generateSecureUuid(),
        name,
        position: (latest.max_position ?? -1) + 1,
        sessionKeys: [],
        createdAt: now,
        updatedAt: now,
      };
      db.prepare(
        `INSERT INTO enterprise_conversation_projects
          (id, account_id, name, idempotency_key, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        project.id,
        accountId,
        project.name,
        idempotencyKey,
        project.position,
        project.createdAt,
        project.updatedAt,
      ); // sqlite-allow-raw -- Creates the project under the authenticated account.
      return project;
    },
    options,
    { operationLabel: "enterprise.conversation-project.create" },
  );
}

export function renameEnterpriseConversationProject(
  accountId: string,
  projectId: string,
  name: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseConversationProject {
  ensureEnterpriseSchema(options);
  const normalizedName = normalizeConversationProjectName(name);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare(
          `SELECT id, name, position, created_at, updated_at
           FROM enterprise_conversation_projects
           WHERE account_id = ? AND id = ? LIMIT 1`,
        )
        .get(accountId, projectId) as ConversationProjectRow | undefined; // sqlite-allow-raw -- Owner and id form the update boundary.
      if (!current) {
        throw new Error("CONVERSATION_PROJECT_NOT_FOUND");
      }
      const duplicate = db
        .prepare(
          `SELECT 1 FROM enterprise_conversation_projects
           WHERE account_id = ? AND id <> ? AND name = ? COLLATE NOCASE LIMIT 1`,
        )
        .get(accountId, projectId, normalizedName); // sqlite-allow-raw -- Prevents ambiguous sibling names.
      if (duplicate) {
        throw new Error("CONVERSATION_PROJECT_NAME_DUPLICATE");
      }
      const sessionKeys = db
        .prepare(
          `SELECT session_key FROM enterprise_conversation_project_sessions
           WHERE account_id = ? AND project_id = ? ORDER BY position ASC, session_key ASC`,
        )
        .all(accountId, projectId)
        .map((row) => (row as { session_key: string }).session_key); // sqlite-allow-raw -- Preserves assignment projection after rename.
      if (current.name === normalizedName) {
        return projectFromRow(current, sessionKeys);
      }
      const updatedAt = Date.now();
      db.prepare(
        `UPDATE enterprise_conversation_projects SET name = ?, updated_at = ?
         WHERE account_id = ? AND id = ?`,
      ).run(normalizedName, updatedAt, accountId, projectId); // sqlite-allow-raw -- Account-scoped project rename.
      return projectFromRow(
        { ...current, name: normalizedName, updated_at: updatedAt },
        sessionKeys,
      );
    },
    options,
    { operationLabel: "enterprise.conversation-project.rename" },
  );
}

export function deleteEnterpriseConversationProject(
  accountId: string,
  projectId: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const result = db
        .prepare("DELETE FROM enterprise_conversation_projects WHERE account_id = ? AND id = ?")
        .run(accountId, projectId); // sqlite-allow-raw -- Cascade clears assignments but never sessions.
      if (result.changes === 0) {
        throw new Error("CONVERSATION_PROJECT_NOT_FOUND");
      }
    },
    options,
    { operationLabel: "enterprise.conversation-project.delete" },
  );
}

export function assignEnterpriseConversationProject(
  accountId: string,
  sessionKey: string,
  projectId: string | null,
  beforeSessionKey?: string | null,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const normalizedSessionKey = sessionKey.trim();
  if (!normalizedSessionKey || normalizedSessionKey.length > 512) {
    throw new Error("CONVERSATION_SESSION_KEY_INVALID");
  }
  const normalizedBeforeSessionKey = beforeSessionKey?.trim() || null;
  if (
    normalizedBeforeSessionKey !== null &&
    (normalizedBeforeSessionKey.length > 512 || normalizedBeforeSessionKey === normalizedSessionKey)
  ) {
    throw new Error("CONVERSATION_PROJECT_PLACEMENT_INVALID");
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      if (projectId === null) {
        if (beforeSessionKey !== undefined) {
          throw new Error("CONVERSATION_PROJECT_PLACEMENT_INVALID");
        }
        db.prepare(
          `DELETE FROM enterprise_conversation_project_sessions
           WHERE account_id = ? AND session_key = ?`,
        ).run(accountId, normalizedSessionKey); // sqlite-allow-raw -- Unassign only touches this account's placement.
        return;
      }
      const project = db
        .prepare(
          "SELECT 1 FROM enterprise_conversation_projects WHERE account_id = ? AND id = ? LIMIT 1",
        )
        .get(accountId, projectId); // sqlite-allow-raw -- A foreign project is indistinguishable from a missing project.
      if (!project) {
        throw new Error("CONVERSATION_PROJECT_NOT_FOUND");
      }
      const orderedSessionKeys = (
        db
          .prepare(
            `SELECT session_key FROM enterprise_conversation_project_sessions
             WHERE account_id = ? AND project_id = ? AND session_key <> ?
             ORDER BY position ASC, session_key ASC`,
          )
          .all(accountId, projectId, normalizedSessionKey) as Array<{ session_key: string }>
      ).map((row) => row.session_key);
      const insertionIndex =
        beforeSessionKey === undefined
          ? 0
          : normalizedBeforeSessionKey === null
            ? orderedSessionKeys.length
            : orderedSessionKeys.indexOf(normalizedBeforeSessionKey);
      if (insertionIndex < 0) {
        throw new Error("CONVERSATION_PROJECT_PLACEMENT_INVALID");
      }
      orderedSessionKeys.splice(insertionIndex, 0, normalizedSessionKey);
      const now = Date.now();
      db.prepare(
        `INSERT INTO enterprise_conversation_project_sessions
          (account_id, project_id, session_key, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id, session_key) DO UPDATE SET
           project_id = excluded.project_id,
           position = excluded.position,
           updated_at = excluded.updated_at`,
      ).run(accountId, projectId, normalizedSessionKey, insertionIndex, now, now); // sqlite-allow-raw -- One session has one ordered Project placement inside its owner scope.
      const updatePosition = db.prepare(
        `UPDATE enterprise_conversation_project_sessions SET position = ?
         WHERE account_id = ? AND project_id = ? AND session_key = ?`,
      );
      for (const [position, orderedSessionKey] of orderedSessionKeys.entries()) {
        updatePosition.run(position, accountId, projectId, orderedSessionKey); // sqlite-allow-raw -- Renumber only the authenticated destination Project.
      }
    },
    options,
    { operationLabel: "enterprise.conversation-project.assign" },
  );
}

export function readEnterpriseConversationProject(
  accountId: string,
  projectId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseConversationProject | undefined {
  ensureEnterpriseSchema(options);
  const row = selectConversationProject(accountId, projectId, options);
  if (!row) {
    return undefined;
  }
  return listEnterpriseConversationProjects(accountId, options).find(
    (project) => project.id === projectId,
  );
}
