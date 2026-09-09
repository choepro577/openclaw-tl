import { describe, expect, it } from "vitest";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import { UserAgentCard } from "../components/user-agent-card.ts";
import { EnterpriseUserAgentSwitcher } from "../components/user-agent-switcher.ts";
import { EnterpriseUserSidebar } from "../shell/user-sidebar.ts";
import { EnterpriseUserTopbar } from "../shell/user-topbar.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

describe("Enterprise User shell composition", () => {
  it.each([
    ["sidebar", EnterpriseUserSidebar],
    ["topbar", EnterpriseUserTopbar],
    ["Agent switcher", EnterpriseUserAgentSwitcher],
    ["Agent card", UserAgentCard],
  ])("keeps the %s host out of inherited flex and grid geometry", (_label, ElementClass) => {
    const element = new ElementClass();

    expect(element).toBeInstanceOf(OpenClawLightDomContentsElement);
    element.connectedCallback();
    expect(element.style.display).toBe("contents");
    element.disconnectedCallback();
  });

  it("keeps every account-menu icon inside the canonical navigation icon slot", async () => {
    const element = new EnterpriseUserSidebar();
    document.body.append(element);

    try {
      await element.updateComplete;
      const accountActions = element.querySelectorAll(".eu-account-menu__items .nav-item");

      expect(accountActions.length).toBeGreaterThanOrEqual(4);
      for (const action of accountActions) {
        expect(action.querySelector(":scope > .nav-item__icon > svg")).not.toBeNull();
      }
    } finally {
      element.remove();
    }
  });

  it("puts Agents and Automations directly below New chat without redundant labels", async () => {
    const previousBootstrapState = userBootstrapStore.state;
    userBootstrapStore.state = {
      phase: "ready",
      data: {
        schemaVersion: 2,
        user: { username: "alex", displayName: "Alex", avatarUrl: null },
        features: {
          personalAgent: { enabled: true, editable: true },
          automations: true,
          notifications: true,
          knowledge: { enabled: false, memberships: 0 },
          plugins: { enabled: false },
        },
        agents: [],
        defaultAgentKey: null,
        policyRevision: 1,
        catalogRevision: "catalog-1",
      },
    };
    const element = new EnterpriseUserSidebar();
    document.body.append(element);

    try {
      await element.updateComplete;
      const newChat = element.querySelector(".eu-new-chat");
      const navigation = element.querySelector(".sidebar-nav");
      const navigationChildren = Array.from(navigation?.children ?? []);

      expect(element.querySelector(".eu-sidebar-brand")).toBeNull();
      expect(element.textContent).not.toContain("All conversations");
      expect(newChat?.nextElementSibling).toBe(navigation);
      expect(navigationChildren).toHaveLength(3);
      expect(navigationChildren.slice(0, 2).map((child) => child.textContent?.trim())).toEqual([
        "Agents",
        "Automations",
      ]);
      expect(navigationChildren.at(0)?.querySelector(".nav-item__icon > svg")).not.toBeNull();
      expect(navigationChildren.at(1)?.querySelector(".nav-item__icon > svg")).not.toBeNull();
      expect(navigationChildren.at(2)?.tagName).toBe(
        "OPENCLAW-ENTERPRISE-USER-CONVERSATION-ORGANIZER",
      );
    } finally {
      element.remove();
      userBootstrapStore.state = previousBootstrapState;
    }
  });
});
