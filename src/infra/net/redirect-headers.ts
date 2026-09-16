// Redirect header helpers retain only cross-origin-safe request headers.
import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { normalizeHeadersInitForFetch } from "../fetch-headers.js";

const CROSS_ORIGIN_REDIRECT_SAFE_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-language",
  "content-type",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "pragma",
  "range",
  "user-agent",
]);

/** Removes body-specific headers when redirect handling changes a request to GET. */
export function dropBodyHeaders(headers?: HeadersInit): HeadersInit | undefined {
  if (!headers) {
    return headers;
  }
  const nextHeaders = new Headers(normalizeHeadersInitForFetch(headers));
  nextHeaders.delete("content-encoding");
  nextHeaders.delete("content-language");
  nextHeaders.delete("content-length");
  nextHeaders.delete("content-location");
  nextHeaders.delete("content-type");
  nextHeaders.delete("transfer-encoding");
  return nextHeaders;
}

/**
 * Keeps only headers that are safe to replay after a redirect crosses origins.
 * Authorization/cookie-like metadata must be dropped before the follow-up fetch.
 */
export function retainSafeHeadersForCrossOriginRedirect(
  headers?: HeadersInit | Record<string, string>,
): Record<string, string> | undefined {
  if (!headers) {
    return headers;
  }
  const incoming = new Headers(normalizeHeadersInitForFetch(headers));
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of incoming.entries()) {
    // Normalize lookup only; preserve the outgoing casing produced by Headers.
    if (CROSS_ORIGIN_REDIRECT_SAFE_HEADERS.has(normalizeLowercaseStringOrEmpty(key))) {
      safeHeaders[key] = value;
    }
  }
  return safeHeaders;
}
