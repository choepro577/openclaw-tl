import { normalizeRouteBasePath } from "@openclaw/uirouter";

export function buildAssistantMediaUrl(
  source: string,
  resourceBasePath = "",
  mediaTicket?: string | null,
  sessionKey?: string | null,
): string {
  const params = new URLSearchParams({ source });
  const normalizedSessionKey = sessionKey?.trim();
  if (normalizedSessionKey) {
    params.set("sessionKey", normalizedSessionKey);
  }
  const normalizedMediaTicket = mediaTicket?.trim();
  if (normalizedMediaTicket) {
    params.set("mediaTicket", normalizedMediaTicket);
  }
  return `${normalizeRouteBasePath(resourceBasePath)}/__openclaw__/assistant-media?${params.toString()}`;
}
