// Read-only, exact-session QA proof. Prints metadata/booleans only, never prompt bodies.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { wrapPromptDataBlock } from "../src/agents/sanitize-for-prompt.ts";
import { buildChildCompletionFindings } from "../src/agents/subagents/announce/subagent-announce-output.ts";

const stateRoot = "/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime/state";
const childRunId = "e23bea00-aa9d-45e8-a04e-734e9cf910f0";
const parentTranscriptId = "901d4a92-9c9b-409b-9421-57e78f5ab2c2";
const registry = new DatabaseSync(`${stateRoot}/state/openclaw.sqlite`, { readOnly: true });
const parent = new DatabaseSync(
  `${stateRoot}/agents/enterprise-personal-2ae2cbc2deecdb86fe86/agent/openclaw-agent.sqlite`,
  { readOnly: true },
);
try {
  const row = registry.prepare("SELECT * FROM subagent_runs WHERE run_id = ?").get(childRunId);
  assert.ok(row?.frozen_result_text);
  const eventRow = parent
    .prepare("SELECT event_json FROM transcript_events WHERE session_id = ? AND seq = 17")
    .get(parentTranscriptId);
  assert.ok(eventRow);
  const content = JSON.parse(eventRow.event_json).message.content;
  const historicalWake =
    typeof content === "string"
      ? content
      : content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");
  const oldProjection = wrapPromptDataBlock({
    label: "Child result",
    text: row.frozen_result_text,
    maxEscapedChars: 512,
    truncationMarker: "\n[child result truncated]",
  });
  const patchedFindings = buildChildCompletionFindings([
    {
      childSessionKey: row.child_session_key,
      task: row.task,
      label: row.label,
      createdAt: row.created_at,
      execution: { endedAt: row.ended_at, outcome: JSON.parse(row.outcome_json) },
      completion: { resultText: row.frozen_result_text },
    },
  ]);
  assert.ok(patchedFindings);
  const proof = {
    evidenceKind:
      "read-only captured runtime input through current source formatter; not a deployed-runtime retest",
    childRunId,
    parentTranscriptId,
    parentSequence: 17,
    capturedChildSha256: createHash("sha256").update(row.frozen_result_text).digest("hex"),
    capturedChildCharacters: row.frozen_result_text.length,
    historicalWakeCharacters: historicalWake.length,
    historicalWakeContainsExactCanonical512Projection: historicalWake.includes(oldProjection),
    historicalWakeHas294: historicalWake.includes("294"),
    historicalWakeHas120: historicalWake.includes("120"),
    patchedFindingsCharacters: patchedFindings.length,
    patchedFindingsWithinExisting4096: patchedFindings.length <= 4_096,
    patchedFindingsTruncated: patchedFindings.includes("[child result truncated]"),
    patchedFindingsHasAllResults: ["204", "294", "120"].every((text) =>
      patchedFindings.includes(text),
    ),
    patchedFindingsContainsExactChildText: patchedFindings.includes(row.frozen_result_text),
  };
  assert.equal(proof.historicalWakeContainsExactCanonical512Projection, true);
  assert.equal(proof.historicalWakeHas294, false);
  assert.equal(proof.historicalWakeHas120, false);
  assert.equal(proof.patchedFindingsWithinExisting4096, true);
  assert.equal(proof.patchedFindingsTruncated, false);
  assert.equal(proof.patchedFindingsHasAllResults, true);
  assert.equal(proof.patchedFindingsContainsExactChildText, true);
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
} finally {
  registry.close();
  parent.close();
}
