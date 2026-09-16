import { describe, expect, it } from "vitest";
import { shouldIncludeChatSendAckServerTiming } from "./chat-server-timing.js";
import {
  gatewayClientSenderFields,
  gatewayClientSessionCreator,
} from "./gateway-client-identity.js";
import type { GatewayClient } from "./types.js";

describe("gateway client identity", () => {
  it("overrides sender attribution without replacing the authorizing identity", () => {
    const client = {
      authenticatedUserProfile: {
        profileId: "owner",
        displayName: "Owner",
        hasAvatar: false,
        updatedAt: 1,
      },
      internal: {
        syntheticClient: true,
        senderAttribution: { id: "alice", name: "Suggested by Alice" },
      },
    } as GatewayClient;

    expect(gatewayClientSessionCreator(client)).toEqual({
      type: "human",
      id: "owner",
      label: "Owner",
    });
    expect(gatewayClientSenderFields(client)).toEqual({
      sender: { id: "alice", name: "Suggested by Alice" },
    });
  });

  it("keeps a GitHub-backed mutable alias unattributed until immutable sync completes", () => {
    const client = {
      authenticatedUserId: "released-login@github",
      authenticatedGitHubIdentitySync: async () => ({ profileId: "owner", updatedAt: 1 }),
    } as GatewayClient;

    expect(gatewayClientSenderFields(client)).toEqual({});
    expect(gatewayClientSessionCreator(client)).toBeUndefined();
  });

  it("allows server timing for an attested Enterprise user portal connection", () => {
    const portalClient = {
      connect: { client: { id: "webchat-ui", mode: "webchat" } },
      authenticatedUserProfile: { profileId: "profile-1" },
      internal: {
        enterpriseSession: {
          audience: "user",
          accountId: "account-1",
          accountRole: "member",
        },
      },
    } as unknown as GatewayClient;

    expect(shouldIncludeChatSendAckServerTiming(portalClient)).toBe(true);
    expect(shouldIncludeChatSendAckServerTiming({ id: "webchat-ui", mode: "webchat" })).toBe(false);
  });
});
