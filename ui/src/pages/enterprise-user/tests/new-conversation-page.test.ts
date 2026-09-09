import { describe, expect, it } from "vitest";
import { resolveNewConversationAgentKey } from "../pages/conversations/new-conversation-page.ts";

const agents = [
  {
    key: "personal",
    actions: { canChat: true },
  },
  {
    key: "shared:legal",
    actions: { canChat: true },
  },
] as const;

describe("Enterprise User New chat Agent selection", () => {
  it("uses the active Agent when the page mounts after the catalog is already ready", () => {
    expect(resolveNewConversationAgentKey(null, "personal", agents)).toBe("personal");
  });

  it("keeps an explicit page selection when the active Agent changes", () => {
    expect(resolveNewConversationAgentKey("shared:legal", "personal", agents)).toBe("shared:legal");
  });

  it("requires an explicit choice when the active Agent is disabled", () => {
    const disabledActiveAgent = {
      key: "shared:disabled",
      actions: { canChat: false },
    } as const;

    expect(
      resolveNewConversationAgentKey(null, "shared:disabled", [disabledActiveAgent, ...agents]),
    ).toBeNull();
  });
});
