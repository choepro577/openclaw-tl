/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type {
  EnterpriseKnowledgeAgentCatalog,
  EnterpriseKnowledgePublication,
  EnterpriseKnowledgeZone,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import { EnterpriseAdminKnowledgePage } from "./knowledge-page.ts";

type MutablePage = {
  zones: EnterpriseKnowledgeZone[];
  selected?: EnterpriseKnowledgeZone;
  loading: boolean;
  detailLoading: boolean;
  tab: "overview" | "settings" | "sources" | "graph" | "agents" | "members" | "search" | "activity";
  sources: unknown[];
  jobs: unknown[];
  members: unknown[];
  bindings: string[];
  bindingDraft: string[];
  evidenceTransfers: string[];
  evidenceTransferDraft: string[];
  agentCatalog: EnterpriseKnowledgeAgentCatalog;
  createOpen: boolean;
  createErrors: Record<string, string>;
  publications: EnterpriseKnowledgePublication[];
  candidate?: {
    id: string;
    sourceSetRevision: number;
    lexicalStatus: string;
    vectorStatus: string;
    integrityStatus: string;
    graphStatus: "not_built" | "ready" | "degraded" | "error";
    createdAt: number;
  };
  render(): unknown;
};

const zone: EnterpriseKnowledgeZone = {
  id: "zone-1",
  slug: "company-policy",
  name: "Chính sách công ty",
  description: "Published policy",
  status: "active",
  egressPolicy: "local_only",
  revision: 7,
  accessRevision: 3,
  sourceSetRevision: 4,
  buildRevision: 4,
  activePublicationId: "publication-2",
  createdAt: 1,
  updatedAt: 2,
};

describe("Enterprise Admin Knowledge page", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.setLocale("vi");
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    render(nothing, container);
    container.remove();
  });

  it("uses the existing wide drawer and all eight administrator tabs", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.loading = false;
    page.detailLoading = false;
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.bindings = ["agent:shared:main"];
    page.bindingDraft = [...page.bindings];
    page.agentCatalog = { shared: [], personal: [] };
    page.publications = [];
    page.tab = "overview";
    render(page.render(), container);

    expect(container.querySelector("h1")?.textContent).toBe("Tri thức doanh nghiệp");
    const drawer = Array.from(container.querySelectorAll("openclaw-enterprise-admin-dialog")).find(
      (element) => (element as HTMLElement & { wide: boolean }).wide,
    ) as HTMLElement & {
      wide: boolean;
      drawer: boolean;
    };
    expect(drawer.wide).toBe(true);
    expect(drawer.drawer).toBe(true);
    expect(
      Array.from(container.querySelectorAll(".ea-tab")).map((tab) => tab.textContent?.trim()),
    ).toEqual([
      "Tổng quan",
      "Cấu hình",
      "Nguồn & OCR",
      "Bản đồ tri thức",
      "Agent truy cập",
      "Thành viên",
      "Kiểm thử & publish",
      "Hoạt động",
    ]);
  });

  it("creates zones in a right drawer with inline validation owned by the form", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [];
    page.loading = false;
    page.createOpen = true;
    page.createErrors = { slug: "Slug phải có 3–64 ký tự." };
    page.agentCatalog = { shared: [], personal: [] };
    render(page.render(), container);

    const drawer = container.querySelector("#knowledge-zone-create-drawer") as HTMLElement & {
      drawer: boolean;
    };
    expect(drawer.drawer).toBe(true);
    expect(drawer.querySelector('input[name="name"]')).not.toBeNull();
    expect(drawer.querySelector('[data-field-error="slug"]')?.textContent).toContain("3–64");
    expect(drawer.textContent).toContain("Agent được phép truy cập");
  });

  it("provides editable zone policy and catalog-backed agent access without canonical-key input", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.loading = false;
    page.detailLoading = false;
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.bindings = ["agent:shared:main"];
    page.bindingDraft = [...page.bindings];
    page.agentCatalog = {
      shared: [
        {
          kind: "shared",
          agentId: "main",
          resourceKey: "agent:shared:main",
          name: "Main Agent",
          model: "openai/gpt-5.6",
          workspace: null,
          runtimeType: "openclaw",
          assignedUserCount: 1,
          skillCount: 2,
          toolCount: 3,
        },
      ],
      personal: [],
    };
    page.publications = [];
    page.tab = "settings";
    render(page.render(), container);

    expect((container.querySelector('input[name="name"]') as HTMLInputElement | null)?.value).toBe(
      zone.name,
    );
    expect(container.querySelector('input[name="slug"]')?.hasAttribute("readonly")).toBe(true);
    expect(container.textContent).toContain("OCR tự động");

    page.tab = "agents";
    render(page.render(), container);
    expect(container.querySelectorAll("[data-agent-binding]")).toHaveLength(1);
    expect(container.querySelector("textarea[name='bindings']")).toBeNull();
    expect(container.textContent).toContain("Main Agent");
  });

  it("keeps excerpt-receiving permission separate and unchecked from direct Zone bindings", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.loading = false;
    page.detailLoading = false;
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.publications = [];
    page.bindings = ["agent:shared:contracts"];
    page.bindingDraft = [...page.bindings];
    page.evidenceTransfers = [];
    page.evidenceTransferDraft = [];
    page.agentCatalog = {
      shared: [
        {
          kind: "shared",
          agentId: "contracts",
          resourceKey: "agent:shared:contracts",
          name: "Contract Specialist",
          model: null,
          workspace: null,
          runtimeType: "openclaw",
          assignedUserCount: 1,
          skillCount: 0,
          toolCount: 0,
          evidenceTransferEligible: true,
        },
      ],
      personal: [],
    } as EnterpriseKnowledgeAgentCatalog;
    page.tab = "agents";
    render(page.render(), container);

    const section = container.querySelector("[data-evidence-transfers]");
    expect(section).not.toBeNull();
    const excerptCheckbox = section?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(excerptCheckbox.checked).toBe(false);
    excerptCheckbox.click();
    expect(page.evidenceTransferDraft).toEqual(["agent:shared:contracts"]);
    expect(page.bindingDraft).toEqual(["agent:shared:contracts"]);
  });

  it("shows active publication history and a rollback action for an older generation", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.loading = false;
    page.detailLoading = false;
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.bindings = [];
    page.bindingDraft = [];
    page.agentCatalog = { shared: [], personal: [] };
    page.tab = "activity";
    page.publications = [
      {
        id: "publication-2",
        zoneId: zone.id,
        generationId: "generation-2",
        sourceSetRevision: 4,
        publicationNumber: 2,
        lexicalStatus: "ready",
        vectorStatus: "ready",
        degradedOverride: false,
        degradedReason: null,
        publishedAt: 2,
        sourceCount: 4,
      },
      {
        id: "publication-1",
        zoneId: zone.id,
        generationId: "generation-1",
        sourceSetRevision: 3,
        publicationNumber: 1,
        lexicalStatus: "ready",
        vectorStatus: "unavailable",
        degradedOverride: true,
        degradedReason: "Provider outage",
        publishedAt: 1,
        sourceCount: 3,
      },
    ];
    render(page.render(), container);
    expect(container.textContent).toContain("#2 · Đang hoạt động");
    expect(container.textContent).toContain("Ghi đè degraded");
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Hoàn tác" && !button.hasAttribute("disabled"),
      ),
    ).toBe(true);
  });

  it("uses consistent Vietnamese labels for graph state and completed job progress", () => {
    const page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [{ ...zone, activePublicationId: null }];
    page.selected = page.zones[0];
    page.loading = false;
    page.detailLoading = false;
    page.sources = [{}];
    page.jobs = [
      {
        id: "job-1",
        kind: "source_ingest",
        stage: "normalize",
        status: "succeeded",
        attempt: 1,
        progressCurrent: 3,
        progressTotal: 5,
        safeErrorCode: null,
        updatedAt: 2,
      },
    ];
    page.members = [];
    page.bindings = [];
    page.bindingDraft = [];
    page.agentCatalog = { shared: [], personal: [] };
    page.publications = [];
    page.candidate = {
      id: "generation-1",
      sourceSetRevision: 4,
      lexicalStatus: "ready",
      vectorStatus: "unavailable",
      integrityStatus: "valid",
      graphStatus: "not_built",
      createdAt: 2,
    };

    page.tab = "overview";
    render(page.render(), container);
    expect(container.textContent).toContain("Hợp lệ · Đồ thị Chưa tạo");
    expect(container.textContent).toContain("Bản nháp");

    page.tab = "activity";
    render(page.render(), container);
    expect(container.textContent).toContain("Tác vụ xử lý");
    expect(container.textContent).toContain("Nhập nguồn");
    expect(container.textContent).toContain("Chuẩn hóa");
    expect(container.textContent).toContain("Lần chạy 1");
    expect((container.querySelector("progress") as HTMLProgressElement | null)?.value).toBe(5);
  });
});
