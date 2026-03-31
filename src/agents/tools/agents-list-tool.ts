import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
import {
  DEFAULT_AGENT_ID,
  normalizeAgentId,
  parseAgentSessionKey,
} from "../../routing/session-key.js";
import { resolveAgentConfig } from "../agent-scope.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";
import {
  createAgentToAgentPolicy,
  resolveInternalSessionKey,
  resolveMainSessionAlias,
} from "./sessions-helpers.js";

const AgentsListToolSchema = Type.Object({});

type AgentListEntry = {
  id: string;
  name?: string;
  configured: boolean;
};

export function createAgentsListTool(opts?: {
  agentSessionKey?: string;
  /** Explicit agent ID override for cron/hook sessions. */
  requesterAgentIdOverride?: string;
  config?: OpenClawConfig;
}): AnyAgentTool {
  return {
    label: "Agents",
    name: "agents_list",
    description:
      "List agent ids for two purposes: `agents` is the `sessions_spawn`/subagent target list, while `crossAgentTargets` is the configured cross-agent delivery target list for `a_to_a_send`, `user_notify`, and `user_schedule`.",
    parameters: AgentsListToolSchema,
    execute: async () => {
      const cfg = opts?.config ?? loadConfig();
      const { mainKey, alias } = resolveMainSessionAlias(cfg);
      const requesterInternalKey =
        typeof opts?.agentSessionKey === "string" && opts.agentSessionKey.trim()
          ? resolveInternalSessionKey({
              key: opts.agentSessionKey,
              alias,
              mainKey,
            })
          : alias;
      const requesterAgentId = normalizeAgentId(
        opts?.requesterAgentIdOverride ??
          parseAgentSessionKey(requesterInternalKey)?.agentId ??
          DEFAULT_AGENT_ID,
      );

      const allowAgents = resolveAgentConfig(cfg, requesterAgentId)?.subagents?.allowAgents ?? [];
      const allowAny = allowAgents.some((value) => value.trim() === "*");
      const allowSet = new Set(
        allowAgents
          .filter((value) => value.trim() && value.trim() !== "*")
          .map((value) => normalizeAgentId(value)),
      );

      const configuredAgents = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
      const configuredIds = configuredAgents.map((entry) => normalizeAgentId(entry.id));
      const configuredNameMap = new Map<string, string>();
      for (const entry of configuredAgents) {
        const name = entry?.name?.trim() ?? "";
        if (!name) {
          continue;
        }
        configuredNameMap.set(normalizeAgentId(entry.id), name);
      }

      const allowed = new Set<string>();
      allowed.add(requesterAgentId);
      if (allowAny) {
        for (const id of configuredIds) {
          allowed.add(id);
        }
      } else {
        for (const id of allowSet) {
          allowed.add(id);
        }
      }

      const all = Array.from(allowed);
      const rest = all
        .filter((id) => id !== requesterAgentId)
        .toSorted((a, b) => a.localeCompare(b));
      const ordered = [requesterAgentId, ...rest];
      const agents: AgentListEntry[] = ordered.map((id) => ({
        id,
        name: configuredNameMap.get(id),
        configured: configuredIds.includes(id),
      }));

      const a2aPolicy = createAgentToAgentPolicy(cfg);
      const crossAgentTargets: AgentListEntry[] = configuredIds
        .filter((id) => id !== requesterAgentId && a2aPolicy.isAllowed(requesterAgentId, id))
        .toSorted((a, b) => a.localeCompare(b))
        .map((id) => ({
          id,
          name: configuredNameMap.get(id),
          configured: true,
        }));

      return jsonResult({
        requester: requesterAgentId,
        allowAny,
        agents,
        crossAgentEnabled: a2aPolicy.enabled,
        crossAgentTargets,
        notes: [
          'The "agents" field is only for sessions_spawn / subagent targeting.',
          'For a_to_a_send, user_notify, and user_schedule, use "crossAgentTargets" instead.',
        ],
      });
    },
  };
}
