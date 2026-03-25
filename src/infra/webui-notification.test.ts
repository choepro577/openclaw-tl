import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  buildWebUiNotificationPayload,
  resolveWebUiUserCodes,
  sendWebUiNotification,
  shouldNotifyWebUi,
} from "./webui-notification.js";

describe("webui-notification", () => {
  it("defaults notiToWebUI to true and preserves configured agent id casing", () => {
    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "Test123" }],
      },
    };

    expect(shouldNotifyWebUi({ cfg, agentId: "test123" })).toBe(true);
    expect(resolveWebUiUserCodes({ cfg, agentId: "test123" })).toEqual(["Test123"]);
  });

  it("does not notify for dedicated agent-to-agent pair sessions", () => {
    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "tl00275" }],
      },
    };

    expect(
      shouldNotifyWebUi({
        cfg,
        agentId: "tl00275",
        sessionKey: "agent:nguyen-tester:a2a:from:tl00275",
      }),
    ).toBe(false);
  });

  it("prefers workspace staff code over configured agent id", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "webui-noti-"));
    fs.writeFileSync(
      path.join(workspace, "AGENTS.md"),
      ["# AGENTS.md", "", "- **Agent ID:** `tl00275`", "- **Staff Code:** `TL00275`"].join("\n"),
      "utf8",
    );

    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "tl00275", workspace }],
      },
    };

    expect(resolveWebUiUserCodes({ cfg, agentId: "tl00275" })).toEqual(["TL00275"]);
  });

  it("builds notification payload with preview text and sessionKey data", () => {
    const payload = buildWebUiNotificationPayload({
      userCodes: ["TL00275"],
      sessionKey: "agent:tl00275:main",
      text: "  Hello\n\nworld [[reply_to_current]]  ",
    });

    expect(payload).toEqual({
      user_codes: ["TL00275"],
      title: "Assistant",
      body: "Hello world",
      data: {
        sessionKey: "agent:tl00275:main",
      },
    });
  });

  it("posts notification request with fixed endpoint and headers", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "webui-noti-"));
    fs.writeFileSync(
      path.join(workspace, "USER.md"),
      [
        "# USER.md",
        "",
        "- **Display Name:** Nguyen Duc Hieu",
        "- **Staff Code:** TL00275",
        "- **Agent ID:** tl00275",
      ].join("\n"),
      "utf8",
    );
    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "tl00275", workspace }],
      },
    };

    const ok = await sendWebUiNotification({
      cfg,
      agentId: "tl00275",
      sessionKey: "agent:tl00275:main",
      text: "Xin chao",
      fetchImpl,
    });

    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.comnieuthienly.vn/api/api-tool/notifications/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "company-id": "1",
        }),
      }),
    );
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      user_codes: ["TL00275"],
      title: "Assistant",
      body: "Xin chao",
      data: {
        sessionKey: "agent:tl00275:main",
      },
    });
  });

  it("logs and swallows failed notification requests", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    const logger = { warn: vi.fn() };
    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "TL00275" }],
      },
    };

    const ok = await sendWebUiNotification({
      cfg,
      agentId: "tl00275",
      text: "Xin chao",
      fetchImpl,
      logger,
    });

    expect(ok).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("status=502"),
      expect.objectContaining({
        status: 502,
        userCodes: ["TL00275"],
        detail: "bad gateway",
      }),
    );
  });

  it("skips sending notification requests for dedicated agent-to-agent pair sessions", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const cfg: OpenClawConfig = {
      agents: {
        list: [{ id: "tl00275" }],
      },
    };

    const ok = await sendWebUiNotification({
      cfg,
      agentId: "tl00275",
      sessionKey: "agent:nguyen-tester:a2a:from:tl00275",
      text: "Agent pair reply",
      fetchImpl,
    });

    expect(ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
