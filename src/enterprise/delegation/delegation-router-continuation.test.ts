import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentDelegationTargetConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { listEnterpriseAuditEvents } from "../audit/audit-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { readEnterpriseDelegationAgentFirstContext } from "./delegation-agent-first.js";
import {
  consumeEnterpriseDelegationDecision,
  invalidateEnterpriseDelegationPlan,
  invalidateEnterpriseDelegationRouterRuntimeState,
  prepareEnterpriseDelegationTurn,
  validateEnterpriseDelegationDecisionForDispatch,
} from "./delegation-router.js";
import {
  listEnterpriseDelegationEvents,
  writeEnterpriseDelegationOverride,
  writeEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const completion = vi.hoisted(() => ({ prepare: vi.fn(), complete: vi.fn() }));
vi.mock("../../agents/simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: completion.prepare,
  completeWithPreparedSimpleCompletionModel: completion.complete,
}));

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "enterprise-router-continuation-"));
  completion.prepare
    .mockReset()
    .mockResolvedValue({ model: { maxTokens: 4096 }, auth: { apiKey: "test" } });
  completion.complete.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  invalidateEnterpriseDelegationRouterRuntimeState();
  closeOpenClawStateDatabaseForTest();
  rmSync(directory, { recursive: true, force: true });
});

function fixture(profile: Partial<AgentDelegationTargetConfig> = {}, secondConfirm = false) {
  const options = { path: join(directory, "state.sqlite") };
  const account = createEnterpriseAccount(
    {
      username: "continuation.employee",
      displayName: "Employee",
      passwordHash: "test-hash",
      role: "employee",
      initialEntitlements: (secondConfirm ? ["finance", "operations"] : ["finance"]).map(
        (agentId) => ({
          resourceType: "agent" as const,
          resourceId: sharedAgentResourceKey(agentId),
          effect: "allow" as const,
        }),
      ),
    },
    options,
  );
  const policy = writeEnterpriseDelegationPolicy(
    0,
    {
      rollout: "on",
      routerModel: "test/router",
      autoThreshold: 0.9,
      clarifyThreshold: 0.7,
      minimumMargin: 0.15,
      maxDelegatesPerTurn: 3,
      eventRetentionDays: 90,
    },
    options,
  );
  const config = () =>
    markGatewayRequestScopedRuntimeConfig(
      {
        agents: {
          entries: {
            finance: {
              name: "Finance Specialist",
              description: "Reviews budgets and financial planning.",
              delegationTarget: {
                status: "active",
                aliases: [],
                handlingMode: "confirm_before_handoff",
                useWhen: ["review budget variance", "evaluate cash flow"],
                avoidWhen: [],
                requiredInputs: [],
                ...profile,
              },
            },
            ...(secondConfirm
              ? {
                  operations: {
                    name: "Operations Reviewer",
                    description: "Reviews staffing and delivery plans.",
                    delegationTarget: {
                      status: "active" as const,
                      aliases: [],
                      handlingMode: "confirm_before_handoff" as const,
                      useWhen: ["review delivery capacity"],
                      avoidWhen: [],
                      requiredInputs: [],
                    },
                  },
                }
              : {}),
          },
        },
      } satisfies OpenClawConfig,
      {
        enterpriseDelegation: {
          accountId: account.id,
          personalAgentId: `personal-${account.id}`,
          specialists: [],
        },
      },
    );
  let run = 0;
  async function turn(
    prompt: string,
    extra: {
      sessionKey?: string;
      simulation?: boolean;
      config?: OpenClawConfig;
    } = {},
  ) {
    const cfg = extra.config ?? config();
    const parentRunId = `run-${++run}`;
    const sessionKey = extra.sessionKey ?? "same-session";
    await prepareEnterpriseDelegationTurn({
      config: cfg,
      agentId: `personal-${account.id}`,
      sessionKey,
      parentRunId,
      prompt,
      simulation: extra.simulation,
      stateOptions: options,
    });
    const result = readGatewayRequestRuntimeMetadata(cfg)?.enterpriseDelegation?.turn;
    return {
      result,
      recovery: readEnterpriseDelegationAgentFirstContext({ config: cfg, sessionKey, parentRunId }),
      consume: () =>
        consumeEnterpriseDelegationDecision({
          config: cfg,
          decisionId: result?.decisionId ?? "",
          accountId: account.id,
          personalAgentId: `personal-${account.id}`,
          sessionKey,
          parentRunId,
          stateOptions: options,
        }),
    };
  }
  return { account, options, policy, config, turn };
}

function modelResponse(overrides: Record<string, unknown> = {}) {
  const routes = (overrides.routes ?? [
    { agentId: "finance", task: "Review the supplied budget", missingRequiredInputIds: [] },
  ]) as Array<Record<string, unknown>>;
  return {
    stopReason: "stop",
    content: [
      {
        type: "text",
        text: JSON.stringify({
          outcome: "delegate",
          handling: overrides.outcome === "local" || routes.length === 0 ? "direct" : "specialist",
          ...(overrides.continuation
            ? {
                handoffConsent:
                  overrides.continuation === "confirm"
                    ? "approved"
                    : overrides.continuation === "cancel"
                      ? "denied"
                      : "unchanged",
              }
            : {}),
          confidence: 0.98,
          secondConfidence: 0.1,
          independent: true,
          question: "",
          ...overrides,
          routes: routes.map((route) => ({
            resolvedRequiredInputs: [],
            knowledgeQueries: [],
            ...route,
          })),
        }),
      },
    ],
  };
}

function factsRoute(
  values: Record<string, string>,
  missingRequiredInputIds: string[] = [],
  task = "Review the proposed spending",
) {
  return [
    {
      agentId: "finance",
      task,
      missingRequiredInputIds,
      resolvedRequiredInputs: Object.entries(values).map(([id, value]) => ({
        id,
        value,
        sourceText: value,
      })),
    },
  ];
}

function respond(overrides: Record<string, unknown> = {}) {
  completion.complete.mockResolvedValueOnce(modelResponse(overrides));
}

function respondWhenAborted() {
  completion.complete.mockImplementationOnce(
    ({ options }) =>
      new Promise((resolve) => {
        options.signal.addEventListener(
          "abort",
          () => resolve({ stopReason: "aborted", content: [] }),
          { once: true },
        );
      }),
  );
}

describe("Enterprise delegation clarification lifecycle", () => {
  it("treats an explicit refusal as terminal even when a reply also supplies a missing value", async () => {
    const { turn } = fixture({
      requiredInputs: [{ id: "record", label: "Record", question: "Which record?" }],
    });
    respond({ outcome: "clarify", routes: factsRoute({}, ["record"]) });
    await turn("Đánh giá khoản ứng trước giúp mình.");
    const consent = {
      continuation: "confirm",
      outcome: "clarify",
      routes: factsRoute({}, ["record"]),
    };
    respond(consent);
    await turn("Ừ, mình đồng ý chuyển cho chuyên gia, lát mình gửi mã.");
    respond({
      continuation: "answer",
      handoffConsent: "denied",
      routes: factsRoute({ record: "PLAN-67" }),
    });
    const declined = await turn("Mã PLAN-67, nhưng đừng chuyển cho chuyên gia nữa nhé.");
    expect(declined.result).toMatchObject({ outcome: "local", reasonCode: "handoff_cancelled" });
    expect(declined.result?.decisionId).toBeUndefined();
    expect(completion.complete).toHaveBeenCalledTimes(3);
  });

  it("audits automatic plan selection once without retaining request content", async () => {
    const { turn, options } = fixture();
    const secretTask = "Assess the private acquisition budget with confidential terms.";
    respond();
    const initial = await turn(secretTask);
    expect(initial.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    const phases = listEnterpriseAuditEvents(100, options).filter((event) =>
      event.action.startsWith("delegation.plan."),
    );
    expect(phases.map((event) => event.action)).toEqual(["delegation.plan.selected"]);
    expect(phases.every((event) => event.targetId === initial.result?.planId)).toBe(true);
    expect(phases.map((event) => event.after)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          planId: initial.result?.planId,
          planRevision: 1,
          targetAgentIds: ["finance"],
          targetCount: 1,
        }),
      ]),
    );
    expect(JSON.stringify(phases)).not.toContain(secretTask);
    expect(JSON.stringify(phases)).not.toContain("Review the supplied budget");
    expect(
      listEnterpriseDelegationEvents({}, options).events.some(
        (event) => event.childRunIds.length > 0,
      ),
    ).toBe(false);
  });

  it.each([
    "router_preparation_failed",
    "router_provider_error",
    "router_response_truncated",
    "router_response_invalid_json",
    "router_response_invalid_schema",
    "pending_continuation_missing",
    "pending_continuation_invalid",
  ])(
    "reports %s without exposing provider content or discarding the pending handoff",
    async (reasonCode) => {
      const { turn, options } = fixture();
      respond({ outcome: "clarify", question: "Which part should be assessed?" });
      await turn("Assess whether our proposed shop can cover its rent and wages.");
      const privateProviderText = "provider-private-content-must-not-be-recorded";
      if (reasonCode === "router_preparation_failed") {
        completion.prepare.mockResolvedValueOnce({ error: privateProviderText });
      } else if (reasonCode === "router_provider_error") {
        completion.complete.mockRejectedValueOnce(new Error(privateProviderText));
      } else if (reasonCode === "router_response_truncated") {
        completion.complete.mockResolvedValueOnce({
          ...modelResponse({ continuation: "confirm" }),
          stopReason: "length",
        });
      } else if (reasonCode === "router_response_invalid_json") {
        completion.complete.mockResolvedValueOnce({
          stopReason: "stop",
          content: [{ type: "text", text: privateProviderText }],
        });
      } else if (reasonCode === "router_response_invalid_schema") {
        respond({
          continuation: "confirm",
          independent: undefined,
          unknownField: privateProviderText,
        });
      } else if (reasonCode === "pending_continuation_missing") {
        respond();
      } else {
        respond({ continuation: "confirmed" });
      }
      expect((await turn("Đồng ý, làm giúp mình nhé.")).result).toMatchObject({
        outcome: "clarify",
        reasonCode,
        clarificationQuestion: expect.stringContaining("chưa có chuyên gia"),
      });
      if (reasonCode === "router_provider_error") {
        expect(completion.complete).toHaveBeenCalledTimes(2);
      }
      expect(JSON.stringify(listEnterpriseDelegationEvents({}, options))).not.toContain(
        privateProviderText,
      );
      respond({ continuation: "confirm" });
      expect((await turn("Yes, please proceed.")).result?.outcome).toBe("delegate");
    },
  );

  it("keeps the pending clarification for an exact user retry after one timeout", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [
        { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
      ],
    });
    respond({
      outcome: "clarify",
      routes: [
        {
          agentId: "finance",
          task: "Review the proposed spending",
          missingRequiredInputIds: ["record"],
        },
      ],
    });
    await turn("Please assess this proposed spending plan.");
    vi.useFakeTimers();
    respondWhenAborted();
    const answer = "PLAN-903 nhé.";
    const pendingTurn = turn(answer);
    await vi.advanceTimersByTimeAsync(20_000);
    const ready = await pendingTurn;
    expect(ready.result).toMatchObject({ outcome: "clarify", reasonCode: "router_timed_out" });
    expect(completion.complete).toHaveBeenCalledTimes(2);
    respond({ continuation: "answer", routes: factsRoute({ record: "PLAN-903" }) });
    const retried = await turn(answer);
    expect(retried.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    const consumed = retried.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes[0]?.task).toContain(answer);
    }
  });

  it("routes a clear request immediately without creating a confirmation pending state", async () => {
    const { turn } = fixture();
    respond();
    const ready = await turn("Assess the cash runway of our new shop.");
    expect(ready.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    expect(completion.complete).toHaveBeenCalledTimes(1);
    expect(completion.prepare).toHaveBeenCalledTimes(1);
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes[0]?.task).toBe("Review the supplied budget");
      expect(consumed.decision.confirmationState).toBe("not_required");
    }
  });

  it("cancels a pending clarification in one continuation pass", async () => {
    const { turn } = fixture();
    respond({ outcome: "clarify", question: "Which part should be assessed?" });
    await turn("Assess the cash runway of our new shop.");

    respond({ continuation: "cancel", outcome: "local", routes: [] });
    const result = await turn("Đồng ý, làm giúp mình nhé.");

    expect(result.result).toMatchObject({ outcome: "local", reasonCode: "handoff_cancelled" });
    expect(result.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
    expect(completion.complete).toHaveBeenCalledTimes(2);
  });

  it("does not retry a timed-out continuation after its pending slot is invalidated", async () => {
    const { turn } = fixture();
    respond({ outcome: "clarify", question: "Which part should be assessed?" });
    await turn("Assess whether our proposed shop can cover its rent and wages.");
    vi.useFakeTimers();
    respondWhenAborted();
    const pendingTurn = turn("Đồng ý.");
    await vi.advanceTimersByTimeAsync(1);
    invalidateEnterpriseDelegationRouterRuntimeState();
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await pendingTurn).result).toMatchObject({
      outcome: "blocked",
      reasonCode: "pending_clarification_replaced",
    });
    expect(completion.complete).toHaveBeenCalledTimes(2);
  });

  it.each([
    "Translate the title 'review budget variance' into Vietnamese; do not analyze or delegate it.",
    "Do not call Finance Specialist. Just rewrite this sentence in plain English.",
    "Translate the name 'Finance Specialist' into Vietnamese.",
  ])(
    "checks the actual intent instead of treating quoted or negated matches as consent: %s",
    async (prompt) => {
      const { turn } = fixture();
      respond({ outcome: "local", routes: [] });
      const next = await turn(prompt);
      expect(next.result).toBeUndefined();
      expect(next.recovery?.prompt).toBe(prompt);
      expect(next.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
      expect(completion.complete).toHaveBeenCalledTimes(1);
      expect(completion.complete.mock.lastCall![0].context.systemPrompt).toContain(
        "A negated or quoted name is not an explicit handoff request",
      );
    },
  );

  it.each([
    {
      continuation: "cancel",
      answer: "Không, để tôi tự xem.",
      outcome: "local",
      reasonCode: "handoff_cancelled",
    },
    {
      continuation: "cancel",
      answer: "Hủy việc đó nhé.",
      outcome: "local",
      reasonCode: "handoff_cancelled",
    },
    {
      continuation: "new_task",
      answer: "Thôi, viết giúp tôi lời chúc sinh nhật.",
      outcome: "local",
      reasonCode: "router_no_candidate",
    },
    {
      continuation: "revise",
      answer: "Đồng ý nhưng đổi sang phân tích chi nhánh khác.",
      outcome: "delegate",
      reasonCode: "route_ready",
    },
    {
      continuation: "unclear",
      answer: "Tôi chưa chắc.",
      outcome: "clarify",
      reasonCode: "pending_clarification_unresolved",
    },
  ])(
    "handles $continuation with clarification state scoped to the current task: $answer",
    async ({ continuation, answer, outcome, reasonCode }) => {
      const { turn } = fixture();
      respond({ outcome: "clarify", question: "Which part should be assessed?" });
      await turn("Assess whether our new shop can afford the proposed rent and payroll.");
      respond({
        continuation,
        ...(continuation === "cancel" || continuation === "new_task"
          ? { outcome: "local", routes: [] }
          : {}),
      });
      if (continuation === "new_task") {
        respond({ outcome: "local", routes: [] });
      }
      const next = await turn(answer);
      if (continuation === "new_task") {
        expect(next.result).toBeUndefined();
        expect(next.recovery?.pending).toBeUndefined();
        expect(next.recovery?.prompt).toBe(answer);
      } else {
        expect(next.result).toMatchObject({ outcome, reasonCode });
      }
      if (outcome === "local") {
        respond({ outcome: "local", routes: [] });
        const followup = await turn("Đồng ý nhé.");
        expect(followup.result).toBeUndefined();
        expect(followup.recovery?.pending).toBeUndefined();
        expect(followup.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
        const payload = JSON.parse(
          completion.complete.mock.lastCall![0].context.messages[0].content,
        );
        expect(payload.pendingClarification).toBeUndefined();
      }
    },
  );

  it("constrains a pending input's replacement to the router schema and releases the old plan", async () => {
    const { turn, options } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [{ id: "record", label: "Contract", question: "Which contract?" }],
    });
    respond({ outcome: "clarify", routes: factsRoute({}, ["record"]) });
    await turn("Please assess the advance-payment risk in the warehouse agreement.");
    respond({
      continuation: "new_task",
      handoffConsent: "denied",
      handling: "knowledge",
      outcome: "local",
      routes: [],
    });
    respond({ handling: "knowledge", outcome: "local", routes: [] });
    const replacement =
      "Leave that agreement for later. Is data deleted 31 days ago still within our backup retention period?";
    const next = await turn(replacement);
    expect(next.result).toBeUndefined();
    expect(next.recovery?.pending).toBeUndefined();
    expect(next.recovery?.prompt).toBe(replacement);
    expect(next.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
    expect(completion.complete).toHaveBeenCalledTimes(3);

    for (const [index, [request]] of completion.complete.mock.calls.entries()) {
      const pending = index === 1;
      const payload = JSON.parse(request.context.messages[0].content);
      expect(Boolean(payload.pendingClarification)).toBe(pending);
      if (index > 0) {
        expect(payload.prompt).toBe(replacement);
      }
      const format = request.options.responseFormat;
      expect(format).toMatchObject({
        type: "json_schema",
        json_schema: { name: "enterprise_delegation_router", strict: true },
      });
      const schema = format.json_schema.schema;
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required.toSorted()).toEqual(Object.keys(schema.properties).toSorted());
      expect(schema.properties.independent).toEqual({ type: "boolean" });
      expect(schema.properties.question.type).toBe("string");
      expect(schema.properties.routes.type).toBe("array");
      const route = schema.properties.routes.items;
      expect(route.additionalProperties).toBe(false);
      expect(route.required.toSorted()).toEqual(Object.keys(route.properties).toSorted());
      const input = route.properties.resolvedRequiredInputs.items;
      expect(input.additionalProperties).toBe(false);
      expect(input.required.toSorted()).toEqual(["id", "sourceText", "value"]);
      if (pending) {
        expect(schema.properties.continuation.enum).toEqual([
          "confirm",
          "answer",
          "revise",
          "cancel",
          "new_task",
          "unclear",
        ]);
        expect(schema.properties.handoffConsent.enum).toEqual(["approved", "denied", "unchanged"]);
      } else {
        expect(schema.properties).not.toHaveProperty("continuation");
        expect(schema.properties).not.toHaveProperty("handoffConsent");
      }
    }
    respond({ outcome: "local", routes: [] });
    await turn("Yes, please.");
    expect(
      JSON.parse(completion.complete.mock.lastCall![0].context.messages[0].content),
    ).not.toHaveProperty("pendingClarification");
    expect(
      listEnterpriseDelegationEvents({}, options).events.every(
        (event) => event.childRunIds.length === 0,
      ),
    ).toBe(true);
  });

  it("continues AI-requested input and checks every remaining required field", async () => {
    const requiredInputs = [
      { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
      { id: "region", label: "Operating region", question: "Which region does this apply to?" },
    ];
    const { turn } = fixture({ handlingMode: "auto_when_certain", requiredInputs });
    const route = (missingRequiredInputIds: string[]) =>
      factsRoute(
        {
          ...(!missingRequiredInputIds.includes("record") ? { record: "PLAN-72" } : {}),
          ...(!missingRequiredInputIds.includes("region") ? { region: "Miền Trung" } : {}),
        },
        missingRequiredInputIds,
      );
    respond({ outcome: "clarify", routes: route(["record", "region"]) });
    expect((await turn("Can you assess this proposed spending plan?")).result).toMatchObject({
      outcome: "clarify",
      source: "ai",
      reasonCode: "required_input_missing:record",
    });
    respond({ continuation: "answer", outcome: "clarify", routes: route(["region"]) });
    expect((await turn("PLAN-72 nhé.")).result).toMatchObject({
      outcome: "clarify",
      source: "ai",
      reasonCode: "required_input_missing:region",
    });
    respond({ continuation: "answer", routes: route([]) });
    const done = await turn("Miền Trung.");
    expect(done.result?.outcome).toBe("delegate");
    const consumed = done.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.prompt).toContain("PLAN-72 nhé.");
      expect(consumed.decision.prompt).toContain("Miền Trung.");
      expect(consumed.decision.routes[0]?.task).toContain("PLAN-72 nhé.");
      expect(consumed.decision.routes[0]?.task).toContain("Miền Trung.");
    }
  });

  it("accepts semantically supplied required information without literal field labels", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [
        { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
      ],
    });
    respond({ routes: factsRoute({ record: "DV-2409" }) });
    expect(
      (await turn("Please review the service agreement DV-2409 before I sign it.")).result?.outcome,
    ).toBe("delegate");
  });

  it("keeps a supplied contract reference when assent continues the same multi-specialist plan", async () => {
    const { turn } = fixture(
      {
        handlingMode: "auto_when_certain",
        requiredInputs: [
          { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
        ],
      },
      true,
    );
    const routes = [
      {
        agentId: "finance",
        task: "Review the advance-payment risk in BT-0904",
        missingRequiredInputIds: [],
        resolvedRequiredInputs: [{ id: "record", value: "BT-0904", sourceText: "BT-0904" }],
      },
      {
        agentId: "operations",
        task: "Review the independent delivery schedule for thirty staff",
        missingRequiredInputIds: [],
      },
    ];
    const prompt =
      "Bản BT-0904 ghi trả trước 80%. Bạn xem rủi ro tiền ứng và lịch triển khai cho 30 người nhé.";
    respond({ outcome: "clarify", question: "Which part should be assessed?", routes });
    expect((await turn(prompt)).result?.reasonCode).toBe("router_ambiguous");
    // A continuation model may forget a field while correctly answering the
    // clarification. The server retains the exact user supplied value.
    respond({
      continuation: "answer",
      outcome: "clarify",
      routes: [
        { ...routes[0], missingRequiredInputIds: ["record"], resolvedRequiredInputs: [] },
        routes[1],
      ],
    });
    const ready = await turn("Ừ, bạn xem giúp mình cả các phần đó nhé.");
    expect(ready.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.confirmationState).toBe("not_required");
      expect(consumed.decision.prompt).toContain(prompt);
      expect(consumed.decision.routes.map((route) => route.agentId)).toEqual([
        "finance",
        "operations",
      ]);
    }
  });

  it("accepts an answer with handoff consent without discarding the supplied required value", async () => {
    const { turn } = fixture({
      requiredInputs: [
        { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
      ],
    });
    respond({
      outcome: "clarify",
      routes: [
        {
          agentId: "finance",
          task: "Review the payment risk",
          missingRequiredInputIds: ["record"],
        },
      ],
    });
    expect((await turn("Bạn xem giúp rủi ro khoản ứng trước nhé.")).result?.reasonCode).toBe(
      "required_input_missing:record",
    );
    respond({ continuation: "answer", routes: factsRoute({ record: "BT-0904" }) });
    const answer = "Bản BT-0904, mình đồng ý chuyển phần việc này nhé.";
    const ready = await turn(answer);
    expect(ready.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.confirmationState).toBe("not_required");
      expect(consumed.decision.prompt).toContain("BT-0904");
      expect(consumed.decision.routes[0]?.task).toContain("BT-0904");
    }
  });

  it("replaces revised assignment terms instead of dispatching the old task after fresh consent", async () => {
    const { turn } = fixture();
    const oldTask = "Assess the runway for the original branch with a budget of 60 million";
    const newTask = "Assess only the revised branch with a budget of 90 million";
    respond({
      outcome: "clarify",
      question: "Which branch should be assessed?",
      routes: [{ agentId: "finance", task: oldTask, missingRequiredInputIds: [] }],
    });
    await turn("Bạn tính dòng tiền cho chi nhánh ban đầu, ngân sách 60 triệu nhé.");
    respond({
      continuation: "revise",
      routes: [{ agentId: "finance", task: newTask, missingRequiredInputIds: [] }],
    });
    const revised = await turn("Đổi sang chi nhánh mới, ngân sách 90 triệu nhé.");
    expect(revised.result).toMatchObject({
      outcome: "delegate",
      reasonCode: "route_ready",
      planRevision: 2,
    });
    const consumed = revised.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes[0]?.task).toContain(newTask);
      expect(consumed.decision.routes[0]?.task).not.toContain(oldTask);
      expect(consumed.decision.prompt).toContain("ngân sách 90 triệu");
    }
  });

  it("preserves the complete authorized request and every answer when they fit the source limit", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [
        { id: "record", label: "Record reference", question: "Which record?" },
        { id: "region", label: "Operating region", question: "Which region?" },
      ],
    });
    const task = "Review proposed spending. ".padEnd(4000, "x");
    const route = (missingRequiredInputIds: string[]) =>
      factsRoute(
        {
          ...(!missingRequiredInputIds.includes("record") ? { record: "PLAN-8839" } : {}),
          ...(!missingRequiredInputIds.includes("region")
            ? { region: "North operating region" }
            : {}),
        },
        missingRequiredInputIds,
        task,
      );
    respond({ outcome: "clarify", routes: route(["record", "region"]) });
    const original = "Assess this spending proposal. ".padEnd(7500, "y") + " Cost ceiling: 310.";
    await turn(original);
    respond({ outcome: "clarify", continuation: "answer", routes: route(["region"]) });
    await turn("PLAN-8839");
    respond({ continuation: "answer", routes: route([]) });
    const consumed = (await turn("North operating region")).consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.prompt.length).toBeLessThanOrEqual(8000);
      expect(consumed.decision.prompt).toContain(original);
      expect(consumed.decision.routes[0]!.task.length).toBeLessThanOrEqual(4000);
      for (const value of [consumed.decision.prompt, consumed.decision.routes[0]!.task]) {
        expect(value).toContain("PLAN-8839");
        expect(value).toContain("North operating region");
      }
    }
  });

  it("retains prior required facts while later answers fill the same plan's missing facts", async () => {
    const { turn } = fixture({
      requiredInputs: [
        { id: "record", label: "Record", question: "Which record?" },
        { id: "region", label: "Region", question: "Which region?" },
      ],
    });
    respond({ outcome: "clarify", routes: factsRoute({}, ["record", "region"]) });
    const initial = await turn("Bạn xem giúp rủi ro khoản ứng trước nhé.");
    const answerAndConsent = {
      continuation: "answer",
      handoffConsent: "approved",
      outcome: "clarify",
      routes: factsRoute({ record: "PLAN-54" }, ["region"]),
    };
    respond(answerAndConsent);
    const stillMissing = await turn("Hồ sơ PLAN-54. Mình đồng ý chuyển phần việc này nhé.");
    expect(stillMissing.result).toMatchObject({
      reasonCode: "required_input_missing:region",
      planId: initial.result?.planId,
      planRevision: 1,
    });
    respond({ continuation: "answer", routes: factsRoute({ region: "Miền Nam" }) });
    const ready = await turn("Áp dụng tại Miền Nam nhé.");
    expect(ready.result).toMatchObject({
      outcome: "delegate",
      planId: initial.result?.planId,
      planRevision: 1,
    });
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.confirmationState).toBe("not_required");
      expect(consumed.decision.routes[0]?.requiredInputs).toEqual([
        { id: "record", value: "PLAN-54", sourceText: "PLAN-54" },
        { id: "region", value: "Miền Nam", sourceText: "Miền Nam" },
      ]);
      const pendingPayload = JSON.parse(
        completion.complete.mock.calls[2]![0].context.messages[0].content,
      ).pendingClarification;
      expect(consumed.decision.routes[0]?.assignmentId).toBe(pendingPayload.routes[0].assignmentId);
    }
  });

  it("revises the plan when an answer corrects an already supplied value", async () => {
    const { turn } = fixture({
      requiredInputs: [
        { id: "record", label: "Record", question: "Which record?" },
        { id: "region", label: "Region", question: "Which region?" },
      ],
    });
    respond({ outcome: "clarify", routes: factsRoute({ record: "PLAN-54" }, ["region"]) });
    const initial = await turn("Đánh giá khoản ứng của PLAN-54 giúp mình.");
    const correction = { record: "PLAN-55", region: "Miền Nam" };
    respond({
      continuation: "answer",
      handoffConsent: "approved",
      routes: factsRoute(correction, [], "Review only the corrected PLAN-55 for Miền Nam"),
    });
    const revised = await turn("Mình ghi nhầm, phải là PLAN-55, tại Miền Nam. Đồng ý nhé.");
    expect(revised.result).toMatchObject({
      outcome: "delegate",
      reasonCode: "route_ready",
      planId: initial.result?.planId,
      planRevision: 2,
    });
    const consumed = revised.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.planRevision).toBe(2);
      expect(consumed.decision.routes[0]?.task).toContain("Review only the corrected PLAN-55");
      expect(
        consumed.decision.routes[0]?.requiredInputs.find((input) => input.id === "record")?.value,
      ).toBe("PLAN-55");
    }
  });

  it("rejects a required value whose source exists only in the generated question", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [{ id: "record", label: "Record", question: "Review PLAN-FAKE?" }],
    });
    respond({ outcome: "clarify", routes: factsRoute({}, ["record"]) });
    await turn("Bạn đánh giá rủi ro hồ sơ giúp mình nhé.");
    respond({ continuation: "answer", routes: factsRoute({ record: "PLAN-FAKE" }) });
    const invalid = await turn("Theo thông tin mình đã gửi.");
    expect(invalid.result).toMatchObject({
      outcome: "clarify",
      reasonCode: "router_input_source_not_user",
    });
    expect(invalid.result?.decisionId).toBeUndefined();
    expect(completion.complete).toHaveBeenCalledTimes(2);
  });

  it("invalidates exactly the admitted plan version without a new unadmitted request cancelling it", async () => {
    const { account, options, config, turn } = fixture({ handlingMode: "auto_when_certain" });
    respond();
    const consumed = (await turn("Bạn đánh giá dòng tiền giúp mình.")).consume();
    expect(consumed.ok).toBe(true);
    if (!consumed.ok) {
      return;
    }
    respond({ outcome: "local", routes: [] });
    await turn("Cảm ơn, viết lại câu này ngắn hơn giúp mình.");
    expect(
      validateEnterpriseDelegationDecisionForDispatch({
        decision: consumed.decision,
        config: config(),
        stateOptions: options,
      }),
    ).toEqual({ ok: true });
    const identity = {
      accountId: account.id,
      sessionKey: "same-session",
      planId: consumed.decision.planId,
      planRevision: consumed.decision.planRevision,
    };
    expect(
      invalidateEnterpriseDelegationPlan({ ...identity, planRevision: identity.planRevision + 1 }),
    ).toBe(false);
    expect(invalidateEnterpriseDelegationPlan(identity)).toBe(true);
    expect(
      validateEnterpriseDelegationDecisionForDispatch({
        decision: consumed.decision,
        config: config(),
        stateOptions: options,
      }),
    ).toEqual({ ok: false, reasonCode: "decision_plan_changed" });
  });

  it.each(["a".repeat(8001), "😀".repeat(4001)])(
    "asks for a shorter initial request instead of clipping source data (%#)",
    async (source) => {
      const { turn } = fixture({ handlingMode: "auto_when_certain" });
      const oversized = await turn(source);
      expect(oversized.result).toMatchObject({
        outcome: "clarify",
        reasonCode: "clarification_context_too_long",
        clarificationQuestion: expect.stringContaining("ngắn gọn"),
      });
      expect(oversized.result?.decisionId).toBeUndefined();
      expect(completion.complete).not.toHaveBeenCalled();
    },
  );

  it("asks to restate instead of truncating an original source when clarification exceeds its limit", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [{ id: "record", label: "Record", question: "Which record?" }],
    });
    respond({
      outcome: "clarify",
      routes: [
        { agentId: "finance", task: "Review spending", missingRequiredInputIds: ["record"] },
      ],
    });
    const original = "Preserve the final spending ceiling: ".padEnd(7995, "x") + "310😀";
    expect(original.length).toBe(8000);
    await turn(original);
    respond({ continuation: "answer" });
    const overflow = await turn("PLAN-8839");
    expect(overflow.result).toMatchObject({
      outcome: "clarify",
      reasonCode: "clarification_context_too_long",
      clarificationQuestion: expect.stringContaining("ngắn gọn"),
    });
    expect(overflow.result?.decisionId).toBeUndefined();
    expect(completion.complete).toHaveBeenCalledTimes(2);
  });

  it("routes every selected specialist without a separate consent question", async () => {
    const { turn } = fixture({}, true);
    const routes = [
      { agentId: "finance", task: "Assess the cash runway", missingRequiredInputIds: [] },
      {
        agentId: "operations",
        task: "Assess independent staffing requirements",
        missingRequiredInputIds: [],
      },
    ];
    respond({ routes, question: "May I send this to Finance Specialist?" });
    const ready = await turn(
      "Assess our cash runway and, independently, staffing needed for next month's deliveries.",
    );
    expect(ready.result).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
    expect(ready.result?.instruction).not.toContain("May I send");
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.confirmationState).toBe("not_required");
      expect(consumed.decision.routes.map((route) => route.agentId)).toEqual([
        "finance",
        "operations",
      ]);
    }
  });

  it("reports a changed target set without treating assent as consent to that replacement", async () => {
    const { turn, options } = fixture(
      {
        requiredInputs: [
          { id: "record", label: "Record", question: "Which record should be assessed?" },
        ],
      },
      true,
    );
    const finance = {
      agentId: "finance",
      task: "Assess the cash runway",
      missingRequiredInputIds: ["record"],
    };
    respond({
      outcome: "clarify",
      question: "Which parts should be assessed?",
      routes: [
        finance,
        {
          agentId: "operations",
          task: "Assess independent staffing requirements",
          missingRequiredInputIds: [],
        },
      ],
    });
    const initial = await turn(
      "Assess our cash runway and the staffing needed for next month's deliveries.",
    );
    expect(initial.result).toMatchObject({
      outcome: "clarify",
      reasonCode: "required_input_missing:record",
    });
    respond({ continuation: "confirm", routes: [finance] });
    const invalid = await turn("Yes, please proceed with both parts.");
    expect(invalid.result).toMatchObject({
      outcome: "clarify",
      reasonCode: "router_scope_mismatch",
    });
    expect(invalid.result?.decisionId).toBeUndefined();
    expect(invalid.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
    expect(listEnterpriseDelegationEvents({}, options).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reasonCode: "router_scope_mismatch", childRunIds: [] }),
      ]),
    );
    expect(completion.complete).toHaveBeenCalledTimes(2);
  });

  it("gives the single continuation pass the original multi-target plan and answer", async () => {
    const { turn } = fixture({}, true);
    const routes = [
      {
        agentId: "finance",
        task: "Assess the runway using the supplied costs",
        missingRequiredInputIds: [],
      },
      {
        agentId: "operations",
        task: "Review the staffing schedule using the supplied shifts",
        missingRequiredInputIds: [],
      },
    ];
    const prompt =
      "Our shop has six staff and 450 million cash. Assess runway and the staffing schedule.";
    const answer = "Ừ, bạn làm giúp cả hai phần nhé.";
    respond({ outcome: "clarify", question: "Which parts should be assessed?", routes });
    await turn(prompt);
    respond({ continuation: "confirm", routes });
    expect((await turn(answer)).result?.outcome).toBe("delegate");
    const request = completion.complete.mock.calls[1]![0];
    const payload = JSON.parse(request.context.messages[0].content);
    expect(payload.prompt).toBe(answer);
    expect(payload.pendingClarification.task).toBe(prompt);
    expect(payload.pendingClarification.routes).toEqual(
      routes.map(({ agentId, task }) => ({
        assignmentId: expect.any(String),
        agentId,
        task,
        requiredInputs: [],
        knowledgeQueries: [],
      })),
    );
  });

  it("provides a canonical user question when accumulated answers exceed the task limit", async () => {
    const { turn } = fixture({
      handlingMode: "auto_when_certain",
      requiredInputs: [
        { id: "record", label: "Record reference", question: "Which record should be reviewed?" },
      ],
    });
    respond({
      outcome: "clarify",
      routes: [
        {
          agentId: "finance",
          task: "Review the proposed spending",
          missingRequiredInputIds: ["record"],
        },
      ],
    });
    const first = await turn("Please assess this proposed spending plan.");
    expect(first.result?.clarificationQuestion).toBe("Which record should be reviewed?");
    respond({ continuation: "answer" });
    const tooLong = await turn("x".repeat(4001));
    expect(tooLong.result).toMatchObject({
      outcome: "clarify",
      reasonCode: "clarification_context_too_long",
      clarificationQuestion: expect.stringContaining("ngắn gọn"),
    });
  });

  it("does not require a negated specialist when another named specialist is affirmatively requested", async () => {
    const { turn } = fixture({}, true);
    const routes = [
      {
        agentId: "operations",
        task: "Review the delivery staffing plan",
        missingRequiredInputIds: [],
      },
    ];
    respond({ routes });
    const ready = await turn(
      "Do not call Finance Specialist. Ask Operations Reviewer to review the delivery staffing plan.",
    );
    expect(ready.result).toMatchObject({
      outcome: "delegate",
      agentNames: ["Operations Reviewer"],
    });
    expect(ready.consume().ok).toBe(true);
  });

  it.each(["account", "override"])(
    "rejects a ready decision after its %s revision changes",
    async (change) => {
      const { turn, account, options } = fixture({ handlingMode: "auto_when_certain" });
      respond();
      const ready = await turn("Assess this quarter's cash runway.");
      expect(ready.result?.outcome).toBe("delegate");
      if (change === "account") {
        updateEnterpriseAccount(account.id, { personalAgentEnabled: false }, options);
        updateEnterpriseAccount(account.id, { personalAgentEnabled: true }, options);
      } else {
        writeEnterpriseDelegationOverride(
          {
            accountId: account.id,
            agentResourceKey: sharedAgentResourceKey("finance"),
            mode: "explicit_only",
            baseRevision: 0,
            baseAccountPolicyRevision: account.policyRevision,
          },
          options,
        );
      }
      expect(ready.consume()).toEqual({ ok: false, reasonCode: "decision_policy_changed" });
    },
  );

  it("binds account and override revisions from before the awaited router call", async () => {
    const { turn, account, options } = fixture({ handlingMode: "auto_when_certain" });
    completion.complete.mockImplementationOnce(async () => {
      writeEnterpriseDelegationOverride(
        {
          accountId: account.id,
          agentResourceKey: sharedAgentResourceKey("finance"),
          mode: "explicit_only",
          baseRevision: 0,
          baseAccountPolicyRevision: account.policyRevision,
        },
        options,
      );
      return modelResponse();
    });
    respond();
    const ready = await turn("Assess this quarter's cash runway.");
    expect(ready.result?.outcome).toBe("delegate");
    expect(ready.consume()).toEqual({ ok: false, reasonCode: "decision_policy_changed" });
  });

  it("rechecks a consumed decision before dispatch without consuming again or using stale overrides", async () => {
    const { turn, account, options, config } = fixture({ handlingMode: "auto_when_certain" });
    respond();
    const ready = await turn("Assess this quarter's cash runway.");
    const consumed = ready.consume();
    expect(consumed.ok).toBe(true);
    if (!consumed.ok) {
      return;
    }
    const validation = { decision: consumed.decision, config: config(), stateOptions: options };
    expect(ready.consume()).toEqual({ ok: false, reasonCode: "decision_replayed" });
    expect(validateEnterpriseDelegationDecisionForDispatch(validation)).toEqual({ ok: true });
    expect(
      validateEnterpriseDelegationDecisionForDispatch({
        ...validation,
        decision: { ...consumed.decision, consumedAt: undefined },
      }),
    ).toEqual({ ok: false, reasonCode: "decision_not_consumed" });
    writeEnterpriseDelegationOverride(
      {
        accountId: account.id,
        agentResourceKey: sharedAgentResourceKey("finance"),
        mode: "explicit_only",
        baseRevision: 0,
        baseAccountPolicyRevision: account.policyRevision,
      },
      options,
    );
    expect(validateEnterpriseDelegationDecisionForDispatch(validation)).toEqual({
      ok: false,
      reasonCode: "decision_policy_changed",
    });
  });

  it.each(["policy", "account", "profile", "override", "expiry", "personal-agent"])(
    "does not consume an answer after the pending clarification %s binding changes",
    async (change) => {
      const { turn, account, options, policy, config } = fixture();
      respond({ outcome: "clarify", question: "Which part should be assessed?" });
      await turn("Assess the cash runway of our new shop.");
      const nextConfig = config();
      if (change === "policy") {
        const { revision, updatedAt: _updatedAt, ...settings } = policy;
        writeEnterpriseDelegationPolicy(revision, { ...settings, minimumMargin: 0.2 }, options);
      } else if (change === "account") {
        updateEnterpriseAccount(account.id, { personalAgentEnabled: false }, options);
        updateEnterpriseAccount(account.id, { personalAgentEnabled: true }, options);
      } else if (change === "profile") {
        nextConfig.agents!.entries!.finance!.description = "Changed specialist responsibilities.";
      } else if (change === "override") {
        writeEnterpriseDelegationOverride(
          {
            accountId: account.id,
            agentResourceKey: sharedAgentResourceKey("finance"),
            mode: "explicit_only",
            baseRevision: 0,
            baseAccountPolicyRevision: account.policyRevision,
          },
          options,
        );
      } else if (change === "expiry") {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 300_001);
      } else {
        const metadata = readGatewayRequestRuntimeMetadata(nextConfig)!;
        metadata.enterpriseDelegation!.personalAgentId = "different-personal-agent";
        await prepareEnterpriseDelegationTurn({
          config: nextConfig,
          agentId: "different-personal-agent",
          sessionKey: "same-session",
          parentRunId: "changed-personal-run",
          prompt: "Đồng ý nhé.",
          stateOptions: options,
        });
        expect(metadata.enterpriseDelegation!.turn).toMatchObject({
          outcome: "blocked",
          reasonCode: "pending_clarification_changed",
        });
        return;
      }
      expect((await turn("Đồng ý nhé.", { config: nextConfig })).result).toMatchObject({
        outcome: "blocked",
        reasonCode: "pending_clarification_changed",
      });
      expect(completion.complete).toHaveBeenCalledTimes(1);
    },
  );

  it("isolates pending clarification by account and conversation", async () => {
    const { turn, account, options, config } = fixture();
    respond({ outcome: "clarify", question: "Which part should be assessed?" });
    await turn("Assess the budget for our new shop.");
    respond({ outcome: "local", routes: [] });
    const isolated = await turn("Đồng ý.", { sessionKey: "another-session" });
    expect(isolated.result).toBeUndefined();
    expect(isolated.recovery?.sessionKey).toBe("another-session");
    expect(isolated.recovery?.pending).toBeUndefined();
    expect(isolated.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
    const other = createEnterpriseAccount(
      {
        username: "other.employee",
        displayName: "Other",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [
          { resourceType: "agent", resourceId: sharedAgentResourceKey("finance"), effect: "allow" },
        ],
      },
      options,
    );
    const otherConfig = config();
    const metadata = readGatewayRequestRuntimeMetadata(otherConfig)!;
    metadata.enterpriseDelegation!.accountId = other.id;
    metadata.enterpriseDelegation!.personalAgentId = `personal-${other.id}`;
    respond({ outcome: "local", routes: [] });
    await prepareEnterpriseDelegationTurn({
      config: otherConfig,
      agentId: `personal-${other.id}`,
      sessionKey: "same-session",
      parentRunId: "other-run",
      prompt: "Đồng ý.",
      stateOptions: options,
    });
    expect(metadata.enterpriseDelegation!.turn).toBeUndefined();
    expect(
      readEnterpriseDelegationAgentFirstContext({
        config: otherConfig,
        sessionKey: "same-session",
        parentRunId: "other-run",
      }),
    ).toMatchObject({ accountId: other.id, pending: undefined });
    expect(account.id).not.toBe(other.id);
    respond({ continuation: "confirm" });
    expect((await turn("Đồng ý.")).result?.outcome).toBe("delegate");
  });

  it("does not read, overwrite, consume, or record live clarification state during simulation", async () => {
    const { turn, options } = fixture();
    respond();
    await turn("Assess our new shop's cash runway.");
    const before = listEnterpriseDelegationEvents({}, options).total;
    respond({ outcome: "local", routes: [] });
    await turn("Đồng ý.", { simulation: true });
    expect(listEnterpriseDelegationEvents({}, options).total).toBe(before);
    expect(
      JSON.parse(completion.complete.mock.lastCall![0].context.messages[0].content)
        .pendingClarification,
    ).toBeUndefined();
    respond();
    await turn("Assess a different budget.", { simulation: true, sessionKey: "simulation-only" });
    expect(listEnterpriseDelegationEvents({}, options).total).toBe(before);
    respond({ outcome: "local", routes: [] });
    const isolated = await turn("Đồng ý.", { sessionKey: "simulation-only" });
    expect(isolated.result).toBeUndefined();
    expect(isolated.recovery?.sessionKey).toBe("simulation-only");
    expect(isolated.recovery?.pending).toBeUndefined();
    expect(isolated.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
  });
});
