import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnterprisePortalCsrfToken } from "../../enterprise/services/enterprise-api.ts";
import type { EnterpriseUserAuthAccount } from "../services/user-enterprise-api.ts";
import {
  cancelThienlyAttempt,
  completeThienlyAttempt,
  linkThienlyAttempt,
  loadThienlyAuthConfig,
  startThienlyLogin,
  THIENLY_ATTEMPT_STORAGE_KEY,
} from "../services/user-thienly-auth.ts";
import "../auth/thienly-login-flow.ts";
import "../auth/user-auth-gate.ts";

type FlowElement = HTMLElement & { updateComplete: Promise<unknown> };

const account: EnterpriseUserAuthAccount = {
  username: "tl001",
  displayName: "Nguyễn Văn An",
  role: "employee",
  mustChangePassword: false,
  enabled: true,
  personalAgentEnabled: true,
};

function attempt(phase: "waiting" | "link_required" | "agent" | "ready" | "completed") {
  return {
    id: "attempt-1",
    phase,
    events: [{ sequence: 1, phase, at: Date.now() }],
    expiresAt: Date.now() + 600_000,
    ...(phase === "link_required" || phase === "completed"
      ? { account: { username: "tl001", displayName: "Nguyễn Văn An" } }
      : {}),
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Thiên Lý authentication API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the configured endpoints and JSON contracts", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ enabled: true }))
      .mockResolvedValueOnce(
        jsonResponse({
          attempt: attempt("waiting"),
          authorizationUrl: "https://thienly.test/connect",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ attempt: attempt("agent") }))
      .mockResolvedValueOnce(jsonResponse({ account, csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(jsonResponse({ attempt: attempt("completed") }));

    await expect(loadThienlyAuthConfig()).resolves.toEqual({ enabled: true });
    await expect(startThienlyLogin()).resolves.toMatchObject({
      attempt: { id: "attempt-1", phase: "waiting" },
      authorizationUrl: "https://thienly.test/connect",
    });
    await expect(linkThienlyAttempt("attempt/1", "current-password")).resolves.toMatchObject({
      attempt: { phase: "agent" },
    });
    await expect(completeThienlyAttempt("attempt/1")).resolves.toEqual({
      account,
      csrfToken: "csrf-1",
    });
    await expect(cancelThienlyAttempt("attempt/1")).resolves.toMatchObject({
      attempt: { phase: "completed" },
    });

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/auth/user/thienly/config",
      "/api/auth/user/thienly/start",
      "/api/auth/user/thienly/attempts/attempt%2F1/link",
      "/api/auth/user/thienly/attempts/attempt%2F1/complete",
      "/api/auth/user/thienly/attempts/attempt%2F1/cancel",
    ]);
    expect(fetchMock.mock.calls.slice(1).map(([, init]) => (init as RequestInit).method)).toEqual([
      "POST",
      "POST",
      "POST",
      "POST",
    ]);
    expect(JSON.parse((fetchMock.mock.calls[2]![1] as RequestInit).body as string)).toEqual({
      password: "current-password",
    });
    expect(getEnterprisePortalCsrfToken("user")).toBe("csrf-1");
    expect((fetchMock.mock.calls[0]![1] as RequestInit | undefined)?.credentials).toBe("include");
  });
});

describe("Thiên Lý login flow", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    sessionStorage.clear();
    vi.stubGlobal("sessionStorage", window.sessionStorage);
    vi.stubGlobal("EventSource", undefined);
  });

  afterEach(() => {
    document.body.replaceChildren();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens the authorization popup from the click and persists the attempt for recovery", async () => {
    const popup = {
      closed: false,
      location: { href: "about:blank" },
      close: vi.fn(),
    } as unknown as Window;
    const open = vi.fn(() => popup);
    vi.stubGlobal("open", open);
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        attempt: attempt("waiting"),
        authorizationUrl: "https://thienly.test/connect",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const flow = document.createElement(
      "openclaw-enterprise-user-thienly-login-flow",
    ) as FlowElement;
    document.body.append(flow);
    await flow.updateComplete;

    flow.querySelector<HTMLButtonElement>(".eu-thienly-login")!.click();
    expect(open).toHaveBeenCalledWith("about:blank", "_blank", "popup,width=560,height=760");
    await vi.waitFor(async () => {
      await flow.updateComplete;
      expect(flow.querySelector(".eu-thienly-flow")).not.toBeNull();
    });

    expect((popup.location as Location).href).toBe("https://thienly.test/connect");
    expect(sessionStorage.getItem(THIENLY_ATTEMPT_STORAGE_KEY)).toBe("attempt-1");
    expect(flow.textContent).toContain("Waiting for Thiên Lý confirmation");
  });

  it("keeps a ready attempt mounted when reload races the complete cookie response", async () => {
    sessionStorage.setItem(THIENLY_ATTEMPT_STORAGE_KEY, "attempt-1");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/enterprise/status") {
        return jsonResponse({ enabled: true, bootstrapped: true });
      }
      if (path === "/api/auth/user/thienly/attempts/attempt-1") {
        return jsonResponse({ attempt: attempt("ready") });
      }
      if (path === "/api/auth/user/thienly/config") {
        return jsonResponse({ enabled: false });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const gate = document.createElement("openclaw-enterprise-user-auth-gate") as FlowElement;
    document.body.append(gate);
    await vi.waitFor(async () => {
      await gate.updateComplete;
      expect(gate.querySelector("openclaw-enterprise-user-login-page")).not.toBeNull();
    });

    expect(
      fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost").pathname),
    ).not.toContain("/api/auth/user/me");
  });

  it("waits three seconds after complete resolves before authenticating", async () => {
    vi.useFakeTimers();
    const popup = {
      closed: false,
      location: { href: "about:blank" },
      close: vi.fn(),
    } as unknown as Window;
    vi.stubGlobal(
      "open",
      vi.fn(() => popup),
    );
    let resolveComplete!: (response: Response) => void;
    const completeResponse = new Promise<Response>((resolve) => {
      resolveComplete = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/auth/user/thienly/start") {
        return jsonResponse({
          attempt: attempt("ready"),
          authorizationUrl: "https://thienly.test/connect",
        });
      }
      if (path === "/api/auth/user/thienly/attempts/attempt-1/complete") {
        return completeResponse;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const onAuthenticated = vi.fn();
    const flow = document.createElement(
      "openclaw-enterprise-user-thienly-login-flow",
    ) as FlowElement & { onAuthenticated?: typeof onAuthenticated };
    flow.onAuthenticated = onAuthenticated;
    document.body.append(flow);
    await flow.updateComplete;

    flow.querySelector<HTMLButtonElement>(".eu-thienly-login")!.click();
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(
      "/api/auth/user/thienly/attempts/attempt-1/complete",
    );

    await vi.advanceTimersByTimeAsync(2_000);
    expect(onAuthenticated).not.toHaveBeenCalled();

    resolveComplete(jsonResponse({ account, csrfToken: "csrf-1" }));
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
    expect(onAuthenticated).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2_999);
    expect(onAuthenticated).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onAuthenticated).toHaveBeenCalledOnce();
    expect(onAuthenticated).toHaveBeenCalledWith(account);
  });
});
