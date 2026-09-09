/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import { UserAgentCard } from "../components/user-agent-card.ts";
import { canRequestUserAgentAccess, type EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { UserAgentsLibraryPage } from "../pages/agents/agents-library-page.ts";
import { UserSharedAgentDetailPage } from "../pages/agents/shared-agent-detail-page.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

const mocks = vi.hoisted(() => ({
  loadBootstrap: vi.fn(),
  loadRelationship: vi.fn(),
  requestAccess: vi.fn(),
  cancelAccess: vi.fn(),
  saveRelationship: vi.fn(),
}));

vi.mock("../services/user-enterprise-api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/user-enterprise-api.ts")>()),
  loadEnterpriseUserBootstrapV2: mocks.loadBootstrap,
  loadSharedAgentRelationship: mocks.loadRelationship,
  requestEnterpriseUserAgentAccess: mocks.requestAccess,
  cancelEnterpriseUserAgentAccessRequest: mocks.cancelAccess,
  saveSharedAgentRelationship: mocks.saveRelationship,
}));

const deniedAgent: EnterpriseUserAgent = {
  key: "shared:legal",
  kind: "shared",
  name: "Legal Agent",
  canonicalName: "Legal Agent",
  description: "Company policy",
  avatar: null,
  availability: "ready",
  capabilityLabels: ["Search policy"],
  relationship: null,
  access: { allowed: false, reason: "Admin approval required", request: null },
  actions: {
    canChat: false,
    canRequestAccess: true,
    canSchedule: false,
    canEdit: false,
    canPersonalize: false,
  },
};

const initialUrl = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;

const libraryBootstrap = {
  schemaVersion: 2 as const,
  user: { username: "alex", displayName: "Alex", avatarUrl: null },
  features: {
    personalAgent: { enabled: true, editable: true },
    automations: true,
    notifications: false,
    knowledge: { enabled: false, memberships: 0 },
    plugins: { enabled: false },
  },
  agents: [
    {
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
    },
    deniedAgent,
  ],
  defaultAgentKey: "personal" as const,
  policyRevision: 1,
  catalogRevision: "catalog-1",
};

function request(state: "pending" | "approved" | "rejected" | "cancelled") {
  return {
    id: "request-1",
    agentKey: deniedAgent.key,
    state,
    decisionReason: state === "rejected" ? "Ask your manager to approve this Agent." : null,
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    decidedAt: state === "pending" ? null : 2,
  } as const;
}

afterEach(async () => {
  await i18n.setLocale("en");
  document.body.replaceChildren();
  globalThis.history.replaceState({}, "", initialUrl);
  userBootstrapStore.state = { phase: "idle" };
  userAgentCatalogStore.activeKey = null;
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe("Enterprise User Agent access request UI", () => {
  it.each([
    ["library card", UserAgentCard],
    ["detail page", UserSharedAgentDetailPage],
  ] as const)("translates access reason codes reactively in the %s", async (_name, Component) => {
    await i18n.setLocale("en");
    const view = new Component();
    view.agent = {
      ...deniedAgent,
      access: { allowed: false, reason: "not_granted", request: null },
    };
    document.body.append(view);
    await view.updateComplete;
    expect(view.querySelector('[role="status"]')?.textContent).toContain("Access not granted");
    expect(view.textContent).not.toContain("not_granted");
    await i18n.setLocale("vi");
    await view.updateComplete;
    expect(view.querySelector('[role="status"]')?.textContent).toContain("Chưa được cấp quyền");
    expect(view.querySelector("button.primary")?.hasAttribute("disabled")).toBe(false);
  });

  it("renders Request access for a denied shared Agent and emits the action", async () => {
    const onRequestAccess = vi.fn();
    const card = new UserAgentCard();
    card.agent = deniedAgent;
    card.onRequestAccess = onRequestAccess;
    document.body.append(card);

    await card.updateComplete;
    const button = card.querySelector<HTMLButtonElement>("button.primary");
    expect(button?.textContent).toContain("Request access");
    button?.click();
    expect(onRequestAccess).toHaveBeenCalledWith(deniedAgent);
  });

  it("keeps a revoked Agent requestable even when its latest request was approved", async () => {
    const revokedAgent: EnterpriseUserAgent = {
      ...deniedAgent,
      name: "Private Legal Alias",
      access: {
        allowed: false,
        reason: "Access was revoked by an administrator.",
        request: request("approved"),
      },
    };
    expect(canRequestUserAgentAccess(revokedAgent)).toBe(true);

    const card = new UserAgentCard();
    card.agent = revokedAgent;
    document.body.append(card);
    await card.updateComplete;

    expect(card.textContent).toContain("Legal Agent");
    expect(card.textContent).not.toContain("Private Legal Alias");
    expect(card.querySelector<HTMLButtonElement>("button.primary")?.textContent).toContain(
      "Request access",
    );
  });

  it("does not load or render private relationship data while access is denied", async () => {
    mocks.loadRelationship.mockResolvedValue({
      revision: 1,
      agentAlias: "Private alias",
      agentSelfReference: "me",
      userAddress: "Alex",
      customInstructions: "private",
      updatedAt: 1,
    });
    const page = new UserSharedAgentDetailPage();
    page.agent = {
      ...deniedAgent,
      relationship: {
        revision: 1,
        agentAlias: "Stale private alias",
        agentSelfReference: "me",
        userAddress: "Alex",
        customInstructions: "stale private instructions",
        updatedAt: 1,
      },
    };
    document.body.append(page);

    await page.updateComplete;
    expect(mocks.loadRelationship).not.toHaveBeenCalled();
    expect(page.textContent).toContain("Request access");
    expect(page.textContent).not.toContain("Private memory");
    expect(page.textContent).not.toContain("Stale private alias");
  });

  it("shows an in-flight request and then exposes the server error", async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    mocks.requestAccess.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    const page = new UserSharedAgentDetailPage();
    page.agent = deniedAgent;
    document.body.append(page);

    await page.updateComplete;
    const button = page.querySelector<HTMLButtonElement>("button.primary");
    button?.click();
    await page.updateComplete;
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain("Requesting access");

    rejectRequest(new Error("request failed"));
    await vi.waitFor(() => {
      expect(page.querySelector('[role="alert"]')?.textContent).toContain("request failed");
    });
    expect(button?.disabled).toBe(false);
  });

  it("keeps denied shared Agents visible, deduplicates request clicks, supports cancel, and refreshes approval", async () => {
    const previousBootstrapState = userBootstrapStore.state;
    const previousActiveKey = userAgentCatalogStore.activeKey;
    let resolveRequest: (value: ReturnType<typeof request>) => void = () => undefined;
    mocks.loadBootstrap.mockResolvedValue(libraryBootstrap);
    mocks.requestAccess.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    mocks.cancelAccess.mockResolvedValue(request("cancelled"));
    const page = new UserAgentsLibraryPage();
    document.body.append(page);

    try {
      await vi.waitFor(() =>
        expect(page.querySelectorAll("openclaw-user-agent-card")).toHaveLength(2),
      );
      const card = Array.from(page.querySelectorAll("openclaw-user-agent-card")).find((item) =>
        item.textContent?.includes("Legal Agent"),
      )!;
      const requestButton = card.querySelector<HTMLButtonElement>("button.primary")!;
      expect(requestButton.textContent).toContain("Request access");
      requestButton.click();
      requestButton.click();
      expect(mocks.requestAccess).toHaveBeenCalledOnce();
      await page.updateComplete;
      await card.updateComplete;
      expect(card.querySelector<HTMLButtonElement>("button.primary")?.disabled).toBe(true);

      resolveRequest(request("pending"));
      await vi.waitFor(() => expect(card.textContent).toContain("Cancel request"));
      expect(card.querySelector<HTMLButtonElement>("button.primary")?.disabled).toBe(true);
      card.querySelector<HTMLButtonElement>("button:not(.primary)")?.click();
      await vi.waitFor(async () => {
        expect(mocks.cancelAccess).toHaveBeenCalledOnce();
        expect(userBootstrapStore.state.phase).toBe("ready");
        if (userBootstrapStore.state.phase === "ready") {
          const updatedAgent = userBootstrapStore.state.data.agents.find(
            (agent) => agent.key === deniedAgent.key,
          );
          expect(updatedAgent?.access?.request?.state).toBe("cancelled");
          expect(updatedAgent?.actions.canRequestAccess).toBe(true);
        }
        await page.updateComplete;
        await card.updateComplete;
        expect(card.textContent).toContain("Request access");
      });

      const retryButton = card.querySelector<HTMLButtonElement>("button.primary")!;
      retryButton.click();
      await vi.waitFor(() => expect(mocks.requestAccess).toHaveBeenCalledTimes(2));
      resolveRequest(request("pending"));
      await vi.waitFor(() => {
        expect(userBootstrapStore.state.phase).toBe("ready");
        if (userBootstrapStore.state.phase === "ready") {
          expect(
            userBootstrapStore.state.data.agents.find((agent) => agent.key === deniedAgent.key)
              ?.access?.request?.state,
          ).toBe("pending");
        }
      });

      const approvedBootstrap = {
        ...libraryBootstrap,
        agents: libraryBootstrap.agents.map((agent) =>
          agent.key === deniedAgent.key
            ? {
                ...agent,
                access: { allowed: true, reason: null, request: request("approved") },
                actions: { ...agent.actions, canChat: true, canRequestAccess: false },
              }
            : agent,
        ),
      };
      mocks.loadBootstrap.mockResolvedValueOnce(approvedBootstrap);
      await userAgentCatalogStore.load(true);
      await vi.waitFor(() => {
        const refreshedCard = Array.from(page.querySelectorAll("openclaw-user-agent-card")).find(
          (item) => item.textContent?.includes("Legal Agent"),
        );
        expect(refreshedCard?.querySelector("button.primary")?.textContent).toContain("Start chat");
      });
    } finally {
      page.remove();
      userBootstrapStore.state = previousBootstrapState;
      userAgentCatalogStore.activeKey = previousActiveKey;
    }
  });

  it("preserves ready data on refresh failure and ignores stale bootstrap responses", async () => {
    const approvedBootstrap = {
      ...libraryBootstrap,
      agents: libraryBootstrap.agents.map((agent) =>
        agent.key === deniedAgent.key
          ? {
              ...agent,
              access: { allowed: true, reason: null, request: request("approved") },
              actions: { ...agent.actions, canChat: true, canRequestAccess: false },
            }
          : agent,
      ),
    };
    let resolveOld: (value: typeof libraryBootstrap) => void = () => undefined;
    let resolveNew: (value: typeof approvedBootstrap) => void = () => undefined;
    mocks.loadBootstrap
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNew = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("refresh failed"));
    userBootstrapStore.state = { phase: "ready", data: libraryBootstrap };

    const oldLoad = userBootstrapStore.load(true);
    const newLoad = userBootstrapStore.load(true);
    resolveNew(approvedBootstrap);
    await newLoad;
    resolveOld(libraryBootstrap);
    await oldLoad;
    expect(userBootstrapStore.state).toMatchObject({ phase: "ready", data: approvedBootstrap });

    await userBootstrapStore.load(true);
    expect(userBootstrapStore.state).toMatchObject({
      phase: "ready",
      data: approvedBootstrap,
      refreshError: "refresh failed",
    });
  });

  it("does not let an in-flight bootstrap overwrite a confirmed access request", async () => {
    let resolveBootstrap: (value: typeof libraryBootstrap) => void = () => undefined;
    mocks.loadBootstrap.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBootstrap = resolve;
        }),
    );
    userBootstrapStore.state = { phase: "ready", data: libraryBootstrap };

    const bootstrapLoad = userBootstrapStore.load(true);
    const pendingRequest = request("pending");
    userBootstrapStore.applyAgentAccessRequest(pendingRequest);
    resolveBootstrap(libraryBootstrap);
    await bootstrapLoad;

    expect(userBootstrapStore.state).toMatchObject({
      phase: "ready",
      data: expect.objectContaining({
        agents: expect.arrayContaining([
          expect.objectContaining({
            key: deniedAgent.key,
            access: expect.objectContaining({ request: pendingRequest }),
            actions: expect.objectContaining({ canRequestAccess: false }),
          }),
        ]),
      }),
    });
  });

  it("refreshes authorized detail without losing drafts, then hides private data after revoke", async () => {
    const relationship = {
      revision: 1,
      agentAlias: "Legal",
      agentSelfReference: "you",
      userAddress: "Alex",
      customInstructions: "Keep context.",
      updatedAt: 1,
    } as const;
    const approvedAgent: EnterpriseUserAgent = {
      ...deniedAgent,
      name: "Private Legal Alias",
      access: { allowed: true, reason: null, request: request("approved") },
      actions: { ...deniedAgent.actions, canChat: true, canRequestAccess: false },
      relationship,
    };
    const approvedBootstrap = {
      ...libraryBootstrap,
      agents: libraryBootstrap.agents.map((agent) =>
        agent.key === deniedAgent.key ? approvedAgent : agent,
      ),
    };
    const revokedBootstrap = {
      ...libraryBootstrap,
      agents: libraryBootstrap.agents.map((agent) =>
        agent.key === deniedAgent.key
          ? {
              ...deniedAgent,
              access: {
                allowed: false,
                reason: "Access was revoked by an administrator.",
                request: request("approved"),
              },
            }
          : agent,
      ),
    };
    let resolveRefresh: (value: typeof revokedBootstrap) => void = () => undefined;
    mocks.loadRelationship.mockResolvedValue(relationship);
    mocks.loadBootstrap.mockResolvedValueOnce(approvedBootstrap).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    userBootstrapStore.state = { phase: "ready", data: approvedBootstrap };
    globalThis.history.pushState({}, "", "/enterprise/agents/shared/shared%3Alegal");
    const page = new UserAgentsLibraryPage();
    document.body.append(page);
    const detail = page.querySelector<UserSharedAgentDetailPage>(
      "openclaw-user-shared-agent-detail-page",
    );
    await vi.waitFor(() =>
      expect(page.querySelector("openclaw-user-shared-agent-detail-page")).toBeTruthy(),
    );
    const renderedDetail =
      detail ??
      page.querySelector<UserSharedAgentDetailPage>("openclaw-user-shared-agent-detail-page")!;
    await vi.waitFor(() =>
      expect(
        renderedDetail.querySelector<HTMLInputElement>('[aria-label="Your name for this Agent"]'),
      ).toBeTruthy(),
    );
    const aliasInput = renderedDetail.querySelector<HTMLInputElement>(
      '[aria-label="Your name for this Agent"]',
    )!;
    aliasInput.value = "Draft alias";
    aliasInput.dispatchEvent(new Event("input", { bubbles: true }));
    await renderedDetail.updateComplete;
    expect(aliasInput.value).toBe("Draft alias");

    window.dispatchEvent(new Event("focus"));
    await renderedDetail.updateComplete;
    expect(
      renderedDetail.querySelector<HTMLInputElement>('[aria-label="Your name for this Agent"]')
        ?.value,
    ).toBe("Draft alias");
    expect(mocks.loadBootstrap).toHaveBeenCalledTimes(2);

    resolveRefresh(revokedBootstrap);
    await vi.waitFor(() => {
      const currentDetail = page.querySelector<UserSharedAgentDetailPage>(
        "openclaw-user-shared-agent-detail-page",
      );
      expect(currentDetail?.textContent).not.toContain("Start chat");
      expect(currentDetail?.textContent).not.toContain("Private memory");
      expect(currentDetail?.querySelector('[aria-label="Your name for this Agent"]')).toBeNull();
    });
  });
});
