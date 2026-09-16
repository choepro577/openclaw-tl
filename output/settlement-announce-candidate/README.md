# Settlement announce candidate

Base commit: 189a42ed9ad (detached scratch worktree)
Patch: `settlement-announce.patch`

## Root cause addressed

When a child run completed while the gateway was restarting, the announce flow could call `chat.history` through the gateway to recover child output. After restart, that RPC could fail with `enterprise_session_invalid`, producing `Subagent announce failed: ... unauthorized`. The later registry reconciliation then surfaced the generic `session completed before registry settled` message.

The child session owner was already available to lifecycle cleanup as a persisted session entry. The candidate passes a concrete `SessionTranscriptRuntimeTarget` (agent id, child session id, child session key, and resolved store path) into announce output capture. Capture and every bounded retry therefore read the private SQLite transcript directly and do not issue the child `chat.history` RPC.

## Changes

- `src/agents/subagents/registry/subagent-registry-lifecycle-delivery.ts`
  - Extracted the existing safe target derivation used by completion freezing into `resolveSubagentSessionTranscriptTarget`.
  - Preserves a complete internal recovery target as authoritative.
  - For ordinary cleanup, uses only the already loaded child owner row's session id; it does not invent an id or read a successor when the owner row is absent.
  - Keeps the prior read-only store lookup only for the existing completion-freeze path.
- `src/agents/subagents/registry/subagent-registry-lifecycle-announce-cleanup.ts`
  - Resolves the child target once only for announce-required cleanup and passes it to the announce flow.
- `src/agents/subagents/announce/subagent-announce.ts`
  - Threads the verified target through timeout progress, first output capture, and retry capture.
- `src/agents/subagents/announce/subagent-announce-output.ts`
  - Keeps the target across retry attempts; a supplied target never falls through to gateway history.
- Focused regressions:
  - `src/agents/subagents/announce/subagent-announce-output.test.ts`
  - `src/agents/subagents/registry/subagent-registry-lifecycle.test.ts`

## Scope and boundary

This fixes child transcript recovery during announce. It does not bypass admission or authorization and does not infer restart recovery for a child run. It also does not change the separate requester delivery mirror, which still uses the gateway and can independently fail when the Enterprise projection is unavailable after restart. Existing lifecycle owner checks remain in force; if cleanup ownership changes, the announce path suppresses child session effects as before.

## Validation

- Scratch worktree only: `/tmp/openclaw-settlement-announce-wt.TcViRs`.
- `git diff --check`: passed.
- `git apply --check`: passed against the current shared checkout.
- Vitest and `pnpm gateway:watch` were intentionally not run per parent coordination.
