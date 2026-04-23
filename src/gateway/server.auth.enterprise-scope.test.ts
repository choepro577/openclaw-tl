import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  issueEnterpriseSocketToken,
  resetEnterpriseSocketTokenCacheForTest,
} from "./enterprise-socket-auth.js";
import {
  connectReq,
  getFreePort,
  openWs,
  restoreGatewayToken,
  rpcReq,
  startGatewayServer,
} from "./server.auth.shared.js";

describe("gateway enterprise socket scopes", () => {
  let server: Awaited<ReturnType<typeof startGatewayServer>>;
  let port = 0;
  let prevGatewayToken: string | undefined;
  let prevEnterpriseSecret: string | undefined;

  beforeAll(async () => {
    prevGatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    prevEnterpriseSecret = process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET;
    process.env.OPENCLAW_GATEWAY_TOKEN = "secret";
    process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET = "test-enterprise-secret";
    resetEnterpriseSocketTokenCacheForTest();
    port = await getFreePort();
    server = await startGatewayServer(port);
  });

  afterAll(async () => {
    await server.close();
    restoreGatewayToken(prevGatewayToken);
    if (prevEnterpriseSecret === undefined) {
      delete process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET;
    } else {
      process.env.OPENCLAW_ENTERPRISE_SOCKET_SECRET = prevEnterpriseSecret;
    }
    resetEnterpriseSocketTokenCacheForTest();
  });

  test("grants admin-scoped RPC access to enterprise socket connections", async () => {
    const ws = await openWs(port);
    try {
      const enterpriseToken = issueEnterpriseSocketToken({
        agentId: "tl00275",
        forceRefresh: true,
      });

      const connectRes = await connectReq(ws, {
        skipDefaultAuth: true,
        token: enterpriseToken.token,
        device: null,
        scopes: [],
      });
      expect(connectRes.ok).toBe(true);

      const adminRes = await rpcReq(ws, "set-heartbeats", { enabled: false });
      expect(adminRes.ok).toBe(true);
      expect((adminRes.payload as { enabled?: boolean } | undefined)?.enabled).toBe(false);
    } finally {
      ws.close();
    }
  });
});
