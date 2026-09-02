import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import {
  buildKnowledgeGenerationIndex,
  doctorKnowledgeGenerationIndex,
  getKnowledgeGenerationEvidence,
  searchKnowledgeGenerationIndex,
  verifyKnowledgeCitationReference,
} from "./index-store.js";
import type { NormalizedKnowledgeArtifact } from "./knowledge-types.js";

const directories: string[] = [];

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-index-"));
  directories.push(directory);
  return {
    env: { ...process.env, OPENCLAW_STATE_DIR: directory },
    databaseOptions: { path: join(directory, "state.sqlite") },
  };
}

function artifact(): NormalizedKnowledgeArtifact {
  return {
    schemaVersion: 1,
    sourceId: "source-0001",
    sourceVersionId: "version-0001",
    sourceVersion: 3,
    title: "Quy trình nghỉ phép",
    mimeType: "text/markdown",
    createdAt: 1,
    parserProvenance: { parser: "test" },
    segments: [
      {
        id: "segment-0001",
        text: "Nhân viên gửi yêu cầu nghỉ phép trước ba ngày làm việc.",
        normalizedText: "Nhân viên gửi yêu cầu nghỉ phép trước ba ngày làm việc.",
        locator: { kind: "text", section: "Điều 4" },
        ordinal: 0,
      },
    ],
  };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("per-zone knowledge generation index", () => {
  it("builds a private immutable FTS index and returns exact signed evidence", async () => {
    const { env, databaseOptions } = fixture();
    const built = await buildKnowledgeGenerationIndex({
      zoneId: "zone-0001",
      generationId: "generation-0001",
      sourceSetRevision: 7,
      buildRevision: 7,
      artifacts: [artifact()],
      env,
    });
    expect(built.vectorStatus).toBe("unavailable");
    expect(statSync(built.path).mode & 0o777).toBe(0o600);
    const hits = await searchKnowledgeGenerationIndex({
      zoneId: "zone-0001",
      zoneLabel: "Nhân sự",
      generationId: "generation-0001",
      publicationId: "publication-0001",
      publishedAt: 1_700_000_000_000,
      query: "nghỉ phép",
      maxResults: 8,
      env,
      databaseOptions,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.citation).toMatchObject({
      zoneLabel: "Nhân sự",
      sourceTitle: "Quy trình nghỉ phép",
      sourceVersion: 3,
      locator: { kind: "text", section: "Điều 4" },
    });
    const reference = verifyKnowledgeCitationReference(hits[0]!.citationId, databaseOptions)!;
    expect(getKnowledgeGenerationEvidence({ reference, env })?.text).toContain("ba ngày");
    expect(
      verifyKnowledgeCitationReference(`${hits[0]!.citationId}tampered`, databaseOptions),
    ).toBeUndefined();
    await expect(
      doctorKnowledgeGenerationIndex({
        zoneId: "zone-0001",
        generationId: "generation-0001",
        expectedChecksum: built.checksum,
        env,
      }),
    ).resolves.toMatchObject({ ok: true, code: "OK", chunkCount: 1 });
    await expect(
      doctorKnowledgeGenerationIndex({
        zoneId: "zone-0001",
        generationId: "generation-0001",
        expectedChecksum: "f".repeat(64),
        env,
      }),
    ).resolves.toMatchObject({ ok: false, code: "INDEX_CHECKSUM_MISMATCH" });
  });
});
