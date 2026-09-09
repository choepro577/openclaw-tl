import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// Read-only, scoped evidence projection. Excludes credentials and hidden reasoning.
const stateDb = "/Users/hieunguyenduc/.openclaw/state/openclaw.sqlite";
const parentAgent = "enterprise-personal-2ae2cbc2deecdb86fe86";
const parentKey =
  "agent:enterprise-personal-2ae2cbc2deecdb86fe86:dashboard:0c6bce71-9c17-41c1-af76-222d313d081a";
const full = process.argv.includes("--full");
const summary = process.argv.includes("--summary");
const part = process.argv.find((v) => v.startsWith("--part="))?.slice(7);
function projectedText(text, name) {
  if (!name?.startsWith("enterprise_knowledge_")) return full ? text : text?.slice(0, 1800);
  try {
    const v = JSON.parse(text);
    const citation = (c) =>
      c && {
        sourceTitle: c.sourceTitle,
        zoneLabel: c.zoneLabel,
        sourceVersion: c.sourceVersion,
        publishedAt: c.publishedAt,
      };
    if (v.hits)
      return JSON.stringify({
        hits: v.hits.map((h) => ({ citation: citation(h.citation), score: h.score })),
        coverage: v.coverage,
        partial: v.partial,
        warnings: v.warnings,
      });
    if (v.evidence)
      return JSON.stringify({
        evidence: v.evidence,
        citation: citation(v.citation),
        trust: v.trust,
      });
  } catch {}
  return text;
}
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
function query(db, sql) {
  return JSON.parse(
    execFileSync("sqlite3", ["-readonly", "-json", db, sql], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    }) || "[]",
  );
}
function session(agent, key) {
  const db = `/Users/hieunguyenduc/.openclaw/agents/${agent}/agent/openclaw-agent.sqlite`;
  const nodes = query(
    db,
    `SELECT session_key,current_session_id,status FROM session_nodes WHERE session_key=${q(key)}`,
  );
  if (!nodes.length) return { agent, key, missing: true };
  const events = query(
    db,
    `SELECT seq,event_json,created_at FROM transcript_events WHERE session_id=${q(nodes[0].current_session_id)} ORDER BY seq`,
  );
  return {
    ...nodes[0],
    agent,
    events: events.flatMap((row) => {
      const e = JSON.parse(row.event_json),
        m = e.message;
      if (!m) return [];
      const content =
        typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content || [];
      const safe = content
        .filter((c) => ["text", "toolCall", "toolcall", "tool_use", "toolResult"].includes(c.type))
        .map((c) => {
          if (c.type === "text") return { type: "text", text: projectedText(c.text, m.toolName) };
          if (c.type === "toolResult")
            return { type: c.type, id: c.id, name: c.name, text: c.text ?? c.content };
          const args = c.arguments ?? c.input;
          return {
            type: c.type,
            id: c.id,
            name: c.name,
            arguments: args?.citationId
              ? { reference: "signed reference omitted; corresponding result retained" }
              : args?.decisionId
                ? { decision: "ephemeral decision ID omitted" }
                : args,
          };
        });
      if (!safe.length) return [];
      return [
        {
          seq: row.seq,
          at: e.timestamp,
          role: m.role,
          model: m.model,
          provider: m.provider,
          toolName: m.toolName,
          toolCallId: m.toolCallId,
          stopReason: m.stopReason,
          content: safe,
        },
      ];
    }),
  };
}
const children = query(
  stateDb,
  `SELECT run_id,child_session_key,requester_session_key,task,created_at,ended_at,outcome_json,ended_reason,frozen_result_text FROM subagent_runs WHERE requester_session_key=${q(parentKey)} ORDER BY created_at`,
);
const publications = query(
  stateDb,
  `SELECT z.name,z.active_publication_id,z.egress_policy,p.publication_number,p.vector_status,z.updated_at FROM enterprise_knowledge_zones z JOIN enterprise_knowledge_publications p ON p.id=z.active_publication_id ORDER BY z.name`,
);
const bindings = query(
  stateDb,
  "SELECT zone_id,agent_resource_key FROM enterprise_knowledge_agent_zone_bindings ORDER BY zone_id,agent_resource_key",
);
const sessionHash = createHash("sha256").update(parentKey).digest("hex");
const routing = query(
  stateDb,
  `SELECT id,shared_agent_ids_json,child_run_ids_json,outcome,decision_source,reason_code,confirmation_state,latency_ms,created_at FROM enterprise_delegation_events WHERE parent_session_key_hash=${q(sessionHash)} ORDER BY created_at`,
);
const data = {
  capturedAt: new Date().toISOString(),
  parent: session(parentAgent, parentKey),
  children: children.map((c) => ({
    ...c,
    transcript: session(c.child_session_key.split(":")[1], c.child_session_key),
  })),
  routing,
  publications,
  bindings,
};
const compact = (s) => ({
  id: s.current_session_id,
  status: s.status,
  toolCalls: s.events.flatMap((e) =>
    e.content.filter((c) => c.type === "toolCall").map((c) => ({ seq: e.seq, name: c.name })),
  ),
  last: s.events.slice(-3),
});
const selected =
  part === "parent"
    ? { capturedAt: data.capturedAt, parent: data.parent }
    : part === "children"
      ? { capturedAt: data.capturedAt, children: data.children }
      : part === "environment"
        ? { capturedAt: data.capturedAt, routing, publications, bindings }
        : data;
console.log(
  JSON.stringify(
    summary
      ? {
          capturedAt: data.capturedAt,
          parent: compact(data.parent),
          children: data.children.map((c) => ({
            id: c.run_id,
            end: c.ended_at,
            transcript: compact(c.transcript),
          })),
          routing: routing.slice(-4),
        }
      : selected,
    null,
    2,
  ),
);
