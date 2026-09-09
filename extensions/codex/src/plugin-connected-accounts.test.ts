import { afterEach, describe, expect, it, vi } from "vitest";
import {
  codexPluginAddAccountUrl,
  readCodexPluginConnectedAccounts,
} from "./plugin-connected-accounts.js";

const prepare = vi.hoisted(() => vi.fn());
vi.mock("./app-server/auth-bridge.js", () => ({
  resolveCodexAppServerPreparedAuthProfileSnapshot: prepare,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  prepare.mockReset();
});
const scope = { agentDir: "/agent/owner", authProfileId: "openai:owner" };

describe("Codex provider account links", () => {
  it("uses the exact agent identity and returns only visible links for requested apps", async () => {
    prepare.mockResolvedValue({
      loginParams: {
        type: "chatgptAuthTokens",
        accessToken: "test-secret",
        chatgptAccountId: "owner",
      },
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          links: [
            {
              id: "link-a",
              connector_id: "gmail",
              name: "Work",
              owner_profile: { email: "work@example.com", picture: "https://example.com/avatar" },
              auth_status: "AUTHENTICATED",
              auth_type: "OAUTH",
              secret: "never-return",
            },
            {
              id: "link-b",
              connector_id: "gmail",
              name: "Personal",
              owner_profile: { email: "personal@example.com" },
              auth_status: "REAUTH_REQUIRED",
              auth_type: "OAUTH",
            },
            { id: "hidden", connector_id: "gmail", visibility: "HIDDEN" },
            { id: "implicit_link::gmail", connector_id: "gmail" },
            { id: "other", connector_id: "slack", owner_profile: { email: "private@example.com" } },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await readCodexPluginConnectedAccounts(scope, ["gmail"]);
    expect(prepare).toHaveBeenCalledWith({ ...scope, config: undefined });
    expect(fetcher).toHaveBeenCalledWith(
      "https://chatgpt.com/backend-api/aip/connectors/links/list_accessible",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret",
          "ChatGPT-Account-Id": "owner",
        }),
        body: JSON.stringify({ principals: [], link_refresh_strategy: "BLOCKING" }),
      }),
    );
    expect(result?.get("gmail")).toEqual([
      {
        id: "link-a",
        name: "Work",
        email: "work@example.com",
        avatarUrl: "https://example.com/avatar",
        authStatus: "AUTHENTICATED",
        authType: "OAUTH",
      },
      {
        id: "link-b",
        name: "Personal",
        email: "personal@example.com",
        avatarUrl: null,
        authStatus: "REAUTH_REQUIRED",
        authType: "OAUTH",
      },
    ]);
    expect(result?.size).toBe(1);
  });
  it("distinguishes unavailable from empty and never fetches without scoped ChatGPT auth", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await readCodexPluginConnectedAccounts(scope, ["gmail"])).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
    prepare.mockResolvedValue({
      loginParams: {
        type: "chatgptAuthTokens",
        accessToken: "test-secret",
        chatgptAccountId: "owner",
      },
    });
    fetcher.mockResolvedValueOnce(new Response("sensitive-error", { status: 403 }));
    expect(await readCodexPluginConnectedAccounts(scope, ["gmail"])).toBeUndefined();
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ links: [] })));
    expect((await readCodexPluginConnectedAccounts(scope, ["gmail"]))?.get("gmail")).toEqual([]);
  });
  it("builds the desktop add-account deep link only on the official provider", () => {
    const url = new URL(
      codexPluginAddAccountUrl({
        id: "connector_1",
        installUrl: "https://chatgpt.com/apps/gmail/connector_1",
      })!,
    );
    expect(url.hash).toBe(
      "#settings/Connectors?connector=connector_1&add-connector-link=true&product-sku=CODEX&referrer=codex",
    );
    expect(
      codexPluginAddAccountUrl({ id: "connector_1", installUrl: "https://attacker.example" }),
    ).toBeNull();
  });
});
