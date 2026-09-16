# Settlement reconciliation candidate

Base revision: `189a42ed9ad543e21efea5ac976c3b47642b881b`

## Cause addressed

When the registry observes a failed child after its in-memory completion update was lost or delayed, `resolveCompletionFromSessionEntry()` previously discarded the child session's persisted `lastRunError` and emitted the generic text `session completed before registry settled`. That made a real skill/provider failure look like an unexplained successful completion race.

## Bounded change

- Reuse the terminal `SessionEntry.lastRunError` already persisted by the canonical session lifecycle projection.
- Apply the same user-facing sanitizer, whitespace normalization, and 160 UTF-16 character cap used by gateway session lifecycle state.
- Use the neutral fallback `subagent session failed before registry settled` when the durable session has no reason.
- Do not reconstruct Enterprise identity, mint a requester session, bypass logout/revocation checks, replay business tools, or include the in-memory registry error as a second authority source.

The patch changes only:

- `src/agents/subagents/registry/subagent-session-reconciliation.ts`
- `src/agents/subagents/registry/subagent-session-reconciliation.test.ts`

This addresses truthful child terminal classification. It does not claim to restore requester delivery after a gateway restart when the Enterprise projection/session is no longer authorized; that remains a separate lifecycle boundary.

## Verification in scratch worktree

Worktree: `/tmp/openclaw-settlement-honest-wt.81591`

- `pnpm exec oxfmt --check ...` — passed.
- File-scoped `pnpm exec oxlint --tsconfig config/tsconfig/oxlint.core.json ... --type-aware --report-unused-disable-directives-severity error --threads=1` — passed.
- Targeted reconciliation run — 1 file, 9 tests passed.
- Reconciliation/persistence run — 3 files, 48 tests passed.
- Registry recovery set — 11 files, 178 tests passed.
- `pnpm tsgo:core` — passed with exit 0.
- `git diff --check` — passed.
- No gateway was started or restarted and no live source worktree was modified.

Patch SHA-256: `ad44f1cf02786c23c3a13399419b8be1cd117429e147404338d33a97cae82fa1`
