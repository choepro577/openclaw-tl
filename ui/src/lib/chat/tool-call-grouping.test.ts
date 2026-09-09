// Control UI tests cover collapsed tool-group summary labels.
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n/index.ts";
import { summarizeToolGroup } from "./tool-call-grouping.ts";
import { toolCardSkippedLabel } from "./tool-cards.ts";

type ToolGroupSummaryInput = Parameters<typeof summarizeToolGroup>[0][number];

afterEach(() => vi.restoreAllMocks());

describe("summarizeToolGroup", () => {
  it.each([
    {
      locale: "en",
      skipped: "Not performed",
      updated: "Not performed because a newer message arrived",
      group: "Skipped requests: 2",
    },
    {
      locale: "vi",
      skipped: "Không thực hiện",
      updated: "Không thực hiện do có cập nhật mới",
      group: "Yêu cầu không thực hiện: 2",
    },
  ] as const)("preserves $locale skipped labels and group counts in chat-only copy", (copy) => {
    vi.spyOn(i18n, "getLocale").mockReturnValue(copy.locale);
    const card = { id: "skipped", name: "bash", details: { status: "skipped" } };
    expect(toolCardSkippedLabel(card)).toBe(copy.skipped);
    expect(
      toolCardSkippedLabel({ ...card, details: { status: "skipped", deniedReason: "steering" } }),
    ).toBe(copy.updated);
    expect(summarizeToolGroup([card, card])).toBe(copy.group);
  });

  it.each<[string, ToolGroupSummaryInput[], string]>([
    ["a single command", [{ name: "bash", args: { command: "ls" } }], "Ran a command"],
    [
      "distinct paths over call count",
      [
        { name: "read", args: { path: "/repo/a.ts" } },
        { name: "read", args: { path: "/repo/a.ts" } },
        { name: "read", args: { path: "/repo/b.ts" } },
      ],
      "Read 2 files",
    ],
    [
      "call count when reads carry no paths",
      [
        { name: "read", args: {} },
        { name: "read", args: {} },
      ],
      "Read 2 files",
    ],
    [
      "multiple searches",
      [
        { name: "grep", args: { pattern: "a" } },
        { name: "glob", args: { pattern: "b" } },
      ],
      "Ran 2 searches",
    ],
    [
      "command-discriminated text editor calls",
      [
        {
          name: "str_replace_editor",
          args: { command: "view", file_path: "/repo/a.ts", view_range: [1, 20] },
        },
        {
          name: "str_replace_based_edit_tool",
          args: {
            command: "str_replace",
            file: "/repo/a.ts",
            old_str: "old",
            new_str: "new",
          },
        },
        {
          name: "str_replace_editor",
          args: { command: "insert", filepath: "/repo/a.ts", insert_text: "line" },
        },
        {
          name: "str_replace_based_edit_tool",
          args: { command: "create", filename: "/repo/new.ts", file_text: "new" },
        },
      ],
      "Read a file, edited a file, created a file",
    ],
    [
      "text editor calls without a recognized command",
      [
        { name: "str_replace_editor", args: { path: "/repo/a.ts" } },
        { name: "str_replace_based_edit_tool", args: { command: "rename" } },
      ],
      "Used str_replace_editor, str_replace_based_edit_tool",
    ],
    [
      "multi-file apply_patch targets",
      [
        {
          name: "apply_patch",
          args: {
            patch: [
              "*** Begin Patch",
              "*** Update File: src/a.ts",
              "@@",
              "-old",
              "+new",
              "*** Add File: src/b.ts",
              "+new",
              "*** End Patch",
            ].join("\n"),
          },
        },
      ],
      "Edited a file, created a file",
    ],
    [
      "structured Codex change targets",
      [
        {
          name: "apply_patch",
          args: {
            changes: [
              { path: "src/a.ts", kind: { type: "update" } },
              { path: "src/b.ts", kind: { type: "add" } },
            ],
          },
        },
      ],
      "Edited a file, created a file",
    ],
    [
      "deleted Codex targets",
      [
        {
          name: "apply_patch",
          args: {
            changes: [{ path: "src/obsolete.ts", kind: { type: "delete" } }],
          },
        },
      ],
      "Deleted a file",
    ],
    ["one generic tool by name", [{ name: "mcp__linear" }], "Used mcp__linear"],
    [
      "repeat generic tool with a multiplier",
      [{ name: "mcp__linear" }, { name: "mcp__linear" }],
      "Used mcp__linear ×2",
    ],
    [
      "many distinct generic tools as a count",
      [{ name: "alpha" }, { name: "beta" }, { name: "gamma" }],
      "Used 3 tools",
    ],
  ])("summarizes %s", (_label, cards, expected) => {
    expect(summarizeToolGroup(cards)).toBe(expected);
  });
});
