import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { resolveKnowledgeGenerationDatabasePath } from "./artifact-store.js";
import {
  buildKnowledgeGenerationIndex,
  doctorKnowledgeGenerationIndex,
  getKnowledgeGenerationEvidence,
  searchKnowledgeGenerationIndex,
  searchKnowledgeGenerationIndexWithGraph,
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

function artifact(
  input: { sourceId?: string; title?: string; text?: string } = {},
): NormalizedKnowledgeArtifact {
  const sourceId = input.sourceId ?? "source-0001";
  const text = input.text ?? "Nhân viên gửi yêu cầu nghỉ phép trước ba ngày làm việc.";
  return {
    schemaVersion: 1,
    sourceId,
    sourceVersionId: `${sourceId}-version`,
    sourceVersion: 3,
    title: input.title ?? "Quy trình nghỉ phép",
    mimeType: "text/markdown",
    createdAt: 1,
    parserProvenance: { parser: "test" },
    segments: [
      {
        id: `${sourceId}-segment`,
        text,
        normalizedText: text,
        locator: { kind: "text", section: "Điều 4" },
        ordinal: 0,
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("per-zone knowledge generation index", () => {
  it("builds a structural graph without graph configuration", async () => {
    const setup = fixture();
    const result = await buildKnowledgeGenerationIndex({
      zoneId: "zone-hr01",
      generationId: "generation-default",
      sourceSetRevision: 1,
      buildRevision: 1,
      artifacts: [artifact()],
      env: setup.env,
    });
    expect(result.graphStatus).toBe("ready");
    expect(result.graphNodeCount).toBe(2);
    expect(result.graphEdgeCount).toBe(1);
  });

  it.each([
    "dữ liệu sao lưu",
    "du lieu sao luu",
    "Mình muốn hỏi bạn một câu để nắm rõ thông tin và chuẩn bị trao đổi với đồng nghiệp trong buổi họp chiều nay, vui lòng giúp mình xác nhận nội dung sau: Dữ liệu sao lưu được giữ bao lâu?",
  ])("ranks the relevant evidence above another zone's first local match for %s", async (query) => {
    const setup = fixture();
    const results = [];
    for (const [zoneId, document] of [
      [
        "zone-hr01",
        artifact({
          title: "Hướng dẫn nhân viên",
          text: "Nhân viên kiểm tra dữ liệu nghỉ phép trước khi bàn giao công việc.",
        }),
      ],
      ["zone-it01", artifact({ title: "An toàn", text: "Dữ liệu sao lưu: 35 ngày." })],
    ] as const) {
      await buildKnowledgeGenerationIndex({
        zoneId,
        generationId: "generation-one",
        sourceSetRevision: 1,
        buildRevision: 1,
        artifacts: [document],
        env: setup.env,
      });
      results.push(
        await searchKnowledgeGenerationIndex({
          zoneId,
          zoneLabel: zoneId,
          generationId: "generation-one",
          publicationId: "publication-one",
          publishedAt: 1,
          query,
          maxResults: 1,
          ...setup,
        }),
      );
    }
    expect(results[0]).toHaveLength(1);
    expect(results[1]).toHaveLength(1);
    expect(results[1]![0]!.score).toBeGreaterThan(results[0]![0]!.score);
    const top = results.flat().toSorted((left, right) => right.score - left.score)[0]!;
    expect(top.citation.sourceTitle).toBe("An toàn");
    const reference = verifyKnowledgeCitationReference(top.citationId, setup.databaseOptions)!;
    expect(getKnowledgeGenerationEvidence({ reference, env: setup.env })?.text).toContain(
      "35 ngày",
    );
  });

  it.each([
    { graphExpansion: "off", built: false, timeout: false, availability: "disabled" },
    { graphExpansion: "shadow", built: false, timeout: false, availability: "not_built" },
    { graphExpansion: "on", built: false, timeout: false, availability: "not_built" },
    { graphExpansion: "shadow", built: true, timeout: false, availability: "available" },
    { graphExpansion: "on", built: true, timeout: false, availability: "available" },
    { graphExpansion: "on", built: true, timeout: true, availability: "timeout" },
  ] as const)(
    "preserves twelve hybrid hits with graph $graphExpansion / $availability",
    async ({ graphExpansion, built, timeout, availability }) => {
      const setup = fixture();
      const documents = Array.from({ length: 12 }, (_, index) =>
        artifact({
          sourceId: `source-${index}`,
          title: `Quy trình ${index}`,
          text: `Dữ liệu sao lưu của hệ thống ${index} được giữ trong 35 ngày.`,
        }),
      );
      await buildKnowledgeGenerationIndex({
        zoneId: "zone-it01",
        generationId: "generation-one",
        sourceSetRevision: 1,
        buildRevision: 1,
        artifacts: documents,
        env: setup.env,
        ...(built
          ? {
              graph: {
                settings: {
                  enabled: true,
                  enrichmentEnabled: false,
                  autoApprovalThreshold: 0.92,
                  updatedAt: 1,
                },
                reviewOverlays: [],
                manualEdges: [],
              },
            }
          : {}),
      });
      if (!built) {
        // Reproduce a legacy generation created before structural graphs were mandatory.
        const legacy = new DatabaseSync(
          resolveKnowledgeGenerationDatabasePath("zone-it01", "generation-one", setup.env),
        );
        legacy.exec("PRAGMA foreign_keys=OFF; DROP TABLE graph_nodes;");
        legacy.close();
      }
      if (timeout) {
        let now = Date.now();
        vi.spyOn(Date, "now").mockImplementation(() => (now += 2_000));
      }
      const result = await searchKnowledgeGenerationIndexWithGraph({
        zoneId: "zone-it01",
        zoneLabel: "IT",
        generationId: "generation-one",
        publicationId: "publication-one",
        publishedAt: 1,
        query: "dữ liệu sao lưu",
        maxResults: 12,
        graphExpansion,
        ...setup,
      });
      expect(result.hits).toHaveLength(12);
      expect(new Set(result.hits.map((hit) => hit.citation.sourceTitle)).size).toBe(12);
      expect(result.graph).toMatchObject({ availability, seedCount: 8 });
    },
  );

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
