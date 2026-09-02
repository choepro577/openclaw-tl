import { expectDefined } from "@openclaw/normalization-core";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { chatHistoryHandlers } from "./chat-history-handler.js";
import type { GatewayRequestContext, RespondFn } from "./types.js";

describe("chat metadata ownership", () => {
  it("returns a typed selection error for an ownerless explicit fleet", async () => {
    const config: OpenClawConfig = {
      agents: {
        ownership: "explicit",
        entries: { ops: {}, research: {} },
      },
    };
    const respond = vi.fn();
    const readChatMetadata = vi.fn();

    await expectDefined(
      chatHistoryHandlers["chat.metadata"],
      'chatHistoryHandlers["chat.metadata"] test invariant',
    )({
      params: {},
      respond: respond as unknown as RespondFn,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
      context: {
        getRuntimeConfig: () => config,
        readChatMetadata,
      } as unknown as GatewayRequestContext,
    });

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        code: "INVALID_REQUEST",
        message: expect.stringContaining("has no explicit owner"),
      }),
    );
    expect(readChatMetadata).not.toHaveBeenCalled();
  });

  it("does not expose model or command metadata to Enterprise user-portal clients", async () => {
    const config: OpenClawConfig = {
      agents: { entries: { main: {} } },
    };
    const respond = vi.fn();
    const readChatMetadata = vi.fn(async () => ({
      commands: [{ name: "model" }],
      models: [{ id: "provider/hidden-model" }],
      swarmEnabled: true,
    }));

    await expectDefined(
      chatHistoryHandlers["chat.metadata"],
      'chatHistoryHandlers["chat.metadata"] Enterprise projection invariant',
    )({
      params: { agentId: "main" },
      respond: respond as unknown as RespondFn,
      req: {} as never,
      client: {
        authenticatedUserProfile: { profileId: "profile-user" },
        internal: {
          enterpriseSession: {
            accountId: "account-user",
            accountRole: "employee",
            audience: "user",
          },
        },
      } as never,
      isWebchatConnect: () => false,
      context: {
        getRuntimeConfig: () => config,
        readChatMetadata,
      } as unknown as GatewayRequestContext,
    });

    expect(respond).toHaveBeenCalledWith(true, { swarmEnabled: false });
    expect(readChatMetadata).not.toHaveBeenCalled();
  });
});
