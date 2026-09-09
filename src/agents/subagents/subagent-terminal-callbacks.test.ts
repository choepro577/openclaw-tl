import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discardSubagentTerminalCallback,
  notifySubagentTerminalCallback,
  registerSubagentTerminalCallback,
  resetSubagentTerminalCallbacksForTest,
} from "./subagent-terminal-callbacks.js";

afterEach(() => {
  resetSubagentTerminalCallbacksForTest();
});

describe("subagent terminal callbacks", () => {
  it("releases exactly the matching run and session once", () => {
    const onTerminal = vi.fn();
    registerSubagentTerminalCallback({
      runId: "child-run",
      childSessionKey: "child-session",
      onTerminal,
    });
    notifySubagentTerminalCallback({ runId: "child-run", childSessionKey: "other-session" });
    expect(onTerminal).not.toHaveBeenCalled();
    notifySubagentTerminalCallback({ runId: "child-run", childSessionKey: "child-session" });
    notifySubagentTerminalCallback({ runId: "child-run", childSessionKey: "child-session" });
    expect(onTerminal).toHaveBeenCalledTimes(1);
  });

  it("drops callbacks for child runs that fail before dispatch", () => {
    const onTerminal = vi.fn();
    registerSubagentTerminalCallback({
      runId: "aborted-run",
      childSessionKey: "aborted-session",
      onTerminal,
    });
    discardSubagentTerminalCallback("aborted-run");
    notifySubagentTerminalCallback({ runId: "aborted-run", childSessionKey: "aborted-session" });
    expect(onTerminal).not.toHaveBeenCalled();
  });
});
