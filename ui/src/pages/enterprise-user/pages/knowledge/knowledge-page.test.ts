/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eu } from "../../../../i18n/enterprise-user.ts";
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
  hits: Array<Record<string, unknown>>;
  error: string;
  open(zone: EnterpriseKnowledgeZone, preserveView?: boolean): Promise<void>;
  publish(): Promise<void>;
  search(event: SubmitEvent): Promise<void>;
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
    vi.unstubAllGlobals();
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

    expect(container.textContent).toContain(eu("knowledgeCandidatePublish"));
    expect(container.textContent).toContain(eu("knowledgePublicationHistory"));
    expect(container.textContent).toContain(eu("knowledgeViewerCurator"));
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
    expect(container.textContent).not.toContain(eu("knowledgeCandidatePublish"));
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it.each(["published", "replaced"] as const)(
    "refreshes the zone snapshot and discards old candidate hits when %s",
    async (transition) => {
      const page = new UserKnowledgePage() as unknown as MutablePage;
      const draft = { ...zone, activePublicationId: null };
      const candidate = { id: "candidate-1", vectorStatus: "ready", lexicalStatus: "ready" };
      const hit = { excerpt: "The previous candidate answer." };
      page.zones = [draft];
      page.selected = draft;
      page.zoneRole = "manager";
      page.candidate = candidate;
      page.hits = [hit];
      page.loading = false;
      const pending = Promise.withResolvers<Response>();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL | Request) => {
          const pathname = new URL(String(input), "http://localhost").pathname;
          if (pathname.endsWith("/preview-search")) {
            return pending.promise;
          }
          const body = pathname.endsWith("/publish")
            ? { publicationId: zone.activePublicationId, publicationNumber: 1 }
            : pathname === `/api/enterprise/user/v2/knowledge/${zone.id}`
              ? {
                  zone,
                  role: "manager",
                  candidate:
                    transition === "published" ? null : { ...candidate, id: "candidate-2" },
                }
              : { items: [] };
          return new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
          });
        }),
      );
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.name = "query";
      input.value = "policy";
      form.append(input);
      const searching = new Promise<void>((resolve, reject) => {
        form.addEventListener("submit", (event) => {
          void page.search(event).then(resolve, reject);
        });
        form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
      });

      if (transition === "published") {
        await page.publish();
      } else {
        await page.open(zone, true);
      }
      pending.resolve(
        new Response(JSON.stringify({ hits: [hit], candidate }), {
          headers: { "content-type": "application/json" },
        }),
      );
      await searching;

      expect(page.error).toBe("");
      expect(page.selected?.activePublicationId).toBe(zone.activePublicationId);
      expect(page.zones[0]?.activePublicationId).toBe(zone.activePublicationId);
      expect(page.hits).toEqual([]);
      expect(page.candidate?.id).toBe(transition === "published" ? undefined : "candidate-2");
    },
  );
});
