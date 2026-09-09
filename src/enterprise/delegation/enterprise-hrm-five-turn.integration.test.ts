import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSubagentRunForTests,
  resetSubagentRegistryForTests,
} from "../../agents/subagents/registry/subagent-registry.test-helpers.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
  type GatewayEnterpriseDelegationTurn,
} from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  consumeEnterpriseDelegationDecision,
  prepareEnterpriseDelegationTurn,
  recordEnterpriseDelegationSpawn,
} from "./delegation-router.js";
import {
  listEnterpriseDelegationEvents,
  writeEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const completion = vi.hoisted(() => ({
  prepare: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("../../agents/simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: completion.prepare,
  completeWithPreparedSimpleCompletionModel: completion.complete,
}));

type RouterReply = {
  task: string;
  handling?: "specialist" | "hybrid";
  knowledgeQueries?: string[];
};

type TraceTurn = {
  label: string;
  result: GatewayEnterpriseDelegationTurn | undefined;
};

let directory: string;

function stateOptions() {
  return { path: join(directory, "state.sqlite") };
}

function routerReply({ task, handling = "specialist", knowledgeQueries = [] }: RouterReply) {
  return {
    stopReason: "stop",
    content: [
      {
        type: "text",
        text: JSON.stringify({
          outcome: "delegate",
          handling,
          confidence: 0.99,
          secondConfidence: 0.01,
          independent: true,
          question: "",
          routes: [
            {
              agentId: "hrm",
              task,
              missingRequiredInputIds: [],
              resolvedRequiredInputs: [],
              knowledgeQueries,
            },
          ],
        }),
      },
    ],
  };
}

function queueRouterDecision(reply: RouterReply): void {
  // The router deliberately performs two model passes for a new delegation:
  // proposal and independent verification.
  completion.complete.mockResolvedValueOnce(routerReply(reply));
  completion.complete.mockResolvedValueOnce(routerReply(reply));
}

function configFor(accountId: string): OpenClawConfig {
  return markGatewayRequestScopedRuntimeConfig(
    {
      agents: {
        entries: {
          hrm: {
            name: "HRM",
            description: "Tra cứu dữ liệu nhân sự trực tiếp từ hệ thống HRM.",
            delegationTarget: {
              status: "active",
              aliases: ["hrm"],
              handlingMode: "auto_when_certain",
              useWhen: [
                "tra cứu danh sách nhân viên",
                "tra cứu bếp trưởng",
                "danh sách nhân sự toàn hệ thống",
              ],
              avoidWhen: [],
              requiredInputs: [],
            },
          },
        },
      },
    } satisfies OpenClawConfig,
    {
      enterpriseDelegation: {
        accountId,
        personalAgentId: `personal-${accountId}`,
        specialists: [],
      },
    },
  );
}

describe("Enterprise HRM retry and scope trace", () => {
  beforeEach(() => {
    resetSubagentRegistryForTests({ persist: false });
    directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-hrm-trace-"));
    completion.prepare.mockReset().mockResolvedValue({
      model: { maxTokens: 4096 },
      auth: { apiKey: "test" },
    });
    completion.complete.mockReset();
  });

  afterEach(() => {
    resetSubagentRegistryForTests({ persist: false });
    closeOpenClawStateDatabaseForTest();
    rmSync(directory, { recursive: true, force: true });
  });

  it("keeps retry/recheck/scope expansion on HRM, makes summary local, and never uses Knowledge", async () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "employee.hrm.trace",
        displayName: "HRM Trace Employee",
        passwordHash: "test-hash",
        role: "employee",
        personalAgentEnabled: true,
        initialEntitlements: [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("hrm"),
            effect: "allow",
          },
        ],
      },
      options,
    );
    writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: "test/router",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 1,
        eventRetentionDays: 90,
      },
      options,
    );
    const sessionKey = "agent:personal-hrm-trace:hrm-five-turn";
    let runNumber = 0;
    const trace: TraceTurn[] = [];
    const toolTrace: Array<{ label: string; tool: string; agentId?: string }> = [];

    async function turn(
      label: string,
      prompt: string,
      input: {
        conversationResults?: readonly string[];
        contextualPlanning?: boolean;
      } = {},
    ) {
      const config = configFor(account.id);
      await prepareEnterpriseDelegationTurn({
        config,
        agentId: `personal-${account.id}`,
        sessionKey,
        parentRunId: `hrm-trace-run-${++runNumber}`,
        prompt,
        conversationResults: input.conversationResults,
        contextualPlanning: input.contextualPlanning,
        stateOptions: options,
      });
      const result = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn;
      trace.push({ label, result });
      return {
        config,
        result,
        consume: () =>
          consumeEnterpriseDelegationDecision({
            config,
            decisionId: result?.decisionId ?? "",
            accountId: account.id,
            personalAgentId: `personal-${account.id}`,
            sessionKey,
            parentRunId: `hrm-trace-run-${runNumber}`,
            stateOptions: options,
          }),
      };
    }

    queueRouterDecision({ task: "Tra cứu danh sách nhân viên Văn phòng tổng từ HRM." });
    const initial = await turn("initial", "Tra cứu danh sách nhân viên Văn phòng tổng");
    expect(initial.result).toMatchObject({
      outcome: "delegate",
      source: "rule",
      reasonCode: "route_ready",
      agentNames: ["HRM"],
    });
    const initialDecision = initial.consume();
    expect(initialDecision.ok).toBe(true);
    if (!initialDecision.ok) {
      throw new Error(`initial HRM decision was rejected: ${initialDecision.reasonCode}`);
    }
    const initialRoute = initialDecision.decision.routes[0]!;
    expect(initialRoute.agentId).toBe("hrm");
    expect(initialRoute.knowledgeQueries).toEqual([]);
    recordEnterpriseDelegationSpawn({
      decision: initialDecision.decision,
      childRunIds: ["hrm-child-initial"],
      outcome: "failed",
      reasonCode: "delegate_partial_failure",
      latencyMs: 1,
      stateOptions: options,
    });
    addSubagentRunForTests({
      runId: "hrm-child-initial",
      childSessionKey: "agent:hrm:subagent:hrm-child-initial",
      requesterSessionKey: sessionKey,
      requesterAgentId: `personal-${account.id}`,
      requesterTurnRunId: "hrm-trace-run-1",
      task:
        "Complete only the assignedTask.\n\n" +
        JSON.stringify({
          assignedTask: initialRoute.task,
          authorizedRequest: initialDecision.decision.prompt,
        }),
      execution: {
        status: "terminal",
        endedAt: Date.now(),
        outcome: { status: "error", error: "CONNECT_TIMEOUT" },
      },
    });
    toolTrace.push({ label: "initial", tool: "enterprise_delegate", agentId: "hrm" });

    const retry = await turn("retry", "thử lại cho tôi nhé", {
      contextualPlanning: true,
      conversationResults: ["Lần HRM trước chưa hoàn tất."],
    });
    expect(retry.result).toMatchObject({
      outcome: "delegate",
      source: "rule",
      reasonCode: "route_ready",
      agentNames: ["HRM"],
    });
    const retryDecision = retry.consume();
    expect(retryDecision.ok).toBe(true);
    if (!retryDecision.ok) {
      throw new Error(`HRM retry decision was rejected: ${retryDecision.reasonCode}`);
    }
    expect(retryDecision.decision.routes).toEqual([
      expect.objectContaining({ agentId: "hrm", task: initialRoute.task, knowledgeQueries: [] }),
    ]);
    toolTrace.push({ label: "retry", tool: "enterprise_delegate", agentId: "hrm" });

    const recheck = await turn("recheck", "bạn có chắc không?", {
      contextualPlanning: true,
      conversationResults: ["Lần HRM trước chưa hoàn tất."],
    });
    expect(recheck.result).toMatchObject({
      outcome: "delegate",
      source: "rule",
      reasonCode: "route_ready",
      agentNames: ["HRM"],
    });
    const recheckDecision = recheck.consume();
    expect(recheckDecision.ok).toBe(true);
    if (!recheckDecision.ok) {
      throw new Error(`HRM recheck decision was rejected: ${recheckDecision.reasonCode}`);
    }
    expect(recheckDecision.decision.routes).toEqual([
      expect.objectContaining({ agentId: "hrm", task: initialRoute.task, knowledgeQueries: [] }),
    ]);
    toolTrace.push({ label: "recheck", tool: "enterprise_delegate", agentId: "hrm" });

    queueRouterDecision({ task: "Tra cứu danh sách bếp trưởng của toàn hệ thống từ HRM." });
    const expansion = await turn(
      "scope-expansion",
      "bạn có chắc k ?. tôi nhớ nhiều hơn, kiểm tra toàn hệ thống nhé",
      {
        contextualPlanning: true,
        conversationResults: ["Lần trước mới kiểm tra phạm vi Văn phòng tổng."],
      },
    );
    expect(expansion.result).toMatchObject({
      outcome: "delegate",
      source: "ai",
      reasonCode: "route_ready",
      agentNames: ["HRM"],
    });
    const expansionDecision = expansion.consume();
    expect(expansionDecision.ok).toBe(true);
    if (!expansionDecision.ok) {
      throw new Error(`scope expansion decision was rejected: ${expansionDecision.reasonCode}`);
    }
    expect(expansionDecision.decision.routes).toEqual([
      expect.objectContaining({
        agentId: "hrm",
        task: expect.stringContaining("toàn hệ thống"),
        knowledgeQueries: [],
      }),
    ]);
    toolTrace.push({ label: "scope-expansion", tool: "enterprise_delegate", agentId: "hrm" });

    const summary = await turn("summary", "tóm tắt kết quả cho tôi", {
      contextualPlanning: true,
      conversationResults: ["HRM đã trả kết quả tra cứu nhân sự."],
    });
    expect(summary.result).toMatchObject({
      outcome: "local",
      reasonCode: "router_contextual_planning",
      agentNames: [],
    });
    expect(summary.consume()).toEqual({ ok: false, reasonCode: "decision_not_found" });
    toolTrace.push({ label: "summary", tool: "local_summary" });

    const delegatedTurns = trace.filter((entry) => entry.result?.outcome === "delegate");
    expect(delegatedTurns.map((entry) => entry.result?.agentNames)).toEqual([
      ["HRM"],
      ["HRM"],
      ["HRM"],
      ["HRM"],
    ]);
    expect(trace.find((entry) => entry.label === "summary")?.result?.outcome).toBe("local");
    expect(toolTrace.filter((entry) => entry.tool === "enterprise_knowledge_search")).toEqual([]);
    expect(
      toolTrace.every(
        (entry) => entry.tool === "enterprise_delegate" || entry.tool === "local_summary",
      ),
    ).toBe(true);

    const persisted = listEnterpriseDelegationEvents({}, options).events;
    expect(
      persisted.some(
        (event) =>
          event.outcome === "failed" &&
          event.reasonCode === "delegate_partial_failure" &&
          event.sharedAgentIds.includes("hrm") &&
          event.childRunIds.includes("hrm-child-initial"),
      ),
    ).toBe(true);
  });
});
