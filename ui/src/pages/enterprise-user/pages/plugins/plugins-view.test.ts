/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../../i18n/index.ts";
import type { EnterpriseUserAgent } from "../../contracts/user-agent.ts";
import type {
  UserCodexCatalogItem,
  UserCodexPluginDetail,
  UserCodexPluginGrant,
  UserCodexPluginRequest,
  UserExtensionCatalogItem,
  UserExtensionReview,
  UserPluginGrant,
  UserPluginRequest,
  UserSkillInstall,
} from "../../contracts/user-extension.ts";
import { renderUserPlugins, type UserPluginsViewProps } from "./plugins-view.ts";

const visibility = vi.hoisted(() => ({ enabled: true }));
vi.mock("../../../enterprise-plugin-visibility.ts", () => ({
  get ENTERPRISE_CODEX_PLUGINS_VISIBLE() {
    return visibility.enabled;
  },
}));
beforeEach(() => {
  visibility.enabled = true;
});

const personalAgent: EnterpriseUserAgent = {
  key: "personal",
  kind: "personal",
  name: "Personal Agent",
  canonicalName: "Personal Agent",
  description: null,
  avatar: null,
  availability: "ready",
  capabilityLabels: [],
  relationship: null,
  actions: { canChat: true, canSchedule: true, canEdit: true, canPersonalize: true },
};

function catalogItem(overrides: Partial<UserExtensionCatalogItem> = {}): UserExtensionCatalogItem {
  return {
    catalogKey: "@openclaw/github",
    kind: "skill",
    name: "GitHub",
    description: "Work with repositories and pull requests.",
    publisher: "openclaw",
    version: "1.2.3",
    integrity: null,
    trust: {
      disposition: "clean",
      scanStatus: "clean",
      moderationState: null,
      checkedAt: "2026-09-03T00:00:00.000Z",
    },
    allowedAction: "install_skill",
    reasonCodes: [],
    requirements: [],
    requestState: null,
    ...overrides,
  };
}

function skillInstall(overrides: Partial<UserSkillInstall> = {}): UserSkillInstall {
  return {
    id: "skill-1",
    agentKey: "personal",
    clawhubRef: "@openclaw/github",
    skillName: "GitHub",
    exactVersion: "1.2.3",
    integrity: "sha256-skill",
    enabled: true,
    state: "ready",
    safeErrorCode: null,
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function pluginRequest(overrides: Partial<UserPluginRequest> = {}): UserPluginRequest {
  return {
    id: "request-1",
    packageName: "@openclaw/github-workflow",
    packageFamily: "bundle_plugin",
    exactVersion: "2.0.0",
    integrity: "sha256-plugin",
    requestKind: "install",
    state: "pending",
    decisionReason: null,
    safeErrorCode: null,
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function codexItem(overrides: Partial<UserCodexCatalogItem> = {}): UserCodexCatalogItem {
  return {
    id: "gmail",
    pluginName: "gmail",
    marketplaceName: "openai-curated",
    name: "Gmail",
    description: "Read and manage Gmail",
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

function codexGrant(overrides: Partial<UserCodexPluginGrant> = {}): UserCodexPluginGrant {
  return {
    id: "codex-grant-1",
    pluginId: "gmail@openai-curated",
    pluginName: "gmail",
    marketplaceName: "openai-curated",
    agentKey: "personal",
    installedPluginId: "gmail@openai-curated",
    capabilityDigest: "sha256-capability",
    state: "active",
    authRequired: false,
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function codexRequest(overrides: Partial<UserCodexPluginRequest> = {}): UserCodexPluginRequest {
  return {
    id: "codex-request-1",
    pluginId: "gmail@openai-curated",
    pluginName: "gmail",
    marketplaceName: "openai-curated",
    agentKey: "personal",
    requestKind: "install",
    state: "pending",
    installedPluginId: null,
    decisionReason: null,
    safeErrorCode: null,
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function viewProps(overrides: Partial<UserPluginsViewProps> = {}): UserPluginsViewProps {
  return {
    tab: "installed",
    installedFilter: "all",
    agents: [personalAgent],
    agentKey: "personal",
    query: "",
    loading: false,
    searching: false,
    codexSearching: false,
    busy: false,
    reviewingCatalogKey: null,
    error: "",
    catalog: [],
    codexCatalog: { status: "available", items: [], installed: [], requests: [] },
    codexDetail: null,
    reviewingCodexPluginId: null,
    requestingCodexPluginId: null,
    installs: [],
    grants: [],
    requests: [],
    review: null,
    reviewVersion: null,
    onReviewVersionChange: vi.fn(),
    onTabChange: vi.fn(),
    onInstalledFilterChange: vi.fn(),
    onAgentChange: vi.fn(),
    onQueryChange: vi.fn(),
    onRetry: vi.fn(),
    onDismissError: vi.fn(),
    onReview: vi.fn(),
    onCloseReview: vi.fn(),
    onCommitReview: vi.fn(),
    onToggleSkill: vi.fn(),
    onUpdateSkill: vi.fn(),
    onRemoveSkill: vi.fn(),
    onCancelRequest: vi.fn(),
    onRelinquishGrant: vi.fn(),
    onOpenCodex: vi.fn(),
    onRequestCodex: vi.fn(),
    onCancelCodexRequest: vi.fn(),
    onToggleCodex: vi.fn(),
    onRemoveCodex: vi.fn(),
    onRefreshCodex: vi.fn(),
    onConnectCodex: vi.fn(),
    onCloseCodexDetail: vi.fn(),
    ...overrides,
  };
}

function mount(props: UserPluginsViewProps): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  render(renderUserPlugins(props), container);
  return container;
}

function normalizedText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/gu, " ").trim() ?? "";
}

describe("renderUserPlugins", () => {
  it.each(["installed", "discover", "requests"] as const)(
    "hides all Codex surfaces on %s when disabled",
    (tab) => {
      visibility.enabled = false;
      const container = mount(
        viewProps({
          tab,
          codexCatalog: {
            status: "available",
            items: [codexItem()],
            installed: [codexGrant()],
            requests: [codexRequest()],
          },
        }),
      );
      expect(container.textContent).not.toMatch(/Codex|Gmail/i);
      expect(container.querySelector("[data-codex-plugin-id]")).toBeNull();
    },
  );

  it("renders ready Codex cards while ClawHub and inventory are loading", () => {
    const container = mount(
      viewProps({
        tab: "discover",
        searching: true,
        loading: true,
        codexCatalog: {
          status: "available",
          items: [codexItem({ id: "gmail", name: "Gmail", description: "Email" })],
          installed: [],
          requests: [],
        },
      }),
    );
    expect(container.querySelector('[data-codex-plugin-id="gmail"]')).not.toBeNull();
    expect(normalizedText(container)).toContain("Loading");
  });

  it("shows Codex request and detail controls with an empty query", () => {
    const onRequestCodex = vi.fn();
    const onOpenCodex = vi.fn();
    const container = mount(
      viewProps({
        tab: "discover",
        onRequestCodex,
        onOpenCodex,
        codexCatalog: {
          status: "available",
          items: [codexItem({ id: "gmail@openai-curated" })],
          installed: [],
          requests: [],
        },
      }),
    );
    const row = container.querySelector('[data-codex-plugin-id="gmail@openai-curated"]');
    expect(normalizedText(row)).toContain("Gmail");
    const requestButton = row?.querySelector<HTMLButtonElement>(".plugins-install");
    expect(requestButton?.textContent?.trim()).toBe("Request Admin");
    requestButton?.click();
    expect(onRequestCodex).toHaveBeenCalledOnce();
    row?.querySelector<HTMLButtonElement>(".plugins-item__detail-button")?.click();
    expect(onOpenCodex).toHaveBeenCalledOnce();
    expect(normalizedText(container)).toContain("Codex Plugins");
    expect(normalizedText(container)).toContain("1 shown");
  });

  it("keeps detail loading separate from the Codex request action", () => {
    const item = codexItem({ id: "gmail@openai-curated" });
    const openingContainer = mount(
      viewProps({
        tab: "discover",
        reviewingCodexPluginId: item.id,
        codexCatalog: { status: "available", items: [item], installed: [], requests: [] },
      }),
    );
    const openingButton = openingContainer.querySelector<HTMLButtonElement>(
      '[data-codex-plugin-id="gmail@openai-curated"] .plugins-install',
    );
    expect(openingButton?.getAttribute("aria-busy")).toBe("true");
    expect(openingButton?.textContent?.trim()).toBe("Request Admin");

    const requestingContainer = mount(
      viewProps({
        tab: "discover",
        requestingCodexPluginId: item.id,
        codexCatalog: { status: "available", items: [item], installed: [], requests: [] },
      }),
    );
    const requestingButton = requestingContainer.querySelector<HTMLButtonElement>(
      '[data-codex-plugin-id="gmail@openai-curated"] .plugins-install',
    );
    expect(requestingButton?.getAttribute("aria-busy")).toBe("true");
    expect(requestingButton?.textContent?.trim()).toBe("Sending request…");
  });

  it("renders Codex grant readiness and account scoped controls", () => {
    const onOpenCodex = vi.fn();
    const grant = codexGrant({
      authRequired: true,
      appsNeedingAuth: [
        { id: "google", name: "Google", installUrl: "https://accounts.google.com" },
      ],
      connectUrls: ["https://accounts.google.com"],
    });
    const container = mount(
      viewProps({
        onOpenCodex,
        installedFilter: "issues",
        codexCatalog: { status: "available", items: [], installed: [grant], requests: [] },
      }),
    );
    const row = container.querySelector('[data-codex-grant-id="codex-grant-1"]');
    expect(normalizedText(row)).toContain("Needs setup");
    const filters = normalizedText(container.querySelector(".settings-segmented"));
    expect(filters).toContain("Issues 1");
    expect(filters).toContain("Enabled 0");
    expect(normalizedText(container)).toContain(
      "Use these plugins from a chat model marked Codex.",
    );
    expect(normalizedText(row)).toContain("Connect account");
    expect(normalizedText(row)).toContain("Check connection");
    expect(normalizedText(row)).toContain("Remove access");
    row?.querySelector<HTMLButtonElement>(".plugins-item__detail-button")?.click();
    expect(onOpenCodex).toHaveBeenCalledWith(
      expect.objectContaining({ id: "gmail@openai-curated", pluginName: "gmail" }),
    );
  });

  it("uses catalog display names for canonical Codex ids", () => {
    const catalogItem = codexItem({
      id: "app-adobe@openai-curated-remote",
      pluginName: "app-adobe",
      marketplaceName: "openai-curated-remote",
      name: "Adobe",
    });
    const grant = codexGrant({
      id: "codex-grant-adobe",
      pluginId: "app-adobe@openai-curated-remote",
      pluginName: "app-adobe",
      marketplaceName: "openai-curated-remote",
    });
    const request = codexRequest({
      id: "codex-request-adobe",
      pluginId: "app-adobe@openai-curated-remote",
      pluginName: "app-adobe",
      marketplaceName: "openai-curated-remote",
    });
    const catalog = {
      status: "available" as const,
      items: [catalogItem],
      installed: [grant],
      requests: [request],
    };

    const installed = mount(viewProps({ codexCatalog: catalog }));
    expect(
      installed
        .querySelector('[data-codex-grant-id="codex-grant-adobe"] .plugins-item__detail-button')
        ?.textContent?.trim(),
    ).toBe("Adobe");

    const requests = mount(viewProps({ tab: "requests", codexCatalog: catalog }));
    expect(
      requests
        .querySelector('[data-codex-request-id="codex-request-adobe"] .plugins-item__detail-button')
        ?.textContent?.trim(),
    ).toBe("Adobe");

    const detail = mount(
      viewProps({
        codexCatalog: catalog,
        codexDetail: {
          item: { ...catalogItem, name: "app-adobe" },
          capabilitySnapshot: {},
          capabilityDigest: "sha256-adobe",
        },
      }),
    );
    expect(detail.querySelector(".plugins-detail__title h2")?.textContent?.trim()).toBe("Adobe");
  });

  it("renders the full Codex detail contract and keeps connection actions provider scoped", () => {
    const onConnectCodex = vi.fn();
    const onTryCodex = vi.fn();
    const grant = codexGrant({
      authRequired: true,
      ready: false,
      appsNeedingAuth: [
        {
          id: "gmail",
          name: "Gmail",
          needsAuth: true,
          installUrl: "https://chatgpt.com/apps/gmail",
        },
      ],
    });
    const detail: UserCodexPluginDetail = {
      item: codexItem({ id: "gmail@openai-curated", name: "Gmail" }),
      shareUrl: "https://chatgpt.com/apps/gmail",
      version: "1.2.3",
      localVersion: "1.2.3",
      interface: {
        displayName: "Gmail",
        shortDescription: "Manage Gmail",
        longDescription: "Read and manage Gmail from a Codex chat.",
        developerName: "OpenAI",
        category: "Communication",
        capabilities: ["Read messages", "Search mail"],
        defaultPrompts: ["Find my unread messages from today."],
        websiteUrl: "https://www.google.com/gmail/",
        screenshotUrls: ["https://cdn.example.test/gmail.png"],
        logoUrl: "https://cdn.example.test/gmail-logo.png",
      },
      skills: [{ name: "Gmail search", description: "Search messages" }],
      hooks: [{ key: "on_message", eventName: "message.created" }],
      appTemplates: [{ templateId: "gmail-template", name: "Gmail", category: "Communication" }],
      mcpServers: [{ name: "gmail", needsAuth: true, ready: false, authStatus: "Needs OAuth" }],
      scheduledTasks: [{ key: "gmail-digest", name: "Daily digest", schedule: "daily" }],
      auth: {
        authRequired: true,
        ready: false,
        apps: [
          {
            id: "gmail",
            name: "Gmail",
            description: "Read and manage Gmail",
            accessible: true,
            enabled: true,
            callable: false,
            needsAuth: true,
            metadataAvailable: true,
            installUrl: "https://chatgpt.com/apps/gmail",
            accountsStatus: "available",
            addAccountUrl:
              "https://chatgpt.com/#settings/Connectors?connector=gmail&add-connector-link=true&product-sku=CODEX&referrer=codex",
            accounts: [
              {
                id: "gmail-link-personal",
                name: "Personal",
                email: "duchieu1999@gmail.com",
                authStatus: "connected",
                authType: "OAUTH",
              },
              {
                id: "gmail-link-work",
                name: null,
                email: "it@example.com",
                authStatus: "reauth_required",
                authType: "OAUTH",
              },
            ],
          },
        ],
      },
      capabilitySnapshot: {},
      capabilityDigest: "sha256-gmail",
    };
    const container = mount(
      viewProps({
        onConnectCodex,
        onTryCodex,
        codexCatalog: { status: "available", items: [], installed: [grant], requests: [] },
        codexDetail: detail,
      }),
    );
    const detailRoot = container.querySelector("[data-codex-plugin-detail]");
    expect(normalizedText(detailRoot)).toContain("Information");
    expect(normalizedText(detailRoot)).toContain("1.2.3");
    expect(normalizedText(detailRoot)).toContain("Starter prompts");
    expect(normalizedText(detailRoot)).toContain("Connected apps");
    expect(normalizedText(detailRoot)).toContain("Connected accounts");
    expect(normalizedText(detailRoot)).toContain("duchieu1999@gmail.com");
    expect(normalizedText(detailRoot)).toContain("it@example.com");
    expect(normalizedText(detailRoot)).toContain("Connect another");
    expect(normalizedText(detailRoot)).not.toContain("gmail-link-personal");
    const accountRows = detailRoot?.querySelectorAll(".eu-codex-account-row");
    expect(normalizedText(accountRows?.[1] ?? null)).toContain("it@example.com");
    expect(normalizedText(accountRows?.[1] ?? null)).toContain("Needs connection");
    expect(normalizedText(accountRows?.[1] ?? null)).not.toContain("gmail-link-work");
    expect(
      detailRoot?.querySelector<HTMLAnchorElement>(".eu-codex-connected-accounts__header a")?.href,
    ).toBe(
      "https://chatgpt.com/#settings/Connectors?connector=gmail&add-connector-link=true&product-sku=CODEX&referrer=codex",
    );
    expect(normalizedText(detailRoot)).toContain("App templates");
    expect(normalizedText(detailRoot)).toContain("Hooks");
    expect(normalizedText(detailRoot)).toContain("Scheduled tasks");
    expect(
      detailRoot?.querySelector('img[src="https://cdn.example.test/gmail-logo.png"]'),
    ).toBeTruthy();
    expect(detailRoot?.querySelector('img[src="https://cdn.example.test/gmail.png"]')).toBeTruthy();
    expect(detailRoot?.querySelector('a[href="https://chatgpt.com/apps/gmail"]')).toBeTruthy();
    detailRoot?.querySelector<HTMLButtonElement>(".eu-codex-title-actions .primary")?.click();
    expect(onTryCodex).toHaveBeenCalledOnce();
    expect(normalizedText(detailRoot)).toContain("Copy link");
    detailRoot?.querySelector<HTMLButtonElement>('[data-codex-mcp-server="gmail"] button')?.click();
    expect(onConnectCodex).toHaveBeenCalledWith(grant, "gmail");
  });

  it("shows unavailable Codex account metadata without inventing identities", () => {
    const detail: UserCodexPluginDetail = {
      item: codexItem({ id: "gmail@openai-curated", name: "Gmail" }),
      auth: {
        authRequired: false,
        ready: true,
        apps: [
          {
            id: "gmail",
            name: "Gmail",
            accessible: true,
            enabled: true,
            callable: true,
            needsAuth: false,
            metadataAvailable: true,
            runtimeState: "available",
            accountsStatus: "unavailable",
            addAccountUrl:
              "https://chatgpt.com/#settings/Connectors?connector=gmail&add-connector-link=true&product-sku=CODEX&referrer=codex",
          },
        ],
      },
      capabilitySnapshot: {},
      capabilityDigest: "sha256-gmail",
    };
    const container = mount(viewProps({ codexDetail: detail }));
    const detailRoot = container.querySelector("[data-codex-plugin-detail]");
    expect(normalizedText(detailRoot)).toContain("Connected accounts");
    expect(normalizedText(detailRoot)).toContain("Connected account details are unavailable.");
    expect(normalizedText(detailRoot)).toContain("Connect account");
    expect(normalizedText(detailRoot)).not.toContain("@example.com");
    expect(
      detailRoot?.querySelector<HTMLAnchorElement>(".eu-codex-connected-accounts__header a")?.href,
    ).toBe(
      "https://chatgpt.com/#settings/Connectors?connector=gmail&add-connector-link=true&product-sku=CODEX&referrer=codex",
    );
  });

  it("keeps Codex request history actionable while pending", () => {
    const onOpenCodex = vi.fn();
    const onCancelCodexRequest = vi.fn();
    const request = codexRequest();
    const container = mount(
      viewProps({
        tab: "requests",
        onOpenCodex,
        onCancelCodexRequest,
        codexCatalog: { status: "available", items: [], installed: [], requests: [request] },
      }),
    );
    const row = container.querySelector('[data-codex-request-id="codex-request-1"]');
    expect(normalizedText(row)).toContain("Pending Admin review");
    row?.querySelector<HTMLButtonElement>(".plugins-item__detail-button")?.click();
    expect(onOpenCodex).toHaveBeenCalledWith(
      expect.objectContaining({ id: "gmail@openai-curated" }),
    );
    row?.querySelector<HTMLButtonElement>(".eu-plugin-remove")?.click();
    expect(onCancelCodexRequest).toHaveBeenCalledWith(request);
  });

  it("renders only runtime supplied HTTP(S) Codex connection links", () => {
    const detail: UserCodexPluginDetail = {
      item: codexItem({ id: "gmail@openai-curated", authRequired: true }),
      capabilitySnapshot: { apps: [{ id: "gmail", name: "Gmail" }], skills: ["read"] },
      capabilityDigest: "sha256-detail",
      authLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }],
      connectUrls: ["https://accounts.google.com/o/oauth2/v2/auth", "javascript:alert(2)"],
    };
    const container = mount(viewProps({ codexDetail: detail }));
    const links = [...container.querySelectorAll<HTMLAnchorElement>(".plugins-detail a")];
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toContain("Connect account");
    expect(links[0]?.href).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("uses the Codex auth policy as guidance until runtime reports missing auth", () => {
    const detail: UserCodexPluginDetail = {
      item: codexItem({ id: "gmail@openai-curated", authRequired: false }),
      capabilitySnapshot: { apps: [{ id: "gmail", name: "Gmail" }] },
      capabilityDigest: "sha256-detail",
    };
    const beforeGrant = mount(viewProps({ codexDetail: detail }));
    const beforeGrantText = normalizedText(beforeGrant.querySelector(".plugins-detail"));
    expect(beforeGrantText).toContain("Use these plugins from a chat model marked Codex.");
    expect(beforeGrantText).toContain(
      "This plugin may ask you to connect an account when it is first used.",
    );
    expect(beforeGrantText).not.toContain("Connect the listed account before using this plugin.");

    const readyGrant = codexGrant({ ready: true });
    const readyGrantContainer = mount(
      viewProps({
        codexDetail: detail,
        codexCatalog: { status: "available", items: [], installed: [readyGrant], requests: [] },
      }),
    );
    const readyGrantText = normalizedText(readyGrantContainer.querySelector(".plugins-detail"));
    expect(readyGrantText).not.toContain(
      "This plugin may ask you to connect an account when it is first used.",
    );
    expect(readyGrantText).not.toContain("Connect the listed account before using this plugin.");
  });

  it("allows a new Codex request after access was revoked", () => {
    const onRequestCodex = vi.fn();
    const item = codexItem({ id: "gmail@openai-curated", installed: true, grantState: "revoked" });
    const grant = codexGrant({ state: "revoked" });
    const container = mount(
      viewProps({
        tab: "discover",
        onRequestCodex,
        codexCatalog: { status: "available", items: [item], installed: [grant], requests: [] },
      }),
    );
    const button = container.querySelector<HTMLButtonElement>(
      '[data-codex-plugin-id="gmail@openai-curated"] .plugins-install',
    );
    expect(button?.textContent?.trim()).toBe("Request Admin");
    button?.click();
    expect(onRequestCodex).toHaveBeenCalledWith(item);
  });

  it("keeps ClawHub results visible when the public Codex catalog is unavailable", () => {
    const container = mount(
      viewProps({
        tab: "discover",
        catalog: [catalogItem()],
        codexCatalog: { status: "unavailable", items: [], installed: [], requests: [] },
      }),
    );
    expect(container.querySelector('[data-extension-key="@openclaw/github"]')).not.toBeNull();
    expect(normalizedText(container)).toContain("Codex catalog is temporarily unavailable");
  });

  it.each(["active", "unavailable", "orphaned", "suspended_version_mismatch"] as const)(
    "allows an account to relinquish a %s native grant",
    (state) => {
      const grant: UserPluginGrant = {
        id: "grant-qa",
        pluginId: "qa-native",
        exactVersion: "1.0.0",
        integrity: "sha256-qa",
        approvedTools: ["qa_echo"],
        state,
        revision: 1,
        createdAt: 1,
        updatedAt: 1,
      };
      const props = viewProps({ grants: [grant] });
      const container = mount(props);
      const button = container.querySelector<HTMLButtonElement>("[data-plugin-grant-id] button")!;
      expect(button.textContent?.trim()).toBe("Relinquish access");
      button.click();
      expect(props.onRelinquishGrant).toHaveBeenCalledWith(grant);
    },
  );

  it.each([true, false])(
    "does not offer duplicate installation for an installed Skill (enabled: %s)",
    (enabled) => {
      const props = viewProps({
        tab: "discover",
        query: "github",
        catalog: [catalogItem()],
        installs: [skillInstall({ enabled, state: enabled ? "ready" : "disabled" })],
      });
      const container = mount(props);
      const button = container.querySelector<HTMLButtonElement>(".plugins-install")!;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe("Installed");
      container.querySelector<HTMLElement>("[data-extension-key]")!.click();
      expect(props.onReview).not.toHaveBeenCalled();
    },
  );

  it("opens review details for unverified releases but keeps alternate registries disabled", () => {
    const onReview = vi.fn();
    const pending = catalogItem({
      catalogKey: "@openclaw/pending",
      name: "Pending release",
      integrity: null,
      trust: null,
      allowedAction: "none",
      reasonCodes: ["REVIEW_REQUIRED"],
    });
    const alternate = catalogItem({
      catalogKey: "skills-sh:external/skills/pending",
      name: "Alternate release",
      integrity: null,
      trust: null,
      allowedAction: "none",
      reasonCodes: ["ALTERNATE_REGISTRY_DENIED"],
    });
    const container = mount(
      viewProps({ tab: "discover", onReview, catalog: [pending, alternate] }),
    );

    const pendingButton = container.querySelector<HTMLButtonElement>(
      '[data-extension-key="@openclaw/pending"] .plugins-install',
    )!;
    expect(pendingButton.disabled).toBe(false);
    expect(pendingButton.textContent?.trim()).toBe("Review details");
    expect(pendingButton.closest(".plugins-item")?.textContent).toContain("Not checked yet");
    pendingButton.click();
    expect(onReview).toHaveBeenCalledWith(pending);

    const alternateButton = container.querySelector<HTMLButtonElement>(
      '[data-extension-key="skills-sh:external/skills/pending"] .plugins-install',
    )!;
    expect(alternateButton.disabled).toBe(true);
    alternateButton.click();
    expect(onReview).toHaveBeenCalledOnce();
  });

  beforeEach(async () => {
    await i18n.setLocale("en");
  });

  afterEach(() => {
    for (const container of document.body.querySelectorAll("div")) {
      render(nothing, container);
    }
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it.each(["", "github"])(
    "renders Skills and native plugins in the canonical hub for query %j",
    (query) => {
      const container = mount(
        viewProps({
          tab: "discover",
          query,
          catalog: [
            catalogItem(),
            catalogItem({
              catalogKey: "@openclaw/github-workflow",
              kind: "bundle_plugin",
              name: "GitHub Workflow",
              integrity: "sha256-plugin",
              allowedAction: "request_admin",
              reasonCodes: ["NATIVE_PLUGIN_REQUIRES_ADMIN"],
            }),
          ],
        }),
      );

      expect(container.querySelector(".hub-tabs")).not.toBeNull();
      expect(container.querySelector(".settings-page.settings-page--wide")).not.toBeNull();
      expect(container.querySelectorAll(".settings-group .plugins-item")).toHaveLength(2);
      expect(container.querySelectorAll(".plugins-tile")).toHaveLength(2);
      expect(container.querySelector(".eu-extension-card")).toBeNull();
      expect(normalizedText(container)).toContain("Skills from ClawHub 1");
      expect(normalizedText(container)).toContain("Native plugins 1");
      expect(normalizedText(container)).toContain("Admin approval required");
    },
  );

  it("identifies the exact release being reviewed while the catalog is locked", () => {
    const container = mount(
      viewProps({
        tab: "discover",
        query: "convert",
        busy: true,
        reviewingCatalogKey: "@openclaw/quick-converter",
        catalog: [
          catalogItem({
            catalogKey: "@openclaw/quick-converter",
            name: "Quick Converter",
          }),
          catalogItem({ catalogKey: "@openclaw/unit-converter", name: "Unit Converter" }),
        ],
      }),
    );

    const active = container.querySelector('[data-extension-key="@openclaw/quick-converter"]');
    const inactive = container.querySelector('[data-extension-key="@openclaw/unit-converter"]');
    expect(active?.getAttribute("aria-busy")).toBe("true");
    expect(normalizedText(active?.querySelector(".plugins-install") ?? null)).toBe("Reviewing…");
    expect(inactive?.getAttribute("aria-busy")).toBe("false");
    expect(normalizedText(inactive?.querySelector(".plugins-install") ?? null)).toBe(
      "Review details",
    );
  });

  it("clarifies that the empty inventory only covers Skills managed from this page", () => {
    const container = mount(viewProps());

    expect(normalizedText(container)).toContain("No managed Skills yet");
    expect(normalizedText(container)).toContain(
      "Built-in or manually managed Skills may still be available.",
    );
  });

  it("partitions installed Skills into the same enabled, disabled, and issues filters", () => {
    const container = mount(
      viewProps({
        installedFilter: "issues",
        installs: [
          skillInstall(),
          skillInstall({ id: "skill-2", skillName: "Needs setup", state: "needs_setup" }),
          skillInstall({ id: "skill-3", skillName: "Disabled", enabled: false, state: "disabled" }),
        ],
      }),
    );

    const filters = normalizedText(container.querySelector(".settings-segmented"));
    expect(filters).toContain("All 3");
    expect(filters).toContain("Enabled 1");
    expect(filters).toContain("Disabled 1");
    expect(filters).toContain("Issues 1");
    expect(container.querySelectorAll("[data-skill-install-id]")).toHaveLength(1);
    expect(normalizedText(container)).toContain("Needs setup");
  });

  it("keeps account-wide requests free of a misleading Agent selector", () => {
    const container = mount(viewProps({ tab: "requests", requests: [pluginRequest()] }));

    expect(container.querySelector("openclaw-agent-select")).toBeNull();
    expect(normalizedText(container)).toContain("Pending Admin review");
    expect(normalizedText(container)).toContain("Cancel request");
  });

  it.each([
    ["en", "Ask your Admin to inspect the installation error"],
    ["vi", "Nhờ Admin kiểm tra lỗi cài đặt"],
  ] as const)(
    "explains a failed native install in %s without offering cancellation",
    async (locale, guidance) => {
      await i18n.setLocale(locale);
      const container = mount(
        viewProps({
          tab: "requests",
          requests: [
            pluginRequest({ state: "install_failed", safeErrorCode: "PLUGIN_INSTALL_FAILED" }),
          ],
        }),
      );
      expect(normalizedText(container.querySelector("[role='alert']"))).toContain(guidance);
      expect(normalizedText(container)).not.toContain("PLUGIN_INSTALL_FAILED");
      expect(container.querySelector("[data-plugin-request-id] button")).toBeNull();
    },
  );

  it("presents the reviewed release in the canonical detail dialog with its security scope", () => {
    const item = catalogItem({
      catalogKey: "@openclaw/github-workflow",
      kind: "bundle_plugin",
      name: "GitHub Workflow",
      integrity: "sha256-plugin",
      requirements: ["network"],
      allowedAction: "request_admin",
      reasonCodes: ["NATIVE_PLUGIN_REQUIRES_ADMIN"],
    });
    const review: UserExtensionReview = {
      item,
      reviewToken: "review-token",
      expiresAt: Date.now() + 60_000,
    };
    const container = mount(
      viewProps({
        tab: "discover",
        query: "github",
        review,
        error: "Review expired. Please review again.",
      }),
    );

    expect(container.querySelector(".plugins-detail")).not.toBeNull();
    expect(container.querySelector(".plugins-cover")).not.toBeNull();
    expect(normalizedText(container.querySelector(".plugins-detail"))).toContain(
      "Native plugins run globally in the Gateway",
    );
    expect(normalizedText(container.querySelector(".plugins-detail__actions"))).toContain(
      "Request Admin",
    );
    expect(normalizedText(container.querySelector(".plugins-detail [role='alert']"))).toContain(
      "Review expired. Please review again.",
    );
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1);
  });
});
