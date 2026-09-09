// Exact QA session, read-only. Prints run/projection metadata, not internal prompt bodies.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { wrapPromptDataBlock } from "../src/agents/sanitize-for-prompt.ts";

const stateRoot = "/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime/state";
const parentAgent = "enterprise-personal-2ae2cbc2deecdb86fe86";
const suffix = process.argv[2];
assert.match(suffix ?? "", /^[a-f0-9-]{8,36}$/);
const databases = [];
const open = (path) => {
  const db = new DatabaseSync(path, { readOnly: true });
  databases.push(db);
  return db;
};
const text = (message) =>
  typeof message?.content === "string"
    ? message.content
    : (message?.content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("\n");
const events = (db, id) =>
  db
    .prepare("SELECT seq,event_json FROM transcript_events WHERE session_id=? ORDER BY seq")
    .all(id)
    .map((row) => ({ seq: row.seq, ...JSON.parse(row.event_json) }));
try {
  const registry = open(`${stateRoot}/state/openclaw.sqlite`);
  const parent = open(`${stateRoot}/agents/${parentAgent}/agent/openclaw-agent.sqlite`);
  const sessions = parent
    .prepare(
      "SELECT session_key,current_session_id,status FROM session_nodes WHERE session_key LIKE ?",
    )
    .all(`agent:${parentAgent}:dashboard:${suffix}%`);
  assert.equal(sessions.length, 1);
  const session = sessions[0];
  const parentEvents = events(parent, session.current_session_id);
  const children = registry
    .prepare(
      "SELECT run_id,child_session_key,created_at,started_at,ended_at,outcome_json,completion_announced_at,frozen_result_text FROM subagent_runs WHERE requester_session_key=? ORDER BY created_at",
    )
    .all(session.session_key);
  const proof = children.map((child) => {
    const agentId = child.child_session_key.split(":")[1];
    assert.match(agentId, /^[a-zA-Z0-9_-]+$/);
    const childDb = open(`${stateRoot}/agents/${agentId}/agent/openclaw-agent.sqlite`);
    const node = childDb
      .prepare("SELECT current_session_id,status FROM session_nodes WHERE session_key=?")
      .get(child.child_session_key);
    const childEvents = node ? events(childDb, node.current_session_id) : [];
    const replies = childEvents.filter(
      (event) =>
        event.message?.role === "assistant" &&
        event.message?.__openclaw?.runId === child.run_id &&
        text(event.message).trim(),
    );
    const captured = child.frozen_result_text ?? "";
    const projection = captured
      ? wrapPromptDataBlock({
          label: "Child result",
          text: captured,
          maxEscapedChars: 4096,
          truncationMarker: "\n[child result truncated]",
        })
      : "";
    const compactProjection = captured
      ? wrapPromptDataBlock({
          label: "Child result",
          text: captured,
          maxEscapedChars: 512,
          truncationMarker: "\n[child result truncated]",
        })
      : "";
    const fullReceipt = projection
      ? parentEvents.find(
          (event) => event.message?.role === "user" && text(event.message).includes(projection),
        )
      : undefined;
    const compactReceipt = compactProjection
      ? parentEvents.find(
          (event) =>
            event.message?.role === "user" && text(event.message).includes(compactProjection),
        )
      : undefined;
    const receipt = fullReceipt ?? compactReceipt;
    return {
      runId: child.run_id,
      agentId,
      childTranscriptId: node?.current_session_id,
      startedAt: child.started_at,
      endedAt: child.ended_at,
      outcome: child.outcome_json ? JSON.parse(child.outcome_json).status : null,
      independentAssistantRun: replies.length > 0,
      models: [
        ...new Set(replies.map((event) => `${event.message.provider}/${event.message.model}`)),
      ],
      capturedCharacters: captured.length,
      capturedSha256: createHash("sha256").update(captured).digest("hex"),
      fullChildProjectionReceivedByParent:
        Boolean(fullReceipt) && !projection.includes("[child result truncated]"),
      parentReceiptSequence: receipt?.seq ?? null,
      parentReceiptHasTruncation: receipt
        ? text(receipt.message).includes("[child result truncated]")
        : null,
      completionAnnouncedAt: child.completion_announced_at,
    };
  });
  console.log(
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        sessionKey: session.session_key,
        parentTranscriptId: session.current_session_id,
        parentStatus: session.status,
        childCount: children.length,
        proof,
        boundary:
          "Actual persisted QA run and parent receipt; no hidden reasoning, credentials or prompt bodies emitted",
      },
      null,
      2,
    ),
  );
} finally {
  for (const db of databases.reverse()) db.close();
}
