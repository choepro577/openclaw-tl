import crypto from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { normalizeCronJobCreate } from "../../cron/normalize.js";
import { callGateway } from "../../gateway/call.js";
import { normalizeAgentId, resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import { listAgentIds } from "../agent-scope.js";
import { stringEnum } from "../schema/typebox.js";
import { buildCrossAgentUserDeliveryRelay } from "../user-delivery-relay.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";
import { createAgentToAgentPolicy, resolveSessionToolContext } from "./sessions-helpers.js";

const CRON_SCHEDULE_KINDS = ["at", "every", "cron"] as const;

const UserScheduleToolScheduleSchema = Type.Object(
  {
    kind: Type.Optional(stringEnum(CRON_SCHEDULE_KINDS)),
    at: Type.Optional(Type.String()),
    atMs: Type.Optional(Type.Union([Type.Number(), Type.String()])),
    everyMs: Type.Optional(Type.Number()),
    anchorMs: Type.Optional(Type.Number()),
    expr: Type.Optional(Type.String()),
    cron: Type.Optional(Type.String()),
    tz: Type.Optional(Type.String()),
    staggerMs: Type.Optional(Type.Number()),
  },
  { additionalProperties: true },
);

const UserScheduleToolSchema = Type.Object({
  agentId: Type.String({ minLength: 1, maxLength: 64 }),
  name: Type.String({ minLength: 1 }),
  schedule: UserScheduleToolScheduleSchema,
  message: Type.String(),
  description: Type.Optional(Type.String()),
});

export function createUserScheduleTool(opts?: {
  agentSessionKey?: string;
  sandboxed?: boolean;
  config?: OpenClawConfig;
}): AnyAgentTool {
  return {
    label: "User Schedule",
    name: "user_schedule",
    description:
      "Schedule a future reminder or follow-up for another agent's user. Pass the core content to convey; runtime adds cross-agent source attribution when the job fires.",
    parameters: UserScheduleToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const targetAgentId = normalizeAgentId(
        readStringParam(params, "agentId", { required: true }),
      );
      const name = readStringParam(params, "name", { required: true });
      const message = readStringParam(params, "message", { required: true });
      const description = readStringParam(params, "description");
      const schedule =
        params.schedule && typeof params.schedule === "object"
          ? (params.schedule as Record<string, unknown>)
          : null;
      const { cfg, effectiveRequesterKey } = resolveSessionToolContext(opts);
      const requesterAgentId = resolveAgentIdFromSessionKey(effectiveRequesterKey);

      if (!schedule) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: "user_schedule requires a schedule object.",
          agentId: targetAgentId,
        });
      }

      if (targetAgentId === requesterAgentId) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: "user_schedule does not allow self-targeting in v1.",
          agentId: targetAgentId,
        });
      }

      const knownAgentIds = new Set(listAgentIds(cfg).map((id) => normalizeAgentId(id)));
      if (!knownAgentIds.has(targetAgentId)) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: `Unknown agentId: ${targetAgentId}`,
          agentId: targetAgentId,
        });
      }

      const a2aPolicy = createAgentToAgentPolicy(cfg);
      if (!a2aPolicy.enabled) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "forbidden",
          error:
            "Agent-to-agent messaging is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent delivery.",
          agentId: targetAgentId,
        });
      }
      if (!a2aPolicy.isAllowed(requesterAgentId, targetAgentId)) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "forbidden",
          error: "Agent-to-agent messaging denied by tools.agentToAgent.allow.",
          agentId: targetAgentId,
        });
      }

      const job =
        normalizeCronJobCreate({
          agentId: targetAgentId,
          name,
          description,
          schedule,
          sessionTarget: "active-user",
          payload: {
            kind: "agentTurn",
            message,
            relay: buildCrossAgentUserDeliveryRelay({
              cfg,
              sourceAgentId: requesterAgentId,
              targetAgentId,
              deliveryKind: "schedule",
            }),
          },
        }) ?? null;
      if (!job || !job.schedule || !job.payload) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: "user_schedule could not build a valid cron job payload.",
          agentId: targetAgentId,
        });
      }

      try {
        const created = await callGateway({
          method: "cron.add",
          params: job,
          timeoutMs: 10_000,
        });
        return jsonResult(created ?? { ok: true });
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: messageText,
          agentId: targetAgentId,
        });
      }
    },
  };
}
