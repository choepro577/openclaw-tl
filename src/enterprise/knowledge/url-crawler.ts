import { DOMParser } from "linkedom";
import { MediaFetchError, readRemoteMediaBuffer } from "../../media/fetch.js";
import {
  KNOWLEDGE_URL_MAX_DEPTH,
  KNOWLEDGE_URL_MAX_PAGES,
  KNOWLEDGE_URL_MAX_PAGE_BYTES,
  KNOWLEDGE_URL_MAX_REDIRECTS,
  KNOWLEDGE_URL_MAX_TOTAL_BYTES,
} from "./knowledge-limits.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";

export type CrawledKnowledgeUrlPage = {
  url: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
};

export type KnowledgeRobotsRule = { allow: boolean; path: string };

function canonicalHttpUrl(raw: string, base?: string): URL | undefined {
  try {
    const url = new URL(raw, base);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return undefined;
    }
    url.hash = "";
    return url;
  } catch {
    return undefined;
  }
}

function parseRobots(text: string): KnowledgeRobotsRule[] {
  const rules: KnowledgeRobotsRule[] = [];
  let applies = false;
  for (const rawLine of text.split(/\r?\n/gu)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      applies = value === "*" || value.toLowerCase() === "openclaw-knowledge";
    } else if (applies && (field === "allow" || field === "disallow") && value) {
      rules.push({ allow: field === "allow", path: value });
    }
  }
  return rules;
}

function robotsAllows(url: URL, rules: KnowledgeRobotsRule[]): boolean {
  const target = `${url.pathname}${url.search}`;
  const matching = rules
    .filter((rule) => target.startsWith(rule.path))
    .toSorted((left, right) => right.path.length - left.path.length);
  return matching[0]?.allow ?? true;
}

async function loadRobots(origin: string): Promise<KnowledgeRobotsRule[]> {
  try {
    const result = await readRemoteMediaBuffer({
      url: new URL("/robots.txt", origin).toString(),
      maxBytes: 512 * 1024,
      maxRedirects: KNOWLEDGE_URL_MAX_REDIRECTS,
      timeoutMs: 15_000,
      readIdleTimeoutMs: 5_000,
      requestInit: { headers: { "user-agent": "OpenClaw-Knowledge/1.0" } },
      retry: { attempts: 1 },
    });
    return parseRobots(result.buffer.toString("utf8"));
  } catch (error) {
    if (error instanceof MediaFetchError && (error.status === 401 || error.status === 403)) {
      return [{ allow: false, path: "/" }];
    }
    return [];
  }
}

function pageLinks(page: CrawledKnowledgeUrlPage): string[] {
  if (!page.contentType.includes("html")) {
    return [];
  }
  const document = new DOMParser().parseFromString(page.buffer.toString("utf8"), "text/html");
  return [...document.querySelectorAll("a[href]")]
    .map((anchor) => canonicalHttpUrl(anchor.getAttribute("href") ?? "", page.url)?.toString())
    .filter((value): value is string => Boolean(value));
}

async function fetchPage(url: URL): Promise<CrawledKnowledgeUrlPage> {
  const fetched = await readRemoteMediaBuffer({
    url: url.toString(),
    maxBytes: KNOWLEDGE_URL_MAX_PAGE_BYTES,
    maxRedirects: KNOWLEDGE_URL_MAX_REDIRECTS,
    timeoutMs: 30_000,
    readIdleTimeoutMs: 10_000,
    requestInit: {
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        "user-agent": "OpenClaw-Knowledge/1.0",
      },
      credentials: "omit",
    },
    retry: { attempts: 1 },
  });
  return {
    url: fetched.finalUrl ?? url.toString(),
    buffer: fetched.buffer,
    contentType: fetched.contentType ?? "application/octet-stream",
    fileName: fetched.fileName,
  };
}

export async function crawlKnowledgeUrl(
  params: {
    url: string;
    sameOrigin: boolean;
  },
  dependencies: {
    fetchPage?: (url: URL) => Promise<CrawledKnowledgeUrlPage>;
    loadRobots?: (origin: string) => Promise<KnowledgeRobotsRule[]>;
  } = {},
): Promise<CrawledKnowledgeUrlPage[]> {
  const fetchPageForCrawl = dependencies.fetchPage ?? fetchPage;
  const loadRobotsForCrawl = dependencies.loadRobots ?? loadRobots;
  const initial = canonicalHttpUrl(params.url);
  if (!initial) {
    throw new EnterpriseKnowledgeError("URL_INVALID", 422, "URL is invalid.");
  }
  const rules = await loadRobotsForCrawl(initial.origin);
  if (!robotsAllows(initial, rules)) {
    throw new EnterpriseKnowledgeError("ROBOTS_DENIED", 422, "robots.txt denies this URL.");
  }
  const pages: CrawledKnowledgeUrlPage[] = [];
  const queued: Array<{ url: URL; depth: number }> = [{ url: initial, depth: 0 }];
  const seen = new Set<string>([initial.toString()]);
  let totalBytes = 0;

  while (queued.length > 0 && pages.length < (params.sameOrigin ? KNOWLEDGE_URL_MAX_PAGES : 1)) {
    const batch = queued.splice(0, params.sameOrigin ? 4 : 1);
    const settled = await Promise.allSettled(batch.map((item) => fetchPageForCrawl(item.url)));
    for (let index = 0; index < settled.length; index += 1) {
      const result = settled[index]!;
      const item = batch[index]!;
      if (result.status === "rejected") {
        if (item.depth === 0) {
          throw result.reason;
        }
        continue;
      }
      const page = result.value;
      const final = canonicalHttpUrl(page.url);
      if (final && final.origin !== initial.origin) {
        const finalRules = await loadRobotsForCrawl(final.origin);
        if (!robotsAllows(final, finalRules)) {
          if (item.depth === 0) {
            throw new EnterpriseKnowledgeError(
              "ROBOTS_DENIED",
              422,
              "robots.txt denies the redirected URL.",
            );
          }
          continue;
        }
      }
      totalBytes += page.buffer.byteLength;
      if (totalBytes > KNOWLEDGE_URL_MAX_TOTAL_BYTES) {
        throw new EnterpriseKnowledgeError(
          "URL_CRAWL_TOO_LARGE",
          413,
          "URL crawl exceeds the 50 MiB limit.",
        );
      }
      pages.push(page);
      if (!params.sameOrigin || item.depth >= KNOWLEDGE_URL_MAX_DEPTH) {
        continue;
      }
      for (const rawLink of pageLinks(page)) {
        const link = canonicalHttpUrl(rawLink);
        if (
          !link ||
          link.origin !== initial.origin ||
          seen.has(link.toString()) ||
          !robotsAllows(link, rules) ||
          seen.size >= KNOWLEDGE_URL_MAX_PAGES * 4
        ) {
          continue;
        }
        seen.add(link.toString());
        queued.push({ url: link, depth: item.depth + 1 });
      }
    }
  }
  return pages.slice(0, KNOWLEDGE_URL_MAX_PAGES);
}
