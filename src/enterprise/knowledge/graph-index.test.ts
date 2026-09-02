import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import {
  readKnowledgeGraphNeighborhood,
  readKnowledgeGraphAnalysisSummary,
  readKnowledgeGraphNodeDetail,
  searchKnowledgeGraphNodes,
  type KnowledgeGraphSnapshotContext,
} from "./graph-query.js";
import {
  buildKnowledgeGenerationIndex,
  searchKnowledgeGenerationIndexWithGraph,
} from "./index-store.js";
import type {
  NormalizedKnowledgeArtifactV2,
  NormalizedKnowledgeArtifactV3,
} from "./knowledge-types.js";

const directories: string[] = [];

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-knowledge-graph-"));
  directories.push(directory);
  return {
    env: { ...process.env, OPENCLAW_STATE_DIR: directory },
    databaseOptions: { path: join(directory, "state.sqlite") },
  };
}

function artifacts(): NormalizedKnowledgeArtifactV2[] {
  return [
    {
      schemaVersion: 2,
      sourceId: "policy",
      sourceVersionId: "policy-v1",
      sourceVersion: 1,
      title: "Leave policy",
      mimeType: "text/markdown",
      createdAt: 1,
      parserProvenance: { parser: "test" },
      segments: [
        {
          id: "policy-segment",
          text: "Annual leave requires manager approval. See [[Benefits]].",
          normalizedText: "Annual leave requires manager approval. See Benefits.",
          locator: { kind: "text", section: "Annual leave" },
          ordinal: 0,
        },
      ],
      graphSignals: {
        aliases: ["Vacation policy"],
        headings: [
          {
            text: "Annual leave",
            level: 1,
            segmentId: "policy-segment",
            locator: { kind: "text", section: "Annual leave" },
          },
        ],
        links: [
          {
            kind: "wikilink",
            target: "Benefits",
            alias: undefined,
            rawTarget: "Benefits",
            segmentId: "policy-segment",
            locator: { kind: "text", section: "Annual leave" },
          },
        ],
      },
    },
    {
      schemaVersion: 2,
      sourceId: "benefits",
      sourceVersionId: "benefits-v1",
      sourceVersion: 1,
      title: "Benefits",
      mimeType: "text/markdown",
      createdAt: 1,
      parserProvenance: { parser: "test" },
      segments: [
        {
          id: "benefits-segment",
          text: "Benefits include paid annual leave.",
          normalizedText: "Benefits include paid annual leave.",
          locator: { kind: "text", section: "Overview" },
          ordinal: 0,
        },
      ],
      graphSignals: {
        aliases: ["Employee benefits"],
        headings: [
          {
            text: "Overview",
            level: 1,
            segmentId: "benefits-segment",
            locator: { kind: "text", section: "Overview" },
          },
        ],
        links: [],
      },
    },
  ];
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Enterprise Knowledge graph generation", () => {
  it("builds a V3 chapter hierarchy without a source-to-paragraph fan", async () => {
    const { env, databaseOptions } = fixture();
    const segments = [
      ["chapter-1", "CHƯƠNG I QUY ĐỊNH CHUNG"],
      ["article-1", "Điều 1. Phạm vi áp dụng"],
      ["clause-1", "1. Người lao động phải tuân thủ nội quy."],
      ["chapter-2", "CHƯƠNG II TRÁCH NHIỆM"],
      ["article-2", "Điều 2. Trách nhiệm của Phòng Nhân sự"],
      ["reference-1", "Thực hiện theo Điều 1 của nội quy."],
    ].map(([id, text], ordinal) => ({
      id: id!,
      text: text!,
      normalizedText: text!,
      locator: { kind: "docx" as const, paragraph: ordinal + 1 },
      ordinal,
    }));
    const artifact: NormalizedKnowledgeArtifactV3 = {
      schemaVersion: 3,
      sourceId: "hr-policy",
      sourceVersionId: "hr-policy-v1",
      sourceVersion: 1,
      title: "Nội quy công ty",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      createdAt: 1,
      parserProvenance: { extractor: "fixture", structure: "v3" },
      extractorIdentity: "fixture-v3",
      artifactChecksum: "artifact-v3-checksum",
      segments,
      graphSignals: {
        aliases: ["Nội quy công ty"],
        headings: [],
        links: [],
        blocks: [
          {
            blockId: "chapter-1",
            kind: "heading",
            semanticKind: "chapter",
            text: segments[0]!.text,
            segmentIds: [segments[0]!.id],
            headingLevel: 2,
            headingPath: [segments[0]!.text],
            ordinal: 0,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[0]!.locator,
          },
          {
            blockId: "article-1",
            kind: "heading",
            semanticKind: "article",
            text: segments[1]!.text,
            parentBlockId: "chapter-1",
            segmentIds: [segments[1]!.id],
            headingLevel: 4,
            headingPath: [segments[0]!.text, segments[1]!.text],
            ordinal: 1,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[1]!.locator,
          },
          {
            blockId: "clause-1",
            kind: "heading",
            semanticKind: "clause",
            text: segments[2]!.text,
            parentBlockId: "article-1",
            segmentIds: [segments[2]!.id],
            headingLevel: 5,
            headingPath: [segments[0]!.text, segments[1]!.text, segments[2]!.text],
            ordinal: 2,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[2]!.locator,
          },
          {
            blockId: "chapter-2",
            kind: "heading",
            semanticKind: "chapter",
            text: segments[3]!.text,
            segmentIds: [segments[3]!.id],
            headingLevel: 2,
            headingPath: [segments[3]!.text],
            ordinal: 3,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[3]!.locator,
          },
          {
            blockId: "article-2",
            kind: "heading",
            semanticKind: "article",
            text: segments[4]!.text,
            parentBlockId: "chapter-2",
            segmentIds: [segments[4]!.id],
            headingLevel: 4,
            headingPath: [segments[3]!.text, segments[4]!.text],
            ordinal: 4,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[4]!.locator,
          },
          {
            blockId: "reference-1",
            kind: "paragraph",
            semanticKind: "content",
            text: segments[5]!.text,
            parentBlockId: "article-2",
            segmentIds: [segments[5]!.id],
            headingPath: [segments[3]!.text, segments[4]!.text],
            ordinal: 5,
            isToc: false,
            isHeaderFooter: false,
            locator: segments[5]!.locator,
          },
        ],
        references: [
          {
            referenceId: "reference-to-article-1",
            sourceBlockId: "reference-1",
            rawText: "Điều 1",
            targetBlockId: "article-1",
            candidateTargetBlockIds: ["article-1"],
            kind: "article",
            resolved: true,
            confidence: 1,
            locator: segments[5]!.locator,
          },
        ],
      },
    };
    await buildKnowledgeGenerationIndex({
      zoneId: "zone-hr-v3",
      generationId: "generation-hr-v3",
      sourceSetRevision: 1,
      buildRevision: 1,
      artifacts: [artifact],
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
      env,
    });
    const context: KnowledgeGraphSnapshotContext = {
      zoneId: "zone-hr-v3",
      zoneLabel: "HR",
      generationId: "generation-hr-v3",
      publicationId: null,
      snapshot: "candidate",
      publishedAt: 1,
      env,
      databaseOptions,
    };
    const graph = readKnowledgeGraphNeighborhood(context, {
      depth: 2,
      nodeKinds: ["source", "section"],
      edgeKinds: ["contains", "references"],
      reviewStatuses: ["accepted"],
    });
    const source = graph.nodes.find((node) => node.kind === "source");
    expect(source?.degree).toBe(2);
    expect(graph.edges.filter((edge) => edge.kind === "references")).toHaveLength(1);
    expect(graph.nodes.some((node) => node.label.startsWith("Điều 1"))).toBe(true);
    expect(readKnowledgeGraphAnalysisSummary(context)).toMatchObject({
      artifactSchemaVersion: 3,
      maxSourceDegree: 2,
      aiAnalysisStatus: "off",
    });
  });

  it("builds deterministic links, risk-gates AI edges and rejects stale refs", async () => {
    const { env, databaseOptions } = fixture();
    const build = async (generationId: string) =>
      await buildKnowledgeGenerationIndex({
        zoneId: "zone-graph",
        generationId,
        sourceSetRevision: 2,
        buildRevision: 2,
        artifacts: artifacts(),
        graph: {
          settings: {
            enabled: true,
            enrichmentEnabled: true,
            autoApprovalThreshold: 0.92,
            updatedAt: 1,
          },
          reviewOverlays: [],
          manualEdges: [],
          enrichmentRelations: [
            {
              sourceCanonicalKey: "Annual leave",
              targetCanonicalKey: "Manager approval",
              sourceLabel: "Annual leave",
              targetLabel: "Manager approval",
              sourceKind: "concept",
              targetKind: "claim",
              kind: "mentions",
              confidence: 0.95,
              evidenceSegmentId: "policy-segment",
              evidenceSourceVersionId: "policy-v1",
              evidenceLocator: { kind: "text", section: "Annual leave" },
            },
            {
              sourceCanonicalKey: "Annual leave",
              targetCanonicalKey: "Manager approval",
              sourceLabel: "Annual leave",
              targetLabel: "Manager approval",
              sourceKind: "concept",
              targetKind: "claim",
              kind: "contradicts",
              confidence: 0.99,
              evidenceSegmentId: "policy-segment",
              evidenceSourceVersionId: "policy-v1",
              evidenceLocator: { kind: "text", section: "Annual leave" },
            },
          ],
          enrichmentIdentity: { provider: "test", model: "relations", transport: "local" },
        },
        env,
      });
    const first = await build("generation-one");
    expect(first).toMatchObject({
      graphStatus: "ready",
      graphSchemaVersion: 2,
      graphProposedCount: 1,
    });
    const context = (snapshot: "active" | "candidate"): KnowledgeGraphSnapshotContext => ({
      zoneId: "zone-graph",
      zoneLabel: "HR",
      generationId: "generation-one",
      publicationId: snapshot === "active" ? "publication-one" : null,
      snapshot,
      publishedAt: 1,
      env,
      databaseOptions,
    });
    const candidate = readKnowledgeGraphNeighborhood(context("candidate"), {
      depth: 2,
      reviewStatuses: ["accepted", "proposed"],
    });
    expect(candidate.edges.some((edge) => edge.kind === "references")).toBe(true);
    expect(candidate.edges.some((edge) => edge.reviewStatus === "proposed")).toBe(true);
    const active = readKnowledgeGraphNeighborhood(context("active"), { depth: 2 });
    expect(active.edges.every((edge) => edge.reviewStatus === "accepted")).toBe(true);
    const benefits = searchKnowledgeGraphNodes(context("active"), { query: "Benefits" });
    expect(benefits[0]?.label).toBe("Benefits");
    expect(
      readKnowledgeGraphNodeDetail(context("active"), benefits[0]!.nodeRef).evidence,
    ).toHaveLength(1);

    const hybridOnly = await searchKnowledgeGenerationIndexWithGraph({
      zoneId: "zone-graph",
      zoneLabel: "HR",
      generationId: "generation-one",
      publicationId: "publication-one",
      publishedAt: 1,
      query: "manager approval",
      maxResults: 8,
      graphExpansion: "off",
      env,
      databaseOptions,
    });
    const graphAware = await searchKnowledgeGenerationIndexWithGraph({
      zoneId: "zone-graph",
      zoneLabel: "HR",
      generationId: "generation-one",
      publicationId: "publication-one",
      publishedAt: 1,
      query: "manager approval",
      maxResults: 8,
      graphExpansion: "on",
      env,
      databaseOptions,
    });
    expect(hybridOnly.graph.availability).toBe("disabled");
    expect(graphAware.graph).toMatchObject({ availability: "available", maxDepth: 2 });
    expect(graphAware.graph.expandedEvidenceCount).toBeGreaterThan(0);
    expect(graphAware.hits.some((hit) => hit.citation.sourceTitle === "Benefits")).toBe(true);

    await build("generation-two");
    expect(() =>
      readKnowledgeGraphNodeDetail(
        { ...context("candidate"), generationId: "generation-two" },
        benefits[0]!.nodeRef,
      ),
    ).toThrowError(expect.objectContaining({ code: "GRAPH_NODE_NOT_FOUND" }));
  });
});
