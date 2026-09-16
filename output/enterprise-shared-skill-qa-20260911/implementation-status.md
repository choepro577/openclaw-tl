> Cập nhật cuối: xem [biên bản bản build cuối](nghiem-thu-ban-cuoi.md). Các trạng thái bên dưới ghi nhận từng mốc lịch sử; các ca live chỉ đọc trên bản cuối đã đạt ngày 12/09, gồm đúng phiên lỗi cũ; xem biên bản cuối để biết phạm vi và giới hạn.

# Shared Agent implementation and acceptance status

Status: implementation in progress; deployed to gateway 18789 at the user's explicit request; full acceptance pending.

Contract: an ordinary user granted a Shared Agent inherits that agent's tools,
plugins and skills in its scope, with existing business identity, global policy,
and write approval preserved. Direct and delegated use must agree. Existing
sessions refresh on the next turn and stale callbacks must fail after revocation.

Baseline source: 2d6f02d14f5e60869a0a3864fb3365fa3aa233e9 with existing dirty work preserved.
Operator gateway: 18789. The isolated acceptance gateway used during fixture
preparation was 18889; it is stopped. Current browser evidence is from the
user's existing Chrome profile against 18789.

## Reproductions captured

- Direct Shared factory originally returned no skill_script tool while delegated
  mode did. Regression failed before removing the child-only condition.
- Replaying one write tool call originally executed a real fixture script twice
  (counter 11 instead of 1). Admitted-run memoization regression now passes.
- A bound tool initially ran after capability revision changed. Added live
  capability fence; retained-tool regression now passes.
- Original failing child had no tool calls. Orchestration succeeded/delivered
  was not business success; baseline evidence is in session-evidence/.
- SQLite deferred FK checks do not stop DROP parent from applying SET NULL to
  child approval references. Ownership migration must preserve those references.

## Verification completed

- Runtime regression group: 45/45 passed, including actual sandbox reader and script execution.
- Support: execution 14, sandbox 8, harness 39, runtime preflight 1 passed.
- Migration/plugin/gateway: 38/38 passed, including seeded legacy schema migration and preserved approval links.
- Codex dynamic tools: the earlier 89/89 shard and tool approval e2e 100/100
  passed; the latest focused Codex shard is 147/147 (`/tmp/shared-agent-final-codex-tests.log`).
- Latest plugin-focused verification is 14/14 passed.
- UI and HTTP shards passed on the earlier build. The latest focused plugin and
  Codex shards report 14/14 and 147/147; final tests, typecheck, lint, and
  autoreview are still running against the source-frozen tree.
- Whole-workspace tsgo fails on baseline diagnostics; no new production-source errors were found in the changed paths. This is not a global typecheck pass.
- The earlier autoreview found no accepted actionable findings; the current
  final autoreview has not closed yet.
- Final pnpm build passed. Build identity and artifact hashes are in verification/.
- The isolated 18889 gateway was stopped after its separate browser lane; it is
  not an acceptance target.

## Live acceptance in progress

Delegated HR and the remaining delegated read-only business cases,
existing-session permission changes, restart/resume, plugin identity isolation,
and approval transport/local replay fixtures remain to be proven. The direct
PO, delegated PO, and direct HR lookups are recorded separately below; no
overall business acceptance is claimed. The user explicitly removed live PO
write, approval, replay, and cleanup from this acceptance lane.
The live permission-flow audit found zero `shared_agent` plugin grants: two
account-scoped rows (`test-echo` revoked and `diffs` unavailable) and one
active account-scoped Personal Agent `gmail` grant. Live shared-plugin
inheritance is therefore N/A for the currently configured PO/HR agents, rather
than blocked by the copied `diffs` fixture. Automated A/B shared-grant
regression remains required; private grants must never be auto-promoted. The
native hosted-identity limitation remains explicit. The older
`plugin-readiness.json` is a historical snapshot and must not override the
current read-only permission-flow audit.

## User-directed acceptance on 18789

The user explicitly requested existing Chrome and gateway 18789, authorizing
its rebuild/restart. Gateway 18889 was stopped. Before restarting 18789, nine
SQLite databases and config were backed up at
`~/.openclaw/backups/shared-agent-20260911-220458`; integrity checks passed.
Post-start migration check has zero FK violations and preserves private scope
and approval links. Gateway 18789 was restarted at 23:10 and currently serves
`dist/build-info.json` build
`2026.8.1-2d6f02d14f5e-2026-09-11T16-05-29.194Z` with Codex 0.148.0.

Fresh direct Shared PO session `767c9833` succeeded: read SKILL.md, two router
searches, search_po_sites, get_po_draft_list; five successful tool results,
seven drafts returned for 2026-09-11. Secure PO login completed in the existing
Chrome using the user-provided test account. Evidence: operator-direct-po-success.json.

Delegated PO lookup is now accepted after ordered router recovery: the child
completed the final draft-list call with session status `success`, and the
operator verified the complete seven-row result in the parent UI. The first
draft-list attempt failed because router discovery had not completed; it was a
recoverable ordering error, not a permission denial. See
`handoff-live-acceptance.md` for the ordered SQLite evidence and remaining
gates.

Fresh direct HR session `eaeab4c7-70ae-4332-8a6a-7972f5c7f8ce`, run
`042612e1-5293-4fe1-9b95-62f3ec99d338`, passed: router plus
`get_departments` returned 16 departments, with evidence in
`session-evidence/operator-direct-hr-success.json` and
`screenshots/operator-direct-hr.png`.

Two additional fresh read-only PO sessions also passed under the current
Personal Agent policy checks: deny-policy session
`41cdb361-8578-4309-91cb-f002813d95dc` (run
`a66f11b3-373a-4c9d-bc27-f7fc53ad7c9f`) and Personal-disabled session
`68c8b48c-9528-4694-808d-d189002800a4` (run
`ef24d93e-bf08-41fe-becc-c5d6542497ed`). Each returned seven drafts without an
authorization error. Personal Agent was restored to enabled at policy revision 18. The deny test remains at revision 4 pending its final repro/restore.

The original Personal deny delegation still fails because the raw profile
revision and projected child revision diverged (`DELEGATION_CAPABILITY_CHANGED`);
the source fix and rebuilt final repro are pending.

The old-session marker now passed after the latest build with history retained;
the subsequent removal turn blocked execution with `SKILL_ENTRYPOINT_INVALID`.
Removal enforcement is present, but error classification still needs the
capability-change/not-granted result.

Still pending: delegated HR, live revision/revocation, generic skill,
plugin/native connector identity isolation, common approval transport, and
local automated write replay fixtures. The historical approved write was
cleaned up except for the `PriceManualID` side effect, so it remains partial
cleanup rather than exact restoration. No further live PO write, approval, or
cleanup is allowed. The latest captured common guard rejected the approval
request as unauthorized at result sequence 123, created no approval row, and
ran no PO write; approval transport repair is in progress. The source diagnosis
is a missing resolver in the common approval request scope, alongside the host
clone's missing Enterprise metadata. The corresponding source fix remains
pending tests/build.
