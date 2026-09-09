import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { searchEnterpriseExtensions } from "./extension-service.js";
import {
  createEnterprisePluginRequest,
  transitionEnterprisePluginRequest,
  upsertEnterprisePluginGrant,
} from "./extension-store.js";

type CatalogSkill = {
  owner: string;
  version?: string;
  latestVersion?: string;
  external?: boolean;
};

afterEach(() => {
  vi.unstubAllGlobals();
  closeOpenClawStateDatabaseForTest();
});

async function searchCatalog(
  skills: CatalogSkill[],
  includeNativePlugin = false,
  setupAccount?: (accountId: string) => void,
  query = "weather",
  onRequest?: (url: URL) => Promise<void>,
  verifyCache?: (
    read: () => ReturnType<typeof searchEnterpriseExtensions>,
    fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
    accountId: string,
  ) => Promise<void>,
) {
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "content-type": "application/json" },
    });
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    await onRequest?.(url);
    switch (url.pathname) {
      case "/api/v1/packages": {
        const family = url.searchParams.get("family");
        return json({
          items:
            family === "skill"
              ? skills.map((skill) => ({
                  name: "weather",
                  displayName: "Weather",
                  family,
                  ownerHandle: skill.owner,
                  latestVersion: skill.version,
                }))
              : includeNativePlugin && family === "code-plugin"
                ? [{ name: "native", displayName: "Native", family, latestVersion: "3.0.0" }]
                : [],
        });
      }
      case "/api/v1/search":
        return json({
          results: skills.map((skill) => ({
            score: 1,
            slug: "weather",
            ownerHandle: skill.owner,
            displayName: "Weather",
            version: skill.version,
            source: skill.external ? "skills-sh" : "clawhub",
            install: {
              kind: skill.external ? "skills-sh" : "clawhub",
              reference: skill.external
                ? `skills-sh:${skill.owner}/skills/weather`
                : `${skill.owner}/weather`,
            },
          })),
        });
      case "/api/v1/packages/search":
        return json({
          results: includeNativePlugin
            ? [
                {
                  score: 1,
                  package: {
                    name: "native",
                    displayName: "Native",
                    family: "code-plugin",
                    latestVersion: "3.0.0",
                  },
                },
              ]
            : [],
        });
      default:
        throw new Error(`Unexpected catalog request: ${url.pathname}`);
    }
  });
  vi.stubGlobal("fetch", fetchMock);
  const result = await withOpenClawTestState(
    { scenario: "minimal", applyEnv: true },
    async (state) => {
      const account = createEnterpriseAccount({
        username: "catalog-user",
        displayName: "Catalog User",
        passwordHash: "test-only",
        role: "employee",
      });
      setupAccount?.(account.id);
      const read = () =>
        searchEnterpriseExtensions({
          config: { agents: { defaults: { workspace: state.workspaceDir } } },
          account,
          agentKey: "personal",
          query,
        });
      const page = await read();
      await verifyCache?.(read, fetchMock, account.id);
      return page;
    },
  );
  const detailOwners = fetchMock.mock.calls.flatMap(([input]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return url.pathname === "/api/v1/skills/weather"
      ? [url.searchParams.get("ownerHandle") ?? ""]
      : [];
  });
  return {
    ...result,
    detailOwners,
    requestedUrls: fetchMock.mock.calls.map(
      ([input]) => new URL(input instanceof Request ? input.url : String(input)),
    ),
  };
}

describe("Enterprise plugin catalog discovery", () => {
  it("returns browse metadata with three requests and never claims install eligibility", async () => {
    const result = await searchCatalog([{ owner: "alice", version: "1.0.0" }], true, undefined, "");
    expect(result.requestedUrls).toHaveLength(3);
    expect(result.items).toMatchObject([
      {
        catalogKey: "@alice/weather",
        version: "1.0.0",
        allowedAction: "none",
        trust: null,
        reasonCodes: ["REVIEW_REQUIRED"],
      },
      {
        catalogKey: "native",
        version: "3.0.0",
        allowedAction: "none",
        integrity: null,
        reasonCodes: ["REVIEW_REQUIRED"],
      },
    ]);
  });

  it("keeps publisher refs and alternate-registry denial without resolving each release", async () => {
    const result = await searchCatalog([
      { owner: "alice", latestVersion: "1.0.0" },
      { owner: "bob", version: "2.0.0" },
      { owner: "external", external: true },
    ]);
    expect(result.requestedUrls).toHaveLength(2);
    expect(result.detailOwners).toEqual([]);
    expect(result.items).toMatchObject([
      {
        catalogKey: "@alice/weather",
        version: null,
        allowedAction: "none",
        reasonCodes: ["REVIEW_REQUIRED"],
      },
      {
        catalogKey: "@bob/weather",
        version: "2.0.0",
        allowedAction: "none",
        reasonCodes: ["REVIEW_REQUIRED"],
      },
      {
        catalogKey: "skills-sh:external/skills/weather",
        allowedAction: "none",
        reasonCodes: ["ALTERNATE_REGISTRY_DENIED"],
      },
    ]);
  });

  it("reuses discovery but reads current request/grant state and returns independent objects", async () => {
    await searchCatalog(
      [],
      true,
      undefined,
      "weather",
      undefined,
      async (read, fetchMock, accountId) => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const first = await read();
        first.items[0]!.name = "local mutation";
        const request = createEnterprisePluginRequest({
          requesterAccountId: accountId,
          packageName: "native",
          packageFamily: "code_plugin",
          exactVersion: "3.0.0",
          integrity: "sha256:artifact",
          requestKind: "access",
          trustSnapshot: {},
          capabilitySnapshot: {},
          capabilityDigest: "capabilities",
        });
        const pending = await read();
        expect(pending.items[0]).toMatchObject({ name: "Native", requestState: "pending" });
        transitionEnterprisePluginRequest({
          id: request.id,
          baseRevision: request.revision,
          from: ["pending"],
          to: "available",
        });
        const grant = {
          accountId,
          pluginId: "native-plugin-id",
          exactVersion: request.exactVersion,
          integrity: request.integrity,
          capabilityDigest: request.capabilityDigest,
          approvedTools: ["native.search"],
          sourceRequestId: request.id,
        };
        upsertEnterprisePluginGrant({ ...grant, state: "active" });
        expect((await read()).items[0]?.requestState).toBe("available");
        upsertEnterprisePluginGrant({ ...grant, state: "revoked" });
        expect((await read()).items[0]?.requestState).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const now = Date.now();
        const clock = vi.spyOn(Date, "now").mockReturnValue(now + 61_000);
        try {
          const refreshed = await Promise.all([read(), read()]);
          expect(refreshed[0]).toEqual(refreshed[1]);
          expect(fetchMock).toHaveBeenCalledTimes(4);
        } finally {
          clock.mockRestore();
        }
      },
    );
  });
});
