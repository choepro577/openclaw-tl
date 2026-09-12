import { Type } from "typebox";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readEnterpriseDelegationChildAuthority } from "../../enterprise/delegation/delegation-mutation-guard.js";
import {
  EnterpriseSkillAuthRequestError,
  waitForEnterpriseSkillAuth,
} from "../../enterprise/skill-runtime/skill-auth-request.js";
import {
  EnterpriseSkillScriptError,
  extractRoutedSkillOperations,
  hashSkillScriptArguments,
  isEnterpriseHostScriptSource,
  requireEnterpriseSkillCapabilities,
  resolveEnterpriseSkillScript,
  runEnterpriseSkillScript,
} from "../../enterprise/skill-runtime/skill-script-runtime.js";
import type { SkillSnapshot } from "../../skills/types.js";
import type { OperationalRunInstanceRef } from "../admitted-run-context.js";
import type { AnyAgentTool } from "./common.js";
import { asToolParamsRecord, jsonResult, readToolStringParam } from "./common.js";
import { getGatewayToolCallerIdentity } from "./gateway-caller-context.js";

export const ENTERPRISE_SKILL_SCRIPT_TOOL_ID = "skill_script";

type SkillRunCalls = {
  calls: Map<string, { signature: string; result: Promise<ReturnType<typeof jsonResult>> }>;
  routedOperations: Map<string, Set<string>>;
};
// The admitted instance survives harness retries; IDs alone cannot revive a closed run.
const runCalls = new WeakMap<OperationalRunInstanceRef, SkillRunCalls>();

export function createEnterpriseSkillScriptTools(options: {
  config?: OpenClawConfig;
  snapshot?: SkillSnapshot;
  agentId: string;
  sessionId?: string;
  childSessionKey?: string;
  childRunId?: string;
  accountId: string;
  delegatedChild: boolean;
}): AnyAgentTool[] {
  let capability: ReturnType<typeof requireEnterpriseSkillCapabilities>;
  try {
    capability = requireEnterpriseSkillCapabilities(options);
  } catch (error) {
    if (error instanceof EnterpriseSkillScriptError) {
      return [];
    }
    throw error;
  }
  const snapshot = capability.skillsSnapshot;
  if (
    !snapshot.skills.some(
      (skill) => skill.scriptRuntime && skill.source && isEnterpriseHostScriptSource(skill.source),
    )
  ) {
    return [];
  }
  const localCalls: SkillRunCalls = { calls: new Map(), routedOperations: new Map() };
  return [
    {
      name: ENTERPRISE_SKILL_SCRIPT_TOOL_ID,
      label: "Skill Script",
      description:
        "Run a declared script entrypoint from a skill assigned to this Enterprise Shared Agent. Pass only the skill key, declared entrypoint, operation, and business arguments. Never pass a path, command, environment variable, password, or token. For operation entrypoints with routerOperation, call the router first and then only an operation returned by it.",
      parameters: Type.Object(
        {
          skill: Type.String({ minLength: 1, maxLength: 128 }),
          entrypoint: Type.String({ minLength: 1, maxLength: 128 }),
          operation: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
          arguments: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        },
        { additionalProperties: false },
      ),
      execute: async (toolCallId, raw, signal) => {
        const params = asToolParamsRecord(raw);
        const skillKey = readToolStringParam(params, "skill", { required: true });
        const entrypointName = readToolStringParam(params, "entrypoint", { required: true });
        const operation = readToolStringParam(params, "operation");
        const args = asToolParamsRecord(params.arguments);
        try {
          const caller = getGatewayToolCallerIdentity();
          const assertActive = () => {
            signal?.throwIfAborted();
            if (
              (options.childRunId && !caller?.receiptAuthority) ||
              caller?.receiptAuthority?.() === false
            ) {
              throw new EnterpriseSkillScriptError("SKILL_RUN_NOT_ADMITTED", 409);
            }
            if (requireEnterpriseSkillCapabilities(options).revision !== capability.revision) {
              throw new EnterpriseSkillScriptError("SKILL_CAPABILITY_CHANGED", 409);
            }
          };
          assertActive();
          const instance = caller?.operationalRunInstance;
          let state = instance ? runCalls.get(instance) : localCalls;
          if (!state) {
            state = { calls: new Map(), routedOperations: new Map() };
            runCalls.set(instance!, state);
          }
          const admittedState = state;
          const callKey = `${options.accountId}\0${options.agentId}\0${toolCallId}`;
          const signature = hashSkillScriptArguments({ revision: capability.revision, params });
          const previous = state.calls.get(callKey);
          if (previous) {
            if (previous.signature !== signature) {
              throw new EnterpriseSkillScriptError("SKILL_CALL_REPLAY_MISMATCH", 409);
            }
            return await previous.result;
          }
          const perform = async () => {
            const resolved = resolveEnterpriseSkillScript({
              snapshot,
              skillKey,
              entrypointName,
            });
            const routeKey = `${skillKey}\0${entrypointName}`;
            if (resolved.entrypoint.kind === "operation" && resolved.entrypoint.routerOperation) {
              const bypass = new Set([
                resolved.entrypoint.routerOperation,
                ...(resolved.entrypoint.routerBypassOperations ?? []),
              ]);
              if (
                !operation ||
                (!bypass.has(operation) &&
                  !admittedState.routedOperations.get(routeKey)?.has(operation))
              ) {
                return jsonResult({
                  status: "forbidden",
                  code: "SKILL_ROUTER_REQUIRED",
                  skill: skillKey,
                  entrypoint: entrypointName,
                });
              }
            }
            const run = () =>
              runEnterpriseSkillScript({
                config: options.config,
                snapshot,
                accountId: options.accountId,
                sessionId: options.sessionId,
                agentId: options.agentId,
                skillKey,
                entrypointName,
                operation,
                arguments: args,
                signal,
                expectedRevision: capability.revision,
                assertActive,
              });
            let result: unknown;
            try {
              result = await run();
            } catch (error) {
              if (
                !(error instanceof EnterpriseSkillScriptError) ||
                error.code !== "SKILL_AUTH_REQUIRED"
              ) {
                throw error;
              }
              const auth = resolved.skill.scriptRuntime?.auth;
              const authority = options.delegatedChild
                ? readEnterpriseDelegationChildAuthority({
                    childSessionKey: options.childSessionKey,
                    childRunId: options.childRunId,
                    childAgentId: options.agentId,
                  })
                : undefined;
              if (
                !auth ||
                !options.childSessionKey ||
                !options.childRunId ||
                (options.delegatedChild &&
                  (!authority || authority.accountId !== options.accountId))
              ) {
                throw error;
              }
              try {
                await waitForEnterpriseSkillAuth({
                  accountId: options.accountId,
                  parentSessionKey: authority?.parentSessionKey ?? options.childSessionKey,
                  childSessionKey: options.childSessionKey,
                  childRunId: options.childRunId,
                  agentId: options.agentId,
                  skillKey,
                  fields: auth.fields.map(({ id, label, type }) => ({ id, label, type })),
                  signal,
                  delegatedChild: options.delegatedChild,
                  assertActive,
                });
              } catch (waitError) {
                if (waitError instanceof EnterpriseSkillAuthRequestError) {
                  return jsonResult({ status: "error", code: waitError.code, skill: skillKey });
                }
                throw waitError;
              }
              // Resume the exact call once. A second 401 is returned, never looped.
              result = await run();
            }
            if (
              resolved.entrypoint.kind === "operation" &&
              operation === resolved.entrypoint.routerOperation
            ) {
              admittedState.routedOperations.set(routeKey, extractRoutedSkillOperations(result));
            }
            return jsonResult(result);
          };
          const result = Promise.resolve().then(perform);
          state.calls.set(callKey, { signature, result });
          return await result;
        } catch (error) {
          if (!(error instanceof EnterpriseSkillScriptError)) {
            throw error;
          }
          return jsonResult({
            status: "error",
            code: error.code,
            skill: skillKey,
            entrypoint: entrypointName,
          });
        }
      },
    },
  ];
}
