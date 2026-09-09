import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const suffix = process.argv[2];
const fromSeq = Number(process.argv[3] ?? "0");
if (
  !suffix ||
  !/^[a-f0-9-]{8,36}$/u.test(suffix) ||
  !Number.isSafeInteger(fromSeq) ||
  fromSeq < 0
) {
  throw new Error("Usage: node output/qa-case-evidence-20260904.mjs SESSION_SUFFIX [FROM_SEQ]");
}
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("./qa-retest-20260904-reader.mjs", import.meta.url)),
    "--state-root=/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime/state",
    `--session-suffix=${suffix}`,
    "--part=all",
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
if (result.status !== 0) throw new Error("Read-only QA evidence collector failed");
const evidence = JSON.parse(result.stdout);
const events = evidence.parent.events.filter((event) => event.seq >= fromSeq);
console.log(
  JSON.stringify(
    {
      capturedAt: evidence.capturedAt,
      sessionKey: evidence.sessionKey,
      transcriptId: evidence.transcriptId,
      status: evidence.parent.status,
      messages: events
        .filter((event) => event.role !== "toolResult")
        .map((event) => ({
          seq: event.seq,
          at: event.at,
          role: event.role,
          runId: event.runId ?? event.userRunCorrelationId,
          model: event.model,
          stopReason: event.stopReason,
          text: event.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("\n"),
          tools: event.content
            .filter((block) => block.type === "toolCall")
            .map((block) => block.name),
        })),
      sources: events
        .filter((event) => event.role === "toolResult")
        .map((event) => ({
          seq: event.seq,
          tool: event.toolName,
          isError: event.isError,
          citations: event.content.flatMap((block) =>
            block.citation ? [block.citation] : (block.hits ?? []).map((hit) => hit.citation),
          ),
        })),
      routing: evidence.routing,
      counts: evidence.counts,
      environmentFingerprint: evidence.environment.fingerprintSha256,
      boundary:
        "QA read-only; hidden reasoning, tool arguments, source bodies and credentials omitted",
    },
    null,
    2,
  ),
);
