import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  isEnterpriseAdminModelMethod,
  readEnterpriseAdminModelContext,
  testApi,
} from "./admin-model-service.js";

describe("Enterprise Admin model bridge", () => {
  it("advertises only the fixed model action contract", () => {
    expect(isEnterpriseAdminModelMethod("models.list")).toBe(true);
    expect(isEnterpriseAdminModelMethod("openclaw.setup.activate")).toBe(true);
    expect(isEnterpriseAdminModelMethod("gateway.restart")).toBe(false);
    expect(isEnterpriseAdminModelMethod("tools.invoke")).toBe(false);
  });

  it("projects only shared authored agents into the Admin selector", () => {
    const config: OpenClawConfig = {
      agents: {
        entries: {
          main: { name: "Main" },
          research: { identity: { name: "Research" } },
          openclaw: { name: "System" },
        },
      },
    };
    const result = readEnterpriseAdminModelContext(config);
    expect(result.agents.defaultId).toBe("main");
    expect(result.agents.agents).toEqual([
      { id: "main", kind: "agent", name: "Main" },
      { id: "research", kind: "agent", name: "Research" },
    ]);
  });

  it("retains the implicit legacy main agent when no roster is authored", () => {
    expect(readEnterpriseAdminModelContext({}).agents).toMatchObject({
      defaultId: "main",
      agents: [{ id: "main", kind: "agent" }],
    });
  });

  it("accepts model-owned config leaves and rejects unrelated or personal-agent leaves", () => {
    const shared = new Set(["main", "research"]);
    expect(testApi.modelOwnedPath("models.providers.openai.apiKey", shared)).toBe(true);
    expect(testApi.modelOwnedPath("agents.defaults.model.fallbacks", shared)).toBe(true);
    expect(testApi.modelOwnedPath("agents.entries.research.fastModeDefault", shared)).toBe(true);
    expect(testApi.modelOwnedPath("agents.entries.personal-user.model", shared)).toBe(false);
    expect(testApi.modelOwnedPath("gateway.auth.mode", shared)).toBe(false);
    expect(testApi.modelOwnedPath("plugins.entries.foo.enabled", shared)).toBe(false);
  });

  it("collects every leaf in a config patch for scope validation", () => {
    expect(
      testApi.collectLeafPaths({
        models: { providers: { openai: { apiKey: "secret" } } },
        gateway: { port: 1234 },
      }),
    ).toEqual(["models.providers.openai.apiKey", "gateway.port"]);
  });
});
