import { createHash } from "node:crypto";
import {
  extractKnowledgeDocumentLinks,
  normalizeKnowledgeAliases,
  type KnowledgeDocumentLink,
} from "@openclaw/knowledge-graph-core";
import { detectMime } from "@openclaw/media-core/mime";
import { DOMParser } from "linkedom";
import { extractBasicHtmlContent } from "../../agents/tools/web-fetch-utils.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { extractDocumentContent } from "../../media/document-extractors.runtime.js";
import type { DocumentTextSegment } from "../../plugins/document-extractor-types.js";
import type {
  KnowledgeGraphArtifactHeading,
  KnowledgeGraphArtifactLink,
  KnowledgeLocator,
  KnowledgeSegment,
  KnowledgeStructuralBlock,
  KnowledgeStructuralReference,
  NormalizedKnowledgeArtifact,
} from "./knowledge-types.js";
import { EnterpriseKnowledgeError } from "./knowledge-types.js";
import { resolveEnterpriseKnowledgeOcrProvider } from "./ocr-provider.js";

const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/html",
  "application/xhtml+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
]);

const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/tiff"]);
const CHUNK_TARGET_CHARS = 2_400;
const CHUNK_OVERLAP_CHARS = 240;

function segmentForSignal(
  segments: KnowledgeSegment[],
  needle?: string,
): KnowledgeSegment | undefined {
  const normalized = needle?.normalize("NFC").trim().toLocaleLowerCase();
  return (
    (normalized
      ? segments.find((segment) => segment.normalizedText.toLocaleLowerCase().includes(normalized))
      : undefined) ?? segments[0]
  );
}

function createArtifactGraphSignals(params: {
  title: string;
  segments: KnowledgeSegment[];
  headings: Array<{ text: string; level: number }>;
  links: KnowledgeDocumentLink[];
}): {
  aliases: string[];
  headings: KnowledgeGraphArtifactHeading[];
  links: KnowledgeGraphArtifactLink[];
} {
  const headings = params.headings.flatMap((heading) => {
    const segment = segmentForSignal(params.segments, heading.text);
    return segment ? [{ ...heading, segmentId: segment.id, locator: segment.locator }] : [];
  });
  const links = params.links.flatMap((link) => {
    const segment = segmentForSignal(params.segments, link.alias ?? link.rawTarget);
    return segment ? [{ ...link, segmentId: segment.id, locator: segment.locator }] : [];
  });
  return {
    aliases: normalizeKnowledgeAliases([params.title]),
    headings,
    links,
  };
}

function normalizeSearchText(value: string): string {
  const withoutUnsafeControls = [...value]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (code >= 0 && code <= 8) ||
        code === 11 ||
        code === 12 ||
        (code >= 14 && code <= 31) ||
        code === 127
        ? " "
        : character;
    })
    .join("");
  return withoutUnsafeControls
    .normalize("NFC")
    .replace(/[\t ]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function locatorFromDocumentSegment(segment: DocumentTextSegment): KnowledgeLocator {
  const locator = segment.locator;
  if (locator.sheet) {
    return { kind: "sheet", sheet: locator.sheet, range: locator.range ?? "unknown" };
  }
  if (locator.slide) {
    return { kind: "slide", slide: locator.slide, shape: locator.shape };
  }
  if (locator.page) {
    return { kind: "page", page: locator.page, section: locator.section };
  }
  return {
    kind: "docx",
    section: locator.section,
    paragraph: locator.paragraph,
    table: locator.table,
    cell: locator.cell,
  };
}

function splitWithLocator(
  text: string,
  locator: KnowledgeLocator,
  startOrdinal: number,
): KnowledgeSegment[] {
  const original = text.normalize("NFC").trim();
  if (!original) {
    return [];
  }
  const segments: KnowledgeSegment[] = [];
  let offset = 0;
  while (offset < original.length) {
    let end = Math.min(original.length, offset + CHUNK_TARGET_CHARS);
    if (end < original.length) {
      const paragraph = original.lastIndexOf("\n", end);
      const sentence = original.lastIndexOf(". ", end);
      const boundary = Math.max(paragraph, sentence);
      if (boundary > offset + CHUNK_TARGET_CHARS / 2) {
        end = boundary + 1;
      }
    }
    const chunk = original.slice(offset, end).trim();
    if (chunk) {
      const ordinal = startOrdinal + segments.length;
      segments.push({
        id: createHash("sha256")
          .update(`${ordinal}\0${JSON.stringify(locator)}\0${chunk}`)
          .digest("hex")
          .slice(0, 32),
        text: chunk,
        normalizedText: normalizeSearchText(chunk),
        locator,
        ordinal,
      });
    }
    if (end >= original.length) {
      break;
    }
    offset = Math.max(offset + 1, end - CHUNK_OVERLAP_CHARS);
  }
  return segments;
}

function chunkDocumentSegments(segments: DocumentTextSegment[]): {
  segments: KnowledgeSegment[];
  blocks: KnowledgeStructuralBlock[];
  links: KnowledgeGraphArtifactLink[];
  references: KnowledgeStructuralReference[];
} {
  const chunks: KnowledgeSegment[] = [];
  const blocks: KnowledgeStructuralBlock[] = [];
  const links: KnowledgeGraphArtifactLink[] = [];
  const references: KnowledgeStructuralReference[] = [];
  for (const [documentOrdinal, segment] of segments.entries()) {
    const locator = locatorFromDocumentSegment(segment);
    const blockChunks = splitWithLocator(segment.text, locator, chunks.length);
    chunks.push(...blockChunks);
    const structure = segment.structure;
    const blockId = structure?.blockId ?? `document:block:${documentOrdinal + 1}`;
    const locatorSection =
      "section" in locator && typeof locator.section === "string" ? locator.section : undefined;
    blocks.push({
      blockId,
      kind: structure?.kind ?? "paragraph",
      ...(structure?.semanticKind ? { semanticKind: structure.semanticKind } : {}),
      text: normalizeSearchText(segment.text),
      ...(structure?.parentBlockId ? { parentBlockId: structure.parentBlockId } : {}),
      segmentIds: blockChunks.map((chunk) => chunk.id),
      ...(structure?.headingLevel ? { headingLevel: structure.headingLevel } : {}),
      headingPath: structure?.headingPath ?? (locatorSection ? [locatorSection] : []),
      ordinal: structure?.ordinal ?? documentOrdinal,
      ...(structure?.listLevel !== undefined ? { listLevel: structure.listLevel } : {}),
      ...(structure?.numberingLabel ? { numberingLabel: structure.numberingLabel } : {}),
      ...(locator.kind === "page" ? { page: locator.page } : {}),
      ...(locator.kind === "docx" && locator.paragraph ? { paragraph: locator.paragraph } : {}),
      ...(locator.kind === "docx" && locator.table ? { table: locator.table } : {}),
      ...(structure?.row !== undefined ? { row: structure.row } : {}),
      ...(structure?.column !== undefined ? { column: structure.column } : {}),
      ...(locator.kind === "sheet" ? { sheet: locator.sheet } : {}),
      ...(locator.kind === "slide" ? { slide: locator.slide } : {}),
      isToc: structure?.isToc ?? false,
      isHeaderFooter: structure?.isHeaderFooter ?? false,
      ...(structure?.language ? { language: structure.language } : {}),
      locator,
    });
    for (const link of segment.links ?? []) {
      const firstSegment = blockChunks[0];
      if (!firstSegment) {
        continue;
      }
      if (link.kind === "hyperlink") {
        links.push({
          kind: "hyperlink",
          rawTarget: link.target,
          target: link.target,
          ...(link.alias ? { alias: link.alias } : {}),
          segmentId: firstSegment.id,
          locator,
        });
      } else {
        references.push({
          referenceId: referenceId(blockId, link.target, references.length),
          sourceBlockId: blockId,
          rawText: link.alias ?? link.target,
          candidateTargetBlockIds: [],
          kind: "bookmark",
          target: link.target,
          resolved: false,
          confidence: 1,
          locator,
        });
      }
    }
  }
  return { segments: chunks, blocks, links, references };
}

function fallbackStructuralBlocks(params: {
  segments: KnowledgeSegment[];
  headings: KnowledgeGraphArtifactHeading[];
}): KnowledgeStructuralBlock[] {
  const headingBySegment = new Map(params.headings.map((heading) => [heading.segmentId, heading]));
  let activeHeadingId: string | undefined;
  return params.segments.map((segment, ordinal) => {
    const heading = headingBySegment.get(segment.id);
    const blockId = `text:block:${segment.id}`;
    const parentBlockId = heading ? undefined : activeHeadingId;
    if (heading) {
      activeHeadingId = blockId;
    }
    return {
      blockId,
      kind: heading ? "heading" : "paragraph",
      semanticKind: heading ? "section" : "content",
      text: segment.normalizedText,
      ...(parentBlockId ? { parentBlockId } : {}),
      segmentIds: [segment.id],
      ...(heading ? { headingLevel: heading.level } : {}),
      headingPath: heading ? [heading.text] : [],
      ordinal,
      isToc: false,
      isHeaderFooter: false,
      locator: segment.locator,
    };
  });
}

function referenceId(sourceBlockId: string, rawText: string, ordinal: number): string {
  return createHash("sha256")
    .update(`${sourceBlockId}\0${ordinal}\0${rawText}`)
    .digest("hex")
    .slice(0, 32);
}

function resolveStructuralReferences(params: {
  blocks: KnowledgeStructuralBlock[];
  links: KnowledgeGraphArtifactLink[];
}): KnowledgeStructuralReference[] {
  const references: KnowledgeStructuralReference[] = [];
  const articleByNumber = new Map<string, KnowledgeStructuralBlock[]>();
  const clausesByArticleAndNumber = new Map<string, KnowledgeStructuralBlock[]>();
  const blockBySegment = new Map<string, KnowledgeStructuralBlock>();
  const articleAncestor = (
    block: KnowledgeStructuralBlock,
  ): KnowledgeStructuralBlock | undefined => {
    let current: KnowledgeStructuralBlock | undefined = block;
    const byId = new Map(params.blocks.map((item) => [item.blockId, item]));
    while (current) {
      if (current.semanticKind === "article") {
        return current;
      }
      current = current.parentBlockId ? byId.get(current.parentBlockId) : undefined;
    }
    return undefined;
  };
  for (const block of params.blocks) {
    for (const segmentId of block.segmentIds) {
      blockBySegment.set(segmentId, block);
    }
    const article = block.text.match(/^(?:Điều)\s+(\d+[A-Za-z]?)/iu);
    if (block.semanticKind === "article" && article?.[1]) {
      const key = article[1].toLocaleLowerCase();
      articleByNumber.set(key, [...(articleByNumber.get(key) ?? []), block]);
    }
  }
  for (const block of params.blocks) {
    if (block.semanticKind !== "clause") {
      continue;
    }
    const article = articleAncestor(block);
    const articleNumber = article?.text.match(/^(?:Điều)\s+(\d+[A-Za-z]?)/iu)?.[1];
    const clauseNumber =
      block.numberingLabel?.match(/\d+/u)?.[0] ?? block.text.match(/^(\d+)[.)]/u)?.[1];
    if (articleNumber && clauseNumber) {
      const key = `${articleNumber.toLocaleLowerCase()}:${clauseNumber}`;
      clausesByArticleAndNumber.set(key, [...(clausesByArticleAndNumber.get(key) ?? []), block]);
    }
  }
  for (const block of params.blocks) {
    if (block.isToc || block.isHeaderFooter) {
      continue;
    }
    const pattern = /(?:Khoản\s+(\d+)\s+(?:của\s+)?Điều\s+(\d+[A-Za-z]?)|Điều\s+(\d+[A-Za-z]?))/giu;
    let match: RegExpExecArray | null;
    let ordinal = 0;
    while ((match = pattern.exec(block.text))) {
      const articleNumber = (match[2] ?? match[3])?.toLocaleLowerCase();
      const candidates = match[1]
        ? (clausesByArticleAndNumber.get(`${articleNumber}:${match[1]}`) ?? [])
        : (articleByNumber.get(articleNumber ?? "") ?? []);
      const targets = candidates.filter((candidate) => candidate.blockId !== block.blockId);
      references.push({
        referenceId: referenceId(block.blockId, match[0], ordinal++),
        sourceBlockId: block.blockId,
        rawText: match[0],
        ...(targets.length === 1 ? { targetBlockId: targets[0]!.blockId } : {}),
        candidateTargetBlockIds: targets.map((candidate) => candidate.blockId),
        kind: match[1] ? "clause" : "article",
        resolved: targets.length === 1,
        confidence: targets.length === 1 ? 1 : 0,
        locator: block.locator,
      });
    }
  }
  for (const [ordinal, link] of params.links.entries()) {
    const block = blockBySegment.get(link.segmentId);
    if (!block) {
      continue;
    }
    references.push({
      referenceId: referenceId(block.blockId, link.rawTarget, ordinal),
      sourceBlockId: block.blockId,
      rawText: link.alias ?? link.rawTarget,
      candidateTargetBlockIds: [],
      kind: link.kind === "wikilink" ? "wikilink" : "hyperlink",
      target: link.target,
      resolved: false,
      confidence: 1,
      locator: link.locator,
    });
  }
  return references;
}

async function validateMime(params: {
  buffer: Buffer;
  declaredMimeType: string;
  originalName?: string;
}): Promise<string> {
  const declared = params.declaredMimeType.split(";")[0]!.trim().toLowerCase();
  const detected = await detectMime({
    buffer: params.buffer.subarray(0, Math.min(params.buffer.length, 4 * 1024 * 1024)),
    headerMime: declared,
    filePath: params.originalName,
  });
  const mime = (detected ?? declared).toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(mime)) {
    throw new EnterpriseKnowledgeError("UNSUPPORTED_MIME", 415, "This file type is not supported.");
  }
  if (
    detected &&
    declared &&
    declared !== "application/octet-stream" &&
    detected !== declared &&
    !(declared === "text/plain" && detected.startsWith("text/"))
  ) {
    throw new EnterpriseKnowledgeError(
      "MIME_MISMATCH",
      415,
      "The file content does not match its declared type.",
    );
  }
  return mime;
}

async function ocrImages(params: {
  images: Array<{ data: string; mimeType: string; pageNumber?: number }>;
  externalAllowed: boolean;
  config?: OpenClawConfig;
  signal?: AbortSignal;
}): Promise<{ segments: KnowledgeSegment[]; provenance: Record<string, unknown> }> {
  const provider = await resolveEnterpriseKnowledgeOcrProvider({
    config: params.config,
    allowRemoteFallback: params.externalAllowed,
  });
  if (!provider || (provider.transport === "remote" && !params.externalAllowed)) {
    throw new EnterpriseKnowledgeError(
      "OCR_REQUIRED",
      422,
      "OCR is required but no permitted OCR provider is ready.",
    );
  }
  const segments: KnowledgeSegment[] = [];
  const confidences: number[] = [];
  for (const [index, image] of params.images.entries()) {
    const locator: KnowledgeLocator = { kind: "ocr", page: image.pageNumber ?? index + 1 };
    const result = await provider.recognize(
      { data: Buffer.from(image.data, "base64"), mimeType: image.mimeType, locator },
      { signal: params.signal },
    );
    if (typeof result.confidence === "number") {
      confidences.push(result.confidence);
    }
    if (result.blocks?.length) {
      for (const block of result.blocks) {
        segments.push(
          ...splitWithLocator(
            block.text,
            {
              kind: "ocr",
              page: image.pageNumber ?? index + 1,
              block: block.id,
              confidence: block.confidence,
            },
            segments.length,
          ),
        );
      }
    } else {
      segments.push(...splitWithLocator(result.text, locator, segments.length));
    }
  }
  if (!segments.length) {
    throw new EnterpriseKnowledgeError("OCR_EMPTY", 422, "OCR did not return usable text.");
  }
  return {
    segments,
    provenance: {
      provider: provider.id,
      pages: params.images.length,
      averageConfidence: confidences.length
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : undefined,
    },
  };
}

export async function extractAndNormalizeKnowledgeArtifact(params: {
  buffer: Buffer;
  declaredMimeType: string;
  originalName?: string;
  sourceId: string;
  sourceVersionId: string;
  sourceVersion: number;
  title: string;
  externalAllowed: boolean;
  config?: OpenClawConfig;
  signal?: AbortSignal;
}): Promise<NormalizedKnowledgeArtifact> {
  const mimeType = await validateMime({
    buffer: params.buffer,
    declaredMimeType: params.declaredMimeType,
    originalName: params.originalName,
  });
  let segments: KnowledgeSegment[] = [];
  let parserProvenance: Record<string, unknown> = { parser: "built-in", mimeType };
  let ocrProvenance: Record<string, unknown> | undefined;
  let graphHeadings: Array<{ text: string; level: number }> = [];
  let graphLinks: KnowledgeDocumentLink[] = [];
  let structuralBlocks: KnowledgeStructuralBlock[] = [];
  let nativeLinks: KnowledgeGraphArtifactLink[] = [];
  let nativeReferences: KnowledgeStructuralReference[] = [];

  if (TEXT_MIME_TYPES.has(mimeType)) {
    const rawText = params.buffer.toString("utf8");
    segments = splitWithLocator(rawText, { kind: "text" }, 0);
    if (mimeType === "text/markdown") {
      graphLinks = extractKnowledgeDocumentLinks({
        markdown: rawText,
        sourceRelativePath: params.originalName ?? `${params.sourceId}.md`,
        includeExternal: true,
      });
      graphHeadings = [...rawText.matchAll(/^(#{1,6})\s+(.+?)\s*#*$/gm)].flatMap((match) =>
        match[2]?.trim() ? [{ text: match[2].trim(), level: match[1]!.length }] : [],
      );
    }
  } else if (HTML_MIME_TYPES.has(mimeType)) {
    const document = new DOMParser().parseFromString(params.buffer.toString("utf8"), "text/html");
    graphHeadings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].flatMap((element) => {
      const text = element.textContent?.normalize("NFC").trim();
      const level = Number(element.tagName.slice(1));
      return text ? [{ text, level }] : [];
    });
    graphLinks = [...document.querySelectorAll("a[href]")].flatMap((element) => {
      const target = element.getAttribute("href")?.trim();
      if (!target || target.startsWith("#") || /^javascript:/i.test(target)) {
        return [];
      }
      const alias = element.textContent?.normalize("NFC").trim();
      return [
        {
          kind: /^https?:/i.test(target) ? ("hyperlink" as const) : ("markdown" as const),
          rawTarget: target,
          target,
          ...(alias ? { alias } : {}),
        },
      ];
    });
    for (const element of document.querySelectorAll(
      "script,style,noscript,form,template,iframe,object,embed,svg,canvas",
    )) {
      element.remove();
    }
    const extracted = await extractBasicHtmlContent({
      html: document.documentElement?.outerHTML ?? document.toString(),
      extractMode: "text",
    });
    segments = splitWithLocator(
      extracted?.text ?? "",
      { kind: "text", section: extracted?.title },
      0,
    );
    parserProvenance = { parser: "sanitized-html", activeContentRemoved: true };
  } else if (IMAGE_MIME_TYPES.has(mimeType)) {
    const ocr = await ocrImages({
      images: [{ data: params.buffer.toString("base64"), mimeType, pageNumber: 1 }],
      externalAllowed: params.externalAllowed,
      config: params.config,
      signal: params.signal,
    });
    segments = ocr.segments;
    ocrProvenance = ocr.provenance;
  } else {
    const extracted = await extractDocumentContent({
      buffer: params.buffer,
      mimeType,
      maxPages: 500,
      maxPixels: 40_000_000,
      minTextChars: 32,
      config: params.config,
    });
    if (!extracted) {
      throw new EnterpriseKnowledgeError(
        "EXTRACTOR_UNAVAILABLE",
        503,
        "No document extractor is ready for this file.",
      );
    }
    parserProvenance = extracted.parserProvenance ?? { extractor: extracted.extractor };
    if (extracted.segments?.length) {
      const chunked = chunkDocumentSegments(extracted.segments);
      segments = chunked.segments;
      structuralBlocks = chunked.blocks;
      nativeLinks = chunked.links;
      nativeReferences = chunked.references;
    } else {
      segments = splitWithLocator(
        extracted.text,
        {
          kind: mimeType === "application/pdf" ? "page" : "text",
          ...(mimeType === "application/pdf" ? { page: 1 } : {}),
          // SAFETY: page image extraction emits this exact locator union member.
        } as KnowledgeLocator,
        0,
      );
    }
    if (extracted.images.length > 0) {
      const ocr = await ocrImages({
        images: extracted.images,
        externalAllowed: params.externalAllowed,
        config: params.config,
        signal: params.signal,
      });
      segments.push(
        ...ocr.segments.map((segment, index) => ({ ...segment, ordinal: segments.length + index })),
      );
      ocrProvenance = ocr.provenance;
    }
    graphHeadings = normalizeKnowledgeAliases(
      segments.flatMap((segment) =>
        "section" in segment.locator && segment.locator.section ? [segment.locator.section] : [],
      ),
    ).map((text) => ({ text, level: 2 }));
  }
  if (!segments.length) {
    throw new EnterpriseKnowledgeError(
      "EXTRACTION_EMPTY",
      422,
      "No usable text could be extracted.",
    );
  }
  const baseSignals = createArtifactGraphSignals({
    title: params.title,
    segments,
    headings: graphHeadings,
    links: graphLinks,
  });
  const headings = baseSignals.headings;
  const links = [...baseSignals.links, ...nativeLinks];
  const blocks = structuralBlocks.length
    ? structuralBlocks
    : fallbackStructuralBlocks({ segments, headings });
  const references = [...resolveStructuralReferences({ blocks, links }), ...nativeReferences];
  const extractorIdentity = String(
    parserProvenance.extractor ?? parserProvenance.parser ?? "built-in",
  );
  const artifactWithoutChecksum = {
    schemaVersion: 3 as const,
    sourceId: params.sourceId,
    sourceVersionId: params.sourceVersionId,
    sourceVersion: params.sourceVersion,
    title: params.title,
    mimeType,
    createdAt: Date.now(),
    parserProvenance,
    ...(ocrProvenance ? { ocrProvenance } : {}),
    segments,
    extractorIdentity,
    graphSignals: {
      aliases: baseSignals.aliases,
      headings,
      links,
      blocks,
      references,
    },
  };
  return {
    ...artifactWithoutChecksum,
    artifactChecksum: createHash("sha256")
      .update(JSON.stringify(artifactWithoutChecksum))
      .digest("hex"),
  };
}

export async function extractAndNormalizeKnowledgeUrlPages(params: {
  pages: Array<{ url: string; buffer: Buffer; contentType: string; fileName?: string }>;
  sourceId: string;
  sourceVersionId: string;
  sourceVersion: number;
  title: string;
  externalAllowed: boolean;
  config?: OpenClawConfig;
}): Promise<NormalizedKnowledgeArtifact> {
  const segments: KnowledgeSegment[] = [];
  const headings: KnowledgeGraphArtifactHeading[] = [];
  const links: KnowledgeGraphArtifactLink[] = [];
  const blocks: KnowledgeStructuralBlock[] = [];
  const references: KnowledgeStructuralReference[] = [];
  const aliases = new Set<string>();
  for (const page of params.pages) {
    const pageArtifact = await extractAndNormalizeKnowledgeArtifact({
      buffer: page.buffer,
      declaredMimeType: page.contentType,
      originalName: page.fileName,
      sourceId: params.sourceId,
      sourceVersionId: params.sourceVersionId,
      sourceVersion: params.sourceVersion,
      title: params.title,
      externalAllowed: params.externalAllowed,
      config: params.config,
    });
    const remappedIds = new Map<string, string>();
    for (const segment of pageArtifact.segments) {
      const ordinal = segments.length;
      const remapped = {
        ...segment,
        id: createHash("sha256")
          .update(`${ordinal}\0${page.url}\0${segment.text}`)
          .digest("hex")
          .slice(0, 32),
        locator: { kind: "text", section: page.url },
        ordinal,
      } satisfies KnowledgeSegment;
      remappedIds.set(segment.id, remapped.id);
      segments.push(remapped);
    }
    if (pageArtifact.schemaVersion !== 1) {
      pageArtifact.graphSignals.aliases.forEach((alias) => aliases.add(alias));
      for (const heading of pageArtifact.graphSignals.headings) {
        const segmentId = remappedIds.get(heading.segmentId);
        if (segmentId) {
          headings.push({
            ...heading,
            segmentId,
            locator: { kind: "text", section: page.url },
          });
        }
      }
      for (const link of pageArtifact.graphSignals.links) {
        const segmentId = remappedIds.get(link.segmentId);
        if (segmentId) {
          links.push({
            ...link,
            segmentId,
            locator: { kind: "text", section: page.url },
          });
        }
      }
      if (pageArtifact.schemaVersion === 3) {
        const blockIdMap = new Map<string, string>();
        for (const block of pageArtifact.graphSignals.blocks) {
          blockIdMap.set(block.blockId, `${page.url}#${block.blockId}`);
        }
        for (const block of pageArtifact.graphSignals.blocks) {
          blocks.push({
            ...block,
            blockId: blockIdMap.get(block.blockId)!,
            ...(block.parentBlockId ? { parentBlockId: blockIdMap.get(block.parentBlockId) } : {}),
            segmentIds: block.segmentIds.flatMap((id) => {
              const remapped = remappedIds.get(id);
              return remapped ? [remapped] : [];
            }),
            locator: { kind: "text", section: page.url },
          });
        }
        for (const reference of pageArtifact.graphSignals.references) {
          const sourceBlockId = blockIdMap.get(reference.sourceBlockId);
          if (!sourceBlockId) {
            continue;
          }
          references.push({
            ...reference,
            referenceId: `${page.url}#${reference.referenceId}`,
            sourceBlockId,
            ...(reference.targetBlockId
              ? { targetBlockId: blockIdMap.get(reference.targetBlockId) }
              : {}),
            candidateTargetBlockIds: reference.candidateTargetBlockIds.flatMap((id) => {
              const remapped = blockIdMap.get(id);
              return remapped ? [remapped] : [];
            }),
            locator: { kind: "text", section: page.url },
          });
        }
      }
    }
  }
  if (segments.length === 0) {
    throw new EnterpriseKnowledgeError(
      "EXTRACTION_EMPTY",
      422,
      "No usable text could be extracted.",
    );
  }
  const finalBlocks = blocks.length ? blocks : fallbackStructuralBlocks({ segments, headings });
  const extractorIdentity = "guarded-url-crawler";
  const artifactWithoutChecksum = {
    schemaVersion: 3 as const,
    sourceId: params.sourceId,
    sourceVersionId: params.sourceVersionId,
    sourceVersion: params.sourceVersion,
    title: params.title,
    mimeType: "text/html",
    createdAt: Date.now(),
    parserProvenance: {
      parser: "guarded-url-crawler",
      pages: params.pages.length,
      urls: params.pages.map((page) => page.url),
    },
    segments,
    extractorIdentity,
    graphSignals: {
      aliases: normalizeKnowledgeAliases([params.title, ...aliases]),
      headings,
      links,
      blocks: finalBlocks,
      references:
        references.length > 0
          ? references
          : resolveStructuralReferences({ blocks: finalBlocks, links }),
    },
  };
  return {
    ...artifactWithoutChecksum,
    artifactChecksum: createHash("sha256")
      .update(JSON.stringify(artifactWithoutChecksum))
      .digest("hex"),
  };
}
