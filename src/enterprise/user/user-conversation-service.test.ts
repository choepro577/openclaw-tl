import { describe, expect, it } from "vitest";
import {
  enterpriseConversationCreateIdempotencyKey,
  shouldReuseEmptyEnterpriseConversation,
} from "./user-conversation-service.js";

describe("Enterprise User conversation creation", () => {
  it("reuses only an idle session with no messages", () => {
    expect(shouldReuseEmptyEnterpriseConversation({}, 0)).toBe(true);
    expect(shouldReuseEmptyEnterpriseConversation({}, 1)).toBe(false);
    expect(shouldReuseEmptyEnterpriseConversation({ hasActiveRun: true }, 0)).toBe(false);
    expect(shouldReuseEmptyEnterpriseConversation({ status: "queued" }, 0)).toBe(false);
    expect(shouldReuseEmptyEnterpriseConversation({ status: "running" }, 0)).toBe(false);
  });

  it("uses one server-owned idempotency slot until the latest session changes", () => {
    const input = {
      accountId: "account-1",
      agentId: "personal-account-1",
      latestSessionIdentity: "session-1",
    };
    const first = enterpriseConversationCreateIdempotencyKey(input);

    expect(enterpriseConversationCreateIdempotencyKey(input)).toBe(first);
    expect(
      enterpriseConversationCreateIdempotencyKey({
        ...input,
        latestSessionIdentity: "session-2",
      }),
    ).not.toBe(first);
    expect(
      enterpriseConversationCreateIdempotencyKey({ ...input, accountId: "account-2" }),
    ).not.toBe(first);
  });
});
