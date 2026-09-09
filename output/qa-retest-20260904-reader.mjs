import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// A read-only, exact-session QA export; never export hidden reasoning or source bodies.
// Usage: node output/qa-retest-20260904-reader.mjs --session-suffix=ba0561c5 --part=all
// Parts: parent, children, routing, environment, all. Add --summary for compact traces.
const parentAgent = "enterprise-personal-2ae2cbc2deecdb86fe86";
const accountId = "68264167-a2d8-48b1-a00a-d31a06a7fd92";
const argumentsList = process.argv.slice(2);
const value = (name) =>
  argumentsList
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
// Explicit QA root keeps isolated-gateway evidence separate from the live baseline.
const stateRoot = value("state-root") ?? "/Users/hieunguyenduc/.openclaw";
if (!stateRoot.startsWith("/")) throw new Error("Expected absolute state root");
const stateDb = `${stateRoot}/state/openclaw.sqlite`;
const part = value("part") ?? "all";
const summary = argumentsList.includes("--summary");
const quote = (input) => `'${String(input).replaceAll("'", "''")}'`;
const hash = (input) => createHash("sha256").update(String(input)).digest("hex");
const query = (db, sql) =>
  JSON.parse(
    execFileSync("sqlite3", ["-readonly", "-json", db, sql], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }) || "[]",
  );
const agentDb = (agent) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(agent)) throw new Error("Invalid agent identifier");
  return `${stateRoot}/agents/${agent}/agent/openclaw-agent.sqlite`;
};
const parse = (input) => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};
const redact = (input) =>
  String(input)
    .replace(/cite[\s\S]*?/g, "[citation reference omitted]")
    .replace(
      /(?:file:\/\/)?\/(?:Users|private|var|tmp|home|workspace)\/[^\s)\]"'<>]+/g,
      "[private path omitted]",
    )
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+\S+)/g, "[credential omitted]")
    .replace(
      /\b(?:ekc|ek|citation|evidence)[._:-][A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*/gi,
      "[citation token omitted]",
    )
    .replace(/(?:[A-Za-z0-9_-]{30,}\.){1,2}[A-Za-z0-9_-]{30,}/g, "[signed token omitted]");
const strings = (input) =>
  Array.isArray(input) ? input.filter((item) => typeof item === "string") : [];
const select = (input, keys) =>
  Object.fromEntries(
    keys.flatMap((key) => {
      const field = input?.[key];
      if (typeof field === "string") return [[key, redact(field)]];
      if (typeof field === "number" || typeof field === "boolean" || field === null)
        return [[key, field]];
      if (Array.isArray(field) && field.every((item) => typeof item === "string"))
        return [[key, field.map(redact)]];
      return [];
    }),
  );
const citation = (input) =>
  input ? select(input, ["sourceTitle", "zoneLabel", "sourceVersion", "publishedAt"]) : undefined;

function toolResultProjection(message, text) {
  const result = parse(text);
  const metadata = message.details ?? message.metadata;
  const status = result?.status ?? metadata?.status;
  const projection = {
    type: "toolResultMetadata",
    status,
    isError: message.isError ?? result?.isError,
    rawTextSha256: hash(text),
    rawTextCharacters: text.length,
    bodyOmitted: true,
  };
  if (message.toolName?.startsWith("enterprise_knowledge_")) {
    return {
      ...projection,
      ...select(result, ["error", "code", "reasonCode", "partial"]),
      citation: citation(result?.citation),
      hits: result?.hits?.map((hit) => ({ citation: citation(hit.citation), score: hit.score })),
      evidenceCharacters: typeof result?.evidence === "string" ? result.evidence.length : undefined,
      evidenceSha256: typeof result?.evidence === "string" ? hash(result.evidence) : undefined,
    };
  }
  return {
    ...projection,
    ...select(result, ["status", "code", "reasonCode", "accepted", "childRunId", "runId"]),
  };
}

function readSession(agent, sessionKey) {
  const db = agentDb(agent);
  const nodes = query(
    db,
    `SELECT session_key,current_session_id,status FROM session_nodes WHERE session_key=${quote(sessionKey)}`,
  );
  if (nodes.length !== 1) return { agent, sessionKey, missing: true, events: [] };
  const rows = query(
    db,
    `SELECT seq,event_json,created_at FROM transcript_events WHERE session_id=${quote(nodes[0].current_session_id)} ORDER BY seq`,
  );
  const events = rows.flatMap((row) => {
    const event = parse(row.event_json);
    const message = event?.message;
    if (!message || !["user", "assistant", "toolResult", "tool"].includes(message.role)) return [];
    const content =
      typeof message.content === "string"
        ? [{ type: "text", text: message.content }]
        : (message.content ?? []);
    const projected = content.flatMap((block) => {
      if (block.type === "text") {
        if (message.role === "toolResult" || message.role === "tool")
          return [toolResultProjection(message, String(block.text ?? ""))];
        const rawText = String(block.text ?? "");
        if (
          rawText.includes("<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>") ||
          rawText.startsWith("[Subagent Context]") ||
          rawText.startsWith("[Internal task completion event]")
        )
          return [
            {
              type: "internalEventMetadata",
              bodyOmitted: true,
              sha256: hash(rawText),
              characters: rawText.length,
              hasDelegatedTask: rawText.includes("[Subagent Task]"),
            },
          ];
        return [
          {
            type: "text",
            text: redact(block.text ?? ""),
            phase: parse(block.textSignature)?.phase,
          },
        ];
      }
      if (["toolCall", "toolcall", "tool_use"].includes(block.type)) {
        const args = block.arguments ?? block.input;
        return [
          {
            type: "toolCall",
            id: block.id,
            name: block.name,
            argumentKeys: args && typeof args === "object" ? Object.keys(args) : [],
            argumentsOmitted: true,
          },
        ];
      }
      if (block.type === "toolResult")
        return [
          toolResultProjection(
            { ...message, toolName: block.name },
            JSON.stringify(block.text ?? block.content ?? null),
          ),
        ];
      return [];
    });
    if (!projected.length) return [];
    return [
      {
        seq: row.seq,
        at: event.timestamp,
        messageTimestamp: message.timestamp,
        recordedAt: row.created_at,
        role: message.role,
        model: message.model,
        provider: message.provider,
        toolName: message.toolName,
        toolCallId: message.toolCallId,
        stopReason: message.stopReason,
        isError: message.isError,
        status: message.details?.status ?? message.metadata?.status,
        runId: message.__openclaw?.runId,
        userRunCorrelationId:
          message.role === "user" &&
          typeof message.idempotencyKey === "string" &&
          /^[a-f0-9-]{36}:user$/.test(message.idempotencyKey)
            ? message.idempotencyKey.slice(0, -5)
            : undefined,
        content: projected,
      },
    ];
  });
  return { ...nodes[0], agent, events };
}

function environment() {
  const resourceKey = `agent:personal:${accountId}`;
  const zoneIds = query(
    stateDb,
    `SELECT zone_id FROM enterprise_knowledge_agent_zone_bindings WHERE agent_resource_key=${quote(resourceKey)}`,
  ).map((row) => row.zone_id);
  const zoneWhere = zoneIds.length ? `zone_id IN (${zoneIds.map(quote).join(",")})` : "0";
  const zones = query(
    stateDb,
    `SELECT z.id,z.slug,z.name,z.status,z.revision,z.access_revision,z.source_set_revision,z.build_revision,z.active_publication_id,z.egress_policy,z.updated_at,p.publication_number,p.generation_id,p.vector_status,p.published_at FROM enterprise_knowledge_zones z LEFT JOIN enterprise_knowledge_publications p ON p.id=z.active_publication_id WHERE z.id IN (${zoneIds.length ? zoneIds.map(quote).join(",") : "NULL"}) ORDER BY z.id`,
  );
  const tableExists =
    query(
      stateDb,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='enterprise_knowledge_evidence_transfer_grants'",
    ).length === 1;
  const result = {
    account: query(
      stateDb,
      `SELECT id,username,display_name,role,enabled,personal_agent_enabled,policy_revision FROM enterprise_accounts WHERE id=${quote(accountId)}`,
    ),
    parentAgent,
    zones,
    directBindings: query(
      stateDb,
      `SELECT zone_id,agent_resource_key,created_at FROM enterprise_knowledge_agent_zone_bindings WHERE ${zoneWhere} ORDER BY zone_id,agent_resource_key`,
    ),
    evidenceTransferTableExists: tableExists,
    evidenceTransferGrants: tableExists
      ? query(
          stateDb,
          `SELECT zone_id,target_agent_resource_key,created_at FROM enterprise_knowledge_evidence_transfer_grants WHERE ${zoneWhere} ORDER BY zone_id,target_agent_resource_key`,
        )
      : [],
    delegationPolicy: query(
      stateDb,
      "SELECT rollout,router_model,auto_threshold,clarify_threshold,minimum_margin,max_delegates_per_turn,event_retention_days,revision,updated_at FROM enterprise_delegation_policy WHERE singleton_id=1",
    ),
    delegationOverrides: query(
      stateDb,
      `SELECT agent_resource_key,mode,revision,updated_at FROM enterprise_delegation_overrides WHERE account_id=${quote(accountId)} ORDER BY agent_resource_key`,
    ),
    agentEntitlements: query(
      stateDb,
      `SELECT resource_id,resource_state,effect,updated_at FROM enterprise_entitlements WHERE account_id=${quote(accountId)} AND resource_type='agent' ORDER BY resource_id`,
    ),
    personalProfileRevision: query(
      stateDb,
      `SELECT schema_version,revision,updated_at FROM enterprise_personal_agent_profiles WHERE account_id=${quote(accountId)}`,
    ),
    sharedRelationshipRevisions: query(
      stateDb,
      `SELECT agent_id,schema_version,revision,updated_at FROM enterprise_shared_agent_relationships WHERE account_id=${quote(accountId)} ORDER BY agent_id`,
    ),
    excluded: ["profile_json", "credentials", "published source bodies", "private paths"],
  };
  return { ...result, fingerprintSha256: hash(JSON.stringify(result)) };
}

function compact(session) {
  return {
    current_session_id: session.current_session_id,
    status: session.status,
    missing: session.missing,
    eventCount: session.events.length,
    toolCalls: session.events.flatMap((event) =>
      event.content
        .filter((block) => block.type === "toolCall")
        .map((block) => ({ seq: event.seq, name: block.name })),
    ),
    toolResults: session.events
      .filter((event) => ["toolResult", "tool"].includes(event.role))
      .map((event) => ({
        seq: event.seq,
        name: event.toolName,
        isError: event.isError,
        status: event.status,
        content: event.content,
      })),
    last: session.events.slice(-3),
  };
}

function main() {
  const knownArguments = /^(?:--(?:state-root|session-key|session-suffix|part)=.+|--summary)$/;
  if (argumentsList.some((argument) => !knownArguments.test(argument)))
    throw new Error("Unknown argument");
  if (!["all", "parent", "children", "routing", "environment"].includes(part))
    throw new Error("Invalid --part");
  const key = value("session-key");
  const suffix = value("session-suffix");
  if (Boolean(key) === Boolean(suffix))
    throw new Error("Specify exactly one --session-key or --session-suffix");
  if (key && !new RegExp(`^agent:${parentAgent}:dashboard:[a-f0-9-]{36}$`).test(key))
    throw new Error("Session key outside exact parent scope");
  if (suffix && !/^[a-f0-9-]{8,36}$/.test(suffix)) throw new Error("Invalid session suffix");
  const lookup = key
    ? `session_key=${quote(key)}`
    : `session_key LIKE ${quote(`agent:${parentAgent}:dashboard:${suffix}%`)}`;
  const matches = query(
    agentDb(parentAgent),
    `SELECT session_key,current_session_id FROM session_nodes WHERE ${lookup}`,
  );
  if (matches.length !== 1)
    throw new Error(`Exact session resolution requires one match; found ${matches.length}`);
  const parentKey = matches[0].session_key;
  const sessionHash = hash(parentKey);
  const capturedAt = new Date().toISOString();
  const base = {
    capturedAt,
    parentAgent,
    accountId,
    sessionKey: parentKey,
    transcriptId: matches[0].current_session_id,
    sessionHash,
    collectionMode: "sqlite3 -readonly; no runtime mutations",
    privateBodiesOmitted: true,
  };
  if (part === "environment") return { ...base, environment: environment() };
  const children = query(
    stateDb,
    `SELECT run_id,child_session_key,requester_session_key,created_at,started_at,session_started_at,ended_at,outcome_json,ended_reason,requester_settle_wake_status,completion_announced_at,frozen_result_text FROM subagent_runs WHERE requester_session_key=${quote(parentKey)} ORDER BY created_at`,
  ).map((child) => {
    const outcome = parse(child.outcome_json);
    const transcript = readSession(child.child_session_key.split(":")[1], child.child_session_key);
    return {
      runId: child.run_id,
      childSessionKey: child.child_session_key,
      createdAt: child.created_at,
      startedAt: child.started_at,
      sessionStartedAt: child.session_started_at,
      endedAt: child.ended_at,
      registryAccepted: true,
      outcome: select(outcome, ["status", "reason", "error", "timedOut", "aborted"]),
      endedReason: child.ended_reason,
      requesterSettleWakeStatus: child.requester_settle_wake_status,
      completionAnnouncedAt: child.completion_announced_at,
      frozenVisibleResult: child.frozen_result_text ? redact(child.frozen_result_text) : null,
      transcript: summary ? compact(transcript) : transcript,
    };
  });
  const routing = query(
    stateDb,
    `SELECT id,account_id,parent_run_id_hash,shared_agent_ids_json,child_run_ids_json,outcome,decision_source,reason_code,confirmation_state,policy_revision,latency_ms,created_at FROM enterprise_delegation_events WHERE parent_session_key_hash=${quote(sessionHash)} AND account_id=${quote(accountId)} ORDER BY created_at`,
  ).map((event) => ({
    ...select(event, [
      "id",
      "account_id",
      "parent_run_id_hash",
      "outcome",
      "decision_source",
      "reason_code",
      "confirmation_state",
      "policy_revision",
      "latency_ms",
      "created_at",
    ]),
    targetAgentIds: strings(parse(event.shared_agent_ids_json)),
    childRunIds: strings(parse(event.child_run_ids_json)),
  }));
  const planAudits = query(
    stateDb,
    `SELECT id,action,target_id,outcome,after_json,created_at FROM enterprise_audit_events WHERE actor_account_id=${quote(accountId)} AND action LIKE 'delegation.plan.%' AND json_extract(after_json,'$.sessionHash')=${quote(sessionHash)} ORDER BY created_at`,
  ).map((event) => ({
    ...select(event, ["id", "action", "target_id", "outcome", "created_at"]),
    detail: select(parse(event.after_json), [
      "planId",
      "planRevision",
      "handling",
      "targetAgentIds",
      "targetCount",
      "policyRevision",
      "accountPolicyRevision",
      "parentRunHash",
      "sessionHash",
    ]),
  }));
  const counts = {
    routingEvents: routing.length,
    selectedPlans: planAudits.filter((event) => event.action === "delegation.plan.selected").length,
    confirmedPlans: planAudits.filter((event) => event.action === "delegation.plan.confirmed")
      .length,
    acceptedChildren: children.length,
    endedChildren: children.filter((child) => child.endedAt !== null).length,
    routedChildIds: [...new Set(routing.flatMap((event) => event.childRunIds))].length,
  };
  if (part === "children") return { ...base, children, counts };
  if (part === "routing") return { ...base, routing, planAudits, counts };
  const parent = readSession(parentAgent, parentKey);
  if (part === "parent") return { ...base, parent: summary ? compact(parent) : parent, counts };
  return {
    ...base,
    parent: summary ? compact(parent) : parent,
    children,
    routing,
    planAudits,
    counts,
    environment: environment(),
    evidenceAuditBoundary:
      "Private evidence audits do not persist a parent-session or child-run join. They are not exported by account/time inference.",
  };
}

try {
  console.log(JSON.stringify(main(), null, 2));
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  console.error("[qa-retest-reader] FAILED (exit 1)");
  process.exitCode = 1;
}
