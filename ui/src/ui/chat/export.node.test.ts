import { describe, expect, it } from "vitest";
import { buildChatMarkdown } from "./export.ts";

describe("chat export", () => {
  it("returns null for empty history", () => {
    expect(buildChatMarkdown([], "Bot")).toBeNull();
  });

  it("renders markdown headings and strips assistant thinking tags", () => {
    const markdown = buildChatMarkdown(
      [
        {
          role: "assistant",
          content: "<thinking>scratchpad</thinking>Final answer",
          timestamp: Date.UTC(2026, 2, 11, 12, 0, 0),
        },
      ],
      "Bot",
    );

    expect(markdown).toContain("# Chat with Bot");
    expect(markdown).toContain("## Bot (2026-03-11T12:00:00.000Z)");
    expect(markdown).toContain("Final answer");
    expect(markdown).not.toContain("scratchpad");
  });

  it("labels inter-session messages by their source agent instead of You", () => {
    const markdown = buildChatMarkdown(
      [
        {
          role: "user",
          content: "Forwarded update",
          provenance: {
            kind: "inter_session",
            sourceSessionKey: "agent:cskh-tl00275:main",
          },
          timestamp: Date.UTC(2026, 2, 19, 12, 0, 0),
        },
      ],
      "Bot",
    );

    expect(markdown).toContain("## Agent cskh-tl00275 (2026-03-19T12:00:00.000Z)");
    expect(markdown).toContain("Agent cskh-tl00275 mới phản hồi lại");
    expect(markdown).not.toContain("Forwarded update");
    expect(markdown).not.toContain("## You");
  });
});
