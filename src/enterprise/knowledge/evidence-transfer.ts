/** Request-private, revocable evidence selected from successful immutable retrievals. */
import { createHash } from "node:crypto";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import type { VerifiedKnowledgeCitationReference } from "./index-store.js";
import { isKnowledgeEvidenceTransferTarget } from "./knowledge-evidence-transfer-policy.js";
import { resolveKnowledgeEvidenceTransferGrant } from "./knowledge-evidence-transfer-store.js";
import { listPublishedZonesForAgent } from "./knowledge-store.js";
import { EnterpriseKnowledgeError, type KnowledgeCitation } from "./knowledge-types.js";

export type RetrievedKnowledgeEvidenceReceipt = {
  reference: VerifiedKnowledgeCitationReference;
  accessRevision: number;
  evidence: string;
  citation: KnowledgeCitation;
};
export type EnterpriseEvidenceSelection = { citationId: string; quote: string };
export type EnterpriseEvidenceTransferInput = {
  assignmentId: string;
  targetAgentResourceKey: string;
  selections: EnterpriseEvidenceSelection[];
};
/** Only host-resolved destination facts are accepted; model-authored transport claims are invalid. */
export type EnterpriseEvidenceDestination = { transport: "local" | "remote" | "unknown" };
export type EnterpriseEvidenceTransfer = Readonly<{
  zoneIds: readonly string[];
  assertAssignment(input: { assignmentId: string; targetAgentResourceKey: string }): void;
  assertCurrent(): void;
  resolve(destination: EnterpriseEvidenceDestination): string;
  close(): void;
}>;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function createKnowledgeEvidenceTransfer(params: {
  accountId: string;
  sessionId: string;
  agentResourceKey: string;
  config: OpenClawConfig;
  options: OpenClawStateDatabaseOptions;
  assertRuntimeAccess: () => void;
  receipts: ReadonlyMap<string, RetrievedKnowledgeEvidenceReceipt>;
  input: EnterpriseEvidenceTransferInput;
}): EnterpriseEvidenceTransfer {
  const input = {
    ...params.input,
    selections: params.input.selections.map((item) => ({ ...item })),
  };
  const reject: (code: string) => never = (code) => {
    appendEnterpriseAuditEvent(
      {
        actorAccountId: params.accountId,
        actorSessionId: params.sessionId,
        action: "knowledge.evidence_transfer.rejected",
        targetType: "agent",
        targetId: hash(input.targetAgentResourceKey),
        requestId: null,
        before: null,
        after: {
          assignmentHash: hash(input.assignmentId),
          targetAgentHash: hash(input.targetAgentResourceKey),
          excerptCount: input.selections.length,
          reasonCode: code,
        },
        outcome: "failure",
      },
      params.options,
    );
    throw new EnterpriseKnowledgeError(code, 403, code);
  };
  params.assertRuntimeAccess();
  if (
    !input.assignmentId.trim() ||
    !isKnowledgeEvidenceTransferTarget(params.config, input.targetAgentResourceKey)
  ) {
    reject("EVIDENCE_TRANSFER_NOT_AUTHORIZED");
  }
  if (
    input.selections.length < 1 ||
    input.selections.length > 4 ||
    input.selections.some((selection) => !selection.quote.trim() || selection.quote.length > 1_500)
  ) {
    reject("EVIDENCE_TRANSFER_LIMIT");
  }
  // Copy exact selections. Subsequent model/object mutation cannot widen a granted packet.
  let selected = input.selections.map(({ citationId, quote }) => {
    const receipt = params.receipts.get(citationId);
    if (!receipt) {
      reject("EVIDENCE_NOT_RETRIEVED");
    }
    if (!receipt.evidence.includes(quote)) {
      reject("EVIDENCE_QUOTE_MISMATCH");
    }
    return { receipt, quote };
  });
  const zoneIds = Object.freeze([
    ...new Set(selected.map(({ receipt }) => receipt.reference.zoneId)),
  ]);
  let closed = false;
  const assertCurrent = () => {
    if (closed) {
      reject("EVIDENCE_TRANSFER_CLOSED");
    }
    params.assertRuntimeAccess();
    const parentZones = listPublishedZonesForAgent(
      params.agentResourceKey,
      undefined,
      params.options,
    );
    for (const { receipt } of selected) {
      const { reference } = receipt;
      const parent = parentZones.find((zone) => zone.zoneId === reference.zoneId);
      const receive = resolveKnowledgeEvidenceTransferGrant(
        { zoneId: reference.zoneId, targetAgentResourceKey: input.targetAgentResourceKey },
        params.options,
      );
      if (!parent || !receive) {
        reject("EVIDENCE_TRANSFER_NOT_AUTHORIZED");
      }
      if (
        parent.accessRevision !== receipt.accessRevision ||
        receive.accessRevision !== receipt.accessRevision ||
        parent.activePublicationId !== reference.publicationId ||
        receive.activePublicationId !== reference.publicationId ||
        parent.generationId !== reference.generationId
      ) {
        reject("EVIDENCE_TRANSFER_STALE");
      }
    }
  };
  assertCurrent();
  let body = JSON.stringify({
    trust: "untrusted_enterprise_data",
    assignmentId: input.assignmentId,
    excerpts: selected.map(({ receipt, quote }) => ({
      sourceTitle: receipt.citation.sourceTitle,
      sourceVersion: receipt.citation.sourceVersion,
      publishedAt: receipt.citation.publishedAt,
      quote,
    })),
  });
  // Conservative UTF-8 estimate includes the complete serialized envelope, never truncates it.
  const estimatedTokens = Math.ceil(Buffer.byteLength(body, "utf8") / 3);
  if (estimatedTokens > 1_000) {
    reject("EVIDENCE_TRANSFER_LIMIT");
  }
  const audit = (action: "selected" | "used") =>
    appendEnterpriseAuditEvent(
      {
        actorAccountId: params.accountId,
        actorSessionId: params.sessionId,
        action: `knowledge.evidence_transfer.${action}`,
        targetType: "agent",
        targetId: input.targetAgentResourceKey,
        requestId: null,
        before: null,
        after: {
          assignmentHash: hash(input.assignmentId),
          zoneIds,
          packetHash: hash(body),
          excerptCount: selected.length,
          estimatedTokens,
        },
        outcome: "success",
      },
      params.options,
    );
  audit("selected");
  return Object.freeze({
    zoneIds,
    assertAssignment(assignment: { assignmentId: string; targetAgentResourceKey: string }) {
      assertCurrent();
      if (
        assignment.assignmentId !== input.assignmentId ||
        assignment.targetAgentResourceKey !== input.targetAgentResourceKey
      ) {
        reject("EVIDENCE_ASSIGNMENT_MISMATCH");
      }
    },
    assertCurrent,
    resolve(destination: EnterpriseEvidenceDestination) {
      assertCurrent();
      if (
        destination.transport !== "local" &&
        selected.some(
          ({ receipt }) =>
            resolveKnowledgeEvidenceTransferGrant(
              {
                zoneId: receipt.reference.zoneId,
                targetAgentResourceKey: input.targetAgentResourceKey,
              },
              params.options,
            )?.egressPolicy !== "external_allowed",
        )
      ) {
        reject("EVIDENCE_EGRESS_DENIED");
      }
      audit("used");
      return body;
    },
    close() {
      closed = true;
      body = "";
      selected = [];
    },
  });
}
