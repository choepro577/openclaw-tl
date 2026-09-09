/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import type {
  EnterpriseKnowledgePublication,
  EnterpriseKnowledgeZone,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import type { EnterpriseAdminDialog } from "../components/admin-dialog.ts";
import { EnterpriseAdminKnowledgePage } from "./knowledge-page.ts";

type MutablePage = {
  selected?: EnterpriseKnowledgeZone;
  zones: EnterpriseKnowledgeZone[];
  publications: EnterpriseKnowledgePublication[];
  loading: boolean;
  tab: string;
  busy: boolean;
  notice: string;
  rollbackError: string;
  rollbackTarget?: { zone: EnterpriseKnowledgeZone; publication: EnterpriseKnowledgePublication };
  rollback(publication: EnterpriseKnowledgePublication): void;
  confirmRollback(): Promise<void>;
  closeZone(): void;
  openZone(zone: EnterpriseKnowledgeZone): Promise<void>;
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
  activePublicationId: "publication-2",
  createdAt: 1,
  updatedAt: 2,
};
const publication: EnterpriseKnowledgePublication = {
  id: "publication-1",
  zoneId: zone.id,
  generationId: "generation-1",
  publicationNumber: 1,
  sourceSetRevision: 3,
  lexicalStatus: "ready",
  vectorStatus: "ready",
  degradedOverride: false,
  degradedReason: null,
  publishedAt: 1,
  sourceCount: 3,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Enterprise Admin Knowledge rollback confirmation", () => {
  let page: MutablePage;
  let container: HTMLDivElement;
  let restoreDialogPolyfill: () => void;
  let pending: ReturnType<typeof Promise.withResolvers<Response>>;

  beforeEach(async () => {
    await i18n.setLocale("en");
    restoreDialogPolyfill = installDialogPolyfill();
    container = document.createElement("div");
    document.body.append(container);
    page = new EnterpriseAdminKnowledgePage() as unknown as MutablePage;
    page.selected = zone;
    page.zones = [zone];
    page.publications = [publication];
    page.loading = false;
    page.tab = "activity";
    pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const path = new URL(String(input), "http://localhost").pathname;
        if (path.endsWith("/rollback")) {
          return pending.promise;
        }
        const active = { ...zone, revision: 8, activePublicationId: publication.id };
        if (path === `/api/enterprise/admin/knowledge/${zone.id}`) {
          return json({ zone: active, role: "manager", candidate: null });
        }
        if (path === "/api/enterprise/admin/knowledge/zone-2") {
          return json({ zone: { ...zone, id: "zone-2" }, role: "manager", candidate: null });
        }
        if (path === "/api/enterprise/admin/knowledge") {
          return json({ items: [active], nextCursor: null });
        }
        if (path.endsWith("/graph/overview")) {
          return json({ clusters: [], totals: { zones: 1, nodes: 7, edges: 6 } });
        }
        if (/\/(sources|jobs|members|agents|publications|uploads|evidence-transfers)$/.test(path)) {
          return json({ items: [] });
        }
        throw new Error(`Unexpected Knowledge request: ${path}`);
      }),
    );
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    render(nothing, container);
    container.remove();
    restoreDialogPolyfill();
    vi.unstubAllGlobals();
  });

  function dialog(): EnterpriseAdminDialog | null {
    return container.querySelector<EnterpriseAdminDialog>("#knowledge-rollback-dialog");
  }

  function openPrompt(): EnterpriseAdminDialog {
    page.rollback(publication);
    render(page.render(), container);
    expect(dialog()).not.toBeNull();
    return dialog()!;
  }

  function rollbackRequests() {
    return vi.mocked(fetch).mock.calls.filter(([input]) => String(input).endsWith("/rollback"));
  }

  it("opens an in-app prompt with the exact target and never mutates before confirmation", async () => {
    render(page.render(), container);
    expect(dialog()).toBeNull();
    const prompt = openPrompt();
    await prompt.updateComplete;

    expect(prompt.open).toBe(true);
    expect(prompt.heading).toBe("Confirm rollback");
    expect(prompt.description).toContain("Company policy");
    expect(prompt.description).toContain("#1");
    expect(prompt.textContent).toContain("does not create a new publication");
    expect(prompt.querySelector("button[autofocus]")?.textContent?.trim()).toBe("Cancel");
    expect(prompt.shadowRoot?.querySelector("openclaw-modal-dialog")?.getAttribute("class")).toBe(
      "ea-dialog",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it.each(["cancel", "dismiss"] as const)(
    "%s closes the prompt without a rollback request",
    (action) => {
      const prompt = openPrompt();
      if (action === "cancel") {
        prompt.querySelector<HTMLButtonElement>("button[autofocus]")?.click();
      } else {
        prompt.onClose?.();
      }
      render(page.render(), container);

      expect(dialog()).toBeNull();
      expect(page.rollbackTarget).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("confirms only the captured zone/publication/revision once and closes after success", async () => {
    openPrompt();
    const confirming = page.confirmRollback();
    await page.confirmRollback();
    render(page.render(), container);

    expect(rollbackRequests()).toHaveLength(1);
    const [url, request] = rollbackRequests()[0]!;
    expect(url).toBe("/api/enterprise/admin/knowledge/zone-1/rollback");
    expect(JSON.parse(String(request?.body))).toEqual({
      baseRevision: 7,
      publicationId: "publication-1",
    });
    expect(dialog()?.canClose?.()).toBe(false);
    expect(
      dialog()?.querySelector<HTMLButtonElement>("button[data-rollback-confirm]")?.disabled,
    ).toBe(true);
    pending.resolve(json({ zone: { ...zone, revision: 8, activePublicationId: publication.id } }));
    await confirming;
    render(page.render(), container);

    expect(dialog()).toBeNull();
    expect(page.selected?.activePublicationId).toBe(publication.id);
    expect(page.notice).toContain("#1");
    expect(page.busy).toBe(false);
  });

  it.each(["closed", "changed"] as const)(
    "invalidates an unconfirmed target when the zone is %s",
    async (transition) => {
      openPrompt();
      if (transition === "closed") {
        page.closeZone();
      } else {
        await page.openZone({ ...zone, id: "zone-2" });
      }
      await page.confirmRollback();
      render(page.render(), container);

      expect(dialog()).toBeNull();
      expect(rollbackRequests()).toHaveLength(0);
    },
  );

  it("rejects a changed revision without silently adopting the newer CAS value", async () => {
    openPrompt();
    page.selected = { ...zone, revision: 8 };
    await page.confirmRollback();
    render(page.render(), container);

    expect(rollbackRequests()).toHaveLength(0);
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain("zone changed");
    expect(page.rollbackTarget?.zone.revision).toBe(7);
  });

  it("keeps the target and shows a server failure inside the prompt", async () => {
    openPrompt();
    pending.resolve(
      json({ code: "STALE_REVISION", message: "Reload this zone before retrying." }, 409),
    );
    await page.confirmRollback();
    render(page.render(), container);

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain(
      "Reload this zone before retrying.",
    );
    expect(page.rollbackTarget?.publication.id).toBe(publication.id);
    expect(page.selected?.activePublicationId).toBe("publication-2");
    expect(page.busy).toBe(false);
  });

  it("does not open confirmation for the active publication or a different zone", () => {
    page.rollback({ ...publication, id: "publication-2" });
    expect(page.rollbackTarget).toBeUndefined();
    page.rollback({ ...publication, zoneId: "zone-2" });
    expect(page.rollbackTarget).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
