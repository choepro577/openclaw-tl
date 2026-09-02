import { createHash } from "node:crypto";
import { loadConfig } from "../../config/config.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import { getActiveEnterpriseSession } from "../auth/session-store.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { createEnterpriseKnowledgeEmbeddingRuntime } from "./embedding-runtime.js";
import {
  getKnowledgeGenerationEvidence,
  searchKnowledgeGenerationIndexWithGraph,
  verifyKnowledgeCitationReference,
} from "./index-store.js";
import {
  KNOWLEDGE_SEARCH_DEFAULT_RESULTS,
  KNOWLEDGE_SEARCH_MAX_RESULTS,
} from "./knowledge-limits.js";
import {
  listPublishedZonesForAgent,
  resolveKnowledgeCitationAccessForAgent,
  type KnowledgeAgentZoneAccess,
} from "./knowledge-store.js";
import {
  EnterpriseKnowledgeError,
  type KnowledgeCitation,
  type KnowledgeSearchHit,
  type KnowledgeSearchResult,
} from "./knowledge-types.js";

export type EnterpriseKnowledgeAuthority = {
  readonly accountId: string;
  readonly sessionId: string;
  readonly agentResourceKey: string;
  hasPublishedKnowledge(): boolean;
  search(input: {
    query: string;
    maxResults?: number;
    zoneSlug?: string;
  }): Promise<KnowledgeSearchResult>;
  get(citationId: string): Promise<{
    evidence: string;
    citation: KnowledgeCitation;
    trust: "untrusted_enterprise_data";
  }>;
  evaluateGrounding(
    finalText: string,
  ): { action: "accept" } | { action: "revise"; instruction: string };
};

const NO_EVIDENCE_MESSAGE = "Không tìm thấy thông tin trong vùng tri thức được cấp";

function privacyHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function revisionFingerprint(zones: KnowledgeAgentZoneAccess[]): string {
  return zones
    .map((zone) => `${zone.zoneId}:${zone.accessRevision}:${zone.activePublicationId}`)
    .toSorted()
    .join("|");
}

function mergeZoneHits(hits: KnowledgeSearchHit[][], maxResults: number): KnowledgeSearchHit[] {
  const merged = hits.flat();
  const best = new Map<string, KnowledgeSearchHit>();
  for (const hit of merged) {
    const existing = best.get(hit.citationId);
    if (!existing || hit.score > existing.score) {
      best.set(hit.citationId, hit);
    }
  }
  return [...best.values()]
    .toSorted((left, right) => right.score - left.score)
    .slice(0, maxResults);
}

export function createEnterpriseKnowledgeAuthority(params: {
  accountId: string;
  sessionId: string;
  agentResourceKey: string;
  /** Effective request-scoped config. Falls back to disk config for non-Gateway callers. */
  config?: OpenClawConfig;
  databaseOptions?: OpenClawStateDatabaseOptions;
  env?: NodeJS.ProcessEnv;
}): EnterpriseKnowledgeAuthority {
  const options = params.databaseOptions ?? {};
  const env = params.env ?? process.env;
  const searchedCitationIds = new Set<string>();
  const retrievedCitationIds = new Set<string>();
  let searchAttempted = false;
  let groundingRevisionRequested = false;

  function assertRuntimeAccess(): void {
    const session = getActiveEnterpriseSession(params.sessionId, options, "user");
    const account = getEnterpriseAccountById(params.accountId, options);
    if (!session || session.accountId !== params.accountId || !account?.enabled) {
      throw new EnterpriseKnowledgeError(
        "SESSION_REVOKED",
        401,
        "The Enterprise session is no longer valid.",
      );
    }
    if (
      !resolveEnterpriseResourceAccess(account, "agent", params.agentResourceKey, options).allowed
    ) {
      throw new EnterpriseKnowledgeError(
        "AGENT_ACCESS_REVOKED",
        403,
        "Access to this Agent was revoked.",
      );
    }
  }

  function zones(zoneSlug?: string): KnowledgeAgentZoneAccess[] {
    assertRuntimeAccess();
    return listPublishedZonesForAgent(params.agentResourceKey, zoneSlug, options);
  }

  return {
    accountId: params.accountId,
    sessionId: params.sessionId,
    agentResourceKey: params.agentResourceKey,
    hasPublishedKnowledge() {
      try {
        return zones().length > 0;
      } catch {
        return false;
      }
    },
    async search(input) {
      const startedAt = Date.now();
      searchAttempted = true;
      const query = input.query.normalize("NFC").trim();
      try {
        if (!query || query.length > 2_000) {
          throw new EnterpriseKnowledgeError(
            "INVALID_QUERY",
            422,
            "Query must contain 1-2000 characters.",
          );
        }
        const maxResults = Math.max(
          1,
          Math.min(
            input.maxResults ?? KNOWLEDGE_SEARCH_DEFAULT_RESULTS,
            KNOWLEDGE_SEARCH_MAX_RESULTS,
          ),
        );
        const initial = zones(input.zoneSlug);
        const before = revisionFingerprint(initial);
        const config = params.config ?? loadConfig();
        const vectorTargets = initial.filter((zone) => zone.vectorStatus === "ready");
        const externalAllowed =
          vectorTargets.length > 0 &&
          vectorTargets.every((zone) => zone.egressPolicy === "external_allowed");
        const embedding = await createEnterpriseKnowledgeEmbeddingRuntime({
          config,
          externalAllowed,
        });
        let queryVector: number[] | undefined;
        try {
          if (!embedding.unavailableReason && vectorTargets.length > 0) {
            queryVector = await embedding.embedQuery(query);
          }
        } catch {
          queryVector = undefined;
        }
        const settled = await Promise.allSettled(
          initial.map((zone) =>
            searchKnowledgeGenerationIndexWithGraph({
              zoneId: zone.zoneId,
              zoneLabel: zone.name,
              generationId: zone.generationId,
              publicationId: zone.activePublicationId,
              publishedAt: zone.publishedAt,
              query,
              queryVector,
              queryEmbeddingIdentity: embedding.identity ?? undefined,
              vectorExtensionPath: config.memory?.search?.store?.vector?.extensionPath,
              maxResults,
              env,
              databaseOptions: options,
              graphExpansion: config.enterprise?.knowledge?.graph?.agentExpansion ?? "off",
            }),
          ),
        );
        await embedding.close();
        const successful = settled
          .filter(
            (
              result,
            ): result is PromiseFulfilledResult<
              Awaited<ReturnType<typeof searchKnowledgeGenerationIndexWithGraph>>
            > => result.status === "fulfilled",
          )
          .map((result) => result.value);
        const unavailable = settled.length - successful.length;
        const current = zones(input.zoneSlug);
        if (before !== revisionFingerprint(current)) {
          throw new EnterpriseKnowledgeError(
            "KNOWLEDGE_ACCESS_CHANGED",
            409,
            "Knowledge access changed during search. Retry.",
          );
        }
        const hits = mergeZoneHits(
          successful.map((result) => result.hits),
          maxResults,
        );
        const graphTimeouts = successful.filter(
          (result) => result.graph.availability === "timeout",
        ).length;
        const graphTruncated = successful.some((result) => result.graph.truncated);
        const graphAvailability: KnowledgeSearchResult["coverage"]["graphAvailability"] =
          graphTimeouts
            ? "timeout"
            : successful.some((result) => result.graph.availability === "available")
              ? "available"
              : successful.every((result) => result.graph.availability === "disabled")
                ? "disabled"
                : "not_built";
        for (const hit of hits) {
          searchedCitationIds.add(hit.citationId);
        }
        const result: KnowledgeSearchResult = {
          hits,
          citations: hits.map((hit) => hit.citation),
          partial: unavailable > 0 || graphTimeouts > 0,
          coverage: {
            searchedZones: successful.length,
            unavailableZones: unavailable,
            graphSeedCount: successful.reduce((sum, item) => sum + item.graph.seedCount, 0),
            graphExpandedEvidenceCount: successful.reduce(
              (sum, item) => sum + item.graph.expandedEvidenceCount,
              0,
            ),
            graphMaxDepth: Math.max(0, ...successful.map((item) => item.graph.maxDepth)),
            graphTruncated,
            graphAvailability,
          },
          warnings: [
            ...(unavailable > 0
              ? [`${unavailable} authorized knowledge zone(s) were temporarily unavailable.`]
              : []),
            ...(graphTimeouts > 0
              ? ["Knowledge graph expansion timed out; hybrid search results were preserved."]
              : []),
            ...(graphTruncated
              ? ["Knowledge graph expansion reached a bounded traversal limit."]
              : []),
          ],
        };
        appendEnterpriseAuditEvent(
          {
            actorAccountId: params.accountId,
            actorSessionId: params.sessionId,
            action: "knowledge.agent.search",
            targetType: "agent",
            targetId: params.agentResourceKey,
            requestId: null,
            before: null,
            after: {
              queryHash: privacyHash(query),
              resultReferenceHashes: hits.map((hit) => privacyHash(hit.citationId)),
              resultCount: hits.length,
              searchedZones: successful.length,
              unavailableZones: unavailable,
              partial: unavailable > 0 || graphTimeouts > 0,
              graphSeedCount: result.coverage.graphSeedCount,
              graphExpandedEvidenceCount: result.coverage.graphExpandedEvidenceCount,
              graphMaxDepth: result.coverage.graphMaxDepth,
              graphTruncated,
              graphAvailability,
              latencyMs: Date.now() - startedAt,
            },
            outcome: "success",
          },
          options,
        );
        return result;
      } catch (error) {
        appendEnterpriseAuditEvent(
          {
            actorAccountId: params.accountId,
            actorSessionId: params.sessionId,
            action: "knowledge.agent.search",
            targetType: "agent",
            targetId: params.agentResourceKey,
            requestId: null,
            before: null,
            after: {
              queryHash: privacyHash(query),
              code: error instanceof EnterpriseKnowledgeError ? error.code : "SEARCH_FAILED",
              latencyMs: Date.now() - startedAt,
            },
            outcome: "failure",
          },
          options,
        );
        throw error;
      }
    },
    async get(citationId) {
      const startedAt = Date.now();
      const citationReferenceHash = privacyHash(citationId);
      try {
        assertRuntimeAccess();
        const reference = verifyKnowledgeCitationReference(citationId, options);
        if (!reference) {
          throw new EnterpriseKnowledgeError("CITATION_INVALID", 404, "Citation not found.");
        }
        const before = resolveKnowledgeCitationAccessForAgent(
          {
            agentResourceKey: params.agentResourceKey,
            zoneId: reference.zoneId,
            publicationId: reference.publicationId,
            generationId: reference.generationId,
          },
          options,
        );
        if (!before) {
          throw new EnterpriseKnowledgeError("CITATION_NOT_AUTHORIZED", 404, "Citation not found.");
        }
        const evidence = getKnowledgeGenerationEvidence({ reference, env });
        if (!evidence) {
          throw new EnterpriseKnowledgeError("CITATION_NOT_FOUND", 404, "Citation not found.");
        }
        assertRuntimeAccess();
        const after = resolveKnowledgeCitationAccessForAgent(
          {
            agentResourceKey: params.agentResourceKey,
            zoneId: reference.zoneId,
            publicationId: reference.publicationId,
            generationId: reference.generationId,
          },
          options,
        );
        if (!after || after.accessRevision !== before.accessRevision) {
          throw new EnterpriseKnowledgeError(
            "KNOWLEDGE_ACCESS_CHANGED",
            409,
            "Knowledge access changed during retrieval. Retry.",
          );
        }
        retrievedCitationIds.add(citationId);
        appendEnterpriseAuditEvent(
          {
            actorAccountId: params.accountId,
            actorSessionId: params.sessionId,
            action: "knowledge.agent.get",
            targetType: "agent",
            targetId: params.agentResourceKey,
            requestId: null,
            before: null,
            after: { citationReferenceHash, latencyMs: Date.now() - startedAt },
            outcome: "success",
          },
          options,
        );
        return {
          evidence: evidence.text,
          citation: {
            citationId,
            zoneLabel: after.zoneLabel,
            sourceTitle: evidence.sourceTitle,
            sourceVersion: reference.sourceVersion,
            locator: evidence.locator,
            publishedAt: new Date(after.publishedAt).toISOString(),
          },
          trust: "untrusted_enterprise_data",
        };
      } catch (error) {
        appendEnterpriseAuditEvent(
          {
            actorAccountId: params.accountId,
            actorSessionId: params.sessionId,
            action: "knowledge.agent.get",
            targetType: "agent",
            targetId: params.agentResourceKey,
            requestId: null,
            before: null,
            after: {
              citationReferenceHash,
              code: error instanceof EnterpriseKnowledgeError ? error.code : "GET_FAILED",
              latencyMs: Date.now() - startedAt,
            },
            outcome: "failure",
          },
          options,
        );
        throw error;
      }
    },
    evaluateGrounding(finalText) {
      if (!searchAttempted || groundingRevisionRequested) {
        return { action: "accept" };
      }
      const normalized = finalText.trim();
      if (searchedCitationIds.size > 0 && retrievedCitationIds.size === 0) {
        groundingRevisionRequested = true;
        return {
          action: "revise",
          instruction:
            'Enterprise Knowledge search results are references only. Call enterprise_knowledge_get for each citation used, then answer only from successfully retrieved evidence. If no evidence can be retrieved, reply exactly: "Không tìm thấy thông tin trong vùng tri thức được cấp". Put any non-enterprise information in a separate section titled "Kiến thức chung".',
        };
      }
      if (searchedCitationIds.size === 0 && !normalized.includes(NO_EVIDENCE_MESSAGE)) {
        groundingRevisionRequested = true;
        return {
          action: "revise",
          instruction: `No Enterprise Knowledge evidence was found. Include the exact sentence "${NO_EVIDENCE_MESSAGE}". If you add non-enterprise information, put it in a separate section titled "Kiến thức chung".`,
        };
      }
      return { action: "accept" };
    },
  };
}
