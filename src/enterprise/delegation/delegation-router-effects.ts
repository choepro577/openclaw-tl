/** Turn presentation and metadata-only routing effects; state has one canonical owner. */
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  readGatewayRequestRuntimeMetadata,
  type GatewayEnterpriseDelegationTurn,
} from "../../gateway/request-runtime-config.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import type { EnterpriseDelegationCandidate } from "./delegation-candidates.js";
import type {
  EnterpriseDelegationHandling,
  PendingClarification,
  RouterModelDecision,
} from "./delegation-router-model.js";
import {
  pendingClarifications,
  plans,
  type EnterpriseDelegationDecision,
  type PlanIdentity,
} from "./delegation-router-state.js";
import {
  appendEnterpriseDelegationEvent,
  hashEnterpriseDelegationValue,
  type EnterpriseDelegationEvent,
  type EnterpriseDelegationPolicy,
} from "./delegation-store.js";

const MAX_PENDING_CLARIFICATIONS = 256;

type TurnEffectsState = {
  source: EnterpriseDelegationDecision["source"];
  prompt: string;
  handling: EnterpriseDelegationHandling;
  plan: PlanIdentity | undefined;
  pending: PendingClarification | undefined;
  answerContext: string;
  userInputs: string[];
  explicitAgentIds: string[];
  consentedAgentIds: string[];
  requiresRenewedConsent: boolean;
};

function recordRoutingEvent(params: {
  accountId: string;
  personalAgentId: string;
  prompt: string;
  sessionKey: string;
  parentRunId: string;
  policy: EnterpriseDelegationPolicy;
  source: EnterpriseDelegationEvent["decisionSource"];
  outcome: EnterpriseDelegationEvent["outcome"];
  candidates?: readonly EnterpriseDelegationCandidate[];
  reasonCode: string;
  confidenceBand?: EnterpriseDelegationEvent["confidenceBand"];
  latencyMs?: number;
  stateOptions?: OpenClawStateDatabaseOptions;
  simulation?: boolean;
  confirmationState?: EnterpriseDelegationEvent["confirmationState"];
}) {
  if (params.simulation) {
    return undefined;
  }
  return appendEnterpriseDelegationEvent(
    {
      accountId: params.accountId,
      personalAgentId: params.personalAgentId,
      sharedAgentIds: params.candidates?.map((candidate) => candidate.agentId) ?? [],
      childRunIds: [],
      prompt: params.prompt,
      parentSessionKey: params.sessionKey,
      parentRunId: params.parentRunId,
      decisionSource: params.source,
      outcome: params.outcome,
      confidenceBand: params.confidenceBand ?? null,
      reasonCode: params.reasonCode,
      policyRevision: params.policy.revision,
      profileRevisions: Object.fromEntries(
        params.candidates?.map((candidate) => [candidate.agentId, candidate.profileRevision]) ?? [],
      ),
      confirmationState: params.confirmationState ?? "not_required",
      latencyMs: params.latencyMs ?? null,
    },
    params.stateOptions,
  );
}

export function setTurn(config: OpenClawConfig, turn: GatewayEnterpriseDelegationTurn): void {
  const delegation = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation;
  if (delegation) {
    delegation.turn = turn;
  }
}

export function createDelegationTurnEffects(
  params: {
    config: OpenClawConfig;
    accountId: string;
    accountPolicyRevision: number;
    personalAgentId: string;
    sessionKey: string;
    parentRunId: string;
    policy: EnterpriseDelegationPolicy;
    stateOptions?: OpenClawStateDatabaseOptions;
    simulation?: boolean;
    startedAt: number;
    key: string;
  },
  readState: () => TurnEffectsState,
  ensurePlan: () => PlanIdentity,
) {
  const auditPlanPhase = (
    phase: "selected" | "confirmed",
    chosen: readonly EnterpriseDelegationCandidate[],
  ) => {
    const { handling } = readState();
    if (params.simulation) {
      return;
    }
    const identity = ensurePlan();
    if (identity[phase]) {
      return;
    }
    appendEnterpriseAuditEvent(
      {
        actorAccountId: params.accountId,
        actorSessionId: null,
        action: `delegation.plan.${phase}`,
        targetType: "delegation-plan",
        targetId: identity.planId,
        requestId: null,
        before: undefined,
        after: {
          planId: identity.planId,
          planRevision: identity.planRevision,
          handling,
          targetAgentIds: chosen.map((candidate) => candidate.agentId),
          targetCount: chosen.length,
          policyRevision: params.policy.revision,
          accountPolicyRevision: params.accountPolicyRevision,
          parentRunHash: hashEnterpriseDelegationValue(params.parentRunId),
          sessionHash: hashEnterpriseDelegationValue(params.sessionKey),
        },
        outcome: "success",
      },
      params.stateOptions,
    );
    identity[phase] = true;
  };
  const finish = (
    outcome: GatewayEnterpriseDelegationTurn["outcome"],
    reasonCode: string,
    instruction: string,
    chosen: readonly EnterpriseDelegationCandidate[] = [],
    confirmationState: EnterpriseDelegationEvent["confirmationState"] = "not_required",
    clarificationQuestion?: string,
  ) => {
    const { source, prompt, handling, plan } = readState();
    setTurn(params.config, {
      outcome,
      source,
      reasonCode,
      instruction,
      handling,
      ...(plan ? { planId: plan.planId, planRevision: plan.planRevision } : {}),
      ...(clarificationQuestion ? { clarificationQuestion } : {}),
      agentNames: chosen.map((candidate) => candidate.name),
    });
    recordRoutingEvent({
      ...params,
      prompt,
      accountId: params.accountId,
      personalAgentId: params.personalAgentId,
      policy: params.policy,
      source,
      outcome:
        reasonCode === "handoff_cancelled"
          ? "cancelled"
          : outcome === "clarify"
            ? "clarified"
            : outcome === "delegate"
              ? "delegated"
              : outcome,
      candidates: chosen,
      reasonCode,
      confirmationState,
      confidenceBand: outcome === "clarify" ? "ambiguous" : outcome === "local" ? "low" : "clear",
      latencyMs: Date.now() - params.startedAt,
    });
  };
  const remember = (
    kind: PendingClarification["kind"],
    question: string,
    chosen: readonly EnterpriseDelegationCandidate[],
    routes: RouterModelDecision["routes"],
  ) => {
    const {
      source,
      prompt,
      handling,
      pending,
      answerContext,
      userInputs,
      explicitAgentIds,
      consentedAgentIds,
      requiresRenewedConsent,
    } = readState();
    if (
      params.simulation ||
      chosen.length === 0 ||
      chosen.length > params.policy.maxDelegatesPerTurn
    ) {
      return;
    }
    for (const [pendingKey, value] of pendingClarifications) {
      if (value.expiresAt <= Date.now()) {
        plans.delete(value.planId);
        pendingClarifications.delete(pendingKey);
      }
    }
    if (
      !pendingClarifications.has(params.key) &&
      pendingClarifications.size >= MAX_PENDING_CLARIFICATIONS
    ) {
      const oldest = pendingClarifications.keys().next().value;
      if (oldest !== undefined) {
        const evicted = pendingClarifications.get(oldest);
        if (evicted) {
          plans.delete(evicted.planId);
        }
        pendingClarifications.delete(oldest);
      }
    }
    const identity = ensurePlan();
    auditPlanPhase("selected", chosen);
    pendingClarifications.set(params.key, {
      planId: identity.planId,
      planRevision: identity.planRevision,
      handling: handling === "hybrid" ? "hybrid" : "specialist",
      personalAgentId: params.personalAgentId,
      policyRevision: params.policy.revision,
      accountPolicyRevision: params.accountPolicyRevision,
      source,
      prompt,
      answerContext,
      userInputs,
      kind,
      question: question.slice(0, 500),
      explicitAgentIds,
      consentedAgentIds,
      requiresRenewedConsent,
      routes: chosen.map((candidate) => {
        const route = routes.find((item) => item.agentId === candidate.agentId);
        return {
          assignmentId:
            pending?.routes.find((item) => item.agentId === candidate.agentId)?.assignmentId ??
            generateSecureUuid(),
          agentId: candidate.agentId,
          task: route?.task ?? prompt,
          requiredInputs: route?.resolvedRequiredInputs ?? [],
          knowledgeQueries: route?.knowledgeQueries ?? [],
          profileRevision: candidate.profileRevision,
          overrideRevision: candidate.overrideRevision,
        };
      }),
      expiresAt: identity.expiresAt,
    });
  };
  const planWithContext = () =>
    finish(
      "local",
      "router_contextual_planning",
      "Read the full conversation and handle the current follow-up. Reuse completed work and preserve any work still in progress. Do not repeat accepted specialist tasks or ask for fresh handoff consent merely to report progress or recalculate known figures. If a material unresolved specialist question remains, use enterprise_specialists_list and enterprise_delegate to propose only that work; the server must still validate scope, required user inputs and handoff policy. Never claim a specialist was consulted unless an actual accepted result supports it.",
    );
  return { auditPlanPhase, finish, remember, planWithContext };
}

export function recordEnterpriseDelegationSpawn(params: {
  decision: EnterpriseDelegationDecision;
  childRunIds: string[];
  outcome: "delegated" | "failed";
  reasonCode: string;
  latencyMs: number;
  stateOptions?: OpenClawStateDatabaseOptions;
}): void {
  appendEnterpriseDelegationEvent(
    {
      accountId: params.decision.accountId,
      personalAgentId: params.decision.personalAgentId,
      sharedAgentIds: params.decision.routes.map((route) => route.agentId),
      childRunIds: params.childRunIds,
      prompt: params.decision.prompt,
      parentSessionKey: params.decision.sessionKey,
      parentRunId: params.decision.parentRunId,
      decisionSource: params.decision.source,
      outcome: params.outcome,
      confidenceBand: "clear",
      reasonCode: params.reasonCode,
      policyRevision: params.decision.policyRevision,
      profileRevisions: Object.fromEntries(
        params.decision.routes.map((route) => [route.agentId, route.profileRevision]),
      ),
      confirmationState: params.decision.confirmationState ?? "not_required",
      latencyMs: params.latencyMs,
    },
    params.stateOptions,
  );
}
