import { describe, expect, it, vi } from "vitest";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { navigateToUserConversationSession } from "../adapters/chat-route-adapter.ts";

function createContext() {
  const calls: string[] = [];
  const context = {
    basePath: "/app",
    agents: { state: { agentsList: null } },
    sessions: { state: { agentId: null, result: null } },
    agentSelection: {
      state: { selectedId: null, scopeId: null },
      set: vi.fn((agentId: string | null) => calls.push(`agent:${agentId}`)),
      setScope: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    },
    gateway: {
      snapshot: { hello: null },
      setSessionKey: vi.fn((sessionKey: string) => calls.push(`session:${sessionKey}`)),
    },
    navigate: vi.fn((routeId: string) => calls.push(`route:${routeId}`)),
  } as unknown as ApplicationContext<RouteId>;
  return { calls, context };
}

describe("Enterprise User Chat route adapter", () => {
  it("keeps the canonical Agent, Gateway session, then route transition order", () => {
    const { calls, context } = createContext();
    const sessionKey = "agent:enterprise-personal-runtime:dashboard:session-1";

    navigateToUserConversationSession(context, sessionKey, { focusComposer: true });

    expect(calls).toEqual([
      "agent:enterprise-personal-runtime",
      `session:${sessionKey}`,
      "route:chat",
    ]);
    expect(context.navigate).toHaveBeenCalledWith(
      "chat",
      expect.objectContaining({
        pathname: "/app/chat/enterprise-personal-runtime/dashboard/session-1",
        search: expect.stringContaining("__openclawComposerFocus=1"),
      }),
    );
  });

  it("rejects a session without a canonical Agent owner before changing application state", () => {
    const { calls, context } = createContext();

    expect(() => navigateToUserConversationSession(context, "main")).toThrow();
    expect(calls).toEqual([]);
  });

  it("merges a Codex starter prompt into the new chat draft handoff", () => {
    const { context } = createContext();
    const sessionKey = "agent:enterprise-personal-runtime:main:session-2";
    const prompt = "Find my unread Gmail messages from today.";

    navigateToUserConversationSession(context, sessionKey, {
      focusComposer: true,
      draft: prompt,
    });

    expect(context.navigate).toHaveBeenCalledWith(
      "chat",
      expect.objectContaining({ search: expect.any(String) }),
    );
    const calls = (context.navigate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const search = new URLSearchParams(
      String((calls[0]?.[1] as { search?: string } | undefined)?.search ?? ""),
    );
    expect(search.get("draft")).toBe(prompt);
    expect(search.get("__openclawComposerFocus")).toBe("1");
  });
});
