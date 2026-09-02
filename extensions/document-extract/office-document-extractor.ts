import JSZip, { type JSZipObject } from "jszip";
import type {
  DocumentExtractionRequest,
  DocumentExtractionResult,
  DocumentExtractorPlugin,
  DocumentTextSegment,
} from "openclaw/plugin-sdk/document-extractor";
import { SaxesParser, type SaxesTagPlain } from "saxes";

const MAX_ZIP_ENTRIES = 10_000;
const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;
const MAX_XML_NODES = 1_000_000;
const MAX_TEXT_CHARS = 2_000_000;

const ACTIVE_CONTENT = [
  /(^|\/)vbaproject\.bin$/i,
  /(^|\/)macros?\//i,
  /(^|\/)embeddings?\//i,
  /(^|\/)oleobjects?\//i,
  /(^|\/)activex\//i,
  /(^|\/)externallinks\//i,
];

type OfficeRelationship = {
  id: string;
  type: string;
  target: string;
  external: boolean;
};

function localName(name: string): string {
  const index = name.indexOf(":");
  return (index >= 0 ? name.slice(index + 1) : name).toLowerCase();
}

function attr(tag: SaxesTagPlain, name: string): string | undefined {
  for (const [key, value] of Object.entries(tag.attributes)) {
    if (localName(key) === name.toLowerCase()) {
      return String(value);
    }
  }
  return undefined;
}

function parseXml(
  xml: string,
  handlers: {
    open?: (tag: SaxesTagPlain) => void;
    text?: (text: string) => void;
    close?: (name: string) => void;
  },
): void {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) {
    throw new Error("OFFICE_XML_TOO_LARGE");
  }
  let nodes = 0;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("doctype", () => {
    throw new Error("OFFICE_XML_DOCTYPE_FORBIDDEN");
  });
  parser.on("opentag", (tag) => {
    nodes += 1;
    if (nodes > MAX_XML_NODES) {
      throw new Error("OFFICE_XML_NODE_LIMIT");
    }
    handlers.open?.(tag as SaxesTagPlain);
  });
  parser.on("text", (text) => handlers.text?.(text));
  parser.on("closetag", (tag) => handlers.close?.(tag.name));
  parser.write(xml).close();
}

function declaredUncompressedSize(entry: JSZipObject): number | undefined {
  const internalData = Reflect.get(entry, "_data") as { uncompressedSize?: unknown } | undefined;
  return typeof internalData?.uncompressedSize === "number"
    ? internalData.uncompressedSize
    : undefined;
}

async function openSafeOfficePackage(buffer: Buffer): Promise<JSZip> {
  const zip = await JSZip.loadAsync(buffer, {
    checkCRC32: true,
    createFolders: false,
    decodeFileName: (bytes) =>
      Array.isArray(bytes) ? bytes.join("") : Buffer.from(bytes).toString("utf8"),
  });
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("OFFICE_ZIP_ENTRY_LIMIT");
  }
  let declaredTotal = 0;
  for (const entry of entries) {
    if (entry.dir) {
      continue;
    }
    if (entry.name.startsWith("/") || entry.name.split("/").includes("..")) {
      throw new Error("OFFICE_ZIP_PATH_INVALID");
    }
    if (ACTIVE_CONTENT.some((pattern) => pattern.test(entry.name))) {
      throw new Error("OFFICE_ACTIVE_CONTENT_FORBIDDEN");
    }
    declaredTotal += declaredUncompressedSize(entry) ?? 0;
    if (declaredTotal > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("OFFICE_ZIP_BOMB");
    }
  }
  for (const entry of entries.filter((item) => item.name.endsWith(".rels"))) {
    const xml = await entry.async("string");
    parseXml(xml, {
      open(tag) {
        if (localName(tag.name) !== "relationship") {
          return;
        }
        const mode = attr(tag, "targetmode")?.toLowerCase();
        const type = attr(tag, "type") ?? "";
        const target = attr(tag, "target") ?? "";
        const isPassiveWebHyperlink =
          mode === "external" &&
          /\/hyperlink$/i.test(type) &&
          /^https?:\/\//i.test(target) &&
          !/[\u0000-\u001f\u007f]/u.test(target);
        if (
          (mode === "external" || /^(?:https?|file|ftp):/i.test(target)) &&
          !isPassiveWebHyperlink
        ) {
          throw new Error("OFFICE_EXTERNAL_RELATIONSHIP_FORBIDDEN");
        }
      },
    });
  }
  return zip;
}

async function readRelationships(
  zip: JSZip,
  name: string,
): Promise<Map<string, OfficeRelationship>> {
  const result = new Map<string, OfficeRelationship>();
  const entry = zip.file(name);
  if (!entry) {
    return result;
  }
  parseXml(await entry.async("string"), {
    open(tag) {
      if (localName(tag.name) !== "relationship") {
        return;
      }
      const id = attr(tag, "id");
      const type = attr(tag, "type") ?? "";
      const target = attr(tag, "target") ?? "";
      if (!id || !target) {
        return;
      }
      result.set(id, {
        id,
        type,
        target,
        external: attr(tag, "targetmode")?.toLowerCase() === "external",
      });
    },
  });
  return result;
}

async function requiredXml(zip: JSZip, name: string): Promise<string> {
  const entry = zip.file(name);
  if (!entry) {
    throw new Error("OFFICE_PACKAGE_MALFORMED");
  }
  return await entry.async("string");
}

function pushSegment(
  segments: DocumentTextSegment[],
  text: string,
  locator: DocumentTextSegment["locator"],
): void {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return;
  }
  const used = segments.reduce((total, segment) => total + segment.text.length, 0);
  if (used >= MAX_TEXT_CHARS) {
    return;
  }
  segments.push({ text: normalized.slice(0, MAX_TEXT_CHARS - used), locator });
}

type VietnameseStructure = {
  semanticKind: "part" | "chapter" | "section" | "article" | "clause" | "point" | "content";
  level: number;
  numberingLabel?: string;
};

function classifyVietnameseStructure(text: string): VietnameseStructure | undefined {
  const value = text.normalize("NFC").trim();
  const patterns: Array<[RegExp, VietnameseStructure["semanticKind"], number]> = [
    [/^(?:PHẦN|Phần)\s+[\dIVXLCDM]+\b/u, "part", 1],
    [/^(?:CHƯƠNG|Chương)\s+[\dIVXLCDM]+\b/u, "chapter", 2],
    [/^(?:MỤC|Mục)\s+[\dIVXLCDM]+\b/u, "section", 3],
    [/^(?:ĐIỀU|Điều)\s+\d+[A-Za-z]?\b/u, "article", 4],
    [/^(?:KHOẢN|Khoản)\s+\d+\b/u, "clause", 5],
    [/^(?:ĐIỂM|Điểm)\s+[a-zđ]\b/u, "point", 6],
  ];
  for (const [pattern, semanticKind, level] of patterns) {
    const match = value.match(pattern);
    if (match) {
      return { semanticKind, level, numberingLabel: match[0] };
    }
  }
  const clause = value.match(/^(\d+)[.)]\s+/u);
  if (clause) {
    return { semanticKind: "clause", level: 5, numberingLabel: clause[1] };
  }
  const point = value.match(/^([a-zđ])[.)]\s+/iu);
  if (point) {
    return { semanticKind: "point", level: 6, numberingLabel: point[1] };
  }
  return undefined;
}

function headingLevelFromStyle(style?: string): number | undefined {
  const match = style?.match(/^heading\s*([1-9])?$/i);
  if (!match) {
    return undefined;
  }
  return Number(match[1] ?? 1);
}

async function extractDocx(zip: JSZip): Promise<DocumentExtractionResult> {
  const xml = await requiredXml(zip, "word/document.xml");
  const relationships = await readRelationships(zip, "word/_rels/document.xml.rels");
  const segments: DocumentTextSegment[] = [];
  let paragraph = 0;
  let table = 0;
  let cell = 0;
  let row = 0;
  let column = 0;
  let depthTable = 0;
  let buffer = "";
  let heading: string | undefined;
  let paragraphStyle: string | undefined;
  let activeHyperlinkId: string | undefined;
  let activeHyperlinkText = "";
  let paragraphLinks: NonNullable<DocumentTextSegment["links"]> = [];
  let paragraphBookmarks: string[] = [];
  const headingStack = new Map<number, { blockId: string; text: string }>();
  parseXml(xml, {
    open(tag) {
      const name = localName(tag.name);
      if (name === "tbl") {
        depthTable += 1;
        table += 1;
        cell = 0;
        row = 0;
        column = 0;
      } else if (name === "tr") {
        row += 1;
        column = 0;
      } else if (name === "tc") {
        cell += 1;
        column += 1;
      } else if (name === "pstyle") {
        paragraphStyle = attr(tag, "val");
      } else if (name === "hyperlink") {
        activeHyperlinkId = attr(tag, "id");
        activeHyperlinkText = "";
      } else if (name === "bookmarkstart") {
        const bookmark = attr(tag, "name");
        if (bookmark && !bookmark.startsWith("_")) {
          paragraphBookmarks.push(bookmark);
        }
      }
    },
    text(value) {
      buffer += value;
      if (activeHyperlinkId) {
        activeHyperlinkText += value;
      }
    },
    close(nameRaw) {
      const name = localName(nameRaw);
      if (name === "hyperlink") {
        const relationship = activeHyperlinkId ? relationships.get(activeHyperlinkId) : undefined;
        if (relationship && /\/hyperlink$/i.test(relationship.type)) {
          paragraphLinks.push({
            kind: "hyperlink",
            target: relationship.target,
            relationshipId: relationship.id,
            ...(activeHyperlinkText.trim() ? { alias: activeHyperlinkText.trim() } : {}),
          });
        }
        activeHyperlinkId = undefined;
        activeHyperlinkText = "";
      } else if (name === "p") {
        paragraph += 1;
        const text = buffer.replace(/\s+/gu, " ").trim();
        const semantic = classifyVietnameseStructure(text);
        const styleLevel = headingLevelFromStyle(paragraphStyle);
        const structuralLevel = semantic?.level ?? styleLevel;
        const isHeading = structuralLevel !== undefined;
        const blockId = `docx:p:${paragraph}`;
        if (structuralLevel !== undefined && text) {
          heading = text;
          for (const level of [...headingStack.keys()]) {
            if (level >= structuralLevel) {
              headingStack.delete(level);
            }
          }
        }
        const parent =
          structuralLevel !== undefined
            ? [...headingStack.entries()]
                .filter(([level]) => level < structuralLevel)
                .toSorted(([left], [right]) => right - left)[0]?.[1]
            : [...headingStack.entries()].toSorted(([left], [right]) => right - left)[0]?.[1];
        const headingPath = [...headingStack.entries()]
          .filter(([level]) => !structuralLevel || level < structuralLevel)
          .toSorted(([left], [right]) => left - right)
          .map(([, value]) => value.text);
        if (isHeading && text) {
          headingPath.push(text);
        }
        const looksLikeToc = /\.{3,}\s*\d+\s*$/u.test(text) || /^MỤC LỤC$/iu.test(text);
        const links = [
          ...paragraphLinks,
          ...paragraphBookmarks.map((target) => ({ kind: "bookmark" as const, target })),
        ];
        pushSegment(segments, text, {
          section: heading,
          paragraph,
          ...(depthTable ? { table, cell: String(cell) } : {}),
        });
        const pushed = segments.at(-1);
        if (pushed?.locator.paragraph === paragraph) {
          pushed.structure = {
            blockId,
            kind: depthTable ? "table_cell" : isHeading ? "heading" : "paragraph",
            semanticKind: semantic?.semanticKind ?? (isHeading ? "section" : "content"),
            ...(parent ? { parentBlockId: parent.blockId } : {}),
            ...(structuralLevel ? { headingLevel: structuralLevel } : {}),
            headingPath,
            ordinal: paragraph - 1,
            ...(semantic?.numberingLabel ? { numberingLabel: semantic.numberingLabel } : {}),
            ...(depthTable ? { row, column } : {}),
            isToc: looksLikeToc,
            isHeaderFooter: false,
            language: "vi",
          };
          if (links.length > 0) {
            pushed.links = links;
          }
        }
        if (structuralLevel !== undefined && text && !looksLikeToc) {
          headingStack.set(structuralLevel, { blockId, text });
        }
        buffer = "";
        paragraphStyle = undefined;
        paragraphLinks = [];
        paragraphBookmarks = [];
      } else if (name === "tbl") {
        depthTable = Math.max(0, depthTable - 1);
      }
    },
  });
  return {
    text: segments.map((segment) => segment.text).join("\n"),
    images: [],
    segments,
    truncated:
      segments.reduce((total, segment) => total + segment.text.length, 0) >= MAX_TEXT_CHARS,
    parserProvenance: {
      extractor: "jszip+saxes",
      format: "docx",
      structure: "v3",
      hyperlinksFetched: false,
    },
  };
}

async function extractSharedStrings(zip: JSZip): Promise<string[]> {
  const entry = zip.file("xl/sharedStrings.xml");
  if (!entry) {
    return [];
  }
  const values: string[] = [];
  let inItem = false;
  let value = "";
  parseXml(await entry.async("string"), {
    open(tag) {
      if (localName(tag.name) === "si") {
        inItem = true;
        value = "";
      }
    },
    text(text) {
      if (inItem) {
        value += text;
      }
    },
    close(name) {
      if (localName(name) === "si") {
        values.push(value);
        inItem = false;
      }
    },
  });
  return values;
}

async function extractWorkbookSheetNames(zip: JSZip): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const entry = zip.file("xl/workbook.xml");
  if (!entry) {
    return result;
  }
  parseXml(await entry.async("string"), {
    open(tag) {
      if (localName(tag.name) !== "sheet") {
        return;
      }
      const id = attr(tag, "id");
      const name = attr(tag, "name");
      if (id && name) {
        result.set(id, name);
      }
    },
  });
  return result;
}

async function extractWorkbookRelationships(zip: JSZip): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const entry = zip.file("xl/_rels/workbook.xml.rels");
  if (!entry) {
    return result;
  }
  parseXml(await entry.async("string"), {
    open(tag) {
      if (localName(tag.name) !== "relationship") {
        return;
      }
      const id = attr(tag, "id");
      const target = attr(tag, "target");
      if (id && target) {
        result.set(id, pathForXlTarget(target));
      }
    },
  });
  return result;
}

function pathForXlTarget(target: string): string {
  const normalized = target.replaceAll("\\", "/").replace(/^\/+/, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

async function extractXlsx(zip: JSZip): Promise<DocumentExtractionResult> {
  const sharedStrings = await extractSharedStrings(zip);
  const names = await extractWorkbookSheetNames(zip);
  const relationships = await extractWorkbookRelationships(zip);
  const pathToName = new Map<string, string>();
  for (const [id, target] of relationships) {
    pathToName.set(target, names.get(id) ?? target.split("/").at(-1) ?? target);
  }
  const worksheets = Object.values(zip.files)
    .filter((entry) => !entry.dir && /^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name))
    .toSorted((left, right) => left.name.localeCompare(right.name));
  const segments: DocumentTextSegment[] = [];
  for (const [sheetIndex, entry] of worksheets.entries()) {
    const sheet = pathToName.get(entry.name) ?? `Sheet ${sheetIndex + 1}`;
    let cellRef = "";
    let cellType = "";
    let value = "";
    let formula = "";
    let active: "v" | "f" | "t" | undefined;
    parseXml(await entry.async("string"), {
      open(tag) {
        const name = localName(tag.name);
        if (name === "c") {
          cellRef = attr(tag, "r") ?? "";
          cellType = attr(tag, "t") ?? "";
          value = "";
          formula = "";
        } else if (name === "v" || name === "f" || name === "t") {
          active = name;
        }
      },
      text(text) {
        if (active === "v" || active === "t") {
          value += text;
        } else if (active === "f") {
          formula += text;
        }
      },
      close(nameRaw) {
        const name = localName(nameRaw);
        if (name === "v" || name === "f" || name === "t") {
          active = undefined;
        } else if (name === "c") {
          const cached = cellType === "s" ? (sharedStrings[Number(value)] ?? value) : value;
          const display = formula ? `=${formula} [cached: ${cached}]` : cached;
          pushSegment(segments, display, { sheet, range: cellRef || "unknown" });
        }
      },
    });
  }
  return {
    text: segments
      .map((segment) => `${segment.locator.sheet}!${segment.locator.range}: ${segment.text}`)
      .join("\n"),
    images: [],
    segments,
    truncated:
      segments.reduce((total, segment) => total + segment.text.length, 0) >= MAX_TEXT_CHARS,
    parserProvenance: { extractor: "jszip+saxes", format: "xlsx", formulasExecuted: false },
  };
}

async function extractPptx(zip: JSZip): Promise<DocumentExtractionResult> {
  const slides = Object.values(zip.files)
    .filter((entry) => !entry.dir && /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name))
    .toSorted((left, right) => {
      const number = (entry: JSZipObject) =>
        Number(entry.name.match(/slide(\d+)\.xml$/i)?.[1] ?? 0);
      return number(left) - number(right);
    });
  const segments: DocumentTextSegment[] = [];
  for (const entry of slides) {
    const slide = Number(entry.name.match(/slide(\d+)\.xml$/i)?.[1] ?? 0);
    let shapeIndex = 0;
    let inShape = false;
    let buffer = "";
    parseXml(await entry.async("string"), {
      open(tag) {
        if (localName(tag.name) === "sp") {
          inShape = true;
          shapeIndex += 1;
          buffer = "";
        }
      },
      text(text) {
        if (inShape) {
          buffer += `${text} `;
        }
      },
      close(name) {
        if (localName(name) === "sp") {
          pushSegment(segments, buffer, { slide, shape: String(shapeIndex) });
          inShape = false;
          buffer = "";
        }
      },
    });
  }
  return {
    text: segments.map((segment) => `Slide ${segment.locator.slide}: ${segment.text}`).join("\n"),
    images: [],
    segments,
    truncated:
      segments.reduce((total, segment) => total + segment.text.length, 0) >= MAX_TEXT_CHARS,
    parserProvenance: { extractor: "jszip+saxes", format: "pptx" },
  };
}

function createOfficeExtractor(params: {
  id: string;
  label: string;
  mimeTypes: string[];
  order: number;
  extract: (zip: JSZip) => Promise<DocumentExtractionResult>;
}): DocumentExtractorPlugin {
  return {
    id: params.id,
    label: params.label,
    mimeTypes: params.mimeTypes,
    autoDetectOrder: params.order,
    async extract(request: DocumentExtractionRequest) {
      return await params.extract(await openSafeOfficePackage(request.buffer));
    },
  };
}

export function createDocxDocumentExtractor(): DocumentExtractorPlugin {
  return createOfficeExtractor({
    id: "docx",
    label: "Microsoft Word",
    order: 20,
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extract: extractDocx,
  });
}

export function createXlsxDocumentExtractor(): DocumentExtractorPlugin {
  return createOfficeExtractor({
    id: "xlsx",
    label: "Microsoft Excel",
    order: 30,
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    extract: extractXlsx,
  });
}

export function createPptxDocumentExtractor(): DocumentExtractorPlugin {
  return createOfficeExtractor({
    id: "pptx",
    label: "Microsoft PowerPoint",
    order: 40,
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    extract: extractPptx,
  });
}
