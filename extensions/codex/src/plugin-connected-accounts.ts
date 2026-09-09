import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { resolveCodexAppServerPreparedAuthProfileSnapshot } from "./app-server/auth-bridge.js";

export type CodexPluginConnectedAccount = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  authStatus: string;
  authType: string;
};

type AccountScope = { agentDir: string; authProfileId?: string | null; config?: OpenClawConfig };
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : undefined;
const string = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 1024) : null;

function imageUrl(value: unknown): string | null {
  try {
    const url = new URL(string(value) ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Codex desktop's browser add-account contract; no local OAuth callback or credentials. */
export function codexPluginAddAccountUrl(app: {
  id: string;
  installUrl?: string | null;
}): string | null {
  try {
    const url = new URL(app.installUrl ?? "");
    if (url.origin !== "https://chatgpt.com") return null;
    url.hash = `settings/Connectors?${new URLSearchParams({
      connector: app.id,
      "add-connector-link": "true",
      "product-sku": "CODEX",
      referrer: "codex",
    })}`;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Product-layer connector links are separate from public app-server app/read.
 * Match the desktop list_accessible contract, using only this agent's prepared
 * ChatGPT identity. Never use browser cookies or fall back to another user's home.
 */
export async function readCodexPluginConnectedAccounts(
  scope: AccountScope,
  appIds: string[],
): Promise<Map<string, CodexPluginConnectedAccount[]> | undefined> {
  if (!scope.agentDir.trim() || appIds.length === 0) return undefined;
  try {
    const snapshot = await resolveCodexAppServerPreparedAuthProfileSnapshot({
      agentDir: scope.agentDir,
      authProfileId: scope.authProfileId ?? undefined,
      config: scope.config,
    });
    const auth = snapshot?.loginParams;
    if (auth?.type !== "chatgptAuthTokens") return undefined;
    const response = await fetch(
      "https://chatgpt.com/backend-api/aip/connectors/links/list_accessible",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "ChatGPT-Account-Id": auth.chatgptAccountId,
          "Content-Type": "application/json",
          "OAI-Product-Sku": "CODEX",
        },
        body: JSON.stringify({ principals: [], link_refresh_strategy: "BLOCKING" }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return undefined;
    }
    const data = object(await response.json());
    if (!Array.isArray(data?.links)) return undefined;
    const accounts = new Map(appIds.map((id) => [id, [] as CodexPluginConnectedAccount[]]));
    for (const value of data.links) {
      const link = object(value);
      const id = string(link?.id);
      const target = accounts.get(string(link?.connector_id) ?? "");
      if (
        !link ||
        !target ||
        !id ||
        id.startsWith("implicit_link::") ||
        link.visibility === "HIDDEN"
      )
        continue;
      if (target.length >= 100 || target.some((account) => account.id === id)) continue;
      const profile = object(link.owner_profile);
      target.push({
        id,
        name: string(link.name),
        email: string(profile?.email),
        avatarUrl: imageUrl(profile?.picture),
        authStatus: string(link.auth_status) ?? "UNKNOWN",
        authType: string(link.auth_type) ?? "UNKNOWN",
      });
    }
    return accounts;
  } catch {
    // Unavailable is distinct from an authoritative empty list. Provider errors
    // may contain credential material and must never cross this owner facade.
    return undefined;
  }
}
