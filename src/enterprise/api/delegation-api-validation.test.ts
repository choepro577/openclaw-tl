import { describe, expect, it } from "vitest";
import {
  EnterpriseDelegationActivationSchema,
  EnterpriseDelegationEmptyBodySchema,
  EnterpriseDelegationOverridePatchSchema,
  EnterpriseDelegationProfilePatchSchema,
  EnterpriseDelegationSettingsPatchSchema,
  EnterpriseDelegationSimulationSchema,
  parseEnterpriseDelegationApiBody,
} from "./delegation-api-validation.js";

const validSettings = {
  baseRevision: 0,
  rollout: "shadow" as const,
  routerModel: "openai/gpt-5",
  autoThreshold: 0.9,
  clarifyThreshold: 0.7,
  minimumMargin: 0.15,
  maxDelegatesPerTurn: 3,
  eventRetentionDays: 90,
};

const validProfile = {
  description: "Chuyên phân tích hợp đồng và các điều khoản pháp lý.",
  profile: {
    status: "active" as const,
    aliases: ["Agent Hợp đồng"],
    handlingMode: "auto_when_certain" as const,
    useWhen: ["Kiểm tra điều khoản phạt trong hợp đồng", "So sánh nghĩa vụ giữa các bên"],
    avoidWhen: ["Câu hỏi chung không liên quan đến hợp đồng"],
    requiredInputs: [
      {
        id: "contract_number",
        label: "Số hợp đồng",
        question: "Bạn cần kiểm tra hợp đồng số nào?",
      },
    ],
  },
  baseHash: "config-hash",
};

describe("Enterprise delegation API validation", () => {
  it("accepts valid settings and rejects unknown fields", () => {
    expect(
      parseEnterpriseDelegationApiBody(EnterpriseDelegationSettingsPatchSchema, validSettings),
    ).toEqual(validSettings);
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationSettingsPatchSchema, {
        ...validSettings,
        allowAgents: ["contract"],
      }),
    ).toThrow("FIELD_INVALID:body");
  });

  it("rejects invalid policy ranges and enums with a typed field path", () => {
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationSettingsPatchSchema, {
        ...validSettings,
        maxDelegatesPerTurn: 4,
      }),
    ).toThrow("FIELD_INVALID:maxDelegatesPerTurn");
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationSettingsPatchSchema, {
        ...validSettings,
        rollout: "enabled",
      }),
    ).toThrow("FIELD_INVALID:rollout");
  });

  it("requires an assigned shared-Agent resource key for an override payload", () => {
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationOverridePatchSchema, {
        agentResourceKey: "agent:system:finance",
        mode: "disabled",
        baseRevision: 1,
        baseAccountPolicyRevision: 2,
      }),
    ).toThrow("FIELD_INVALID:agentResourceKey");
  });

  it("validates nested profile content and rejects duplicate routing examples", () => {
    expect(
      parseEnterpriseDelegationApiBody(EnterpriseDelegationProfilePatchSchema, validProfile),
    ).toEqual(validProfile);
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationProfilePatchSchema, {
        ...validProfile,
        profile: {
          ...validProfile.profile,
          useWhen: [
            "Kiểm tra điều khoản phạt trong hợp đồng",
            "kiểm tra điều khoản phạt trong hợp đồng",
          ],
        },
      }),
    ).toThrow("FIELD_INVALID:profile.useWhen");
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationProfilePatchSchema, {
        ...validProfile,
        profile: {
          ...validProfile.profile,
          requiredInputs: [{ label: "Hợp đồng", question: "Số?" }],
        },
      }),
    ).toThrow("FIELD_INVALID:profile.requiredInputs.0.question");
  });

  it("bounds activation and simulation payloads and keeps empty actions empty", () => {
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationActivationSchema, {
        previewToken: "short",
        exclusions: [],
      }),
    ).toThrow("FIELD_INVALID:previewToken");
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationSimulationSchema, {
        accountId: "user-a",
        prompt: "x".repeat(8_001),
      }),
    ).toThrow("FIELD_INVALID:prompt");
    expect(() =>
      parseEnterpriseDelegationApiBody(EnterpriseDelegationEmptyBodySchema, { activate: true }),
    ).toThrow("FIELD_INVALID:body");
  });
});
