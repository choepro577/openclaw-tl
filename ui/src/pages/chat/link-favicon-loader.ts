import { inferControlUiPublicAssetPath } from "../../app/public-assets.ts";
import { fetchLinkFaviconBlobUrl } from "../plugins/icon-loader.ts";

const LINK_FAVICON_BROWSER_TIMEOUT_MS = 15_000;

export type LinkFaviconFetcher = (hostname: string, signal: AbortSignal) => Promise<string | null>;

export function createLinkFaviconFetcher(params: {
  auth: Parameters<typeof fetchLinkFaviconBlobUrl>[0]["auth"];
  resourceBasePath: string;
  gatewayUrl: string;
}): LinkFaviconFetcher {
  return (hostname, signal) => fetchLinkFaviconBlobUrl({ ...params, hostname, signal });
}

export function hydrateLinkFavicons(root: ParentNode, fetchFavicon?: LinkFaviconFetcher): void {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    "img.markdown-link-favicon[data-link-favicon-host]",
  )) {
    if (image.dataset.linkFaviconState) {
      continue;
    }
    const hostname = image.dataset.linkFaviconHost?.trim();
    if (!hostname) {
      image.dataset.linkFaviconState = "failed";
      continue;
    }

    // Never request a source-controlled OpenClaw favicon. The link destination
    // is deliberately left untouched, but its presentation icon always uses
    // the local MAAP mark so the old brand cannot flash during hydration.
    if (/openclaw/i.test(hostname)) {
      image.src = inferControlUiPublicAssetPath("favicon.svg");
      image.classList.add("is-loaded");
      image.dataset.linkFaviconState = "loaded";
      continue;
    }
    if (!fetchFavicon) {
      continue;
    }
    image.dataset.linkFaviconState = "loading";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LINK_FAVICON_BROWSER_TIMEOUT_MS);
    void fetchFavicon(hostname, controller.signal)
      .then((blobUrl) => {
        if (!blobUrl) {
          image.dataset.linkFaviconState = "failed";
          return;
        }
        if (!image.isConnected) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        const release = () => URL.revokeObjectURL(blobUrl);
        image.addEventListener(
          "load",
          () => {
            if (image.naturalWidth > 0) {
              image.classList.add("is-loaded");
              image.dataset.linkFaviconState = "loaded";
            }
            release();
          },
          { once: true },
        );
        image.addEventListener(
          "error",
          () => {
            image.dataset.linkFaviconState = "failed";
            release();
          },
          { once: true },
        );
        image.src = blobUrl;
      })
      .catch(() => {
        image.dataset.linkFaviconState = "failed";
      })
      .finally(() => window.clearTimeout(timeout));
  }
}
