import { describe, expect, it } from "vitest";
import { buildAToATargetPairSessionKey } from "./a-to-a-send-helpers.js";

describe("a_to_a_send helpers", () => {
  it("derives requester-scoped pair session keys", () => {
    expect(
      buildAToATargetPairSessionKey({
        requesterAgentId: "a",
        targetAgentId: "b",
      }),
    ).toBe("agent:b:a2a:from:a");
    expect(
      buildAToATargetPairSessionKey({
        requesterAgentId: "b",
        targetAgentId: "a",
      }),
    ).toBe("agent:a:a2a:from:b");
  });

  it("normalizes agent ids to lowercase-safe keys", () => {
    expect(
      buildAToATargetPairSessionKey({
        requesterAgentId: "TL00275",
        targetAgentId: "CSKH-TL00275",
      }),
    ).toBe("agent:cskh-tl00275:a2a:from:tl00275");
  });
});
