import { findCodeRegions } from "../../shared/text/code-regions.js";

/** Local file references are candidates only; the media normalizer owns read authorization. */
export function extractReplyFileReferences(text = ""): Array<{
  source: string;
  start: number;
  end: number;
  label?: string;
  referenceStart: number;
  referenceEnd: number;
}> {
  // Mask examples without moving offsets used when rewriting successful references.
  const prose = findCodeRegions(text).reduceRight((masked, region) => {
    // A directive's path quotes are syntax; an enclosing code example is still inert.
    if (
      /^`[^`\r\n]+`$/u.test(text.slice(region.start, region.end)) &&
      /\bMEDIA:[\t ]*$/u.test(text.slice(0, region.start))
    ) {
      return masked;
    }
    return (
      masked.slice(0, region.start) +
      " ".repeat(region.end - region.start) +
      masked.slice(region.end)
    );
  }, text);
  const references: ReturnType<typeof extractReplyFileReferences> = [];
  const candidates =
    /\]\(\s*(?:<([^<>\n]+)>|((?:[^\r\n()\\"']|\\.|\([^()]*\))+?))(?:\s+(?:["'][^\n]*?["']|\([^()\r\n]*\)))?\s*\)|\bMEDIA:\s*(?:<([^<>\r\n]+)>|`([^`\r\n]+)`|"([^"\r\n]+)"|'([^'\r\n]+)'|([^\r\n]+))/gmu;
  for (const match of prose.matchAll(candidates)) {
    const raw = (
      match[1] ??
      match[2] ??
      match[3] ??
      match[4] ??
      match[5] ??
      match[6] ??
      match[7]
    )?.trim();
    if (!raw) {
      continue;
    }
    let source = raw.replace(/\\([()[\] ])/g, "$1").replace(/^sandbox:/i, "");
    if (!/^file:/i.test(source)) {
      try {
        source = decodeURIComponent(source);
      } catch {
        // Plain filesystem names can contain a literal percent sign.
      }
    }
    if (
      !source ||
      source.startsWith("//") ||
      source.startsWith("\\\\") ||
      /^\/(?:assistant-openclaw\/)?api\/chat\/media\/outgoing\//.test(source) ||
      (/^[A-Za-z][A-Za-z\d+.-]*:/.test(source) && !/^(?:file:|[A-Za-z]:[\\/])/i.test(source)) ||
      (!/^(?:file:|\/(?!\/)|\.\.?\/|~\/|[A-Za-z]:[\\/])/i.test(source) &&
        !/^[^?#\r\n]+\.[\p{L}\p{N}]{1,12}$/u.test(source))
    ) {
      continue;
    }
    const start = match.index + match[0].indexOf(raw);
    const labelStart =
      match[1] !== undefined || match[2] !== undefined ? prose.lastIndexOf("[", match.index) : -1;
    const label = labelStart >= 0 ? text.slice(labelStart + 1, match.index) : undefined;
    const hasLabel = label !== undefined && !/[[\]\n]/.test(label);
    references.push({
      source,
      start,
      end: start + raw.length,
      ...(hasLabel ? { label } : {}),
      referenceStart: hasLabel ? labelStart - (prose[labelStart - 1] === "!" ? 1 : 0) : match.index,
      referenceEnd: match.index + match[0].length,
    });
  }
  return references;
}

/** Keep readable labels without exposing filesystem destinations. */
export function stripReplyFileReferenceText(
  text: string,
  references = extractReplyFileReferences(text),
): string {
  return references.reduceRight(
    (labelText, reference) =>
      labelText.slice(0, reference.referenceStart) +
      (reference.label ?? "") +
      labelText.slice(reference.referenceEnd),
    text,
  );
}
