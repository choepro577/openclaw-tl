import { AsyncLocalStorage } from "node:async_hooks";
import type { AnyAgentTool } from "./tools/common.js";

export type EnterpriseDelegationAssignment = { agentId: string; task: string };
export type EnterpriseDelegationRuntime = {
  agentId: string;
  sessionKey: string;
  runId: string;
  assertActive: () => void;
  execute: (
    callId: string,
    assignments: EnterpriseDelegationAssignment[],
  ) => ReturnType<AnyAgentTool["execute"]>;
};

// Capabilities belong to an admitted attempt, never to model arguments or config.
const runtime = new AsyncLocalStorage<EnterpriseDelegationRuntime>();
export const withEnterpriseDelegationRuntime = <T>(
  value: EnterpriseDelegationRuntime,
  run: () => T,
): T => runtime.run(value, run);
export const getEnterpriseDelegationRuntime = (): EnterpriseDelegationRuntime | undefined =>
  runtime.getStore();
