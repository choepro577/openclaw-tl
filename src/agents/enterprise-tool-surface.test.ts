import { describe, expect, it } from "vitest";
import { markGatewayRequestScopedRuntimeConfig } from "../gateway/request-runtime-config.js";
import { assertEnterpriseToolSurface } from "./enterprise-tool-surface.js";

describe("Enterprise runtime preparation", () => {
  it("reports the missing runtime component before submitting the model request", () => {
    const config = markGatewayRequestScopedRuntimeConfig(
      {},
      {
        enterpriseCapabilities: {
          resolve: () => ({
            allowed: true,
            scope: "shared",
            pluginTools: [],
            accountId: "user",
            agentId: "purchase",
            revision: "v1",
            config: {},
            skillsSnapshot: {
              prompt: "",
              skills: [
                {
                  name: "purchase",
                  scriptRuntime: {
                    entrypoints: { query: { path: "scripts/query", kind: "fixed", risk: "read" } },
                  },
                },
              ],
            },
          }),
        },
      },
    );
    const prepare = (names: string[], nativeSkillReader = false) =>
      assertEnterpriseToolSurface({
        config,
        agentId: "purchase",
        tools: names.map((name) => ({ name })),
        boundary: "test-bind",
        nativeSkillReader,
      });
    expect(() => prepare(["read"])).toThrow("skill_script");
    expect(() => prepare(["skill_script"])).toThrow("read");
    expect(() => prepare(["read", "skill_script"])).not.toThrow();
    expect(() => prepare(["skill_script"], true)).not.toThrow();
    expect(() =>
      assertEnterpriseToolSurface({
        config: {},
        agentId: "personal",
        tools: [],
        boundary: "ordinary",
      }),
    ).not.toThrow();
  });
});
