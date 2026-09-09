# Delegation UI restoration — scoped QA

## Scope and evidence boundary

- Restore the existing specialist lifecycle card; no routing, model, permission, approval, API, database, or execution changes.
- Before: Chrome user tab on QA port 19789 shows the C04 host acknowledgment and knowledge calls, but no lifecycle card. Screenshot captured in this task.
- Public tasks identify the child run and requester session, but do not identify the acknowledgment's parent run. Do not fabricate that relationship from the acknowledgment text or a time-window guess.
- Present real task records chronologically in the transcript, with stable task identity. Chronological placement is not a claim of parent-run linkage.
- Reuse existing lifecycle renderer and its status/delivery labels; keep operator controls hidden.

## QA inventory (before implementation)

| Case | Steps                                                                                                                | Required observable result                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI01 | Load a host-managed handoff with real task records, without enterprise_delegate tool output                          | Existing lifecycle card is visible; original conversation unchanged                                                                                                                         |
| UI02 | Update a task from running to completed, then delivered, without changing transcript messages                        | Working, completed/waiting-for-return, and returned are distinct; no stale spinner                                                                                                          |
| UI03 | Load two handoffs in one conversation                                                                                | Each task appears once at its recorded chronology; no inference from Vietnamese wording                                                                                                     |
| UI04 | Supply a foreign-session task, non-subagent task, or missing creation timestamp                                      | No misattributed task card                                                                                                                                                                  |
| UI05 | Load legacy enterprise_delegate output alongside task records                                                        | Existing card retained, no duplicate task presentation                                                                                                                                      |
| UI06 | Exercise failed, blocked, cancelled, timed-out, and delivery-failed records                                          | Accurate failure state; never a false successful return                                                                                                                                     |
| UI07 | Reload the existing Chrome C03/C04 session                                                                           | One Finance task for C03 and Contract/Finance tasks for C04 visible from real persisted records                                                                                             |
| UI08 | Inspect normal and narrow viewport; long names; reduced motion                                                       | Readable cards, no horizontal clipping, reduced-motion behavior preserved                                                                                                                   |
| UI09 | Collapse/expand existing Worked/knowledge sections and reload                                                        | Controls keep working; no operator task rail or new execution controls                                                                                                                      |
| UI10 | Open each lifecycle row on a card                                                                                    | All three rows open the exact persisted task; Finance must not open Contract and vice versa                                                                                                 |
| UI11 | Open an Enterprise specialist task whose child session is not readable by the requester                              | Show the requester-authorized task prompt/result; do not fail by attempting cross-agent chat history                                                                                        |
| UI12 | Open a specialist whose full result and compact list summary have the same timestamp                                 | Preserve and display the full lookup result, including after a later task event; never fall back to the 120-character summary                                                               |
| UI13 | Collapse the two consecutive Enterprise Knowledge entries, then open the evidence entry at desktop and narrow widths | Both collapsed entries share one horizontal row when space permits; each summary stays on one compact line; narrow content wraps safely; expanded source/evidence uses a full row unchanged |

## Test value gate

Existing coverage only feeds enterprise_delegate tool results. The regression test must use host-response messages and authoritative task events at the public transcript-render boundary, fail before the restoration, and pass after it. Reuse lifecycle cases rather than duplicating all state tests. No test-only production seam.

## Results

- UI01–UI03: PASS. Regression initially failed with 0 cards instead of 2. After the fix, the same public transcript-render test shows independent task rows in creation order and transitions running → completed/waiting for delivery → delivered without changing messages. Numeric and ISO timestamp forms are supported.
- UI04: PASS. Narration alone, foreign-session/non-subagent records, missing timestamps, pre-history records, and missing child-session identity do not produce an attributed card.
- UI05: PASS. Legacy tool result still renders one card, with exact agent/run identity used to avoid duplication.
- UI06: PASS through the reused lifecycle suite (queued/running/completed/failed/cancelled/timed-out, blocked/partial failure, delivery failure, escaping). No new state machine was introduced.
- UI07: PASS on the actual existing Chrome user tab, session `e4bfd79e-6068-4ced-8ae2-5d126ce033ce`, after reloading the final bundle. C03 Finance and C04 Contract/Finance cards match the three existing persisted task records. No new agent invocation was needed for this UI-only check.
- UI08: PASS at the user's existing desktop viewport. Each card measured 768px wide with no horizontal overflow. The new full-row button treatment fits inside the existing card; the existing reduced-motion rule is unchanged. Narrow/mobile and OS reduced-motion visual testing were not run; no claim is made for those cases.
- UI09: PASS. Worked and knowledge disclosures expand/collapse normally; cards remain separate from the collapsed reasoning/tool frame. No operator controls were added. Chrome is left at the restored C04 cards; admin settings were not changed.
- UI10: PASS. `Task handed to specialist`, `Specialist completed the task`, and `Result returned to Personal Agent` are semantic buttons only when an exact `TaskSummary` is available. The regression test clicks all three Finance rows and verifies three opens of `finance-task`, never the Contract task. Direct Chrome clicks on all three rows also retained the same `Chuyên gia Tài chính & Ngân sách · Completed · Subagent` panel. Legacy rows without exact task identity stay non-interactive rather than guessing.
- UI11: PASS in the actual Chrome session. Opening Finance task `bdbc5d1d-738e-4ff8-82a8-ce73bd4638a8` shows `Chuyên gia Tài chính & Ngân sách · Completed · Subagent`, plus its bounded `PROMPT` and `OUTPUT`. The previously observed `Could not load task transcript.` failure is gone. Cause: the old detail UI requested the specialist's private child-session `chat.history`; Enterprise detail now uses the existing requester-scoped `tasks.get` record. The panel measured 479px with `clientWidth=scrollWidth=479px`; the 768px card and panel had no horizontal overflow.
- UI12: PASS. The task ledger contains 2,233 characters for the Finance result, but the UI previously discarded the lookup-only `result` while reconciling an equal-timestamp compact snapshot, then displayed its 120-character `progressSummary` ending in `…`. The private detail cache now retains both `prompt` and `result` across initial reconciliation and subsequent lifecycle events. Live Chrome shows all 2,233 characters, with vertical scrolling to the final recommendation and no horizontal overflow.
- UI13: PASS. There were two presentation causes: each title/status pair used a two-row grid, and runtime placed Search/Evidence in separate full-width tool shells. After the scoped repair, both collapsed entries have the same `top=407.203125`, the second starts 16px after the first, each summary is 26px high, the combined activity body is 42px high, and `scrollWidth=clientWidth=702px`. The 320px regression fixture keeps long status text inside the row via ellipsis and permits wrapping instead of clipping. Direct Chrome clicks reopened `Evidence retrieved`; its shell expanded to the full 702px row with no horizontal overflow and retained all 938 evidence characters.

## Validation commands and outcomes

- `node scripts/run-vitest.mjs ui/src/pages/chat/components/chat-delegation-timeline.test.ts ui/src/pages/chat/components/chat-delegation-card.test.ts ui/src/pages/chat/components/chat-transcript-render.test.ts ui/src/pages/chat/components/chat-tool-cards.outcome.test.ts ui/src/pages/chat/components/chat-task-detail.test.ts ui/src/pages/chat/components/chat-task-detail-state.test.ts`: **55 passed**, six files, final run.
- Focused result-retention regression: the pre-fix run failed because `taskDetails.result` was `undefined`; after the fix, `chat-background-tasks`, task data/detail, task-detail state, and delegation timeline suites passed **80/80**.
- `pnpm tsgo:ui`: PASS after fixing timestamp union typing and safe indexed access.
- `pnpm lint:ui:styles`: PASS.
- Scoped `node scripts/run-oxlint.mjs --tsconfig config/tsconfig/oxlint.core.json ...`: PASS.
- Targeted oxfmt and `git diff --check`: PASS.
- `node scripts/check-changed.mjs --dry-run -- <8 scoped files>`: correctly selected the `coreTests` and `ui` lanes.
- The focused `check-changed` rerun for the result-retention owners passed conflict-marker and max-lines checks, then stopped at the same repository-wide pre-existing assertion-safety drift; neither changed UI file appears in that failure list.
- `pnpm ui:build` in the existing QA snapshot: PASS, including finalized sidecars and performance budgets. The final served main asset is `assets/index-Cf1VWaLX.js`.
- QA gateway remained PID 25940 on port 19789; there was no backend restart or lasting state/config/schema mutation. Port 18789 was untouched.
- The earlier full `check-changed` run stopped at pre-existing assertion-safety baseline drift across unrelated Enterprise/backend files; the scoped UI files were not the reported cause. Conflict-marker and max-lines checks passed first.
- `lint:ui:i18n` reports pre-existing raw-copy drift in Enterprise Admin plugins/knowledge-access views. This change reuses existing labels and changes no translations/baselines.
- `$autoreview` ran on an isolated snapshot of only the scoped UI diff, not the unrelated dirty workspace: `autoreview --mode local --no-web-search --prompt <scoped UI contract>`. Final result: clean at its default **P0-only** threshold with confidence 0.93; TruffleHog clean. This is not a claim of a full-priority audit. The referenced `behavior-validator` skill is not installed; direct Chrome QA supplied the running-product evidence instead.
- A fresh isolated `$autoreview` of the result-retention patch also returned clean at the default **P0-only** threshold with confidence 0.99; TruffleHog clean.
- Compact Knowledge rows: `pnpm --dir ui test src/pages/chat/components/chat-knowledge-card.test.ts src/pages/chat/chat-responsive.browser.test.ts`: **111 passed**, two files. The final regression mirrors the real runtime's two sibling tool shells and covers compact rows at 320px/1366px, the same-row desktop layout, and full-width expanded evidence.
- Compact Knowledge rows: `pnpm tsgo:ui`, scoped oxlint, scoped stylelint, targeted oxfmt, and the QA snapshot `pnpm ui:build`: PASS. The rebuilt UI is served as `assets/index-C0YJUzpw.js` on the existing QA gateway.
- The compact-row `check-changed` run passed conflict-marker and max-lines gates, then stopped at the repository-wide pre-existing assertion-safety drift; neither scoped Knowledge file appears in that failure list.
- Compact Knowledge rows: the final mandatory isolated `$autoreview --mode local --no-web-search` covered the real separate-tool-shell layout and returned clean at the default **P0-only** threshold with confidence 0.98; TruffleHog clean.

## Scope / limitations

- Changed production owners: delegation card/timeline projection and task-detail presentation. Tests cover the timeline interaction and Enterprise requester-scoped detail path.
- Positive production delta is the missing UI task-to-timeline adapter, shared renderer entrypoint, and task-detail display selection; no new runtime policy or lifecycle state machine.
- The result-retention follow-up is production +10 net lines and tests +10 net lines. The production growth is one shared private-detail merge helper used by both initial lookup and event reconciliation; duplicating the field policy at both call sites would reintroduce the same omission risk.
- Cards are independent task activity, positioned between intact transcript frames by recorded creation time. They do not assert a missing parent-run relationship and do not mutate transcript grouping.
- Data remains bounded by the existing task-list/history availability. Missing task records are not reconstructed from assistant prose.
- The detail action passes the exact persisted task id into the pre-existing sidebar. It does not create, retry, cancel, re-route, or otherwise mutate a specialist task.
- Source and QA UI are updated. No commit, push, production deployment, or unrelated cleanup was performed.
- The compact Knowledge change is presentation-only: the renderer adds a Knowledge-only class, while CSS compacts each summary and lets consecutive Knowledge shells share a row. Tool payload parsing, retrieval, status labels, and disclosure behavior are unchanged; an expanded item still takes a full row.
- Final Chrome QA reused the existing user tab on port 19789. A temporary local-QA authentication row was deleted and the temporarily substituted QA password hash was restored; port 18789, admin settings, business data, and schema were untouched.
