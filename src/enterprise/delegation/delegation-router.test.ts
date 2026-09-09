import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount, getEnterpriseAccountById } from "../accounts/account-store.js";
import { applyEnterpriseAccessChanges } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  consumeEnterpriseDelegationDecision,
  invalidateEnterpriseDelegationRouterRuntimeState,
  prepareEnterpriseDelegationTurn,
  readEnterpriseDelegationDecisionRoutes,
} from "./delegation-router.js";
import { writeEnterpriseDelegationPolicy } from "./delegation-store.js";

const tempDirectories: string[] = [];
const completion = vi.hoisted(() => ({ prepare: vi.fn(), complete: vi.fn() }));
vi.mock("../../agents/simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: completion.prepare,
  completeWithPreparedSimpleCompletionModel: completion.complete,
}));

function routerResponse(overrides: Record<string, unknown> = {}) {
  const routes = (overrides.routes ?? [
    {
      agentId: "contracts",
      task: "Review the requested contract terms",
      missingRequiredInputIds: [],
    },
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
            ? { handoffConsent: overrides.continuation === "confirm" ? "approved" : "unchanged" }
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

beforeEach(() => {
  completion.prepare
    .mockReset()
    .mockResolvedValue({ model: { maxTokens: 4096 }, auth: { apiKey: "test" } });
  completion.complete.mockReset().mockResolvedValue(routerResponse());
});

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-router-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function requireDecisionId(config: OpenClawConfig): string {
  const decisionId =
    readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn?.decisionId;
  if (!decisionId) {
    throw new Error("Expected the router to issue a decision for this test request");
  }
  return decisionId;
}

function activePolicy(options: ReturnType<typeof stateOptions>, rollout: "shadow" | "on" = "on") {
  return writeEnterpriseDelegationPolicy(
    0,
    {
      rollout,
      routerModel: "test/router-model",
      autoThreshold: 0.9,
      clarifyThreshold: 0.7,
      minimumMargin: 0.15,
      maxDelegatesPerTurn: 3,
      eventRetentionDays: 90,
    },
    options,
  );
}

function configFor(
  accountId: string,
  options: {
    required?: boolean;
    handlingMode?: "auto_when_certain" | "confirm_before_handoff";
  } = {},
): OpenClawConfig {
  const config: OpenClawConfig = {
    agents: {
      entries: {
        contracts: {
          name: "Agent Hợp đồng",
          description:
            "Chuyên kiểm tra điều khoản, rủi ro và nghĩa vụ trong hợp đồng doanh nghiệp.",
          delegationTarget: {
            status: "active",
            aliases: ["chuyên gia hợp đồng"],
            handlingMode: options.handlingMode ?? "auto_when_certain",
            useWhen: [
              "kiểm tra điều khoản phạt trong hợp đồng",
              "đánh giá rủi ro trước khi ký hợp đồng",
            ],
            avoidWhen: ["không cần kiểm tra hợp đồng"],
            requiredInputs: options.required
              ? [
                  {
                    id: "input-contract-code",
                    label: "Mã hồ sơ",
                    question: "Bạn cần kiểm tra hợp đồng số nào?",
                  },
                ]
              : [],
          },
        },
        finance: {
          name: "Agent Tài chính",
          description: "Chuyên phân tích chi phí, ngân sách và số liệu tài chính doanh nghiệp.",
          delegationTarget: {
            status: "active",
            aliases: ["chuyên gia tài chính"],
            handlingMode: "auto_when_certain",
            useWhen: ["phân tích chênh lệch ngân sách tháng", "kiểm tra số liệu dòng tiền quý"],
            avoidWhen: [],
            requiredInputs: [],
          },
        },
      },
    },
  };
  return markGatewayRequestScopedRuntimeConfig(config, {
    enterpriseDelegation: {
      accountId,
      personalAgentId: `personal-${accountId}`,
      specialists: [],
    },
  });
}

function createEmployee(
  options: ReturnType<typeof stateOptions>,
  username: string,
  agents: string[],
) {
  return createEnterpriseAccount(
    {
      username,
      displayName: username,
      passwordHash: "test-hash",
      role: "employee",
      initialEntitlements: agents.map((agentId) => ({
        resourceType: "agent" as const,
        resourceId: sharedAgentResourceKey(agentId),
        effect: "allow" as const,
      })),
    },
    options,
  );
}

afterEach(() => {
  vi.useRealTimers();
  invalidateEnterpriseDelegationRouterRuntimeState();
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegation router", () => {
  it("routes an explicitly named assigned Agent without a second handoff confirmation", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "explicit.employee", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id);

    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-explicit",
      parentRunId: "run-explicit",
      prompt: "Hãy gọi Agent Hợp đồng để kiểm tra tài liệu này",
      stateOptions: options,
    });

    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "delegate",
      source: "explicit",
      agentNames: ["Agent Hợp đồng"],
      reasonCode: "route_ready",
    });
  });

  it("blocks a named Agent that belongs to another account", async () => {
    const options = stateOptions();
    const accountA = createEmployee(options, "isolation.a", ["contracts"]);
    const accountB = createEmployee(options, "isolation.b", []);
    activePolicy(options);
    const configA = configFor(accountA.id);
    const configB = configFor(accountB.id);

    await Promise.all([
      prepareEnterpriseDelegationTurn({
        config: configA,
        agentId: `personal-${accountA.id}`,
        sessionKey: "session-a",
        parentRunId: "run-a",
        prompt: "Gọi Agent Hợp đồng",
        stateOptions: options,
      }),
      prepareEnterpriseDelegationTurn({
        config: configB,
        agentId: `personal-${accountB.id}`,
        sessionKey: "session-b",
        parentRunId: "run-b",
        prompt: "Gọi Agent Hợp đồng",
        stateOptions: options,
      }),
    ]);

    expect(readGatewayRequestRuntimeMetadata(configA)?.enterpriseDelegation?.turn?.outcome).toBe(
      "delegate",
    );
    expect(readGatewayRequestRuntimeMetadata(configB)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "blocked",
      reasonCode: "explicit_agent_not_assigned",
    });
  });

  it("blocks an unassigned named Agent discovered through the trusted full catalog", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "isolation.catalog", []);
    activePolicy(options);
    const config = markGatewayRequestScopedRuntimeConfig(
      { agents: { entries: { [`personal-${account.id}`]: {} } } },
      {
        enterpriseDelegation: {
          accountId: account.id,
          personalAgentId: `personal-${account.id}`,
          specialists: [],
          resolveExplicitAgentIds: (prompt) =>
            prompt.includes("Agent Hợp đồng") ? ["contracts"] : [],
        },
      },
    );

    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-catalog",
      parentRunId: "run-catalog",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });

    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "blocked",
      reasonCode: "explicit_agent_not_assigned",
    });
  });

  it("asks the exact configured question when required input is missing", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "required.employee", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, { required: true });

    completion.complete.mockResolvedValueOnce(
      routerResponse({
        outcome: "clarify",
        routes: [
          {
            agentId: "contracts",
            task: "Review contract penalties",
            missingRequiredInputIds: ["input-contract-code"],
          },
        ],
      }),
    );

    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-required",
      parentRunId: "run-required",
      prompt: "Nhờ Agent Hợp đồng kiểm tra điều khoản phạt",
      stateOptions: options,
    });

    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
      outcome: "clarify",
      reasonCode: "required_input_missing:input-contract-code",
      instruction: expect.stringContaining("Bạn cần kiểm tra hợp đồng số nào?"),
    });

    const followUpConfig = configFor(account.id, { required: true });
    const answerResponse = routerResponse({
      continuation: "answer",
      routes: [
        {
          agentId: "contracts",
          task: "Review HD-42 contract penalties",
          missingRequiredInputIds: [],
          resolvedRequiredInputs: [
            { id: "input-contract-code", value: "HD-42", sourceText: "HD-42" },
          ],
        },
      ],
    });
    completion.complete.mockResolvedValueOnce(answerResponse);
    completion.complete.mockResolvedValueOnce(answerResponse);
    await prepareEnterpriseDelegationTurn({
      config: followUpConfig,
      agentId: `personal-${account.id}`,
      sessionKey: "session-required",
      parentRunId: "run-required-answer",
      prompt: "HD-42",
      stateOptions: options,
    });
    expect(
      readGatewayRequestRuntimeMetadata(followUpConfig)?.enterpriseDelegation?.turn,
    ).toMatchObject({
      outcome: "delegate",
      source: "explicit",
      reasonCode: "route_ready",
    });
  });

  it("does not reuse a previous routing directive for a new session", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "fresh.turn.employee", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id, { required: true });

    completion.complete.mockResolvedValueOnce(
      routerResponse({
        outcome: "clarify",
        routes: [
          {
            agentId: "contracts",
            task: "Review contract penalties",
            missingRequiredInputIds: ["input-contract-code"],
          },
        ],
      }),
    );

    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-first",
      parentRunId: "run-first",
      prompt: "Kiểm tra điều khoản phạt trong hợp đồng",
      stateOptions: options,
    });
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn?.outcome).toBe(
      "clarify",
    );

    completion.complete.mockResolvedValueOnce(routerResponse({ outcome: "local", routes: [] }));
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-second",
      parentRunId: "run-second",
      prompt: "Hôm nay là thứ mấy?",
      stateOptions: options,
    });

    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).not.toMatchObject(
      {
        reasonCode: "required_input_missing:input-contract-code",
      },
    );
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn?.outcome).toBe(
      "local",
    );
    expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.request).toEqual({
      sessionKey: "session-second",
      parentRunId: "run-second",
    });
  });

  it("semantically verifies a rule match and respects confirm-before-handoff and shadow mode", async () => {
    const confirmOptions = stateOptions();
    const confirmAccount = createEmployee(confirmOptions, "confirm.employee", ["contracts"]);
    activePolicy(confirmOptions);
    const confirmConfig = configFor(confirmAccount.id, {
      handlingMode: "confirm_before_handoff",
    });
    await prepareEnterpriseDelegationTurn({
      config: confirmConfig,
      agentId: `personal-${confirmAccount.id}`,
      sessionKey: "session-confirm",
      parentRunId: "run-confirm",
      prompt: "Tôi cần kiểm tra điều khoản phạt trong hợp đồng ngay hôm nay",
      stateOptions: confirmOptions,
    });
    expect(
      readGatewayRequestRuntimeMetadata(confirmConfig)?.enterpriseDelegation?.turn,
    ).toMatchObject({
      outcome: "clarify",
      source: "rule",
      reasonCode: "handoff_confirmation_required",
    });

    closeOpenClawStateDatabaseForTest();
    const shadowOptions = stateOptions();
    const shadowAccount = createEmployee(shadowOptions, "shadow.employee", ["contracts"]);
    activePolicy(shadowOptions, "shadow");
    const shadowConfig = configFor(shadowAccount.id);
    await prepareEnterpriseDelegationTurn({
      config: shadowConfig,
      agentId: `personal-${shadowAccount.id}`,
      sessionKey: "session-shadow",
      parentRunId: "run-shadow",
      prompt: "Tôi cần kiểm tra điều khoản phạt trong hợp đồng ngay hôm nay",
      stateOptions: shadowOptions,
    });
    expect(
      readGatewayRequestRuntimeMetadata(shadowConfig)?.enterpriseDelegation?.turn,
    ).toMatchObject({
      outcome: "shadow",
      source: "rule",
      reasonCode: "shadow_would_delegate",
    });
  });

  it("rejects cross-account use and revoke between decision and spawn", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "decision.employee", ["contracts"]);
    const other = createEmployee(options, "decision.other", []);
    activePolicy(options);
    const config = configFor(account.id);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-decision",
      parentRunId: "run-decision",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });
    const decisionId = requireDecisionId(config);
    expect(
      consumeEnterpriseDelegationDecision({
        decisionId,
        accountId: other.id,
        personalAgentId: `personal-${other.id}`,
        sessionKey: "session-decision",
        parentRunId: "run-decision",
        config,
        stateOptions: options,
      }),
    ).toMatchObject({ ok: false, reasonCode: "decision_scope_mismatch" });

    const liveAccount = getEnterpriseAccountById(account.id, options)!;
    applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "agent",
          resourceId: sharedAgentResourceKey("contracts"),
          effect: null,
        },
      ],
      { [account.id]: liveAccount.policyRevision },
      options,
    );
    expect(
      consumeEnterpriseDelegationDecision({
        decisionId,
        accountId: account.id,
        personalAgentId: `personal-${account.id}`,
        sessionKey: "session-decision",
        parentRunId: "run-decision",
        config,
        stateOptions: options,
      }),
    ).toMatchObject({ ok: false, reasonCode: "decision_policy_changed" });
  });

  it("binds a decision to the exact session and run, consumes it once, and rejects replay", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "decision.scope", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-scope",
      parentRunId: "run-scope",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });
    const decisionId = requireDecisionId(config);
    const base = {
      decisionId,
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "session-scope",
      parentRunId: "run-scope",
      config,
      stateOptions: options,
    };

    expect(
      consumeEnterpriseDelegationDecision({ ...base, sessionKey: "different-session" }),
    ).toEqual({ ok: false, reasonCode: "decision_scope_mismatch" });
    expect(consumeEnterpriseDelegationDecision({ ...base, parentRunId: "different-run" })).toEqual({
      ok: false,
      reasonCode: "decision_scope_mismatch",
    });
    expect(consumeEnterpriseDelegationDecision(base)).toMatchObject({ ok: true });
    expect(consumeEnterpriseDelegationDecision(base)).toEqual({
      ok: false,
      reasonCode: "decision_replayed",
    });
  });

  it("reads only the bounded approved routes and does not consume the decision", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "decision.read", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-read",
      parentRunId: "run-read",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });
    const decisionId = requireDecisionId(config);
    const base = {
      decisionId,
      accountId: account.id,
      personalAgentId: `personal-${account.id}`,
      sessionKey: "session-read",
      parentRunId: "run-read",
      config,
      stateOptions: options,
    };

    expect(readEnterpriseDelegationDecisionRoutes(base)).toEqual({
      ok: true,
      routes: [
        {
          agentId: "contracts",
          agentName: "Agent Hợp đồng",
          task: "Review the requested contract terms",
        },
      ],
    });
    expect(consumeEnterpriseDelegationDecision(base)).toMatchObject({ ok: true });
  });

  it("expires an unused decision after its five-minute lifetime", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-03T00:00:00.000Z"));
    const options = stateOptions();
    const account = createEmployee(options, "decision.expired", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-expired",
      parentRunId: "run-expired",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });
    const decisionId = requireDecisionId(config);
    vi.setSystemTime(new Date("2026-09-03T00:05:00.001Z"));

    expect(
      consumeEnterpriseDelegationDecision({
        decisionId,
        accountId: account.id,
        personalAgentId: `personal-${account.id}`,
        sessionKey: "session-expired",
        parentRunId: "run-expired",
        config,
        stateOptions: options,
      }),
    ).toEqual({ ok: false, reasonCode: "decision_expired" });
  });

  it("invalidates unused decisions immediately for emergency-off", async () => {
    const options = stateOptions();
    const account = createEmployee(options, "decision.off", ["contracts"]);
    activePolicy(options);
    const config = configFor(account.id);
    await prepareEnterpriseDelegationTurn({
      config,
      agentId: `personal-${account.id}`,
      sessionKey: "session-off",
      parentRunId: "run-off",
      prompt: "Gọi Agent Hợp đồng",
      stateOptions: options,
    });
    const decisionId = requireDecisionId(config);

    expect(invalidateEnterpriseDelegationRouterRuntimeState().decisions).toBeGreaterThan(0);
    expect(
      consumeEnterpriseDelegationDecision({
        decisionId,
        accountId: account.id,
        personalAgentId: `personal-${account.id}`,
        sessionKey: "session-off",
        parentRunId: "run-off",
        config,
        stateOptions: options,
      }),
    ).toEqual({ ok: false, reasonCode: "decision_not_found" });
  });
});
