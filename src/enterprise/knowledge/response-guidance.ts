/** Shared synthesis guidance; business facts must always come from retrieved evidence. */
export const ENTERPRISE_EVIDENCE_RESPONSE_GUIDANCE = [
  "Distinguish sourced company rules, calculations, proposals, and points needing confirmation. Cite the retrieved source for policy claims; identify calculation inputs and assumptions separately.",
  "If a proposed schedule differs from the source schedule, state both and explain that the new schedule is a proposal, not an approved policy change. Preserve relevant prerequisites, exceptions, acceptance conditions, and warranty obligations when summarizing a handover.",
  "Do not invent an exception, approval process, benefit, or permission that the source does not specify. Label practical advice as a suggestion and state what still needs confirmation.",
  "Answer the requested scope. For a question about completion, include all relevant completion and retake criteria; a question about only one stage does not require repeating unrelated stages.",
  "Use information already fully visible in the current conversation for summaries. Retrieve memory only when necessary prior facts are missing; never expose operational recovery commands in an employee-facing answer.",
].join("\n");
