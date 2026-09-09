/** Canonical process-local plan, clarification and one-shot decision authority. */
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import type { PendingClarification, ResolvedRequiredInput } from "./delegation-router-model.js";
import { readEnterpriseDelegationPolicy } from "./delegation-store.js";

export const DECISION_TTL_MS = 5 * 60_000;

type PlannedRoute = {
  assignmentId: string;
  agentId: string;
  agentName: string;
  task: string;
  requiredInputs: ResolvedRequiredInput[];
  knowledgeQueries: string[];
  profileRevision: string;
  overrideRevision: number;
};

/** Safe route projection for the coordinator's trusted current-turn context. */
export type EnterpriseDelegationApprovedRoute = Readonly<
  Pick<PlannedRoute, "agentId" | "agentName" | "task">
>;

export type EnterpriseDelegationDecision = {
  id: string;
  planId: string;
  planRevision: number;
  handling: "specialist" | "hybrid";
  accountId: string;
  personalAgentId: string;
  sessionKey: string;
  parentRunId: string;
  prompt: string;
  policyRevision: number;
  accountPolicyRevision: number;
  source: "explicit" | "rule" | "ai";
  routes: PlannedRoute[];
  createdAt: number;
  consumedAt?: number;
  confirmationState?: "not_required" | "approved";
};

const DECISION_STORE_KEY = Symbol.for("openclaw.enterprise.delegationDecisionStore");
const decisions = resolveGlobalSingleton<Map<string, EnterpriseDelegationDecision>>(
  DECISION_STORE_KEY,
  () => new Map(),
);
const PENDING_INPUT_STORE_KEY = Symbol.for("openclaw.enterprise.delegationPendingClarifications");
export const pendingClarifications = resolveGlobalSingleton<Map<string, PendingClarification>>(
  PENDING_INPUT_STORE_KEY,
  () => new Map(),
);
export type PlanIdentity = {
  planId: string;
  planRevision: number;
  accountId: string;
  sessionKey: string;
  expiresAt: number;
  selected?: boolean;
  confirmed?: boolean;
};
export const plans = resolveGlobalSingleton<Map<string, PlanIdentity>>(
  Symbol.for("openclaw.enterprise.delegationPlans"),
  () => new Map(),
);

/** Exact-version closure; a new unadmitted HTTP request must not cancel a running plan. */
export function invalidateEnterpriseDelegationPlan(
  params: Pick<PlanIdentity, "accountId" | "sessionKey" | "planId" | "planRevision">,
): boolean {
  const plan = plans.get(params.planId);
  if (
    !plan ||
    plan.accountId !== params.accountId ||
    plan.sessionKey !== params.sessionKey ||
    plan.planRevision !== params.planRevision
  ) {
    return false;
  }
  plans.delete(params.planId);
  const key = pendingInputKey(params.accountId, params.sessionKey);
  if (pendingClarifications.get(key)?.planId === params.planId) {
    pendingClarifications.delete(key);
  }
  return true;
}

export function invalidateEnterpriseDelegationRouterRuntimeState(): {
  decisions: number;
  pendingClarifications: number;
} {
  const result = {
    decisions: decisions.size,
    pendingClarifications: pendingClarifications.size,
  };
  decisions.clear();
  pendingClarifications.clear();
  plans.clear();
  return result;
}

export function pendingInputKey(accountId: string, sessionKey: string): string {
  return `${accountId}\0${sessionKey}`;
}

export function createDecision(
  params: Omit<EnterpriseDelegationDecision, "id" | "createdAt">,
): EnterpriseDelegationDecision {
  const now = Date.now();
  for (const [id, item] of decisions) {
    if (item.createdAt + DECISION_TTL_MS < now || item.consumedAt) {
      decisions.delete(id);
    }
  }
  const decision = { ...params, id: generateSecureUuid(), createdAt: now };
  decisions.set(decision.id, decision);
  return decision;
}

type DecisionScopeParams = {
  decisionId: string;
  accountId: string;
  personalAgentId: string;
  sessionKey: string;
  parentRunId: string;
  config: OpenClawConfig;
  stateOptions?: OpenClawStateDatabaseOptions;
};

type DecisionLookup =
  | { ok: true; decision: EnterpriseDelegationDecision }
  | { ok: false; reasonCode: string };

function lookupDecision(
  params: DecisionScopeParams,
  options?: { allowConsumed?: boolean },
): DecisionLookup {
  const decision = decisions.get(params.decisionId);
  if (!decision) {
    return { ok: false, reasonCode: "decision_not_found" };
  }
  if (decision.consumedAt && !options?.allowConsumed) {
    return { ok: false, reasonCode: "decision_replayed" };
  }
  if (decision.createdAt + DECISION_TTL_MS < Date.now()) {
    return { ok: false, reasonCode: "decision_expired" };
  }
  if (
    decision.accountId !== params.accountId ||
    normalizeAgentId(decision.personalAgentId) !== normalizeAgentId(params.personalAgentId) ||
    decision.sessionKey !== params.sessionKey ||
    decision.parentRunId !== params.parentRunId
  ) {
    return { ok: false, reasonCode: "decision_scope_mismatch" };
  }
  const validation = validateCurrentDecisionPolicy({
    decision,
    config: params.config,
    stateOptions: params.stateOptions,
  });
  if (!validation.ok) {
    return validation;
  }
  return { ok: true, decision };
}

/**
 * Read the exact server-approved routes without consuming the one-shot decision.
 * This is intentionally a bounded projection: coordinator prompt code never gets
 * required-input/evidence internals or a mutable decision object.
 */
export function readEnterpriseDelegationDecisionRoutes(
  params: DecisionScopeParams,
):
  | { ok: true; routes: readonly EnterpriseDelegationApprovedRoute[] }
  | { ok: false; reasonCode: string } {
  const lookup = lookupDecision(params);
  if (!lookup.ok) {
    return lookup;
  }
  return {
    ok: true,
    routes: lookup.decision.routes.map(({ agentId, agentName, task }) => ({
      agentId,
      agentName,
      task,
    })),
  };
}

export function consumeEnterpriseDelegationDecision(params: {
  decisionId: string;
  accountId: string;
  personalAgentId: string;
  sessionKey: string;
  parentRunId: string;
  config: OpenClawConfig;
  stateOptions?: OpenClawStateDatabaseOptions;
}): { ok: true; decision: EnterpriseDelegationDecision } | { ok: false; reasonCode: string } {
  const lookup = lookupDecision(params);
  if (!lookup.ok) {
    if (lookup.reasonCode === "decision_expired") {
      decisions.delete(params.decisionId);
    }
    return lookup;
  }
  const decision = lookup.decision;
  decision.consumedAt = Date.now();
  return { ok: true, decision };
}

type DecisionValidationParams = {
  decision: EnterpriseDelegationDecision;
  config: OpenClawConfig;
  stateOptions?: OpenClawStateDatabaseOptions;
};
type DecisionValidation = { ok: true } | { ok: false; reasonCode: string };

function validateCurrentDecisionPolicy(params: DecisionValidationParams): DecisionValidation {
  const { decision } = params;
  const plan = plans.get(decision.planId);
  if (
    !plan ||
    plan.planRevision !== decision.planRevision ||
    plan.accountId !== decision.accountId ||
    plan.sessionKey !== decision.sessionKey ||
    plan.expiresAt <= Date.now()
  ) {
    return { ok: false, reasonCode: "decision_plan_changed" };
  }
  const account = getEnterpriseAccountById(decision.accountId, params.stateOptions);
  const policy = readEnterpriseDelegationPolicy(params.stateOptions);
  if (
    !account?.enabled ||
    !account.personalAgentEnabled ||
    account.policyRevision !== decision.accountPolicyRevision ||
    policy.rollout !== "on" ||
    policy.revision !== decision.policyRevision
  ) {
    return { ok: false, reasonCode: "decision_policy_changed" };
  }
  const live = new Map(
    listEnterpriseDelegationCandidates(params.config, account, params.stateOptions).map(
      (candidate) => [candidate.agentId, candidate] as const,
    ),
  );
  for (const route of decision.routes) {
    const candidate = live.get(route.agentId);
    if (
      !candidate?.routable ||
      candidate.profileRevision !== route.profileRevision ||
      candidate.overrideRevision !== route.overrideRevision
    ) {
      return { ok: false, reasonCode: "decision_target_changed" };
    }
  }
  return { ok: true };
}

/** Re-read DB-backed policy after async child setup; never authorize or consume a new decision. */
export function validateEnterpriseDelegationDecisionForDispatch(
  params: DecisionValidationParams,
): DecisionValidation {
  if (params.decision.consumedAt === undefined) {
    return { ok: false, reasonCode: "decision_not_consumed" };
  }
  if (params.decision.createdAt + DECISION_TTL_MS < Date.now()) {
    return { ok: false, reasonCode: "decision_expired" };
  }
  // Account/policy/override revisions are live DB reads. Profiles use the caller's
  // config snapshot; this does not claim to reload host configuration after setup.
  return validateCurrentDecisionPolicy(params);
}
