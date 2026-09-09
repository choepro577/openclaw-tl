/* @vitest-environment jsdom */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../../i18n/index.ts";
import type {
  UserCodexCatalogItem,
  UserExtensionCatalogItem,
  UserPluginRequest,
  UserSkillInstall,
} from "../../contracts/user-extension.ts";
import {
  EnterpriseApiError,
  createUserPluginRequest,
  installUserSkill,
  listUserPluginRequests,
  loadEnterpriseUserBootstrapV2,
  loadUserExtensionInventory,
  reviewUserExtension,
  searchUserExtensions,
  searchUserCodexPlugins,
} from "../../services/user-enterprise-api.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import { UserPluginsPage } from "./plugins-page.ts";

vi.mock("../../services/user-enterprise-api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/user-enterprise-api.ts")>()),
  listUserPluginRequests: vi.fn(),
  loadEnterpriseUserBootstrapV2: vi.fn(),
  loadUserExtensionInventory: vi.fn(),
  reviewUserExtension: vi.fn(),
  createUserPluginRequest: vi.fn(),
  installUserSkill: vi.fn(),
  searchUserExtensions: vi.fn(async () => []),
  searchUserCodexPlugins: vi.fn(async () => ({
    status: "available",
    items: [],
    installed: [],
    requests: [],
  })),
}));

type SearchController = {
  syncBootstrap(): void;
  queueSearch(value: string): void;
  changeTab(tab: "discover" | "installed" | "requests"): void;
};

type ReviewController = {
  openReview(item: UserExtensionCatalogItem): Promise<void>;
  commitReview(): Promise<void>;
};

function searchController(page: UserPluginsPage): SearchController {
  // SAFETY: This focused controller test exercises the private debounce boundary directly.
  return page as unknown as SearchController;
}

function reviewController(page: UserPluginsPage): ReviewController {
  // SAFETY: This focused controller test exercises the private review boundary directly.
  return page as unknown as ReviewController;
}

function codexItem(overrides: Partial<UserCodexCatalogItem> = {}): UserCodexCatalogItem {
  return {
    id: "gmail",
    pluginName: "gmail",
    marketplaceName: "openai-curated",
    name: "Gmail",
    description: "Read email",
    installed: false,
    enabled: false,
    available: true,
    installPolicy: "AVAILABLE",
    authPolicy: "ON_USE",
    requestState: null,
    grantState: null,
    ...overrides,
  };
}

describe("UserPluginsPage", () => {
  beforeEach(() => {
    vi.mocked(searchUserExtensions).mockResolvedValue([]);
    vi.mocked(searchUserCodexPlugins).mockResolvedValue({
      status: "available",
      items: [],
      installed: [],
      requests: [],
    });
  });

  it("cancels discovery when access is revoked even if the agent stays discoverable", async () => {
    vi.useFakeTimers();
    const previous = userBootstrapStore.state;
    vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [], grants: [] });
    vi.mocked(listUserPluginRequests).mockResolvedValue([]);
    vi.mocked(searchUserExtensions).mockImplementationOnce(() => new Promise(() => {}));
    const page = new UserPluginsPage();
    Object.assign(page, { agentKey: "shared:revoked" });
    const controller = searchController(page);
    controller.changeTab("discover");
    const oldSignal = vi.mocked(searchUserExtensions).mock.calls[0]?.[0].signal;
    try {
      userBootstrapStore.state = {
        phase: "ready",
        data: {
          schemaVersion: 2,
          user: { username: "qa", displayName: "QA", avatarUrl: null },
          features: {
            personalAgent: { enabled: false, editable: false },
            automations: true,
            notifications: true,
            knowledge: { enabled: false, memberships: 0 },
            plugins: { enabled: true },
          },
          agents: [
            {
              key: "shared:revoked",
              kind: "shared",
              name: "Revoked",
              canonicalName: "Revoked",
              description: null,
              avatar: null,
              availability: "ready",
              capabilityLabels: [],
              relationship: null,
              actions: {
                canChat: false,
                canSchedule: false,
                canEdit: false,
                canPersonalize: false,
              },
            },
            {
              key: "shared:finance",
              kind: "shared",
              name: "Finance",
              canonicalName: "Finance",
              description: null,
              avatar: null,
              availability: "ready",
              capabilityLabels: [],
              relationship: null,
              actions: { canChat: true, canSchedule: true, canEdit: false, canPersonalize: false },
            },
          ],
          defaultAgentKey: "shared:finance",
          policyRevision: 2,
          catalogRevision: "2",
        },
      };
      controller.syncBootstrap();
      await vi.advanceTimersByTimeAsync(0);
      expect(oldSignal?.aborted).toBe(true);
      expect(searchUserExtensions).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentKey: "shared:finance" }),
      );
    } finally {
      userBootstrapStore.state = previous;
    }
  });

  it("publishes Codex results without waiting for slow ClawHub", async () => {
    vi.useFakeTimers();
    vi.mocked(searchUserExtensions).mockImplementationOnce(() => new Promise(() => {}));
    const gmail = codexItem();
    vi.mocked(searchUserCodexPlugins).mockResolvedValue({
      status: "available",
      items: [gmail],
      installed: [],
      requests: [],
    });
    const page = new UserPluginsPage();
    searchController(page).changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(page).toMatchObject({ searching: true, codexCatalog: { items: [gmail] } });
  });

  it("finishes ClawHub loading even while Codex is still pending", async () => {
    vi.useFakeTimers();
    vi.mocked(searchUserCodexPlugins).mockImplementationOnce(() => new Promise(() => {}));
    const page = new UserPluginsPage();
    searchController(page).changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(page).toMatchObject({ searching: false });
  });

  it("loads the Codex catalog by default and searches it after typing", async () => {
    vi.useFakeTimers();
    const gmail = codexItem({ id: "gmail@openai-curated" });
    vi.mocked(searchUserCodexPlugins).mockResolvedValue({
      status: "available",
      items: [gmail],
      installed: [],
      requests: [],
    });
    const page = new UserPluginsPage();
    const controller = searchController(page);
    controller.changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(searchUserCodexPlugins).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "", agentKey: "personal" }),
    );
    expect(page).toMatchObject({ codexCatalog: { items: [gmail] } });
    controller.queueSearch("gmail");
    await vi.advanceTimersByTimeAsync(250);
    expect(searchUserCodexPlugins).toHaveBeenCalledOnce();
    expect(page).toMatchObject({ codexCatalog: { items: [gmail] } });
    controller.queueSearch("nonexistent");
    expect(page).toMatchObject({ codexCatalog: { items: [] } });
    await vi.advanceTimersByTimeAsync(250);
    expect(searchUserCodexPlugins).toHaveBeenCalledOnce();
    controller.queueSearch("");
    await vi.advanceTimersByTimeAsync(250);
    expect(searchUserCodexPlugins).toHaveBeenCalledOnce();
    expect(page).toMatchObject({ codexCatalog: { items: [gmail] } });
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    controller.changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(searchUserCodexPlugins).toHaveBeenCalledTimes(2);
  });

  it("ignores late Codex results after switching away from Discover", async () => {
    vi.useFakeTimers();
    vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [], grants: [] });
    vi.mocked(listUserPluginRequests).mockResolvedValue([]);
    let resolveCatalog!: (value: {
      status: "unavailable";
      items: [];
      installed: [];
      requests: [];
    }) => void;
    vi.mocked(searchUserCodexPlugins).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCatalog = resolve;
        }),
    );
    const page = new UserPluginsPage();
    const controller = searchController(page);
    controller.changeTab("discover");
    controller.changeTab("installed");
    resolveCatalog({ status: "unavailable", items: [], installed: [], requests: [] });
    await vi.advanceTimersByTimeAsync(0);
    expect(page).toMatchObject({
      tab: "installed",
      searching: false,
      codexCatalog: { status: "available", items: [] },
    });
  });

  it("does not show a late catalog error after leaving Discover", async () => {
    vi.useFakeTimers();
    vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [], grants: [] });
    vi.mocked(listUserPluginRequests).mockResolvedValue([]);
    let rejectBrowse!: (error: Error) => void;
    vi.mocked(searchUserExtensions).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectBrowse = reject;
        }),
    );
    const page = new UserPluginsPage();
    const controller = searchController(page);
    controller.changeTab("discover");
    controller.changeTab("installed");
    rejectBrowse(new Error("Catalog unavailable"));
    await vi.advanceTimersByTimeAsync(0);
    expect(page).toMatchObject({ tab: "installed", searching: false, error: "" });
  });

  it("browses on opening Discover and restores browsing after clearing search", async () => {
    vi.useFakeTimers();
    const page = new UserPluginsPage();
    const controller = searchController(page);
    controller.changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(searchUserExtensions).toHaveBeenLastCalledWith(
      expect.objectContaining({ agentKey: "personal", query: "" }),
    );
    controller.queueSearch("weather");
    await vi.advanceTimersByTimeAsync(250);
    expect(searchUserExtensions).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "weather" }),
    );
    controller.queueSearch("");
    await vi.advanceTimersByTimeAsync(250);
    expect(searchUserExtensions).toHaveBeenLastCalledWith(expect.objectContaining({ query: "" }));
    expect(searchUserExtensions).toHaveBeenCalledTimes(3);
  });
  it.each([false, true])(
    "requires a fresh review token and supports renewal after expiry: %s",
    async (expired) => {
      vi.useFakeTimers();
      vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [], grants: [] });
      vi.mocked(listUserPluginRequests).mockResolvedValue([]);
      const item: UserExtensionCatalogItem = {
        catalogKey: "@openclaw/diffs",
        kind: "bundle_plugin",
        name: "Diffs",
        description: null,
        publisher: "openclaw",
        version: "2026.9.1",
        integrity: "sha256-latest",
        trust: null,
        allowedAction: "request_admin",
        reasonCodes: [],
        requirements: [],
        requestState: null,
      };
      const page = new UserPluginsPage();
      Object.assign(page, {
        review: { item, reviewToken: "latest-token" },
        reviewVersion: item.version,
      });
      const container = document.createElement("div");
      render(page.render(), container);
      const input = container.querySelector<HTMLInputElement>(".plugins-detail input")!;
      input.value = "2026.8.1";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      render(page.render(), container);
      const commit = container.querySelector<HTMLButtonElement>(
        ".plugins-detail__actions .primary",
      )!;
      expect(commit.disabled).toBe(true);
      commit.click();
      expect(createUserPluginRequest).not.toHaveBeenCalled();
      vi.mocked(reviewUserExtension).mockResolvedValue({
        item: { ...item, version: "2026.8.1", integrity: "sha256-compatible" },
        reviewToken: "compatible-token",
        expiresAt: Date.now() + 60_000,
      });
      container
        .querySelector<HTMLButtonElement>(".plugins-detail .plugins-toolbar button")!
        .click();
      await vi.advanceTimersByTimeAsync(0);
      expect(reviewUserExtension).toHaveBeenCalledWith({
        agentKey: "personal",
        kind: "bundle_plugin",
        catalogKey: "@openclaw/diffs",
        version: "2026.8.1",
      });
      render(page.render(), container);
      expect(container.textContent).toContain("sha256-compatible");
      if (expired) {
        vi.mocked(createUserPluginRequest).mockRejectedValueOnce(
          new EnterpriseApiError(409, "REVIEW_TOKEN_INVALID", "REVIEW_TOKEN_INVALID"),
        );
      }
      container.querySelector<HTMLButtonElement>(".plugins-detail__actions .primary")!.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(createUserPluginRequest).toHaveBeenCalledWith("compatible-token");
      if (expired) {
        render(page.render(), container);
        expect(container.textContent).toContain("This review expired or the Gateway restarted.");
        const renew = container.querySelector<HTMLButtonElement>(
          ".plugins-detail .plugins-toolbar button",
        )!;
        expect(renew.disabled).toBe(false);
        vi.mocked(reviewUserExtension).mockResolvedValue({
          item: { ...item, version: "2026.8.1" },
          reviewToken: "renewed-token",
          expiresAt: Date.now() + 60_000,
        });
        renew.click();
        await vi.advanceTimersByTimeAsync(0);
        render(page.render(), container);
        expect(container.textContent).not.toContain("This review expired");
        container.querySelector<HTMLButtonElement>(".plugins-detail__actions .primary")!.click();
        await vi.advanceTimersByTimeAsync(0);
        expect(createUserPluginRequest).toHaveBeenLastCalledWith("renewed-token");
      }
    },
  );

  it("reviews a REVIEW_REQUIRED catalog item before allowing installation", async () => {
    const pending: UserExtensionCatalogItem = {
      catalogKey: "@openclaw/pending",
      kind: "skill",
      name: "Pending release",
      description: null,
      publisher: "openclaw",
      version: "1.0.0",
      integrity: null,
      trust: null,
      allowedAction: "none",
      reasonCodes: ["REVIEW_REQUIRED"],
      requirements: [],
      requestState: null,
    };
    vi.mocked(reviewUserExtension).mockResolvedValue({
      item: {
        ...pending,
        integrity: "sha256-trusted",
        trust: {
          disposition: "clean",
          scanStatus: "clean",
          moderationState: null,
          checkedAt: "2026-09-08T00:00:00.000Z",
        },
        allowedAction: "install_skill",
        reasonCodes: [],
      },
      reviewToken: "trusted-token",
      expiresAt: Date.now() + 60_000,
    });

    const page = new UserPluginsPage();
    await reviewController(page).openReview(pending);
    expect(reviewUserExtension).toHaveBeenCalledWith({
      agentKey: "personal",
      kind: "skill",
      catalogKey: "@openclaw/pending",
      version: "1.0.0",
    });
    expect(page).toMatchObject({ review: { reviewToken: "trusted-token" } });

    Object.assign(page, {
      review: { item: pending, reviewToken: "untrusted-token" },
      reviewVersion: pending.version,
    });
    const container = document.createElement("div");
    render(page.render(), container);
    expect(
      container.querySelector<HTMLButtonElement>(".plugins-detail__actions .primary")?.disabled,
    ).toBe(true);
    await reviewController(page).commitReview();
    expect(installUserSkill).not.toHaveBeenCalled();
    expect(createUserPluginRequest).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it.each(["install_skill", "request_admin"] as const)(
    "shows the saved %s result without blocking on another catalog search",
    async (allowedAction) => {
      vi.useFakeTimers();
      vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [], grants: [] });
      vi.mocked(listUserPluginRequests).mockResolvedValue([]);
      vi.mocked(searchUserExtensions).mockImplementationOnce(() => new Promise(() => {}));
      const page = new UserPluginsPage();
      Object.assign(page, {
        tab: "discover",
        query: "converter",
        installedFilter: "disabled",
        review: {
          reviewToken: "review-qa",
          item: { allowedAction, catalogKey: "@qa/converter", name: "Converter", requirements: [] },
        },
      });
      const container = document.createElement("div");
      render(page.render(), container);
      container.querySelector<HTMLButtonElement>(".plugins-detail__actions .primary")!.click();
      await vi.advanceTimersByTimeAsync(0);
      render(page.render(), container);

      const mutation =
        allowedAction === "install_skill" ? installUserSkill : createUserPluginRequest;
      expect(mutation).toHaveBeenCalledWith("review-qa");
      expect(searchUserExtensions).not.toHaveBeenCalled();
      expect(container.querySelector('wa-tab[aria-selected="true"]')?.id).toBe(
        `user-plugins-tab-${allowedAction === "install_skill" ? "installed" : "requests"}`,
      );
      expect(container.querySelector("openclaw-modal-dialog")).toBeNull();
      expect(page).toMatchObject({ busy: false, installedFilter: "all" });
    },
  );

  it("cancels queued browsing when the query has only one character", async () => {
    vi.useFakeTimers();
    const page = new UserPluginsPage();
    const controller = searchController(page);

    controller.queueSearch("");
    controller.queueSearch("g");
    await vi.advanceTimersByTimeAsync(300);

    expect(searchUserExtensions).not.toHaveBeenCalled();

    controller.queueSearch("  github  ");
    await vi.advanceTimersByTimeAsync(250);

    expect(searchUserExtensions).toHaveBeenCalledOnce();
    expect(searchUserExtensions).toHaveBeenCalledWith(
      expect.objectContaining({ agentKey: "personal", query: "github" }),
    );
  });

  it("refreshes cached Discover results when returning after a grant or request changed", async () => {
    vi.useFakeTimers();
    const page = new UserPluginsPage();
    Object.assign(page, {
      query: "github",
      catalog: [
        {
          catalogKey: "@qa/github",
          kind: "code_plugin",
          name: "GitHub",
          description: null,
          publisher: "qa",
          version: "1.0.0",
          integrity: null,
          trust: null,
          allowedAction: "request_admin",
          reasonCodes: [],
          requirements: [],
          requestState: "available",
        },
      ],
    });
    searchController(page).changeTab("discover");
    await vi.advanceTimersByTimeAsync(0);
    expect(searchUserExtensions).toHaveBeenCalledOnce();
  });

  it("shows loading throughout debounce and replacement of an aborted search", async () => {
    vi.useFakeTimers();
    const page = new UserPluginsPage();
    const container = document.createElement("div");
    const draw = () => render(page.render(), container);
    draw();
    container
      .querySelector("#user-plugins-tab-discover")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    draw();
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      draw();
    };
    let finishFirst!: (items: []) => void;
    vi.mocked(searchUserExtensions).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    );

    type("weather");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Loading");
    expect(container.textContent).not.toContain("No results");
    await vi.advanceTimersByTimeAsync(250);
    type("github");
    finishFirst([]);
    await vi.advanceTimersByTimeAsync(0);
    draw();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Loading");
    await vi.advanceTimersByTimeAsync(250);
    draw();
    expect(container.textContent).toContain("No results for “github”");
  });

  it.each(["requests", "installed"] as const)(
    "refreshes external changes when returning from Discover to %s",
    async (tab) => {
      vi.useFakeTimers();
      const previousBootstrap = userBootstrapStore.state;
      userBootstrapStore.state = { phase: "idle" };
      vi.mocked(loadEnterpriseUserBootstrapV2).mockResolvedValueOnce({
        schemaVersion: 2,
        user: { username: "hieu", displayName: "Hieu", avatarUrl: null },
        features: {
          personalAgent: { enabled: true, editable: true },
          automations: true,
          notifications: true,
          knowledge: { enabled: false, memberships: 0 },
          plugins: { enabled: true },
        },
        agents: [],
        defaultAgentKey: "personal",
        policyRevision: 1,
        catalogRevision: "1",
      });
      const request: UserPluginRequest = {
        id: "request-1",
        packageName: "@chris-openclaw/github-workflow",
        packageFamily: "bundle_plugin",
        exactVersion: "0.2.0",
        integrity: "sha256-plugin",
        requestKind: "install",
        state: "pending",
        decisionReason: null,
        safeErrorCode: null,
        revision: 1,
        createdAt: 1,
        updatedAt: 1,
      };
      const skill: UserSkillInstall = {
        id: "skill-1",
        agentKey: "personal",
        clawhubRef: "@openclaw/unit-convert",
        skillName: "unit-convert",
        exactVersion: "1.0.0",
        integrity: "sha256-skill",
        enabled: true,
        state: "ready",
        safeErrorCode: null,
        revision: 1,
        createdAt: 1,
        updatedAt: 1,
      };
      vi.mocked(listUserPluginRequests).mockResolvedValue([request]);
      vi.mocked(loadUserExtensionInventory).mockResolvedValue({ items: [skill], grants: [] });
      const page = new UserPluginsPage();
      const settle = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await page.updateComplete;
      };
      const selectTab = async (value: string) => {
        page
          .querySelector(`#user-plugins-tab-${value}`)!
          .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
        await settle();
      };
      try {
        document.body.append(page);
        await settle();
        await selectTab(tab);
        const rowSelector =
          tab === "requests"
            ? '[data-plugin-request-id="request-1"]'
            : '[data-skill-install-id="skill-1"]';
        expect(page.querySelector(rowSelector)?.getAttribute("data-plugin-status")).toBe(
          tab === "requests" ? "pending" : "ready",
        );
        await selectTab("discover");
        vi.mocked(listUserPluginRequests).mockResolvedValue([
          {
            ...request,
            state: "rejected",
            decisionReason: "Not approved for this account",
            revision: 2,
          },
        ]);
        vi.mocked(loadUserExtensionInventory).mockResolvedValue({
          items: [{ ...skill, enabled: false, state: "disabled", revision: 2 }],
          grants: [],
        });

        await selectTab(tab);

        const row = page.querySelector(rowSelector);
        expect(row?.getAttribute("data-plugin-status")).toBe(
          tab === "requests" ? "rejected" : "disabled",
        );
        if (tab === "requests") {
          expect(row?.textContent).toContain("Not approved for this account");
          expect(row?.textContent).not.toContain("Cancel request");
          expect(
            page.querySelector("#user-plugins-tab-requests .hub-tab__badge--count"),
          ).toBeNull();
        } else {
          expect(row?.textContent).toContain("Enable");
        }
      } finally {
        page.remove();
        userBootstrapStore.state = previousBootstrap;
      }
    },
  );

  it.each([
    [
      "en",
      "SKILL_COLLISION",
      "This Agent already has a bundled or manually managed skill with the same name. Existing files were not changed. Choose a different skill.",
    ],
    [
      "vi",
      "SKILL_COLLISION",
      "Agent này đã có Skill đi kèm hệ thống hoặc được quản lý thủ công trùng tên. Các tệp hiện có không bị thay đổi. Hãy chọn Skill khác.",
    ],
    ["en", "SKILL_IDENTITY_MISMATCH", "Could not verify this exact release."],
    ["vi", "SKILL_IDENTITY_MISMATCH", "Không thể xác minh chính xác release này."],
  ] as const)(
    "explains a failed review in %s without exposing the raw %s error code",
    async (locale, code, message) => {
      vi.useFakeTimers();
      vi.spyOn(i18n, "getLocale").mockReturnValue(locale);
      vi.mocked(searchUserExtensions).mockResolvedValue([
        {
          catalogKey: "@steipete/weather",
          kind: "skill",
          name: "Weather",
          description: null,
          publisher: "steipete",
          version: "1.0.0",
          integrity: null,
          trust: null,
          allowedAction: "install_skill",
          reasonCodes: [],
          requirements: [],
          requestState: null,
        },
      ]);
      vi.mocked(reviewUserExtension).mockRejectedValueOnce(new EnterpriseApiError(409, code, code));
      const page = new UserPluginsPage();
      const container = document.createElement("div");
      const draw = () => render(page.render(), container);
      draw();
      container
        .querySelector("#user-plugins-tab-discover")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      draw();
      const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      input.value = "weather";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(250);
      draw();
      container
        .querySelector(".plugins-install")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
      draw();

      expect(container.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(container.textContent).not.toContain(code);
    },
  );
});
