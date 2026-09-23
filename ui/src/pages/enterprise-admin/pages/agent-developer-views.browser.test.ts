import { nothing, render } from "lit";
import { afterEach, expect, it, vi } from "vitest";
import type { EnterpriseDeveloperPanel } from "../../enterprise/services/enterprise-api.ts";
import "../../../styles/base.css";
import "../admin.css";
import { renderAgentDeveloperPanel } from "./agent-developer-views.ts";

const container = document.createElement("div");
document.body.append(container);

afterEach(() => render(nothing, container));

it("guides connection setup before examples and pads expanded code", async () => {
  const onCopy = vi.fn();
  const panel: EnterpriseDeveloperPanel = {
    agentId: "support",
    basePath: "/api/enterprise/developer/v1",
    integrations: [
      {
        id: "integration-1",
        agentId: "support",
        name: "CSKH Production",
        status: "active",
        keyPrefix: "abc123",
        previousKeyExpiresAt: null,
        webhookUrl: null,
        uploadPolicy: "disabled",
        maxUploadBytes: 10 * 1024 * 1024,
        rateLimitPerMinute: 60,
        burstLimit: 20,
        maxSseConcurrency: 10,
        maxBackgroundConcurrency: 5,
        requestCount: 2,
        errorCount: 0,
        runningCount: 0,
        lastUsedAt: null,
        lastWebhookAt: null,
        lastWebhookStatus: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    responses: [],
    pageInfo: { hasMore: false, nextBefore: null, nextBeforeId: null },
    retentionDays: 90,
  };

  render(
    renderAgentDeveloperPanel({
      panel,
      origin: "https://example.com",
      busy: false,
      error: "",
      notice: "",
      onCopy,
      onDismissReveal: () => undefined,
      onCreate: () => undefined,
      onSave: () => undefined,
      onRotate: () => undefined,
      onRevokePreviousKey: () => undefined,
      onTest: () => undefined,
      onStatus: () => undefined,
      onOpenResponse: () => undefined,
      onFilter: () => undefined,
      onLoadMore: () => undefined,
    }),
    container,
  );

  expect(
    Array.from(container.querySelectorAll(".ea-developer-heading h3"), (heading) =>
      heading.textContent?.trim(),
    ),
  ).toEqual([
    "Tạo kết nối cho môi trường của bạn",
    "Gọi Agent từ backend của bạn",
    "Theo dõi các lượt gọi",
  ]);
  const card = container.querySelector(".ea-developer-integration");
  expect(card?.textContent).toContain("Đang hoạt động");
  expect(
    (card?.querySelector("form") as HTMLFormElement | null)?.querySelectorAll("[name]").length,
  ).toBe(4);

  const exampleGrid = container.querySelector(".ea-developer-example-grid") as HTMLElement;
  expect(
    Array.from(exampleGrid.querySelectorAll("h4"), (heading) => heading.textContent?.trim()),
  ).toEqual(["Trả lời trực tiếp (SSE)", "Xử lý nền"]);
  expect(
    Array.from(exampleGrid.querySelectorAll("summary"), (summary) => summary.textContent?.trim()),
  ).toEqual(["cURL", "cURL"]);
  const required = container.querySelector(".ea-developer-required") as HTMLElement;
  expect(required.textContent).toContain("metadata.external_conversation_id");
  expect(required.textContent).toContain("Authorization: Bearer");
  expect(exampleGrid.textContent).toContain("Idempotency-Key");

  const examples = Array.from(
    exampleGrid.querySelectorAll(".ea-developer-example"),
  ) as HTMLDetailsElement[];
  for (const item of examples) {
    item.open = true;
  }
  const example = examples[0]!;
  const summary = example.querySelector("summary") as HTMLElement;
  const body = example.querySelector(".ea-developer-example__body") as HTMLElement;
  expect(Number.parseFloat(getComputedStyle(summary).paddingLeft)).toBeGreaterThanOrEqual(12);
  expect(Number.parseFloat(getComputedStyle(body).paddingLeft)).toBeGreaterThanOrEqual(12);
  (body.querySelector("button") as HTMLButtonElement).click();
  expect(onCopy).toHaveBeenCalledWith(expect.stringContaining("curl -N"));

  const { page } = await import("vitest/browser");
  await page.viewport(1100, 844);
  expect(getComputedStyle(exampleGrid).gridTemplateColumns.split(" ")).toHaveLength(2);
  for (const code of exampleGrid.querySelectorAll("pre")) {
    expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth + 1);
  }
  await page.viewport(390, 844);
  expect(getComputedStyle(exampleGrid).gridTemplateColumns.split(" ")).toHaveLength(1);
  for (const code of exampleGrid.querySelectorAll("pre")) {
    expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth + 1);
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  expect(Number.parseFloat(getComputedStyle(summary).paddingLeft)).toBeGreaterThanOrEqual(12);
});
