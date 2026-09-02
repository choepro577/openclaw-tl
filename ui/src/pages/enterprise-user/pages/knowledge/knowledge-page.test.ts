/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../../../i18n/index.ts";
import type { EnterpriseKnowledgeZone } from "../../../enterprise/services/enterprise-knowledge-api.ts";
import { UserKnowledgePage } from "./knowledge-page.ts";

type MutablePage = {
  zones: EnterpriseKnowledgeZone[];
  selected?: EnterpriseKnowledgeZone;
  zoneRole: "viewer" | "curator" | "manager";
  sources: unknown[];
  jobs: unknown[];
  members: unknown[];
  publications: unknown[];
  candidate?: { id: string; vectorStatus: string; lexicalStatus: string };
  loading: boolean;
  busy: boolean;
  render(): unknown;
};

const zone: EnterpriseKnowledgeZone = {
  id: "zone-user",
  slug: "employee-handbook",
  name: "Sổ tay nhân viên",
  description: "Employee handbook",
  status: "active",
  egressPolicy: "local_only",
  revision: 4,
  accessRevision: 2,
  sourceSetRevision: 3,
  buildRevision: 3,
  activePublicationId: "publication-1",
  createdAt: 1,
  updatedAt: 2,
  role: "manager",
};

describe("Enterprise User Knowledge page", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.setLocale("vi");
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    render(nothing, container);
    container.remove();
    await i18n.setLocale("en");
  });

  it("shows Manager publication and member workflows without an Agent binding control", () => {
    const page = new UserKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.zoneRole = "manager";
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.publications = [];
    page.candidate = { id: "candidate-1", vectorStatus: "ready", lexicalStatus: "ready" };
    page.loading = false;
    page.busy = false;
    render(page.render(), container);

    expect(container.textContent).toContain("Publish candidate");
    expect(container.textContent).toContain("Lịch sử publication");
    expect(container.textContent).toContain("Viewer / Curator");
    expect(container.textContent).not.toContain("Agent bindings");
  });

  it("keeps Viewer read-only", () => {
    const page = new UserKnowledgePage() as unknown as MutablePage;
    page.zones = [{ ...zone, role: "viewer" }];
    page.selected = { ...zone, role: "viewer" };
    page.zoneRole = "viewer";
    page.sources = [];
    page.jobs = [];
    page.members = [];
    page.publications = [];
    page.loading = false;
    page.busy = false;
    render(page.render(), container);

    expect(container.textContent).toContain("Nguồn dữ liệu");
    expect(container.textContent).not.toContain("Nạp ghi chú");
    expect(container.textContent).not.toContain("Publish candidate");
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
