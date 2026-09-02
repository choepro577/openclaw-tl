import path from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";

export const KNOWLEDGE_GRAPH_NODE_KINDS = [
  "source",
  "section",
  "entity",
  "concept",
  "claim",
] as const;

export const KNOWLEDGE_GRAPH_EDGE_KINDS = [
  "contains",
  "references",
  "mentions",
  "similar",
  "supports",
  "contradicts",
  "supersedes",
  "depends_on",
  "applies_to",
  "custom",
] as const;

export const KNOWLEDGE_GRAPH_ORIGINS = ["deterministic", "semantic", "ai", "manual"] as const;
export const KNOWLEDGE_GRAPH_REVIEW_STATUSES = ["accepted", "proposed", "rejected"] as const;

export type KnowledgeGraphNodeKind = (typeof KNOWLEDGE_GRAPH_NODE_KINDS)[number];
export type KnowledgeGraphEdgeKind = (typeof KNOWLEDGE_GRAPH_EDGE_KINDS)[number];
export type KnowledgeGraphOrigin = (typeof KNOWLEDGE_GRAPH_ORIGINS)[number];
export type KnowledgeGraphReviewStatus = (typeof KNOWLEDGE_GRAPH_REVIEW_STATUSES)[number];

export type KnowledgeGraphLocator = Record<string, string | number | boolean | null>;

export type KnowledgeGraphNode = {
  id: string;
  kind: KnowledgeGraphNodeKind;
  canonicalKey: string;
  label: string;
  aliases: string[];
  sourceVersionId: string;
  segmentId: string;
  locator: KnowledgeGraphLocator;
  confidence: number;
  origin: KnowledgeGraphOrigin;
};

export type KnowledgeGraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: KnowledgeGraphEdgeKind;
  origin: KnowledgeGraphOrigin;
  reviewStatus: KnowledgeGraphReviewStatus;
  confidence: number;
  evidenceSegmentId: string;
  evidenceLocator: KnowledgeGraphLocator;
  fingerprint: string;
};

export type KnowledgeDocumentLink = {
  kind: "wikilink" | "markdown" | "hyperlink";
  rawTarget: string;
  target: string;
  alias?: string;
  heading?: string;
};

type MarkdownAstNode = {
  type?: string;
  position?: { start?: { offset?: number }; end?: { offset?: number } };
  children?: MarkdownAstNode[];
};

const OBSIDIAN_LINK_PATTERN = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function maskMarkdownCode(markdown: string): string {
  const masked = markdown.split("");
  const visit = (node: MarkdownAstNode): void => {
    if (node.type === "code" || node.type === "inlineCode") {
      const start = node.position?.start?.offset;
      const end = node.position?.end?.offset;
      if (start !== undefined && end !== undefined) {
        for (let index = start; index < end; index++) {
          if (masked[index] !== "\n" && masked[index] !== "\r") {
            masked[index] = " ";
          }
        }
      }
      return;
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(fromMarkdown(markdown) as MarkdownAstNode);
  return masked.join("");
}

function normalizeRelativeMarkdownTarget(sourceRelativePath: string, target: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceRelativePath), target));
}

export function normalizeKnowledgeCanonicalKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\.md$/i, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function normalizeKnowledgeAliases(values: Iterable<string>): string[] {
  const aliases = new Map<string, string>();
  for (const value of values) {
    const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }
    const key = normalizeKnowledgeCanonicalKey(normalized);
    if (!aliases.has(key)) {
      aliases.set(key, normalized);
    }
  }
  return [...aliases.values()].toSorted((left, right) => left.localeCompare(right));
}

export function extractKnowledgeDocumentLinks(params: {
  markdown: string;
  sourceRelativePath: string;
  stripPatterns?: RegExp[];
  includeExternal?: boolean;
}): KnowledgeDocumentLink[] {
  let source = params.markdown;
  for (const pattern of params.stripPatterns ?? []) {
    source = source.replace(pattern, "");
  }
  const searchable = maskMarkdownCode(source);
  const links: KnowledgeDocumentLink[] = [];
  for (const match of searchable.matchAll(OBSIDIAN_LINK_PATTERN)) {
    const rawTarget = match[1]?.trim();
    if (!rawTarget) {
      continue;
    }
    links.push({
      kind: "wikilink",
      rawTarget,
      target: rawTarget.replace(/\\/g, "/"),
      ...(match[2]?.trim() ? { heading: match[2].trim() } : {}),
      ...(match[3]?.trim() ? { alias: match[3].trim() } : {}),
    });
  }
  for (const match of searchable.matchAll(MARKDOWN_LINK_PATTERN)) {
    const label = match[1]?.trim();
    const rawTarget = match[2]?.trim();
    if (!rawTarget || rawTarget.startsWith("#")) {
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) {
      if (params.includeExternal && /^https?:/i.test(rawTarget)) {
        links.push({
          kind: "hyperlink",
          rawTarget,
          target: rawTarget,
          ...(label ? { alias: label } : {}),
        });
      }
      continue;
    }
    const decodedTarget = rawTarget.split("?")[0]?.replace(/\\/g, "/").trim();
    if (!decodedTarget) {
      continue;
    }
    const [pathTarget, heading] = decodedTarget.split("#", 2);
    if (!pathTarget) {
      continue;
    }
    links.push({
      kind: "markdown",
      rawTarget,
      target: normalizeRelativeMarkdownTarget(params.sourceRelativePath, pathTarget),
      ...(label ? { alias: label } : {}),
      ...(heading ? { heading } : {}),
    });
  }
  return links;
}

export function deriveKnowledgeBacklinks<T extends { id: string; linkTargets: string[] }>(
  pages: T[],
): Map<string, string[]> {
  const byCanonical = new Map<string, string>();
  for (const page of pages) {
    byCanonical.set(normalizeKnowledgeCanonicalKey(page.id), page.id);
  }
  const backlinks = new Map<string, Set<string>>();
  for (const page of pages) {
    for (const target of page.linkTargets) {
      const resolved = byCanonical.get(normalizeKnowledgeCanonicalKey(target));
      if (!resolved || resolved === page.id) {
        continue;
      }
      const sources = backlinks.get(resolved) ?? new Set<string>();
      sources.add(page.id);
      backlinks.set(resolved, sources);
    }
  }
  return new Map(
    [...backlinks.entries()].map(([key, values]) => [key, [...values].toSorted()] as const),
  );
}

export function renderKnowledgeWikiLink(params: {
  renderMode: "native" | "obsidian";
  relativePath: string;
  sourceRelativeTo?: string;
  title: string;
}): string {
  const withoutExtension = params.relativePath.replace(/\.md$/i, "");
  if (params.renderMode === "obsidian") {
    return `[[${withoutExtension}|${params.title}]]`;
  }
  const linkTarget = params.sourceRelativeTo
    ? path.posix.relative(path.posix.dirname(params.sourceRelativeTo), params.relativePath)
    : params.relativePath;
  return `[${params.title}](${linkTarget})`;
}
