import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  createDocxDocumentExtractor,
  createPptxDocumentExtractor,
  createXlsxDocumentExtractor,
} from "./office-document-extractor.js";

async function archive(entries: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, value] of Object.entries(entries)) {
    zip.file(name, value);
  }
  return await zip.generateAsync({ type: "nodebuffer" });
}

function request(buffer: Buffer, mimeType: string) {
  return { buffer, mimeType, maxPages: 500, maxPixels: 40_000_000, minTextChars: 32 };
}

describe("safe Office document extraction", () => {
  it("preserves DOCX section, paragraph, table and cell locators", async () => {
    const buffer = await archive({
      "word/document.xml": `
        <w:document><w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chính sách</w:t></w:r></w:p>
          <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Nghỉ phép 12 ngày</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
        </w:body></w:document>`,
    });
    const result = await createDocxDocumentExtractor().extract(
      request(buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    );
    expect(result?.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "Chính sách",
          locator: expect.objectContaining({ section: "Chính sách", paragraph: 1 }),
        }),
        expect.objectContaining({
          text: "Nghỉ phép 12 ngày",
          locator: expect.objectContaining({ table: 1, cell: "1" }),
        }),
      ]),
    );
  });

  it("reconstructs Vietnamese chapter hierarchy and keeps web links passive", async () => {
    const buffer = await archive({
      "word/document.xml": `
        <w:document><w:body>
          <w:p><w:r><w:t>CHƯƠNG I QUY ĐỊNH CHUNG</w:t></w:r></w:p>
          <w:p><w:r><w:t>Điều 1. Phạm vi áp dụng</w:t></w:r></w:p>
          <w:p><w:r><w:t>1. Người lao động phải tuân thủ nội quy.</w:t></w:r></w:p>
          <w:p><w:hyperlink r:id="rId9"><w:r><w:t>Cổng nhân sự</w:t></w:r></w:hyperlink></w:p>
          <w:p><w:r><w:t>Điều 2. Trách nhiệm của Phòng Nhân sự</w:t></w:r></w:p>
        </w:body></w:document>`,
      "word/_rels/document.xml.rels": `<Relationships>
        <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" TargetMode="External" Target="https://hr.example.test/policy"/>
      </Relationships>`,
    });
    const result = await createDocxDocumentExtractor().extract(
      request(buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    );
    const chapter = result?.segments?.find((segment) => segment.text.startsWith("CHƯƠNG I"));
    const article = result?.segments?.find((segment) => segment.text.startsWith("Điều 1"));
    const clause = result?.segments?.find((segment) => segment.text.startsWith("1."));
    const link = result?.segments?.find((segment) => segment.text === "Cổng nhân sự");
    expect(chapter?.structure).toMatchObject({
      blockId: "docx:p:1",
      semanticKind: "chapter",
      headingLevel: 2,
    });
    expect(article?.structure).toMatchObject({
      blockId: "docx:p:2",
      parentBlockId: "docx:p:1",
      semanticKind: "article",
    });
    expect(clause?.structure).toMatchObject({
      parentBlockId: "docx:p:2",
      semanticKind: "clause",
    });
    expect(link?.links).toEqual([
      expect.objectContaining({
        kind: "hyperlink",
        target: "https://hr.example.test/policy",
        alias: "Cổng nhân sự",
      }),
    ]);
    expect(result?.parserProvenance).toMatchObject({ hyperlinksFetched: false, structure: "v3" });
  });

  it("reads XLSX cached values and formula text without executing formulas", async () => {
    const buffer = await archive({
      "xl/workbook.xml": `<workbook><sheets><sheet name="Lương" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row><c r="B2"><f>SUM(A1:A2)</f><v>42</v></c></row></sheetData></worksheet>`,
    });
    const result = await createXlsxDocumentExtractor().extract(
      request(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    );
    expect(result?.segments?.[0]).toMatchObject({
      text: "=SUM(A1:A2) [cached: 42]",
      locator: { sheet: "Lương", range: "B2" },
    });
    expect(result?.parserProvenance).toMatchObject({ formulasExecuted: false });
  });

  it("preserves PPTX slide and shape locators", async () => {
    const buffer = await archive({
      "ppt/slides/slide2.xml": `<p:sld><p:sp><a:t>Kế hoạch quý</a:t></p:sp></p:sld>`,
    });
    const result = await createPptxDocumentExtractor().extract(
      request(buffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    );
    expect(result?.segments?.[0]).toMatchObject({
      text: "Kế hoạch quý",
      locator: { slide: 2, shape: "1" },
    });
  });

  const rejectedFixtures: Array<{
    name: string;
    entries: Record<string, string>;
    code: string;
  }> = [
    {
      name: "macro",
      entries: { "word/document.xml": "<document/>", "word/vbaProject.bin": "payload" },
      code: "OFFICE_ACTIVE_CONTENT_FORBIDDEN",
    },
    {
      name: "external relationship",
      entries: {
        "word/document.xml": "<document/>",
        "word/_rels/document.xml.rels": `<Relationships><Relationship TargetMode="External" Target="https://evil.example/payload"/></Relationships>`,
      },
      code: "OFFICE_EXTERNAL_RELATIONSHIP_FORBIDDEN",
    },
    {
      name: "DOCTYPE",
      entries: {
        "word/document.xml": `<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><document>&y;</document>`,
      },
      code: "OFFICE_XML_DOCTYPE_FORBIDDEN",
    },
  ];

  it.each(rejectedFixtures)("rejects $name content", async ({ entries, code }) => {
    const buffer = await archive(entries);
    await expect(
      createDocxDocumentExtractor().extract(
        request(buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      ),
    ).rejects.toThrow(code);
  });
});
