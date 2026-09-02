import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { createKnowledgeZone } from "./knowledge-store.js";
import {
  appendKnowledgeUploadChunk,
  beginKnowledgeUpload,
  commitKnowledgeUpload,
  expireKnowledgeUploads,
} from "./upload-service.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("resumable knowledge upload", () => {
  it("accepts duplicate chunks idempotently and commit retries return exact identities", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-upload-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
    const account = createEnterpriseAccount(
      {
        username: "upload.curator",
        displayName: "Upload Curator",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      },
      options,
    );
    const zone = createKnowledgeZone(
      { slug: "upload-zone", name: "Upload Zone" },
      account.id,
      options,
    );
    const content = Buffer.from("enterprise knowledge upload");
    const upload = await beginKnowledgeUpload(
      {
        zoneId: zone.id,
        title: "Upload",
        originalName: "policy.txt",
        declaredMimeType: "text/plain",
        expectedSize: content.byteLength,
        expectedHash: createHash("sha256").update(content).digest("hex"),
      },
      account.id,
      options,
      env,
    );
    await appendKnowledgeUploadChunk(upload.id, account.id, 0, content, options, env);
    await expect(
      appendKnowledgeUploadChunk(upload.id, account.id, 0, content, options, env),
    ).resolves.toMatchObject({ receivedSize: content.byteLength });
    const first = await commitKnowledgeUpload(upload.id, account.id, options, env);
    const repeated = await commitKnowledgeUpload(upload.id, account.id, options, env);
    expect(repeated).toMatchObject({
      sourceId: first.sourceId,
      sourceVersionId: first.sourceVersionId,
      jobId: first.jobId,
    });
  });

  it("fences a concurrent chunk writer and expires abandoned staging uploads", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-upload-fence-"));
    directories.push(directory);
    const options = { path: join(directory, "state.sqlite") };
    const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
    const account = createEnterpriseAccount(
      {
        username: "upload.fence",
        displayName: "Upload Fence",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      },
      options,
    );
    const zone = createKnowledgeZone(
      { slug: "upload-fence", name: "Upload Fence" },
      account.id,
      options,
    );
    const upload = await beginKnowledgeUpload(
      {
        zoneId: zone.id,
        title: "Fenced upload",
        originalName: "fenced.txt",
        declaredMimeType: "text/plain",
        expectedSize: 4,
      },
      account.id,
      options,
      env,
    );
    openOpenClawStateDatabase(options)
      .db.prepare(
        `UPDATE enterprise_knowledge_uploads SET chunk_claim_token = 'other-worker',
       chunk_claim_offset = 0, chunk_claim_size = 4, chunk_claim_expires_at = ? WHERE id = ?`,
      )
      .run(Date.now() + 60_000, upload.id);
    await expect(
      appendKnowledgeUploadChunk(upload.id, account.id, 0, Buffer.from("test"), options, env),
    ).rejects.toMatchObject({ code: "UPLOAD_CHUNK_BUSY" });
    expect(await expireKnowledgeUploads(upload.expiresAt + 1, options, env)).toBe(1);
  });
});
