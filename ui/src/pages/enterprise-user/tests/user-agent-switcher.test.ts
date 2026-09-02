import { describe, expect, it, vi } from "vitest";
import type { ApplicationContext } from "../../../app/context.ts";
import {
  EnterpriseUserAgentSwitcher,
  filterUserAgents,
} from "../components/user-agent-switcher.ts";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

type MutableAgentSwitcher = {
  context?: ApplicationContext;
  error: string;
  closeMenu(): void;
  showPersonalAgent(): void;
};

const agents: EnterpriseUserAgent[] = [
  {
    key: "personal",
    kind: "personal",
    name: "Trợ lý của tôi",
    canonicalName: "Trợ lý của tôi",
    description: "Hỗ trợ công việc hằng ngày",
    avatar: "🦞",
    availability: "ready",
    capabilityLabels: [],
    relationship: null,
    actions: { canChat: true, canSchedule: true, canEdit: true, canPersonalize: false },
  },
  {
    key: "shared:legal",
    kind: "shared",
    name: "Legal Agent",
    canonicalName: "Legal Agent",
    description: "Company policy",
    avatar: null,
    availability: "ready",
    capabilityLabels: ["Tìm kiếm tài liệu"],
    relationship: {
      revision: 0,
      agentAlias: "",
      agentSelfReference: "",
      userAddress: "Hieu",
      customInstructions: "",
      updatedAt: 0,
    },
    actions: { canChat: true, canSchedule: true, canEdit: false, canPersonalize: true },
  },
];

describe("Enterprise User Agent switcher", () => {
  it("searches friendly identity and capability labels without technical keys", () => {
    expect(filterUserAgents(agents, "tài liệu").map((agent) => agent.key)).toEqual([
      "shared:legal",
    ]);
    expect(filterUserAgents(agents, "công việc").map((agent) => agent.key)).toEqual(["personal"]);
  });

  it("returns the catalog order when the search is blank", () => {
    expect(filterUserAgents(agents, "  ")).toEqual(agents);
  });

  it("clears a stale chat-switch error when opening Agent settings", () => {
    const navigate = vi.fn();
    const switcher = new EnterpriseUserAgentSwitcher() as unknown as MutableAgentSwitcher;
    switcher.context = { navigate } as unknown as ApplicationContext;
    switcher.error = "Không tìm thấy agent.";
    switcher.closeMenu = vi.fn();

    switcher.showPersonalAgent();

    expect(switcher.error).toBe("");
    expect(navigate).toHaveBeenCalledWith("agents");
  });

  it("only renders an edit action for the Personal Agent", async () => {
    const previousBootstrapState = userBootstrapStore.state;
    const previousActiveKey = userAgentCatalogStore.activeKey;
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
        },
        agents,
        defaultAgentKey: "personal",
        policyRevision: 1,
        catalogRevision: "catalog-1",
      },
    };
    userAgentCatalogStore.activeKey = "personal";
    const switcher = new EnterpriseUserAgentSwitcher();
    document.body.append(switcher);
    try {
      await switcher.updateComplete;
      const rows = Array.from(switcher.querySelectorAll(".eu-agent-switcher__row"));
      const personalRow = rows.find((row) => row.textContent?.includes("Trợ lý của tôi"));
      const sharedRow = rows.find((row) => row.textContent?.includes("Legal Agent"));

      expect(personalRow?.querySelector(".eu-agent-switcher__action")).not.toBeNull();
      expect(sharedRow?.querySelector(".eu-agent-switcher__action")).toBeNull();
      expect(switcher.querySelectorAll(".eu-agent-switcher__action")).toHaveLength(1);
    } finally {
      switcher.remove();
      userAgentCatalogStore.activeKey = previousActiveKey;
      userBootstrapStore.state = previousBootstrapState;
    }
  });

  it("dismisses the floating menu with Escape or an outside pointer", async () => {
    const load = vi.spyOn(userAgentCatalogStore, "load").mockResolvedValue();
    const switcher = new EnterpriseUserAgentSwitcher();
    document.body.append(switcher);
    try {
      await switcher.updateComplete;
      const details = switcher.querySelector("details")!;
      const summary = details.querySelector("summary")!;

      details.open = true;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(details.open).toBe(false);
      expect(document.activeElement).toBe(summary);

      details.open = true;
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
      expect(details.open).toBe(false);
    } finally {
      switcher.remove();
      load.mockRestore();
    }
  });
});
