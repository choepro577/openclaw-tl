import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { Type } from "typebox";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { EnterpriseDelegationExecutionOptions } from "../enterprise-delegation-execution.js";
import { getEnterpriseDelegationRuntime } from "../enterprise-delegation-runtime.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

function createSpecialistsListTool(options: EnterpriseDelegationExecutionOptions): AnyAgentTool {
  return {
    label: "Enterprise specialists",
    name: "enterprise_specialists_list",
    description:
      "List only specialist Agents explicitly assigned to the authenticated Enterprise account. This tool never grants access.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const delegation = readGatewayRequestRuntimeMetadata(options.config)?.enterpriseDelegation;
      if (
        !delegation ||
        normalizeAgentId(options.agentId) !== normalizeAgentId(delegation.personalAgentId)
      ) {
        return jsonResult({ status: "forbidden", reasonCode: "personal_agent_required" });
      }
      return jsonResult({
        status: "ok",
        specialists: delegation.specialists
          .filter((candidate) => candidate.effective)
          .map((candidate) => ({
            agentId: candidate.agentId,
            name: candidate.name,
            description: candidate.description,
            ready: candidate.routable,
            handlingMode: candidate.effectiveMode,
          })),
      });
    },
  };
}

export function createEnterpriseDelegationTools(
  options: EnterpriseDelegationExecutionOptions,
): AnyAgentTool[] {
  const delegation = readGatewayRequestRuntimeMetadata(options.config)?.enterpriseDelegation;
  if (
    !delegation ||
    normalizeAgentId(options.agentId) !== normalizeAgentId(delegation.personalAgentId) ||
    !delegation.specialists.some((candidate) => candidate.effective)
  ) {
    return [];
  }
  const tools = [createSpecialistsListTool(options)];
  const runtime = getEnterpriseDelegationRuntime();
  if (
    !runtime ||
    runtime.agentId !== options.agentId ||
    runtime.sessionKey !== (options.runSessionKey ?? options.agentSessionKey) ||
    runtime.runId !== options.runId
  ) {
    return tools;
  }
  tools.push({
    name: "enterprise_delegate",
    label: "Enterprise specialists",
    description:
      "Delegate focused tasks to assigned specialists. Submit independent tasks together to run in parallel. You may call again with a new, narrower follow-up after reviewing results. Use only the server-approved agentIds and canonical tasks in the current-turn directive. Only delegate work needed for the user's request; never copy private retrieved sources into task text. The server checks scope, inputs and handoff policy. Accepted launches continue in the background; continue independent work. When a specialist result is required and no independent work remains, end this turn; the result will return through the background completion flow. Do not poll or repeat accepted tasks. If clarification is required, ask the returned question and wait for the user.",
    parameters: Type.Object(
      {
        assignments: Type.Array(
          Type.Object(
            {
              agentId: Type.String({ minLength: 1, maxLength: 200 }),
              task: Type.String({ minLength: 1, maxLength: 4000 }),
            },
            { additionalProperties: false },
          ),
          { minItems: 1, maxItems: 3 },
        ),
      },
      { additionalProperties: false },
    ),
    execute: async (callId, raw) => {
      runtime.assertActive();
      const current = readGatewayRequestRuntimeMetadata(options.config)?.enterpriseDelegation;
      if (!current || current.personalAgentId !== runtime.agentId) {
        return jsonResult({ status: "forbidden", reasonCode: "personal_agent_required" });
      }
      if (
        !isRecord(raw) ||
        !Array.isArray(raw.assignments) ||
        raw.assignments.length < 1 ||
        raw.assignments.length > 3
      ) {
        return jsonResult({ status: "forbidden", reasonCode: "invalid_assignments" });
      }
      const assignments: { agentId: string; task: string }[] = [];
      for (const item of raw.assignments) {
        if (
          !isRecord(item) ||
          typeof item.agentId !== "string" ||
          item.agentId.length > 200 ||
          typeof item.task !== "string" ||
          !item.task.trim() ||
          item.task.length > 4000 ||
          !current.specialists.some(
            (candidate) => candidate.agentId === item.agentId && candidate.routable,
          )
        ) {
          return jsonResult({ status: "forbidden", reasonCode: "invalid_assignments" });
        }
        assignments.push({ agentId: item.agentId, task: item.task });
      }
      return runtime.execute(callId, assignments);
    },
  });
  return tools;
}
