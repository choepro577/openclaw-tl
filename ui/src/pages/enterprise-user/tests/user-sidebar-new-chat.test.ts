import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplicationContext } from "../../../app/context.ts";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { EnterpriseUserSidebar } from "../shell/user-sidebar.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

const mocks = vi.hoisted(() => ({
  listEnterpriseConversationProjects: vi.fn().mockResolvedValue([]),
  openUserAgentConversation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../adapters/chat-route-adapter.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../adapters/chat-route-adapter.ts")>()),
  openUserAgentConversation: mocks.openUserAgentConversation,
}));

vi.mock("../services/user-enterprise-api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/user-enterprise-api.ts")>()),
  listEnterpriseConversationProjects: mocks.listEnterpriseConversationProjects,
}));

const previousBootstrapState = userBootstrapStore.state;
const previousActiveKey = userAgentCatalogStore.activeKey;

const personalAgent = {
  key: "personal" as const,
  kind: "personal" as const,
  name: "Personal Agent",
  canonicalName: "Personal Agent",
  description: null,
  avatar: null,
  availability: "ready" as const,
  capabilityLabels: [],
  relationship: null,
  actions: {
    canChat: true,
    canSchedule: true,
    canEdit: true,
    canPersonalize: false,
  },
};

const sharedAgent = {
  key: "shared:legal" as const,
  kind: "shared" as const,
  name: "Legal Agent",
  canonicalName: "Legal Agent",
  description: null,
  avatar: null,
  availability: "ready" as const,
  capabilityLabels: [],
  relationship: null,
  actions: {
    canChat: true,
    canSchedule: true,
    canEdit: false,
    canPersonalize: true,
  },
};

function setReadyBootstrap(agents: EnterpriseUserAgent[] = [personalAgent]): void {
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
      agents,
      defaultAgentKey: "personal",
      policyRevision: 1,
      catalogRevision: "catalog-1",
    },
  };
}

function createContext() {
  const context = {
    navigate: vi.fn(),
    sessions: {
      refreshList: vi.fn().mockResolvedValue(undefined),
      subscribeList: vi.fn(() => () => undefined),
      listSnapshot: vi.fn(() => ({ result: { sessions: [] } })),
    },
  };
  // SAFETY: The sidebar and mocked adapter only read the methods supplied by this test double.
  return context as unknown as ApplicationContext;
}

async function renderSidebar(context: ApplicationContext, onNavigate = vi.fn()) {
  const sidebar = new EnterpriseUserSidebar();
  sidebar.context = context;
  sidebar.onNavigate = onNavigate;
  document.body.append(sidebar);
  await sidebar.updateComplete;
  return { onNavigate, sidebar };
}

afterEach(() => {
  document.body.replaceChildren();
  userBootstrapStore.state = previousBootstrapState;
  userAgentCatalogStore.activeKey = previousActiveKey;
  vi.clearAllMocks();
});

describe("Enterprise User sidebar New chat", () => {
  it("does not reload conversation projects when the active route changes", async () => {
    setReadyBootstrap();
    const context = createContext();
    const { sidebar } = await renderSidebar(context);

    await vi.waitFor(() => expect(mocks.listEnterpriseConversationProjects).toHaveBeenCalledOnce());
    sidebar.activeRoute = "cron";
    await sidebar.updateComplete;
    const organizer = sidebar.querySelector<HTMLElement>(
      "openclaw-enterprise-user-conversation-organizer",
    ) as (HTMLElement & { updateComplete: Promise<unknown> }) | null;
    await organizer?.updateComplete;

    expect(mocks.listEnterpriseConversationProjects).toHaveBeenCalledOnce();
  });

  it("opens a new chat directly with the active Agent", async () => {
    setReadyBootstrap();
    userAgentCatalogStore.activeKey = "personal";
    const context = createContext();
    const { onNavigate, sidebar } = await renderSidebar(context);

    sidebar.querySelector<HTMLButtonElement>(".eu-new-chat")?.click();

    await vi.waitFor(() => {
      expect(mocks.openUserAgentConversation).toHaveBeenCalledWith(context, "personal", "new");
    });
    expect(context.navigate).not.toHaveBeenCalledWith("new-session");
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("keeps the Agent picker fallback when no active Agent is selected", async () => {
    setReadyBootstrap();
    userAgentCatalogStore.activeKey = null;
    const context = createContext();
    const { onNavigate, sidebar } = await renderSidebar(context);

    sidebar.querySelector<HTMLButtonElement>(".eu-new-chat")?.click();

    expect(context.navigate).toHaveBeenCalledWith("new-session");
    expect(mocks.openUserAgentConversation).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("shows the creation error without leaving the current page", async () => {
    setReadyBootstrap();
    userAgentCatalogStore.activeKey = "personal";
    mocks.openUserAgentConversation.mockRejectedValueOnce(new Error("Could not create chat"));
    const context = createContext();
    const { onNavigate, sidebar } = await renderSidebar(context);

    sidebar.querySelector<HTMLButtonElement>(".eu-new-chat")?.click();

    await vi.waitFor(() => {
      expect(sidebar.querySelector('[role="alert"]')?.textContent).toContain(
        "Could not create chat",
      );
    });
    expect(context.navigate).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(sidebar.querySelector<HTMLButtonElement>(".eu-new-chat")?.disabled).toBe(false);
  });

  it("prevents New chat from racing an in-progress Agent switch", async () => {
    setReadyBootstrap([personalAgent, sharedAgent]);
    userAgentCatalogStore.activeKey = "personal";
    let finishSwitch: () => void = () => undefined;
    mocks.openUserAgentConversation.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSwitch = resolve;
        }),
    );
    const context = createContext();
    const { sidebar } = await renderSidebar(context);
    const legalAgentButton = Array.from(
      sidebar.querySelectorAll<HTMLButtonElement>(".eu-agent-switcher__select"),
    ).find((button) => button.textContent?.includes("Legal Agent"));

    legalAgentButton?.click();
    await sidebar.updateComplete;
    const newChatButton = sidebar.querySelector<HTMLButtonElement>(".eu-new-chat");

    expect(newChatButton?.disabled).toBe(true);
    newChatButton?.click();
    expect(mocks.openUserAgentConversation).toHaveBeenCalledOnce();
    expect(mocks.openUserAgentConversation).toHaveBeenCalledWith(
      context,
      "shared:legal",
      "resume-latest",
    );

    finishSwitch();
    await vi.waitFor(() => expect(newChatButton?.disabled).toBe(false));
  });
});
