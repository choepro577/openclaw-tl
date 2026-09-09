/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type {
  EnterpriseAccount,
  EnterpriseAccessPreset,
  EnterpriseSharedAgent,
  EnterpriseSkillCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import { EnterpriseAdminAccountsPage } from "./accounts-page.ts";

const enterpriseApiMocks = vi.hoisted(() => ({
  updateAdminAccount: vi.fn(),
  loadAdminAccount: vi.fn(),
  listAdminAccounts: vi.fn(),
}));

vi.mock("../../enterprise/services/enterprise-api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../enterprise/services/enterprise-api.ts")>()),
  ...enterpriseApiMocks,
}));

type MutableAccountsPage = {
  createOpen: boolean;
  createStep: 1 | 2;
  createRole: "administrator" | "employee";
  createPersonalAgentEnabled: boolean;
  createAccessPresetKey: string;
  accessPresets: EnterpriseAccessPreset[];
  createDefaultAgentId: string;
  createSelectedSkillKeys: string[];
  createSkillQuery: string;
  createCatalogLoading: boolean;
  createCatalogError: string;
  createSharedAgents: EnterpriseSharedAgent[];
  createSkills: EnterpriseSkillCatalogItem[];
  selected: unknown;
  detailAccessPresetKey: string;
  render(): unknown;
};

const financeAgent: EnterpriseSharedAgent = {
  kind: "shared",
  agentId: "finance",
  resourceKey: "agent:shared:finance",
  name: "Trợ lý tài chính",
  model: "openai/gpt-5.6-luna",
  workspace: "/workspace/finance",
  runtimeType: "embedded",
  assignedUserCount: 3,
  skillCount: 4,
  toolCount: 6,
};

const codingPreset: EnterpriseAccessPreset = {
  key: "standard-coding@1",
  label: "Lập trình tiêu chuẩn",
  description:
    "Đọc, ghi, sửa file và chạy lệnh trong sandbox.; áp dụng bản vá và chạy lệnh trong workspace.",
  toolIds: ["read", "write", "edit", "apply_patch", "exec", "process"],
};

const basicPreset: EnterpriseAccessPreset = {
  key: "basic@1",
  label: "Quyền cơ bản",
  description: "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.",
  toolIds: [
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
  ],
};

const noPreset: EnterpriseAccessPreset = {
  key: "none",
  label: "Không có preset",
  description: "Chỉ sử dụng các quyền được cấp riêng.",
  toolIds: [],
};

const detailAccount: EnterpriseAccount = {
  id: "account-1",
  profileId: "profile-1",
  username: "hieu",
  displayName: "Hiếu DZ",
  role: "employee",
  mustChangePassword: false,
  enabled: true,
  personalAgentEnabled: true,
  defaultAgentId: null,
  accessPresetKey: "basic@1",
  policyRevision: 7,
  createdAt: 1,
  updatedAt: 2,
  lastLoginAt: null,
};

const detail = {
  account: detailAccount,
  entitlements: [],
  effectivePolicy: {
    accountId: detailAccount.id,
    role: detailAccount.role,
    personalAgentEnabled: detailAccount.personalAgentEnabled,
    defaultAgentId: detailAccount.defaultAgentId,
    entitlements: [],
    employeeHardDeniedTools: [],
  },
  sessions: [],
};

const githubSkill: EnterpriseSkillCatalogItem = {
  resourceKey: "skill:global:openclaw-bundled:github",
  skillKey: "github",
  name: "GitHub",
  description: "Làm việc với repository và pull request.",
  source: "openclaw-bundled",
  category: "built-in",
  ownerAgentId: null,
  intrinsicStatus: "ready",
  setupReason: null,
  assignedUserCount: 2,
};

const unavailableSkill: EnterpriseSkillCatalogItem = {
  ...githubSkill,
  resourceKey: "skill:global:openclaw-bundled:1password",
  skillKey: "1password",
  name: "1password",
  intrinsicStatus: "unavailable",
  setupReason: "binary:op",
};

let container: HTMLDivElement;

describe("Enterprise admin account creation", () => {
  beforeEach(async () => {
    await i18n.setLocale("vi");
    enterpriseApiMocks.updateAdminAccount.mockReset();
    enterpriseApiMocks.loadAdminAccount.mockReset();
    enterpriseApiMocks.listAdminAccounts.mockReset();
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    render(nothing, container);
    container.remove();
    await i18n.setLocale("en");
  });

  it("presents access choices from human-readable Agent and Skill catalog data", () => {
    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.createOpen = true;
    page.createStep = 2;
    page.createRole = "employee";
    page.createPersonalAgentEnabled = false;
    page.createAccessPresetKey = "standard-coding@1";
    page.accessPresets = [basicPreset, codingPreset, noPreset];
    page.createDefaultAgentId = "finance";
    page.createSelectedSkillKeys = [githubSkill.resourceKey];
    page.createSkillQuery = "";
    page.createCatalogLoading = false;
    page.createCatalogError = "";
    page.createSharedAgents = [financeAgent];
    page.createSkills = [unavailableSkill, githubSkill];

    render(page.render(), container);

    const agentSelect = container.querySelector<HTMLSelectElement>("select[name='defaultAgentId']");
    expect(agentSelect?.selectedOptions[0]?.textContent).toContain("Trợ lý tài chính");
    expect(container.textContent).toContain("Đọc, ghi, sửa file và chạy lệnh trong sandbox.");
    expect(container.textContent).toContain("6 công cụ");
    expect(
      container.querySelector<HTMLInputElement>(
        `input[name='skillGrants'][value='${githubSkill.resourceKey}']`,
      )?.checked,
    ).toBe(true);
    expect(container.textContent).toContain("Làm việc với repository và pull request.");
    const skillOptions = container.querySelectorAll(".ea-account-skill-option");
    expect(skillOptions[0]?.textContent).toContain("GitHub");
    expect(container.textContent).toContain("1 dùng được");
    expect(container.querySelector("input[placeholder*='skill:global']")).toBeNull();
  });

  it("renders the exact server-provided 32-tool basic preset", () => {
    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.createOpen = true;
    page.createStep = 2;
    page.createRole = "employee";
    page.createPersonalAgentEnabled = true;
    page.createAccessPresetKey = "basic@1";
    page.accessPresets = [basicPreset, codingPreset, noPreset];
    page.createCatalogLoading = false;
    page.createCatalogError = "";
    page.createSharedAgents = [];
    page.createSkills = [];

    render(page.render(), container);

    expect(container.textContent).toContain("Quyền cơ bản");
    expect(container.textContent).toContain(
      "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.",
    );
    expect(container.querySelectorAll(".ea-account-tool-list .ea-badge")).toHaveLength(32);
    expect(container.textContent).toContain("browser");
    expect(container.textContent).toContain("web_fetch");
  });

  it("sends applyAccessPreset when the edit form changes the selected preset", async () => {
    enterpriseApiMocks.updateAdminAccount.mockResolvedValue({
      account: { ...detailAccount, accessPresetKey: "standard-coding@1" },
    });
    enterpriseApiMocks.loadAdminAccount.mockResolvedValue(detail);
    enterpriseApiMocks.listAdminAccounts.mockResolvedValue({
      accounts: [detailAccount],
      pageInfo: { total: 1, nextCursor: null },
      accessPresets: [basicPreset, codingPreset, noPreset],
    });

    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.selected = detail;
    page.detailAccessPresetKey = "basic@1";
    page.accessPresets = [basicPreset, codingPreset, noPreset];
    render(page.render(), container);

    const form = container.querySelector<HTMLFormElement>("form");
    const presetSelect = container.querySelector<HTMLSelectElement>(
      "select[name='accessPresetKey']",
    );
    expect(form).not.toBeNull();
    expect(presetSelect?.value).toBe("basic@1");
    if (!form || !presetSelect) {
      return;
    }
    presetSelect.value = "standard-coding@1";
    presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledOnce());
    expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledWith(
      detailAccount.id,
      expect.objectContaining({
        accessPresetKey: "standard-coding@1",
        applyAccessPreset: true,
      }),
    );
  });

  it("reapplies the selected preset with an explicit flag", async () => {
    enterpriseApiMocks.updateAdminAccount.mockResolvedValue({ account: detailAccount });
    enterpriseApiMocks.loadAdminAccount.mockResolvedValue(detail);
    enterpriseApiMocks.listAdminAccounts.mockResolvedValue({
      accounts: [detailAccount],
      pageInfo: { total: 1, nextCursor: null },
      accessPresets: [basicPreset, codingPreset, noPreset],
    });

    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.selected = detail;
    page.detailAccessPresetKey = "basic@1";
    page.accessPresets = [basicPreset, codingPreset, noPreset];
    render(page.render(), container);

    const applyButton = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Áp dụng lại preset"),
    );
    expect(applyButton).toBeDefined();
    const displayName = container.querySelector<HTMLInputElement>("input[name='displayName']");
    expect(displayName).not.toBeNull();
    if (!displayName) {
      return;
    }
    displayName.value = "Bản nháp chưa lưu";
    applyButton?.click();

    await vi.waitFor(() => expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledOnce());
    expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledWith(
      detailAccount.id,
      expect.objectContaining({
        displayName: "Bản nháp chưa lưu",
        accessPresetKey: "basic@1",
        applyAccessPreset: true,
      }),
    );
  });

  it("keeps unsaved account edits across a locale rerender and submits them", async () => {
    const editedAccount = {
      ...detailAccount,
      displayName: "Bản nháp mới",
      role: "administrator" as const,
      accessPresetKey: "standard-coding@1",
    };
    enterpriseApiMocks.updateAdminAccount.mockResolvedValue({ account: editedAccount });
    enterpriseApiMocks.loadAdminAccount.mockResolvedValue({
      ...detail,
      account: editedAccount,
      effectivePolicy: { ...detail.effectivePolicy, role: "administrator" },
    });
    enterpriseApiMocks.listAdminAccounts.mockResolvedValue({
      accounts: [editedAccount],
      pageInfo: { total: 1, nextCursor: null },
      accessPresets: [basicPreset, codingPreset, noPreset],
    });

    await i18n.setLocale("vi");
    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.selected = detail;
    page.detailAccessPresetKey = detailAccount.accessPresetKey;
    page.accessPresets = [basicPreset, codingPreset, noPreset];
    render(page.render(), container);

    const displayName = container.querySelector<HTMLInputElement>("input[name='displayName']");
    const role = container.querySelector<HTMLSelectElement>("select[name='role']");
    const preset = container.querySelector<HTMLSelectElement>("select[name='accessPresetKey']");
    const form = container.querySelector<HTMLFormElement>("form");
    expect(displayName).not.toBeNull();
    expect(role).not.toBeNull();
    expect(preset).not.toBeNull();
    expect(form).not.toBeNull();
    if (!displayName || !role || !preset || !form) {
      return;
    }
    expect(displayName.closest("label")?.textContent).toContain("Tên hiển thị");

    displayName.value = "Bản nháp mới";
    displayName.dispatchEvent(new Event("input", { bubbles: true }));
    role.value = "administrator";
    role.dispatchEvent(new Event("change", { bubbles: true }));
    preset.value = "standard-coding@1";
    preset.dispatchEvent(new Event("change", { bubbles: true }));

    await i18n.setLocale("en");
    render(page.render(), container);

    expect(
      container.querySelector<HTMLInputElement>("input[name='displayName']")?.closest("label")
        ?.textContent,
    ).toContain("Display name");
    expect(container.querySelector<HTMLInputElement>("input[name='displayName']")?.value).toBe(
      "Bản nháp mới",
    );
    expect(container.querySelector<HTMLSelectElement>("select[name='role']")?.value).toBe(
      "administrator",
    );
    expect(
      container.querySelector<HTMLSelectElement>("select[name='accessPresetKey']")?.value,
    ).toBe("standard-coding@1");

    container
      .querySelector<HTMLFormElement>("form")
      ?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledOnce());
    expect(enterpriseApiMocks.updateAdminAccount).toHaveBeenCalledWith(
      detailAccount.id,
      expect.objectContaining({
        displayName: "Bản nháp mới",
        role: "administrator",
        enabled: true,
        personalAgentEnabled: true,
        defaultAgentId: null,
        accessPresetKey: "standard-coding@1",
        applyAccessPreset: true,
      }),
    );
  });

  it("rejects accented or otherwise unsupported username characters before submit", () => {
    const page = new EnterpriseAdminAccountsPage() as unknown as MutableAccountsPage;
    page.createOpen = true;

    render(page.render(), container);

    const username = container.querySelector<HTMLInputElement>("input[name='username']");
    expect(username).not.toBeNull();
    if (!username) {
      return;
    }
    expect(username.pattern).toBe("[a-z0-9][a-z0-9._\\-]{2,63}");

    username.value = "hiếu.nguyễn";
    username.dispatchEvent(new Event("input", { bubbles: true }));
    expect(username.checkValidity()).toBe(false);
    expect(username.validationMessage).toBe(
      "Username chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
    );

    username.value = "hieu.nguyen";
    username.dispatchEvent(new Event("input", { bubbles: true }));
    expect(username.checkValidity()).toBe(true);
    expect(username.validationMessage).toBe("");
  });
});
