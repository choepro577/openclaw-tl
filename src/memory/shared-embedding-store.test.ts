import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeSharedEmbeddingStores,
  getSharedEmbeddingStore,
  resolveSharedEmbeddingStorePath,
} from "./shared-embedding-store.js";

describe("shared embedding store", () => {
  let tmpDir = "";
  let prevStateDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-shared-embed-"));
    prevStateDir = process.env.OPENCLAW_STATE_DIR;
    process.env.OPENCLAW_STATE_DIR = tmpDir;
  });

  afterEach(async () => {
    closeSharedEmbeddingStores();
    if (prevStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = prevStateDir;
    }
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("resolves db path under active state dir", () => {
    expect(resolveSharedEmbeddingStorePath(process.env)).toBe(
      path.join(tmpDir, "memory", "shared-embeddings.sqlite"),
    );
  });

  it("writes and reads shared embeddings by provider/model/providerKey/hash", () => {
    const first = getSharedEmbeddingStore({ env: process.env });
    if (!first.store) {
      expect(first.error).toBeTruthy();
      return;
    }

    const store = first.store!;
    const written = store.upsertMany({
      provider: "openai",
      model: "text-embedding-3-small",
      providerKey: "pk-1",
      entries: [
        { hash: "h1", embedding: [0.1, 0.2] },
        { hash: "h1", embedding: [0.1, 0.2] },
        { hash: "h2", embedding: [0.3, 0.4] },
      ],
    });
    expect(written).toBe(2);

    const second = getSharedEmbeddingStore({ env: process.env });
    expect(second.store).toBe(store);

    const found = store.lookupMany({
      provider: "openai",
      model: "text-embedding-3-small",
      providerKey: "pk-1",
      hashes: ["h1", "missing", "h2"],
    });
    expect(found.get("h1")).toEqual([0.1, 0.2]);
    expect(found.get("h2")).toEqual([0.3, 0.4]);
    expect(found.has("missing")).toBe(false);
    expect(store.countEntries()).toBe(2);
  });
});
