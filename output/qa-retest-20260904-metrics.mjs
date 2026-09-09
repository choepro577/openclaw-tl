import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Reads a previously captured artifact only. No database, browser, or runtime access.
// node output/qa-retest-20260904-metrics.mjs --pass=A --input=output/qa-retest-20260904-A-evidence.json
const outputDir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argument = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const textOf = (event) =>
  event.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
const eventTime = (event) =>
  Number.isFinite(event.messageTimestamp) ? event.messageTimestamp : Date.parse(event.at);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const countNames = (items) =>
  items.reduce((counts, item) => ({ ...counts, [item.name]: (counts[item.name] ?? 0) + 1 }), {});
const internalUserEvent = (event) =>
  event.role === "user" && event.content.some((block) => block.type === "internalEventMetadata");
const humanUserEvent = (event) =>
  event.role === "user" &&
  Boolean(event.userRunCorrelationId) &&
  !internalUserEvent(event) &&
  Boolean(textOf(event));

function run() {
  if (args.some((arg) => !/^--(?:pass|input)=.+$/.test(arg))) throw new Error("Unknown argument");
  const pass = argument("pass");
  const input = argument("input");
  if (!["A", "B", "C"].includes(pass) || !input)
    throw new Error("Require --pass=A|B|C and --input=<captured JSON>");
  const inputFile = resolve(input);
  if (!inputFile.startsWith(`${outputDir}/`))
    throw new Error("Input must be a QA artifact in this output directory");
  const evidence = readJson(inputFile);
  if (
    !Array.isArray(evidence.parent?.events) ||
    !Array.isArray(evidence.routing) ||
    !Array.isArray(evidence.children)
  )
    throw new Error("Input must be a full collector snapshot, not --summary or --part=parent");
  const variants = readJson(resolve(outputDir, "qa-retest-20260904-prompts.json"));
  const baseline = readFileSync(
    resolve(outputDir, "qa-combined-agent-knowledge-20260904-plan.md"),
    "utf8",
  );
  const baselinePrompts = [
    ...baseline.matchAll(/## (C\d{2})[^\n]*\n\n\*\*Prompt:\*\* “([^”]+)”/g),
  ].map((match) => ({ caseId: match[1], prompt: match[2] }));
  const prompts =
    pass === "A" ? [...baselinePrompts, variants.baselineAdditionalCase] : variants.passes[pass];
  if (prompts.length !== 11) throw new Error("Plan must contain exactly 11 prompts");
  const events = evidence.parent.events;
  const userEvents = events.filter(humanUserEvent);
  const cases = prompts.map((item) => {
    const matches = userEvents.filter((event) => textOf(event) === item.prompt);
    if (matches.length > 1)
      throw new Error(
        `Duplicate initial prompt for ${pass}-${item.caseId}; do not silently replace attempts`,
      );
    return { ...item, start: matches[0] };
  });
  const found = cases.filter((item) => item.start);
  if (found.some((item, index) => index > 0 && item.start.seq <= found[index - 1].start.seq))
    throw new Error("Case order differs from the plan");
  const unmatchedRouting = new Set(evidence.routing.map((event) => event.id));
  const unmatchedChildren = new Set(evidence.children.map((child) => child.runId));
  const summaries = cases.map((item) => {
    if (!item.start)
      return {
        caseId: item.caseId,
        observed: false,
        expectedPrompt: item.prompt,
        grade: "manual_review_required",
      };
    const next = found.find((other) => other.start.seq > item.start.seq);
    const endSeqExclusive = next?.start.seq ?? Number.POSITIVE_INFINITY;
    const caseEvents = events.filter(
      (event) => event.seq >= item.start.seq && event.seq < endSeqExclusive,
    );
    const users = caseEvents.filter(humanUserEvent);
    const hashes = new Set(
      users.flatMap((event) =>
        [event.userRunCorrelationId, event.runId].filter(Boolean).map(sha256),
      ),
    );
    const startMs = eventTime(item.start);
    const nextMs = next ? eventTime(next.start) : Date.parse(evidence.capturedAt);
    const routing = evidence.routing.flatMap((event) => {
      // Producer run hashes are strongest correlation. A temporal fallback is explicitly marked.
      const exact = event.parent_run_id_hash && hashes.has(event.parent_run_id_hash);
      const temporal =
        !event.parent_run_id_hash && event.created_at >= startMs && event.created_at < nextMs;
      if (!exact && !temporal) return [];
      unmatchedRouting.delete(event.id);
      return [
        {
          ...event,
          attribution: exact ? "exact_parent_session_and_run_hash" : "parent_session_and_time_only",
        },
      ];
    });
    const childIds = new Set(routing.flatMap((event) => event.childRunIds));
    const children = evidence.children.flatMap((child) => {
      const exact = childIds.has(child.runId);
      const temporal = child.createdAt >= startMs && child.createdAt < nextMs;
      if (!exact && !temporal) return [];
      unmatchedChildren.delete(child.runId);
      return [
        {
          runId: child.runId,
          childSessionKey: child.childSessionKey,
          createdAt: child.createdAt,
          startedAt: child.startedAt,
          endedAt: child.endedAt,
          outcome: child.outcome,
          attribution: exact
            ? "exact_parent_registry_and_routing_child_id"
            : "exact_parent_registry_and_creation_window_only",
        },
      ];
    });
    const calls = caseEvents.flatMap((event) =>
      event.content
        .filter((block) => block.type === "toolCall")
        .map((block) => ({ seq: event.seq, id: block.id, name: block.name })),
    );
    const results = caseEvents
      .filter((event) => ["toolResult", "tool"].includes(event.role))
      .map((event) => ({
        seq: event.seq,
        toolCallId: event.toolCallId,
        name: event.toolName,
        status: event.status ?? event.content.find((block) => block.status !== undefined)?.status,
        isError:
          event.isError ?? event.content.find((block) => block.isError !== undefined)?.isError,
        metadata: event.content,
      }));
    const sourceMetadata = results.flatMap((result) =>
      result.metadata.flatMap((block) =>
        [block.citation, ...(block.hits?.map((hit) => hit.citation) ?? [])].filter(Boolean),
      ),
    );
    const sources = [
      ...new Map(sourceMetadata.map((source) => [JSON.stringify(source), source])).values(),
    ];
    const answers = caseEvents
      .filter((event) => event.role === "assistant" && textOf(event))
      .map((event) => ({
        seq: event.seq,
        at: event.at,
        stopReason: event.stopReason,
        text: textOf(event),
      }));
    return {
      caseId: item.caseId,
      observed: true,
      promptMatchesPlanExactly: true,
      seqStart: item.start.seq,
      seqEnd: caseEvents.at(-1)?.seq,
      firstUserMessageAt: new Date(startMs).toISOString(),
      transcriptUserWrittenAt: item.start.at,
      lastVisibleAssistantAt: answers.at(-1)?.at,
      observedUserToLastAssistantMs: answers.length
        ? Date.parse(answers.at(-1).at) - startMs
        : null,
      userMessages: users.map((event, index) => ({
        seq: event.seq,
        kind: index === 0 ? "initial" : "followup",
        at: event.at,
        text: textOf(event),
      })),
      followupCount: users.length - 1,
      tools: {
        searchInvocations: calls.filter((call) => call.name === "enterprise_knowledge_search")
          .length,
        getInvocations: calls.filter((call) => call.name === "enterprise_knowledge_get").length,
        memoryInvocations: calls.filter((call) => call.name?.startsWith("memory_")).length,
        otherInvocations: calls.filter(
          (call) =>
            !["enterprise_knowledge_search", "enterprise_knowledge_get"].includes(call.name) &&
            !call.name?.startsWith("memory_"),
        ).length,
        countsByName: countNames(calls),
        calls,
        results,
      },
      sources,
      routing,
      acceptedChildCount: children.length,
      children,
      planAudits: evidence.planAudits.filter((event) => hashes.has(event.detail?.parentRunHash)),
      assistantVisibleMessages: answers,
      lastAssistantVisible: answers.at(-1) ?? null,
      grade: "manual_review_required",
      gradeBoundary:
        "Counts and last assistant text do not establish business completion, consent, correctness, or successful evidence transfer.",
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    pass,
    capturedAt: evidence.capturedAt,
    sessionKey: evidence.sessionKey,
    transcriptId: evidence.transcriptId,
    expectedCases: 11,
    observedCases: found.length,
    allInitialPromptsMatchExactly: found.length === 11,
    totalUserMessages: userEvents.length,
    internalUserRoleEventCount: events.filter(internalUserEvent).length,
    unclassifiedUserRoleEvents: events
      .filter(
        (event) => event.role === "user" && !humanUserEvent(event) && !internalUserEvent(event),
      )
      .map((event) => ({ seq: event.seq, at: event.at, bodyOmitted: true })),
    totalFollowups: summaries.reduce((count, item) => count + (item.followupCount ?? 0), 0),
    counts: evidence.counts,
    cases: summaries,
    unattributedRouting: evidence.routing.filter((event) => unmatchedRouting.has(event.id)),
    unattributedChildren: evidence.children
      .filter((child) => unmatchedChildren.has(child.runId))
      .map((child) => ({ runId: child.runId })),
    environmentFingerprint: evidence.environment?.fingerprintSha256,
    warnings: [
      "SQLite snapshots are observations, not authorization.",
      "Run ID hashes are correlation only, never execution authority.",
      "Timing starts at user message timestamp, not merely transcript insertion; routing can precede the latter.",
      "All case grades require manual comparison to the fixed oracle and visible UI.",
      "A response ending in another permission question is not task completion.",
    ],
  };
}

try {
  console.log(JSON.stringify(run(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("[qa-retest-metrics] FAILED (exit 1)");
  process.exitCode = 1;
}
