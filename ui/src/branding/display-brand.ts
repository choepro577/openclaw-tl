/** Product-owned copy is rebranded before interpolating any runtime data. */
export function brandProductCopy(value: string): string {
  // Attribution is source-owned legal copy, not the product name to relabel.
  if (/©|copyright/iu.test(value)) {
    return value;
  }
  return value.replace(/OpenClaw|\bClawd\b/g, "MAAP");
}

/** Presentation only: never use this value for storage, routing, or commands. */
export function maskEngineName(value: string): string {
  return value.replace(/openclaw/gi, "*******");
}
