/**
 * Real router admission -> canonical spawn -> SQLite registry/settlement.
 * Only provider completion and Gateway transport are replaced. Capturing a
 * launch here proves the trusted child boundary, not child model sampling.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectDefined } from "@openclaw/normalization-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, clearRuntimeConfigSnapshot } from "../../../config/config.js";
import { setRuntimeConfigSnapshot } from "../../../config/runtime-snapshot.js";
import {
  loadSessionEntry,
  readSessionTranscriptMessageEvents,
} from "../../../config/sessions/session-accessor.js";
import type { OpenClawConfig } from "../../../config/types.openclaw.js";
import { createEnterpriseAccount } from "../../../enterprise/accounts/account-store.js";
import * as delegationRouter from "../../../enterprise/delegation/delegation-router.js";
import { readEnterpriseDelegationDecisionRoutes } from "../../../enterprise/delegation/delegation-router.js";
import { writeEnterpriseDelegationPolicy } from "../../../enterprise/delegation/delegation-store.js";
import { sharedAgentResourceKey } from "../../../enterprise/entitlements/resource-keys.js";
import type { AgentRuntimeIdentity } from "../../../gateway/agent-runtime-identity-token.js";
import { readInProcessAgentRuntimeIdentity } from "../../../gateway/in-process-agent-runtime-identity.js";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../../gateway/request-runtime-config.js";
import type { dispatchGatewayMethodInProcess } from "../../../gateway/server-plugins.js";
import {
  resetGatewayWorkAdmission,
  tryBeginGatewayRootWorkAdmission,
} from "../../../process/gateway-work-admission.js";
import { createUserTurnTranscriptRecorder } from "../../../sessions/user-turn-transcript.js";
import { closeOpenClawStateDatabaseForTest } from "../../../state/openclaw-state-db.js";
import { resetDetachedTaskLifecycleRuntimeForTests } from "../../../tasks/detached-task-runtime.test-support.js";
import { captureEnv, setTestEnvValue } from "../../../test-utils/env.js";
import { prepareSystemAgentRunAdmission } from "../../admitted-run-context.js";
import { getEnterpriseDelegationRuntime } from "../../enterprise-delegation-runtime.js";
import { createContextEngineLogicalTurnLease } from "../../harness/context-engine-logical-turn.js";
import { AuthStorage, ModelRegistry } from "../../sessions/index.js";
import { restoreSubagentRunsFromDisk } from "../../subagents/registry/subagent-registry-state.js";
import {
  markRequesterTurnYielded,
  settleRequesterAfterSessionSpawns,
} from "../../subagents/registry/subagent-registry.js";
import { writeSubagentSessionEntry } from "../../subagents/registry/subagent-registry.persistence.test-support.js";
import { loadSubagentRegistryFromSqlite } from "../../subagents/registry/subagent-registry.store.sqlite.js";
import { resetSubagentRegistryForTests } from "../../subagents/registry/subagent-registry.test-helpers.js";
import type { SubagentRunRecord } from "../../subagents/registry/subagent-registry.types.js";
import { testing as spawnTesting } from "../../subagents/spawn/subagent-spawn.test-support.js";
import {
  notifySubagentTerminalCallback,
  resetSubagentTerminalCallbacksForTest,
} from "../../subagents/subagent-terminal-callbacks.js";
import {
  createAdmittedGatewayToolCallerIdentity,
  withGatewayToolCallerIdentity,
} from "../../tools/gateway-caller-context.js";
import { makeAttemptResult } from "../run.overflow-compaction.fixture.js";
import { runEmbeddedAttemptWithBackend } from "./backend.js";
import { claimAgentSessionWriter } from "./session-bootstrap.js";
import type { EmbeddedRunAttemptParams } from "./types.js";

const edges = vi.hoisted(() => ({
  prepare: vi.fn(),
  complete: vi.fn(),
  gateway: vi.fn(),
  parentHarness: vi.fn(),
}));
vi.mock("../../simple-completion-runtime.js", () => ({
  prepareSimpleCompletionModelForAgent: edges.prepare,
  completeWithPreparedSimpleCompletionModel: edges.complete,
}));
vi.mock("../../../gateway/call.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../gateway/call.js")>()),
  callGateway: edges.gateway,
}));
vi.mock("../../harness/selection.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../harness/selection.js")>()),
  runAgentHarnessAttempt: edges.parentHarness,
}));

const environment = captureEnv(["OPENCLAW_STATE_DIR", "OPENCLAW_CONFIG_PATH"]);
const cleanups: Array<() => void | Promise<void>> = [];
const launches: Array<{ request: Record<string, unknown>; identity?: AgentRuntimeIdentity }> = [];
let stateDir: string;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), "enterprise-delegation-durable-"));
  setTestEnvValue("OPENCLAW_STATE_DIR", stateDir);
  setTestEnvValue("OPENCLAW_CONFIG_PATH", join(stateDir, "openclaw.json"));
  clearConfigCache();
  clearRuntimeConfigSnapshot();
  resetGatewayWorkAdmission();
  resetDetachedTaskLifecycleRuntimeForTests();
  resetSubagentRegistryForTests({ persist: false });
  resetSubagentTerminalCallbacksForTest();
  launches.length = 0;
  edges.prepare.mockReset().mockResolvedValue({
    model: { maxTokens: 4096 },
    auth: { apiKey: "test-provider-key" },
  });
  edges.complete.mockReset();
  edges.gateway.mockReset().mockImplementation(async (request) => {
    if (request.method === "agent.wait") return { status: "pending" };
    if (request.method === "agent")
      return { status: "accepted", runId: request.params?.idempotencyKey };
    return {};
  });
  let lastAccepted: EmbeddedRunAttemptParams["acceptedSessionSpawns"] = [];
  let acceptedOwner: EmbeddedRunAttemptParams["admittedRunContext"] | undefined;
  edges.parentHarness.mockReset().mockImplementation(async (attempt: EmbeddedRunAttemptParams) => {
    const runtime = getEnterpriseDelegationRuntime();
    const delegation = readGatewayRequestRuntimeMetadata(attempt.config)?.enterpriseDelegation;
    const turn = delegation?.turn;
    if (!runtime || !delegation || !turn?.decisionId || !attempt.sessionKey) {
      throw new Error("Expected model-driven Enterprise delegation runtime");
    }
    const approved = readEnterpriseDelegationDecisionRoutes({
      config: attempt.config,
      accountId: delegation.accountId,
      personalAgentId: delegation.personalAgentId,
      sessionKey: attempt.sessionKey,
      parentRunId: attempt.runId,
      decisionId: turn.decisionId,
    });
    if (!approved.ok) {
      if (
        approved.reasonCode !== "decision_replayed" ||
        !lastAccepted.length ||
        acceptedOwner !== attempt.admittedRunContext
      ) {
        if (
          (approved.reasonCode === "decision_replayed" ||
            approved.reasonCode === "decision_not_found") &&
          acceptedOwner !== attempt.admittedRunContext
        ) {
          return makeAttemptResult({ agentHarnessId: "openclaw" });
        }
        throw new Error(`Expected approved Enterprise routes: ${approved.reasonCode}`);
      }
      return makeAttemptResult({
        agentHarnessId: "openclaw",
        acceptedSessionSpawns: lastAccepted,
        yieldDetected: true,
      });
    }
    const caller = createAdmittedGatewayToolCallerIdentity({
      admittedRunContext: attempt.admittedRunContext,
      receiptAuthority: runtime.assertActive,
      agentId: attempt.agentId,
      sessionKey: attempt.sessionKey,
    });
    const toolResult = await withGatewayToolCallerIdentity(caller, () =>
      runtime.execute(
        "enterprise_delegate",
        approved.routes.map(({ agentId }) => ({ agentId, task: "model-authored wording" })),
      ),
    );
    const details = toolResult.details as {
      acceptedSessionSpawns?: EmbeddedRunAttemptParams["acceptedSessionSpawns"];
    };
    if (details.acceptedSessionSpawns?.length && attempt.sessionKey) {
      markRequesterTurnYielded({
        requesterSessionKey: attempt.sessionKey,
        requesterAgentId: attempt.agentId,
        requesterTurnRunId: attempt.runId,
      });
    }
    lastAccepted = details.acceptedSessionSpawns ?? [];
    acceptedOwner = attempt.admittedRunContext;
    return makeAttemptResult({
      agentHarnessId: "openclaw",
      acceptedSessionSpawns: details.acceptedSessionSpawns ?? [],
      // The fake model explicitly yields after the tool call, mirroring a real
      // sessions_yield invocation without bypassing the coordinator wrapper.
      yieldDetected: true,
    });
  });
  installChildTransport();
});

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  for (const entry of loadSubagentRegistryFromSqlite().values())
    notifySubagentTerminalCallback(entry);
  resetSubagentRegistryForTests({ persist: false });
  resetSubagentTerminalCallbacksForTest();
  spawnTesting.setDepsForTest();
  resetDetachedTaskLifecycleRuntimeForTests();
  delegationRouter.invalidateEnterpriseDelegationRouterRuntimeState();
  resetGatewayWorkAdmission();
  clearRuntimeConfigSnapshot();
  clearConfigCache();
  closeOpenClawStateDatabaseForTest();
  environment.restore();
  rmSync(stateDir, { recursive: true, force: true });
});

function installChildTransport(beforeAccept?: (request: Record<string, unknown>) => Promise<void>) {
  spawnTesting.setDepsForTest({
    hasInProcessGatewayContext: () => true,
    dispatchGatewayMethodInProcess: async <T>(
      method: string,
      request: Record<string, unknown>,
      options?: NonNullable<Parameters<typeof dispatchGatewayMethodInProcess>[2]>,
    ) => {
      if (method !== "agent") return {} as T;
      launches.push({ request, identity: readInProcessAgentRuntimeIdentity(options) });
      await beforeAccept?.(request);
      return { status: "accepted", runId: request.idempotencyKey } as T;
    },
  });
}

async function fixture(twoAssignments = false) {
  const agentIds = twoAssignments ? ["finance", "contracts"] : ["finance"];
  const account = createEnterpriseAccount({
    username: "durable.employee",
    displayName: "Employee",
    passwordHash: "test-hash",
    role: "employee",
    initialEntitlements: agentIds.map((agentId) => ({
      resourceType: "agent" as const,
      resourceId: sharedAgentResourceKey(agentId),
      effect: "allow" as const,
    })),
  });
  writeEnterpriseDelegationPolicy(0, {
    rollout: "on",
    routerModel: "test/router",
    autoThreshold: 0.9,
    clarifyThreshold: 0.7,
    minimumMargin: 0.15,
    maxDelegatesPerTurn: 3,
    eventRetentionDays: 90,
  });
  const personalAgentId = `personal-${account.id}`;
  const sessionKey = `agent:${personalAgentId}:main`;
  const runId = "durable-parent-run";
  const sessionId = "durable-parent-session";
  const originalRequest = twoAssignments
    ? "Tiền mặt còn 370 triệu, chi đều 80 triệu/tháng. Đánh giá giúp tôi khả năng chi trả và rủi ro điều khoản thanh toán của hợp đồng HD-0209."
    : "Tiền mặt còn 370 triệu, chi đều 80 triệu/tháng. Đánh giá giúp tôi khả năng chi trả trong thời gian tới.";
  const prompt = "Được, tiếp tục giúp tôi.";
  const config = markGatewayRequestScopedRuntimeConfig(
    {
      session: { mainKey: "main", scope: "per-sender" },
      agents: {
        defaults: { workspace: stateDir, sandbox: { mode: "all" } },
        entries: {
          [personalAgentId]: { workspace: stateDir, subagents: { allowAgents: agentIds } },
          ...Object.fromEntries(
            agentIds.map((agentId) => [
              agentId,
              {
                name: agentId === "finance" ? "Finance" : "Contracts",
                description:
                  agentId === "finance" ? "Cash flow assessment" : "Contract risk review",
                workspace: stateDir,
                delegationTarget: {
                  status: "active",
                  aliases: [],
                  handlingMode: "confirm_before_handoff",
                  useWhen: [
                    agentId === "finance" ? "cash flow assessment" : "contract risk review",
                  ],
                  avoidWhen: [],
                  requiredInputs: [],
                },
              },
            ]),
          ),
        },
      },
    } satisfies OpenClawConfig,
    { enterpriseDelegation: { accountId: account.id, personalAgentId, specialists: [] } },
  );
  setRuntimeConfigSnapshot(config);
  const storePath = await writeSubagentSessionEntry({
    stateDir,
    sessionKey,
    sessionId,
    agentId: personalAgentId,
    defaultSessionId: sessionId,
  });
  const target = { storePath, sessionKey, sessionId, agentId: personalAgentId };
  await createUserTurnTranscriptRecorder({
    input: { text: originalRequest, idempotencyKey: `${runId}-planning:user` },
    target: { ...target, config, sessionEntry: loadSessionEntry(target) },
    updateMode: "none",
  }).persistApproved();
  const modelDecision = {
    outcome: "delegate",
    handling: "specialist",
    confidence: 0.98,
    secondConfidence: 0.01,
    independent: true,
    question: "",
    routes: agentIds.map((agentId) => ({
      agentId,
      task: agentId === "finance" ? "Assess cash runway" : "Assess payment clause risk",
      missingRequiredInputIds: [],
      resolvedRequiredInputs: [],
      knowledgeQueries: [],
    })),
  };
  const modelResponse = (confirmation = false) => ({
    stopReason: "stop",
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ...modelDecision,
          ...(confirmation ? { continuation: "confirm", handoffConsent: "approved" } : {}),
        }),
      },
    ],
  });
  edges.complete.mockResolvedValue(modelResponse());
  await delegationRouter.prepareEnterpriseDelegationTurn({
    config,
    agentId: personalAgentId,
    sessionKey,
    parentRunId: `${runId}-planning`,
    prompt: originalRequest,
  });
  expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
    outcome: "clarify",
    reasonCode: "handoff_confirmation_required",
  });
  expect(launches).toHaveLength(0);
  // The same provider edge answers continuation classification and the separate
  // verifier. Neither the router's decision, consent nor dispatch is mocked.
  edges.complete.mockResolvedValue(modelResponse(true));
  await delegationRouter.prepareEnterpriseDelegationTurn({
    config,
    agentId: personalAgentId,
    sessionKey,
    parentRunId: runId,
    prompt,
  });
  expect(readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation?.turn).toMatchObject({
    outcome: "delegate",
    decisionId: expect.any(String),
  });
  expect(edges.complete).toHaveBeenCalledTimes(3);
  const admission = prepareSystemAgentRunAdmission(config, runId, personalAgentId, "test");
  const admittedRunContext = await admission.admit("embedded");
  const writerClaim = await claimAgentSessionWriter({
    config,
    agentId: personalAgentId,
    sessionId,
    sessionKey,
    sessionTarget: target,
    runId,
    prompt,
    workspaceDir: stateDir,
    agentHarnessId: "openclaw",
    timeoutMs: 30_000,
  });
  if (!writerClaim) throw new Error("Expected durable parent session writer claim");
  const ownedTarget = { ...target, ...writerClaim };
  const rootWork = tryBeginGatewayRootWorkAdmission();
  if (!rootWork) throw new Error("Expected root work admission");
  cleanups.push(admission.close, rootWork.release);
  const contextEngineLogicalTurnLease = await createContextEngineLogicalTurnLease({
    config,
    workspaceDir: stateDir,
  });
  cleanups.push(() => contextEngineLogicalTurnLease.dispose());
  const authStorage = AuthStorage.inMemory();
  const params = {
    config,
    admittedRunContext,
    contextEngineLogicalTurnLease,
    agentId: personalAgentId,
    sessionId,
    sessionKey,
    sessionFile: sessionKey,
    sessionTarget: ownedTarget,
    runId,
    prompt,
    workspaceDir: stateDir,
    agentHarnessId: "openclaw",
    timeoutMs: 30_000,
    provider: "test",
    modelId: "test-model",
    model: {
      id: "test-model",
      name: "Test Model",
      provider: "test",
      api: "openai-completions",
      baseUrl: "https://provider.invalid/v1",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 4096,
    },
    authStorage,
    authProfileStore: { version: 1, profiles: {} },
    modelRegistry: ModelRegistry.inMemory(authStorage),
    thinkLevel: "off",
    userTurnTranscriptRecorder: createUserTurnTranscriptRecorder({
      input: { text: prompt, idempotencyKey: `${runId}:user` },
      target: { ...ownedTarget, config, sessionEntry: loadSessionEntry(ownedTarget) },
      updateMode: "none",
    }),
  } satisfies EmbeddedRunAttemptParams;
  return {
    params,
    target: ownedTarget,
    closeParent: admission.close,
    run: () =>
      rootWork.run(async () => {
        const result = await runEmbeddedAttemptWithBackend(params);
        if (result.acceptedSessionSpawns?.length) {
          settleRequesterAfterSessionSpawns({
            requesterSessionKey: params.sessionKey!,
            requesterAgentId: params.agentId,
            requesterTurnRunId: params.runId,
            requesterYielded: result.yieldDetected === true,
            acceptedSessionSpawns: result.acceptedSessionSpawns,
          });
        }
        return result;
      }),
  };
}

describe("Enterprise delegation durable child boundary", () => {
  it("persists an approved child and its yield batch once across attempt retry and memory reset", async () => {
    const f = await fixture();
    const first = await f.run();
    expect(first.yieldDetected).toBe(true);
    expect(first.acceptedSessionSpawns).toHaveLength(1);
    const child = expectDefined(first.acceptedSessionSpawns?.[0], "accepted durable child");
    expect(launches).toHaveLength(1);
    const launch = expectDefined(launches[0], "trusted durable child launch");
    expect(launch.request.message).toContain("370 triệu");
    expect(launch.identity).toMatchObject({
      kind: "agentRuntime",
      agentId: f.params.agentId,
      sessionKey: f.params.sessionKey,
      operationalRunInstance: f.params.admittedRunContext.operationalRunInstance,
      delegatedAuthority: { kind: "local" },
      sessionSpawnContext: {
        inheritedToolPolicy: {
          deny: expect.arrayContaining(["sessions_spawn", "enterprise_delegate"]),
        },
      },
    });
    expect(loadSubagentRegistryFromSqlite().get(child.runId)).toMatchObject({
      childSessionKey: child.childSessionKey,
      requesterSessionKey: f.params.sessionKey,
      requesterAgentId: f.params.agentId,
      completion: { required: true },
      requesterSettleWake: {
        status: "pending",
        requesterYieldBatch: true,
        batchRunIds: [child.runId],
      },
    });
    const retry = await f.run();
    expect(retry.acceptedSessionSpawns).toEqual(first.acceptedSessionSpawns);
    expect(launches).toHaveLength(1);

    f.closeParent();
    delegationRouter.invalidateEnterpriseDelegationRouterRuntimeState();
    resetSubagentRegistryForTests({ persist: false });
    const recovered = new Map<string, SubagentRunRecord>();
    expect(restoreSubagentRunsFromDisk({ runs: recovered })).toBe(1);
    expect(recovered.get(child.runId)?.requesterSettleWake?.batchRunIds).toEqual([child.runId]);
    expect(recovered.get(child.runId)?.requesterTurnRunId).toBeUndefined();
    expect(recovered.get(child.runId)).toMatchObject({
      requesterUserTurnIdempotencyKey: `${f.params.runId}:user`,
      requesterUserTurnSessionId: f.params.sessionId,
    });

    const restarted = prepareSystemAgentRunAdmission(
      f.params.config,
      f.params.runId,
      f.params.agentId,
      "test",
    );
    cleanups.push(restarted.close);
    const restartedLease = await createContextEngineLogicalTurnLease({
      config: f.params.config,
      workspaceDir: stateDir,
    });
    cleanups.push(() => restartedLease.dispose());
    const replay = await runEmbeddedAttemptWithBackend({
      ...f.params,
      admittedRunContext: await restarted.admit("embedded"),
      contextEngineLogicalTurnLease: restartedLease,
      userTurnTranscriptRecorder: createUserTurnTranscriptRecorder({
        input: { text: f.params.prompt, idempotencyKey: `${f.params.runId}:user` },
        target: {
          ...f.target,
          config: f.params.config,
          sessionEntry: loadSessionEntry(f.target),
        },
        updateMode: "none",
      }),
    });
    expect(replay.acceptedSessionSpawns ?? []).toHaveLength(0);
    expect(launches).toHaveLength(1);
  });

  it("keeps an accepted child durably settled when post-dispatch telemetry cannot be written", async () => {
    const f = await fixture();
    const recordSpawn = vi
      .spyOn(delegationRouter, "recordEnterpriseDelegationSpawn")
      .mockImplementation(({ childRunIds }) => {
        // Inject the failure only after the real spawn owner has durably accepted
        // the child. The router, admission and child registry are not replaced.
        expect(childRunIds).toHaveLength(1);
        const childRunId = expectDefined(childRunIds[0], "accepted child before telemetry failure");
        expect(loadSubagentRegistryFromSqlite().get(childRunId)).toMatchObject({
          requesterSessionKey: f.params.sessionKey,
          requesterTurnRunId: f.params.runId,
        });
        throw new Error("qa-delegation-event-storage-unavailable");
      });
    try {
      const first = await f.run();
      expect(first.yieldDetected).toBe(true);
      expect(first.acceptedSessionSpawns).toHaveLength(1);
      expect(launches).toHaveLength(1);
      const child = expectDefined(
        first.acceptedSessionSpawns?.[0],
        "accepted child after telemetry failure",
      );
      expect(loadSubagentRegistryFromSqlite().get(child.runId)).toMatchObject({
        childSessionKey: child.childSessionKey,
        requesterSettleWake: {
          status: "pending",
          requesterYieldBatch: true,
          batchRunIds: [child.runId],
        },
      });
      const transcript = JSON.stringify(readSessionTranscriptMessageEvents(f.target));
      expect(transcript).not.toContain("qa-delegation-event-storage-unavailable");

      const retry = await f.run();
      expect(retry.acceptedSessionSpawns).toEqual(first.acceptedSessionSpawns);
      expect(launches).toHaveLength(1);
      expect(recordSpawn).toHaveBeenCalledOnce();
      expect(JSON.stringify(readSessionTranscriptMessageEvents(f.target))).toBe(transcript);
    } finally {
      recordSpawn.mockRestore();
    }
  });

  it("re-arms an early completed accepted child and persists the rejected assignment for parent resume", async () => {
    const f = await fixture(true);
    let releaseFailure = () => {};
    const failedLaunchGate = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    installChildTransport(async (request) => {
      if (String(request.sessionKey).startsWith("agent:contracts:")) {
        await failedLaunchGate;
        throw new Error("contracts transport unavailable");
      }
    });
    edges.gateway.mockImplementation(async (request) => {
      if (request.method === "agent.wait")
        return {
          status: "ok",
          startedAt: Date.now() - 1,
          endedAt: Date.now(),
          terminalReply: { disposition: "visible", text: "Cash runway is about 4.6 months." },
        };
      return { status: "accepted", runId: request.params?.idempotencyKey };
    });
    const running = f.run();
    try {
      await vi.waitFor(() => {
        const entries = [...loadSubagentRegistryFromSqlite().values()];
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
          execution: { status: "terminal" },
          requesterTurnRunId: f.params.runId,
        });
      });
    } finally {
      releaseFailure();
    }
    const result = await running;
    expect(result.yieldDetected).toBe(true);
    expect(result.acceptedSessionSpawns).toHaveLength(1);
    const child = expectDefined(
      result.acceptedSessionSpawns?.[0],
      "early completed accepted child",
    );
    const row = loadSubagentRegistryFromSqlite().get(child.runId);
    expect(row).toMatchObject({
      execution: { status: "terminal" },
      requesterSettleWake: {
        requesterYieldBatch: true,
        afterRequesterYield: true,
        batchRunIds: [child.runId],
      },
    });
    expect(loadSubagentRegistryFromSqlite().size).toBe(1);
    const transcript = JSON.stringify(readSessionTranscriptMessageEvents(f.target));
    expect(transcript).not.toContain("contracts transport unavailable");
  });
});
