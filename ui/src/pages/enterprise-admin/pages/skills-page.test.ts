/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClawHubTrustErrorCodes,
  ErrorCodes,
} from "../../../../../packages/gateway-protocol/src/index.js";
import { i18n } from "../../../i18n/index.ts";
import type { ClawHubSearchResult } from "../../../lib/skills/clawhub-search.ts";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import type { EnterpriseSharedAgent } from "../../enterprise/services/enterprise-api.ts";
import { EnterpriseAdminSkillsPage } from "./skills-page.ts";

type MutableSkillsPage = {
  agents: EnterpriseSharedAgent[];
  items: unknown[];
  loading: boolean;
  externalOpen: boolean;
  externalAgentId: string;
  externalResults: ClawHubSearchResult[] | null;
  externalMessage: { kind: string; text: string } | null;
  changeExternalQuery(value: string): void;
  selectExternalFolder(files: FileList | null): void;
  importExternalFolder(): Promise<void>;
  externalFolderSelection: unknown;
  render(): unknown;
};

const mainAgent: EnterpriseSharedAgent = {
  kind: "shared",
  agentId: "main",
  resourceKey: "agent:shared:main",
  name: "Main",
  model: null,
  workspace: "/workspace",
  runtimeType: "embedded",
  assignedUserCount: 0,
  skillCount: 0,
  toolCount: 0,
};

let container: HTMLDivElement;
let restoreDialogPolyfill: () => void;

function button(label: string): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === label,
  );
  if (!match) {
    throw new Error(`Missing button: ${label}`);
  }
  return match;
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function marketplacePage(): MutableSkillsPage {
  const page = new EnterpriseAdminSkillsPage() as unknown as MutableSkillsPage;
  page.agents = [mainAgent];
  page.items = [];
  page.loading = false;
  page.externalOpen = true;
  page.externalAgentId = "";
  return page;
}

describe("Enterprise admin external skill installer", () => {
  beforeEach(async () => {
    await i18n.setLocale("vi");
    restoreDialogPolyfill = installDialogPolyfill();
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    vi.useRealTimers();
    vi.unstubAllGlobals();
    render(nothing, container);
    container.remove();
    restoreDialogPolyfill();
  });

  it("searches ClawHub with a debounce and opens the existing detail flow", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes("/skills/search")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                score: 1,
                slug: "github",
                installRef: "@openclaw/github",
                displayName: "GitHub",
                summary: "Work with GitHub repositories",
                version: "1.2.3",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/skills/detail")) {
        return new Response(
          JSON.stringify({
            skill: {
              slug: "github",
              displayName: "GitHub",
              summary: "Work with GitHub repositories",
              createdAt: 1,
              updatedAt: 2,
            },
            latestVersion: { version: "1.2.3", createdAt: 2 },
            owner: { handle: "openclaw", displayName: "OpenClaw" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const page = marketplacePage();

    render(page.render(), container);
    expect(
      container.querySelector<HTMLSelectElement>(
        "openclaw-enterprise-admin-dialog select.ea-select",
      )?.value,
    ).toBe("");

    page.changeExternalQuery("github");
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    render(page.render(), container);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/enterprise/admin/skills/search?query=github"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(container.textContent).toContain("Work with GitHub repositories");

    const detailButton = container.querySelector<HTMLButtonElement>(".ea-marketplace-item__detail");
    expect(detailButton).not.toBeNull();
    detailButton?.click();
    await vi.runAllTimersAsync();
    render(page.render(), container);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/enterprise/admin/skills/detail?ref=%40openclaw%2Fgithub"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(button("Cài GitHub")).toBeInstanceOf(HTMLButtonElement);
  });

  it("requires an explicit risk acknowledgement and pins the reviewed version on retry", async () => {
    let installCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes("/skills/install")) {
        installCalls += 1;
        if (installCalls === 1) {
          return new Response(
            JSON.stringify({
              code: ErrorCodes.UNAVAILABLE,
              message: "ClawHub requires review",
              details: {
                clawhubTrustCode: ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED,
                version: "1.2.3",
                warning: "Suspicious behavior was detected.",
              },
            }),
            { status: 409, headers: { "content-type": "application/json" } },
          );
        }
        expect(JSON.parse(typeof init?.body === "string" ? init.body : "{}")).toMatchObject({
          agentId: "main",
          ref: "skills-sh:acme/tools/email",
          version: "1.2.3",
          acknowledgeClawHubRisk: true,
        });
        return new Response(JSON.stringify({ message: "Installed email@1.2.3" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/enterprise/admin/skills?")) {
        return new Response(JSON.stringify({ items: [], catalogRevision: "next" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const page = marketplacePage();
    page.externalAgentId = "main";
    page.externalResults = [
      {
        score: 1,
        slug: "email",
        installRef: "skills-sh:acme/tools/email",
        installOnly: true,
        trustState: "not-scanned-by-clawhub",
        displayName: "Email",
        version: "1.2.3",
      },
    ];

    render(page.render(), container);
    button("Cài đặt").click();
    await settle();
    render(page.render(), container);

    expect(container.textContent).toContain("Suspicious behavior was detected.");
    button("Tôi hiểu rủi ro và vẫn cài").click();
    await settle();
    await settle();
    render(page.render(), container);

    expect(installCalls).toBe(2);
    expect(page.externalMessage).toMatchObject({
      kind: "success",
      text: "Installed email@1.2.3",
    });
  });

  it.each(["", "main"])(
    "saves a complete folder in scope %s and retains it after failure",
    async (agentId) => {
      const page = marketplacePage();
      page.externalAgentId = agentId;
      const files = ["example/SKILL.md", "example/references/example.md"].map((relativePath) => {
        const file = new File(["example content"], relativePath.split("/").at(-1)!);
        Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
        Object.defineProperty(file, "arrayBuffer", {
          value: async () => new TextEncoder().encode("example content").buffer,
        });
        return file;
      });
      let imports = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
          if (
            (input instanceof Request ? input.url : input.toString()).endsWith("/skills/import")
          ) {
            imports += 1;
            expect(JSON.parse(typeof init?.body === "string" ? init.body : "{}")).toEqual({
              ...(agentId ? { agentId } : {}),
              folderName: "example",
              files: ["SKILL.md", "references/example.md"].map((path) => ({
                path,
                contentBase64: btoa("example content"),
              })),
            });
            return imports === 1
              ? Response.json(
                  { code: "SKILL_IMPORT_FAILED", message: "Disk unavailable" },
                  { status: 400 },
                )
              : Response.json({ slug: "example" });
          }
          return Response.json({ items: [], catalogRevision: "next" });
        }),
      );
      page.selectExternalFolder(files as unknown as FileList);
      await page.importExternalFolder();
      expect(page.externalFolderSelection).not.toBeNull();
      expect(page.externalMessage?.kind).toBe("error");
      await page.importExternalFolder();
      expect(page.externalFolderSelection).toBeNull();
      expect(page.externalMessage?.kind).toBe("success");
      page.selectExternalFolder(files as unknown as FileList);
      page.selectExternalFolder([new File(["bad"], "bad.md")] as unknown as FileList);
      expect(page.externalFolderSelection).toBeNull();
    },
  );
});
