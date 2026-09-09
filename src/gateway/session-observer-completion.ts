import { measureDiagnosticsTimelineSpan } from "../infra/diagnostics-timeline.js";
import {
  buildSessionObserverPrompt,
  normalizeSessionObserverModelOutput,
  SESSION_OBSERVER_MODEL_MAX_TOKENS,
  SESSION_OBSERVER_SYSTEM_PROMPT,
} from "./session-observer-model.js";
import type { SessionObserverDeps, SessionObserverState } from "./session-observer-model.js";

const MODEL_TIMEOUT_MS = 10_000;

type PrepareModel = NonNullable<SessionObserverDeps["prepareModel"]>;
type CompleteModel = NonNullable<SessionObserverDeps["completeModel"]>;

export function createSessionObserverCompletion(params: {
  getConfig: (state: SessionObserverState) => ReturnType<SessionObserverDeps["getConfig"]>;
  prepareModel: PrepareModel;
  completeModel: CompleteModel;
  now: () => number;
  setTimeoutFn: typeof setTimeout;
  clearTimeoutFn: typeof clearTimeout;
  isCurrent: (state: SessionObserverState) => boolean;
}) {
  const ensurePrepared = async (
    state: SessionObserverState,
    config: ReturnType<SessionObserverDeps["getConfig"]>,
  ) => {
    const modelRef = state.utilityModelRef;
    if (!modelRef) {
      throw new Error("session observer utility model is unavailable");
    }
    const preparedPromise = (state.preparedPromise ??= measureDiagnosticsTimelineSpan(
      "session.observer.prepare",
      () =>
        params.prepareModel({
          cfg: config,
          agentId: state.agentId,
          modelRef,
          useUtilityModel: true,
          allowMissingApiKeyModes: ["aws-sdk"],
        }),
      {
        config,
        omitErrorMessage: true,
        attributes: { runId: state.runId, role: "observer" },
      },
    ));
    try {
      return await preparedPromise;
    } catch (error) {
      if (state.preparedPromise === preparedPromise) {
        state.preparedPromise = undefined;
      }
      throw error;
    }
  };

  return async (state: SessionObserverState, notes: readonly string[]) => {
    const controller = new AbortController();
    state.activeController = controller;
    const timeout = params.setTimeoutFn(() => controller.abort(), MODEL_TIMEOUT_MS);
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(new Error("session observer model call timed out or was cancelled")),
        { once: true },
      );
    });
    try {
      const execute = async () => {
        const config = params.getConfig(state);
        const prepared = await ensurePrepared(state, config);
        if (!params.isCurrent(state) || controller.signal.aborted) {
          throw new Error("session observer state is no longer active");
        }
        if ("error" in prepared) {
          throw new Error(prepared.error);
        }
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (!params.isCurrent(state) || controller.signal.aborted) {
            throw new Error("session observer state is no longer active");
          }
          const result = await measureDiagnosticsTimelineSpan(
            "session.observer.model",
            () =>
              params.completeModel({
                model: prepared.model,
                auth: prepared.auth,
                cfg: config,
                context: {
                  systemPrompt: SESSION_OBSERVER_SYSTEM_PROMPT,
                  messages: [
                    {
                      role: "user",
                      content: buildSessionObserverPrompt(state, notes),
                      timestamp: params.now(),
                    },
                  ],
                },
                options: {
                  maxTokens: Math.min(
                    SESSION_OBSERVER_MODEL_MAX_TOKENS,
                    Math.floor(prepared.model.maxTokens),
                  ),
                  temperature: 0.2,
                  signal: controller.signal,
                },
              }),
            {
              config,
              omitErrorMessage: true,
              attributes: { runId: state.runId, role: "observer", attempt: attempt + 1 },
            },
          );
          if (result.stopReason === "error") {
            throw new Error(result.errorMessage?.trim() || "session observer completion failed");
          }
          const text = result.content
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("")
            .trim();
          const parsed = normalizeSessionObserverModelOutput(text);
          if (parsed) {
            return parsed;
          }
        }
        throw new Error("session observer returned invalid JSON twice");
      };
      return await Promise.race([execute(), aborted]);
    } finally {
      params.clearTimeoutFn(timeout);
      if (state.activeController === controller) {
        state.activeController = undefined;
      }
    }
  };
}
