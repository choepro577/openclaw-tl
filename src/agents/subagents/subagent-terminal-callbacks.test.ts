import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discardSubagentTerminalCallback,
  notifySubagentTerminalCallback,
  rebindSubagentTerminalCallback,
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

  it("moves a provisional callback to the exact Gateway run", () => {
    const onTerminal = vi.fn();
    registerSubagentTerminalCallback({
      runId: "anticipated-run",
      childSessionKey: "child-session",
      onTerminal,
    });
    rebindSubagentTerminalCallback({
      fromRunId: "anticipated-run",
      toRunId: "gateway-run",
      childSessionKey: "child-session",
    });

    notifySubagentTerminalCallback({
      runId: "anticipated-run",
      childSessionKey: "child-session",
    });
    expect(onTerminal).not.toHaveBeenCalled();
    notifySubagentTerminalCallback({ runId: "gateway-run", childSessionKey: "child-session" });
    expect(onTerminal).toHaveBeenCalledOnce();
  });

  it("fails closed on a session mismatch or run collision", () => {
    registerSubagentTerminalCallback({
      runId: "anticipated-run",
      childSessionKey: "child-session",
      onTerminal: vi.fn(),
    });
    registerSubagentTerminalCallback({
      runId: "occupied-run",
      childSessionKey: "other-session",
      onTerminal: vi.fn(),
    });
    expect(() =>
      rebindSubagentTerminalCallback({
        fromRunId: "anticipated-run",
        toRunId: "gateway-run",
        childSessionKey: "other-session",
      }),
    ).toThrow("SUBAGENT_TERMINAL_CALLBACK_REBIND_FAILED");
    expect(() =>
      rebindSubagentTerminalCallback({
        fromRunId: "anticipated-run",
        toRunId: "occupied-run",
        childSessionKey: "child-session",
      }),
    ).toThrow("SUBAGENT_TERMINAL_CALLBACK_REBIND_COLLISION");
  });
});
