import { describe, expect, it } from "vitest";
import {
  deriveKnowledgeBacklinks,
  extractKnowledgeDocumentLinks,
  normalizeKnowledgeAliases,
  normalizeKnowledgeCanonicalKey,
  renderKnowledgeWikiLink,
} from "./index.js";

describe("knowledge graph core", () => {
  it("extracts wikilinks and relative markdown links but ignores code", () => {
    const links = extractKnowledgeDocumentLinks({
      sourceRelativePath: "sources/policies/leave.md",
      markdown: [
        "[[People/An|An Nguyen]]",
        "[Payroll](../payroll.md#Allowances)",
        "[Portal](https://example.test/portal)",
        "`[[Hidden]]`",
        "```md",
        "[[Also Hidden]]",
        "```",
      ].join("\n"),
      includeExternal: true,
    });
    expect(links).toEqual([
      { kind: "wikilink", rawTarget: "People/An", target: "People/An", alias: "An Nguyen" },
      {
        kind: "markdown",
        rawTarget: "../payroll.md#Allowances",
        target: "sources/payroll.md",
        alias: "Payroll",
        heading: "Allowances",
      },
      {
        kind: "hyperlink",
        rawTarget: "https://example.test/portal",
        target: "https://example.test/portal",
        alias: "Portal",
      },
    ]);
  });

  it("normalizes aliases and derives deterministic backlinks", () => {
    expect(normalizeKnowledgeCanonicalKey(" Concepts\\Leave.md ")).toBe("concepts/leave");
    expect(normalizeKnowledgeAliases([" Leave ", "leave", "Nghỉ phép"])).toEqual([
      "Leave",
      "Nghỉ phép",
    ]);
    expect(
      deriveKnowledgeBacklinks([
        { id: "concepts/leave", linkTargets: ["Sources/Policy.md"] },
        { id: "sources/policy", linkTargets: [] },
      ]),
    ).toEqual(new Map([["sources/policy", ["concepts/leave"]]]));
  });

  it("renders native and Obsidian-compatible links", () => {
    expect(
      renderKnowledgeWikiLink({
        renderMode: "obsidian",
        relativePath: "concepts/leave.md",
        title: "Leave",
      }),
    ).toBe("[[concepts/leave|Leave]]");
    expect(
      renderKnowledgeWikiLink({
        renderMode: "native",
        relativePath: "concepts/leave.md",
        sourceRelativeTo: "sources/hr.md",
        title: "Leave",
      }),
    ).toBe("[Leave](../concepts/leave.md)");
  });
});
