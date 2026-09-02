import { afterEach, describe, expect, it } from "vitest";
import { extractAndNormalizeKnowledgeArtifact } from "./ingestion.js";
import { registerEnterpriseKnowledgeOcrProvider } from "./ocr-provider.js";

const disposers: Array<() => void> = [];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
});

describe("Enterprise Knowledge normalization and OCR policy", () => {
  it("normalizes Unicode text to NFC while retaining exact locators", async () => {
    const artifact = await extractAndNormalizeKnowledgeArtifact({
      buffer: Buffer.from("Chính sách\n\nNghỉ phép"),
      declaredMimeType: "text/plain",
      originalName: "policy.txt",
      sourceId: "source-text",
      sourceVersionId: "version-text",
      sourceVersion: 1,
      title: "Chính sách",
      externalAllowed: false,
    });
    expect(artifact.segments[0]?.text).toBe(artifact.segments[0]?.text.normalize("NFC"));
    expect(artifact.segments[0]?.locator).toEqual({ kind: "text" });
  });

  it("uses a permitted local OCR provider and records block provenance", async () => {
    disposers.push(
      registerEnterpriseKnowledgeOcrProvider({
        id: "local-test-ocr",
        transport: "local",
        async recognize() {
          return {
            text: "",
            blocks: [{ id: "block-1", text: "Nội dung ảnh", confidence: 0.98 }],
            confidence: 0.98,
            provider: "test",
            model: "fixture",
          };
        },
      }),
    );
    const artifact = await extractAndNormalizeKnowledgeArtifact({
      buffer: png,
      declaredMimeType: "image/png",
      originalName: "scan.png",
      sourceId: "source-image",
      sourceVersionId: "version-image",
      sourceVersion: 1,
      title: "Scan",
      externalAllowed: false,
    });
    expect(artifact.segments[0]).toMatchObject({
      text: "Nội dung ảnh",
      locator: { kind: "ocr", page: 1, block: "block-1", confidence: 0.98 },
    });
    expect(artifact.ocrProvenance).toMatchObject({ provider: "local-test-ocr", pages: 1 });
  });

  it("blocks a remote OCR provider when the Zone is local-only", async () => {
    disposers.push(
      registerEnterpriseKnowledgeOcrProvider({
        id: "remote-test-ocr",
        transport: "remote",
        async recognize() {
          throw new Error("must not be called");
        },
      }),
    );
    await expect(
      extractAndNormalizeKnowledgeArtifact({
        buffer: png,
        declaredMimeType: "image/png",
        originalName: "scan.png",
        sourceId: "source-image",
        sourceVersionId: "version-image",
        sourceVersion: 1,
        title: "Scan",
        externalAllowed: false,
      }),
    ).rejects.toMatchObject({ code: "OCR_REQUIRED" });
  });

  it("sanitizes active HTML content before chunking", async () => {
    const artifact = await extractAndNormalizeKnowledgeArtifact({
      buffer: Buffer.from(
        `<html><head><title>Policy</title><script>steal()</script></head><body><form>secret</form><p>Allowed text</p></body></html>`,
      ),
      declaredMimeType: "text/html",
      originalName: "policy.html",
      sourceId: "source-html",
      sourceVersionId: "version-html",
      sourceVersion: 1,
      title: "HTML",
      externalAllowed: false,
    });
    const text = artifact.segments.map((segment) => segment.text).join(" ");
    expect(text).toContain("Allowed text");
    expect(text).not.toContain("steal()");
    expect(text).not.toContain("secret");
    expect(artifact.parserProvenance).toMatchObject({ activeContentRemoved: true });
  });
});
