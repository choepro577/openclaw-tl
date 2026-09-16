> Cập nhật cuối: xem [biên bản bản build cuối](nghiem-thu-ban-cuoi.md). Các trạng thái bên dưới ghi nhận từng mốc lịch sử; các ca live chỉ đọc trên bản cuối đã đạt ngày 12/09, gồm đúng phiên lỗi cũ; xem biên bản cuối để biết phạm vi và giới hạn.

# Live acceptance handoff

This is an evidence handoff for the shared-agent capability repair. It records
what the current artifacts prove and what remains unproven. It is not a full
acceptance sign-off.

The current runtime was rebuilt and gateway 18789 was restarted at 23:10.
The authoritative current build is `dist/build-info.json`:
`2026.8.1-2d6f02d14f5e-2026-09-11T16-05-29.194Z`. Earlier direct PO evidence
was captured on the previous build; the HR and old-session evidence below was
captured against the current build.

The user has now set a strict boundary for all live business acceptance:
read-only requests only. No further live PO create, update, delete, approval,
replay, or cleanup operation may be run. The earlier authorized fixture write
and its partial `PriceManualID` cleanup remain historical evidence only.

## What was actually observed

| Lane                                            | Evidence                                                                                                                                                                                   | Result                                                                                                                                                                                                                                                                                                                                              | Boundary                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh direct PO session                         | `session-evidence/operator-direct-po-success.json`                                                                                                                                         | **Pass for this direct PO read**. The fresh session materialized `read`, `session_status`, and `skill_script`; it executed `read`, two `router_tool_search` calls, `search_po_sites`, and `get_po_draft_list`. All five tool results succeeded and the UI returned seven test drafts for the captured date.                                         | This proves one ordinary-user direct PO read through gateway 18789 and Codex 0.148.0/build `2026.8.1-2d6f02d14f5e-2026-09-11T14-43-08.416Z`, before the latest rebuild. It does not prove HR, plugin inheritance, revision, restart, revocation, or write approval.                                                                                                          |
| Fresh direct HR session                         | `session-evidence/operator-direct-hr-success.json`, `screenshots/operator-direct-hr.png`                                                                                                   | **Pass for this direct HR read**. Fresh session `eaeab4c7-70ae-4332-8a6a-7972f5c7f8ce`, run `042612e1-5293-4fe1-9b95-62f3ec99d338`, materialized `read`, `session_status`, and `skill_script`; it called `router_tool_search` and `get_departments`, returning 16 departments. No authorization error was recorded.                                 | This proves direct HR capability on the current build. Delegated HR and the remaining connector/plugin cases are still open.                                                                                                                                                                                                                                                 |
| Personal Agent direct PO with deny policy       | `session-evidence/operator-personal-deny-direct-success.json`                                                                                                                              | **Pass, read-only**. Fresh session `41cdb361-8578-4309-91cb-f002813d95dc`, run `a66f11b3-373a-4c9d-bc27-f7fc53ad7c9f`, completed router plus PO read operations and returned seven drafts. The Personal Agent deny policy was active for the test revision.                                                                                         | This proves a direct shared PO read remains available while the Personal Agent has the tested deny entries. It does not prove delegated deny behavior.                                                                                                                                                                                                                       |
| Personal Agent disabled direct PO               | `session-evidence/operator-personal-disabled-direct-success.json`                                                                                                                          | **Pass, read-only**. Fresh session `68c8b48c-9528-4694-808d-d189002800a4`, run `ef24d93e-bf08-41fe-becc-c5d6542497ed`, completed the same PO read and returned seven drafts while Personal Agent was disabled during the run.                                                                                                                       | Personal Agent was restored to enabled with policy revision 18 after this lane.                                                                                                                                                                                                                                                                                              |
| Delegated PO parent                             | `session-evidence/operator-delegated-po-parent.json`                                                                                                                                       | **Pass for the delegated PO lookup**. The parent called `enterprise_delegate` and `progress_card`; both parent tool results were successful, there was no authorization error, and the final parent UI showed the complete seven-row result verified by the operator.                                                                               | The parent trajectory records orchestration tools rather than the child's business calls; child SQLite evidence below is the authoritative call sequence.                                                                                                                                                                                                                    |
| Delegated PO child                              | `session-evidence/operator-delegated-po-child.json` plus read-only child SQLite events                                                                                                     | **Pass after recovery**. The child materialized the shared catalog, read the skill, executed router search, site search, and draft-list lookup, then retried the router in the required order and completed a successful final draft-list call. The child session ended with `status=success`; the operator verified seven drafts in the parent UI. | The first draft-list attempt failed because router discovery had not yet been completed. This is a recoverable ordering error, not a permission denial and not evidence that the final business lookup failed. The aggregate evidence still contains one `success=false` entry, so verdicts must follow the ordered events and final result rather than a raw failure count. |
| Old-session marker revision, historical attempt | `session-evidence/operator-old-session-marker-failure.json`                                                                                                                                | **Historical fail before the latest fix**. History was retained and a capability revision was present, but the model reported the marker as not granted and did not execute it.                                                                                                                                                                     | Retain this as the original regression evidence; it is superseded by the current success below for the added-marker case.                                                                                                                                                                                                                                                    |
| Old-session marker added                        | `session-evidence/operator-old-session-marker-success.json`                                                                                                                                | **Pass**. The existing PO session preserved user history, refreshed the capability, and the marker tool result succeeded under the current build.                                                                                                                                                                                                   | This proves an already-open session can gain the shared skill on the next turn.                                                                                                                                                                                                                                                                                              |
| Old-session marker removed                      | `session-evidence/operator-old-session-marker-removed.json`, `verification/operator-marker-removal.json`                                                                                   | **Enforcement observed; error classification pending**. The marker was removed from the shared skill configuration and the next turn was blocked with `SKILL_ENTRYPOINT_INVALID`.                                                                                                                                                                   | The removed entry did not execute, but the final error should be classified as a capability-change/not-granted result rather than a generic invalid-entrypoint message before this gate is closed.                                                                                                                                                                           |
| Personal deny delegation revision               | `session-evidence/operator-personal-deny-child-failed.json`, `session-evidence/operator-personal-deny-delegation-failed.json`, `verification/operator-personal-deny-revision-failure.json` | **Fail pending source fix**. The original parent deny case observed `DELEGATION_CAPABILITY_CHANGED` because the raw profile revision and projected child revision diverged.                                                                                                                                                                         | The source fix and a rebuilt final repro are pending. The Personal deny test remains at policy revision 4 until the owner completes its final repro/restore; this lane performs no further live mutation.                                                                                                                                                                    |
| Pre-fix failure                                 | `session-evidence/baseline-failing-child.json`, `baseline-failing-parent.json`                                                                                                             | **Reproduction captured**. The child evidence recorded no materialized catalog and no tool calls; the parent had no trajectory tool call despite an orchestration transcript.                                                                                                                                                                       | The artifact records what was observed, not proof that the model's internal `ALL_TOOLS` state was empty. This is the original symptom class: orchestration can look complete while the child has no recorded business operation.                                                                                                                                             |
| Earlier skill authorization failure             | `session-evidence/prior-skill-script-auth-fail-v2.json`                                                                                                                                    | **Fail**. `skill_script` was the only failed tool result after `read`; transcript code was `SKILL_NOT_GRANTED`, with no router call.                                                                                                                                                                                                                | Keep this separate from the current direct pass. It demonstrates the permission error that the repair must make impossible for a legitimately shared skill.                                                                                                                                                                                                                  |

The parent and child session/run identifiers remain in the JSON evidence for
correlation. The shared artifacts intentionally contain no passwords, cookies,
authorization headers, or raw business arguments.

The read-only child SQLite trace confirms the ordered sequence: `read` success;
two `router_tool_search` successes; `search_po_sites` success; an initial
`get_po_draft_list` failure; a further `router_tool_search` success; and a
final `get_po_draft_list` success. The session ended with `status=success`,
`timedOut=false`, and no prompt error. Only operation names, argument-key
shapes, and status flags were inspected; business arguments and result rows
were not serialized.

## Approval evidence and its limit

`verification/shared-agent-approval2-tests.log` reports one Vitest shard with
100/100 tests passing. That shard includes the common-owner/common-reviewer
routing case for Shared Agent writes and unknown skill operations. This is
source-level approval coverage, not proof that a live delegated write was
approved, executed exactly once, and restored. No live write acceptance should
be marked complete from this log alone.

The same log starts by rebuilding because `dist` was stale for a dirty watched
tree. Its 100/100 result therefore must not be used as the runtime/version
identity for the deployed gateway; use the recorded gateway build identity in
`operator-direct-po-success.json` and the verification artifacts instead.

The prior live `SKILL_NOT_GRANTED` result is an authorization failure, not a
common-approval result. Keeping those two categories separate matters: the
first is capability projection/admission; the second is write policy and
approval lifecycle. A green approval unit shard cannot mask a failed live
capability projection.

The earlier direct `save_po_product` write succeeded, but no common approval UI
event or common-approval database row was recorded for it. That historical run
proves tool execution only; it does not prove the approval lifecycle. The
current root diagnosis is that the host clone lacked Enterprise metadata, and
the source fix for that metadata path is still pending tests.

The latest captured common write-guard run is a separate, improved result: the guard
did execute, but the approval request at result sequence 123 was rejected as
`unauthorized`; no new approval row was created and no PO write ran. The model
then described this as a PO permission failure, which is the wrong boundary:
the observed failure was approval transport authorization. The approval agent
is fixing that transport path. This run is therefore a safe block, not an
approval-pass or business-write-pass. No further live write or approval test is
allowed under the current read-only boundary.

The current source diagnosis for the approval transport is a missing resolver
in the common request scope. The source fix is pending tests/build; it must be
validated through local automated fixtures rather than another live PO write.

Latest focused verification also reports plugin tests `14/14` and Codex tests
`147/147` in `/tmp/shared-agent-final-codex-tests.log`. These are test evidence
for the current source/build lane; they do not close the live approval or
native-connector gates.

Approval/replay behavior may continue through local automated fixtures only.
The previous authorized write and partial cleanup remain recorded for audit;
there must be no additional live PO cleanup attempt.

## Write and restoration finding

The authorized fixture write was made through the public `save_po_product`
skill operation. The local `po-mcp-server` contract currently exposes only
`code`, `productId`, `qty`, `price`, and optional `note` for that operation
(`../../../po-mcp-server/src/tools/save-po-product.tool.ts:7-16`); its schema
rejects undeclared properties (`../../../po-mcp-server/src/tools/po-tool-write-proxy-base.ts:85-107,123-145`).
The other nearby operations do not provide an exact field restore:

- `update_po_price` accepts only CSV `siteIds`, `productIds`, and
  `supplierIds` (`../../../po-mcp-server/src/tools/update-po-price.tool.ts:7-14`).
- `update_po_draft` accepts only `code`, `sign`, `sDate`, and `supplierId`
  (`../../../po-mcp-server/src/tools/update-po-draft.tool.ts:7-15`).
- `delete_po_product` deletes an item and is not a field restore
  (`../../../po-mcp-server/src/tools/delete-po-product.tool.ts:7-13`).
- `get_po_detail` is read-only (`../../../po-mcp-server/src/tools/get-po-detail.tool.ts:7-14`).

The generic `http_request` tool can send arbitrary HTTP methods, but no
authoritative backend route or request schema for `PriceManualID` exists in
this checkout. Calling it with an invented route or body would create a new
unverified write path and is expressly not evidence of restoration.

The private before/after files are mode 600 and contain two items each. A
metadata-only inspection found zero non-empty `PriceManualID` values in the
original and one non-empty value in the file labelled restored. The cleanup
read-back was verified empty for the temporary change; the only remaining
side effect is the `PriceManualID` difference. That is partial cleanup, not
exact restoration. The exact value was not printed. Do not repeat the write or
attempt a delete as a workaround.

The source-level next step is to obtain the PO backend controller/OpenAPI or a
sanitized network capture for the existing edit UI that explicitly defines the
item-field update and its `PriceManualID` semantics. No live request should be
used to discover or validate that contract under the current user boundary.
Approval, replay suppression, and exact restoration can continue in local
automated fixtures only. The historical write lane remains incomplete because
the remaining `PriceManualID` side effect was not restored.

## Required completion gates

The current overall status remains **full acceptance pending**. Before handoff
to production, rerun fresh real sessions and record the materialized catalog,
actual calls, run status, and business result for:

1. direct PO and direct HR for the same ordinary user;
2. Personal Agent delegation to PO and HR, including child tool calls and the
   result envelope returning to the parent;
3. gateway restart followed by a fresh delegated session;
4. adding and removing a shared skill in an already-open session, with the
   next turn refreshing the projection while retaining history;
5. revoking a shared grant during an in-flight run, proving the capability
   fence stops the business tool;
6. a second user with the same shared-agent grant, while proving private
   plugin grants are not silently promoted;
7. local automated approval/replay fixtures, including rejection and
   idempotency paths; no live PO write is part of this acceptance.

Every row needs a fresh session id, build/runtime identity, materialized tool
catalog, at least one expected tool call, a successful result envelope, and no
authorization error. A parent delegation that settles with zero child tool
calls remains a failure.

The read-only permission-flow audit of the live 18789 database found two
account-scoped plugin grants (`test-echo` revoked and `diffs` unavailable), one
active account-scoped Personal Agent Codex grant (`gmail`), and zero
`shared_agent` plugin grants. Therefore live shared-plugin inheritance is
**not applicable** to the currently configured PO/HR agents; it is not blocked
by the copied `diffs` fixture. Automated A/B shared-agent grant regression
coverage remains required, and private account/Personal grants must never be
auto-promoted into a shared agent.

The older `plugin-readiness.json` snapshot predates this audit and records a
historical active `diffs` row; it must not override the current read-only DB
result.

The explicit native-hosted-identity limitation remains: no live native
connector inheritance claim is made without a configured shared-agent native
grant and a valid hosted identity. The current source tree is frozen while
the final tests, typecheck, lint, and autoreview complete; later source fixes
have not been built into this runtime.
