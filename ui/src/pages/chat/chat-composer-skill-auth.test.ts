import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSkillAuthControl } from "../enterprise-user/components/skill-auth-control.ts";
import {
  disconnectEnterpriseSkill,
  loginEnterpriseSkill,
} from "../enterprise-user/services/user-enterprise-api.ts";
import { EnterpriseApiError } from "../enterprise/services/enterprise-api.ts";
import { handlePageGatewayEvent } from "./chat-state-events.ts";
import type { ChatPageHost } from "./chat-state-host.ts";

vi.mock("../enterprise/state/enterprise-ui-access.ts", () => ({
  isEnterpriseUiActive: () => true,
}));

vi.mock("../enterprise-user/services/user-enterprise-api.ts", () => ({
  disconnectEnterpriseSkill: vi.fn(async () => undefined),
  loginEnterpriseSkill: vi.fn(async () => ({ connected: true, expiresAt: 1_800_000_000_000 })),
}));

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../../lib/toast.ts", () => ({ showToast }));

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function authEvent(parentSessionKey = "agent:personal:user") {
  return {
    type: "event" as const,
    event: "enterprise.skill-auth.required",
    payload: {
      requestId: crypto.randomUUID(),
      parentSessionKey,
      agentId: "purchase-order-skill",
      skillKey: "purchase-order-skill",
      fields: [
        { id: "username", label: "Tài khoản PO", type: "text" },
        { id: "password", label: "Mật khẩu", type: "password" },
      ],
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    },
  };
}

describe("generic Enterprise skill auth UI", () => {
  it("uses the typed child event and submits sensitive fields with requestId", async () => {
    const requestUpdate = vi.fn();
    const state = {
      sessionKey: "agent:personal:user",
      requestUpdate,
    } as unknown as ChatPageHost;
    const event = authEvent();
    handlePageGatewayEvent(state, event);
    expect(state.pendingSkillAuthRequest).toMatchObject({
      requestId: event.payload.requestId,
      agentId: "purchase-order-skill",
      skillKey: "purchase-order-skill",
    });

    const container = document.createElement("div");
    document.body.append(container);
    const resolved = vi.fn();
    const paint = () => {
      render(renderSkillAuthControl(state.pendingSkillAuthRequest, paint, resolved), container);
    };
    paint();
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[name="username"]')).not.toBeNull(),
    );

    const username = document.body.querySelector<HTMLInputElement>('input[name="username"]')!;
    const password = document.body.querySelector<HTMLInputElement>('input[name="password"]')!;
    expect(password.type).toBe("password");
    username.value = "po-user";
    username.dispatchEvent(new InputEvent("input", { bubbles: true }));
    password.value = "temporary-password";
    password.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document.body.querySelector<HTMLFormElement>("form")!.requestSubmit();
    await vi.waitFor(() => expect(loginEnterpriseSkill).toHaveBeenCalledOnce());

    expect(loginEnterpriseSkill).toHaveBeenCalledWith(
      event.payload.parentSessionKey,
      event.payload.skillKey,
      { username: "po-user", password: "temporary-password" },
      event.payload.requestId,
      expect.any(AbortSignal),
    );
    expect(resolved).toHaveBeenCalledWith(state.pendingSkillAuthRequest);
    expect(disconnectEnterpriseSkill).not.toHaveBeenCalled();
  });

  it("ignores auth events addressed to another parent session", () => {
    const state = {
      sessionKey: "agent:personal:user",
      requestUpdate: vi.fn(),
    } as unknown as ChatPageHost;
    handlePageGatewayEvent(state, authEvent("agent:personal:other"));
    expect(state.pendingSkillAuthRequest).toBeUndefined();
    expect(state.requestUpdate).not.toHaveBeenCalled();
  });

  it("keeps the fields editable and shows remaining attempts after invalid credentials", async () => {
    vi.mocked(loginEnterpriseSkill).mockRejectedValueOnce(
      new EnterpriseApiError(
        401,
        "SKILL_AUTH_INVALID",
        "Đăng nhập không thành công. Còn 4 lần thử.",
        {
          remainingAttempts: 4,
        },
      ),
    );
    const requestUpdate = vi.fn();
    const state = { sessionKey: "agent:personal:user", requestUpdate } as unknown as ChatPageHost;
    const event = authEvent();
    handlePageGatewayEvent(state, event);
    const container = document.createElement("div");
    document.body.append(container);
    const resolved = vi.fn();
    const paint = () => {
      render(renderSkillAuthControl(state.pendingSkillAuthRequest, paint, resolved), container);
    };
    paint();
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[name="username"]')).not.toBeNull(),
    );

    const fillAndSubmit = (username: string, password: string) => {
      const usernameInput =
        document.body.querySelector<HTMLInputElement>('input[name="username"]')!;
      const passwordInput =
        document.body.querySelector<HTMLInputElement>('input[name="password"]')!;
      usernameInput.value = username;
      usernameInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      passwordInput.value = password;
      passwordInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      document.body.querySelector<HTMLFormElement>("form")!.requestSubmit();
    };

    fillAndSubmit("po-user", "wrong-password");
    await vi.waitFor(() => expect(loginEnterpriseSkill).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("4"),
    );
    expect(document.body.querySelector<HTMLInputElement>('input[name="username"]')?.disabled).toBe(
      false,
    );
    expect(document.body.querySelector<HTMLInputElement>('input[name="password"]')?.disabled).toBe(
      false,
    );

    fillAndSubmit("po-user", "correct-password");
    await vi.waitFor(() => expect(loginEnterpriseSkill).toHaveBeenCalledTimes(2));
    expect(resolved).toHaveBeenCalledWith(state.pendingSkillAuthRequest);
    expect(disconnectEnterpriseSkill).not.toHaveBeenCalled();
  });

  it("reenables the fields when a pending login request is aborted", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    vi.mocked(loginEnterpriseSkill).mockImplementationOnce(
      (_sessionKey, _skillKey, _fields, _requestId, signal) =>
        new Promise<never>((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Request timed out", "TimeoutError")),
            { once: true },
          );
        }),
    );
    const requestUpdate = vi.fn();
    const state = { sessionKey: "agent:personal:user", requestUpdate } as unknown as ChatPageHost;
    const event = authEvent();
    handlePageGatewayEvent(state, event);
    const container = document.createElement("div");
    document.body.append(container);
    const resolved = vi.fn();
    const paint = () => {
      render(renderSkillAuthControl(state.pendingSkillAuthRequest, paint, resolved), container);
    };
    paint();
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[name="username"]')).not.toBeNull(),
    );

    const usernameInput = document.body.querySelector<HTMLInputElement>('input[name="username"]')!;
    const passwordInput = document.body.querySelector<HTMLInputElement>('input[name="password"]')!;
    usernameInput.value = "po-user";
    usernameInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    passwordInput.value = "wrong-password";
    passwordInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document.body.querySelector<HTMLFormElement>("form")!.requestSubmit();

    await vi.waitFor(() => expect(loginEnterpriseSkill).toHaveBeenCalledOnce());
    expect(timeout).toHaveBeenCalledWith(60_000);
    expect(document.body.querySelector<HTMLInputElement>('input[name="password"]')?.disabled).toBe(
      true,
    );
    controller.abort();
    await vi.waitFor(() =>
      expect(
        document.body.querySelector<HTMLInputElement>('input[name="password"]')?.disabled,
      ).toBe(false),
    );
    expect(document.body.querySelector('[role="alert"]')).not.toBeNull();
    expect(resolved).not.toHaveBeenCalled();
    vi.mocked(loginEnterpriseSkill).mockResolvedValueOnce({
      connected: true,
      expiresAt: 1_800_000_000_000,
    });
    document.body.querySelector<HTMLFormElement>("form")!.requestSubmit();
    await vi.waitFor(() => expect(resolved).toHaveBeenCalledWith(state.pendingSkillAuthRequest));
  });

  it("closes and toasts the terminal auth failure without disconnecting again", async () => {
    vi.mocked(loginEnterpriseSkill).mockRejectedValueOnce(
      new EnterpriseApiError(
        401,
        "SKILL_AUTH_ATTEMPTS_EXHAUSTED",
        "Đã nhập sai 5 lần. Phiên đăng nhập skill này đã bị hủy.",
        { remainingAttempts: 0 },
      ),
    );
    const requestUpdate = vi.fn();
    const state = { sessionKey: "agent:personal:user", requestUpdate } as unknown as ChatPageHost;
    const event = authEvent();
    handlePageGatewayEvent(state, event);
    const container = document.createElement("div");
    document.body.append(container);
    const resolved = vi.fn();
    const paint = () => {
      render(renderSkillAuthControl(state.pendingSkillAuthRequest, paint, resolved), container);
    };
    paint();
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[name="username"]')).not.toBeNull(),
    );

    const usernameInput = document.body.querySelector<HTMLInputElement>('input[name="username"]')!;
    const passwordInput = document.body.querySelector<HTMLInputElement>('input[name="password"]')!;
    usernameInput.value = "po-user";
    usernameInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    passwordInput.value = "wrong-password";
    passwordInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document.body.querySelector<HTMLFormElement>("form")!.requestSubmit();

    await vi.waitFor(() => expect(loginEnterpriseSkill).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(resolved).toHaveBeenCalledWith(state.pendingSkillAuthRequest));
    expect(document.body.querySelector("openclaw-modal-dialog")).toBeNull();
    expect(showToast).toHaveBeenCalledWith({
      message: "Đã nhập sai 5 lần. Phiên đăng nhập skill này đã bị hủy.",
    });
    expect(disconnectEnterpriseSkill).not.toHaveBeenCalled();
  });
});
