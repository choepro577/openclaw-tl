import { describe, expect, it, vi } from "vitest";
import type { EnterpriseKnowledgeAuthority } from "../../enterprise/knowledge/authority.js";
import { createEnterpriseKnowledgeTools } from "./enterprise-knowledge-tools.js";

describe("Enterprise Knowledge Agent tools", () => {
  it("keeps search reference-only so exact text enters context only through get", async () => {
    const authority = {
      hasPublishedKnowledge: () => true,
      search: vi.fn(async () => ({
        hits: [
          {
            citationId: "signed-citation-reference-0001",
            citation: {
              citationId: "signed-citation-reference-0001",
              zoneLabel: "Nhân sự",
              sourceTitle: "Nghỉ phép",
              sourceVersion: 2,
              locator: { kind: "page" as const, page: 4 },
              publishedAt: "2026-01-01T00:00:00.000Z",
            },
            excerpt: "Nội dung bằng chứng bí mật chỉ get mới được trả.",
            score: 1,
          },
        ],
        citations: [],
        partial: false,
        coverage: { searchedZones: 1, unavailableZones: 0 },
        warnings: [],
      })),
      get: vi.fn(),
    } satisfies Pick<EnterpriseKnowledgeAuthority, "hasPublishedKnowledge" | "search" | "get">;
    const search = createEnterpriseKnowledgeTools(authority).find(
      (tool) => tool.name === "enterprise_knowledge_search",
    )!;
    const result = await search.execute("call-1", { query: "nghỉ phép" });
    expect(result.content[0]).toMatchObject({ type: "text" });
    expect((result.content[0] as { text: string }).text).not.toContain("bí mật");
    expect(result.details).toMatchObject({
      hits: [expect.not.objectContaining({ excerpt: expect.anything() })],
    });
    expect(authority.search).toHaveBeenLastCalledWith({ query: "nghỉ phép" });

    await search.execute("call-null-zone", { query: "nghỉ phép", zoneSlug: null });
    expect(authority.search).toHaveBeenLastCalledWith({ query: "nghỉ phép" });

    await search.execute("call-exact-zone", { query: "nghỉ phép", zoneSlug: "human-resources" });
    expect(authority.search).toHaveBeenLastCalledWith({
      query: "nghỉ phép",
      zoneSlug: "human-resources",
    });
    const evidence = createEnterpriseKnowledgeTools(authority).find(
      (tool) => tool.name === "enterprise_knowledge_get",
    )!;
    expect(evidence.description).toContain(
      "sourced company rules, calculations, proposals, and points needing confirmation",
    );
    expect(evidence.description).toContain("proposed schedule differs");
    expect(evidence.description).toContain("Do not invent an exception");
    // Explicit filters stay exact: an invented wildcard must never broaden access.
    await search.execute("call-not-a-wildcard", { query: "nghỉ phép", zoneSlug: "all" });
    expect(authority.search).toHaveBeenLastCalledWith({ query: "nghỉ phép", zoneSlug: "all" });
    expect(JSON.stringify(search.parameters)).toContain('"type":"null"');
  });
});
