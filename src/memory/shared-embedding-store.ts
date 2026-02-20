import type { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { ensureDir, parseEmbedding } from "./internal.js";
import { requireNodeSqlite } from "./sqlite.js";

const EMBEDDING_CACHE_TABLE = "embedding_cache";
const STORE_CACHE = new Map<string, SharedEmbeddingStore>();
const log = createSubsystemLogger("memory");

export type SharedEmbeddingLookupParams = {
  provider: string;
  model: string;
  providerKey: string;
  hashes: string[];
};

export type SharedEmbeddingUpsertParams = {
  provider: string;
  model: string;
  providerKey: string;
  entries: Array<{ hash: string; embedding: number[] }>;
};

export function resolveSharedEmbeddingStorePath(env: NodeJS.ProcessEnv = process.env): string {
  const stateDir = resolveStateDir(env);
  return path.join(stateDir, "memory", "shared-embeddings.sqlite");
}

export function getSharedEmbeddingStore(params?: { env?: NodeJS.ProcessEnv }): {
  store: SharedEmbeddingStore | null;
  error?: string;
} {
  const dbPath = resolveSharedEmbeddingStorePath(params?.env ?? process.env);
  const existing = STORE_CACHE.get(dbPath);
  if (existing) {
    return { store: existing };
  }
  try {
    const store = new SharedEmbeddingStore(dbPath);
    STORE_CACHE.set(dbPath, store);
    return { store };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`shared embedding cache unavailable: ${message}`);
    return { store: null, error: message };
  }
}

export function closeSharedEmbeddingStores(): void {
  for (const store of STORE_CACHE.values()) {
    try {
      store.close();
    } catch {}
  }
  STORE_CACHE.clear();
}

export class SharedEmbeddingStore {
  readonly dbPath: string;
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.dbPath = path.resolve(dbPath);
    ensureDir(path.dirname(this.dbPath));
    const { DatabaseSync } = requireNodeSqlite();
    this.db = new DatabaseSync(this.dbPath);
    this.ensureSchema();
  }

  lookupMany(params: SharedEmbeddingLookupParams): Map<string, number[]> {
    const unique = dedupeHashes(params.hashes);
    if (unique.length === 0) {
      return new Map();
    }

    const out = new Map<string, number[]>();
    const baseParams = [params.provider, params.model, params.providerKey];
    const batchSize = 400;
    for (let start = 0; start < unique.length; start += batchSize) {
      const batch = unique.slice(start, start + batchSize);
      const placeholders = batch.map(() => "?").join(", ");
      const rows = this.db
        .prepare(
          `SELECT hash, embedding FROM ${EMBEDDING_CACHE_TABLE}\n` +
            ` WHERE provider = ? AND model = ? AND provider_key = ? AND hash IN (${placeholders})`,
        )
        .all(...baseParams, ...batch) as Array<{ hash: string; embedding: string }>;
      for (const row of rows) {
        out.set(row.hash, parseEmbedding(row.embedding));
      }
    }
    return out;
  }

  upsertMany(params: SharedEmbeddingUpsertParams): number {
    const uniqueEntries = dedupeEmbeddingEntries(params.entries);
    if (uniqueEntries.length === 0) {
      return 0;
    }

    const now = Date.now();
    const stmt = this.db.prepare(
      `INSERT INTO ${EMBEDDING_CACHE_TABLE} (provider, model, provider_key, hash, embedding, dims, updated_at)\n` +
        ` VALUES (?, ?, ?, ?, ?, ?, ?)\n` +
        ` ON CONFLICT(provider, model, provider_key, hash) DO UPDATE SET\n` +
        `   embedding=excluded.embedding,\n` +
        `   dims=excluded.dims,\n` +
        `   updated_at=excluded.updated_at`,
    );

    this.db.exec("BEGIN");
    try {
      for (const entry of uniqueEntries) {
        const embedding = entry.embedding ?? [];
        stmt.run(
          params.provider,
          params.model,
          params.providerKey,
          entry.hash,
          JSON.stringify(embedding),
          embedding.length,
          now,
        );
      }
      this.db.exec("COMMIT");
      return uniqueEntries.length;
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {}
      throw err;
    }
  }

  countEntries(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as c FROM ${EMBEDDING_CACHE_TABLE}`).get() as
      | { c: number }
      | undefined;
    return row?.c ?? 0;
  }

  close(): void {
    this.db.close();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${EMBEDDING_CACHE_TABLE} (
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        provider_key TEXT NOT NULL,
        hash TEXT NOT NULL,
        embedding TEXT NOT NULL,
        dims INTEGER,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (provider, model, provider_key, hash)
      );
    `);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_shared_embedding_cache_updated_at ON ${EMBEDDING_CACHE_TABLE}(updated_at);`,
    );
  }
}

function dedupeHashes(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const hash = raw.trim();
    if (!hash || seen.has(hash)) {
      continue;
    }
    seen.add(hash);
    out.push(hash);
  }
  return out;
}

function dedupeEmbeddingEntries(
  entries: Array<{ hash: string; embedding: number[] }>,
): Array<{ hash: string; embedding: number[] }> {
  const byHash = new Map<string, number[]>();
  for (const entry of entries) {
    const hash = entry.hash?.trim();
    if (!hash) {
      continue;
    }
    byHash.set(hash, entry.embedding ?? []);
  }
  return Array.from(byHash.entries()).map(([hash, embedding]) => ({ hash, embedding }));
}
