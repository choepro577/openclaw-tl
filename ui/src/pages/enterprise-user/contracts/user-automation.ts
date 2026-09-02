import type { AgentKey } from "./user-agent.ts";

export type UserAutomationSchedule =
  | { kind: "once"; at: string }
  | { kind: "interval"; everyMinutes: number };

export type UserAutomation = {
  id: string;
  revision: string;
  name: string;
  enabled: boolean;
  agentKey: AgentKey | null;
  agentAccess: "ready" | "removed";
  schedule: UserAutomationSchedule;
  prompt: string;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastResult: "ok" | "error" | "skipped" | null;
  lastError: string | null;
};

export type UserAutomationInput = {
  name: string;
  enabled: boolean;
  agentKey: AgentKey;
  schedule: UserAutomationSchedule;
  prompt: string;
};
