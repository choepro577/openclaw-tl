import { describe, expect, it } from "vitest";
import {
  extractReplyFileReferences,
  stripReplyFileReferenceText,
} from "./reply-file-references.js";

describe("local reply file references", () => {
  it.each([
    "Use `[Report](./report.csv)` as an example.",
    "Use ``![Preview](./secret.png) and `literal` `` as an example.",
    "Use `[Report](./report.csv)\nMEDIA:/workspace/secret.csv` as an example.",
    "Use `MEDIA:/workspace/secret.csv` as an example.",
    "Use ``MEDIA:`/workspace/secret.csv` `` as an example.",
    "```markdown\n[Report](./report.csv)\nMEDIA:`/workspace/secret.csv`\n```",
    "    [Report](./report.csv)\n    MEDIA:`/workspace/secret.csv`",
  ])("keeps code examples inert during extraction and stripping: %s", (example) => {
    const delivery = "[Download](</workspace/Báo cáo%20QA.csv>)";
    const text = `${example}\n\n${delivery}`;
    const references = extractReplyFileReferences(text);
    expect(references).toHaveLength(1);
    expect(references[0].source).toBe("/workspace/Báo cáo QA.csv");
    expect(text.slice(references[0].referenceStart, references[0].referenceEnd)).toBe(delivery);
    expect(text.slice(references[0].start, references[0].end)).toBe("/workspace/Báo cáo%20QA.csv");
    expect(stripReplyFileReferenceText(text, references)).toBe(`${example}\n\nDownload`);
    expect(extractReplyFileReferences(example)).toEqual([]);
    expect(stripReplyFileReferenceText(example)).toBe(example);
  });

  it("treats unmatched backticks as prose without swallowing later delivery references", () => {
    const text = "Unclosed ` span [Report](./report.csv)\n\n[Next](./next.pdf)";
    expect(extractReplyFileReferences(text).map((reference) => reference.source)).toEqual([
      "./report.csv",
      "./next.pdf",
    ]);
    expect(stripReplyFileReferenceText(text)).toBe("Unclosed ` span Report\n\nNext");
  });

  it("keeps standalone backtick-quoted MEDIA paths and original formatted link labels", () => {
    const text = [
      "MEDIA:`/workspace/Báo cáo%20QA.csv`",
      "MEDIA: `/workspace/chart.png`",
      "[Download `CSV`](./report.csv)",
    ].join("\n");
    const references = extractReplyFileReferences(text);
    expect(references.map((reference) => reference.source)).toEqual([
      "/workspace/Báo cáo QA.csv",
      "/workspace/chart.png",
      "./report.csv",
    ]);
    expect(stripReplyFileReferenceText(text, references)).toBe("\n\nDownload `CSV`");
    expect(text.slice(references[0].referenceStart, references[0].referenceEnd)).toBe(
      "MEDIA:`/workspace/Báo cáo%20QA.csv`",
    );
  });

  it("extracts downloadable documents and inline images without treating web links as files", () => {
    const text = [
      "[Tải báo cáo](</workspace/Báo cáo TECH.xlsx>)",
      "![Biểu đồ](sandbox:/workspace/chart.png)",
      "[PDF](./exports/report%20final.pdf)",
      "[CSV](report.csv)",
      "File: `/workspace/archive.zip`.",
      "MEDIA:/workspace/export.csv",
      "[Web](https://example.com/report.xlsx) [Anchor](#report.xlsx)",
      "[Data](data:image/png;base64,abc) [Network](//host/share/file.pdf)",
      "```markdown\n[Example](/workspace/not-an-output.xlsx)\n```",
    ].join("\n");
    const references = extractReplyFileReferences(text);
    expect(references.map((reference) => reference.source)).toEqual([
      "/workspace/Báo cáo TECH.xlsx",
      "/workspace/chart.png",
      "./exports/report final.pdf",
      "report.csv",
      "/workspace/export.csv",
    ]);
    expect(references.slice(0, 4).map((reference) => reference.label)).toEqual([
      "Tải báo cáo",
      "Biểu đồ",
      "PDF",
      "CSV",
    ]);
    expect(text.slice(references[0].referenceStart, references[0].referenceEnd)).toBe(
      "[Tải báo cáo](</workspace/Báo cáo TECH.xlsx>)",
    );
    expect(text.slice(references[1].start, references[1].end)).toBe("sandbox:/workspace/chart.png");
  });

  it("preserves escaped and balanced parentheses, file URLs, and Windows sources", () => {
    const text =
      "[One](</workspace/report (1).pdf>) [Two](./report\\(2\\).pdf) [Three](./report(3).pdf) [Four](file:///workspace/final.png) [Five](C:\\exports\\report.xlsx)";
    expect(extractReplyFileReferences(text).map((reference) => reference.source)).toEqual([
      "/workspace/report (1).pdf",
      "./report(2).pdf",
      "./report(3).pdf",
      "file:///workspace/final.png",
      "C:\\exports\\report.xlsx",
    ]);
  });

  it("recovers local Markdown destinations with raw and encoded spaces while preserving titles and offsets", () => {
    const text = [
      '[Báo cáo nhân sự QA.csv](/workspace/qa-returned-files/Báo cáo%20nhân%20sự%20QA.csv "Tải CSV")',
      "![Biểu đồ QA](sandbox:/workspace/qa-returned-files/Biểu đồ%20QA (1).png 'Xem ảnh')",
      "[Relative](Báo cáo%20cuối.csv)",
      "[Trailing](  ./out/report final.pdf  )",
      "[Title](./out/report final.pdf (Bản cuối))",
      "Tải file `/workspace/Báo cáo%20QA.xlsx` và ảnh `./out/Biểu đồ QA.png`.",
      '[Web](https://example.com/report final.csv "Web") [Data](data:image/png;base64,abc def) [Network](//host/share/report final.csv)',
      "`https://example.com/report final.csv` `//host/share/report final.csv` [Encoded network](%2F%2Fhost/report.csv)",
      "Đường dẫn minh họa /workspace/Báo cáo QA.xlsx không có dấu bao.",
      "```markdown\n[Example](/workspace/not an output.csv)\n```",
    ].join("\n");
    const references = extractReplyFileReferences(text);
    expect(references.map((reference) => reference.source)).toEqual([
      "/workspace/qa-returned-files/Báo cáo nhân sự QA.csv",
      "/workspace/qa-returned-files/Biểu đồ QA (1).png",
      "Báo cáo cuối.csv",
      "./out/report final.pdf",
      "./out/report final.pdf",
    ]);
    expect(references.map((reference) => text.slice(reference.start, reference.end))).toEqual([
      "/workspace/qa-returned-files/Báo cáo%20nhân%20sự%20QA.csv",
      "sandbox:/workspace/qa-returned-files/Biểu đồ%20QA (1).png",
      "Báo cáo%20cuối.csv",
      "./out/report final.pdf",
      "./out/report final.pdf",
    ]);
    expect(references.map((reference) => reference.label)).toEqual([
      "Báo cáo nhân sự QA.csv",
      "Biểu đồ QA",
      "Relative",
      "Trailing",
      "Title",
    ]);
    expect(text.slice(references[0].referenceStart, references[0].referenceEnd)).toBe(
      '[Báo cáo nhân sự QA.csv](/workspace/qa-returned-files/Báo cáo%20nhân%20sự%20QA.csv "Tải CSV")',
    );
  });

  it("ignores ordinary file mentions while accepting explicit quoted MEDIA delivery directives", () => {
    const text = [
      "Edit `credentials.json`, see `src/config.ts`, and open /workspace/private.json.",
      "The generated path is `/workspace/Báo cáo QA.xlsx`.",
      "MEDIA:`/workspace/Báo cáo%20QA.csv`",
      'MEDIA:"./out/Biểu đồ QA.png"',
      "MEDIA:'./out/file final.pdf'",
      "MEDIA:</workspace/file final.xlsx>",
      "MEDIA:https://example.com/report.csv",
      "[Existing artifact](/api/chat/media/outgoing/scope/id/full) [Proxy artifact](/assistant-openclaw/api/chat/media/outgoing/scope/id/full)",
      "```\nMEDIA:/workspace/secret.json\n```",
    ].join("\n");
    const references = extractReplyFileReferences(text);
    expect(references.map((reference) => reference.source)).toEqual([
      "/workspace/Báo cáo QA.csv",
      "./out/Biểu đồ QA.png",
      "./out/file final.pdf",
      "/workspace/file final.xlsx",
    ]);
    expect(text.slice(references[0].referenceStart, references[0].referenceEnd)).toBe(
      "MEDIA:`/workspace/Báo cáo%20QA.csv`",
    );
  });
});
