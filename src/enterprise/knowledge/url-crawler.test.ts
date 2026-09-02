import { describe, expect, it, vi } from "vitest";
import { crawlKnowledgeUrl, type CrawledKnowledgeUrlPage } from "./url-crawler.js";

function htmlPage(url: URL, links: string[] = []): CrawledKnowledgeUrlPage {
  return {
    url: url.toString(),
    contentType: "text/html",
    buffer: Buffer.from(links.map((link) => `<a href="${link}">link</a>`).join("")),
  };
}

describe("enterprise knowledge URL crawler", () => {
  it("rejects invalid and robots-denied roots before fetching content", async () => {
    await expect(
      crawlKnowledgeUrl({ url: "file:///etc/passwd", sameOrigin: false }),
    ).rejects.toMatchObject({
      code: "URL_INVALID",
    });
    const fetchPage = vi.fn();
    await expect(
      crawlKnowledgeUrl(
        { url: "https://example.com/private", sameOrigin: false },
        { fetchPage, loadRobots: async () => [{ allow: false, path: "/private" }] },
      ),
    ).rejects.toMatchObject({ code: "ROBOTS_DENIED" });
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("crawls only same-origin links through depth two and deduplicates fragments", async () => {
    const fetched: string[] = [];
    const fetchPage = vi.fn(async (url: URL) => {
      fetched.push(url.toString());
      if (url.pathname === "/") {
        return htmlPage(url, ["/one", "/one#again", "https://other.example/escape"]);
      }
      if (url.pathname === "/one") {
        return htmlPage(url, ["/two"]);
      }
      if (url.pathname === "/two") {
        return htmlPage(url, ["/three"]);
      }
      return htmlPage(url);
    });
    const pages = await crawlKnowledgeUrl(
      { url: "https://example.com/", sameOrigin: true },
      { fetchPage, loadRobots: async () => [] },
    );
    expect(pages.map((page) => new URL(page.url).pathname)).toEqual(["/", "/one", "/two"]);
    expect(fetched).not.toContain("https://example.com/three");
    expect(fetched.some((url) => url.includes("other.example"))).toBe(false);
  });

  it("keeps exact-page mode to one fetch even when the page contains links", async () => {
    const fetchPage = vi.fn(async (url: URL) => htmlPage(url, ["/ignored"]));
    const pages = await crawlKnowledgeUrl(
      { url: "https://example.com/root", sameOrigin: false },
      { fetchPage, loadRobots: async () => [] },
    );
    expect(pages).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
