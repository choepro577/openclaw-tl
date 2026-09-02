import { describe, expect, it } from "vitest";
import { resolveNewConversationAgentKey } from "../pages/conversations/new-conversation-page.ts";

describe("Enterprise User New chat Agent selection", () => {
  it("uses the active Agent when the page mounts after the catalog is already ready", () => {
    expect(resolveNewConversationAgentKey(null, "personal")).toBe("personal");
  });

  it("keeps an explicit page selection when the active Agent changes", () => {
    expect(resolveNewConversationAgentKey("shared:legal", "personal")).toBe("shared:legal");
  });
});
