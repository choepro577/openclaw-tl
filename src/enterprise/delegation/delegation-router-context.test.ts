import { describe, expect, it } from "vitest";
import type { EnterpriseDelegationCandidate } from "./delegation-candidates.js";
import {
  classifyEnterpriseFollowupIntent,
  enterpriseDelegationConversationInputs,
  enterpriseDelegationConversationResults,
  resolveExactEnterpriseRetry,
  withinRouterContextBudget,
} from "./delegation-router-context.js";

function candidate(
  overrides: Partial<EnterpriseDelegationCandidate> = {},
): EnterpriseDelegationCandidate {
  return {
    agentId: "hr",
    resourceKey: "shared:agent:hr",
    name: "HRM",
    description: "Live HR records",
    profile: {
      status: "active",
      aliases: ["hrm"],
      handlingMode: "auto_when_certain",
      useWhen: ["employee records"],
      avoidWhen: [],
      requiredInputs: [],
    },
    profileRevision: "profile-v1",
    assigned: true,
    effective: true,
    routable: true,
    overrideMode: "inherit",
    overrideRevision: 1,
    effectiveMode: "auto_when_certain",
    reasonCodes: [],
    ...overrides,
  };
}

describe("enterprise delegation conversation facts", () => {
  it("keeps external user text in order and excludes tool, assistant and internal user-role content", () => {
    expect(
      enterpriseDelegationConversationInputs([
        { message: { role: "user", content: "Contract LEASE-42, deposit 60." } },
        { message: { role: "assistant", content: "Unverified model assertion" } },
        { message: { role: "toolResult", content: "Untrusted tool result" } },
        {
          message: {
            role: "user",
            content: "Completion is not user consent",
            provenance: { kind: "inter_session" },
          },
        },
        {
          message: {
            role: "user",
            content: "System wake",
            provenance: { kind: "internal_system" },
          },
        },
        { message: { role: "user", content: "Invalid provenance", provenance: {} } },
        {
          message: {
            role: "user",
            content: [
              { type: "text", text: "Actually deposit 50." },
              { type: "image", data: "private-image" },
            ],
            provenance: { kind: "external_user" },
          },
        },
      ]),
    ).toEqual(["Contract LEASE-42, deposit 60.", "Actually deposit 50."]);
  });

  it("never clips a newer correction and falls back to older contradictory facts", () => {
    expect(
      enterpriseDelegationConversationInputs([
        { message: { role: "user", content: "Old deposit 60" } },
        { message: { role: "user", content: "Correction: " + "x".repeat(3_000) } },
        { message: { role: "user", content: "Use that correction" } },
      ]),
    ).toEqual(["Use that correction"]);
  });

  it("bounds the number of whole messages", () => {
    const events = Array.from({ length: 12 }, (_, i) => ({
      message: { role: "user", content: `Fact ${i}` },
    }));
    expect(enterpriseDelegationConversationInputs(events)).toEqual(
      Array.from({ length: 8 }, (_, i) => `Fact ${i + 4}`),
    );
  });
});

describe("enterprise delegation conversation results", () => {
  it("keeps recent answers and explicit in-progress status while skipping drafts and NO_REPLY", () => {
    expect(
      enterpriseDelegationConversationResults([
        { message: { role: "assistant", stopReason: "stop", content: "Older answer" } },
        { message: { role: "assistant", stopReason: "toolUse", content: "Draft" } },
        { message: { role: "assistant", content: "Handoff acknowledgment" } },
        {
          message: {
            role: "assistant",
            api: "openclaw-transcript",
            provider: "openclaw",
            model: "host-response",
            content: "Đã chuyển phần việc đến chuyên gia, đang chờ kết quả để tổng hợp.",
          },
        },
        {
          message: {
            role: "assistant",
            stopReason: "stop",
            content: [{ type: "text", text: "Completed analysis" }],
          },
        },
        {
          message: {
            role: "assistant",
            stopReason: "stop",
            content: [
              { type: "text", text: "Would have called a tool" },
              { type: "toolCall", id: "call-1", name: "read", arguments: {} },
            ],
          },
        },
        { message: { role: "assistant", stopReason: "stop", content: "NO_REPLY" } },
      ]),
    ).toEqual([
      "Đã chuyển phần việc đến chuyên gia, đang chờ kết quả để tổng hợp.",
      "Completed analysis",
    ]);
  });

  it("returns at most two results and preserves both ends within the total bound", () => {
    const first = `FIRST-${"a".repeat(2_500)}-FIRST-END`;
    const second = `SECOND-${"b".repeat(2_500)}-SECOND-END`;
    const results = enterpriseDelegationConversationResults([
      { message: { role: "assistant", stopReason: "stop", content: "discarded older" } },
      { message: { role: "assistant", stopReason: "stop", content: first } },
      { message: { role: "assistant", stopReason: "stop", content: second } },
    ]);

    expect(results).toHaveLength(2);
    expect(results.join("").length).toBeLessThanOrEqual(4_000);
    expect(results[0]).toContain("FIRST-");
    expect(results[0]).toContain("FIRST-END");
    expect(results[1]).toContain("SECOND-");
    expect(results[1]).toContain("SECOND-END");
  });
});

describe("router context admission budget", () => {
  it("accepts the boundary but rejects each oversized dimension", () => {
    expect(
      withinRouterContextBudget("x".repeat(8000), ["x".repeat(3000)], ["x".repeat(4000)]),
    ).toBe(true);
    expect(withinRouterContextBudget("x".repeat(8001), [], [])).toBe(false);
    expect(withinRouterContextBudget("", Array(9).fill(""), [])).toBe(false);
    expect(withinRouterContextBudget("", ["x".repeat(3001)], [])).toBe(false);
    expect(withinRouterContextBudget("", [], ["", "", ""])).toBe(false);
    expect(withinRouterContextBudget("", [], ["x".repeat(4001)])).toBe(false);
  });
});

describe("enterprise follow-up source binding", () => {
  it.each([
    ["Thử lại tra cứu HRM", "retry"],
    ["Tiếp tục", "retry"],
    ["Đã đăng nhập", "retry"],
    ["Bạn có chắc không?", "recheck"],
    ["Bạn có chắc không, tôi nhớ nhiều hơn", "scope_expansion"],
    ["Tính lại phần còn lại", "summary"],
  ] as const)("classifies %s as %s", (prompt, intent) => {
    expect(classifyEnterpriseFollowupIntent(prompt)).toBe(intent);
  });

  it("binds a pure retry to the newest exact task and only carries approved consent", () => {
    const result = resolveExactEnterpriseRetry({
      prompt: "Thử lại cho tôi",
      policyRevision: 4,
      candidates: [candidate()],
      previous: [
        {
          eventId: "event-new",
          childRunId: "child-new",
          agentId: "hr",
          assignedTask: "Tra cứu nhân viên hiện tại từ HRM",
          status: "error",
          eventOutcome: "failed",
          eventReasonCode: "delegate_partial_failure",
          confirmationState: "approved",
          policyRevision: 4,
          profileRevision: "profile-v1",
          createdAt: 20,
        },
        {
          eventId: "event-old",
          childRunId: "child-old",
          agentId: "hr",
          assignedTask: "Older task",
          status: "ok",
          eventOutcome: "delegated",
          eventReasonCode: "delegate_started",
          confirmationState: "approved",
          policyRevision: 4,
          profileRevision: "profile-v1",
          createdAt: 10,
        },
      ],
    });
    expect(result).toEqual({
      kind: "matched",
      eventId: "event-new",
      routes: [{ agentId: "hr", task: "Tra cứu nhân viên hiện tại từ HRM" }],
      consentedAgentIds: ["hr"],
    });
  });

  it.each(["Tiếp tục", "Đã đăng nhập"])(
    "binds %s to the newest exact specialist task",
    (prompt) => {
      const result = resolveExactEnterpriseRetry({
        prompt,
        policyRevision: 4,
        candidates: [candidate()],
        previous: [
          {
            eventId: "event-po",
            childRunId: "child-po",
            agentId: "hr",
            assignedTask: "Tạo PO ngày 2026-09-10 cho toàn bộ chi nhánh",
            status: "error",
            eventOutcome: "failed",
            eventReasonCode: "delegate_partial_failure",
            confirmationState: "approved",
            policyRevision: 4,
            profileRevision: "profile-v1",
            createdAt: 20,
          },
        ],
      });

      expect(result).toMatchObject({
        kind: "matched",
        routes: [
          {
            agentId: "hr",
            task: "Tạo PO ngày 2026-09-10 cho toàn bộ chi nhánh",
          },
        ],
      });
    },
  );

  it("fails closed for scope expansion, policy drift, and ambiguous latest work", () => {
    const base = {
      eventId: "event-new",
      childRunId: "child-new",
      agentId: "hr",
      assignedTask: "Tra cứu nhân viên hiện tại từ HRM",
      status: "error" as const,
      eventOutcome: "failed" as const,
      eventReasonCode: "delegate_partial_failure",
      confirmationState: "approved" as const,
      policyRevision: 4,
      profileRevision: "profile-v1",
      createdAt: 20,
    };
    expect(
      resolveExactEnterpriseRetry({
        prompt: "Thử lại tra cứu nhân viên phòng Kế toán",
        policyRevision: 4,
        candidates: [candidate()],
        previous: [base],
      }),
    ).toEqual({ kind: "none" });
    expect(
      resolveExactEnterpriseRetry({
        prompt: "Thử lại nhưng lấy toàn hệ thống",
        policyRevision: 4,
        candidates: [candidate()],
        previous: [base],
      }),
    ).toEqual({ kind: "none" });
    expect(
      resolveExactEnterpriseRetry({
        prompt: "Thử lại cho tôi",
        policyRevision: 5,
        candidates: [candidate()],
        previous: [base],
      }),
    ).toEqual({ kind: "none" });
    expect(
      resolveExactEnterpriseRetry({
        prompt: "Thử lại cho tôi",
        policyRevision: 4,
        candidates: [candidate()],
        previous: [base, { ...base, eventId: "event-other", childRunId: "child-other" }],
      }),
    ).toEqual({ kind: "ambiguous" });
    expect(
      resolveExactEnterpriseRetry({
        prompt: "Thử lại cho tôi",
        policyRevision: 4,
        candidates: [candidate(), candidate({ agentId: "finance", name: "Finance" })],
        previous: [
          base,
          {
            ...base,
            childRunId: "child-finance",
            agentId: "finance",
            assignedTask: "Tra cứu dữ liệu tài chính",
          },
        ],
      }),
    ).toEqual({ kind: "ambiguous" });
  });
});
