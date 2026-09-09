/* @vitest-environment jsdom */

import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type { ToolCard } from "../../../lib/chat/chat-types.ts";
import { summarizeToolGroup } from "../../../lib/chat/tool-call-grouping.ts";
import { renderGroupedMessage } from "./chat-message-bubble.ts";
import { renderActivityGroup } from "./chat-message-group.ts";
import { renderToolCard, resolveToolRowText } from "./chat-tool-cards.ts";

const token = "signed-citation-not-for-display".repeat(30);
const citation = {
  citationId: token,
  sourceTitle: "Annual leave policy",
  zoneLabel: "People & Culture",
  sourceVersion: 3,
  locator: { kind: "page", page: 4, section: "Annual leave" },
  publishedAt: "2026-09-04T00:00:00.000Z",
};
const references = {
  hits: [{ citationId: token, citation, score: 0.9 }],
  citations: [citation],
  partial: false,
  coverage: { searchedZones: 4, unavailableZones: 0 },
  warnings: [],
  instruction: "INTERNAL_INSTRUCTION_NOT_FOR_DISPLAY",
};

function renderCard(card: ToolCard, runActive = false) {
  const host = document.createElement("div");
  render(
    renderToolCard(card, {
      expanded: true,
      onToggleExpanded: vi.fn(),
      onOpenSidebar: vi.fn(),
      runActive,
    }),
    host,
  );
  return host;
}

describe("Enterprise Knowledge chat presentation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the requested Vietnamese skipped copy without mislabelling other skips as user updates", () => {
    vi.spyOn(i18n, "getLocale").mockReturnValue("vi");
    const card = {
      id: "vi-skip",
      name: "enterprise_knowledge_search",
      completed: true,
      isError: true,
    };
    expect(
      renderCard({ ...card, details: { status: "skipped", deniedReason: "steering" } }).textContent,
    ).toContain("Không thực hiện do có cập nhật mới");
    const other = renderCard({
      ...card,
      details: { status: "skipped", deniedReason: "internal-dispose" },
    });
    expect(other.textContent).toContain("Không thực hiện");
    expect(other.textContent).not.toContain("cập nhật mới");
  });
  it.each(["enterprise_knowledge_search", "enterprise_knowledge_get"])(
    "keeps metadata-skipped %s distinct from retrieval errors across live, history and grouped views",
    (name) => {
      const message = {
        role: "toolResult",
        toolName: name,
        toolCallId: "skipped-call",
        isError: true,
        content: [{ type: "text", text: "Skipped due to queued user message." }],
        details: { status: "skipped", deniedReason: "steering" },
      };
      const hosts = [
        renderCard(
          {
            id: "live-skip",
            name,
            live: true,
            completed: true,
            isError: true,
            details: message.details,
            outputText: message.content[0].text,
          },
          true,
        ),
        document.createElement("div"),
        document.createElement("div"),
      ];
      render(
        renderGroupedMessage(structuredClone(message), "history-skip", {
          isStreaming: false,
          showReasoning: false,
          isToolExpanded: () => true,
        }),
        hosts[1],
      );
      render(
        renderActivityGroup(
          [
            {
              kind: "group",
              key: "skip-group",
              role: "toolResult",
              timestamp: 1,
              isStreaming: false,
              messages: [{ key: "skip-message", message }],
            },
          ],
          {
            showReasoning: false,
            runActive: false,
            isToolExpanded: () => true,
          },
        ),
        hosts[2],
      );
      for (const host of hosts) {
        expect(host.textContent).toContain("Not performed because a newer message arrived");
        expect(host.textContent).not.toContain("Knowledge request failed");
        expect(host.textContent).not.toContain("Evidence retrieved");
        expect(host.textContent).not.toContain("Skipped due to queued user message.");
      }
      expect(hosts[2].querySelector(".chat-activity-group__label")?.textContent).toBe(
        "Skipped requests: 1",
      );
      expect(hosts[2].querySelector(".chat-activity-group__label")?.textContent).not.toContain(
        "enterprise knowledge searches",
      );
    },
  );

  it("shows source references and coverage, not signed citations or internal search instructions", () => {
    const host = renderCard({
      id: "search-1",
      name: "enterprise_knowledge_search",
      args: { query: "annual leave" },
      outputText: JSON.stringify(references),
    });
    expect(host.textContent).toContain("1 reference found");
    expect(host.textContent).toContain("Searched 4 zones");
    expect(host.textContent).toContain(citation.sourceTitle);
    expect(host.textContent).toContain(citation.zoneLabel);
    expect(host.textContent).toContain("Page 4");
    expect(host.textContent).toContain("References only");
    expect(host.innerHTML).not.toContain(token);
    expect(host.textContent).not.toContain(references.instruction);
    expect(host.querySelector("pre")).toBeNull();
    expect(host.querySelector("a")).toBeNull();
  });

  it("marks consecutive Knowledge cards for the compact horizontal layout", () => {
    const host = document.createElement("div");
    render(
      renderGroupedMessage(
        {
          role: "assistant",
          content: [
            {
              type: "toolcall",
              id: "search-call",
              name: "enterprise_knowledge_search",
              arguments: { query: "annual leave" },
            },
            {
              type: "toolresult",
              id: "search-call",
              name: "enterprise_knowledge_search",
              text: JSON.stringify(references),
            },
            {
              type: "toolcall",
              id: "get-call",
              name: "enterprise_knowledge_get",
              arguments: { citationId: token },
            },
            {
              type: "toolresult",
              id: "get-call",
              name: "enterprise_knowledge_get",
              details: { evidence: "Twelve days", citation },
            },
          ],
        },
        "knowledge-pair",
        { isStreaming: false, showReasoning: false, isToolExpanded: () => false },
      ),
      host,
    );

    expect(host.querySelector(".chat-tools-inline--knowledge")).not.toBeNull();
    expect(host.querySelectorAll(".chat-knowledge")).toHaveLength(2);
  });

  it("shows successfully retrieved evidence as plain text with its source instead of raw get args", () => {
    const evidence = "Employees receive twelve days of leave. <img src=x onerror=alert(1)>";
    const host = renderCard({
      id: "get-1",
      name: "enterprise_knowledge_get",
      args: { citationId: token },
      inputText: JSON.stringify({ citationId: token }),
      details: { evidence, citation, trust: "untrusted_enterprise_data" },
      completed: true,
    });
    expect(host.textContent).toContain("Evidence retrieved");
    expect(host.textContent).toContain(evidence);
    expect(host.textContent).toContain(citation.sourceTitle);
    expect(host.innerHTML).not.toContain(token);
    expect(host.textContent).not.toContain("untrusted_enterprise_data");
    expect(host.querySelector("img")).toBeNull();
  });

  it("keeps partial zero results distinct from a complete search with no matches", () => {
    const host = renderCard({
      id: "search-partial",
      name: "enterprise_knowledge_search",
      outputText: JSON.stringify({
        ...references,
        hits: [],
        partial: true,
        coverage: { searchedZones: 3, unavailableZones: 1 },
      }),
    });
    expect(host.textContent).toContain("No matching references");
    expect(host.textContent).toContain("Some zones could not be searched");
    expect(host.textContent).not.toContain(citation.sourceTitle);
  });

  it.each([
    { name: "enterprise_knowledge_search", expected: "Searching enterprise knowledge" },
    { name: "enterprise_knowledge_get", expected: "Retrieving source evidence" },
  ])("names a running $name without exposing its raw arguments", ({ name, expected }) => {
    const card = { id: name, name, args: { citationId: token }, live: true };
    expect(resolveToolRowText(card, true)).toContain(expected);
    expect(renderCard(card, true).textContent).toContain(expected);
    expect(renderCard(card, true).innerHTML).not.toContain(token);
  });

  it.each([
    { outputText: "private failure details", isError: true, expected: "Knowledge request failed" },
    {
      outputText: "Skipped due to queued user message.",
      isError: true,
      expected: "Knowledge request failed",
    },
    { outputText: "{truncated-json", expected: "Knowledge result unavailable" },
    { outputText: "x".repeat(300_000), expected: "Knowledge result unavailable" },
  ])("does not pretend malformed or failed output is retrieved evidence", (result) => {
    const host = renderCard({ id: "get-error", name: "enterprise_knowledge_get", ...result });
    expect(host.textContent).toContain(result.expected);
    expect(host.textContent).not.toContain("Evidence retrieved");
    expect(host.textContent).not.toContain(result.outputText);
  });

  it("uses the same safe presentation for historical standalone JSON tool messages", () => {
    const host = document.createElement("div");
    render(
      renderGroupedMessage(
        {
          role: "toolResult",
          toolName: "enterprise_knowledge_search",
          content: [{ type: "text", text: JSON.stringify(references) }],
        },
        "history-1",
        { isStreaming: false, showReasoning: false, isToolExpanded: () => true },
      ),
      host,
    );
    expect(host.textContent).toContain(citation.sourceTitle);
    expect(host.innerHTML).not.toContain(token);
    expect(host.innerHTML).not.toContain(references.instruction);
    expect(host.querySelector(".chat-json-collapse")).toBeNull();
  });

  it("summarizes Knowledge searches separately from evidence requests and normal file activity", () => {
    expect(
      summarizeToolGroup([
        { name: "enterprise_knowledge_search" },
        { name: "enterprise_knowledge_search" },
        { name: "enterprise_knowledge_get", args: { citationId: token } },
        { name: "read", args: { path: "policy.md" } },
      ]),
    ).toBe("Read a file, enterprise knowledge searches: 2, evidence requests: 1");
  });
});
