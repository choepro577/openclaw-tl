import { describe, expect, it } from "vitest";
import { rebindInputToCommittedConfiguredOwner } from "../../agents/prepared-model-runtime.owner.js";
import {
  isGatewayRequestScopedRuntimeConfig,
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../../gateway/request-runtime-config.js";
import { resolveCronAgentConfig } from "./run-config.js";

describe("cron request-scoped config", () => {
  it("keeps personal-agent authority through defaults merging and runtime admission", () => {
    const metadata = {
      enterpriseUser: {
        accountId: "account-a",
        displayName: "Account A",
        personalAgentId: "enterprise-personal-a",
        personalAgentTemplateId: "personal",
      },
    };
    const config = markGatewayRequestScopedRuntimeConfig({}, metadata);
    const { cfgWithAgentDefaults } = resolveCronAgentConfig({ config });
    expect(cfgWithAgentDefaults).not.toBe(config);
    expect(isGatewayRequestScopedRuntimeConfig(cfgWithAgentDefaults)).toBe(true);
    expect(readGatewayRequestRuntimeMetadata(cfgWithAgentDefaults)).toBe(metadata);
    expect(() =>
      rebindInputToCommittedConfiguredOwner(new Map(), {
        config: cfgWithAgentDefaults,
        agentId: metadata.enterpriseUser.personalAgentId,
        agentDir: "/tmp/enterprise-personal-a/agent",
        preserveConfigOnRefresh: isGatewayRequestScopedRuntimeConfig(cfgWithAgentDefaults),
      }),
    ).not.toThrow();
  });

  it("does not grant request-scoped authority to ordinary cron configs", () => {
    const { cfgWithAgentDefaults } = resolveCronAgentConfig({ config: {} });
    expect(isGatewayRequestScopedRuntimeConfig(cfgWithAgentDefaults)).toBe(false);
    expect(readGatewayRequestRuntimeMetadata(cfgWithAgentDefaults)).toBeUndefined();
  });
});
