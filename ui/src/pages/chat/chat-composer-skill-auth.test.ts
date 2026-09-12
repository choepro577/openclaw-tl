import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSkillAuthControl } from "../enterprise-user/components/skill-auth-control.ts";
import {
  disconnectEnterpriseSkill,
  loginEnterpriseSkill,
} from "../enterprise-user/services/user-enterprise-api.ts";
import { handlePageGatewayEvent } from "./chat-state-events.ts";
import type { ChatPageHost } from "./chat-state-host.ts";

vi.mock("../enterprise/state/enterprise-ui-access.ts", () => ({
  isEnterpriseUiActive: () => true,
}));

vi.mock("../enterprise-user/services/user-enterprise-api.ts", () => ({
  disconnectEnterpriseSkill: vi.fn(async () => undefined),
  loginEnterpriseSkill: vi.fn(async () => ({ connected: true, expiresAt: 1_800_000_000_000 })),
}));

afterEach(() => {
  document.body.replaceChildren();
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
});
