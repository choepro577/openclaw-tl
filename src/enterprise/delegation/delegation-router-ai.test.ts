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
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import type { EnterpriseDelegationHistoryEntry } from "./delegation-router-context.js";
import {
  consumeEnterpriseDelegationDecision,
  prepareEnterpriseDelegationTurn,
} from "./delegation-router.js";
import {
  listEnterpriseDelegationEvents,
  writeEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const completionMocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("../../agents/simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: completionMocks.prepare,
  completeWithPreparedSimpleCompletionModel: completionMocks.complete,
}));

const tempDirectories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-router-ai-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function activePolicy(options: ReturnType<typeof stateOptions>, maxDelegatesPerTurn = 3) {
  return writeEnterpriseDelegationPolicy(
    0,
    {
      rollout: "on",
      routerModel: "test/router-model",
      autoThreshold: 0.9,
      clarifyThreshold: 0.7,
      minimumMargin: 0.15,
      maxDelegatesPerTurn,
      eventRetentionDays: 90,
    },
    options,
  );
}

type AgentOptions = {
  name: string;
  alias: string;
  handlingMode?: "auto_when_certain" | "confirm_before_handoff" | "explicit_only";
  avoidWhen?: string[];
  requiredInputs?: AgentDelegationTargetConfig["requiredInputs"];
};

const AGENT_OPTIONS: Record<string, AgentOptions> = {
  contracts: { name: "Agent Hợp đồng", alias: "chuyên gia hợp đồng" },
  finance: { name: "Agent Tài chính", alias: "chuyên gia tài chính" },
  hr: { name: "Agent Nhân sự", alias: "chuyên gia nhân sự" },
  security: { name: "Agent Bảo mật", alias: "chuyên gia bảo mật" },
};

function configFor(
  accountId: string,
  agentIds: string[],
  overrides: Partial<Record<string, Partial<AgentOptions>>> = {},
): OpenClawConfig {
  const entries = Object.fromEntries(
    agentIds.map((agentId) => {
      const options = { ...AGENT_OPTIONS[agentId]!, ...overrides[agentId] };
      return [
        agentId,
        {
          name: options.name,
          description: `${options.name} xử lý nghiệp vụ chuyên sâu cho doanh nghiệp an toàn.`,
          delegationTarget: {
            status: "active" as const,
            aliases: [options.alias],
            handlingMode: options.handlingMode ?? "auto_when_certain",
            useWhen: [`tình huống chuyên môn ${agentId} thứ nhất`, `tình huống ${agentId} thứ hai`],
            avoidWhen: options.avoidWhen ?? [],
            requiredInputs: options.requiredInputs ?? [],
          },
        },
      ];
    }),
  );
  return markGatewayRequestScopedRuntimeConfig(
    { agents: { entries } },
    {
      enterpriseDelegation: {
        accountId,
        personalAgentId: `personal-${accountId}`,
        specialists: [],
      },
    },
  );
}

function createEmployee(options: ReturnType<typeof stateOptions>, agentIds: string[]) {
  return createEnterpriseAccount(
    {
      username: `employee.${tempDirectories.length}`,
      displayName: "Employee",
      passwordHash: "test-hash",
      role: "employee",
      initialEntitlements: agentIds.map((agentId) => ({
        resourceType: "agent" as const,
        resourceId: sharedAgentResourceKey(agentId),
        effect: "allow" as const,
      })),
    },
    options,
  );
}

function routerJson(input: {
  handling?: "direct" | "knowledge" | "specialist" | "hybrid";
  outcome?: "delegate" | "clarify" | "local";
  confidence?: number;
  secondConfidence?: number;
  independent?: boolean;
  question?: string;
  routes?: Array<{
    agentId: string;
    task: string;
    missingRequiredInputIds?: string[];
    resolvedRequiredInputs?: Array<{ id: string; value: string; sourceText: string }>;
    knowledgeQueries?: string[];
  }>;
}): string {
  return JSON.stringify({
    outcome: input.outcome ?? "delegate",
    handling:
      input.handling ??
      (input.outcome === "local" || input.routes?.length === 0 ? "direct" : "specialist"),
    confidence: input.confidence ?? 0.9,
    secondConfidence: input.secondConfidence ?? 0.75,
    independent: input.independent ?? true,
    question: input.question ?? "",
    routes: (input.routes ?? []).map((route) => ({
      agentId: route.agentId,
      task: route.task,
      missingRequiredInputIds: route.missingRequiredInputIds ?? [],
      resolvedRequiredInputs: route.resolvedRequiredInputs ?? [],
      knowledgeQueries: route.knowledgeQueries ?? [],
    })),
  });
}

function queueCompletion(text: string): void {
  completionMocks.complete.mockResolvedValueOnce({
    stopReason: "stop",
    content: [{ type: "text", text }],
  });
}

function previousSpecialistAttempt(
  overrides: Partial<EnterpriseDelegationHistoryEntry> = {},
): EnterpriseDelegationHistoryEntry {
  return {
    eventId: "previous-event",
    childRunId: "previous-child",
    agentId: "finance",
    assignedTask: "Retry the exact live finance record lookup",
    status: "error",
    eventOutcome: "failed",
    eventReasonCode: "delegate_partial_failure",
    confirmationState: "not_required",
    policyRevision: 1,
    createdAt: 10,
    ...overrides,
  };
}

async function prepareTurn(params: {
  config: OpenClawConfig;
  accountId: string;
  options: ReturnType<typeof stateOptions>;
  prompt: string;
}) {
  await prepareEnterpriseDelegationTurn({
    config: params.config,
    agentId: `personal-${params.accountId}`,
    sessionKey: "session-ai",
    parentRunId: "run-ai",
    prompt: params.prompt,
    stateOptions: params.options,
  });
  return readGatewayRequestRuntimeMetadata(params.config)?.enterpriseDelegation?.turn;
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
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegation AI router", () => {
  it("lets the Personal Agent plan a contextual follow-up without approving specialist work", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"]);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "contextual-planning",
      parentRunId: "follow-up",
      prompt: "Recalculate the remaining cash from that analysis.",
      conversationResults: ["The original operating and exit costs were analyzed."],
      contextualPlanning: true,
      stateOptions: options,
    });
    expect(completionMocks.complete).not.toHaveBeenCalled();
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "local",
      reasonCode: "router_contextual_planning",
    });
    expect(
      readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn?.decisionId,
    ).toBeUndefined();
  });

  it("routes an explicit retry to the newest exact specialist task without another model pass", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"]);
    const previous = previousSpecialistAttempt();
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "retry-exact",
      parentRunId: "retry-run",
      prompt: "Thử lại cho tôi",
      conversationResults: ["Lần tra cứu trước chưa hoàn tất."],
      contextualPlanning: true,
      previousDelegationContext: [previous],
      stateOptions: options,
    });
    const turn = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn;
    expect(completionMocks.complete).not.toHaveBeenCalled();
    expect(turn).toMatchObject({ outcome: "delegate", source: "rule", reasonCode: "route_ready" });
    const consumed = consumeEnterpriseDelegationDecision({
      config,
      decisionId: turn?.decisionId ?? "",
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "retry-exact",
      parentRunId: "retry-run",
      stateOptions: options,
    });
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes).toEqual([
        expect.objectContaining({
          agentId: "finance",
          task: previous.assignedTask,
        }),
      ]);
    }
  });

  it("clarifies an unnamed pure retry when no eligible prior task exists", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"]);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "retry-missing",
      parentRunId: "retry-missing-run",
      prompt: "Thử lại cho tôi",
      conversationResults: ["Lần trước chưa hoàn tất."],
      contextualPlanning: true,
      stateOptions: options,
    });
    expect(completionMocks.complete).not.toHaveBeenCalled();
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "clarify",
      source: "rule",
      reasonCode: "retry_previous_task_unavailable",
    });
  });

  it("allows a recheck without history to receive a fresh source-aware router assessment", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"]);
    const response = routerJson({
      confidence: 0.99,
      secondConfidence: 0.01,
      routes: [{ agentId: "finance", task: "Recheck the current finance records" }],
    });
    queueCompletion(response);
    queueCompletion(response);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "recheck-fresh",
      parentRunId: "recheck-fresh-run",
      prompt: "Bạn có chắc không?",
      stateOptions: options,
    });
    expect(completionMocks.complete).toHaveBeenCalledTimes(2);
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "delegate",
      source: "ai",
      reasonCode: "route_ready",
    });
  });

  it("admits an exact retry for explicit-only specialists without re-prompting the model", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"], {
      finance: { handlingMode: "explicit_only" },
    });
    const previous = previousSpecialistAttempt({ confirmationState: "approved" });
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "retry-explicit-only",
      parentRunId: "retry-explicit-only-run",
      prompt: "Thử lại cho tôi",
      previousDelegationContext: [previous],
      stateOptions: options,
    });
    expect(completionMocks.complete).not.toHaveBeenCalled();
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "delegate",
      source: "rule",
      reasonCode: "route_ready",
    });
  });

  it("sends scope expansion and recheck follow-ups through the source-aware router", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"]);
    const previous = previousSpecialistAttempt();
    const response = routerJson({
      confidence: 0.99,
      secondConfidence: 0.01,
      routes: [{ agentId: "finance", task: "Recheck the all-system live records" }],
    });
    queueCompletion(response);
    queueCompletion(response);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "retry-expansion",
      parentRunId: "retry-expansion-run",
      prompt: "Bạn có chắc không? Tôi nhớ nhiều hơn, kiểm tra toàn hệ thống nhé.",
      conversationResults: ["Lần trước chỉ kiểm tra một phạm vi hẹp."],
      contextualPlanning: true,
      previousDelegationContext: [previous],
      stateOptions: options,
    });
    const turn = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn;
    expect(turn?.outcome).toBe("delegate");
    expect(completionMocks.complete).toHaveBeenCalledTimes(2);
    expect(completionMocks.complete.mock.calls[0]![0].context.systemPrompt).toContain(
      "live-system record retrieval request",
    );
    expect(completionMocks.complete.mock.calls[0]![0].context.systemPrompt).toContain(
      "Enterprise Knowledge is for published policy/document evidence",
    );
    const payload = JSON.parse(
      completionMocks.complete.mock.calls[0]![0].context.messages[0].content,
    );
    expect(payload.previousDelegationContext[0]).toMatchObject({
      agentId: "finance",
      assignedTask: previous.assignedTask,
    });
    expect(payload.prompt).toContain("toàn hệ thống");
  });

  it("reuses prior approved or explicit consent only for an unchanged retry task", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"], {
      finance: { handlingMode: "confirm_before_handoff" },
    });
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "retry-approved",
      parentRunId: "retry-approved-run",
      prompt: "Thử lại cho tôi",
      previousDelegationContext: [previousSpecialistAttempt({ confirmationState: "approved" })],
      stateOptions: options,
    });
    expect(completionMocks.complete).not.toHaveBeenCalled();
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "delegate",
      reasonCode: "route_ready",
    });

    const nextOptions = stateOptions();
    const nextAccount = createEmployee(nextOptions, ["finance"]);
    activePolicy(nextOptions);
    const nextConfig = configFor(nextAccount.id, ["finance"], {
      finance: { handlingMode: "confirm_before_handoff" },
    });
    await prepareEnterpriseDelegationTurn({
      config: nextConfig,
      agentId: `personal-${nextAccount.id}`,
      sessionKey: "retry-unapproved",
      parentRunId: "retry-unapproved-run",
      prompt: "Thử lại cho tôi",
      previousDelegationContext: [previousSpecialistAttempt({ confirmationState: "not_required" })],
      stateOptions: nextOptions,
    });
    expect(readGatewayRequestRuntimeMetadata(nextConfig)?.enterpriseDelegation?.turn).toMatchObject(
      {
        outcome: "clarify",
        reasonCode: "handoff_confirmation_required",
      },
    );

    const explicitOptions = stateOptions();
    const explicitAccount = createEmployee(explicitOptions, ["finance"]);
    activePolicy(explicitOptions);
    const explicitConfig = configFor(explicitAccount.id, ["finance"], {
      finance: { handlingMode: "confirm_before_handoff" },
    });
    await prepareEnterpriseDelegationTurn({
      config: explicitConfig,
      agentId: `personal-${explicitAccount.id}`,
      sessionKey: "retry-explicit-confirm-mode",
      parentRunId: "retry-explicit-confirm-mode-run",
      prompt: "Thử lại cho tôi",
      previousDelegationContext: [
        previousSpecialistAttempt({
          confirmationState: "not_required",
          decisionSource: "explicit",
        }),
      ],
      stateOptions: explicitOptions,
    });
    expect(
      readGatewayRequestRuntimeMetadata(explicitConfig)?.enterpriseDelegation?.turn,
    ).toMatchObject({ outcome: "delegate", reasonCode: "route_ready" });
  });

  it("grounds a follow-up in prior user facts in both passes without renewing old consent", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"], {
      contracts: {
        requiredInputs: [{ id: "record", label: "Contract", question: "Which contract?" }],
      },
    });
    const conversationInputs = [
      "Contract LEASE-42 has a 60 million deposit and a 3-month exit penalty.",
    ];
    const conversationResults = [
      "The prior review found that LEASE-42 has a 3-month exit penalty.",
    ];
    const response = routerJson({
      confidence: 0.99,
      secondConfidence: 0.01,
      routes: [
        {
          agentId: "contracts",
          task: "Assess the exit obligations for LEASE-42 before the downside calculation",
          resolvedRequiredInputs: [{ id: "record", value: "LEASE-42", sourceText: "LEASE-42" }],
        },
      ],
    });
    queueCompletion(response);
    queueCompletion(response);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "history-followup",
      parentRunId: "followup",
      prompt: "For that same lease, check the exit obligations first.",
      conversationInputs,
      conversationResults,
      stateOptions: options,
    });
    const turn = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn;
    expect(turn?.outcome).toBe("delegate");
    expect(completionMocks.complete).toHaveBeenCalledTimes(2);
    for (const [call] of completionMocks.complete.mock.calls) {
      expect(JSON.parse(call.context.messages[0].content).conversationInputs).toEqual(
        conversationInputs,
      );
      expect(JSON.parse(call.context.messages[0].content).conversationResults).toEqual(
        conversationResults,
      );
    }
    const consumed = consumeEnterpriseDelegationDecision({
      config,
      decisionId: turn!.decisionId!,
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "history-followup",
      parentRunId: "followup",
      stateOptions: options,
    });
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.prompt).toContain(conversationInputs[0]);
      expect(consumed.decision.prompt).not.toContain(conversationResults[0]);
    }
  });

  it("never lets an assistant result satisfy a required user input", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"], {
      finance: {
        requiredInputs: [{ id: "record", label: "Budget", question: "Which budget?" }],
      },
    });
    queueCompletion(
      routerJson({
        confidence: 0.99,
        secondConfidence: 0.01,
        routes: [
          {
            agentId: "finance",
            task: "Assess the budget",
            resolvedRequiredInputs: [{ id: "record", value: "BUDGET-42", sourceText: "BUDGET-42" }],
          },
        ],
      }),
    );

    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "assistant-result-input-source",
      parentRunId: "assistant-result-input-source",
      prompt: "Assess the budget risks.",
      conversationResults: ["The completed review covered BUDGET-42."],
      stateOptions: options,
    });

    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "clarify",
      reasonCode: "router_input_source_not_user",
    });
  });

  it("does not treat an old named handoff in conversation facts as consent for a new handoff", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance"], {
      finance: { handlingMode: "confirm_before_handoff" },
    });
    queueCompletion(
      routerJson({
        confidence: 0.99,
        secondConfidence: 0.01,
        routes: [{ agentId: "finance", task: "Evaluate a new expansion scenario" }],
      }),
    );
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "history-consent",
      contextualPlanning: true,
      conversationResults: ["The original analysis is complete."],
      proposedAssignments: [{ agentId: "finance", task: "Evaluate a new expansion scenario" }],
      parentRunId: "new-work",
      prompt: "Evaluate the risks of opening a different location.",
      conversationInputs: ["I approve handing the old budget to Agent Tài chính."],
      stateOptions: options,
    });
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "clarify",
      reasonCode: "handoff_confirmation_required",
    });
  });

  it("limits follow-up planning and verification to the proposed specialist", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts", "finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts", "finance"]);
    const assignments = [
      { agentId: "finance", task: "Evaluate the downside scenario after the contract review" },
    ];
    const response = routerJson({ confidence: 0.98, secondConfidence: 0, routes: assignments });
    queueCompletion(response);
    queueCompletion(response);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "follow-up-scope",
      parentRunId: "follow-up",
      prompt:
        "Nhờ Agent Hợp đồng và Agent Tài chính phân tích song song, sau đó nhờ Agent Tài chính phân tích kịch bản xấu.",
      proposedAssignments: assignments,
      stateOptions: options,
    });
    expect(completionMocks.complete).toHaveBeenCalledTimes(2);
    for (const [request] of completionMocks.complete.mock.calls) {
      const payload = JSON.parse(request.context.messages[0].content);
      expect(payload.candidates.map((candidate: { agentId: string }) => candidate.agentId)).toEqual(
        ["finance"],
      );
      expect(payload.proposedAssignments).toEqual(assignments);
    }
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn?.outcome).toBe(
      "delegate",
    );
  });

  it.each([
    {
      handling: "direct" as const,
      prompt: "Viết câu này ngắn hơn giúp mình: nhóm sẽ họp vào sáng mai.",
    },
    {
      handling: "knowledge" as const,
      prompt: "Nhân viên mới cần hoàn tất các bước gì trong tuần đầu?",
    },
  ])(
    "retains a $handling handling decision without creating a specialist plan",
    async ({ handling, prompt }) => {
      const options = stateOptions();
      const account = createEmployee(options, ["contracts"]);
      activePolicy(options);
      const config = configFor(account.id, ["contracts"]);
      queueCompletion(
        routerJson({
          handling,
          outcome: "local",
          confidence: 0.98,
          secondConfidence: 0,
          routes: [],
        }),
      );
      const turn = await prepareTurn({ config, accountId: account.id, options, prompt });
      expect(turn).toMatchObject({ handling, outcome: "local", agentNames: [] });
      expect(turn?.decisionId).toBeUndefined();
      expect(completionMocks.complete).toHaveBeenCalledTimes(1);
    },
  );

  it("retains bounded hybrid retrieval needs with the verified assignment", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    const decision = routerJson({
      handling: "hybrid",
      confidence: 0.98,
      secondConfidence: 0,
      routes: [
        {
          agentId: "contracts",
          task: "Review the advance terms against the current internal payment policy",
          knowledgeQueries: ["Current advance payment limits and required exceptions"],
        },
      ],
    });
    queueCompletion(decision);
    queueCompletion(decision);
    const turn = await prepareTurn({
      config,
      accountId: account.id,
      options,
      prompt:
        "Mức ứng trước 80% này có phù hợp quy định công ty không, và có rủi ro gì trước khi ký?",
    });
    expect(turn).toMatchObject({ outcome: "delegate", handling: "hybrid", planRevision: 1 });
    const consumed = consumeEnterpriseDelegationDecision({
      config,
      decisionId: turn?.decisionId ?? "",
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "session-ai",
      parentRunId: "run-ai",
      stateOptions: options,
    });
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes[0]).toMatchObject({
        assignmentId: expect.any(String),
        knowledgeQueries: ["Current advance payment limits and required exceptions"],
        requiredInputs: [],
      });
    }
  });

  it.each(["local", "clarify"] as const)(
    "keeps ordinary knowledge retrieval local when the router returns %s without a candidate",
    async (outcome) => {
      const options = stateOptions();
      const account = createEmployee(options, ["contracts"]);
      activePolicy(options);
      const config = configFor(account.id, ["contracts"]);
      queueCompletion(
        routerJson({
          outcome,
          confidence: 0.98,
          secondConfidence: 0,
          routes: [],
          question: "Please choose a specialist to read enterprise knowledge.",
        }),
      );
      const turn = await prepareTurn({
        config,
        accountId: account.id,
        options,
        prompt: "Tra cứu thời lượng onboarding trong tri thức doanh nghiệp, không gọi chuyên gia.",
      });
      expect(turn).toMatchObject({
        outcome: "local",
        agentNames: [],
        reasonCode: "router_no_candidate",
      });
      expect(turn?.decisionId).toBeUndefined();
      expect(turn?.instruction).not.toContain("choose a specialist");
      expect(completionMocks.complete).toHaveBeenCalledTimes(1);
    },
  );

  it("fails closed when router model preparation throws", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    completionMocks.prepare.mockRejectedValueOnce(new Error("auth unavailable"));

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "local", reasonCode: "router_unavailable" });
    expect(completionMocks.complete).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "not-json"],
    [
      "unknown fields",
      JSON.stringify({
        outcome: "delegate",
        confidence: 1,
        secondConfidence: 0,
        independent: true,
        question: "",
        routes: [],
        tool: "sessions_spawn",
      }),
    ],
  ])("fails closed for %s", async (_label, response) => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    queueCompletion(response);

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "local", reasonCode: "router_unavailable" });
  });

  it("accepts the exact confidence and margin boundary only after verifier agreement", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    const decision = routerJson({
      confidence: 0.9,
      secondConfidence: 0.75,
      routes: [{ agentId: "contracts", task: "Đánh giá rủi ro hợp đồng" }],
    });
    queueCompletion(decision);
    queueCompletion(decision);

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "delegate", source: "ai", reasonCode: "route_ready" });
    expect(completionMocks.complete).toHaveBeenCalledTimes(2);
  });

  it("asks instead of spawning when the margin is below the threshold", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    queueCompletion(
      routerJson({
        confidence: 0.9,
        secondConfidence: 0.751,
        routes: [{ agentId: "contracts", task: "Đánh giá hợp đồng" }],
      }),
    );

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "clarify", reasonCode: "router_ambiguous" });
    expect(completionMocks.complete).toHaveBeenCalledTimes(1);
  });

  it.each([
    { verification: { confidence: 0.89 }, reasonCode: "router_verifier_low_confidence" },
    { verification: { secondConfidence: 0.751 }, reasonCode: "router_verifier_low_margin" },
    { verification: { independent: false }, reasonCode: "router_verifier_dependent_tasks" },
    {
      verification: { outcome: "clarify" as const },
      reasonCode: "router_verifier_outcome_disagreed",
    },
    {
      verification: {
        routes: [
          { agentId: "finance", task: "Budget", missingRequiredInputIds: ["amount"] },
          { agentId: "hr", task: "Checklist" },
        ],
      },
      reasonCode: "router_verifier_input_unknown_missing_id",
    },
  ])("rejects unsafe verifier agreement: $reasonCode", async ({ verification, reasonCode }) => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance", "hr"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance", "hr"]);
    const routes = [
      { agentId: "finance", task: "Budget" },
      { agentId: "hr", task: "Checklist" },
    ];
    queueCompletion(routerJson({ routes }));
    queueCompletion(routerJson({ routes, ...verification }));
    expect(
      await prepareTurn({
        config,
        accountId: account.id,
        options,
        prompt: "Gọi Agent Tài chính và Agent Nhân sự cho hai phần độc lập",
      }),
    ).toMatchObject({ outcome: "clarify", reasonCode });
  });

  it("keeps the original task separate from the untrusted verifier proposal and preserves explicit consent", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["finance", "hr"]);
    activePolicy(options);
    const config = configFor(account.id, ["finance", "hr"], {
      finance: { handlingMode: "confirm_before_handoff" },
      hr: { handlingMode: "explicit_only" },
    });
    const decision = routerJson({
      routes: [
        { agentId: "finance", task: "Budget" },
        { agentId: "hr", task: "Checklist" },
      ],
    });
    queueCompletion(decision);
    queueCompletion(decision);
    const prompt = "Gọi Agent Tài chính và Agent Nhân sự cho hai phần độc lập";
    expect(await prepareTurn({ config, accountId: account.id, options, prompt })).toMatchObject({
      outcome: "delegate",
      source: "explicit",
    });
    const verification = completionMocks.complete.mock.calls[1]![0];
    expect(JSON.parse(verification.context.messages[0].content)).toMatchObject({
      prompt,
      proposedDecision: JSON.parse(decision),
    });
    expect(verification.context.systemPrompt).toContain("already handoff consent");
    expect(verification.context.systemPrompt).toContain("Independently verify");
  });

  it("asks when router and verifier select different Agents", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts", "finance"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts", "finance"]);
    queueCompletion(routerJson({ routes: [{ agentId: "contracts", task: "Đánh giá hợp đồng" }] }));
    queueCompletion(routerJson({ routes: [{ agentId: "finance", task: "Đánh giá tài chính" }] }));

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "clarify", reasonCode: "router_verifier_target_disagreed" });
  });

  it.each([
    {
      label: "confidence below the clarify threshold",
      agentIds: ["contracts"],
      response: routerJson({
        confidence: 0.699,
        secondConfidence: 0.1,
        routes: [{ agentId: "contracts", task: "Đánh giá hợp đồng" }],
      }),
      expected: { outcome: "local", reasonCode: "router_low_confidence" },
    },
    {
      label: "confidence between clarify and auto thresholds",
      agentIds: ["contracts"],
      response: routerJson({
        confidence: 0.89,
        secondConfidence: 0.2,
        routes: [{ agentId: "contracts", task: "Đánh giá hợp đồng" }],
      }),
      expected: { outcome: "clarify", reasonCode: "router_ambiguous" },
    },
    {
      label: "the model invents an Agent outside the candidate set",
      agentIds: ["contracts"],
      response: routerJson({
        confidence: 0.95,
        secondConfidence: 0.2,
        routes: [{ agentId: "invented-agent", task: "Đánh giá hợp đồng" }],
      }),
      expected: { outcome: "clarify", reasonCode: "router_route_unknown" },
    },
    {
      label: "multiple specialist tasks depend on each other",
      agentIds: ["contracts", "finance"],
      response: routerJson({
        confidence: 0.95,
        secondConfidence: 0.2,
        independent: false,
        routes: [
          { agentId: "contracts", task: "Đánh giá hợp đồng" },
          { agentId: "finance", task: "Dùng kết quả hợp đồng để tính ngân sách" },
        ],
      }),
      expected: { outcome: "clarify", reasonCode: "router_ambiguous" },
    },
    {
      label: "the model selects more than three implicit specialists",
      agentIds: ["contracts", "finance", "hr", "security"],
      response: routerJson({
        confidence: 0.95,
        secondConfidence: 0.2,
        routes: [
          { agentId: "contracts", task: "Đánh giá hợp đồng" },
          { agentId: "finance", task: "Đánh giá ngân sách" },
          { agentId: "hr", task: "Đánh giá nhân sự" },
          { agentId: "security", task: "Đánh giá bảo mật" },
        ],
      }),
      expected: { outcome: "clarify", reasonCode: "router_agent_limit" },
    },
  ])("does not spawn when $label", async ({ agentIds, expected, response }) => {
    const options = stateOptions();
    const account = createEmployee(options, agentIds);
    activePolicy(options);
    const config = configFor(account.id, agentIds);
    queueCompletion(response);

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject(expected);
    expect(completionMocks.complete).toHaveBeenCalledTimes(1);
  });

  it("merges two independent tasks for the same Agent into one child route", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    queueCompletion(
      routerJson({
        routes: [
          { agentId: "contracts", task: "Kiểm tra điều khoản phạt" },
          { agentId: "contracts", task: "Kiểm tra nghĩa vụ bảo mật" },
        ],
      }),
    );
    queueCompletion(
      routerJson({
        routes: [
          {
            agentId: "contracts",
            task: "Kiểm tra điều khoản phạt và nghĩa vụ bảo mật",
          },
        ],
      }),
    );

    const turn = await prepareTurn({
      config,
      accountId: account.id,
      options,
      prompt: "Tôi cần hai đánh giá",
    });
    const consumed = consumeEnterpriseDelegationDecision({
      decisionId: turn?.decisionId ?? "",
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "session-ai",
      parentRunId: "run-ai",
      config,
      stateOptions: options,
    });
    expect(consumed.ok).toBe(true);
    if (consumed.ok) {
      expect(consumed.decision.routes).toHaveLength(1);
      expect(consumed.decision.routes[0]?.task).toContain("điều khoản phạt");
      expect(consumed.decision.routes[0]?.task).toContain("nghĩa vụ bảo mật");
    }
  });

  it("allows three distinctly named independent specialists but refuses four", async () => {
    const options = stateOptions();
    const agentIds = ["contracts", "finance", "hr"];
    const account = createEmployee(options, [...agentIds, "security"]);
    activePolicy(options);
    const config = configFor(account.id, [...agentIds, "security"]);
    const routes = agentIds.map((agentId) => ({ agentId, task: `Phần việc ${agentId}` }));
    queueCompletion(routerJson({ routes }));
    queueCompletion(routerJson({ routes }));

    expect(
      await prepareTurn({
        config,
        accountId: account.id,
        options,
        prompt: "Gọi Agent Hợp đồng, Agent Tài chính và Agent Nhân sự cho ba phần độc lập",
      }),
    ).toMatchObject({
      outcome: "delegate",
      source: "explicit",
      agentNames: ["Agent Hợp đồng", "Agent Tài chính", "Agent Nhân sự"],
    });

    const secondConfig = configFor(account.id, [...agentIds, "security"]);
    queueCompletion(
      routerJson({ routes: [...routes, { agentId: "security", task: "Kiểm tra bảo mật" }] }),
    );
    expect(
      await prepareTurn({
        config: secondConfig,
        accountId: account.id,
        options,
        prompt: "Gọi Agent Hợp đồng, Agent Tài chính, Agent Nhân sự và Agent Bảo mật cho bốn phần",
      }),
    ).toMatchObject({ outcome: "clarify", reasonCode: "router_agent_limit" });
    expect(completionMocks.complete).toHaveBeenCalledTimes(3);
  });

  it("enforces implicit handling modes and negative examples on model output", async () => {
    const cases = [
      {
        overrides: { contracts: { handlingMode: "explicit_only" as const } },
        prompt: "Tôi cần tư vấn",
        reasonCode: "router_mode_disallowed",
        outcome: "clarify",
      },
      {
        overrides: { contracts: { handlingMode: "confirm_before_handoff" as const } },
        prompt: "Tôi cần tư vấn",
        reasonCode: "handoff_confirmation_required",
        outcome: "clarify",
      },
      {
        overrides: { contracts: { avoidWhen: ["không cần chuyên gia"] } },
        prompt: "Tôi không cần chuyên gia, chỉ muốn tham khảo",
        reasonCode: "router_avoid_rule",
        outcome: "local",
      },
    ];
    for (const [index, testCase] of cases.entries()) {
      const options = stateOptions();
      const account = createEmployee(options, ["contracts"]);
      activePolicy(options);
      const config = configFor(account.id, ["contracts"], testCase.overrides);
      queueCompletion(routerJson({ routes: [{ agentId: "contracts", task: "Tư vấn hợp đồng" }] }));
      expect(
        await prepareTurn({
          config,
          accountId: account.id,
          options,
          prompt: `${testCase.prompt} ${index}`,
        }),
      ).toMatchObject({ outcome: testCase.outcome, reasonCode: testCase.reasonCode });
      closeOpenClawStateDatabaseForTest();
    }
  });

  it.each([
    {
      label: "invented required input",
      maxDelegates: 3,
      reasonCode: "router_input_unknown_id",
      routes: [
        {
          agentId: "finance",
          task: "Đánh giá ngân sách 90 triệu",
          resolvedRequiredInputs: [{ id: "amount", value: "90 triệu", sourceText: "90 triệu" }],
        },
      ],
    },
    {
      label: "unknown specialist alongside Finance",
      maxDelegates: 3,
      reasonCode: "router_route_unknown",
      routes: [
        { agentId: "finance", task: "Đánh giá ngân sách" },
        { agentId: "invented-agent", task: "Đánh giá hợp đồng" },
      ],
    },
    {
      label: "required input source not supplied by the user",
      maxDelegates: 3,
      reasonCode: "router_input_source_not_user",
      requiredInputs: [{ id: "amount", label: "Budget", question: "What is the budget?" }],
      routes: [
        {
          agentId: "finance",
          task: "Review the supplied budget",
          resolvedRequiredInputs: [
            { id: "amount", value: "private-value", sourceText: "private-provider-source" },
          ],
        },
      ],
    },
    {
      label: "conflicting values for the same required input",
      maxDelegates: 3,
      reasonCode: "router_input_conflicting_duplicate",
      requiredInputs: [{ id: "amount", label: "Budget", question: "What is the budget?" }],
      routes: [
        {
          agentId: "finance",
          task: "Review the supplied budget",
          resolvedRequiredInputs: [
            { id: "amount", value: "90 million", sourceText: "90 triệu" },
            { id: "amount", value: "900 million", sourceText: "90 triệu" },
          ],
        },
      ],
    },
    {
      label: "invented missing input",
      maxDelegates: 3,
      reasonCode: "router_input_unknown_missing_id",
      routes: [
        {
          agentId: "finance",
          task: "Review the supplied budget",
          missingRequiredInputIds: ["private-invented-field"],
        },
      ],
    },
    {
      label: "unnamed explicit-only specialist alongside Finance",
      maxDelegates: 3,
      reasonCode: "router_mode_disallowed",
      routes: [
        { agentId: "finance", task: "Đánh giá ngân sách" },
        { agentId: "hr", task: "Đánh giá nhân sự" },
      ],
    },
    {
      label: "handoff limit exceeded alongside Finance",
      maxDelegates: 1,
      reasonCode: "router_agent_limit",
      routes: [
        { agentId: "finance", task: "Đánh giá ngân sách" },
        { agentId: "contracts", task: "Đánh giá hợp đồng" },
      ],
    },
  ])("does not offer consent to an inadmissible plan: $label", async (testCase) => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts", "finance", "hr"]);
    activePolicy(options, testCase.maxDelegates);
    const config = configFor(account.id, ["contracts", "finance", "hr"], {
      finance: {
        handlingMode: "confirm_before_handoff",
        requiredInputs: "requiredInputs" in testCase ? testCase.requiredInputs : [],
      },
      hr: { handlingMode: "explicit_only" },
    });
    queueCompletion(
      routerJson({
        routes: testCase.routes,
        question: "Bạn có đồng ý giao cho các chuyên gia không?",
      }),
    );
    const turn = await prepareTurn({
      config,
      accountId: account.id,
      options,
      prompt: "Mình cần xem các rủi ro của phương án ngân sách 90 triệu và kế hoạch triển khai.",
    });
    expect(turn).toMatchObject({ outcome: "clarify", reasonCode: testCase.reasonCode });
    expect(turn?.clarificationQuestion).not.toContain("Bạn có đồng ý");
    expect(turn?.decisionId).toBeUndefined();
    expect(turn?.planId).toBeUndefined();
    const events = listEnterpriseDelegationEvents({}, options).events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ reasonCode: testCase.reasonCode, childRunIds: [] });
    const serialized = JSON.stringify(events);
    for (const route of testCase.routes) {
      expect(serialized).not.toContain(route.task);
      if ("resolvedRequiredInputs" in route) {
        for (const input of route.resolvedRequiredInputs) {
          expect(serialized).not.toContain(input.value);
          expect(serialized).not.toContain(input.sourceText);
        }
      }
    }
    expect(serialized).not.toContain("private-invented-field");
    expect(completionMocks.complete).toHaveBeenCalledTimes(1);

    queueCompletion(routerJson({ outcome: "local", routes: [] }));
    const answer = await prepareTurn({
      config,
      accountId: account.id,
      options,
      prompt: "Ừ, bạn xem giúp mình nhé.",
    });
    expect(answer?.decisionId).toBeUndefined();
    const nextRequest = completionMocks.complete.mock.calls[1]![0];
    expect(JSON.parse(nextRequest.context.messages[0].content)).not.toHaveProperty(
      "pendingClarification",
    );
  });

  it.each([
    { prompt: "Nhân viên mới cần làm gì trong tuần đầu?", expectedIds: ["finance"] },
    {
      prompt: "Gọi Agent Nhân sự giúp mình xem lại kế hoạch tuyển dụng.",
      expectedIds: ["finance", "hr"],
    },
  ])(
    "offers explicit-only candidates only when named: $prompt",
    async ({ prompt, expectedIds }) => {
      const options = stateOptions();
      const account = createEmployee(options, ["finance", "hr"]);
      activePolicy(options);
      const config = configFor(account.id, ["finance", "hr"], {
        hr: { handlingMode: "explicit_only" },
      });
      queueCompletion(routerJson({ outcome: "local", routes: [] }));
      await prepareTurn({ config, accountId: account.id, options, prompt });
      const request = completionMocks.complete.mock.calls[0]![0];
      const payload = JSON.parse(request.context.messages[0].content);
      expect(
        payload.candidates.map((candidate: { agentId: string }) => candidate.agentId).toSorted(),
      ).toEqual(expectedIds);
    },
  );

  it("fails closed when the router provider throws", async () => {
    const options = stateOptions();
    const account = createEmployee(options, ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, ["contracts"]);
    completionMocks.complete.mockRejectedValueOnce(new Error("router timeout"));

    expect(
      await prepareTurn({ config, accountId: account.id, options, prompt: "Tôi cần tư vấn" }),
    ).toMatchObject({ outcome: "local", reasonCode: "router_unavailable" });
  });
});
