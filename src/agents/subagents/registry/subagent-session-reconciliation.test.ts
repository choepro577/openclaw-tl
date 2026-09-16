import { describe, expect, it } from "vitest";
import { resolveSessionStorePathCore, type SessionEntry } from "../../../config/sessions.js";
import type { OpenClawConfig } from "../../../config/types.openclaw.js";
import {
  resolveSubagentSessionCompletion,
  type SubagentSessionStoreCache,
} from "./subagent-session-reconciliation.js";

const configuredStorePath = "/virtual/openclaw-subagent-reconciliation-sessions.json";
const cfg = {
  session: { store: configuredStorePath },
} satisfies OpenClawConfig;
const storePath = resolveSessionStorePathCore(configuredStorePath, { agentId: "main" });

const terminalSession: SessionEntry = {
  sessionId: "sibling-session",
  status: "done",
  startedAt: 1_000,
  updatedAt: 2_000,
  endedAt: 2_000,
};

function resolveCompletion(childSessionKey: string, storedSessionKey: string) {
  const storeCache: SubagentSessionStoreCache = new Map([
    [storePath, { [storedSessionKey]: terminalSession }],
  ]);
  return resolveSubagentSessionCompletion({
    childSessionKey,
    fallbackEndedAt: 3_000,
    notBeforeMs: 0,
    storeCache,
    cfg,
  });
}

describe("subagent session reconciliation keys", () => {
  it("matches case-insensitive structural session-key segments", () => {
    expect(
      resolveCompletion("Agent:MAIN:telegram:group:ROOM", "agent:main:telegram:group:room"),
    ).toMatchObject({ endedAt: 2_000, outcome: { status: "ok" } });
  });

  it.each([
    {
      channel: "Matrix",
      childSessionKey: "agent:main:matrix:group:!Room:server",
      storedSessionKey: "agent:main:matrix:group:!room:server",
    },
    {
      channel: "Signal",
      childSessionKey: "agent:main:signal:group:AbCdEf==",
      storedSessionKey: "agent:main:signal:group:abcdef==",
    },
  ])(
    "does not match a case-distinct $channel opaque peer",
    ({ childSessionKey, storedSessionKey }) => {
      expect(resolveCompletion(childSessionKey, storedSessionKey)).toBeNull();
    },
  );
});

describe("subagent session reconciliation failures", () => {
  function resolveFailedCompletion(lastRunError?: string) {
    const failedSession: SessionEntry = {
      sessionId: "failed-session",
      status: "failed",
      startedAt: 1_000,
      updatedAt: 2_000,
      endedAt: 2_000,
      ...(lastRunError === undefined ? {} : { lastRunError }),
    };
    const storeCache: SubagentSessionStoreCache = new Map([
      [storePath, { "agent:main:subagent:failed": failedSession }],
    ]);
    return resolveSubagentSessionCompletion({
      childSessionKey: "agent:main:subagent:failed",
      fallbackEndedAt: 3_000,
      notBeforeMs: 0,
      storeCache,
      cfg,
    });
  }

  it("preserves the persisted terminal error for late registry reconciliation", () => {
    expect(resolveFailedCompletion("skill_script failed: entrypoint unavailable")).toMatchObject({
      outcome: { status: "error", error: "skill_script failed: entrypoint unavailable" },
    });
  });

  it("does not claim a restart when no persisted error identifies one", () => {
    expect(resolveFailedCompletion()).toMatchObject({
      outcome: { status: "error", error: "subagent session failed before registry settled" },
    });
  });

  it("normalizes legacy persisted error whitespace without changing its meaning", () => {
    expect(resolveFailedCompletion("provider failed\nwhile starting")).toMatchObject({
      outcome: { status: "error", error: "provider failed while starting" },
    });
  });

  it.each([
    ["blank", " \n\t", "subagent session failed before registry settled"],
    ["oversize", "x".repeat(200), "x".repeat(160)],
    [
      "raw API payload",
      '{"type":"error","error":{"type":"server_error","message":"Something exploded"}}',
      "LLM error server_error: Something exploded",
    ],
  ])("sanitizes persisted terminal error (%s)", (_label, input, expected) => {
    expect(resolveFailedCompletion(input)).toMatchObject({
      outcome: { status: "error", error: expected },
    });
  });
});
