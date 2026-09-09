/** Process-only evidence leases bound to exact managed children, never serialized with tasks. */
import { loadExactSessionEntry } from "../config/sessions/session-accessor.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  validateEnterpriseDelegationDecisionForDispatch,
  type EnterpriseDelegationDecision,
} from "../enterprise/delegation/delegation-router.js";
import type { EnterpriseEvidenceTransfer } from "../enterprise/knowledge/evidence-transfer.js";
import { subscribeKnowledgeAccessChanges } from "../enterprise/knowledge/knowledge-access-changes.js";
import { resolveGlobalSingleton } from "../shared/global-singleton.js";
import { resolveAdmittedRunActiveAssertion } from "./admitted-run-context.js";
import type { EmbeddedRunAttemptParams } from "./embedded-agent-runner/run/types.js";
import { resolveAgentRunSessionTarget } from "./run-session-target.js";

type EvidenceLease = {
  runId: string;
  agentId: string;
  packet: EnterpriseEvidenceTransfer;
  controller: AbortController;
  assertCurrent(): void;
  dispose(): void;
};
const leases = resolveGlobalSingleton<Map<string, EvidenceLease>>(
  Symbol.for("openclaw.enterprise.childEvidenceLeases"),
  () => new Map(),
);

export function registerEnterpriseDelegationEvidence(input: {
  childSessionKey: string;
  childRunId: string;
  childAgentId: string;
  packet: EnterpriseEvidenceTransfer;
  decision: EnterpriseDelegationDecision;
  config: OpenClawConfig;
}): void {
  if (leases.has(input.childSessionKey)) {
    throw new Error("EVIDENCE_CHILD_ALREADY_BOUND");
  }
  const controller = new AbortController();
  const assertCurrent = () => {
    controller.signal.throwIfAborted();
    input.packet.assertCurrent();
    const current = validateEnterpriseDelegationDecisionForDispatch({
      decision: input.decision,
      config: input.config,
    });
    if (!current.ok) {
      throw new Error("EVIDENCE_PLAN_NO_LONGER_AUTHORIZED");
    }
  };
  assertCurrent();
  const unsubscribe = subscribeKnowledgeAccessChanges((zoneId) => {
    if (!input.packet.zoneIds.includes(zoneId)) {
      return;
    }
    try {
      assertCurrent();
    } catch {
      controller.abort(new Error("EVIDENCE_ACCESS_REVOKED"));
    }
  });
  // Expiry is a one-shot lease deadline, not a child-completion polling loop.
  const timer = setTimeout(
    () => revokeEnterpriseDelegationEvidence(input.childSessionKey, input.childRunId),
    Math.max(0, input.decision.createdAt + 5 * 60_000 - Date.now()),
  );
  timer.unref();
  leases.set(input.childSessionKey, {
    runId: input.childRunId,
    agentId: input.childAgentId,
    packet: input.packet,
    controller,
    assertCurrent,
    dispose() {
      clearTimeout(timer);
      unsubscribe();
      input.packet.close();
      controller.abort(new Error("EVIDENCE_LEASE_CLOSED"));
    },
  });
}

export function revokeEnterpriseDelegationEvidence(
  childSessionKey: string,
  childRunId: string,
): void {
  const lease = leases.get(childSessionKey);
  if (!lease || lease.runId !== childRunId) {
    return;
  }
  leases.delete(childSessionKey);
  lease.dispose();
}

/** Called only after the child has its own admitted run, before selecting its model backend. */
export async function withEnterpriseDelegationEvidence(
  params: EmbeddedRunAttemptParams,
): Promise<EmbeddedRunAttemptParams> {
  if (!params.sessionKey?.includes(":subagent:")) {
    return params;
  }
  const lease = leases.get(params.sessionKey);
  if (!lease) {
    const target = await resolveAgentRunSessionTarget({
      agentId: params.agentId,
      config: params.config,
      missingSessionKey: "resolve-existing",
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      sessionTarget: params.sessionTarget,
      sessionFile: params.sessionFile,
    });
    if (loadExactSessionEntry(target)?.entry.requiresPrivateModelContext) {
      throw new Error(
        "EVIDENCE_LEASE_UNAVAILABLE: This assignment cannot continue without fresh authorized evidence.",
      );
    }
    return params;
  }
  if (lease.runId !== params.runId || lease.agentId !== params.agentId) {
    throw new Error("EVIDENCE_CHILD_IDENTITY_MISMATCH");
  }
  const signal = params.abortSignal
    ? AbortSignal.any([params.abortSignal, lease.controller.signal])
    : lease.controller.signal;
  const assertActive = resolveAdmittedRunActiveAssertion(params.admittedRunContext, signal);
  if (!assertActive) {
    throw new Error("EVIDENCE_CHILD_ADMISSION_REQUIRED");
  }
  assertActive();
  lease.assertCurrent();
  return {
    ...params,
    abortSignal: signal,
    resolvePrivateModelContext: async () => {
      assertActive();
      lease.assertCurrent();
      // Current transport contracts do not attest local execution. Unknown is deliberately denied for local_only.
      return lease.packet.resolve({ transport: "unknown" });
    },
  };
}
