import { enterprisePortalBasePath, type EnterprisePortalStatus } from "./portal-resolution.ts";

export async function probeEnterprisePortalStatus(
  pathname: string,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<EnterprisePortalStatus | null> {
  const response = await fetcher(`${enterprisePortalBasePath(pathname)}/api/enterprise/status`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
    return null;
  }
  const raw = (await response.json()) as { enabled?: unknown; userPortalVersion?: unknown };
  if (raw.enabled !== true) {
    return { enabled: false, userPortalVersion: "legacy" };
  }
  return {
    enabled: true,
    userPortalVersion: raw.userPortalVersion === "v2" ? "v2" : "legacy",
  };
}
