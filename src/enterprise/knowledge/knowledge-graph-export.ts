import { createHash } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { renderKnowledgeWikiLink } from "@openclaw/knowledge-graph-core";
import JSZip from "jszip";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  ensureEnterpriseKnowledgeArtifactDirectories,
  resolveKnowledgeGenerationDatabasePath,
} from "./artifact-store.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

const MAX_EXPORT_ENTRIES = 5_000;
const MAX_EXPORT_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;
const EXPORT_TTL_MS = 15 * 60 * 1_000;

type Row = Record<string, unknown>;

export type KnowledgeGraphExportRecord = {
  id: string;
  zoneId: string;
  publicationId: string;
  generationId: string;
  status: "running" | "complete" | "failed" | "expired";
  checksum: string | null;
  entryCount: number;
  uncompressedBytes: number;
  createdAt: number;
  completedAt: number | null;
  expiresAt: number;
  safeErrorCode: string | null;
};

function recordFromRow(row: Row): KnowledgeGraphExportRecord {
  return {
    id: String(row.id),
    zoneId: String(row.zone_id),
    publicationId: String(row.publication_id),
    generationId: String(row.generation_id),
    status: String(row.status) as KnowledgeGraphExportRecord["status"],
    checksum: typeof row.checksum === "string" ? row.checksum : null,
    entryCount: Number(row.entry_count),
    uncompressedBytes: Number(row.uncompressed_bytes),
    createdAt: Number(row.created_at),
    completedAt: row.completed_at === null ? null : Number(row.completed_at),
    expiresAt: Number(row.expires_at),
    safeErrorCode: typeof row.safe_error_code === "string" ? row.safe_error_code : null,
  };
}

function safeSlug(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized || "knowledge";
}

function nodeFolder(kind: string): string {
  if (kind === "entity") {
    return "entities";
  }
  if (kind === "concept") {
    return "concepts";
  }
  if (kind === "claim") {
    return "claims";
  }
  return "sources";
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/[\u0000-\u001f\u007f]/g, " "));
}

export async function buildObsidianArchive(params: {
  zoneId: string;
  generationId: string;
  zoneName: string;
  publishedAt: number;
  env?: NodeJS.ProcessEnv;
}): Promise<{ buffer: Buffer; checksum: string; entryCount: number; uncompressedBytes: number }> {
  const db = new DatabaseSync(
    resolveKnowledgeGenerationDatabasePath(params.zoneId, params.generationId, params.env),
    { readOnly: true },
  );
  try {
    const graphTable = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'graph_nodes'")
      .get();
    if (!graphTable) {
      throw new EnterpriseKnowledgeError(
        "GRAPH_NOT_BUILT",
        422,
        "The active publication has no graph.",
      );
    }
    const nodes = db
      .prepare(
        `SELECT n.*, c.original_text FROM graph_nodes n
         JOIN chunks c ON c.segment_id = n.primary_segment_id
         ORDER BY n.kind, n.label, n.id LIMIT ?`,
      )
      .all(MAX_EXPORT_ENTRIES + 1) as Row[];
    if (nodes.length > MAX_EXPORT_ENTRIES) {
      throw new EnterpriseKnowledgeError(
        "GRAPH_EXPORT_TOO_LARGE",
        413,
        "The graph exceeds the 5,000-entry export limit.",
      );
    }
    const acceptedEdges = db
      .prepare(
        `SELECT e.*, s.label AS source_label, t.label AS target_label
         FROM graph_edges e JOIN graph_nodes s ON s.id = e.source_node_id
         JOIN graph_nodes t ON t.id = e.target_node_id
         WHERE e.review_status = 'accepted' ORDER BY e.kind, e.id`,
      )
      .all() as Row[];
    const aliases = db.prepare(
      "SELECT alias FROM graph_node_aliases WHERE node_id = ? ORDER BY alias",
    );
    const fileByNode = new Map<string, string>();
    for (const node of nodes) {
      const suffix = createHash("sha256")
        .update(String(node.canonical_key))
        .digest("hex")
        .slice(0, 10);
      fileByNode.set(
        String(node.id),
        `${nodeFolder(String(node.kind))}/${safeSlug(String(node.label))}-${suffix}.md`,
      );
    }
    const outgoing = new Map<string, Row[]>();
    const incoming = new Map<string, Row[]>();
    for (const edge of acceptedEdges) {
      outgoing.set(String(edge.source_node_id), [
        ...(outgoing.get(String(edge.source_node_id)) ?? []),
        edge,
      ]);
      incoming.set(String(edge.target_node_id), [
        ...(incoming.get(String(edge.target_node_id)) ?? []),
        edge,
      ]);
    }
    const zip = new JSZip();
    let entryCount = 0;
    let uncompressedBytes = 0;
    const addEntry = (relativePath: string, contents: string): void => {
      entryCount += 1;
      uncompressedBytes += Buffer.byteLength(contents);
      if (entryCount > MAX_EXPORT_ENTRIES || uncompressedBytes > MAX_EXPORT_UNCOMPRESSED_BYTES) {
        throw new EnterpriseKnowledgeError(
          "GRAPH_EXPORT_TOO_LARGE",
          413,
          "The graph exceeds the safe Obsidian export limit.",
        );
      }
      zip.file(relativePath, contents, { createFolders: true });
    };

    for (const node of nodes) {
      const nodeId = String(node.id);
      const relativePath = fileByNode.get(nodeId)!;
      const nodeAliases = (aliases.all(nodeId) as Array<{ alias: string }>).map((row) => row.alias);
      const links = (outgoing.get(nodeId) ?? []).flatMap((edge) => {
        const targetPath = fileByNode.get(String(edge.target_node_id));
        if (!targetPath) {
          return [];
        }
        return [
          `- **${String(edge.kind)}** → ${renderKnowledgeWikiLink({
            renderMode: "obsidian",
            relativePath: targetPath,
            title: String(edge.target_label),
          })}`,
        ];
      });
      const backlinks = (incoming.get(nodeId) ?? []).flatMap((edge) => {
        const sourcePath = fileByNode.get(String(edge.source_node_id));
        if (!sourcePath) {
          return [];
        }
        return [
          `- **${String(edge.kind)}** ← ${renderKnowledgeWikiLink({
            renderMode: "obsidian",
            relativePath: sourcePath,
            title: String(edge.source_label),
          })}`,
        ];
      });
      const markdown = [
        "---",
        `title: ${yamlString(String(node.label))}`,
        `kind: ${yamlString(String(node.kind))}`,
        `aliases: [${nodeAliases.map(yamlString).join(", ")}]`,
        `confidence: ${Number(node.confidence).toFixed(4)}`,
        `origin: ${yamlString(String(node.origin))}`,
        "---",
        "",
        `# ${String(node.label).replace(/^#+\s*/, "")}`,
        "",
        String(node.original_text).slice(0, 50_000),
        "",
        "## Quan hệ",
        "",
        ...(links.length ? links : ["_Không có quan hệ đi._"]),
        "",
        "## Backlinks",
        "",
        ...(backlinks.length ? backlinks : ["_Không có backlink._"]),
        "",
      ].join("\n");
      addEntry(relativePath, markdown);
    }
    const indexLines = nodes.map((node) => {
      const target = fileByNode.get(String(node.id))!;
      return `- ${renderKnowledgeWikiLink({ renderMode: "obsidian", relativePath: target, title: String(node.label) })}`;
    });
    addEntry(
      "index.md",
      [
        `# ${params.zoneName}`,
        "",
        `Xuất từ active publication lúc ${new Date(params.publishedAt).toISOString()}.`,
        "",
        ...indexLines,
        "",
      ].join("\n"),
    );
    addEntry(
      "relationship-report.md",
      [
        "# Relationship report",
        "",
        ...acceptedEdges.map(
          (edge) =>
            `- ${String(edge.source_label)} --${String(edge.kind)}--> ${String(edge.target_label)} (${Number(edge.confidence).toFixed(3)})`,
        ),
        "",
      ].join("\n"),
    );
    const manifest = {
      format: "openclaw-enterprise-knowledge-obsidian-v1",
      exportedAt: new Date().toISOString(),
      publishedAt: new Date(params.publishedAt).toISOString(),
      counts: { nodes: nodes.length, edges: acceptedEdges.length },
      entries: [...fileByNode.values(), "index.md", "relationship-report.md"].toSorted(),
    };
    const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    addEntry("manifest.json", manifestText);
    const manifestChecksum = createHash("sha256").update(manifestText).digest("hex");
    addEntry("checksums.sha256", `${manifestChecksum}  manifest.json\n`);
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      platform: "UNIX",
    });
    return {
      buffer,
      checksum: createHash("sha256").update(buffer).digest("hex"),
      entryCount,
      uncompressedBytes,
    };
  } finally {
    db.close();
  }
}

export async function createKnowledgeGraphExport(params: {
  zoneId: string;
  actorAccountId: string;
  idempotencyKey: string;
  options?: OpenClawStateDatabaseOptions;
  env?: NodeJS.ProcessEnv;
}): Promise<KnowledgeGraphExportRecord> {
  const options = params.options ?? {};
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const existing = database.db
    .prepare(
      `SELECT * FROM enterprise_knowledge_graph_exports
       WHERE requested_by_account_id = ? AND zone_id = ? AND idempotency_key = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(params.actorAccountId, params.zoneId, params.idempotencyKey) as Row | undefined;
  if (existing) {
    return recordFromRow(existing);
  }
  const active = database.db
    .prepare(
      `SELECT z.name, p.id AS publication_id, p.generation_id, p.published_at,
              COALESCE(g.graph_status, 'not_built') AS graph_status
       FROM enterprise_knowledge_zones z
       JOIN enterprise_knowledge_publications p ON p.id = z.active_publication_id
       JOIN enterprise_knowledge_index_generations g ON g.id = p.generation_id
       WHERE z.id = ? AND z.status = 'active'`,
    )
    .get(params.zoneId) as Row | undefined;
  if (!active) {
    throw new EnterpriseKnowledgeError(
      "PUBLICATION_NOT_FOUND",
      404,
      "Active publication not found.",
    );
  }
  if (!["ready", "degraded"].includes(String(active.graph_status))) {
    throw new EnterpriseKnowledgeError(
      "GRAPH_NOT_BUILT",
      422,
      "The active publication has no graph.",
    );
  }
  const exportId = generateSecureUuid();
  const now = Date.now();
  const expiresAt = now + EXPORT_TTL_MS;
  runOpenClawStateWriteTransaction(
    ({ db }) =>
      db
        .prepare(
          `INSERT INTO enterprise_knowledge_graph_exports
           (id, zone_id, publication_id, generation_id, status, file_path, checksum,
            entry_count, uncompressed_bytes, requested_by_account_id, idempotency_key,
            safe_error_code, created_at, completed_at, expires_at)
           VALUES (?, ?, ?, ?, 'running', NULL, NULL, 0, 0, ?, ?, NULL, ?, NULL, ?)`,
        )
        .run(
          exportId,
          params.zoneId,
          String(active.publication_id),
          String(active.generation_id),
          params.actorAccountId,
          params.idempotencyKey,
          now,
          expiresAt,
        ),
    { ...options, database },
    { operationLabel: "enterprise.knowledge.graph.export.create" },
  );
  try {
    const archive = await buildObsidianArchive({
      zoneId: params.zoneId,
      generationId: String(active.generation_id),
      zoneName: String(active.name),
      publishedAt: Number(active.published_at),
      env: params.env,
    });
    const paths = await ensureEnterpriseKnowledgeArtifactDirectories(params.env);
    const filePath = path.join(paths.exports, `${exportId}.zip`);
    await writeFile(filePath, archive.buffer, { mode: 0o600, flag: "wx" });
    runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `UPDATE enterprise_knowledge_graph_exports SET status = 'complete', file_path = ?,
             checksum = ?, entry_count = ?, uncompressed_bytes = ?, completed_at = ? WHERE id = ?`,
          )
          .run(
            filePath,
            archive.checksum,
            archive.entryCount,
            archive.uncompressedBytes,
            Date.now(),
            exportId,
          ),
      { ...options, database },
      { operationLabel: "enterprise.knowledge.graph.export.finish" },
    );
  } catch (error) {
    runOpenClawStateWriteTransaction(
      ({ db }) =>
        db
          .prepare(
            `UPDATE enterprise_knowledge_graph_exports SET status = 'failed', safe_error_code = ?,
             completed_at = ? WHERE id = ?`,
          )
          .run(
            error instanceof EnterpriseKnowledgeError ? error.code : "GRAPH_EXPORT_FAILED",
            Date.now(),
            exportId,
          ),
      { ...options, database },
      { operationLabel: "enterprise.knowledge.graph.export.fail" },
    );
    throw error;
  }
  const row = database.db
    .prepare("SELECT * FROM enterprise_knowledge_graph_exports WHERE id = ?")
    .get(exportId) as Row;
  return recordFromRow(row);
}

export function getKnowledgeGraphExport(
  exportId: string,
  params: { zoneId: string; actorAccountId: string; options?: OpenClawStateDatabaseOptions },
): KnowledgeGraphExportRecord | undefined {
  const options = params.options ?? {};
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_knowledge_graph_exports
       WHERE id = ? AND zone_id = ? AND requested_by_account_id = ?`,
    )
    .get(exportId, params.zoneId, params.actorAccountId) as Row | undefined;
  return row ? recordFromRow(row) : undefined;
}

export async function readKnowledgeGraphExportDownload(
  exportId: string,
  params: {
    zoneId: string;
    actorAccountId: string;
    options?: OpenClawStateDatabaseOptions;
  },
): Promise<{ record: KnowledgeGraphExportRecord; buffer: Buffer }> {
  const options = params.options ?? {};
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const row = database.db
    .prepare(
      `SELECT * FROM enterprise_knowledge_graph_exports
       WHERE id = ? AND zone_id = ? AND requested_by_account_id = ?`,
    )
    .get(exportId, params.zoneId, params.actorAccountId) as Row | undefined;
  if (!row || String(row.status) !== "complete" || typeof row.file_path !== "string") {
    throw new EnterpriseKnowledgeError("GRAPH_EXPORT_NOT_FOUND", 404, "Graph export not found.");
  }
  if (Number(row.expires_at) <= Date.now()) {
    await unlink(row.file_path).catch(() => undefined);
    database.db
      .prepare(
        "UPDATE enterprise_knowledge_graph_exports SET status = 'expired', file_path = NULL WHERE id = ?",
      )
      .run(exportId);
    throw new EnterpriseKnowledgeError("GRAPH_EXPORT_EXPIRED", 410, "Graph export expired.");
  }
  return { record: recordFromRow(row), buffer: await readFile(row.file_path) };
}

export async function expireKnowledgeGraphExports(
  now = Date.now(),
  options: OpenClawStateDatabaseOptions = {},
): Promise<number> {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const rows = database.db
    .prepare(
      `SELECT id, file_path FROM enterprise_knowledge_graph_exports
       WHERE status = 'complete' AND expires_at <= ? LIMIT 200`,
    )
    .all(now) as Row[];
  for (const row of rows) {
    if (typeof row.file_path === "string") {
      await unlink(row.file_path).catch(() => undefined);
    }
  }
  if (rows.length) {
    const ids = new Set(rows.map((row) => String(row.id)));
    runOpenClawStateWriteTransaction(
      ({ db }) => {
        const expire = db.prepare(
          `UPDATE enterprise_knowledge_graph_exports SET status = 'expired', file_path = NULL
           WHERE id = ? AND status = 'complete' AND expires_at <= ?`,
        );
        for (const id of ids) {
          expire.run(id, now);
        }
      },
      { ...options, database },
      { operationLabel: "enterprise.knowledge.graph.export.expire" },
    );
  }
  return rows.length;
}
