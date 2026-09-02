import {
  openOpenClawStateDatabase,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { KnowledgeGraphSnapshotContext } from "./graph-query.js";
import { EnterpriseKnowledgeError, type KnowledgeGraphSnapshot } from "./knowledge-types.js";

type Row = Record<string, unknown>;

export function resolveKnowledgeGraphSnapshotContext(params: {
  zoneId: string;
  snapshot: KnowledgeGraphSnapshot;
  options?: OpenClawStateDatabaseOptions;
  env?: NodeJS.ProcessEnv;
}): KnowledgeGraphSnapshotContext {
  const options = params.options ?? {};
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  let row: Row | undefined;
  if (params.snapshot === "active") {
    row = db
      .prepare(
        `SELECT z.name, p.id AS publication_id, p.generation_id, p.published_at,
                COALESCE(g.graph_status, 'not_built') AS graph_status
         FROM enterprise_knowledge_zones z
         JOIN enterprise_knowledge_publications p ON p.id = z.active_publication_id
         JOIN enterprise_knowledge_index_generations g ON g.id = p.generation_id
         WHERE z.id = ? AND z.status = 'active'`,
      )
      .get(params.zoneId) as Row | undefined;
  } else {
    row = db
      .prepare(
        `SELECT z.name, NULL AS publication_id, g.id AS generation_id,
                g.created_at AS published_at, COALESCE(g.graph_status, 'not_built') AS graph_status
         FROM enterprise_knowledge_zones z
         JOIN enterprise_knowledge_index_generations g ON g.zone_id = z.id
         WHERE z.id = ? AND z.status = 'active' AND g.status = 'candidate'
         ORDER BY COALESCE(g.build_revision, g.source_set_revision) DESC, g.created_at DESC LIMIT 1`,
      )
      .get(params.zoneId) as Row | undefined;
  }
  if (!row) {
    throw new EnterpriseKnowledgeError(
      params.snapshot === "active" ? "PUBLICATION_NOT_FOUND" : "CANDIDATE_NOT_READY",
      404,
      "Knowledge graph snapshot not found.",
    );
  }
  if (String(row.graph_status) === "not_built") {
    throw new EnterpriseKnowledgeError(
      "GRAPH_NOT_BUILT",
      422,
      "This generation does not contain a graph. Build a new candidate.",
    );
  }
  if (String(row.graph_status) === "error") {
    throw new EnterpriseKnowledgeError(
      "GRAPH_INTEGRITY_FAILED",
      422,
      "The graph failed integrity checks.",
    );
  }
  return {
    zoneId: params.zoneId,
    zoneLabel: String(row.name),
    generationId: String(row.generation_id),
    publicationId: typeof row.publication_id === "string" ? row.publication_id : null,
    snapshot: params.snapshot,
    publishedAt: Number(row.published_at),
    env: params.env,
    databaseOptions: options,
  };
}
