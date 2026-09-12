type SubagentTerminalCallback = {
  childSessionKey: string;
  onTerminal: () => void;
};

const terminalCallbacks = new Map<string, SubagentTerminalCallback>();

export function registerSubagentTerminalCallback(params: {
  runId: string;
  childSessionKey: string;
  onTerminal: () => void;
}): void {
  terminalCallbacks.set(params.runId, {
    childSessionKey: params.childSessionKey,
    onTerminal: params.onTerminal,
  });
}

export function notifySubagentTerminalCallback(params: {
  runId: string;
  childSessionKey: string;
}): void {
  const registered = terminalCallbacks.get(params.runId);
  if (!registered || registered.childSessionKey !== params.childSessionKey) {
    return;
  }
  terminalCallbacks.delete(params.runId);
  registered.onTerminal();
}

export function rebindSubagentTerminalCallback(params: {
  fromRunId: string;
  toRunId: string;
  childSessionKey: string;
}): void {
  const registered = terminalCallbacks.get(params.fromRunId);
  if (!registered || registered.childSessionKey !== params.childSessionKey) {
    throw new Error("SUBAGENT_TERMINAL_CALLBACK_REBIND_FAILED");
  }
  if (params.fromRunId === params.toRunId) {
    return;
  }
  if (terminalCallbacks.has(params.toRunId)) {
    throw new Error("SUBAGENT_TERMINAL_CALLBACK_REBIND_COLLISION");
  }
  terminalCallbacks.delete(params.fromRunId);
  terminalCallbacks.set(params.toRunId, registered);
}

export function discardSubagentTerminalCallback(runId: string): void {
  terminalCallbacks.delete(runId);
}

export function resetSubagentTerminalCallbacksForTest(): void {
  terminalCallbacks.clear();
}
