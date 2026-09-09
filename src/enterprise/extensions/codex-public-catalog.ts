import { z } from "zod";
import { readResponseWithLimit } from "../../infra/http-body.js";
import type { EnterpriseCodexPluginInterface } from "./codex-plugin-types.js";

const PUBLIC_BASE = "https://raw.githubusercontent.com/openai/plugins/main/";
const CACHE_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 12_000;
const CONCURRENCY = 8;
const marketplaceSchema = z.object({ plugins: z.array(z.unknown()).max(128) });
const entrySchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  source: z.object({ source: z.literal("local"), path: z.string() }),
  policy: z.object({ installation: z.literal("AVAILABLE") }),
  category: z.string().max(200).optional(),
});
const manifestSchema = z.object({
  name: z.string(),
  version: z.string().max(128).optional(),
  description: z.string().max(10_000).optional(),
  author: z
    .object({ name: z.string().max(256).optional(), url: z.string().max(2_048).optional() })
    .optional(),
  homepage: z.string().max(2_048).optional(),
  repository: z.string().max(2_048).optional(),
  interface: z
    .object({
      displayName: z.string().min(1).max(200).optional(),
      shortDescription: z.string().max(10_000).optional(),
      longDescription: z.string().max(10_000).optional(),
      developerName: z.string().max(256).optional(),
      category: z.string().max(256).optional(),
      capabilities: z.array(z.string().max(256)).max(64).optional(),
      websiteURL: z.string().max(2_048).optional(),
      privacyPolicyURL: z.string().max(2_048).optional(),
      termsOfServiceURL: z.string().max(2_048).optional(),
      defaultPrompt: z
        .union([z.string().max(4_096), z.array(z.string().max(4_096)).max(3)])
        .optional(),
      brandColor: z.string().max(128).optional(),
      composerIcon: z.string().max(2_048).optional(),
      logo: z.string().max(2_048).optional(),
      logoDark: z.string().max(2_048).optional(),
      screenshots: z.array(z.string().max(2_048)).max(32).optional(),
    })
    .optional(),
});

export type CodexPublicCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  version?: string;
  publisher?: string;
  homepage?: string;
  repository?: string;
  interface?: EnterpriseCodexPluginInterface;
};
export type CodexPublicCatalogResult = {
  items: CodexPublicCatalogItem[];
  status: "available" | "unavailable";
};

let cached: { items: CodexPublicCatalogItem[]; expiresAt: number } | undefined;
let pending: Promise<CodexPublicCatalogItem[]> | undefined;

function safeHttpUrl(value: string | undefined): string | null {
  if (!value?.trim() || value.length > 2_048) {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function publicInterfaceFromManifest(
  value: z.infer<typeof manifestSchema>["interface"],
): EnterpriseCodexPluginInterface | undefined {
  if (!value) {
    return undefined;
  }
  const defaultPrompts =
    typeof value.defaultPrompt === "string" ? [value.defaultPrompt] : (value.defaultPrompt ?? []);
  const hasRichMetadata = Object.keys(value).some(
    (key) => key !== "displayName" && key !== "shortDescription",
  );
  if (!hasRichMetadata) {
    return undefined;
  }
  return {
    displayName: value.displayName?.trim() || null,
    shortDescription: value.shortDescription?.trim() || null,
    longDescription: value.longDescription?.trim() || null,
    developerName: value.developerName?.trim() || null,
    category: value.category?.trim() || null,
    capabilities: (value.capabilities ?? []).map((entry) => entry.trim()).filter(Boolean),
    websiteUrl: safeHttpUrl(value.websiteURL),
    privacyPolicyUrl: safeHttpUrl(value.privacyPolicyURL),
    termsOfServiceUrl: safeHttpUrl(value.termsOfServiceURL),
    defaultPrompts: defaultPrompts.map((entry) => entry.trim()).filter(Boolean),
    brandColor: value.brandColor?.trim() || null,
    // Manifest assets are package-relative paths. They become local paths in
    // Codex after installation, so do not manufacture public URLs here.
    composerIconUrl: null,
    logoUrl: null,
    logoDarkUrl: null,
    screenshotUrls: [],
  };
}

async function fetchPublicJson(relativePath: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${PUBLIC_BASE}${relativePath}`, {
    signal,
    redirect: "error",
    credentials: "omit",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Public catalog unavailable");
  }
  const bytes = await readResponseWithLimit(response, 256 * 1024, { timeoutMs: FETCH_TIMEOUT_MS });
  return JSON.parse(bytes.toString("utf8"));
}

async function loadPublicCatalog(): Promise<CodexPublicCatalogItem[]> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const marketplace = marketplaceSchema.parse(
    await fetchPublicJson(".agents/plugins/marketplace.json", signal),
  );
  const entries = marketplace.plugins.flatMap((value) => {
    const parsed = entrySchema.safeParse(value);
    // Only the public repository's declared plugin directories may be fetched.
    return parsed.success && parsed.data.source.path === `./plugins/${parsed.data.name}`
      ? [parsed.data]
      : [];
  });
  const items: CodexPublicCatalogItem[] = [];
  for (let offset = 0; offset < entries.length; offset += CONCURRENCY) {
    const batch = await Promise.all(
      entries.slice(offset, offset + CONCURRENCY).map(async (entry) => {
        const manifest = manifestSchema.parse(
          await fetchPublicJson(`plugins/${entry.name}/.codex-plugin/plugin.json`, signal),
        );
        if (manifest.name !== entry.name) {
          throw new Error("Public catalog identity mismatch");
        }
        const homepage = safeHttpUrl(manifest.homepage);
        const repository = safeHttpUrl(manifest.repository);
        const interfaceMetadata = publicInterfaceFromManifest(manifest.interface);
        return {
          id: entry.name,
          name: manifest.interface?.displayName ?? manifest.name,
          description: manifest.interface?.shortDescription ?? manifest.description ?? "",
          category: entry.category ?? "",
          ...(manifest.version ? { version: manifest.version } : {}),
          ...(manifest.author?.name ? { publisher: manifest.author.name } : {}),
          ...(homepage ? { homepage } : {}),
          ...(repository ? { repository } : {}),
          ...(interfaceMetadata ? { interface: interfaceMetadata } : {}),
        };
      }),
    );
    items.push(...batch);
  }
  return items;
}

/** Public metadata only: never reads a Codex session, credentials, or installed state. */
export async function listCodexPublicCatalog(query = ""): Promise<CodexPublicCatalogResult> {
  try {
    if (!cached || cached.expiresAt <= Date.now()) {
      pending ??= loadPublicCatalog()
        .then((items) => {
          cached = { items, expiresAt: Date.now() + CACHE_TTL_MS };
          return items;
        })
        .finally(() => {
          pending = undefined;
        });
      await pending;
    }
    const filter = query.trim().toLowerCase();
    const items = cached?.items ?? [];
    return {
      status: "available",
      items: items.filter((item) =>
        [item.id, item.name, item.description, item.category].some((value) =>
          value.toLowerCase().includes(filter),
        ),
      ),
    };
  } catch {
    return { status: "unavailable", items: [] };
  }
}
