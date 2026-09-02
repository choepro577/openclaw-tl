import { describe, expect, it } from "vitest";
import { requiresChatModelSetup, resolveChatModelAvailabilityGate } from "./chat-model-setup.ts";

describe("requiresChatModelSetup", () => {
  it("requires setup after the selected agent loads without a model route", () => {
    expect(
      requiresChatModelSetup({
        catalog: false,
        connected: true,
        agentsLoaded: true,
        selectedAgentFound: true,
      }),
    ).toBe(true);
  });

  it("accepts a configured agent model", () => {
    expect(
      requiresChatModelSetup({
        catalog: false,
        connected: true,
        agentsLoaded: true,
        selectedAgentFound: true,
        agentModel: "openai/gpt-5.4",
      }),
    ).toBe(false);
  });

  it("does not block while connection or agent data is unresolved", () => {
    expect(
      requiresChatModelSetup({
        catalog: false,
        connected: true,
        agentsLoaded: false,
        selectedAgentFound: false,
      }),
    ).toBe(false);
  });
});

describe("resolveChatModelAvailabilityGate", () => {
  it("does not treat redacted Enterprise model metadata as an unavailable Agent", () => {
    expect(
      resolveChatModelAvailabilityGate({
        agentsLoaded: true,
        enterpriseUserPresentation: true,
        modelSetupRequired: true,
        modelUnavailable: true,
        selectedAgentFound: true,
      }),
    ).toEqual({
      enterpriseUserUnavailable: false,
      modelSetupRequired: false,
      modelUnavailable: false,
    });
  });

  it("keeps a missing projected Enterprise Agent unavailable", () => {
    expect(
      resolveChatModelAvailabilityGate({
        agentsLoaded: true,
        enterpriseUserPresentation: true,
        modelSetupRequired: false,
        modelUnavailable: false,
        selectedAgentFound: false,
      }),
    ).toEqual({
      enterpriseUserUnavailable: true,
      modelSetupRequired: false,
      modelUnavailable: true,
    });
  });

  it("preserves the Control UI model gates", () => {
    expect(
      resolveChatModelAvailabilityGate({
        agentsLoaded: true,
        enterpriseUserPresentation: false,
        modelSetupRequired: true,
        modelUnavailable: true,
        selectedAgentFound: true,
      }),
    ).toEqual({
      enterpriseUserUnavailable: false,
      modelSetupRequired: true,
      modelUnavailable: true,
    });
  });
});
