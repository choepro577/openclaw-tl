import { beforeEach, describe, expect, it } from "vitest";
import {
  issueEnterpriseSocketToken,
  resetEnterpriseSocketTokenCacheForTest,
  verifyEnterpriseSocketToken,
} from "./enterprise-socket-auth.js";

describe("enterprise socket auth", () => {
  beforeEach(() => {
    resetEnterpriseSocketTokenCacheForTest();
    process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET = "test-enterprise-secret";
    delete process.env.OPENCLAW_ENTERPRISE_SOCKET_TTL_MS;
    delete process.env.OPENCLAW_ENTERPRISE_SOCKET_REFRESH_WINDOW_MS;
  });

  it("issues and verifies an enterprise token", () => {
    const issued = issueEnterpriseSocketToken({
      agentId: "NV00123",
      nowMs: 1_700_000_000_000,
      forceRefresh: true,
    });
    const verified = verifyEnterpriseSocketToken({
      token: issued.token,
      nowMs: 1_700_000_000_001,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) {
      return;
    }
    expect(verified.agentId).toBe("nv00123");
    expect(verified.expiresAtMs).toBe(issued.expiresAtMs);
  });

  it("reuses cached token until refresh window", () => {
    process.env.OPENCLAW_ENTERPRISE_SOCKET_TTL_MS = String(60 * 60 * 1000);
    process.env.OPENCLAW_ENTERPRISE_SOCKET_REFRESH_WINDOW_MS = String(5 * 60 * 1000);

    const first = issueEnterpriseSocketToken({
      agentId: "nv00123",
      nowMs: 1_700_000_000_000,
    });
    const second = issueEnterpriseSocketToken({
      agentId: "nv00123",
      nowMs: 1_700_000_100_000,
    });
    expect(second.token).toBe(first.token);

    const third = issueEnterpriseSocketToken({
      agentId: "nv00123",
      nowMs: first.expiresAtMs - 1_000,
    });
    expect(third.token).not.toBe(first.token);
  });

  it("rejects expired tokens", () => {
    process.env.OPENCLAW_ENTERPRISE_SOCKET_TTL_MS = "1000";
    const issued = issueEnterpriseSocketToken({
      agentId: "nv00123",
      nowMs: 1000,
      forceRefresh: true,
    });
    const verified = verifyEnterpriseSocketToken({
      token: issued.token,
      nowMs: 2001,
    });
    expect(verified.ok).toBe(false);
    if (verified.ok) {
      return;
    }
    expect(verified.reason).toBe("token_expired");
  });
});
