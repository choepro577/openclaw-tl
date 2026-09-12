/* @vitest-environment jsdom */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type {
  EnterpriseCodexPluginRequest,
  EnterpriseCodexPluginRequestDetail,
  EnterprisePluginRequestDetail,
} from "../../enterprise/services/enterprise-api.ts";
import { EnterpriseAdminPluginsPage } from "./plugins-page.ts";

const visibility = vi.hoisted(() => ({ enabled: true }));
vi.mock("../../enterprise-plugin-visibility.ts", () => ({
  get ENTERPRISE_CODEX_PLUGINS_VISIBLE() {
    return visibility.enabled;
  },
}));
beforeEach(async () => {
  await i18n.setLocale("vi");
  visibility.enabled = true;
});

const api = vi.hoisted(() => ({
  approveAdminPluginRequest: vi.fn(),
  approveAdminCodexPluginRequest: vi.fn(),
  listAdminCodexPluginRequests: vi.fn(),
  listAdminPluginRequests: vi.fn(),
  loadAdminCodexPluginRequest: vi.fn(),
  loadAdminPluginRequest: vi.fn(),
  rejectAdminCodexPluginRequest: vi.fn(),
  rejectAdminPluginRequest: vi.fn(),
  revokeAdminPluginGrant: vi.fn(),
}));
vi.mock("../../enterprise/services/enterprise-api.ts", () => api);

afterEach(async () => {
  await i18n.setLocale("en");
  document.body.replaceChildren();
  vi.resetAllMocks();
});

beforeEach(() => {
  api.listAdminCodexPluginRequests.mockResolvedValue([]);
});

function requestDetail(): EnterprisePluginRequestDetail {
  return {
    request: {
      id: "request-qa",
      requesterAccountId: "account-qa",
      scope: "account",
      agentKey: null,
      runtimeAgentId: null,
      packageName: "qa-plugin",
      packageFamily: "bundle_plugin",
      exactVersion: "1.0.0",
      integrity: "sha256-qa",
      requestKind: "install",
      trustSnapshot: { disposition: "clean" },
      capabilitySnapshot: {},
      capabilityDigest: "qa-digest",
      state: "pending",
      installedPluginId: null,
      reviewerAccountId: null,
      decisionReason: null,
      safeErrorCode: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      decidedAt: null,
    },
    account: { id: "account-qa", username: "qa", displayName: "QA" },
    globalImpact: { scope: "gateway", nativeSurfaces: [], affectedAccounts: [] },
    artifactCheck: { ok: true, checkedAt: 1 },
    globalStatus: {
      installed: false,
      loaded: false,
      pluginId: null,
      version: null,
      integrity: null,
      toolOwnershipMatches: false,
      tools: [],
    },
    grants: [],
  };
}

function codexRequest(
  overrides: Partial<EnterpriseCodexPluginRequest> = {},
): EnterpriseCodexPluginRequest {
  return {
    id: "codex-request-qa",
    pluginId: "gmail@openai-curated",
    pluginName: "gmail",
    marketplaceName: "openai-curated",
    requesterAccountId: "account-qa",
    scope: "account",
    agentKey: "personal",
    runtimeAgentId: "agent-runtime-qa",
    requestKind: "install",
    catalogSnapshot: { id: "gmail@openai-curated", name: "Gmail" },
    capabilitySnapshot: { apps: [{ id: "gmail", name: "Gmail" }] },
    capabilityDigest: "sha256-codex",
    state: "pending",
    installedPluginId: null,
    reviewerAccountId: null,
    decisionReason: null,
    safeErrorCode: null,
    authRequired: false,
    appsNeedingAuth: [],
    connectUrls: [],
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    decidedAt: null,
    ...overrides,
  };
}

function codexDetail(request: EnterpriseCodexPluginRequest): EnterpriseCodexPluginRequestDetail {
  return {
    request,
    account: { id: "account-qa", username: "qa", displayName: "QA" },
    detail: {
      item: {
        id: "gmail@openai-curated",
        pluginName: "gmail",
        marketplaceName: "openai-curated",
        name: "Gmail",
        description: "Read Gmail",
        installed: false,
        enabled: false,
        available: true,
        installPolicy: null,
        authPolicy: "ON_USE",
        requestState: "pending",
        grantState: null,
      },
      capabilitySnapshot: { apps: [{ id: "gmail", name: "Gmail" }] },
      capabilityDigest: request.capabilityDigest,
    },
    grant: null,
  };
}

function clickButton(page: Element, label: string): void {
  const button = [...page.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  button.click();
}

describe("Enterprise admin failed approval recovery", () => {
  it.each([false, true])(
    "refreshes saved state without losing the install error (refresh failure: %s)",
    async (refreshFails) => {
      const detail = requestDetail();
      const failed: EnterprisePluginRequestDetail = {
        ...detail,
        request: { ...detail.request, state: "install_failed", revision: 3 },
      };
      api.listAdminPluginRequests.mockResolvedValue([detail.request]);
      api.loadAdminPluginRequest.mockResolvedValue(detail);
      api.approveAdminPluginRequest.mockRejectedValue(
        new Error("Package requires compiled runtime output."),
      );
      const page = new EnterpriseAdminPluginsPage();
      document.body.append(page);
      await vi.waitFor(() => expect(page.textContent).toContain("Xem & duyệt"));
      clickButton(page, "Xem & duyệt");
      await vi.waitFor(() => expect(page.querySelector(".ea-plugin-review")).not.toBeNull());
      api.listAdminPluginRequests.mockResolvedValue([failed.request]);
      if (refreshFails) {
        api.loadAdminPluginRequest.mockRejectedValue(new Error("Refresh is unavailable."));
      } else {
        api.loadAdminPluginRequest.mockResolvedValue(failed);
      }
      clickButton(page, "Phê duyệt");
      await vi.waitFor(() =>
        expect(page.querySelector("[role='alert']")?.textContent).toContain(
          "Package requires compiled runtime output.",
        ),
      );
      expect(page.querySelector("[role='alert']")?.textContent).not.toContain(
        "Refresh is unavailable.",
      );
      if (!refreshFails) {
        expect(page.querySelector(".ea-plugin-review")?.textContent).toContain("Cài đặt thất bại");
        clickButton(page, "Phê duyệt");
        await vi.waitFor(() =>
          expect(api.approveAdminPluginRequest).toHaveBeenLastCalledWith(failed.request, "account"),
        );
      }
    },
  );
});

describe("Enterprise admin plugin review feedback", () => {
  it("shows progress and prevents duplicate loads while opening a request", async () => {
    const detail = requestDetail();
    api.listAdminPluginRequests.mockResolvedValue([detail.request]);
    let finish!: (value: EnterprisePluginRequestDetail) => void;
    api.loadAdminPluginRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const page = new EnterpriseAdminPluginsPage();
    document.body.append(page);
    await vi.waitFor(() => expect(page.textContent).toContain("Xem & duyệt"));
    clickButton(page, "Xem & duyệt");
    await page.updateComplete;
    const button = page.querySelector<HTMLButtonElement>("td.ea-table__action button")!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    button.click();
    expect(api.loadAdminPluginRequest).toHaveBeenCalledOnce();
    finish(detail);
    await vi.waitFor(() => expect(page.querySelector(".ea-plugin-review")).not.toBeNull());
  });

  it("shows a failed decision inside the open dialog, not behind it", () => {
    const detail = requestDetail();
    const page = new EnterpriseAdminPluginsPage();
    Object.assign(page, { selected: detail, loading: false, error: "Revision conflict." });
    const container = document.createElement("div");
    render(page.render(), container);

    expect(
      container.querySelector("openclaw-enterprise-admin-dialog [role='alert']")?.textContent,
    ).toContain("Revision conflict.");
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1);
  });
});

describe("Enterprise admin Codex plugin requests", () => {
  it("lets an admin approve a shared-Agent request with shared ownership", async () => {
    const request = codexRequest({
      agentKey: "shared:research",
      scope: "account",
    });
    const detail = codexDetail(request);
    api.listAdminPluginRequests.mockResolvedValue([]);
    api.listAdminCodexPluginRequests.mockResolvedValue([request]);
    api.loadAdminCodexPluginRequest.mockResolvedValue(detail);
    api.approveAdminCodexPluginRequest.mockResolvedValue({ request, grant: null });
    const page = new EnterpriseAdminPluginsPage();
    document.body.append(page);
    await vi.waitFor(() =>
      expect(page.querySelector('tr[data-codex-request-id="codex-request-qa"]')).not.toBeNull(),
    );
    page
      .querySelector<HTMLButtonElement>('tr[data-codex-request-id="codex-request-qa"] button')
      ?.click();
    await vi.waitFor(() =>
      expect(
        page.querySelector("openclaw-enterprise-admin-dialog .ea-plugin-review"),
      ).not.toBeNull(),
    );
    const scope = page.querySelector<HTMLSelectElement>(
      "openclaw-enterprise-admin-dialog select.ea-select",
    );
    expect(scope?.value).toBe("account");
    scope!.value = "shared_agent";
    scope!.dispatchEvent(new Event("change", { bubbles: true }));
    await page.updateComplete;
    clickButton(page, "Phê duyệt & cài Codex");
    await vi.waitFor(() =>
      expect(api.approveAdminCodexPluginRequest).toHaveBeenCalledWith(request, "shared_agent"),
    );
  });

  it("shows the runtime authentication result after approving a Codex request", async () => {
    const request = codexRequest();
    const detail = codexDetail(request);
    api.listAdminPluginRequests.mockResolvedValue([]);
    api.listAdminCodexPluginRequests.mockResolvedValue([request]);
    api.loadAdminCodexPluginRequest.mockResolvedValue(detail);
    api.approveAdminCodexPluginRequest.mockResolvedValue({
      request: codexRequest({
        state: "available",
        revision: 3,
        installedPluginId: "gmail@openai-curated",
      }),
      grant: null,
      authRequired: true,
      appsNeedingAuth: [
        { id: "google", name: "Google", installUrl: "https://accounts.google.com" },
      ],
      connectUrls: ["https://accounts.google.com"],
      restartRequired: true,
    });
    const page = new EnterpriseAdminPluginsPage();
    document.body.append(page);
    await vi.waitFor(() =>
      expect(page.querySelector('tr[data-codex-request-id="codex-request-qa"]')).not.toBeNull(),
    );
    page
      .querySelector<HTMLButtonElement>('tr[data-codex-request-id="codex-request-qa"] button')
      ?.click();
    await vi.waitFor(() =>
      expect(
        page.querySelector("openclaw-enterprise-admin-dialog .ea-plugin-review"),
      ).not.toBeNull(),
    );
    clickButton(page, "Phê duyệt & cài Codex");
    await vi.waitFor(() => expect(page.textContent).toContain("Plugin cần kết nối tài khoản."));
    expect(page.textContent).toContain("Google");
    expect(page.textContent).toContain("https://accounts.google.com");
    expect(page.textContent).toContain("Cần khởi động lại phiên Agent.");
    expect(api.approveAdminCodexPluginRequest).toHaveBeenCalledWith(request, "account");
  });
});

it("hides Codex requests and does not load their API when disabled", async () => {
  visibility.enabled = false;
  api.listAdminPluginRequests.mockResolvedValue([]);
  const page = new EnterpriseAdminPluginsPage();
  document.body.append(page);
  await vi.waitFor(() => expect(api.listAdminPluginRequests).toHaveBeenCalled());
  await page.updateComplete;
  expect(api.listAdminCodexPluginRequests).not.toHaveBeenCalled();
  expect(page.textContent).not.toContain("Codex");
});
