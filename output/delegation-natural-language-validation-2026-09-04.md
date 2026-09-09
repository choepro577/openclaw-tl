# Natural-language specialist delegation — live validation

Date: 2026-09-04. Target: existing Chrome user session, Hiếu DZ (`hieu`), Personal Agent Cốm, operator gateway `127.0.0.1:18789`.

Scope: test requests that do **not** name specialist agents. No profile, assignment, model, knowledge configuration, or gateway restart is part of this pass. Existing history is retained. Another task owns enterprise knowledge testing.

## Configuration observed before testing

- Rollout `on`, policy revision 2, router `openai/gpt-5.6-luna`.
- Thresholds: automatic 0.90, clarification 0.70, margin 0.15; maximum three specialists.
- Contract specialist: active, `auto_when_certain`; required input labelled “Mã hợp đồng”.
- Finance specialist: active, `confirm_before_handoff`; no required input.
- HR specialist: active, `explicit_only`; no required input.
- Hiếu has explicit active grants for these three specialists; no user override was present.

Consequently, an unnamed HR task must not auto-spawn under the existing configuration. Finance must ask handoff consent; consent to a handoff is not consent to a write operation.

## Evidence standard

Each case is checked against its exact session and delegation event. Specialist execution is counted only when a child run exists; a useful answer or a message saying work will be handed off is insufficient. Completion additionally requires the child terminal state and the visible result.

The two existing Chrome user tabs were observed converging on the same conversation while the other task navigated. Neither task changed model configuration, although the composer temporarily displayed different model/thinking labels. UI work was therefore serialized. This observation is a test-environment caveat, not a proven diagnosis of cross-tab synchronization.

## Live cases

### N01 — natural contract request with ID already supplied

Session: `agent:enterprise-personal-2ae2cbc2deecdb86fe86:dashboard:c18c8fd8-d58b-4641-a187-8deefe1306b8`.

Prompt:

> Tôi chuẩn bị ký hợp đồng dịch vụ DV-2409 trị giá 200 triệu. Bên cung cấp giao chậm một ngày bị phạt 2% tổng giá trị, còn trách nhiệm bồi thường thì không có giới hạn. Giúp tôi chỉ ra 3 rủi ro chính và đề xuất cách sửa hai điều khoản này trước khi ký.

Expected: recognize contract expertise and the supplied ID; hand off if confidence/verifier checks pass.

Observed: “Bạn cần kiểm tra hợp đồng số nào?” Event at 02:17:55 UTC: source `ai`, outcome `clarified`, reason `router_ambiguous`, selected Contract, no child IDs. Router latency 5,404 ms.

Result: FAIL — over-clarification despite the contract identifier being present; no actual delegation.

### N02 — ordinary follow-up, no agent name

Same session. Prompt:

> Là hợp đồng DV-2409 tôi vừa nêu ở trên. Bạn xem giúp các điều khoản phạt chậm giao và bồi thường không giới hạn đó nhé.

Observed event at 02:18:40 UTC: source `ai`, outcome `clarified`, reason `router_ambiguous`, selected Contract, no child IDs; 3,288 ms. The persisted assistant transcript nevertheless shows Personal Agent using two knowledge searches and one evidence retrieval, then answering the contract question locally. No `enterprise_delegate` or `sessions_yield` occurred in this session.

Result: FAIL for automatic specialist delegation. The useful local answer is not a specialist result. Router outcome and the final conversational behavior differ.

## Source-level evidence (not a replacement for live tests)

- `src/enterprise/delegation/delegation-router.ts`: `missingRequiredInput` requires a matching label or identifier prefix (`mã`, `số`, `id`, `code`). Merely writing “hợp đồng dịch vụ DV-2409” does not satisfy that heuristic.
- The router receives the current raw message, not conversation history: `src/gateway/server-methods/chat-send-agent-dispatch.ts`, call to `prepareEnterpriseDelegationTurn`; router model input contains only current prompt/candidates.
- Pending required-input continuation is set in explicit and deterministic-rule paths, but not in the AI clarification path. The AI handoff-confirmation path likewise does not preserve pending consent/task state. Natural short-answer follow-ups need live verification below before treating every manifestation as proven.

## Focused automated regression check

`pnpm test src/enterprise/delegation/delegation-router.test.ts src/enterprise/delegation/delegation-router-ai.test.ts`: **32 tests passed**, two files, on 2026-09-04 at 09:24 local time.

These tests mock router model responses. They do not establish natural-language sensitivity. Existing required-input follow-up coverage uses an explicitly named agent; confirmation coverage stops after the initial question.

## Remaining live matrix

Pending this pass: complete paraphrased contract request using an explicit field label; missing-input short reply; finance request plus ordinary consent; unnamed HR request; ambiguous request; unrelated request; independent mixed task. Results will be recorded without changing specialist modes to force a pass.
