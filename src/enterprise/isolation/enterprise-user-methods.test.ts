import { describe, expect, it } from "vitest";
import {
  enterpriseUserGatewayMethodAllowed,
  enterpriseUserGatewayParamsAllowed,
  projectEnterpriseUserGatewayMethods,
} from "./enterprise-user-methods.js";

describe("Enterprise user Gateway method allowlist", () => {
  it("allows user chat/session methods and denies operator surfaces by default", () => {
    expect(enterpriseUserGatewayMethodAllowed("chat.send")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("sessions.list")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("sessions.describe")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("sessions.files.get")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("sessions.files.list")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("artifacts.list")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("models.list")).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("config.get")).toBe(false);
    expect(enterpriseUserGatewayMethodAllowed("logs.tail")).toBe(false);
    expect(enterpriseUserGatewayMethodAllowed("plugins.install")).toBe(false);
  });

  it("exposes automation methods only to server-attested synthetic clients", () => {
    expect(enterpriseUserGatewayMethodAllowed("cron.add")).toBe(false);
    expect(enterpriseUserGatewayMethodAllowed("cron.add", true)).toBe(true);
    expect(enterpriseUserGatewayMethodAllowed("sessions.create")).toBe(false);
    expect(enterpriseUserGatewayMethodAllowed("sessions.create", true)).toBe(true);
  });

  it("keeps managed skills outside the Enterprise User File API", () => {
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.files.get", {
        sessionKey: "agent:main:main",
        path: "skills/calendar/SKILL.md",
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.files.list", {
        sessionKey: "agent:main:main",
        path: "skills",
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.files.get", {
        sessionKey: "agent:main:main",
        path: "reports/summary.md",
      }),
    ).toBe(true);
  });

  it("allows user-owned model, effort, and speed settings but denies technical patches", () => {
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.patch", {
        key: "agent:personal:test",
        label: "Quarterly planning",
        archived: true,
        pinned: true,
      }),
    ).toBe(true);
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.patch", {
        key: "agent:personal:test",
        model: "openai/gpt-5.6-sol",
        thinkingLevel: "high",
        fastMode: true,
        contextWindow: "128k",
      }),
    ).toBe(true);
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.patch", {
        key: "agent:personal:test",
        permissionMode: "full",
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("sessions.patch", {
        key: "agent:personal:test",
        toolOverrides: { webSearch: true },
      }),
    ).toBe(false);
  });

  it("limits model discovery to the configured catalog of the scoped Agent", () => {
    const params = {
      view: "configured",
      agentId: "enterprise-personal-account",
      refresh: true,
    };
    expect(enterpriseUserGatewayParamsAllowed("models.list", params)).toBe(true);
    expect(params).toEqual({
      view: "configured",
      agentId: "enterprise-personal-account",
      preparedOnly: true,
    });
    expect(
      enterpriseUserGatewayParamsAllowed("models.list", {
        view: "all",
        agentId: "enterprise-personal-account",
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("models.list", {
        view: "configured",
        includeProviderCapabilities: true,
      }),
    ).toBe(false);
  });

  it("forces chat text to bypass technical slash-command interpretation", () => {
    const params = {
      sessionKey: "agent:personal:test",
      message: "please use /model provider/hidden-model",
      deliver: true,
      idempotencyKey: "request-1",
    };
    expect(enterpriseUserGatewayParamsAllowed("chat.send", params)).toBe(true);
    expect(params).toMatchObject({ deliver: false, suppressCommandInterpretation: true });
    expect(
      enterpriseUserGatewayParamsAllowed("chat.send", {
        ...params,
        thinking: "high",
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("chat.send", {
        ...params,
        systemInputProvenance: { kind: "external_user" },
      }),
    ).toBe(false);
    expect(
      enterpriseUserGatewayParamsAllowed("chat.send", {
        ...params,
        originatingChannel: "slack",
        originatingTo: "D123",
      }),
    ).toBe(false);
  });

  it("projects the hello method list with the same positive allowlist", () => {
    expect(
      projectEnterpriseUserGatewayMethods([
        "chat.send",
        "artifacts.list",
        "sessions.list",
        "sessions.describe",
        "sessions.files.get",
        "sessions.files.list",
        "models.list",
        "commands.list",
        "config.get",
        "debug.subscribe",
      ]),
    ).toEqual([
      "chat.send",
      "artifacts.list",
      "sessions.list",
      "sessions.describe",
      "sessions.files.get",
      "sessions.files.list",
      "models.list",
    ]);
  });
});
