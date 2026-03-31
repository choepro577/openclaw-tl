import { describe, expect, it } from "vitest";
import { getPinnedMessageSummary } from "./pinned-summary.ts";

describe("pinned-summary", () => {
  it("uses the original inter-session message content when available", () => {
    const summary = getPinnedMessageSummary({
      role: "user",
      content: "Forwarded update",
      provenance: {
        kind: "inter_session",
        sourceSessionKey: "agent:cskh-tl00275:main",
      },
    });

    expect(summary).toBe("Forwarded update");
  });

  it("falls back to the inter-session notice when the original message is empty", () => {
    const summary = getPinnedMessageSummary({
      role: "user",
      content: "",
      provenance: {
        kind: "inter_session",
        sourceSessionKey: "agent:cskh-tl00275:main",
      },
    });

    expect(summary).toBe("Agent cskh-tl00275 mới phản hồi lại");
  });
});
