import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
// Request-scoped Enterprise specialist routing. Model output can recommend, never authorize.
import { generateSecureUuid } from "../../infra/secure-random.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
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
  runPendingConfirmationChecks,
  runRouterModel,
  verifyRouterModel,
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

function verifierClarificationQuestion(reasonCode: string, unavailable: boolean): string {
  if (unavailable) {
    return ROUTER_RETRY_QUESTION;
  }
  switch (reasonCode) {
    case "router_verifier_target_disagreed":
      return "Mình chưa xác định chắc chắn chuyên gia phù hợp cho phần việc này. Bạn nêu rõ chuyên gia hoặc phần việc muốn giao giúp mình nhé?";
    case "router_verifier_handling_disagreed":
      return "Mình chưa xác định chắc chắn nên xử lý phần việc này bằng tra cứu tài liệu hay chuyên gia. Bạn xác nhận nguồn hoặc mục tiêu cần nhận giúp mình nhé?";
    case "router_verifier_outcome_disagreed":
      return "Mình chưa thể xác nhận phương án chuyển việc vừa đề xuất. Bạn nói rõ kết quả cuối cùng cần nhận giúp mình nhé?";
    case "router_verifier_low_confidence":
    case "router_verifier_low_margin":
      return "Mình chưa đủ chắc chắn về phạm vi phần việc. Bạn nói rõ đối tượng hoặc phạm vi cần xử lý giúp mình nhé?";
    default:
      return "Chưa có chuyên gia nào bắt đầu. Bạn có thể xác nhận phần việc và kết quả cần nhận trước khi mình chuyển việc không?";
  }
}
function snapshotPendingClarification(pending: PendingClarification): PendingClarification {
  return {
    ...pending,
    userInputs: [...pending.userInputs],
    explicitAgentIds: [...pending.explicitAgentIds],
    consentedAgentIds: [...pending.consentedAgentIds],
    routes: pending.routes.map((route) => ({
      ...route,
      requiredInputs: route.requiredInputs.map((input) => ({ ...input })),
      knowledgeQueries: [...route.knowledgeQueries],
    })),
  };
}

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
  /** Internal experiment seam; production callers retain the sequential default. */
  routerEvaluationMode?: "sequential" | "parallel_pending_confirmation";
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
      (params.simulation === true &&
        candidate.effective &&
        candidate.profile?.status === "active" &&
        candidate.effectiveMode !== "disabled"),
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
  // Exact retries can satisfy explicit_only admission without suppressing a
  // fresh confirm_before_handoff prompt when the prior attempt was unapproved.
  let retryExplicitAgentIds: string[] = [];
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
      | "preparedModel"
      | "diagnosticStage"
      | "diagnosticRole"
      | "diagnosticRunId"
      | "diagnosticAttempt"
    >,
    diagnosticStage: EnterpriseDelegationRouterModelStage,
  ) =>
    runRouterModel({
      ...request,
      preparedModel: await getPreparedRouterModel(),
      diagnosticStage,
      diagnosticRole: diagnosticStage === "verification" ? "verifier" : "router",
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
  if (!withinRouterContextBudget(prompt, conversationInputs, conversationResults)) {
    finishOversizedContext();
    return;
  }
  let modelDecision: RouterModelDecision | undefined;
  let deterministicRetry = false;
  let parallelPendingConfirmation = false;
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
    if (
      params.routerEvaluationMode === "parallel_pending_confirmation" &&
      pending.kind === "confirmation" &&
      !pending.requiresRenewedConsent &&
      pending.consentedAgentIds.length === 0
    ) {
      const pendingSnapshot = snapshotPendingClarification(pending);
      const parallelAttemptBase = routerModelAttempt;
      routerModelAttempt += 2;
      const parallel = await runPendingConfirmationChecks({
        ...request,
        pendingClarification: pendingSnapshot,
        preparedModel: await getPreparedRouterModel(),
        diagnosticRunId: params.parentRunId,
        diagnosticAttemptBase: parallelAttemptBase,
      });
      if (!isCurrentPending(pending)) {
        finish(
          "blocked",
          "pending_clarification_replaced",
          "Do not delegate: this clarification was superseded.",
        );
        return;
      }
      if (parallel.ok) {
        modelDecision = parallel.decision;
        parallelPendingConfirmation = true;
      }
    }
    let result = modelDecision ? undefined : await runRouter(request, "continuation");
    // One retry only for our own deadline, while this exact clarification still owns
    // the slot. Reuse the untouched answer; never guess consent or start a child here.
    if (
      result?.reasonCode === "router_timed_out" &&
      pendingClarifications.get(key) === pending &&
      pending.expiresAt > Date.now()
    ) {
      result = await runRouter(request, "continuation_retry");
    }
    modelDecision ??= result?.decision;
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
        result?.reasonCode ?? "pending_clarification_unresolved",
        result?.reasonCode
          ? "Explain briefly that specialist routing could not complete right now and no specialist has started. Do not silently substitute your own analysis or present the task as completed. Ask the user to resend their last answer to retry. Do not repeat the configured missing-information question as though no answer was supplied."
          : "Ask this concise question: " + pending.question,
        candidates.filter((candidate) =>
          pending!.routes.some((route) => route.agentId === candidate.agentId),
        ),
        "pending",
        result?.reasonCode ? ROUTER_RETRY_QUESTION : pending.question,
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
            parallelPendingConfirmation || continuation === "revise" || inputCorrection
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
      deterministicRetry = true;
      // A pure retry is an explicit continuation of the previous specialist
      // target. It satisfies explicit_only admission, while
      // confirm_before_handoff still requires prior approved consent below.
      retryExplicitAgentIds = exactRetry.routes.map((route) => route.agentId);
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
      // Required inputs are semantic facts, not label/ID regex matches. Both model passes
      // assess every configured field, including already-supplied natural-language values.
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
  if (!modelDecision) {
    finish(
      "local",
      "router_unavailable",
      "Handle the request locally. Do not claim that a specialist was consulted.",
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
    requiresRenewedConsent = true;
  }
  const newConsentProposed =
    continuationContext !== undefined &&
    !scopeChanged &&
    modelDecision.handoffConsent === "approved";
  if (newConsentProposed && continuationContext) {
    // Provisional only: neither pending state nor a decision may commit this without verification.
    consentedAgentIds = continuationContext.routes.map((route) => route.agentId);
  }
  const chosen = modelDecision.routes
    .map((route) => candidates.find((candidate) => candidate.agentId === route.agentId))
    .filter(isDefinedCandidate);
  const invalidRoute = chosen.length !== modelDecision.routes.length;
  const routeIds = modelDecision.routes.map((route) => route.agentId);
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
    finish(
      "local",
      routeIds.length === 0 ? "router_no_candidate" : "router_low_confidence",
      "Handle the request locally. Do not claim that a specialist was consulted.",
    );
    return;
  }
  const explicitOnly = chosen.find(
    (candidate) =>
      candidate.effectiveMode === "explicit_only" &&
      !explicitAgentIds.includes(candidate.agentId) &&
      !retryExplicitAgentIds.includes(candidate.agentId),
  );
  const confirmations = chosen.filter(
    (candidate) =>
      (candidate.effectiveMode === "confirm_before_handoff" || requiresRenewedConsent) &&
      (requiresRenewedConsent || !explicitAgentIds.includes(candidate.agentId)) &&
      !consentedAgentIds.includes(candidate.agentId),
  );
  const confirmation = confirmations.length > 0;
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
    explicitOnly !== undefined ||
    confirmation ||
    missing !== undefined ||
    inputIssue !== null;
  const shouldVerify =
    !deterministicRetry &&
    !parallelPendingConfirmation &&
    (!uncertain ||
      (newConsentProposed &&
        missing !== undefined &&
        !invalidRoute &&
        !scopeMismatch &&
        inputIssue === null &&
        !overLimit &&
        !explicitOnly &&
        modelDecision.confidence >= policy.autoThreshold &&
        modelDecision.confidence - modelDecision.secondConfidence >= policy.minimumMargin &&
        (routeIds.length < 2 || modelDecision.independent)));
  if (shouldVerify) {
    const verification = await verifyRouterModel({
      config: params.config,
      personalAgentId: delegation.personalAgentId,
      prompt: continuationContext ? params.prompt : prompt,
      candidates,
      policy,
      decision: modelDecision,
      pendingClarification: continuationContext,
      userInputs,
      allowMissingInputs: missing !== undefined,
      proposedAssignments: params.proposedAssignments,
      conversationInputs,
      conversationResults,
      previousDelegationContext,
      preparedModel: await getPreparedRouterModel(),
      diagnosticStage: "verification",
      diagnosticRole: "verifier",
      diagnosticRunId: params.parentRunId,
      diagnosticAttempt: ++routerModelAttempt,
    });
    if (
      (continuationContext && pendingClarifications.get(key) !== continuationContext) ||
      (plan &&
        (plans.get(plan.planId)?.planRevision !== plan.planRevision ||
          plan.expiresAt <= Date.now()))
    ) {
      finish(
        "blocked",
        "pending_clarification_replaced",
        "Do not delegate: this plan was cancelled or superseded while verification was running.",
      );
      return;
    }
    if (!verification.ok) {
      const question = verifierClarificationQuestion(
        verification.reasonCode,
        verification.unavailable === true,
      );
      // The first pass alone cannot commit new consent after independent verification fails.
      consentedAgentIds = continuationContext?.consentedAgentIds ?? [];
      if (verification.unavailable && continuationContext) {
        if (!params.simulation && !pendingClarifications.has(key)) {
          pendingClarifications.set(key, continuationContext);
        }
      } else {
        remember("choice", question, chosen, modelDecision.routes);
      }
      finish(
        "clarify",
        verification.reasonCode,
        "No specialist has started. Do not silently substitute your own analysis or present the task as completed. Ask this exact clarification question: " +
          question,
        chosen,
        "not_required",
        question,
      );
      return;
    }
  }
  if (newConsentProposed && (shouldVerify || parallelPendingConfirmation)) {
    requiresRenewedConsent = false;
    auditPlanPhase("selected", chosen);
    auditPlanPhase("confirmed", chosen);
  } else if (newConsentProposed) {
    consentedAgentIds = scopeChanged ? [] : (continuationContext?.consentedAgentIds ?? []);
  }
  if (uncertain) {
    const invalidPlan = invalidRoute || scopeMismatch || inputIssue || overLimit || explicitOnly;
    // Consent belongs to an admissible plan. Never offer a handoff which cannot
    // be retained, or turn an explicit-only policy rejection into an approval prompt.
    const question =
      invalidRoute || scopeMismatch || inputIssue || explicitOnly
        ? "Chưa có chuyên gia nào bắt đầu vì phương án chuyển việc chưa hợp lệ. Bạn làm rõ phần việc và kết quả cần nhận giúp mình nhé?"
        : overLimit
          ? "Bạn muốn ưu tiên tối đa " + policy.maxDelegatesPerTurn + " phần việc nào trước?"
          : missing?.question ||
            (confirmation
              ? "Bạn có đồng ý giao các phần việc đã nêu cho " +
                chosen.map((candidate) => candidate.name).join(", ") +
                " không?"
              : modelDecision.question ||
                pending?.question ||
                "Bạn có thể nói rõ kết quả bạn muốn nhận không?");
    const reasonCode = invalidRoute
      ? "router_route_unknown"
      : scopeMismatch
        ? "router_scope_mismatch"
        : inputIssue
          ? `router_${inputIssue}`
          : overLimit
            ? "router_agent_limit"
            : explicitOnly
              ? "router_mode_disallowed"
              : missing
                ? "required_input_missing:" + missing.id
                : confirmation
                  ? "handoff_confirmation_required"
                  : "router_ambiguous";
    if (!invalidPlan) {
      remember(
        missing ? "input" : confirmation ? "confirmation" : "choice",
        question,
        chosen,
        modelDecision.routes,
      );
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
      confirmation && !invalidPlan ? "pending" : "not_required",
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
  if (
    consentedAgentIds.length > 0 ||
    chosen.some((candidate) => explicitAgentIds.includes(candidate.agentId))
  ) {
    auditPlanPhase("confirmed", chosen);
  }
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
    confirmationState: consentedAgentIds.length > 0 ? "approved" : "not_required",
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
