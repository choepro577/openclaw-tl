/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type {
  EnterpriseKnowledgeGraphOverview,
  EnterpriseKnowledgePublication,
  EnterpriseKnowledgeZone,
  loadEnterpriseKnowledgeZone,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import { EnterpriseAdminKnowledgePage } from "./knowledge-page.ts";

type ZoneDetail = Awaited<ReturnType<typeof loadEnterpriseKnowledgeZone>>;
type MutablePage = {
  zones: EnterpriseKnowledgeZone[];
  selected?: EnterpriseKnowledgeZone;
  candidate: ZoneDetail["candidate"] | undefined;
  graphOverview?: EnterpriseKnowledgeGraphOverview;
  searchHits: Array<Record<string, unknown>>;
  loading: boolean;
  error: string;
  notice: string;
  degradedReason: string;
  createOpen: boolean;
  evidenceTransfers: string[];
  evidenceTransferDraft: string[];
  bindingDraft: string[];
  canCloseZone(): boolean;
  setEvidenceTransfer(resourceKey: string, checked: boolean): void;
  saveEvidenceTransfers(event: SubmitEvent): Promise<void>;
  readonly updateComplete: Promise<boolean>;
  tab: "search";
  createZone(event: SubmitEvent): Promise<void>;
  publish(): Promise<void>;
  buildCandidate(): Promise<void>;
  rollback(publication: EnterpriseKnowledgePublication): void;
  confirmRollback(): Promise<void>;
  openZone(zone: EnterpriseKnowledgeZone, tab?: "search"): Promise<void>;
  closeZone(): void;
  search(event: SubmitEvent): Promise<void>;
  render(): unknown;
};

const zone: EnterpriseKnowledgeZone = {
  id: "zone-1",
  slug: "company-policy",
  name: "Company policy",
  description: "Published company policy",
  status: "active",
  egressPolicy: "local_only",
  revision: 7,
  accessRevision: 3,
  sourceSetRevision: 4,
  buildRevision: 4,
  activePublicationId: null,
  createdAt: 1,
  updatedAt: 2,
};
const candidate: NonNullable<ZoneDetail["candidate"]> = {
  id: "generation-1",
  sourceSetRevision: 4,
  buildRevision: 4,
  lexicalStatus: "ready",
  vectorStatus: "ready",
  integrityStatus: "valid",
  graphStatus: "ready",
  graphSchemaVersion: 3,
  graphNodeCount: 7,
  graphEdgeCount: 6,
  graphProposedCount: 0,
  graphOrphanCount: 0,
  snapshotRevision: 4,
  artifactSchemaVersion: 3,
  aiAnalysisStatus: "ready",
  degradationReasons: [],
  createdAt: 3,
};
const otherZone = { ...zone, id: "zone-2", slug: "finance", name: "Finance" };
const hit = {
  excerpt: "An employee has twelve days of annual leave.",
  citation: { sourceTitle: "Leave policy", locator: { kind: "text", section: "Annual leave" } },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function submitSearch(page: MutablePage): Promise<void> {
  const form = document.createElement("form");
  const input = document.createElement("input");
  input.name = "query";
  input.value = "annual leave";
  form.append(input);
  return new Promise((resolve, reject) => {
    form.addEventListener("submit", (event) => {
      void page.search(event).then(resolve, reject);
    });
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
  });
}

describe("Enterprise Admin Knowledge snapshot lifecycle", () => {
  let page: MutablePage;
  let detail: ZoneDetail;
  let previewResponse: Promise<Response>;
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.setLocale("vi");
    page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.zones = [zone];
    page.selected = zone;
    page.candidate = candidate;
    page.searchHits = [hit];
    page.loading = false;
    page.tab = "search";
    detail = {
      zone,
      candidate,
      role: "manager",
      counts: { sources: 0, jobs: 0, bindings: 0 },
      graphSettings: {
        enabled: true,
        enrichmentEnabled: true,
        autoApprovalThreshold: 0.92,
        updatedAt: 1,
      },
    };
    previewResponse = Promise.resolve(json({ hits: [hit], candidate }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname.endsWith("/publish")) {
          detail = {
            ...detail,
            zone: { ...zone, revision: 8, activePublicationId: "publication-1" },
            candidate: null,
          };
          return json({ publicationId: "publication-1", publicationNumber: 1 });
        }
        if (url.pathname.endsWith("/graph/overview")) {
          return json({ clusters: [], totals: { zones: 1, nodes: 7, edges: 6 } });
        }
        if (url.pathname.endsWith("/preview-search")) {
          return previewResponse;
        }
        if (url.pathname === `/api/enterprise/admin/knowledge/${detail.zone.id}`) {
          return json(detail);
        }
        if (url.pathname === `/api/enterprise/admin/knowledge/${otherZone.id}`) {
          return json({ ...detail, zone: otherZone, candidate: null });
        }
        if (url.pathname === "/api/enterprise/admin/knowledge") {
          return json({ items: [detail.zone, otherZone], nextCursor: null });
        }
        if (
          /\/(sources|jobs|members|agents|publications|uploads|evidence-transfers)$/.test(
            url.pathname,
          )
        ) {
          return json({ items: [] });
        }
        throw new Error(`Unexpected Knowledge request: ${url.pathname}`);
      }),
    );
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    render(nothing, container);
    container.remove();
  });

  it("loads excerpt grants, protects unsaved permission changes and clears them when the Zone closes", async () => {
    const originalFetch = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) =>
      String(input).endsWith("/evidence-transfers")
        ? json({ items: ["agent:shared:contracts"], revision: zone.revision })
        : originalFetch(input, init),
    );
    await page.openZone(zone);
    expect(page.evidenceTransfers).toEqual(["agent:shared:contracts"]);
    expect(page.evidenceTransferDraft).toEqual(page.evidenceTransfers);
    expect(page.bindingDraft).toEqual([]);
    page.setEvidenceTransfer("agent:shared:contracts", false);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    expect(page.canCloseZone()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    page.closeZone();
    expect(page.evidenceTransferDraft).toEqual([]);
    expect(page.evidenceTransfers).toEqual([]);
  });

  it.each(["closed", "reopened"] as const)(
    "does not restore stale excerpt grants after a save while the Zone is %s",
    async (transition) => {
      await page.openZone(zone);
      page.setEvidenceTransfer("agent:shared:contracts", true);
      const pending = Promise.withResolvers<Response>();
      const originalFetch = vi.mocked(fetch).getMockImplementation()!;
      vi.mocked(fetch).mockImplementation((input, init) =>
        String(input).endsWith("/evidence-transfers") && init?.method === "PUT"
          ? pending.promise
          : originalFetch(input, init),
      );
      const saving = page.saveEvidenceTransfers(new SubmitEvent("submit", { cancelable: true }));
      page.closeZone();
      if (transition === "reopened") {
        await page.openZone(zone);
        page.setEvidenceTransfer("agent:shared:finance", true);
      }
      pending.resolve(
        json({ zone: { ...zone, revision: zone.revision + 1 }, items: ["agent:shared:contracts"] }),
      );
      await saving;
      expect(page.notice).toBe("");
      expect(page.selected?.id).toBe(transition === "closed" ? undefined : zone.id);
      expect(page.evidenceTransferDraft).toEqual(
        transition === "closed" ? [] : ["agent:shared:finance"],
      );
    },
  );

  it("publishes once and refreshes the drawer, zone row and overview without a page reload", async () => {
    await page.publish();

    expect(page.error).toBe("");
    expect(page.selected?.activePublicationId).toBe("publication-1");
    expect(page.zones[0]?.activePublicationId).toBe("publication-1");
    expect(page.graphOverview?.totals).toEqual({ zones: 1, nodes: 7, edges: 6 });
    expect(page.candidate).toBeUndefined();
    expect(page.searchHits).toEqual([]);
    render(page.render(), container);
    expect(container.querySelector(".knowledge-zone-table tbody")?.textContent).toContain(
      "Đã xuất bản",
    );
    expect(container.querySelectorAll(".knowledge-main-kpis strong")[1]?.textContent).toBe("1");
    expect(container.querySelector(".knowledge-hit-list")?.textContent).not.toContain(hit.excerpt);
    expect(page.notice).toContain("thành công");
  });

  it("keeps preview hits for an unchanged generation and clears them when that generation changes", async () => {
    await page.openZone(zone, "search");
    expect(page.error).toBe("");
    expect(page.searchHits).toEqual([hit]);
    detail = { ...detail, candidate: { ...candidate, id: "generation-2" } };

    await page.openZone(zone, "search");

    expect(page.searchHits).toEqual([]);
    expect(page.candidate?.id).toBe("generation-2");
  });

  it.each(["published", "replaced", "closed"] as const)(
    "does not restore a late preview response after the candidate is %s",
    async (transition) => {
      const pending = Promise.withResolvers<Response>();
      previewResponse = pending.promise;
      const searching = submitSearch(page);
      if (transition === "closed") {
        page.closeZone();
      } else {
        detail = {
          ...detail,
          candidate: transition === "published" ? null : { ...candidate, id: "generation-2" },
        };
        await page.openZone(zone, "search");
      }
      pending.resolve(json({ hits: [hit], candidate }));
      await searching;

      expect(page.searchHits).toEqual([]);
    },
  );

  it("clears the previous query result if the next query fails", async () => {
    previewResponse = Promise.resolve(
      json({ code: "CANDIDATE_NOT_FOUND", message: "Candidate is no longer available." }, 409),
    );

    await submitSearch(page);

    expect(page.searchHits).toEqual([]);
    expect(page.error).toBe("Candidate is no longer available.");
  });

  it("shows an empty preview only after a successful zero-hit search, not initially, while pending or on failure", async () => {
    page.searchHits = [];
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).toBeNull();
    const pending = Promise.withResolvers<Response>();
    previewResponse = pending.promise;
    const searching = submitSearch(page);
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).toBeNull();

    pending.resolve(json({ hits: [], candidate }));
    await searching;
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")?.textContent).toContain(
      "Không có nội dung khớp trong bản ứng viên này",
    );

    previewResponse = Promise.resolve(json({ message: "Search failed." }, 500));
    await submitSearch(page);
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).toBeNull();
    expect(page.error).toBe("Search failed.");
  });

  it("preserves an empty preview for the same candidate and resets it for another candidate or zone", async () => {
    previewResponse = Promise.resolve(json({ hits: [], candidate }));
    await submitSearch(page);
    await page.openZone(zone, "search");
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).not.toBeNull();

    detail = { ...detail, candidate: { ...candidate, id: "generation-2" } };
    await page.openZone(zone, "search");
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).toBeNull();

    previewResponse = Promise.resolve(json({ hits: [], candidate: detail.candidate }));
    await submitSearch(page);
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).not.toBeNull();
    await page.openZone(otherZone, "search");
    render(page.render(), container);
    expect(container.querySelector(".knowledge-hit-list [role='status']")).toBeNull();
  });

  it("preserves default graph enablement when submitting before readiness has loaded", async () => {
    page.closeZone();
    page.createOpen = true;
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: "Test request stopped" }, 422));
    const create = vi.spyOn(page, "createZone");
    render(page.render(), container);
    const form = container.querySelector<HTMLFormElement>("#knowledge-zone-create-drawer form")!;
    form.querySelector<HTMLInputElement>("input[name='name']")!.value = "Company policy";
    form.querySelector<HTMLInputElement>("input[name='slug']")!.value = "company-policy";
    const graph = form.querySelector<HTMLInputElement>("input[name='graphEnabled']")!;
    expect(graph.disabled).toBe(true);
    expect(graph.checked).toBe(true);
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
    await create.mock.results[0]?.value;
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toMatchObject({
      graph: { enabled: true },
    });
  });

  it("waits for inline validation to render then focuses the first invalid field in the submitted create form", async () => {
    page.closeZone();
    page.createOpen = true;
    const rendered = Promise.withResolvers<boolean>();
    vi.spyOn(page, "updateComplete", "get").mockReturnValue(rendered.promise);
    const create = vi.spyOn(page, "createZone");
    render(page.render(), container);
    const form = container.querySelector<HTMLFormElement>("#knowledge-zone-create-drawer form")!;
    const submit = form.querySelector<HTMLButtonElement>("button:not([type])")!;
    submit.focus();
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
    render(page.render(), container);
    expect(form.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2);
    expect(document.activeElement).toBe(submit);

    rendered.resolve(true);
    await create.mock.results[0]?.value;

    expect(document.activeElement).toBe(form.querySelector("input[name='name']"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refreshes the displayed generation before accepting results for a newer server candidate", async () => {
    detail = { ...detail, candidate: { ...candidate, id: "generation-2" } };
    previewResponse = Promise.resolve(json({ hits: [hit], candidate: detail.candidate }));

    await submitSearch(page);

    expect(page.error).toBe("");
    expect(page.candidate?.id).toBe("generation-2");
    expect(page.searchHits).toEqual([hit]);
  });

  it.each(["refreshed", "closed"] as const)(
    "does not restore an old detail response after the drawer has been %s",
    async (transition) => {
      const original = detail;
      const pending = Promise.withResolvers<Response>();
      vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
      const opening = page.openZone(zone, "search");
      if (transition === "closed") {
        page.closeZone();
      } else {
        detail = { ...detail, candidate: { ...candidate, id: "generation-2" } };
        await page.openZone(zone, "search");
      }
      pending.resolve(json(original));
      await opening;

      expect(page.candidate?.id).toBe(transition === "closed" ? undefined : "generation-2");
      expect(page.selected?.id).toBe(transition === "closed" ? undefined : zone.id);
    },
  );

  it.each(["closed", "changed"] as const)(
    "refreshes the published zone without reopening it after the drawer is %s during publish",
    async (transition) => {
      const pending = Promise.withResolvers<Response>();
      vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
      const publishing = page.publish();
      if (transition === "closed") {
        page.closeZone();
      } else {
        await page.openZone(otherZone, "search");
        page.degradedReason = "Finance FTS-only approval draft";
      }
      detail = {
        ...detail,
        zone: { ...zone, revision: 8, activePublicationId: "publication-1" },
        candidate: null,
      };
      pending.resolve(json({ publicationId: "publication-1", publicationNumber: 1 }));
      await publishing;

      expect(page.error).toBe("");
      expect(page.selected?.id).toBe(transition === "closed" ? undefined : otherZone.id);
      expect(page.zones.find((item) => item.id === zone.id)?.activePublicationId).toBe(
        "publication-1",
      );
      expect(page.graphOverview?.totals.nodes).toBe(7);
      expect(page.notice).toBe("");
      expect(page.degradedReason).toBe(
        transition === "changed" ? "Finance FTS-only approval draft" : "",
      );
    },
  );

  it.each(["build", "rollback"] as const)(
    "does not reopen a closed drawer when %s completes",
    async (operation) => {
      const publication: EnterpriseKnowledgePublication = {
        id: "publication-1",
        zoneId: zone.id,
        generationId: candidate.id,
        publicationNumber: 1,
        sourceSetRevision: 4,
        lexicalStatus: "ready",
        vectorStatus: "ready",
        degradedOverride: false,
        degradedReason: null,
        publishedAt: 1,
        sourceCount: 1,
      };
      const pending = Promise.withResolvers<Response>();
      vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
      if (operation === "rollback") {
        page.rollback(publication);
      }
      const mutation = operation === "build" ? page.buildCandidate() : page.confirmRollback();
      page.closeZone();
      pending.resolve(json(operation === "build" ? { jobId: "job-1" } : { zone }));
      await mutation;

      expect(page.error).toBe("");
      expect(page.selected).toBeUndefined();
      expect(page.notice).toBe("");
      expect(page.graphOverview?.totals.nodes).toBe(7);
    },
  );
});
