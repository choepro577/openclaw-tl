import { describe, expect, it } from "vitest";
import { buildAToAMessageContext, buildAToATargetPairSessionKey } from "./a-to-a-send-helpers.js";

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

  it("marks pair sessions as coordination-only and points to user delivery tools", () => {
    const context = buildAToAMessageContext({
      requesterAgentId: "tl00275",
      requesterSessionKey: "agent:tl00275:discord:group:req",
      requesterChannel: "discord",
      targetAgentId: "tl00019",
      targetSessionKey: "agent:tl00019:a2a:from:tl00275",
    });

    expect(context).toContain("This pair session is coordination-only");
    expect(context).toContain(
      "Do not treat the pair session as the target agent's active user conversation.",
    );
    expect(context).toContain("user_notify(agentId, message)");
    expect(context).toContain("pass only the core content to convey");
    expect(context).toContain("user_schedule(...)");
    expect(context).toContain(
      "runtime will relay the message naturally and mention the source assistant automatically",
    );
    expect(context).toContain('Do not call raw cron.add with sessionTarget="current"');
  });
});
