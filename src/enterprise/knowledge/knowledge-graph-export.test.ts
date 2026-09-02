import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { buildKnowledgeGenerationIndex } from "./index-store.js";
import { buildObsidianArchive } from "./knowledge-graph-export.js";
import type { NormalizedKnowledgeArtifactV2 } from "./knowledge-types.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Obsidian-compatible graph export", () => {
  it("exports accepted links and backlinks without server-private metadata", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openclaw-graph-export-"));
    directories.push(directory);
    const env = { ...process.env, OPENCLAW_STATE_DIR: directory };
    const artifact: NormalizedKnowledgeArtifactV2 = {
      schemaVersion: 2,
      sourceId: "handbook",
      sourceVersionId: "handbook-v1",
      sourceVersion: 1,
      title: "Employee handbook",
      mimeType: "text/markdown",
      createdAt: 1,
      parserProvenance: { parser: "test", filesystemPath: "/must/not/export" },
      segments: [
        {
          id: "segment-one",
          text: "See [[Leave policy]].",
          normalizedText: "See Leave policy.",
          locator: { kind: "text", section: "Benefits" },
          ordinal: 0,
        },
      ],
      graphSignals: {
        aliases: ["Handbook"],
        headings: [],
        links: [
          {
            kind: "wikilink",
            rawTarget: "Leave policy",
            target: "Leave policy",
            segmentId: "segment-one",
            locator: { kind: "text", section: "Benefits" },
          },
        ],
      },
    };
    await buildKnowledgeGenerationIndex({
      zoneId: "zone-export",
      generationId: "generation-export",
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
    const archive = await buildObsidianArchive({
      zoneId: "zone-export",
      generationId: "generation-export",
      zoneName: "HR",
      publishedAt: 1,
      env,
    });
    const zip = await JSZip.loadAsync(archive.buffer);
    const names = Object.keys(zip.files);
    expect(names).toContain("index.md");
    expect(names).toContain("relationship-report.md");
    expect(names).toContain("manifest.json");
    expect(names.some((name) => name.startsWith("sources/") && name.endsWith(".md"))).toBe(true);
    expect(names.some((name) => name.startsWith("concepts/") && name.endsWith(".md"))).toBe(true);
    expect(names.some((name) => name.startsWith(".obsidian/plugins"))).toBe(false);
    const contents = (
      await Promise.all(
        names
          .filter((name) => !zip.files[name]!.dir)
          .map((name) => zip.files[name]!.async("string")),
      )
    ).join("\n");
    expect(contents).toContain("[[concepts/");
    expect(contents).toContain("## Backlinks");
    expect(contents).not.toContain("/must/not/export");
    expect(contents).not.toContain("signed citation");
    expect(contents).not.toContain("accountId");
  });
});
