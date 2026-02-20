import { describe, expect, it, vi } from "vitest";
import type { GatewayWsClient } from "./server/ws-types.js";
import { createGatewayBroadcaster } from "./server-broadcast.js";

type TestSocket = {
  bufferedAmount: number;
  send: (payload: string) => void;
  close: (code: number, reason: string) => void;
};

describe("gateway broadcaster", () => {
  it("filters approval and pairing events by scope", () => {
    const approvalsSocket: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };
    const pairingSocket: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };
    const readSocket: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };

    const clients = new Set<GatewayWsClient>([
      {
        socket: approvalsSocket as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.approvals"] } as GatewayWsClient["connect"],
        connId: "c-approvals",
      },
      {
        socket: pairingSocket as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.pairing"] } as GatewayWsClient["connect"],
        connId: "c-pairing",
      },
      {
        socket: readSocket as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.read"] } as GatewayWsClient["connect"],
        connId: "c-read",
      },
    ]);

    const { broadcast, broadcastToConnIds } = createGatewayBroadcaster({ clients });

    broadcast("exec.approval.requested", { id: "1" });
    broadcast("device.pair.requested", { requestId: "r1" });

    expect(approvalsSocket.send).toHaveBeenCalledTimes(1);
    expect(pairingSocket.send).toHaveBeenCalledTimes(1);
    expect(readSocket.send).toHaveBeenCalledTimes(0);

    broadcastToConnIds("tick", { ts: 1 }, new Set(["c-read"]));
    expect(readSocket.send).toHaveBeenCalledTimes(1);
    expect(approvalsSocket.send).toHaveBeenCalledTimes(1);
    expect(pairingSocket.send).toHaveBeenCalledTimes(1);
  });

  it("isolates chat events for enterprise-scoped connections by agentId", () => {
    const socketA: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };
    const socketB: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };
    const adminSocket: TestSocket = {
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
    };

    const clients = new Set<GatewayWsClient>([
      {
        socket: socketA as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.write"] } as GatewayWsClient["connect"],
        connId: "enterprise-a",
        authKind: "enterprise-token",
        boundAgentId: "nv001",
      },
      {
        socket: socketB as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.write"] } as GatewayWsClient["connect"],
        connId: "enterprise-b",
        authKind: "enterprise-token",
        boundAgentId: "nv002",
      },
      {
        socket: adminSocket as unknown as GatewayWsClient["socket"],
        connect: { role: "operator", scopes: ["operator.admin"] } as GatewayWsClient["connect"],
        connId: "admin",
        authKind: "gateway-token",
      },
    ]);

    const { broadcast } = createGatewayBroadcaster({ clients });
    broadcast("chat", {
      runId: "r1",
      sessionKey: "agent:nv001:openai-user:nv001:s1",
      state: "delta",
    });

    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).toHaveBeenCalledTimes(0);
    expect(adminSocket.send).toHaveBeenCalledTimes(1);
  });
});
