import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAgentDelegationProfileDraft } from "./delegation-admin-service.js";
import { writeEnterpriseDelegationPolicy } from "./delegation-store.js";

const completionMocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("../../agents/simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: completionMocks.prepare,
  completeWithPreparedSimpleCompletionModel: completionMocks.complete,
}));

function specialistConfig(workspace: string): OpenClawConfig {
  return {
    agents: {
      entries: {
        contracts: {
          name: "Contract Agent",
          description: "Reviews contract obligations and commercial risks.",
          workspace,
        },
      },
    },
  };
}

function completion(text: string) {
  return {
    stopReason: "stop",
    content: [{ type: "text", text }],
  };
}

beforeEach(() => {
  completionMocks.prepare.mockReset().mockResolvedValue({
    model: { maxTokens: 4_096 },
    auth: { apiKey: "test" },
  });
  completionMocks.complete.mockReset();
});

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise delegation profile AI draft", () => {
  it("returns a reviewed draft without saving or activating it", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      writeEnterpriseDelegationPolicy(0, {
        rollout: "shadow",
        routerModel: "test/router",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      });
      completionMocks.complete.mockResolvedValueOnce(
        completion(
          JSON.stringify({
            description: "Chuyên kiểm tra nghĩa vụ và rủi ro trong hợp đồng doanh nghiệp.",
            aliases: ["chuyên gia hợp đồng"],
            handlingMode: "auto_when_certain",
            useWhen: [
              "Kiểm tra điều khoản phạt trong hợp đồng",
              "Đánh giá nghĩa vụ trước khi ký hợp đồng",
            ],
            avoidWhen: ["Chỉ cần dịch một câu không liên quan pháp lý"],
            requiredInputs: [
              { label: "Mã hợp đồng", question: "Bạn cần kiểm tra hợp đồng số nào?" },
            ],
          }),
        ),
      );

      const result = await createEnterpriseAgentDelegationProfileDraft(
        specialistConfig(state.workspaceDir),
        "contracts",
      );
      expect(result).toMatchObject({ source: "ai", saved: false, draft: { status: "draft" } });
      expect(result.draft.requiredInputs[0]?.id).toBe("");
    });
  });

  it.each([
    [
      "unknown top-level fields",
      {
        description: "Chuyên kiểm tra nghĩa vụ và rủi ro trong hợp đồng doanh nghiệp.",
        aliases: [],
        handlingMode: "auto_when_certain",
        useWhen: ["Kiểm tra hợp đồng", "Đánh giá nghĩa vụ hợp đồng"],
        avoidWhen: [],
        requiredInputs: [],
        activate: true,
      },
    ],
    [
      "short examples",
      {
        description: "Chuyên kiểm tra nghĩa vụ và rủi ro trong hợp đồng doanh nghiệp.",
        aliases: [],
        handlingMode: "auto_when_certain",
        useWhen: ["abc", "Đánh giá nghĩa vụ hợp đồng"],
        avoidWhen: [],
        requiredInputs: [],
      },
    ],
    [
      "model-supplied required input ids",
      {
        description: "Chuyên kiểm tra nghĩa vụ và rủi ro trong hợp đồng doanh nghiệp.",
        aliases: [],
        handlingMode: "auto_when_certain",
        useWhen: ["Kiểm tra hợp đồng", "Đánh giá nghĩa vụ hợp đồng"],
        avoidWhen: [],
        requiredInputs: [{ id: "model_controls_id", label: "Mã", question: "Mã hợp đồng là gì?" }],
      },
    ],
  ])("rejects %s instead of partially accepting model output", async (_label, draft) => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      writeEnterpriseDelegationPolicy(0, {
        rollout: "shadow",
        routerModel: "test/router",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      });
      completionMocks.complete.mockResolvedValueOnce(completion(JSON.stringify(draft)));

      await expect(
        createEnterpriseAgentDelegationProfileDraft(
          specialistConfig(state.workspaceDir),
          "contracts",
        ),
      ).rejects.toThrow("DELEGATION_DRAFT_INVALID");
    });
  });
});
