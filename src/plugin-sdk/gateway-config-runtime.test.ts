import { describe, expect, it } from "vitest";
import { resolveGatewayPort as canonicalResolveGatewayPort } from "../config/paths.js";
import { resolveGatewayPort } from "./gateway-config-runtime.js";

describe("published Diffs gateway config SDK contract", () => {
  it("uses the canonical port resolver without separate config behavior", () => {
    expect(resolveGatewayPort).toBe(canonicalResolveGatewayPort);
    expect(resolveGatewayPort({ gateway: { port: 18789 } }, {})).toBe(18789);
    expect(
      resolveGatewayPort({ gateway: { port: 18789 } }, { OPENCLAW_GATEWAY_PORT: "18800" }),
    ).toBe(18800);
  });
});
