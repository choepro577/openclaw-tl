/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminAccount,
  saveAdminAgentDelegationProfile,
  updateAdminAccount,
} from "./enterprise-api.ts";

describe("Enterprise delegation profile API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits an empty client-side required input id so the server can generate it", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ agentId: "contracts", hash: "next-hash" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await saveAdminAgentDelegationProfile({
      agentId: "contracts",
      description: "Reviews enterprise contract risks and obligations.",
      profile: {
        status: "draft",
        aliases: ["contract specialist"],
        handlingMode: "auto_when_certain",
        useWhen: ["Review a penalty clause", "Check contract obligations"],
        avoidWhen: [],
        requiredInputs: [
          {
            id: "",
            label: "Contract number",
            question: "Which contract number should be reviewed?",
          },
        ],
      },
      baseHash: "base-hash",
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      profile: { requiredInputs: Array<Record<string, string>> };
    };
    expect(body.profile.requiredInputs).toEqual([
      {
        label: "Contract number",
        question: "Which contract number should be reviewed?",
      },
    ]);
  });

  it("defaults employee account creation to the basic access preset", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ account: { id: "account-1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createAdminAccount({
      username: "hieu",
      displayName: "Hiếu DZ",
      initialPassword: "password-password",
      role: "employee",
      enabled: true,
      personalAgentEnabled: true,
      defaultAgentId: null,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ accessPresetKey: "basic@1" });
  });

  it("preserves an explicit applyAccessPreset update flag", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ account: { id: "account-1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateAdminAccount("account-1", {
      accessPresetKey: "basic@1",
      applyAccessPreset: true,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      accessPresetKey: "basic@1",
      applyAccessPreset: true,
    });
  });
});
