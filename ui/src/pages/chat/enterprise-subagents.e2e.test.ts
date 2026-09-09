import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { openChatSidePanelType } from "../../e2e/chat-side-panel.test-support.ts";
import { createControlUiE2eSuite } from "../../e2e/control-ui-e2e-suite.test-support.ts";
import { installMockGateway } from "../../test-helpers/control-ui-e2e.ts";

const suite = createControlUiE2eSuite({
  name: "Control UI Enterprise Subagents mocked Gateway E2E",
  startServerBeforeBrowser: true,
  unavailableMessage: (executablePath) =>
    `Playwright Chromium is not installed at ${executablePath}. Run \`pnpm --dir ui exec playwright install chromium\`, or set OPENCLAW_UI_E2E_ALLOW_MISSING_CHROMIUM=1 only when intentionally skipping this lane.`,
});

const artifactDir = path.resolve(process.cwd(), ".artifacts/control-ui-e2e/enterprise-subagents");
const baseTime = Date.parse("2026-09-08T04:00:00.000Z");
const requesterSessionKey = "agent:main:main";
const childSessionKeys = {
  alpha: "agent:main:subagent:alpha",
  beta: "agent:main:subagent:beta",
  gamma: "agent:main:subagent:gamma",
  foreign: "agent:other:subagent:foreign",
} as const;

function enterpriseTask(
  id: string,
  title: string,
  childSessionKey: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    taskId: id,
    kind: "subagent",
    runtime: "subagent",
    status: "running",
    title,
    agentId: "main",
    sessionKey: requesterSessionKey,
    ownerKey: requesterSessionKey,
    childSessionKey,
    createdAt: baseTime - 30_000,
    startedAt: baseTime - 20_000,
    updatedAt: baseTime - 10_000,
    lastActivity: `Working on ${title}`,
    progressSummary: `Working on ${title}`,
    toolUseCount: 4,
    lastToolName: "read",
    ...overrides,
  };
}

const alphaRunning = enterpriseTask(
  "subagent-alpha",
  "Audit service routes",
  childSessionKeys.alpha,
  { lastToolName: "sandbox_exec", toolUseCount: 1 },
);
const betaRunning = enterpriseTask("subagent-beta", "Audit frontend loads", childSessionKeys.beta, {
  updatedAt: baseTime - 9_000,
});
const gammaRunning = enterpriseTask(
  "subagent-gamma",
  "Audit provider failures",
  childSessionKeys.gamma,
  { updatedAt: baseTime - 8_000 },
);
const foreignRunning = enterpriseTask(
  "subagent-foreign",
  "Foreign session task",
  childSessionKeys.foreign,
  { sessionKey: "agent:other:main", ownerKey: "agent:other:main" },
);
const longAlphaResult = Array.from(
  { length: 75 },
  (_, index) => `${index + 1}. Employee ${String(index + 1).padStart(3, "0")} — HRM result`,
).join("\n");
const alphaToolStarted = {
  ...alphaRunning,
  lastToolName: "get_staff_list",
  toolUseCount: 2,
  updatedAt: baseTime + 200,
};

const betaPending = {
  ...betaRunning,
  status: "completed",
  updatedAt: baseTime + 1_000,
  endedAt: baseTime + 1_000,
  terminalOutcome: "succeeded",
  deliveryStatus: "session_queued",
  terminalSummary: "Frontend load audit complete; report is queued.",
  result: "Frontend load audit report.",
};
const gammaFailed = {
  ...gammaRunning,
  status: "failed",
  updatedAt: baseTime + 2_000,
  endedAt: baseTime + 2_000,
  deliveryStatus: "failed",
  error: "Provider audit worker exited.",
  terminalSummary: "Provider audit failed.",
};
const alphaDelivered = {
  ...alphaToolStarted,
  status: "completed",
  updatedAt: baseTime + 3_000,
  endedAt: baseTime + 3_000,
  terminalOutcome: "succeeded",
  deliveryStatus: "delivered",
  terminalSummary: "Service route audit reported.",
  result: longAlphaResult,
};

const alphaCompletedToolMessages = [
  {
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "exec-1",
        name: "sandbox_exec",
        input: { command: "rg service routes" },
      },
    ],
  },
  {
    role: "tool",
    name: "sandbox_exec",
    tool_call_id: "exec-1",
    content: [
      {
        type: "tool_result",
        id: "exec-1",
        name: "sandbox_exec",
        text: "3 routes",
      },
    ],
  },
];

function alphaTaskDetailResponse(task: Record<string, unknown>) {
  return {
    cases: [
      {
        match: { taskId: alphaRunning.taskId },
        response: { task, toolMessages: alphaCompletedToolMessages },
      },
    ],
  };
}
const betaDelivered = {
  ...betaPending,
  updatedAt: baseTime + 4_000,
  endedAt: baseTime + 4_000,
  deliveryStatus: "delivered",
  terminalSummary: "Frontend load audit reported.",
};
const gammaDelivered = {
  ...gammaFailed,
  status: "completed",
  updatedAt: baseTime + 5_000,
  endedAt: baseTime + 5_000,
  terminalOutcome: "succeeded",
  deliveryStatus: "delivered",
  terminalSummary: "Provider audit reported.",
  result: "Provider audit report.",
};

const enterpriseAccount = {
  account: {
    username: "enterprise-e2e",
    displayName: "Enterprise E2E",
    role: "employee",
    mustChangePassword: false,
    enabled: true,
    personalAgentEnabled: true,
  },
  csrfToken: "enterprise-e2e-csrf",
};

const enterpriseBootstrap = {
  schemaVersion: 2,
  user: {
    username: "enterprise-e2e",
    displayName: "Enterprise E2E",
    avatarUrl: null,
  },
  features: {
    personalAgent: { enabled: true, editable: false },
    automations: false,
    notifications: true,
    knowledge: { enabled: false, memberships: 0 },
    plugins: { enabled: false },
  },
  agents: [],
  defaultAgentKey: null,
  policyRevision: 1,
  catalogRevision: "enterprise-e2e",
};

async function installEnterpriseUserApi(page: Parameters<typeof installMockGateway>[0]) {
  await page.route("**/api/enterprise/status", (route) =>
    route.fulfill({
      body: JSON.stringify({
        enabled: true,
        bootstrapped: true,
        userPortalVersion: "v2",
      }),
      contentType: "application/json",
      status: 200,
    }),
  );
  await page.route("**/api/auth/user/me", (route) =>
    route.fulfill({
      body: JSON.stringify(enterpriseAccount),
      contentType: "application/json",
      status: 200,
    }),
  );
  await page.route("**/api/enterprise/user/v2/bootstrap", (route) =>
    route.fulfill({
      body: JSON.stringify(enterpriseBootstrap),
      contentType: "application/json",
      status: 200,
    }),
  );
}

function taskListResponse(tasks: unknown[]) {
  return {
    cases: [
      {
        match: { sessionKey: "main", status: ["queued", "running"], limit: 200 },
        response: { tasks },
      },
      {
        match: { sessionKey: "main", limit: 100 },
        response: { tasks },
      },
    ],
  };
}

suite.define(() => {
  it("renders concurrent Enterprise subagents, partial delivery, bounded detail, and reconnect state", async () => {
    await rm(artifactDir, { force: true, recursive: true });
    const videoDir = path.join(artifactDir, "raw-video");
    await mkdir(videoDir, { recursive: true });
    await suite.withPage(
      {
        locale: "en-US",
        recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
        serviceWorkers: "block",
        viewport: { width: 1440, height: 900 },
      },
      async ({ page }) => {
        await page.clock.setFixedTime(baseTime);
        await installEnterpriseUserApi(page);
        const gateway = await installMockGateway(page, {
          historyMessages: [
            {
              content: [{ type: "text", text: "Enterprise coordinator is working." }],
              role: "assistant",
              timestamp: baseTime,
            },
          ],
          methodResponses: {
            "tasks.list": taskListResponse([
              alphaRunning,
              betaRunning,
              gammaRunning,
              foreignRunning,
            ]),
            "tasks.get": alphaTaskDetailResponse({
              ...alphaRunning,
              updatedAt: baseTime + 100,
              lastActivity: "Bounded service detail activity.",
            }),
          },
        });

        const response = await page.goto(`${suite.server.baseUrl}app/chat`);
        expect(response?.status()).toBe(200);
        await page.getByText("Enterprise coordinator is working.").waitFor({ timeout: 10_000 });

        const subagentsToggle = page.locator(".chat-tasks-toggle");
        expect(await subagentsToggle.getAttribute("aria-label")).toBe("Show subagents");
        await expect
          .poll(() => subagentsToggle.locator(".chat-tasks-toggle__badge").textContent())
          .toBe("3");

        await openChatSidePanelType(page, "Subagents");
        const rail = page.locator(".chat-tasks-rail");
        await rail.locator('[data-task-id="subagent-alpha"]').waitFor({ state: "visible" });
        await rail.locator('[data-task-id="subagent-beta"]').waitFor({ state: "visible" });
        await rail.locator('[data-task-id="subagent-gamma"]').waitFor({ state: "visible" });
        expect(await rail.locator('[data-task-id="subagent-foreign"]').count()).toBe(0);
        expect(await rail.locator('[data-tasks-section="running"] [data-task-id]').count()).toBe(3);
        expect(await rail.locator('[data-tasks-section="finished"]').count()).toBe(0);
        expect(await page.getByRole("button", { name: "Stop Audit service routes" }).count()).toBe(
          0,
        );
        await page.screenshot({
          path: path.join(artifactDir, "01-three-running.png"),
          fullPage: true,
        });

        await rail.locator('[data-task-id="subagent-alpha"]').click();
        const detail = page.locator("[data-task-detail-panel]");
        await detail.waitFor({ state: "visible" });
        await detail.getByText("Loading task details…").waitFor({ state: "detached" });
        await detail.locator(".chat-tool-row").first().waitFor({ state: "visible" });
        expect(await detail.locator(".chat-tool-row").count()).toBe(1);
        await detail.locator(".chat-tool-row").first().click();
        await detail.getByText("3 routes").waitFor({ state: "visible" });
        await gateway.setMethodResponse("tasks.get", alphaTaskDetailResponse(alphaToolStarted));
        await gateway.emitGatewayEvent("task", { action: "upserted", task: alphaToolStarted });
        await expect.poll(() => detail.locator(".chat-tool-row").count()).toBe(2);
        const runningTool = detail.locator(".chat-tool-row--running");
        await runningTool.waitFor({ state: "visible" });
        expect(await runningTool.textContent()).toContain("Get Staff List");
        expect(await detail.textContent()).toContain("Audit service routes");
        expect(await detail.textContent()).not.toContain("Child transcript");
        expect(
          (await gateway.getRequests("chat.history")).some(
            (request) =>
              typeof request.params === "object" &&
              request.params !== null &&
              "sessionKey" in request.params &&
              request.params.sessionKey === childSessionKeys.alpha,
          ),
        ).toBe(false);
        expect(await gateway.getRequests("tasks.get")).toContainEqual({
          id: expect.any(String),
          method: "tasks.get",
          params: { taskId: alphaRunning.taskId },
        });
        await page.screenshot({
          path: path.join(artifactDir, "02-bounded-detail.png"),
          fullPage: true,
        });
        await detail.getByRole("button", { name: "Back to subagents" }).click();
        await detail.waitFor({ state: "detached" });

        await gateway.emitGatewayEvent("task", { action: "upserted", task: betaPending });
        await gateway.emitGatewayEvent("task", { action: "upserted", task: gammaFailed });
        const betaRow = rail.locator('[data-task-id="subagent-beta"]');
        const gammaRow = rail.locator('[data-task-id="subagent-gamma"]');
        await rail
          .locator('[data-tasks-section="running"] [data-task-id="subagent-alpha"]')
          .waitFor({ state: "visible" });
        await rail.locator('[data-tasks-section="finished"]').waitFor({ state: "visible" });
        expect(await rail.locator('[data-tasks-section="running"] [data-task-id]').count()).toBe(1);
        expect(await rail.getByRole("button", { name: "Finished (2)" }).count()).toBe(1);
        await betaRow.waitFor({ state: "visible" });
        await gammaRow.waitFor({ state: "visible" });
        expect(await betaRow.textContent()).toContain(
          "Waiting for the result to reach Personal Agent",
        );
        expect(await gammaRow.textContent()).toContain("Specialist task failed");
        expect(
          await rail
            .locator('[data-tasks-section="running"] [data-task-id="subagent-alpha"]')
            .count(),
        ).toBe(1);
        await page.screenshot({
          path: path.join(artifactDir, "03-partial-delivery-failure.png"),
          fullPage: true,
        });

        await gateway.emitGatewayEvent("task", { action: "upserted", task: alphaDelivered });
        await rail
          .locator('[data-tasks-section="finished"] [data-task-id="subagent-alpha"]')
          .waitFor({ state: "visible" });
        expect(await rail.locator('[data-task-id="subagent-alpha"]').textContent()).toContain(
          "Result returned to Personal Agent",
        );
        expect(await rail.locator('[data-task-id="subagent-beta"]').textContent()).toContain(
          "Waiting for the result to reach Personal Agent",
        );
        await rail.locator('[data-task-id="subagent-alpha"]').click();
        const boundedResult = detail.locator(".chat-task-detail__activity-result p");
        await boundedResult.waitFor({ state: "visible" });
        const resultGeometry = await boundedResult.evaluate((element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));
        expect(resultGeometry.clientHeight).toBeLessThanOrEqual(320);
        expect(resultGeometry.scrollHeight).toBeGreaterThan(resultGeometry.clientHeight);
        await page.screenshot({
          path: path.join(artifactDir, "04-bounded-result-scroll.png"),
          fullPage: true,
        });
        await detail.getByRole("button", { name: "Back to subagents" }).click();
        await detail.waitFor({ state: "detached" });

        // A delayed terminal event must not regress the authoritative delivered snapshot.
        await gateway.emitGatewayEvent("task", {
          action: "upserted",
          task: { ...alphaRunning, updatedAt: baseTime - 1_000, lastActivity: "Stale event" },
        });
        await expect
          .poll(() => rail.locator('[data-task-id="subagent-alpha"]').textContent())
          .toContain("Result returned to Personal Agent");

        await gateway.emitGatewayEvent("task", { action: "upserted", task: betaDelivered });
        await gateway.emitGatewayEvent("task", { action: "upserted", task: gammaDelivered });
        await expect
          .poll(() => rail.locator('[data-task-id="subagent-beta"]').textContent())
          .toContain("Result returned to Personal Agent");
        await expect
          .poll(() => rail.locator('[data-task-id="subagent-gamma"]').textContent())
          .toContain("Result returned to Personal Agent");
        expect(await rail.locator('[data-tasks-section="running"]').count()).toBe(0);
        expect(await rail.getByRole("button", { name: "Finished (3)" }).count()).toBe(1);
        await page.screenshot({
          path: path.join(artifactDir, "04-all-reported.png"),
          fullPage: true,
        });

        const allReportedTasks = [alphaDelivered, betaDelivered, gammaDelivered, foreignRunning];
        const taskListBeforeReconnect = await gateway.getRequests("tasks.list");
        await gateway.setMethodResponse("tasks.list", taskListResponse(allReportedTasks));
        await gateway.setOnline(false);
        await gateway.setOnline(true);
        await gateway.waitForRequest("tasks.list", { after: taskListBeforeReconnect.length });
        for (const taskId of ["subagent-alpha", "subagent-beta", "subagent-gamma"]) {
          await expect
            .poll(() => rail.locator(`[data-task-id="${taskId}"]`).textContent())
            .toContain("Result returned to Personal Agent");
        }
        expect(await rail.locator('[data-task-id="subagent-foreign"]').count()).toBe(0);
        await page.screenshot({
          path: path.join(artifactDir, "05-reconnect-stable.png"),
          fullPage: true,
        });
      },
    );
  });
});
