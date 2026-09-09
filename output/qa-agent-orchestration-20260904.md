# Natural-language agent orchestration QA — 2026-09-04

## Kết quả hiện tại

Đã sửa và kiểm thử lại luồng hiểu câu hỏi tự nhiên, tiếp tục sau xác nhận/bổ sung thông tin, hủy và đổi chủ đề, phân biệt câu dịch với yêu cầu phân tích, truyền đủ dữ liệu cho từng chuyên gia, trả kết quả về chat gốc và tránh thẻ/lỗi hiển thị trùng.

Lượt đa chuyên gia mới nhất `a3b2f86c` đã đạt cả bằng chứng Chrome lẫn đầu vào/đầu ra thật của từng agent: câu hỏi và câu đồng ý không dấu, không gọi tên chuyên gia; tài chính tự tính hòa vốn 150 triệu/tháng và 226 triệu còn lại sau 3 tháng; hợp đồng phân tích đúng ba điều khoản `MIX-QA-911`. Không dùng kết quả do Personal Agent tự viết thay làm bằng chứng specialist thành công.

**Chưa tuyên bố hoàn chỉnh:** đang chờ người dùng xác nhận bật lại riêng `sessions_yield` của hieu và chốt ai được duyệt thao tác có thay đổi dữ liệu. Không tự nới quyền, chuyển cookie đăng nhập hoặc dùng đồng ý bàn giao thay cho đồng ý thực thi. Luồng phê duyệt hiện vẫn bị chặn và phân loại nhầm cancellation thành expiry.

Hồi quy: **738 backend + 257 UI = 995 ca đạt**; core typecheck đạt. Đây là số ca tự động, không phải 995 lượt người dùng. Các lỗi lint/type/gate toàn repo có sẵn và giới hạn bằng chứng được ghi cụ thể bên dưới.

## Scope and live identity

- Local gateway: http://127.0.0.1:18789.
- Chrome profile Hiếu, existing user tab 1369521191, signed in as Hiếu DZ (@hieu).
- Separate admin tab 1369521200 in the same Chrome profile, verified Admin (@admin).
- Leave knowledge-testing tabs 1369521197 and 1369521194 untouched. No knowledge publications or agent permissions changed by this task.
- Test prompts contain synthetic business data, never explicit specialist names. No real transactions, messages, or business-record mutations requested.
- Existing working-tree modifications preserved. Backend restart authorized by user only once, after both QA lanes are idle.

## QA inventory

| Scenario                                   | Expected behavior                                                                    | Evidence                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Simple arithmetic                          | Personal Agent responds directly; no specialist overhead                             | User answer and admin routing log                        |
| Natural finance planning                   | Select assigned finance specialist; honor configured handoff consent                 | User proposal, follow-up, delegation activity, admin log |
| Natural contract review                    | Select contract specialist; request configured missing input; continue when supplied | User chat, specialist activity, admin log                |
| Multidomain task                           | Recognize independent work; respect per-agent mode; preserve all requested parts     | User chat and named task activity                        |
| Refusal/cancellation                       | Clear pending handoff; do not spawn                                                  | User confirmation and admin log                          |
| Topic change after clarification           | Do not feed unrelated new task to old specialist                                     | Follow-up output and admin log                           |
| Simple transformation with domain keywords | Do not treat quoted example text as delegation intent                                | User output and admin log                                |
| Follow-up to completed analysis            | Retain relevant task context without replaying old authority                         | User output and activity                                 |
| Rendering                                  | Composer, routing activity and result remain visible; no technical tokens leaked     | Reviewed live screenshots                                |

## Baseline observations

### 1. Arithmetic — PASS

Session `28096472`: “Tính nhanh giúp mình: 18 người, mỗi người 250.000đ thì tổng là bao nhiêu? Trả lời một dòng thôi.”

Result: `18 × 250.000đ = 4.500.000đ.` No specialist activity. Admin logs local routing.

### 2. Finance consent continuity — FAIL

Session `c7917e52`, 09:31–09:32 local time.

Synthetic plan: 600 million starting cash; 360 million setup; 60 million deposit; 25 million rent, 70 million payroll, 15 million other monthly fixed costs; cost of goods 35%; expected revenue 180 million, initial downside 120 million. Request break-even, cash runway, improvements, without company-policy lookup.

1. Router correctly asks consent to use Chuyên gia Tài chính & Ngân sách.
2. Admin specialist profile is configured `Always ask before delegating`.
3. User replies only `Đồng ý, làm giúp mình nhé.`
4. Personal Agent performs analysis itself; no specialist run.
5. Admin log: 09:31 `clarified / ai / handoff_confirmation_required`; 09:32 `local / ai / router_no_candidate`. Delegated count remains 14.

The numeric answer was reasonable, but the promised orchestration failed. Source cause: confirmation is emitted without retaining the proposed handoff for the next user turn.

### 3. Contract missing-input continuity — FAIL

Session `e5917f26`: synthetic website terms (80% prepayment, unlimited supplier delay, customer cancellation forfeits all paid money, supplier liability capped at 5 million). Asked for risks and negotiation wording, no agent name.

System asks `Bạn cần kiểm tra hợp đồng số nào?`; user supplies `WEB-QA-904 nhé.`

Personal Agent answers locally instead of resuming the specialist task. Admin: 09:33 `clarified / ai / router_ambiguous`; 09:34 `local / ai / router_no_candidate`. Same lost-continuation boundary as consent.

### 4. Complete contract request — ROUTING PASS, RECOVERED-ERROR DISPLAY FAIL

Session `793d7eb0`, 09:36–09:37. Prompt includes `Mã hợp đồng: WEB-QA-905`, 100 million website contract, 80% prepayment, unlimited delay, cancellation forfeiture, liability capped at 5 million. No specialist named.

1. Correct contract specialist starts automatically; admin records `delegated / ai / delegate_started`.
2. User sees handing off, working, completed, waiting for result, returned result.
3. Child completes at 09:37:00; parent provider attempt gets a WebSocket error at 09:37:11 and its automatic retry succeeds at 09:37:38.
4. Useful analysis returns to the original chat, but the earlier bubble `The agent run failed before producing a reply.` remains visible.
5. Read-only persisted transcript proves a thinking-only assistant `stopReason:error` followed by successful text without an intervening user message. Existing same-turn repair only recognized the stream-error sentinel.

The nearby internal `chat.history unauthorized` log is separate from the provider error. Its likely source is an unnecessary prior-delivery-mirror probe after intentional requester-yield non-delivery; exact stack not logged, so this attribution is source-and-timing inference.

### 5. Follow-up summarization — PASS

Same session: ask to reduce the analysis to three polite points, explicitly not send anywhere. Returns three relevant draft points in about five seconds, without a new specialist or external send. Admin 09:38 `local / ai / router_no_candidate`.

### 6. Multidomain consent then cancellation — PARTIAL / CANCELLATION PASS

Session `02f62f0a`, 09:43. Synthetic storefront plan combines cash runway with rent-contract risks (`Mã hợp đồng: MIX-QA-906`). Admin event selects both finance and contract; system asks permission for finance. User then says not to transfer, drops the old request, and asks only to make a quotation-request sentence polite. System returns the requested one-sentence rewrite, no specialist activity. Completion of both specialist tasks still needs post-fix verification.

### 7. Quoted contract keywords for translation — ROUTER FAIL, UI OUTPUT PASS

Session `4d3a6d8c`, 09:44. Prompt only asks to translate the quoted configured use-case `Kiểm tra điều khoản phạt và trách nhiệm trong hợp đồng`, explicitly excludes contract analysis. Returns `Review of Penalty Clauses and Liability in the Contract`, without visible specialist activity. Subsequent admin readback shows `clarified / rule / required_input_missing`: the router incorrectly classified it, although the Personal Agent returned the correct translation. User-visible output alone would have hidden the routing defect.

### Runtime note

At 09:45:02 gateway PID 35101 received SIGTERM and shut down cleanly. The existing development watcher (`watch-node.mts`, parent 34671) spawned new gateway PID 22084; this task issued no signal or manual build/restart. Source edits trigger that pre-existing watcher. At 09:45:33 it was rebuilding missing Control UI assets. Both QA lanes were informed; no duplicate gateway was started. Final acceptance must bind the final source/build and an idle, stable watcher generation.

### 8. Quoted finance keywords for translation — FAIL

Session `4d5a750d-2ff3-4f89-beee-639e8f01a6eb`, 09:49:43. Prompt: `Mình chỉ cần dịch tiêu đề “Phân tích chênh lệch ngân sách theo tháng” sang tiếng Anh. Chỉ trả lại bản dịch, không phân tích số liệu hay chuyển việc cho người khác.`

Expected: English title only. Actual: `Bạn có đồng ý giao phần việc này cho Chuyên gia Tài chính & Ngân sách không?` The natural-language refusal of handoff was ignored. Source: the positive `useWhen` substring shortcut bypasses semantic intent validation. Both contract and finance routing events were wrong; only the finance case also produced the wrong visible response. No consent was given and no specialist was started. The 5-second answer completed before the subsequent watcher disconnect.

## Changes and final verification

The chronology below records failed checkpoints as well as repairs. Passing deterministic tests alone is not treated as repaired user behavior; current acceptance and remaining blockers are summarized above.

### Deterministic regression evidence

- Router continuation before fix: exact consent test fails `delegate / route_ready` versus actual `local / router_no_candidate` (1 test, wrapper 3.56 seconds). The model stub returns a valid local decision when original pending-task context is missing; this tests the context handoff boundary rather than a new parser shape.
- Recovered-error display before fix: `server-methods.test.ts` and `session-history-state.test.ts`, 12 failed / 261 passed (273 total, wrapper 9.46 seconds). Empty, whitespace-only, thinking-only and reasoning-only errors leave stale rows and fail to request the SSE history refresh. Terminal errors, user-turn boundaries, partial real text and literal error text preservation pass.
- Production display repair reuses the existing same-turn scanner and SSE refresh state; only broadens the non-visible provider-error predicate. It does not hide unrecovered errors or guarantee no temporary error while a retry is still running.

### Configuration boundary

Contract is `auto_when_certain`, finance is `confirm_before_handoff`, HR is `explicit_only`. Therefore unnamed natural HR prompts must not auto-start HR under current configuration. An optional user question asks whether to preserve that restriction or authorize automatic HR routing; no mode change has been made by this task.

### First repaired checkpoint — NOT ACCEPTED

- Router focused tests: 58/58 across 3 files, wrapper 10.24 seconds; core TypeScript check exits 0.
- Display projection: 273/273 across two gateway test files. The separate yielded-completion mirror regression fails exactly once (148 existing lifecycle tests pass), proving the unnecessary `chat.history` probe before requester-settle delivery.
- Live finance retry, session `a00223a0-fdc1-4a4c-9bf9-8db474acbfb2`: initial natural task asks consent at 09:59:55; exact `Đồng ý, làm giúp mình nhé.` yields admin `clarified / ai / pending_clarification_unresolved` in 3866 ms. Personal Agent then answers locally in 30 seconds, no specialist run. Gateway PID 47823 remained stable during a shared source-freeze window. Mocked tests passing is not live acceptance; further model-output diagnosis is required.
- Quoted finance translation retry, session `5b6cc3a2`, 10:02:12: returns only `Monthly Budget Variance Analysis` in four seconds, with no visible specialist activity. User-visible output passes. Admin readback is still pending after the next watcher rebuild.

### Second repaired checkpoint — critical dispatch restored, further UX fixes pending

- Shared focused batch: 499/499 across eight files, four wrapper shards in 32.73 seconds (router 66, gateway projection 273, lifecycle 149, delegation/knowledge tools 11). The dispatch regression first failed 2/10 before the pre-dispatch validator was wired; afterwards all 10 delegation-tool tests passed.
- Core typecheck passes. Core-test typecheck is blocked by an unrelated existing dirty fixture in `src/gateway/gateway-misc.test.ts:798` missing `avatarRevision`; this task did not alter it.
- Final source for this checkpoint is loaded in gateway PID 73545 and `dist/openclaw-tools-Cbz_NL0O.js`. No manual gateway build or signal was issued. One overly broad lint prerequisite command was cancelled (only its own process); the corrected core-scoped lint identified router style issues to clean up, plus pre-existing max-lines debt.
- Finance session `2b30e559-576c-415d-900c-a5283eeeb502`: natural business prompt → consent at 10:11:06 → exact `Đồng ý, làm giúp mình nhé.` → admin `delegated / ai / delegate_started`, 117 ms → specialist completed and final returned at 10:12:26. Correct 169.2 million monthly break-even, 180 million opening working cash, 32 million monthly downside burn, 84 million after three months. End-to-end orchestration PASS.
- Contract session `d156e148-f4ad-43df-9d0e-d71040179e8c`: natural contract prompt → asks ID at 10:13:36. Bare `WEB-QA-907 nhé.` hits `router_provider_error` at 20,541 ms and Personal Agent substitutes a local answer: transient routing/failure-UX FAIL. Within the same retained pending request, `Đúng mã WEB-QA-907, bạn kiểm tra tiếp giúp mình nhé.` → admin delegated 50 ms at 10:16 → actual contract child result returned 10:16:47. Recovery PASS, first-attempt acceptance still requires rerun.
- Finance and contract live panes display two identical handoff cards for one child. Scoped SQLite read proves finance has exactly one durable call and one result sharing the same invocation ID. Fresh Chrome tab 1369521203 loads the same finance history with one card. Cause: the live/history merge fails to remove standalone persisted `toolResult` text envelopes when the completed live card already contains that result. UI regression/fix in progress.
- Admin readback confirms quoted finance translation `5b6cc3a2` was `local / rule / router_no_candidate`, 6202 ms at 10:02. Translation control now passes both user output and routing log.

### Third checkpoint — final source and UI build

- Core focused batch: **502/502** (router 69, gateway projection 273, lifecycle 149, delegation/knowledge tool contracts 11). Core TypeScript check passes. Router tests now cover one bounded retry only for its own 20-second continuation timeout; the request is unchanged, pending consent is not consumed, and no child is dispatched until a valid verified decision exists. Other provider failures are not retried by this logic. Exhausted failures explicitly say no specialist has started instead of silently substituting Personal Agent analysis.
- UI regression first reproduced six failures. Repair reconciles standalone persisted results with exactly one live invocation using the full call ID and compatible run/view ownership. Durable completion/result/details/media survive; live arguments survive; unrelated turns, reused IDs, distinct App previews and ambiguous identities remain separate.
- Final UI regression after the narrow helper refactor: **257/257 across four files**, two wrapper shards, 3.91 seconds at 10:38. Total focused checks: **759 passing tests**. Focused type-aware lint for all four changed UI files exits 0. Router focused lint has only inherited max-lines debt; the router is two physical lines shorter than the pre-task source backup, and no suppression was added.
- Existing unrelated type-check blockers remain: `src/gateway/gateway-misc.test.ts:798` lacks `avatarRevision`; `ui/src/i18n/enterprise-user.ts` has duplicate object keys and `ui/src/pages/enterprise-admin/pages/models-page.ts:196` has an incompatible ApplicationContext cast. No errors reported in this task's changed UI files. Those unrelated files were not modified by this task.
- All user/model chats finished before UI builds. Final `pnpm ui:build` passes in **3.84 seconds**, 880 finalized sidecars and all bundle performance checks pass. Final boot asset: `control-ui-boot-bXzAsT4m.js`. This builds only `dist/control-ui`, not the full gateway. Backend listener PID **7753**, compiled router marker in `dist/openclaw-tools-PmrYtdC-.js`. No manual gateway restart or signal issued.
- Legacy session `793d7eb0` reopened at 10:31: the stale generic error bubble is gone; the real WEB-QA-905 answer and its three-point follow-up remain. New finance/contract completion logs after 10:10 no longer show the unnecessary unauthorized history probe. Provider WebSocket transport errors remain a separate concern; no claim that the probe caused them.
- Independent knowledge QA task reported a fresh natural backup request (`0a0029b9`) completed with exactly three searches and two document reads; the live/settled UI showed exactly five corresponding cards, without duplicate or lost results. That task owns knowledge-content acceptance; this task changed only shared tool-card reconciliation, not knowledge policy or publications.

### Final live acceptance on the final UI bundle

#### Missing contract ID continuation — PASS

Session `8b35c163`, 10:40–10:41, existing Chrome user tab, no agent names in either user message:

1. Natural website contract review request: 100 million value, 80% prepayment, unlimited deadline extension, cancellation forfeiture, 5 million liability cap; request three risks and three proposed clauses.
2. System asks `Bạn cần kiểm tra hợp đồng số nào?` at 10:40:51. Admin confirms contract target, `clarified / ai / required_input_missing` (6084 ms).
3. User answers only `WEB-QA-908 nhé.` **once**. No restatement or manual retry.
4. Actual contract specialist starts; admin `delegated / ai / delegate_started`, 52 ms, at 10:41. This latency is dispatch-tool timing, not total model-routing or end-to-end response time.
5. Child completes and the original chat receives three risks plus three negotiation clauses at 10:41:56. Exactly **one** live handoff card, with completed and returned-result milestones; no generic failure bubble. Native screenshot reviewed: card, response and composer are visible without overlap.
6. This proves normal first-response continuation. It does not independently prove a timeout occurred internally; bounded timeout recovery is covered by deterministic tests.

#### Multidomain final checkpoint — FAIL, reopened for correction

Session `9bbe436e`, 10:42–10:43. Natural request combines cash-flow analysis (600 million cash, 300 million fit-out, 60 million deposit, 100 million monthly fixed costs, 40% variable costs, 130 million revenue) with three lease risks for `MIX-QA-909`, then asks for a combined conclusion. Neither user message names agents.

1. System correctly proposes both finance and contract specialists and explicitly asks consent for both at 10:42:55. Admin records both targets with `handoff_confirmation_required`, 6025 ms.
2. User answers `Ừ, bạn làm giúp cả hai phần nhé.` once.
3. Admin records both targets, `clarified / ai / router_verifier_disagreed`, 13792 ms. No specialist is started.
4. Personal Agent nevertheless supplies a full local analysis at 10:43:34 rather than the configured clarification. Numeric output is plausible (166.7 million break-even, 174 million cash after three months), but **orchestration fails**.
5. Raw verifier output is intentionally not retained. The single disagreement code does not prove whether the cause was confidence, continuation classification, independence, missing input, provider failure or target disagreement. Read-only diagnosis and more precise safe reason codes are required; do not bypass the independent verifier or lower configured thresholds to make the test pass.

### Additional regression evidence from the multidomain failure

- Router intended-red batch: **12 failed / 54 skipped**, 4.85 seconds. The meaningful behavior regressions prove the stored per-agent plan is absent from continuation-model input, and a newly inferred consent rejected by the verifier is still retained for a later non-consent answer. Other cases require granular privacy-safe verifier reason codes and a structured user-facing clarification question.
- Gateway intended-red batch: **2 failed / 9 passed / 203 skipped**, 11.17 seconds. Both failures prove unrestricted model dispatch still occurs: after an idle `clarify` decision, and after the admitted turn is aborted while routing prepares. Nine controls cover mismatched account/agent/session/run, absent question, normal delegate/local paths, competing work and pending followup queue.
- The assembled prompt is not retained for this run. Runtime trace confirms provider observed the assembled instructions (27242 expected/observed characters), but that does not independently prove the routing directive was included. `runtimeContextChars: 0` counts a different context channel and is not evidence that the directive was missing.
- Scoped hardening uses a structured clarification question and the existing non-agent reply persistence/finalization path for an **idle, exactly owned** turn. Existing active/queued work remains on its normal queue path; this does not claim a new deterministic clarification guarantee for queued turns.

### Fourth checkpoint — final multidomain repair validation

- Full backend focused batch at 11:01–11:02: **723/723 PASS**, nine files, four wrapper shards in 50.46 seconds: router 76, gateway 487 (including all 214 chat directive/persistence/queue cases), lifecycle 149, tools 11. With the unchanged final UI suite's 257, the cumulative focused acceptance set is **980 passing tests**.
- One first-green queue test failed because the fixture seeded the raw `main` alias, while gateway/queue admission uses canonical `agent:main:main`. The fixture now asserts and uses the real request metadata key; production queue guards were not weakened. All 214 cases pass afterward.
- Core TypeScript check passes. Focused type-aware lint for the new gateway dispatch and its test exits 0 after fixing five introduced curly-style errors. Existing `request-runtime-config.ts` import-order/curly debt and router max-lines debt remain outside the added-field changes; no suppression added. Current router is 1231 physical lines versus the exact pre-task backup's 1186 (+45, not the earlier checkpoint's -2).
- Verifier now distinguishes failure categories without saving model/provider payloads, receives original task + prior per-agent plan + current answer separately, and cannot carry newly inferred consent across a rejected verification. Technical verifier failures preserve the original clarification for an exact-answer retry; the verifier itself is not automatically retried.
- Gateway emits the structured clarification through the existing reply dispatcher only for the authenticated matching account/personal-agent/session/run, an idle admission, no pending queue work and a non-aborted turn. Canonical non-agent finalization persists one user and one assistant message, emits final, records dedupe and releases the run. No separate history writer, permission bypass or knowledge change.

### Multidomain rerun — dispatch PASS, child-context handoff FAIL on deeper verification

Session `8d4a3238-ce52-4f98-8596-d9227dcd9fd5`, 11:03 onward, same natural prompt as the failed multidomain case except synthetic contract code `MIX-QA-910`.

1. System asks permission for both relevant specialists. Admin records both targets, `clarified / ai / handoff_confirmation_required`, 6229 ms at 11:03.
2. User replies only `Ừ, bạn làm giúp cả hai phần nhé.` once, without naming agents.
3. Both specialists actually start. Admin records `delegated / ai / delegate_started`, 73 ms at 11:04. This is dispatch timing, not end-to-end response latency.
4. One handoff card contains two specialist rows. Both reach completed and returned-result states. Final answer includes 166.7 million monthly break-even, 22 million monthly loss, 174 million available cash after three months, three lease risks/clauses and a combined recommendation. Initial observation incorrectly treated this as successful specialist aggregation. Deeper child-transcript verification below disproves that conclusion: actual dispatch succeeded, but finance did not receive its required source numbers and Personal Agent substituted the calculation.
5. The user's original tab 1369521191 moved to Plugins without this task navigating it. It was left untouched. QA continued in new tab 1369521210 in the same existing Chrome profile; signed-in Hiếu DZ and Personal Agent were reverified. Native screenshot confirms a single clarification bubble and one combined handoff card. No stale generic failure bubble.
6. A separate waiting defect remains: parent used `exec` with `sleep 8`, `sleep 8`, `sleep 12`, instead of the intended asynchronous yield. Read-only session `19ef3d8d-f4bd-4cb8-9601-5272fb63d31d` tool report includes `enterprise_delegate` but excludes `sessions_yield`.
7. Diagnosis: an existing account tool-policy save at 09:44:07 (revision 1) persisted `sessions_yield` in deny. The admin's first-save derived policy compares only catalog grants against the base profile, omitting managed delegation capabilities already granted by the effective runtime. Because yield is a core catalog tool, unchanged form submission can incorrectly materialize it as denied. Runtime correctly honors the stored deny; no bypass or automatic database repair has been applied.
8. A narrow first-save policy round-trip regression/fix is in progress. Explicit stored deny must remain effective. Enabling only the existing user's yield capability via admin was requested separately; awaiting authorization, without changing other grants or delegation modes.

Additional cosmetic observation: the generated title of this session ends in an unexpected non-word glyph. This is not a routing or delivery failure; no broad Unicode stripping or title-model change has been made.

### Final negative controls on stable gateway PID 72128 — PASS

- `f3301c6a-e1b5-4afd-890f-b23030c1f86b`, 11:17: natural new shop financial request (450 million cash, 200 million fit-out, 40 million deposit, 65 million fixed monthly cost, 40% variable cost, 95 million revenue). System asks finance handoff consent; admin `handoff_confirmation_required`, 9743 ms. User says `Không, bỏ yêu cầu đó nhé. Giờ chỉ viết lại câu “gửi báo giá cho tôi ngay” sao cho lịch sự, đúng một câu thôi, chưa gửi cho ai.` Result: only `Bạn vui lòng gửi báo giá cho tôi sớm nhất có thể nhé.` No specialist card. Admin `local / ai / router_no_candidate`, 5081 ms. Pending-task cancellation plus immediate topic shift PASS.
- `f8a256ff`, 11:17–11:18: request only two English title translations, quoting `Phân tích chênh lệch ngân sách theo tháng` and `Kiểm tra điều khoản phạt và trách nhiệm trong hợp đồng`, explicitly excluding analysis/review. Result is exactly two translated titles; no consent question or specialist card. Admin `local / ai / router_no_candidate`, 2210 ms. Both domain-keyword false-positive controls PASS together.

### Additional approval-channel diagnostic boundary

A refreshed admin log reveals a later `blocked / system / mutation_confirmation_expired` event in the multidomain session at 11:04:38, targeting finance child `ee506f66-a296-4a0b-8ab7-18123dd10ef2`. Read-only child transcript `d39e51a1-513c-4590-98e8-ee7fb6aee26a`, sequence 8, shows `sandbox_exec` returned `Plugin approval request rejected: unauthorized`. This is not a duplicate delegation: the parent has one `enterprise_delegate` invocation, and both children completed. The attempted command searched Markdown in the workspace, not a calculator (correcting the initial user-facing description). It failed in approximately 30 ms, not after the 120-second approval TTL. The approval transport catch reports CANCELLED, which the Enterprise guard maps to expired. No mutation-approval bypass or general execution grant has been made.

### Deeper child-payload verification — critical missing-context defect

- Parent session `19ef3d8d-f4bd-4cb8-9601-5272fb63d31d` contains all original financial numbers and contract terms. Tool invocation correctly accepts only a server-owned `decisionId`.
- Finance child's entire assigned task is a generic instruction to analyze "the supplied synthetic data", without any of the actual values. Its sequence 9 final explicitly says it cannot calculate because no dataset was supplied. The subsequent parent final contains the numbers because the parent still has the original user message.
- Cause: router-generated per-agent summaries were passed as the complete `task` to `spawnSubagentDirect` with `context: isolated`. The exact authorized `decision.prompt` was not forwarded. An isolated child cannot recover parent history; a lifecycle-completed card is not evidence of substantive specialist success.
- Correction in progress: preserve per-target assignment while adding a clearly data-only envelope containing the server-owned authorized request and supplied clarifications, without unrelated history or other-account data. Oversized source must fail closed with a concise restatement request, not silently drop required values. This case remains FAIL until real child output confirms the actual financial analysis.

### Admin first-save policy repair — automated verification PASS

- Intended red: two active-specialist failures / ten passes. Coding-profile unchanged save drops yield; template-minimal case hides yield as blocked because derived `alsoAllow` omits it. A first fixture using a global minimal profile also exposed pre-existing profile inheritance mismatch; it was narrowed to the template Agent to isolate the managed-tool defect.
- Panel-only repair whitelists canonical managed delegation tool IDs only when the existing request-scoped effective policy layers already permit them. Reuses existing policy-layer computation; configured stored policy remains unchanged.
- Green: **12/12** `admin-agent-service.test.ts`, 21.65 seconds. Seven new cases cover unassigned/draft/active specialist, coding/minimal profile, unchanged effective tool inventory after save, no promotion of sandbox-only web permission, and explicit exact/group/wildcard denies.
- Production delta against the captured pre-edit dirty baseline is +27/-19, net +8; seven tests add 136 lines. Existing service changes belonging to other work are preserved. No live account policy was changed. Approval to enable the existing user's yield remains pending.
- Exact pre-edit service backup: `/tmp/openclaw-admin-yield-panel.DJLtQ7/admin-agent-service.before.ts`; isolated patch beside it. Format/diff check pass. The changed-file gate stops at existing assertion-safety findings before type/build stages. Scoped lint has no new test findings; service reports existing max-lines and five unchanged fallback-spread sites. These gates are not claimed green.

### Missing-context regression evidence

- Three router limit tests fail before repair: initial over-limit ASCII, initial UTF-16 source, and accumulated clarification source all reach delegation after source clipping instead of asking for a shorter complete request. Wrapper 3.20 seconds, exit 1.
- Separate actual-spawn test fails before repair: the model emits generic `Review contract`, and that generic text alone is passed to the isolated child. Canonical source containing the numeric data and contract ID is absent. Wrapper 2.92 seconds, exit 1.
- Acceptance criterion is now explicit: verify the child receives the exact relevant authorized source and its final performs the requested work. Neither a parent-written final answer nor a completed lifecycle card independently proves that.

### Final full focused backend validation

- Exact source freeze across all three subagent lanes. Full wrapper batch: **738/738**, ten files/four shards, 117.74 seconds at 11:28–11:30. Breakdown: 79 router + 12 admin service + 487 gateway + 149 lifecycle + 11 tool contracts. The actual-spawn regression extends an existing tool test; it is not an additional test count.
- Core typecheck exits 0. Narrow type-aware lint of the context repair reports only inherited router max-lines (1195 lint-counted lines). No new tool/continuation-test lint findings. Router now 1242 physical lines, +56 against the exact pre-task backup. No suppression added.
- Final UI remains the already validated 257-test suite and built bundle, unchanged by these backend repairs: combined focused set **995**. No new full gateway build, manual restart, commit, or production deployment.

Reproducible backend command:

```sh
OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs src/enterprise/delegation/delegation-router.test.ts src/enterprise/delegation/delegation-router-ai.test.ts src/enterprise/delegation/delegation-router-continuation.test.ts src/gateway/server-methods/server-methods.test.ts src/gateway/session-history-state.test.ts src/gateway/server-methods/chat.directive-tags.test.ts src/agents/subagents/registry/subagent-registry-lifecycle.test.ts src/agents/tools/enterprise-delegation-tools.test.ts src/agents/tools/enterprise-knowledge-tools.test.ts src/enterprise/agents/admin-agent-service.test.ts
```

### Final natural unaccented multidomain test — substantive end-to-end PASS

Session `a3b2f86c-801a-4c34-9e39-9bab622d0f1f`, parent transcript `db47a87e-7bdc-4964-860b-733a9a70ca92`, stable gateway PID **35127**, compiled source envelope in `dist/openclaw-tools-8l8N9LEX.js`.

1. Unaccented natural request: 620 million starting cash; 280 million fit-out; 60 million deposit; monthly rent/payroll/other 20/55/15 million; variable cost 40%; revenue 120 million; three lease risks and proposed revisions for `MIX-QA-911`; then a combined recommendation. Only synthetic provided data; no signing, sending or real changes.
2. System independently proposes both relevant specialists. User answers only `U, ban lam giup ca hai phan nhe.` once. Neither user message names an agent.
3. Admin records both targets: clarification at 11:29:40, actual delegation at 11:30:48, `delegate_started`, 81 ms (dispatch timing only).
4. Finance run `10a451ea-dd6c-4cb4-895a-c60852b93365`, child transcript `5a958ae5-122e-49f5-a888-95941a712492`: initial message contains assigned financial subtask plus the exact authorized source including all numbers. At 11:31:03 its own final calculates fixed cost 90 million, monthly loss 18 million, break-even 150 million, cash after three months 226 million, and three adjustments. No lookup/tool calls; the child no longer searches for missing data.
5. Contract run `18931e16-f1b4-470c-87a9-1bf0c60e0d2b`, child transcript `30a3a5a4-ec3e-48fb-b84c-67adacbef806`: initial message contains its assigned scope and full authorized terms/ID. At 11:31:01 its own final evaluates arbitrary rent changes, 7-day repossession, and forfeiture of the 60 million deposit, with corresponding proposed clauses. No lookup/tool calls or actual external action.
6. Parent returns the combined answer in the original chat; UI reports 44 seconds. One handoff card has both completed/returned rows. Native visual review and reload both preserve the correct results; composer is idle and no generic error remains. The label `Replying to current message` is the existing reply-reference preview, not a still-running indicator.
7. Parent still uses one `exec` wait because the existing user's `sessions_yield` deny has deliberately not been removed without approval. This remaining capability/configuration issue is separate from the now-verified source handoff and substantive specialist results.

### Remaining authority/product decision — mutation approvals

- Exact failure is connect-stage `enterprise_session_invalid`: internal approval transport uses loopback gateway authentication without an Enterprise user-portal cookie; request never reaches `plugin.approval.request`.
- Employee connections have read/write/questions scopes; approval requests, events and resolution require `operator.approvals`. Existing requester metadata binds connection/device/client rather than an explicit Enterprise account + parent-session reviewer policy. Execution identity is run provenance, not an account login credential.
- A transport-only patch would not safely create a reviewable employee-owned approval. Required user decision: own-chat user approval or designated admin approval. Implementation must bind account, parent session, active run, exact action/arguments and one-shot approval; delegation consent must not authorize mutations.
- `CANCELLED` is separately mislabeled expired. Correct cancellation state needs the SQLite CHECK/schema migration plus store/parser/API type updates; timeout remains expiry. No partial migration, auth bypass, broad scope grant or live account-policy repair was applied.
- Both choices were asked through the user-input UI. Until answered, the remaining permission paths are explicitly **not accepted**.

### Supplemental HR boundary test — restart interruption

Session `07ae73a1-a72a-40ef-a904-bf6f92435e4c` requests five general content-writer interview questions, explicitly no company documents/policy lookup. Initial attempt at 11:34:52 is rejected `GatewayDrainingError` (145 ms) while the gateway restarts; it is not counted as an end-to-end pass. All this task's source lanes were frozen and no signal/restart command was issued. Listener later returns as PID 53793. After visible reconnection and no running turn, one explicit follow-up retry was sent.

Retry at 11:36 completes in 13 seconds with exactly five practical interview questions, no specialist or knowledge-tool activity. Admin: `local / ai / router_no_candidate`, 2658 ms. The earlier infrastructure-error banner clears. This is consistent with the unchanged `explicit_only` HR profile, not evidence that unnamed HR delegation has been enabled. Recovery and configuration-boundary case PASS; the interrupted first attempt remains recorded separately.

## Handoff state

- No further source edits, tests or build processes from this task remain running. Final whole-working-tree `git diff --check` exits 0. This does not imply unrelated dirty files were reviewed or all repository gates pass.
- Exact read-only comparison at handoff confirms hieu's tool-policy row is unchanged from the pre-diagnosis snapshot: revision 1, same profile/allow/deny/timestamp, `sessions_yield` still denied.
- Current user/admin login sessions survive. Original user tab was preserved; QA tab 1369521210 uses the same Chrome profile and account. All test messages use synthetic data and are retained for inspection; nothing was deleted.
- Outstanding user choices are the only authorization-sensitive next steps: enable only yield for hieu, and define the reviewer for child mutations. Until those are supplied and the resulting paths are implemented/retested, status is **improved and verified for the reported read-only orchestration cases, not fully complete**.
