import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EnterpriseAccount,
  EnterpriseAccessPreset,
} from "../../enterprise/services/enterprise-api.ts";
import "../../../styles/base.css";
import "../admin.css";
import { EnterpriseAdminAccountsPage } from "./accounts-page.ts";
import { EnterpriseAdminConfigToolsPage } from "./config-tools-page.ts";

const basicToolIds = [
  "read",
  "write",
  "edit",
  "apply_patch",
  "exec",
  "process",
  "memory_search",
  "memory_get",
  "agents_wait",
  "ask_user",
  "automations",
  "progress_card",
  "suggest_task",
  "browser",
  "show_widget",
  "dashboard",
  "canvas",
  "conversations_list",
  "conversations_send",
  "conversations_turn",
  "session_status",
  "sessions",
  "sessions_history",
  "sessions_search",
  "sessions_send",
  "music_generate",
  "tts",
  "video_generate",
  "view_image",
  "web_search",
  "web_fetch",
  "x_search",
] as const;

const accessPresets: EnterpriseAccessPreset[] = [
  {
    key: "basic@1",
    label: "Quyền cơ bản",
    description: "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.",
    toolIds: [...basicToolIds],
  },
  {
    key: "standard-coding@1",
    label: "Lập trình tiêu chuẩn",
    description: "Đọc, ghi, sửa file và chạy lệnh trong sandbox.",
    toolIds: ["read", "write", "edit", "apply_patch", "exec", "process"],
  },
  {
    key: "none",
    label: "Không có preset",
    description: "Chỉ sử dụng các quyền được cấp riêng.",
    toolIds: [],
  },
];

let serverAccount: EnterpriseAccount;
let fetchMock: ReturnType<typeof vi.fn>;
const requestLog: Array<{ method: string; path: string; body: Record<string, unknown> | null }> =
  [];

function accountFixture(accessPresetKey = "standard-coding@1"): EnterpriseAccount {
  return {
    id: "account-1",
    profileId: "profile-1",
    username: "hieu",
    displayName: "Hiếu DZ",
    role: "employee",
    mustChangePassword: false,
    enabled: true,
    personalAgentEnabled: true,
    defaultAgentId: null,
    accessPresetKey,
    policyRevision: 7,
    createdAt: 1,
    updatedAt: 2,
    lastLoginAt: null,
  };
}

function detailResponse() {
  return {
    account: serverAccount,
    entitlements: [],
    effectivePolicy: {
      accountId: serverAccount.id,
      role: serverAccount.role,
      personalAgentEnabled: serverAccount.personalAgentEnabled,
      defaultAgentId: serverAccount.defaultAgentId,
      entitlements: [],
      employeeHardDeniedTools: [],
    },
    sessions: [],
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function installApiFixture(): void {
  requestLog.length = 0;
  serverAccount = accountFixture();
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === "string"
        ? new URL(input, globalThis.location.href)
        : new URL(input.toString());
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const rawBody = typeof init?.body === "string" ? init.body : null;
    const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
    requestLog.push({ method, path: requestUrl.pathname, body });

    if (requestUrl.pathname === "/api/enterprise/admin/accounts" && method === "GET") {
      return jsonResponse({
        accounts: [serverAccount],
        pageInfo: { total: 1, nextCursor: null },
        accessPresets,
      });
    }
    if (
      requestUrl.pathname === `/api/enterprise/admin/accounts/${serverAccount.id}` &&
      method === "GET"
    ) {
      return jsonResponse(detailResponse());
    }
    if (
      requestUrl.pathname === `/api/enterprise/admin/accounts/${serverAccount.id}/delegation` &&
      method === "GET"
    ) {
      return jsonResponse({
        account: serverAccount,
        policy: {
          rollout: "off",
          routerModel: "",
          autoThreshold: 0.8,
          clarifyThreshold: 0.5,
          minimumMargin: 0.1,
          maxDelegatesPerTurn: 1,
          eventRetentionDays: 30,
          revision: 1,
          updatedAt: 1,
        },
        overrides: [],
        specialists: [],
      });
    }
    if (
      requestUrl.pathname === `/api/enterprise/admin/accounts/${serverAccount.id}` &&
      method === "PATCH"
    ) {
      serverAccount = {
        ...serverAccount,
        ...(body as Partial<EnterpriseAccount>),
        updatedAt: serverAccount.updatedAt + 1,
      };
      return jsonResponse({ account: serverAccount });
    }
    if (requestUrl.pathname === "/api/enterprise/admin/agents" && method === "GET") {
      return jsonResponse({ shared: [], personal: [], catalogRevision: "fixture" });
    }
    if (requestUrl.pathname === "/api/enterprise/admin/skills" && method === "GET") {
      return jsonResponse({ items: [], catalogRevision: "fixture" });
    }
    if (requestUrl.pathname === "/api/enterprise/admin/tools" && method === "GET") {
      return jsonResponse({ items: [], catalogRevision: "fixture" });
    }
    throw new Error(`Unexpected fixture request: ${method} ${requestUrl.pathname}`);
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
}

async function waitForText(host: HTMLElement, text: string): Promise<void> {
  await vi.waitFor(() => expect(host.textContent).toContain(text));
}

async function waitForUpdate(host: EnterpriseAdminAccountsPage): Promise<void> {
  await host.updateComplete;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await host.updateComplete;
}

async function mountAccountsPage(): Promise<EnterpriseAdminAccountsPage> {
  const page = document.createElement(
    "openclaw-enterprise-admin-accounts-page",
  ) as EnterpriseAdminAccountsPage;
  document.body.append(page);
  await vi.waitFor(() =>
    expect(
      requestLog.filter(
        (request) => request.method === "GET" && request.path.endsWith("/admin/accounts"),
      ),
    ).toHaveLength(1),
  );
  await waitForUpdate(page);
  return page;
}

async function mountToolsPage(): Promise<EnterpriseAdminConfigToolsPage> {
  const page = document.createElement(
    "openclaw-enterprise-admin-config-tools-page",
  ) as EnterpriseAdminConfigToolsPage;
  document.body.append(page);
  await waitForText(page, "Tools");
  return page;
}

describe("Enterprise access preset browser flow", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    const { page } = await import("vitest/browser");
    await page.viewport(1280, 900);
    originalFetch = globalThis.fetch;
    installApiFixture();
    document.body.replaceChildren();
  });

  afterEach(() => {
    document.body.replaceChildren();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders the server basic preset in the real create form", async () => {
    const page = await mountAccountsPage();
    const createButton = [...page.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Tạo tài khoản"),
    );
    expect(createButton).toBeDefined();
    createButton?.click();
    await waitForUpdate(page);

    const firstStep = page.querySelector<HTMLFormElement>("form");
    expect(firstStep).not.toBeNull();
    if (!firstStep) {
      return;
    }
    const fields: Record<string, string> = {
      username: "new.user",
      displayName: "Tài khoản mới",
      initialPassword: "temporary-123",
      confirmPassword: "temporary-123",
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = firstStep.elements.namedItem(name);
      expect(input instanceof HTMLInputElement, `${name} input`).toBe(true);
      if (input instanceof HTMLInputElement) {
        input.value = value;
      }
    }
    firstStep.requestSubmit();
    await waitForUpdate(page);

    await waitForText(page, "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.");
    const presetSelect = page.querySelector<HTMLSelectElement>("select[name='accessPresetKey']");
    expect(presetSelect?.value).toBe("basic@1");
    expect(page.querySelectorAll(".ea-account-tool-list .ea-badge")).toHaveLength(32);
    expect(page.textContent).toContain("browser");
    expect(page.textContent).toContain("web_fetch");
  });

  it("submits a changed preset and reapplies it without losing an unsaved name", async () => {
    const page = await mountAccountsPage();
    const row = [...page.querySelectorAll("tbody tr")].find((candidate) =>
      candidate.textContent?.includes("@hieu"),
    );
    expect(row).toBeDefined();
    row?.querySelector<HTMLButtonElement>("button")?.click();

    await waitForText(page, "Áp dụng preset sẽ gỡ chặn nhóm công cụ này");
    await waitForUpdate(page);
    let presetSelect = page.querySelector<HTMLSelectElement>("select[name='accessPresetKey']");
    expect(presetSelect?.value).toBe("standard-coding@1");
    if (!presetSelect) {
      return;
    }
    presetSelect.value = "basic@1";
    presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await page.updateComplete;

    const form = page.querySelector<HTMLFormElement>("form");
    expect(form).not.toBeNull();
    form?.requestSubmit();
    await vi.waitFor(() =>
      expect(
        requestLog.filter(
          (request) =>
            request.method === "PATCH" && request.path.endsWith("/admin/accounts/account-1"),
        ),
      ).toHaveLength(1),
    );
    expect(requestLog.at(-1)?.body).toMatchObject({
      accessPresetKey: "basic@1",
      applyAccessPreset: true,
    });

    await waitForText(page, "Quyền cơ bản");
    await waitForUpdate(page);
    await vi.waitFor(() =>
      expect(
        requestLog.filter(
          (request) => request.method === "GET" && request.path.endsWith("/admin/accounts"),
        ),
      ).toHaveLength(2),
    );
    const displayName = page.querySelector<HTMLInputElement>("input[name='displayName']");
    expect(displayName).not.toBeNull();
    if (!displayName) {
      return;
    }
    displayName.value = "Bản nháp chưa lưu";
    displayName.dispatchEvent(new Event("input", { bubbles: true }));
    const reapplyButton = [...page.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Áp dụng lại preset"),
    );
    expect(reapplyButton).toBeDefined();
    await vi.waitFor(() => expect((reapplyButton as HTMLButtonElement)?.disabled).toBe(false));
    reapplyButton?.click();

    await vi.waitFor(() =>
      expect(
        requestLog.filter(
          (request) =>
            request.method === "PATCH" && request.path.endsWith("/admin/accounts/account-1"),
        ),
      ).toHaveLength(2),
    );
    expect(requestLog.at(-1)?.body).toMatchObject({
      displayName: "Bản nháp chưa lưu",
      accessPresetKey: "basic@1",
      applyAccessPreset: true,
    });
  });

  it("shows policy grant and runtime readiness as separate states", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === "string"
          ? new URL(input, globalThis.location.href)
          : new URL(input.toString());
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const rawBody = typeof init?.body === "string" ? init.body : null;
      const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
      requestLog.push({ method, path: requestUrl.pathname, body });
      if (requestUrl.pathname === "/api/enterprise/admin/accounts" && method === "GET") {
        return jsonResponse({
          accounts: [serverAccount],
          pageInfo: { total: 1, nextCursor: null },
          accessPresets,
        });
      }
      if (requestUrl.pathname === "/api/enterprise/admin/tools" && method === "GET") {
        return jsonResponse({
          catalogRevision: "fixture",
          items: [
            {
              resourceKey: "tool:core:browser",
              toolId: "browser",
              label: "browser",
              source: "core",
              risk: "medium",
              agentId: null,
              assignable: true,
              nonDelegable: false,
              sessionDependent: true,
              assignedUserCount: 1,
              effectiveAccess: {
                assignedEffect: "allow",
                permissionAllowed: true,
                effectiveAllowed: false,
                intrinsicStatus: "ready",
                reasonCodes: ["runtime_check_required"],
                setupReason: "runtime_check_required",
                policyRevision: serverAccount.policyRevision,
                catalogRevision: "fixture",
              },
            },
            {
              resourceKey: "tool:core:exec",
              toolId: "exec",
              label: "exec",
              source: "core",
              risk: "high",
              agentId: null,
              assignable: true,
              nonDelegable: false,
              sessionDependent: false,
              assignedUserCount: 0,
              effectiveAccess: {
                assignedEffect: "deny",
                permissionAllowed: false,
                effectiveAllowed: false,
                intrinsicStatus: "ready",
                reasonCodes: ["explicit_deny"],
                policyRevision: serverAccount.policyRevision,
                catalogRevision: "fixture",
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected tools fixture request: ${method} ${requestUrl.pathname}`);
    });

    const page = await mountToolsPage();
    const accountSelect = page.querySelector<HTMLSelectElement>(
      "select[aria-label='Lọc theo user']",
    );
    expect(accountSelect).not.toBeNull();
    if (!accountSelect) {
      return;
    }
    accountSelect.value = serverAccount.id;
    accountSelect.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => expect(page.textContent).toContain("Cần kiểm tra điều kiện chạy"));
    expect(page.textContent).toContain("Đã cấp quyền");
    expect(page.textContent).toContain("Bị admin chặn");
    expect(page.textContent).not.toContain("Được chạy");
    expect(page.textContent).toContain("Cần kiểm tra điều kiện trong phiên chạy");
    expect(page.textContent).not.toContain("runtime_check_required");
  });
});
