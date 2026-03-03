import type { OpenClawConfig } from "../../config/config.js";
import { setCliSessionId } from "../../agents/cli-session.js";
import { lookupContextTokens } from "../../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS } from "../../agents/defaults.js";
import { isCliProvider } from "../../agents/model-selection.js";
import { deriveSessionTotalTokens, hasNonzeroUsage } from "../../agents/usage.js";
import { type SessionEntry, updateSessionStore } from "../../config/sessions.js";

type RunResult = Awaited<
  ReturnType<(typeof import("../../agents/pi-embedded.js"))["runEmbeddedPiAgent"]>
>;

export async function updateSessionStoreAfterAgentRun(params: {
  cfg: OpenClawConfig;
  contextTokensOverride?: number;
  sessionId: string;
  sessionKey: string;
  storePath: string;
  sessionStore: Record<string, SessionEntry>;
  defaultProvider: string;
  defaultModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  result: RunResult;
}) {
  const {
    cfg,
    sessionId,
    sessionKey,
    storePath,
    sessionStore,
    defaultProvider,
    defaultModel,
    fallbackProvider,
    fallbackModel,
    result,
  } = params;

  const usage = result.meta.agentMeta?.usage;
  const compactionsThisRun = Math.max(0, result.meta.agentMeta?.compactionCount ?? 0);
  const modelUsed = result.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
  const providerUsed = result.meta.agentMeta?.provider ?? fallbackProvider ?? defaultProvider;
  const contextTokens =
    params.contextTokensOverride ?? lookupContextTokens(modelUsed) ?? DEFAULT_CONTEXT_TOKENS;

  const next = await updateSessionStore(storePath, (store) => {
    // Always merge against the latest on-disk entry to avoid clobbering
    // concurrent updates (e.g. sessions.rename while a run is in flight).
    const baseEntry = store[sessionKey] ??
      sessionStore[sessionKey] ?? {
        sessionId,
        updatedAt: Date.now(),
      };
    const merged: SessionEntry = {
      ...baseEntry,
      sessionId,
      updatedAt: Date.now(),
      modelProvider: providerUsed,
      model: modelUsed,
      contextTokens,
    };
    if (isCliProvider(providerUsed, cfg)) {
      const cliSessionId = result.meta.agentMeta?.sessionId?.trim();
      if (cliSessionId) {
        setCliSessionId(merged, providerUsed, cliSessionId);
      }
    }
    merged.abortedLastRun = result.meta.aborted ?? false;
    if (hasNonzeroUsage(usage)) {
      const input = usage.input ?? 0;
      const output = usage.output ?? 0;
      merged.inputTokens = input;
      merged.outputTokens = output;
      merged.totalTokens =
        deriveSessionTotalTokens({
          usage,
          contextTokens,
        }) ?? input;
    }
    if (compactionsThisRun > 0) {
      merged.compactionCount = (baseEntry.compactionCount ?? 0) + compactionsThisRun;
    }
    store[sessionKey] = merged;
    return merged;
  });
  sessionStore[sessionKey] = next;
}
