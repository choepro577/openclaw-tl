import JSON5 from "json5";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type ProjectEntry, type ProjectStore, normalizeProjectName } from "./types.js";

function isProjectStoreRecord(value: unknown): value is ProjectStore {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function loadProjectStore(storePath: string): ProjectStore {
  let store: ProjectStore = {};
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    const parsed = JSON5.parse(raw);
    if (isProjectStoreRecord(parsed)) {
      store = parsed;
    }
  } catch {
    // Missing or invalid project store is treated as empty.
  }
  return structuredClone(store);
}

async function saveProjectStoreUnlocked(storePath: string, store: ProjectStore): Promise<void> {
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  const json = JSON.stringify(store, null, 2);

  if (process.platform === "win32") {
    await fs.promises.writeFile(storePath, json, "utf-8");
    return;
  }

  const tmp = `${storePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.promises.writeFile(tmp, json, { mode: 0o600, encoding: "utf-8" });
    await fs.promises.rename(tmp, storePath);
    await fs.promises.chmod(storePath, 0o600);
  } finally {
    await fs.promises.rm(tmp, { force: true }).catch(() => undefined);
  }
}

type ProjectStoreLockOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  staleMs?: number;
};

async function withProjectStoreLock<T>(
  storePath: string,
  fn: () => Promise<T>,
  opts: ProjectStoreLockOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 25;
  const staleMs = opts.staleMs ?? 30_000;
  const lockPath = `${storePath}.lock`;
  const startedAt = Date.now();

  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });

  while (true) {
    try {
      const handle = await fs.promises.open(lockPath, "wx");
      try {
        await handle.writeFile(
          JSON.stringify({ pid: process.pid, startedAt: Date.now() }),
          "utf-8",
        );
      } catch {
        // best-effort
      }
      await handle.close();
      break;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code)
          : null;
      if (code !== "EEXIST") {
        throw err;
      }

      const now = Date.now();
      if (now - startedAt > timeoutMs) {
        throw new Error(`timeout acquiring project store lock: ${lockPath}`, { cause: err });
      }

      try {
        const st = await fs.promises.stat(lockPath);
        const ageMs = now - st.mtimeMs;
        if (ageMs > staleMs) {
          await fs.promises.unlink(lockPath);
          continue;
        }
      } catch {
        // ignore
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  try {
    return await fn();
  } finally {
    await fs.promises.unlink(lockPath).catch(() => undefined);
  }
}

export async function updateProjectStore<T>(
  storePath: string,
  mutator: (store: ProjectStore) => Promise<T> | T,
): Promise<T> {
  return await withProjectStoreLock(storePath, async () => {
    const store = loadProjectStore(storePath);
    const result = await mutator(store);
    await saveProjectStoreUnlocked(storePath, store);
    return result;
  });
}

export function findProjectById(store: ProjectStore, projectId: string): ProjectEntry | undefined {
  const key = projectId.trim();
  if (!key) {
    return undefined;
  }
  return store[key];
}

export function findProjectByNormalizedName(
  store: ProjectStore,
  name: string,
): ProjectEntry | undefined {
  const normalized = normalizeProjectName(name);
  if (!normalized) {
    return undefined;
  }
  return Object.values(store).find((entry) => normalizeProjectName(entry.name) === normalized);
}
