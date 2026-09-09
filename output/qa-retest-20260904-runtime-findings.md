# Ghi chú runtime: kiểm thử lại điều phối và tri thức ngày 04/09/2026

Chưa thể nghiệm thu điều phối end-to-end. Lượt A có câu hỏi xin đồng ý không gắn với một kế hoạch hợp lệ; B-C02 dừng ở bước chọn chứng cứ; B-C03 có Finance child chạy xong nhưng thất bại khi trả kết quả về parent. Ngoài lỗi xác thực ở bước tiếp tục parent, nội dung completion của B-C03 còn bị cắt trước các kết quả tài chính trọng yếu.

Đây là ghi chú chẩn đoán và kế hoạch sửa/tái kiểm, **không phải xác nhận đã sửa**. Không sửa source sản phẩm, database, auth, model/provider, quyền, publication, index hoặc gateway; không chạy test và không thao tác UI trong lane này.

## Phạm vi và cách đối chiếu

- Ngày sự kiện: 2026-09-04. Timestamps dưới đây dùng UTC (`Z`); giờ Việt Nam = UTC + 7 giờ.
- Checkout tại thời điểm đọc: `f567de7d3bd38b624f176fa5ba37e13dcfe9fa1c`; có thay đổi làm việc của các lane khác, commit không đại diện toàn bộ source đang chạy.
- Build stamp kiểm tra trực tiếp: `2026-09-04T20:49:16+07:00`. Việc restart gateway do người vận hành thực hiện, không do lane chẩn đoán.
- Session A: `ba0561c5-08ba-4422-b7d6-8a3bea25aeab`.
- Session B: `c66f48cd-0eaf-4aa4-a18b-5fbdfd76b90f`.
- Parent B transcript: `ef05d618-e4be-4762-9203-6ad7c6e72fc9`.
- Parent B thực tế: `gpt-5.6-sol` / `openai` / harness `openclaw`. Không áp kết luận về Codex child cho parent này.
- Dùng [collector read-only](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-retest-20260904-reader.mjs), đối chiếu exact session/run trong `session_nodes`, `transcript_events`, `subagent_runs`, `task_runs` và routing audit. Không suy join chỉ từ khoảng thời gian hoặc cùng tài khoản.
- Chỉ lưu mã định danh, trạng thái, thời gian, hash và kết quả kiểm tra. Không lưu gói chứng cứ, citation token, hidden reasoning, thông tin xác thực hoặc bản dump audit riêng.

## F1 — Lượt A xin đồng ý dù kế hoạch định tuyến chưa hợp lệ

### Bằng chứng hiện tại

| Case  | Routing ban đầu                                                                            | Lượt sau đồng ý                                              | Child |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| A-C02 | `13:56:33.511Z`: `clarified / router_target_invalid`, Finance, confirmation `pending`      | `13:56:58.414Z`: `local / router_no_candidate`               | 0     |
| A-C03 | `13:58:08.704Z`: `clarified / router_target_invalid`, Finance, confirmation `pending`      | `13:58:23.055Z`: `local / router_no_candidate`               | 0     |
| A-C04 | `13:59:25.775Z`: `router_mode_disallowed`, Contract + Finance + HR, confirmation `pending` | `13:59:56.743Z`: `router_target_invalid`, Contract + Finance | 0     |

### Chuỗi nguyên nhân đã xác nhận

1. Trong nhánh `uncertain`, câu hỏi được chọn theo thứ tự thiếu thông tin → xin đồng ý → các nguyên nhân khác. Do đó `confirmation=true` vẫn sinh câu xin đồng ý dù quyết định có lỗi.
2. `reasonCode` lại ưu tiên `invalidRoute / scopeMismatch / invalidInput`, nên audit ghi `router_target_invalid` trong khi nhân viên nhìn thấy lời mời đồng ý bàn giao.
3. Với một yêu cầu mới bị invalid, điều kiện `remember` không lưu pending plan. Tuy nhiên `finish` vẫn báo confirmation `pending`.
4. Câu trả lời tự nhiên như “Ừ, bạn xem giúp mình nhé” sau đó không có kế hoạch để nối tiếp; routing mới chỉ thấy lời đồng ý và có thể trả `router_no_candidate`. Chuyên gia không khởi chạy.

Nguồn: [delegation-router.ts:577](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router.ts:577), [điều kiện remember:601](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router.ts:601), [metadata trả ra:616](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router.ts:616).

Riêng A-C04, `explicitOnly` tạo `router_mode_disallowed` nhưng không nằm trong guard loại bỏ `remember`. Vì vậy có thể lưu một lựa chọn vẫn không được phép và hỏi đồng ý chung. Một câu “ừ” không tương đương người dùng gọi đích danh HR; không được sửa bằng cách nới chế độ HR.

### Phần chưa rõ

Audit hiện tại không phân biệt nhánh invalid cụ thể của A-C02/A-C03. Với yêu cầu mới, `expectedAgentIds` chưa có nên không phải scope mismatch của kế hoạch cũ; còn lại có thể là route ngoài candidate hoặc input không hợp lệ.

Finance được cấu hình không có `requiredInputs`. Model tự tạo ID trong `resolvedRequiredInputs` hoặc `missingRequiredInputIds` sẽ bị coi là invalid; đây là một khả năng từ validator, **không phải kết luận model thực tế đã làm như vậy**. JSON/schema lỗi có reason khác, không được gom chung với `router_target_invalid`.

Nguồn: [reconcileRouterInputs:445](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router-model.ts:445), [strict parser:409](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router-model.ts:409), [kiểm tra route/scope:443](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/enterprise/delegation/delegation-router.ts:443).

### Kế hoạch sửa và tái kiểm

1. Sửa tại owner routing/pending plan: chỉ sinh lời xin đồng ý khi có kế hoạch hợp lệ có thể được lưu và thực thi; lỗi target/input/mode phải có câu hỏi và trạng thái tương ứng.
2. Giữ nguyên xác minh độc lập, bằng chứng input lấy nguyên từ người dùng, expiry, thay đổi quyền, HR explicit-only và phiên bản kế hoạch.
3. Ghi thêm subreason có kiểm soát, ví dụ loại lỗi/assignment hash/số input; không ghi prompt riêng hoặc nội dung model thô.
4. Regression kỹ thuật: Finance route có input ID lạ → không báo consent đang chờ; route ngoài candidate → tương tự; HR explicit-only trong danh sách đa chuyên môn → không được hợp thức hóa bằng assent chung.
5. Regression nhiều lượt: valid plan → một lần đồng ý → đúng một child; bổ sung mã sau đồng ý không mất consent; đổi ngân sách/phạm vi phải xử lý đúng phiên bản; hủy rồi “ừ” không hồi sinh yêu cầu.
6. Natural replay C02/C03/C04: chấm riêng routing, pending plan, child thực tế và câu trả lời cuối. Không dùng mock chỉ trả JSON hợp lệ làm bằng chứng nghiệm thu tự nhiên.

## F2 — B-C02 chọn hybrid không cần thiết rồi không chọn được chứng cứ

### Bằng chứng hiện tại

- `14:11:45.382Z`: plan `866eb775-7ce4-4369-8006-5e5e8043bbd8` được chọn, handling `hybrid`, Finance.
- `14:11:45.384Z`: routing `handoff_confirmation_required`.
- `14:16:28.201Z`: xác nhận cùng plan.
- `14:16:35.534Z`: routing `failed / delegate_spawn_failed`, consent `approved`, không có child.
- Parent seq 8 thuộc consent run `b0d7897f-ba10-4ffb-8198-43f37881cb2c`: host-response thông báo chưa khởi chạy được Finance vì chưa tìm thấy chứng cứ phù hợp; phần chuyên gia chưa hoàn tất.
- Parent transcript không có tool trong phần này. Đây không phải bằng chứng preparer không sử dụng tool.

### Chuỗi nguyên nhân đã xác nhận

1. Câu hỏi công tác phí và phép tính đơn giản bị đưa vào hybrid Finance, trái kỳ vọng C02 là parent tra chính sách rồi tự tính.
2. Runtime chạy bước chuẩn bị chứng cứ trong phiên ẩn. Nhánh kết thúc của lần này chỉ có thể tới `EVIDENCE_PREPARATION_NOT_FOUND` khi terminal hợp lệ và JSON selection hợp lệ nhưng mảng selection của Finance rỗng.
3. Nhánh rỗng `continue` trước `authority.createEvidenceTransfer`. Vì vậy lần này chưa tới kiểm tra cấp quyền chuyển bằng gói chứng cứ.
4. Executor thấy mã lỗi của preparation, dừng trước `spawnSubagentDirect`; child count bằng 0 và host trả thông báo chưa hoàn tất.

Nguồn: [runtime preparation trước execution:164](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/embedded-agent-runner/run/enterprise-delegation.ts:164), [parse và empty selection:258](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/embedded-agent-runner/run/enterprise-evidence-preparation.ts:258), [chặn trước spawn:117](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/enterprise-delegation-execution.ts:117), [host failure text:207](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/embedded-agent-runner/run/enterprise-delegation.ts:207).

### Phần chưa rõ và giới hạn chứng cứ

Không thể kết luận do thiếu transfer grants. Empty selection xảy ra trước kiểm tra đó, dù môi trường hiện không có grant chuyển mặc định.

Chưa phân biệt được vì sao selection rỗng: model không search, search không hit, get không thành công, hoặc model không chọn chứng cứ từ kết quả. Preparer tắt callback/persistence/observer và xóa phiên ẩn trước trả về; knowledge audit không có exact parent-run join đủ để suy ngược riêng bước này.

Nguồn: [các callback/persistence bị tắt:203](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/embedded-agent-runner/run/enterprise-evidence-preparation.ts:203), [xóa phiên ẩn:314](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/embedded-agent-runner/run/enterprise-evidence-preparation.ts:314).

### Kế hoạch sửa và tái kiểm

1. Sửa tiêu chí routing chung để câu hỏi chính sách + phép tính đơn giản như C02 được parent xử lý; không hardcode số liệu, tên công ty hoặc mã QA.
2. Với yêu cầu thực sự hybrid, bổ sung observability không có nội dung riêng: parent-run/plan/assignment hash, model-iteration count, search/get count, trạng thái get, selection count, reason cố định. Không giữ phiên ẩn hoặc dump packet để chẩn đoán.
3. Tái kiểm natural C02: đúng nguồn → phép tính đúng → không child, không memory, không đoán file; không hỏi đồng ý Finance.
4. Tái kiểm hybrid tách rõ các nhánh: search không hit; search hit/get lỗi; get thành công/selection rỗng; selection có nội dung nhưng không có grant; có grant hợp lệ; quyền bị thu hồi sau get; publication đổi; excerpt giả hoặc sửa.
5. Trên bản sao QA được duyệt, chứng minh search/get thực sự chạy và phần chứng cứ hợp lệ thực sự đến lượt model của đúng child. Test `enterprise-evidence-preparation.test.ts` về mock harness/selection vẫn cần, nhưng chưa đủ nghiệm thu end-to-end.

## F3 — B-C03 Finance hoàn thành nhưng parent resume lỗi xác thực

### Bằng chứng hiện tại

| Sự kiện                       | Timestamp UTC / metadata                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Chọn plan                     | `14:16:59.747Z`, plan `036561c2-44ae-465e-82db-ec7bf5f1b975`, handling `specialist` |
| Xác nhận                      | `14:17:25.279Z`                                                                     |
| Child được registry tiếp nhận | `14:17:26.757Z`                                                                     |
| Routing thực thi              | `14:17:26.765Z`, `delegate_started / approved`, đúng một child                      |
| Child bắt đầu                 | `14:17:26.963Z`                                                                     |
| Assistant cuối của child      | `14:17:45.895Z`, `stopReason=stop`                                                  |
| Child kết thúc                | `14:17:46.051Z`, `outcome=ok`, `endedReason=subagent-complete`                      |
| Parent nhận wake lần 1        | `14:17:46.177Z`, transcript seq 14                                                  |
| Parent nhận wake lần 2        | `14:18:16.260Z`, seq 15                                                             |
| Parent nhận wake lần 3        | `14:20:16.347Z`, seq 16                                                             |
| Prompt B-C04 vào transcript   | `14:20:17.624Z`, seq 17; sau wake cuối khoảng 1,3 giây                              |

Child run: `78efd186-e93b-4b4f-bb2c-87b07cd835c9`. Child session: `86870836-6b30-4886-a0e3-3d9ccabf978e`.

Model/harness thực tế của child: `gpt-5.6-luna` / `openai` / `codex`, thinking `medium`; không có marker yêu cầu private model context. B-C03 không phải bài kiểm nhận packet tri thức của Codex.

`task_runs` ghi `status=succeeded`, nhưng `delivery_status=failed`, `terminal_outcome=blocked`. `subagent_runs` cũng ghi `delivery.status=failed`; lỗi xác thực cùng mã profile pin `openai:setup-3a850079…`: `is not configured for openai`.

### Nguyên nhân đã xác nhận và phần chưa rõ

Finance đã chạy và hoàn thành thật; lỗi xảy ra khi tiếp tục/bàn giao kết quả về parent. Không được ghi “child không chạy”, cũng không được chấm C03 đạt vì child có `outcome=ok`.

Chuỗi lỗi xác thực được phát ra khi `prepareAgentRuntimeAuth` kiểm tra user-pinned profile và xác định profile không đủ điều kiện, trước gửi yêu cầu model. Nguồn: [prepare-auth.ts:212](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/runtime-plan/prepare-auth.ts:212), [điểm throw:231](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/runtime-plan/prepare-auth.ts:231).

Chưa đóng nguyên nhân vì sao lượt resume chọn pin cũ trong khi lượt tương tác parent trực tiếp vẫn chạy. Cần trace producer của lựa chọn auth/config/session trong resume; không suy rằng token hết hạn, không tự đổi credential/provider hoặc bỏ guard kiểm tra profile.

Wake retry tối đa ba attempts, chờ 30 giây rồi 120 giây; timeline thực tế khớp. Snapshot sau khi kết thúc có toàn bộ requester-settle-wake fields bằng null, `pending_final_delivery=0`, không còn wake trong payload. Cơ chế kết thúc ghi delivery failed và dọn timer. Không có bằng chứng retry C03 tiếp tục chen vào C04 sau wake cuối.

Nguồn: [retry budget:49](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/announce/subagent-announce.requester-settle-wake.ts:49), [retry/terminal handling:502](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/announce/subagent-announce.requester-settle-wake.ts:502), [lifecycle ghi thất bại/dọn wake:87](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/registry/subagent-registry-lifecycle-wake.ts:87).

### Kế hoạch sửa và tái kiểm

1. Trace và sửa owner của resume runtime/auth selection: đối chiếu lựa chọn đã được tiếp nhận cho parent với lựa chọn khi wake. Chỉ sửa sau khi xác định chính xác nơi pin cũ được đưa vào; không thêm fallback auth nhằm vượt lỗi.
2. Bảo toàn kết quả child đã thành công và trạng thái delivery thất bại; nhân viên cần thông báo dễ hiểu rằng chuyên gia đã tính xong nhưng kết quả chưa được tổng hợp. Chi tiết profile thuộc chẩn đoán vận hành.
3. Regression: cùng parent/model/profile qua lượt trực tiếp → handoff → child hoàn thành → wake; child hoàn thành trước parent yield; resume lỗi auth; retry/restart không tạo thêm child hoặc hồi sinh quyền cũ.
4. Tái kiểm UI: lỗi terminal phải hết trạng thái working/Stop; sau reload vẫn phân biệt child success với parent failure. Không gửi case kế tiếp khi còn retry đang chờ.
5. Case C03 chỉ đạt khi một lần đồng ý tạo đúng một Finance child, Finance nhận đủ dữ kiện, parent nhận đủ kết quả và gửi đáp án cuối nhìn thấy được.

## F4 — Completion B-C03 bị cắt trước kết quả 204/294

### Đối chiếu phiên bản/hash, không dựa vào độ dài một bản hiển thị

Đã đọc lại tại `2026-09-04T14:28:50.396Z` và đối chiếu assistant transcript child tiếp đó:

- `frozen_result_text`, `completion.resultText`, `completion.terminalReply.text` và assistant text cuối child seq 2 có cùng SHA-256: `248c011064fcced1bba0c77fe13fcd97be6edb71046d5424c44334d072d5553e`.
- Cả bốn bản đều chứa `204` và `294`. Không dùng số ký tự từng bản để làm tiêu chí nghiệm thu; collector/representation khác phải đối chiếu cùng field và hash trước khi so sánh.
- Parent completion seq 14/15/16 cùng hash `5b41f7c1028f01bb9a228451e7a083fb356affe31a9648e3882fc6d0b56f9cde`, đều có `[child result truncated]`, không chứa `204` hoặc `294`.

Đây là lỗi mất nội dung trên đường completion, không phải Finance chưa tính ra kết quả. Đồng thời chưa được nói parent model đã nhận hay xử lý cả gói: F3 dừng ở kiểm tra auth trước model.

### Chuỗi nguyên nhân đã xác nhận

1. Wake gọi `buildChildCompletionFindings` từ các child đã kết thúc.
2. Formatter gọi `formatChildResultData`, giới hạn riêng mỗi child ở **512 escaped characters**, thêm dấu báo cắt. Tổng findings còn có giới hạn 4.096 ký tự.
3. Phần giới thiệu/giả định ở đầu output chiếm hết giới hạn trước khi đến hai kết quả sau ba tháng; completion gửi parent thiếu các kết quả đó.

Nguồn: [wake build findings:357](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/announce/subagent-announce.requester-settle-wake.ts:357), [giới hạn:35](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/announce/subagent-announce-output.ts:35), [áp giới hạn:409](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/src/agents/subagents/announce/subagent-announce-output.ts:409).

### Kế hoạch sửa và tái kiểm

1. Sửa hợp đồng completion tại owner: phải có đường nhận đủ kết quả được phép cho parent khi cần tổng hợp, không chỉ tăng tùy tiện giới hạn hoặc bắt parent tự tính lại phần chuyên gia.
2. Giữ output-boundary/sanitization, giới hạn ngữ cảnh và dữ liệu riêng tư. Không nhầm output chuyên gia với packet chứng cứ đầu vào; không đưa packet vào task/log/memory để né giới hạn completion.
3. Regression output dài có kết luận ở cuối, hai child, một child lỗi, ký tự cần escape, retry/restart. Chứng minh kết quả trọng yếu tới request model parent thật, không chỉ nằm trong biến prompt/mock.
4. Tái kiểm C03 với lời diễn đạt khác và số liệu không hardcode: nội dung cuối parent phải dùng đủ kết quả của Finance, nói rõ giả định và điều cần xác nhận.
5. Tests formatter hiện tại kiểm soát hard cap/truncation là cần thiết nhưng không chứng minh đủ nội dung nghiệp vụ. Giữ tests an toàn, bổ sung acceptance test cho hợp đồng tổng hợp end-to-end.

## Thứ tự thực hiện và điều kiện dừng an toàn

1. F1: sửa tính nhất quán giữa plan hợp lệ, consent và routing outcome.
2. F3: đóng nguồn pin auth cũ trong resume, rồi sửa đúng owner; không thay model/provider/credential để làm test xanh.
3. F4: bảo đảm kết quả child đầy đủ có đường tới lượt model parent.
4. F2: hiệu chỉnh routing chung của C02 và bổ sung observability riêng tư cho preparation; tái kiểm hybrid với bộ quyền trên bản sao QA được duyệt.
5. Chạy focused regression tại các owner và test boundary; sau đó một baseline và hai lượt prompt tự nhiên khác. Chấm riêng routing, child, chứng cứ, nội dung và UI.
6. Chỉ smoke trên gateway người vận hành khi được phép áp dụng bản sửa. Không tự restart gateway, sửa live auth/index/publication hoặc cấp transfer grants thật.

## Validation của ghi chú

- Đã đối chiếu source branch, exact run/session metadata, child output hash và completion hash; không lưu nội dung nhạy cảm.
- Chỉ tạo ghi chú này. Không thay đổi `AGENTS.md`, alias `CLAUDE.md`, `CONTRIBUTING.md`, navigation/docs framework hoặc bản dịch; tiếng Việt là phạm vi đầu ra theo yêu cầu.
- Không chạy product tests/build trong lane read-only. Kết quả test do lane chính chạy được giữ riêng, không dùng thay bằng chứng runtime ở trên.
- Quy trình kiểm thử chung: [OpenClaw testing reference](https://docs.openclaw.ai/reference/test). URL này là hướng dẫn quy trình, không phải chứng cứ cho các lỗi live.
