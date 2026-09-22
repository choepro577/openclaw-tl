import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
// Request-scoped Enterprise specialist routing. Model output can recommend, never authorize.
import { generateSecureUuid } from "../../infra/secure-random.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import {
  clearEnterpriseDelegationAgentFirstContext,
  rememberEnterpriseDelegationAgentFirstContext,
} from "./delegation-agent-first.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import { explicitlyMentionedEnterpriseAgentIds } from "./delegation-explicit-match.js";
import {
  containsPhrase,
  isDefinedCandidate,
  withinRouterContextBudget,
  ROUTER_MAX_PROMPT_CHARS,
  explicitMatches,
  deterministicMatch,
  classifyEnterpriseFollowupIntent,
  isContextualLocalFollowup,
  isPureEnterpriseRetry,
  readPreviousEnterpriseDelegationContext,
  resolveExactEnterpriseRetry,
  withAnswerContext,
  withConversationInputs,
  type EnterpriseDelegationHistoryEntry,
} from "./delegation-router-context.js";
import { createDelegationTurnEffects, setTurn } from "./delegation-router-effects.js";
import {
  prepareEnterpriseDelegationRouterModel,
  runRouterModel,
  parseEnterpriseDelegationRouterDecision,
  reconcileRouterInputs,
  ROUTER_MAX_TASK_CHARS,
  type EnterpriseDelegationRouterModelStage,
  type PreparedEnterpriseDelegationRouterModel,
  type RouterModelDecision,
  type PendingClarification,
  type EnterpriseDelegationHandling,
} from "./delegation-router-model.js";
import {
  DECISION_TTL_MS,
  createDecision,
  invalidateEnterpriseDelegationPlan,
  pendingInputKey,
  pendingClarifications,
  plans,
  type EnterpriseDelegationDecision,
} from "./delegation-router-state.js";
import { readEnterpriseDelegationPolicy } from "./delegation-store.js";

export { recordEnterpriseDelegationSpawn } from "./delegation-router-effects.js";
export {
  consumeEnterpriseDelegationDecision,
  invalidateEnterpriseDelegationPlan,
  invalidateEnterpriseDelegationRouterRuntimeState,
  readEnterpriseDelegationDecisionRoutes,
  validateEnterpriseDelegationDecisionForDispatch,
  type EnterpriseDelegationApprovedRoute,
  type EnterpriseDelegationDecision,
} from "./delegation-router-state.js";

const ROUTER_RETRY_QUESTION =
  "Mình chưa hoàn tất việc chuyển phần việc này; chưa có chuyên gia nào bắt đầu. Bạn gửi lại câu trả lời vừa rồi để mình thử lại nhé?";
const RETRY_TARGET_QUESTION =
  "Mình chưa xác định được phần việc chuyên gia cần thử lại. Bạn nêu rõ chuyên gia hoặc mô tả phần việc muốn thử lại giúp mình nhé?";

export async function prepareEnterpriseDelegationTurn(params: {
  config: OpenClawConfig;
  agentId: string;
  sessionKey: string;
  parentRunId: string;
  prompt: string;
  /** Bounded external-user facts from this exact active transcript; never handoff consent. */
  conversationInputs?: readonly string[];
  /** Bounded completed assistant answers; reference context only, never user facts or consent. */
  conversationResults?: readonly string[];
  /** Optional test/host-provided bounded specialist history; otherwise read the native registry. */
  previousDelegationContext?: readonly EnterpriseDelegationHistoryEntry[];
  contextualPlanning?: boolean;
  simulation?: boolean;
  proposedAssignments?: readonly { agentId: string; task: string }[];
  /** Internal opt-in path: prepare facts for the Personal Agent, without a router LLM call. */
  agentFirst?: boolean;
  /** Structured route decision supplied by the Personal Agent experiment. */
  agentFirstDecision?: unknown;
  stateOptions?: OpenClawStateDatabaseOptions;
}): Promise<void> {
  const startedAt = Date.now();
  const delegation = readGatewayRequestRuntimeMetadata(params.config)?.enterpriseDelegation;
  if (
    !delegation ||
    normalizeAgentId(params.agentId) !== normalizeAgentId(delegation.personalAgentId)
  ) {
    return;
  }
  clearEnterpriseDelegationAgentFirstContext({
    config: params.config,
    sessionKey: params.sessionKey,
    parentRunId: params.parentRunId,
  });
  delete delegation.turn;
  delegation.request = { sessionKey: params.sessionKey, parentRunId: params.parentRunId };
  const key = pendingInputKey(delegation.accountId, params.sessionKey);
  const account = getEnterpriseAccountById(delegation.accountId, params.stateOptions);
  const policy = readEnterpriseDelegationPolicy(params.stateOptions);
  if (
    !account?.enabled ||
    !account.personalAgentEnabled ||
    (policy.rollout === "off" && !params.simulation)
  ) {
    if (!params.simulation) {
      const abandoned = pendingClarifications.get(key);
      if (abandoned) {
        invalidateEnterpriseDelegationPlan({
          accountId: delegation.accountId,
          sessionKey: params.sessionKey,
          planId: abandoned.planId,
          planRevision: abandoned.planRevision,
        });
      }
      pendingClarifications.delete(key);
    }
    return;
  }
  const assigned = listEnterpriseDelegationCandidates(params.config, account, params.stateOptions);
  const candidates = assigned.filter(
    (candidate) =>
      candidate.routable ||
      (params.simulation === true && candidate.effective && candidate.profile?.status === "active"),
  );
  const previousDelegationContext =
    params.previousDelegationContext ??
    readPreviousEnterpriseDelegationContext({
      accountId: account.id,
      personalAgentId: delegation.personalAgentId,
      sessionKey: params.sessionKey,
      parentRunId: params.parentRunId,
      candidates,
      stateOptions: params.stateOptions,
    });
  let source: EnterpriseDelegationDecision["source"] = "ai";
  let prompt = params.prompt;
  let answerContext = "";
  let pending = params.simulation ? undefined : pendingClarifications.get(key);
  let plan = pending ? plans.get(pending.planId) : undefined;
  let handling: EnterpriseDelegationHandling = pending?.handling ?? "direct";
  let conversationInputs = [...(params.conversationInputs ?? [])];
  let conversationResults = [...(params.conversationResults ?? [])];
  let userInputs = pending?.userInputs ?? [...conversationInputs, params.prompt];
  let requiresRenewedConsent = pending?.requiresRenewedConsent ?? false;
  let consentedAgentIds: string[] = [];
  let explicitAgentIds = explicitMatches(params.prompt, candidates).map(
    (candidate) => candidate.agentId,
  );
  const closePendingPlan = () => {
    if (pending && !params.simulation) {
      invalidateEnterpriseDelegationPlan({
        accountId: account.id,
        sessionKey: params.sessionKey,
        planId: pending.planId,
        planRevision: pending.planRevision,
      });
    }
  };
  const ensurePlan = () => {
    if (!plan) {
      for (const [id, item] of plans) {
        if (item.expiresAt <= Date.now()) {
          plans.delete(id);
        }
      }
      plan = {
        planId: generateSecureUuid(),
        planRevision: 1,
        accountId: account.id,
        sessionKey: params.sessionKey,
        expiresAt: Date.now() + DECISION_TTL_MS,
      };
      if (!params.simulation) {
        plans.set(plan.planId, plan);
      }
    }
    return plan;
  };
  type RouterModelRequest = Parameters<typeof runRouterModel>[0];
  let preparedRouterModelPromise:
    | Promise<PreparedEnterpriseDelegationRouterModel | null>
    | undefined;
  let routerModelAttempt = 0;
  const getPreparedRouterModel = () =>
    (preparedRouterModelPromise ??= prepareEnterpriseDelegationRouterModel({
      config: params.config,
      personalAgentId: delegation.personalAgentId,
      policy,
      diagnosticRunId: params.parentRunId,
    }));
  const runRouter = async (
    request: Omit<
      RouterModelRequest,
      "preparedModel" | "diagnosticStage" | "diagnosticRunId" | "diagnosticAttempt"
    >,
    diagnosticStage: EnterpriseDelegationRouterModelStage,
  ) =>
    runRouterModel({
      ...request,
      preparedModel: await getPreparedRouterModel(),
      diagnosticStage,
      diagnosticRunId: params.parentRunId,
      diagnosticAttempt: ++routerModelAttempt,
    });
  const isCurrentPending = (candidatePending: PendingClarification) => {
    const currentPlan = plans.get(candidatePending.planId);
    return (
      pendingClarifications.get(key) === candidatePending &&
      candidatePending.expiresAt > Date.now() &&
      currentPlan?.planRevision === candidatePending.planRevision &&
      candidatePending.personalAgentId === delegation.personalAgentId &&
      candidatePending.policyRevision === policy.revision &&
      candidatePending.accountPolicyRevision === account.policyRevision &&
      candidatePending.routes.every((route) =>
        candidates.some(
          (candidate) =>
            candidate.agentId === route.agentId &&
            candidate.profileRevision === route.profileRevision &&
            candidate.overrideRevision === route.overrideRevision,
        ),
      )
    );
  };
  const { auditPlanPhase, finish, remember, planWithContext } = createDelegationTurnEffects(
    {
      ...params,
      accountId: account.id,
      accountPolicyRevision: account.policyRevision,
      personalAgentId: delegation.personalAgentId,
      policy,
      startedAt,
      key,
    },
    () => ({
      source,
      prompt,
      handling,
      plan,
      pending,
      answerContext,
      userInputs,
      explicitAgentIds,
      consentedAgentIds,
      requiresRenewedConsent,
    }),
    ensurePlan,
  );
  const finishOversizedContext = () => {
    if (!params.simulation) {
      closePendingPlan();
      pendingClarifications.delete(key);
    }
    finish(
      "clarify",
      "clarification_context_too_long",
      "Ask the user to restate the task and all required values concisely. No specialist has started; do not silently omit any supplied answer.",
      [],
      "not_required",
      "Chưa có chuyên gia nào bắt đầu. Bạn gửi lại yêu cầu ngắn gọn, kèm đầy đủ các giá trị cần thiết giúp mình nhé?",
    );
  };
  const suppliedAgentFirstDecision =
    params.agentFirstDecision === undefined
      ? undefined
      : parseEnterpriseDelegationRouterDecision(params.agentFirstDecision);
  const suppliedAgentFirstDecisionInvalidForTurn =
    suppliedAgentFirstDecision === undefined ||
    (pending
      ? suppliedAgentFirstDecision.continuation === undefined ||
        suppliedAgentFirstDecision.handoffConsent === undefined
      : suppliedAgentFirstDecision.continuation !== undefined ||
        suppliedAgentFirstDecision.handoffConsent !== undefined);
  const rememberAgentFirstContext = () => {
    if (params.simulation) {
      return;
    }
    rememberEnterpriseDelegationAgentFirstContext(params.config, {
      accountId: account.id,
      personalAgentId: delegation.personalAgentId,
      sessionKey: params.sessionKey,
      parentRunId: params.parentRunId,
      prompt: params.prompt,
      conversationInputs,
      conversationResults,
      previousDelegationContext,
      candidates,
      pending,
      policy,
      explicitAgentIds,
    });
  };
  const recoverRouting = (reasonCode: string) => {
    if (
      params.simulation ||
      params.proposedAssignments ||
      params.agentFirstDecision !== undefined ||
      policy.rollout !== "on" ||
      candidates.length === 0
    ) {
      return false;
    }
    finish("local", reasonCode, "No specialist has started; inspect the permitted candidates.");
    // A failed proposal is not a final local decision. Reuse the existing
    // grounded coordinator path; its tool call cannot reopen this recovery.
    delete delegation.turn;
    rememberAgentFirstContext();
    return true;
  };
  if (!withinRouterContextBudget(prompt, conversationInputs, conversationResults)) {
    finishOversizedContext();
    return;
  }
  let modelDecision: RouterModelDecision | undefined;
  let routingResultReasonCode: string | undefined;
  let expectedAgentIds: string[] = [];
  let continuationContext: PendingClarification | undefined;
  if (pending) {
    source = pending.source;
    const stale = !isCurrentPending(pending);
    if (stale) {
      closePendingPlan();
      pendingClarifications.delete(key);
      finish(
        "blocked",
        "pending_clarification_changed",
        "The previous handoff is expired or its access/profile changed. Do not delegate using this answer; ask the user to restate the task.",
      );
      return;
    }
    const request = {
      config: params.config,
      personalAgentId: delegation.personalAgentId,
      prompt: params.prompt,
      candidates,
      policy,
      pendingClarification: pending,
      proposedAssignments: params.proposedAssignments,
      conversationResults,
      previousDelegationContext,
    };
    if (params.agentFirst && params.agentFirstDecision === undefined && !pending) {
      // The primary Personal Agent owns the one semantic decision in the
      // experiment. Keep the server facts available to its structured tool call;
      // never spend a router round-trip here. Pending lifecycle messages stay on
      // this server-owned continuation path so cancel/revise cannot be left in
      // a stale plan when a model answers in text without calling the tool.
      rememberAgentFirstContext();
      return;
    }
    if (params.agentFirstDecision !== undefined) {
      if (suppliedAgentFirstDecisionInvalidForTurn) {
        finish(
          "clarify",
          "agent_first_decision_invalid",
          "The Enterprise routing proposal was not valid. Ask the user to restate the task; no specialist has started.",
          [],
          "not_required",
          "Chưa có chuyên gia nào bắt đầu. Bạn mô tả lại phần việc và kết quả cần nhận giúp mình nhé?",
        );
        return;
      }
      modelDecision = suppliedAgentFirstDecision;
    } else {
      // A clarification answer gets one routing pass. A timeout leaves the exact
      // pending slot intact so the user can resend it; never guess a handoff.
      const result = await runRouter(request, "continuation");
      routingResultReasonCode = result.reasonCode;
      modelDecision = result.decision;
    }
    // A later request, policy emergency-off, or invalidation owns the slot now.
    if (pendingClarifications.get(key) !== pending) {
      finish(
        "blocked",
        "pending_clarification_replaced",
        "Do not delegate: this clarification was superseded.",
      );
      return;
    }
    const continuation = modelDecision?.continuation;
    if (
      continuation === "cancel" ||
      (modelDecision?.handoffConsent === "denied" && continuation !== "new_task")
    ) {
      closePendingPlan();
      handling = "direct";
      finish(
        "local",
        "handoff_cancelled",
        "Acknowledge the user's cancellation or refusal. No specialist has started. Do not delegate.",
        [],
        "denied",
      );
      return;
    }
    if (!continuation || continuation === "unclear") {
      finish(
        "clarify",
        routingResultReasonCode ?? "pending_clarification_unresolved",
        routingResultReasonCode
          ? "Explain briefly that specialist routing could not complete right now and no specialist has started. Do not silently substitute your own analysis or present the task as completed. Ask the user to resend their last answer to retry. Do not repeat the configured missing-information question as though no answer was supplied."
          : "Ask this concise question: " + pending.question,
        candidates.filter((candidate) =>
          pending!.routes.some((route) => route.agentId === candidate.agentId),
        ),
        "pending",
        routingResultReasonCode ? ROUTER_RETRY_QUESTION : pending.question,
      );
      return;
    }
    if (continuation === "new_task") {
      closePendingPlan();
      pending = undefined;
      plan = undefined;
      userInputs = [params.prompt];
      conversationInputs = [];
      conversationResults = [];
      handling = "direct";
      requiresRenewedConsent = false;
      modelDecision = undefined;
      source = "ai";
    } else {
      continuationContext = pending;
      expectedAgentIds =
        continuation === "revise" ? [] : pending.routes.map((route) => route.agentId);
      explicitAgentIds = [...new Set([...pending.explicitAgentIds, ...explicitAgentIds])];
      consentedAgentIds = pending.consentedAgentIds;
      if (continuation === "revise") {
        // Changed terms are not consent to the old handoff, even when introduced with "yes".
        explicitAgentIds = explicitMatches(params.prompt, candidates).map(
          (candidate) => candidate.agentId,
        );
      }
      const oldContext = pending.answerContext;
      answerContext =
        oldContext +
        "\n\nPrevious clarification: " +
        pending.question +
        "\nUser answer: " +
        params.prompt;
      userInputs = [...pending.userInputs, params.prompt];
      if (answerContext.length > ROUTER_MAX_TASK_CHARS) {
        finishOversizedContext();
        return;
      }
      // The isolated child receives this exact source; clipping could discard facts
      // which the model's assigned-task summary does not repeat.
      prompt = withAnswerContext(pending.prompt, oldContext, answerContext);
      if (prompt.length > ROUTER_MAX_PROMPT_CHARS) {
        finishOversizedContext();
        return;
      }
      const inputCorrection = reconcileRouterInputs({
        decision: modelDecision!,
        candidates,
        userInputs,
        previous: pending,
      }).changedInput;
      modelDecision = {
        ...modelDecision!,
        routes: modelDecision!.routes.map((route) => ({
          agentId: route.agentId,
          missingRequiredInputIds: route.missingRequiredInputIds,
          resolvedRequiredInputs: route.resolvedRequiredInputs,
          knowledgeQueries: route.knowledgeQueries,
          // A revision replaces the assignment, whereas an answer enriches the same assignment.
          task:
            continuation === "revise" || inputCorrection
              ? route.task
              : withAnswerContext(
                  pending!.routes.find((previous) => previous.agentId === route.agentId)?.task ??
                    route.task,
                  oldContext,
                  answerContext,
                  ROUTER_MAX_TASK_CHARS,
                ),
        })),
      };
    }
  }
  if (!modelDecision) {
    const mentionedIds =
      delegation.resolveExplicitAgentIds?.(params.prompt) ??
      explicitlyMentionedEnterpriseAgentIds(params.config, params.prompt);
    const mentioned = assigned.filter((candidate) => mentionedIds.includes(candidate.agentId));
    if (mentionedIds.length > 0 && mentioned.length === 0) {
      source = "explicit";
      finish(
        "blocked",
        "explicit_agent_not_assigned",
        "Tell the user that the named specialist is not assigned or available. Do not delegate or reveal other Agents.",
      );
      return;
    }
    if (mentioned.some((candidate) => !candidates.includes(candidate))) {
      source = "explicit";
      finish(
        "blocked",
        "explicit_agent_not_routable",
        "Tell the user that the named specialist is currently unavailable for delegation. Do not delegate.",
        mentioned,
      );
      return;
    }
    const followupIntent = classifyEnterpriseFollowupIntent(params.prompt);
    if (candidates.length === 0) {
      if (followupIntent === "retry" && isPureEnterpriseRetry(params.prompt)) {
        source = "rule";
        finish(
          "clarify",
          "retry_previous_task_unavailable",
          "No eligible prior specialist task is available for a pure retry. Ask the user to identify the specialist or restate the task; do not route through Enterprise Knowledge.",
          [],
          "not_required",
          RETRY_TARGET_QUESTION,
        );
      }
      return;
    }
    const exactRetry = resolveExactEnterpriseRetry({
      prompt: params.prompt,
      previous: previousDelegationContext,
      candidates,
      policyRevision: policy.revision,
    });
    if (exactRetry.kind === "ambiguous") {
      source = "rule";
      finish(
        "clarify",
        "retry_previous_task_ambiguous",
        "Several previous specialist tasks could match this retry. Ask the user to name the specialist or restate the task; do not choose one arbitrarily.",
        [],
        "not_required",
        "Mình thấy có nhiều phần việc chuyên gia gần đây. Bạn muốn thử lại phần việc nào? Hãy nêu tên chuyên gia hoặc mô tả phần việc giúp mình nhé?",
      );
      return;
    }
    if (exactRetry.kind === "matched") {
      source = "rule";
      // A pure retry is an explicit continuation of the previous specialist
      // target. It is deterministic and does not need another routing pass.
      consentedAgentIds = exactRetry.consentedAgentIds;
      modelDecision = {
        outcome: "delegate",
        handling: "specialist",
        confidence: 1,
        secondConfidence: 0,
        independent: exactRetry.routes.length > 1,
        question: "",
        routes: exactRetry.routes.map((route) => ({
          agentId: route.agentId,
          task: route.task,
          missingRequiredInputIds: [],
          resolvedRequiredInputs: [],
          knowledgeQueries: [],
        })),
      };
    } else if (
      exactRetry.kind === "none" &&
      followupIntent === "retry" &&
      isPureEnterpriseRetry(params.prompt)
    ) {
      source = "rule";
      finish(
        "clarify",
        "retry_previous_task_unavailable",
        "No eligible prior specialist task is available for a pure retry. Ask the user to identify the specialist or restate the task; do not route through Enterprise Knowledge.",
        [],
        "not_required",
        RETRY_TARGET_QUESTION,
      );
      return;
    } else if (
      params.contextualPlanning &&
      conversationResults.length &&
      !params.proposedAssignments &&
      isContextualLocalFollowup(params.prompt)
    ) {
      // Keep the inexpensive local path only for explicit summary/arithmetic
      // follow-ups. Retry, recheck and scope-expansion prompts must reach the
      // source-aware router instead of silently becoming Enterprise Knowledge work.
      return planWithContext();
    }
    if (!modelDecision) {
      const explicit = explicitMatches(params.prompt, candidates);
      const rule =
        explicit.length === 0 ? deterministicMatch(params.prompt, candidates) : undefined;
      source = explicit.length > 0 ? "explicit" : rule ? "rule" : "ai";
      if (params.agentFirst && params.agentFirstDecision === undefined) {
        // No semantic router call is made for an uncertain request. The primary
        // model receives the bounded candidate facts and chooses local handling
        // or a structured enterprise_delegate call.
        explicitAgentIds = explicit.map((candidate) => candidate.agentId);
        rememberAgentFirstContext();
        return;
      }
      if (params.agentFirstDecision !== undefined) {
        if (suppliedAgentFirstDecisionInvalidForTurn) {
          finish(
            "clarify",
            "agent_first_decision_invalid",
            "The Enterprise routing proposal was not valid. Ask the user to restate the task; no specialist has started.",
            [],
            "not_required",
            "Chưa có chuyên gia nào bắt đầu. Bạn mô tả lại phần việc và kết quả cần nhận giúp mình nhé?",
          );
          return;
        }
        modelDecision = suppliedAgentFirstDecision;
      }
      if (modelDecision) {
        // The structured decision is reduced below by the same grounding and
        // policy checks as a legacy router response.
      } else {
        // Required inputs are semantic facts, not label/ID regex matches. This single model
        // pass assesses every configured field, including already-supplied natural-language values.
        const result = await runRouter(
          {
            config: params.config,
            personalAgentId: delegation.personalAgentId,
            prompt,
            candidates,
            policy,
            proposedAssignments: params.proposedAssignments,
            conversationInputs,
            conversationResults,
            previousDelegationContext,
          },
          "proposal",
        );
        modelDecision = result.decision;
      }
    }
  }
  if (!modelDecision) {
    if (recoverRouting("router_unavailable")) {
      return;
    }
    finish(
      "blocked",
      "router_unavailable",
      "Specialist routing could not complete. No specialist has started. Report this limitation truthfully; do not invent operational results or required business fields.",
    );
    return;
  }
  handling = modelDecision.handling;
  const grounded = reconcileRouterInputs({
    decision: modelDecision,
    candidates,
    userInputs,
    previous: continuationContext,
  });
  modelDecision = grounded.decision;
  const scopeChanged =
    continuationContext !== undefined &&
    (modelDecision.continuation === "revise" ||
      grounded.changedInput ||
      modelDecision.handling !== continuationContext.handling ||
      (continuationContext.kind === "choice" &&
        continuationContext.routes.some(
          (route) => !modelDecision!.routes.some((item) => item.agentId === route.agentId),
        )));
  if (scopeChanged) {
    const current = ensurePlan();
    plan = {
      ...current,
      planRevision: current.planRevision + 1,
      selected: false,
      confirmed: false,
    };
    if (!params.simulation) {
      plans.set(plan.planId, plan);
    }
    consentedAgentIds = [];
    explicitAgentIds = [];
    requiresRenewedConsent = false;
  }
  const chosen = modelDecision.routes
    .map((route) => candidates.find((candidate) => candidate.agentId === route.agentId))
    .filter(isDefinedCandidate);
  const invalidRoute = chosen.length !== modelDecision.routes.length;
  const routeIds = modelDecision.routes.map((route) => route.agentId);
  if (params.agentFirstDecision !== undefined && params.proposedAssignments) {
    const proposedIds = params.proposedAssignments.map((assignment) =>
      normalizeAgentId(assignment.agentId),
    );
    const proposedSet = new Set(proposedIds);
    const routeSet = new Set(routeIds);
    if (
      proposedIds.length !== proposedSet.size ||
      routeIds.length !== routeSet.size ||
      proposedSet.size !== routeSet.size ||
      [...proposedSet].some((agentId) => !routeSet.has(agentId))
    ) {
      finish(
        "clarify",
        "agent_first_assignment_mismatch",
        "The Enterprise routing proposal did not match the requested assignment set. No specialist has started.",
        [],
        "not_required",
        "Chưa có chuyên gia nào bắt đầu vì phương án chuyển việc chưa khớp. Bạn mô tả lại phần việc cần giao giúp mình nhé?",
      );
      return;
    }
  }
  const scopeMismatch =
    expectedAgentIds.length > 0 &&
    (routeIds.some((id) => !expectedAgentIds.includes(id)) ||
      (continuationContext?.kind !== "choice" &&
        expectedAgentIds.some((id) => !routeIds.includes(id))));
  if (
    !continuationContext &&
    (modelDecision.outcome === "local" ||
      modelDecision.confidence < policy.clarifyThreshold ||
      routeIds.length === 0)
  ) {
    if (
      (routeIds.length === 0 || modelDecision.confidence < policy.autoThreshold) &&
      recoverRouting(routeIds.length === 0 ? "router_no_candidate" : "router_low_confidence")
    ) {
      return;
    }
    finish(
      "local",
      routeIds.length === 0 ? "router_no_candidate" : "router_low_confidence",
      "Answer locally only when the request can be fulfilled with available evidence and authorized tools. No specialist has started. Do not invent live records, completed actions or required business fields. If the requested operation cannot be performed, state that limitation; if user intent is ambiguous, ask only the specific unresolved question.",
    );
    return;
  }
  const avoided = chosen.find((candidate) =>
    candidate.profile?.avoidWhen.some((example) => containsPhrase(prompt, example)),
  );
  if (avoided) {
    finish(
      "local",
      "router_avoid_rule",
      "Handle the request locally. A configured negative routing example matched; do not delegate.",
    );
    return;
  }
  const missing = modelDecision.routes.flatMap((route) =>
    route.missingRequiredInputIds.flatMap((id) => {
      const input = chosen
        .find((candidate) => candidate.agentId === route.agentId)
        ?.profile?.requiredInputs.find((requiredInput) => requiredInput.id === id);
      return input ? [input] : [];
    }),
  )[0];
  const inputIssue = grounded.inputIssue;
  const overLimit = routeIds.length > policy.maxDelegatesPerTurn;
  const uncertain =
    modelDecision.outcome !== "delegate" ||
    modelDecision.confidence < policy.autoThreshold ||
    modelDecision.confidence - modelDecision.secondConfidence < policy.minimumMargin ||
    (routeIds.length > 1 && !modelDecision.independent) ||
    routeIds.length === 0 ||
    invalidRoute ||
    scopeMismatch ||
    overLimit ||
    missing !== undefined ||
    inputIssue !== null;
  if (uncertain) {
    const invalidPlan = invalidRoute || scopeMismatch || inputIssue || overLimit;
    const question =
      invalidRoute || scopeMismatch || inputIssue
        ? "Chưa có chuyên gia nào bắt đầu vì phương án chuyển việc chưa hợp lệ. Bạn làm rõ phần việc và kết quả cần nhận giúp mình nhé?"
        : overLimit
          ? "Bạn muốn ưu tiên tối đa " + policy.maxDelegatesPerTurn + " phần việc nào trước?"
          : missing?.question ||
            modelDecision.question ||
            pending?.question ||
            "Bạn có thể nói rõ kết quả bạn muốn nhận không?";
    const reasonCode = invalidRoute
      ? "router_route_unknown"
      : scopeMismatch
        ? "router_scope_mismatch"
        : inputIssue
          ? `router_${inputIssue}`
          : overLimit
            ? "router_agent_limit"
            : missing
              ? "required_input_missing:" + missing.id
              : "router_ambiguous";
    if (!invalidPlan) {
      remember(missing ? "input" : "choice", question, chosen, modelDecision.routes);
    } else if (
      (classifyEnterpriseFollowupIntent(params.prompt) === "retry" ||
        classifyEnterpriseFollowupIntent(params.prompt) === "recheck") &&
      explicitAgentIds.length === 0
    ) {
      source = "rule";
      finish(
        "clarify",
        "retry_previous_task_unavailable",
        "No eligible prior specialist task is available for a pure retry. Ask the user to identify the specialist or restate the task; do not route through Enterprise Knowledge.",
        [],
        "not_required",
        RETRY_TARGET_QUESTION,
      );
      return;
    } else if (
      continuationContext &&
      !scopeChanged &&
      !params.simulation &&
      !pendingClarifications.has(key)
    ) {
      pendingClarifications.set(key, continuationContext);
    }
    finish(
      "clarify",
      reasonCode,
      "Ask this concise clarification question: " + question,
      chosen,
      "not_required",
      question,
    );
    return;
  }
  if (continuationContext && pendingClarifications.get(key) === continuationContext) {
    pendingClarifications.delete(key);
  }
  if (policy.rollout === "shadow" && !params.simulation) {
    closePendingPlan();
    finish(
      "shadow",
      "shadow_would_delegate",
      "Handle the request locally. Delegation is in shadow mode; do not claim a specialist ran.",
      chosen,
    );
    return;
  }
  if (params.simulation) {
    setTurn(params.config, {
      outcome: "delegate",
      source,
      handling,
      agentNames: chosen.map((candidate) => candidate.name),
      instruction: "Simulation only. No specialist run may be started.",
      reasonCode: "simulation_would_delegate",
    });
    return;
  }
  const identity = ensurePlan();
  auditPlanPhase("selected", chosen);
  const decision = createDecision({
    planId: identity.planId,
    planRevision: identity.planRevision,
    handling: handling === "hybrid" ? "hybrid" : "specialist",
    accountId: account.id,
    personalAgentId: delegation.personalAgentId,
    sessionKey: params.sessionKey,
    parentRunId: params.parentRunId,
    prompt: withConversationInputs(prompt, conversationInputs),
    policyRevision: policy.revision,
    accountPolicyRevision: account.policyRevision,
    source,
    confirmationState: "not_required",
    routes: chosen.map((candidate, index) => ({
      assignmentId:
        continuationContext?.routes.find((item) => item.agentId === candidate.agentId)
          ?.assignmentId ?? generateSecureUuid(),
      agentId: candidate.agentId,
      agentName: candidate.name,
      task: modelDecision!.routes[index]!.task,
      requiredInputs: modelDecision!.routes[index]!.resolvedRequiredInputs,
      knowledgeQueries: modelDecision!.routes[index]!.knowledgeQueries,
      profileRevision: candidate.profileRevision,
      overrideRevision: candidate.overrideRevision,
    })),
  });
  setTurn(params.config, {
    decisionId: decision.id,
    planId: decision.planId,
    planRevision: decision.planRevision,
    handling: decision.handling,
    outcome: "delegate",
    source,
    agentNames: decision.routes.map((route) => route.agentName),
    instruction:
      "The server-approved Enterprise assignments are ready. Call enterprise_delegate once with exactly these agentIds and continue any independent local work. Do not call sessions_spawn. Follow the enterprise_delegate result's waiting guidance; do not claim a specialist result before it is delivered.",
    reasonCode: "route_ready",
  });
}
