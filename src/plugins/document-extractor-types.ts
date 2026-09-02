/** Image extracted from a document page. */
export type DocumentExtractedImage = {
  type: "image";
  data: string;
  mimeType: string;
  pageNumber?: number;
};

export type DocumentStructuralKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "table"
  | "table_row"
  | "table_cell"
  | "ocr_block";

export type DocumentStructuralSemanticKind =
  | "part"
  | "chapter"
  | "section"
  | "article"
  | "clause"
  | "point"
  | "content";

/** Structure preserved before sanitizing/chunking a document. */
export type DocumentStructuralBlock = {
  blockId: string;
  kind: DocumentStructuralKind;
  semanticKind?: DocumentStructuralSemanticKind;
  parentBlockId?: string;
  headingLevel?: number;
  headingPath?: string[];
  ordinal?: number;
  listLevel?: number;
  numberingLabel?: string;
  row?: number;
  column?: number;
  isToc?: boolean;
  isHeaderFooter?: boolean;
  language?: string;
};

/** Passive link metadata. Extractors never fetch or execute these targets. */
export type DocumentStructuralLink = {
  kind: "hyperlink" | "bookmark" | "internal_reference";
  target: string;
  alias?: string;
  relationshipId?: string;
};

/** Locator-preserving text segment emitted by capable document extractors. */
export type DocumentTextSegment = {
  text: string;
  locator: {
    page?: number;
    section?: string;
    paragraph?: number;
    table?: number;
    cell?: string;
    sheet?: string;
    range?: string;
    slide?: number;
    shape?: string;
    ocrBlock?: string;
  };
  structure?: DocumentStructuralBlock;
  links?: DocumentStructuralLink[];
};

/** Request passed to plugin document extractors. */
export type DocumentExtractionRequest = {
  buffer: Buffer;
  mimeType: string;
  maxPages: number;
  maxPixels: number;
  minTextChars: number;
  password?: string;
  pageNumbers?: number[];
  onImageExtractionError?: (error: unknown) => void;
};

/** Text and image result returned by a document extractor. */
export type DocumentExtractionResult = {
  text: string;
  images: DocumentExtractedImage[];
  segments?: DocumentTextSegment[];
  pageCount?: number;
  truncated?: boolean;
  parserProvenance?: Record<string, unknown>;
  ocrProvenance?: Record<string, unknown>;
};

/** Plugin document extractor capability contract. */
export type DocumentExtractorPlugin = {
  id: string;
  label: string;
  mimeTypes: readonly string[];
  autoDetectOrder?: number;
  extract: (request: DocumentExtractionRequest) => Promise<DocumentExtractionResult | null>;
};

/** Registered document extractor with owning plugin id. */
export type PluginDocumentExtractorEntry = DocumentExtractorPlugin & {
  pluginId: string;
};
