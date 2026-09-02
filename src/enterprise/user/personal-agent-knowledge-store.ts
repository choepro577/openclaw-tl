import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { PersonalAgentKnowledgeItem } from "./user-api-contracts.js";

type KnowledgeRow = {
  id: string;
  title: string;
  kind: "note" | "upload";
  source_name: string | null;
  content: string;
  revision: number;
  created_at: number;
  updated_at: number;
};

function toKnowledgeItem(row: KnowledgeRow): PersonalAgentKnowledgeItem {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    sourceName: row.source_name,
    content: row.content,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function knowledgeRows(accountId: string, options: OpenClawStateDatabaseOptions) {
  ensureEnterpriseSchema(options);
  return openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT id, title, kind, source_name, content, revision, created_at, updated_at
       FROM enterprise_personal_agent_knowledge
       WHERE account_id = ? ORDER BY updated_at DESC, id ASC`,
    )
    .all(accountId) as KnowledgeRow[]; // sqlite-allow-raw -- Account-scoped personal knowledge projection.
}

export function listPersonalAgentKnowledge(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentKnowledgeItem[] {
  return knowledgeRows(accountId, options).map(toKnowledgeItem);
}

export function createPersonalAgentKnowledge(
  accountId: string,
  input: Pick<PersonalAgentKnowledgeItem, "title" | "kind" | "sourceName" | "content">,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentKnowledgeItem {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const totals = db
        .prepare(
          `SELECT COUNT(*) AS item_count, COALESCE(SUM(LENGTH(content)), 0) AS content_length
           FROM enterprise_personal_agent_knowledge WHERE account_id = ?`,
        )
        .get(accountId) as { item_count: number; content_length: number }; // sqlite-allow-raw -- Enforces account knowledge limits atomically.
      if (totals.item_count >= 20) {
        throw new Error("KNOWLEDGE_ITEM_LIMIT");
      }
      const duplicate = db
        .prepare(
          "SELECT 1 FROM enterprise_personal_agent_knowledge WHERE account_id = ? AND title = ? COLLATE NOCASE LIMIT 1",
        )
        .get(accountId, input.title); // sqlite-allow-raw -- Prevents ambiguous duplicate titles within one owner scope.
      if (duplicate) {
        throw new Error("KNOWLEDGE_TITLE_DUPLICATE");
      }
      if (totals.content_length + input.content.length > 16_000) {
        throw new Error("KNOWLEDGE_TOTAL_LIMIT");
      }
      const now = Date.now();
      const item: PersonalAgentKnowledgeItem = {
        id: generateSecureUuid(),
        ...input,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      db.prepare(
        `INSERT INTO enterprise_personal_agent_knowledge
          (id, account_id, title, kind, source_name, content, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        item.id,
        accountId,
        item.title,
        item.kind,
        item.sourceName,
        item.content,
        item.revision,
        item.createdAt,
        item.updatedAt,
      ); // sqlite-allow-raw -- Creates knowledge only under the authenticated account.
      return item;
    },
    options,
    { operationLabel: "enterprise.personal-knowledge.create" },
  );
}

export function updatePersonalAgentKnowledge(
  accountId: string,
  id: string,
  baseRevision: number,
  input: Pick<PersonalAgentKnowledgeItem, "title" | "content">,
  options: OpenClawStateDatabaseOptions = {},
): PersonalAgentKnowledgeItem {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare(
          `SELECT id, title, kind, source_name, content, revision, created_at, updated_at
           FROM enterprise_personal_agent_knowledge
           WHERE account_id = ? AND id = ? LIMIT 1`,
        )
        .get(accountId, id) as KnowledgeRow | undefined; // sqlite-allow-raw -- Owner and id form the lookup boundary.
      if (!current) {
        throw new Error("KNOWLEDGE_NOT_FOUND");
      }
      if (current.revision !== baseRevision) {
        throw new Error(`KNOWLEDGE_REVISION_CONFLICT:${current.revision}`);
      }
      const duplicate = db
        .prepare(
          "SELECT 1 FROM enterprise_personal_agent_knowledge WHERE account_id = ? AND id <> ? AND title = ? COLLATE NOCASE LIMIT 1",
        )
        .get(accountId, id, input.title); // sqlite-allow-raw -- Duplicate check remains account-scoped during edit.
      if (duplicate) {
        throw new Error("KNOWLEDGE_TITLE_DUPLICATE");
      }
      const totals = db
        .prepare(
          `SELECT COALESCE(SUM(LENGTH(content)), 0) AS content_length
           FROM enterprise_personal_agent_knowledge WHERE account_id = ? AND id <> ?`,
        )
        .get(accountId, id) as { content_length: number }; // sqlite-allow-raw -- Enforces the account aggregate limit.
      if (totals.content_length + input.content.length > 16_000) {
        throw new Error("KNOWLEDGE_TOTAL_LIMIT");
      }
      const updatedAt = Date.now();
      const revision = current.revision + 1;
      db.prepare(
        `UPDATE enterprise_personal_agent_knowledge
         SET title = ?, content = ?, revision = ?, updated_at = ?
         WHERE account_id = ? AND id = ?`,
      ).run(input.title, input.content, revision, updatedAt, accountId, id); // sqlite-allow-raw -- Owner-scoped knowledge update.
      return toKnowledgeItem({
        ...current,
        title: input.title,
        content: input.content,
        revision,
        updated_at: updatedAt,
      });
    },
    options,
    { operationLabel: "enterprise.personal-knowledge.update" },
  );
}

export function deletePersonalAgentKnowledge(
  accountId: string,
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const result = db
        .prepare("DELETE FROM enterprise_personal_agent_knowledge WHERE account_id = ? AND id = ?")
        .run(accountId, id); // sqlite-allow-raw -- Cannot delete another account's knowledge.
      if (result.changes === 0) {
        throw new Error("KNOWLEDGE_NOT_FOUND");
      }
    },
    options,
    { operationLabel: "enterprise.personal-knowledge.delete" },
  );
}

export function clearPersonalAgentKnowledge(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare("DELETE FROM enterprise_personal_agent_knowledge WHERE account_id = ?").run(
        accountId,
      ); // sqlite-allow-raw -- Reset only clears Knowledge owned by the authenticated account.
    },
    options,
    { operationLabel: "enterprise.personal-knowledge.clear" },
  );
}
