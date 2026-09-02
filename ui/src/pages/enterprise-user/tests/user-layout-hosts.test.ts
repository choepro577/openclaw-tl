import { describe, expect, it } from "vitest";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import { UserAgentCard } from "../components/user-agent-card.ts";
import { EnterpriseUserAgentSwitcher } from "../components/user-agent-switcher.ts";
import { EnterpriseUserSidebar } from "../shell/user-sidebar.ts";
import { EnterpriseUserTopbar } from "../shell/user-topbar.ts";

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

  it("keeps All conversations iconless without removing the remaining page icons", async () => {
    const element = new EnterpriseUserSidebar();
    document.body.append(element);

    try {
      await element.updateComplete;
      const pageActions = Array.from(
        element.querySelectorAll<HTMLElement>(".sidebar-nav > .nav-item"),
      );
      const allConversations = pageActions.find((action) =>
        action.textContent?.includes("All conversations"),
      );
      const agents = pageActions.find((action) => action.textContent?.trim() === "Agents");

      expect(allConversations?.querySelector(":scope > .nav-item__icon")).toBeNull();
      expect(agents?.querySelector(":scope > .nav-item__icon > svg")).not.toBeNull();
    } finally {
      element.remove();
    }
  });
});
