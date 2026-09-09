# Kết quả lượt kiểm thử mới — 04/09/2026

## Kết luận hiện tại

**C03 theo ảnh người dùng và C09 đổi chủ đề đã kiểm chứng, sửa live trên QA.** Đã chạy đủ 11 case từng bước, giữ cả lần lỗi và retest, sau đó chạy lại đủ 11 case trong một session mới kết thúc 00:23:28 ngày 05/09/2026. [Báo cáo tổng hợp cuối](qa-natural-combined-session-20260904.md) là kết luận hiện tại; các phần bên dưới là nhật ký theo thời điểm. Chưa chấm toàn bộ đạt: còn giới hạn bàn giao dài, lỗi approval riêng và cảnh báo chất lượng nội dung child.

- Kế hoạch: [qa-natural-session-20260904-plan.md](qa-natural-session-20260904-plan.md).
- User/Admin hiện hữu: Chrome profile Hiếu, tab 1369521721 và 1369521821, cổng 19789.
- Session: `agent:enterprise-personal-2ae2cbc2deecdb86fe86:dashboard:cb4c9413-2f00-4220-b16a-b23457b2d62d`.
- Transcript: `901d4a92-9c9b-409b-9421-57e78f5ab2c2`.
- Runtime đầu lượt: PID 2349; PID QA quan sát cuối: 25940. Checkout `/private/tmp/openclaw-qa-20260904.yZ2L8w/repo`, state `/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime/state`.
- Model UI giữ nguyên GPT-5.6 Sol / Medium; router Luna, Active, revision 2.

## C01: lỗi điều kiện môi trường

Prompt gửi nguyên văn: “Mình đặt 27 phần nước, mỗi phần 14 nghìn thì hết bao nhiêu nhỉ?”

1. 23:15:41 UTC+7, transcript ghi một tin nhắn user.
2. UI hiện lỗi `Auth profile "openai:it@comnieuthienly.vn" is not configured for openai.` Không có đáp án.
3. Admin ghi `local / ai / router_unavailable`, latency 489 ms. `local` ở đây không chứng minh agent đã chọn trả lời trực tiếp đúng.
4. Collector đọc đúng session bằng `sqlite3 -readonly`: status `failed`, 1 user event, 0 tool, 0 plan, 0 child.
5. Đã nhìn ảnh UI trước gửi và ảnh lỗi sau gửi; lỗi đọc được và không bị che. Chưa kiểm chứng lịch sử sau reload hay hành vi thành công.

### Nguyên nhân đã xác minh

- QA shared auth store đã có đúng profile được pin. Không xuất token hoặc nội dung credential.
- QA không có `config_machine_state` key `auth.sharedStore`; môi trường nguồn có `{"location":"state-db"}`.
- `src/agents/auth-profiles/path-resolve.ts:34` quy định thiếu key → `legacy-main`; dòng 78 chọn database theo owner đó. Profile nằm trong shared state DB nhưng runtime tìm ở main-agent DB, nên báo không được cấu hình.
- Owner được cache theo process tại `path-resolve.ts:48`; sửa marker trên đĩa không bảo đảm process hiện tại đọc lại. Cần lifecycle restart gateway QA sau sửa.
- Script seed `output/qa-isolated-state.mjs` trước sửa chỉ copy auth tables, không copy ownership marker. Đây là lỗi tạo môi trường QA, chưa phải bằng chứng agent quyết định sai nghiệp vụ.

## Sửa trong lượt này

1. `output/qa-isolated-state.mjs`: copy đúng một marker `auth.sharedStore` cùng shared credentials; kiểm tra owner `state-db` trước seed; không copy toàn bộ machine-state hoặc ghi đè marker có sẵn.
2. `output/qa-retest-20260904-reader.mjs:280`: thêm `state-root` vào allowlist tham số. Trước sửa lệnh có QA root trả `Unknown argument`; sau sửa cùng lệnh đọc đúng session QA và trả metadata nêu trên.

Ở thời điểm chẩn đoán ban đầu chỉ sửa hai script QA trong workspace. Sau đó người dùng đã duyệt sửa trực tiếp; các sửa runtime và source được ghi riêng bên dưới. Không chạy seed `--apply`, không copy lại credential, không đổi model hoặc quyền.

### Xác minh đã chạy

- `node --check output/qa-isolated-state.mjs`: đạt.
- `node --check output/qa-retest-20260904-reader.mjs`: đạt.
- `git diff --check`: đạt với tracked diff; không dùng nó thay syntax check cho artifact chưa tracked.
- Collector trước/sau sửa: tái hiện lỗi tham số rồi đọc đúng QA session thành công.
- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test src/agents/auth-profiles/path-resolve.shared-store.test.ts`: **1 file, 5 tests đạt**. Suite hiện hữu chứng minh owner thiếu/chuyển sang state-db/cache theo process và agent-local isolation. Không phải E2E script seed sau sửa hoặc case chat đã được sửa live.

## Trạng thái đủ 11 case

| Case                                        | Trạng thái lượt mới                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C01 — Tính tiền nước                        | Lần đầu lỗi QA; retest 23:21 đạt: đúng 378.000đ, local/router_no_candidate, 0 tool/child                                                               |
| C02 — Công tác phí                          | 23:22 đạt nội dung/định tuyến/nguồn: 2 search, 1 get FIN-01v1, 0 child; có lỗi nhãn model tạm thời đang kiểm tra                                       |
| C03 — Phân tích điểm bán                    | Lần đầu child thật nhưng handoff bị cắt; retest23:34–23:35 sau sửa đạt:1 child thật, parent nhận nguyên1478 ký tự, đủ204/294/120                       |
| C04 — Kết hợp ngân sách/hợp đồng/triển khai | Đã chạy:2 chuyên gia thật +4search/6get; hoàn tất23:39:16. Đạt phối hợp/nguồn; giới hạn handoff dài và lỗi approval chưa xử lý, không chấm toàn bộ đạt |
| C05 — Tổng hợp 5 việc                       | Đạt23:43:37: đúng5việc, phân biệt giả định/cần xác nhận,0tool/child mới                                                                                |
| C06 — Dịch tiêu đề                          | Đạt23:44:01: “Budget & Contract Risk Analysis”, local,0tool/child mới                                                                                  |
| C07 — Chính sách chưa có dữ liệu            | Đạt23:44:50:4search+1get; không bịa mức trợ cấp/hạn, khônggọiHR trái policy                                                                            |
| C08 — Hợp đồng thiếu thông tin              | Đạt23:44:59: hỏi mã hợp đồng mới, không tái dùng BT-0904, không chạy child                                                                             |
| C09 — Gác việc, hỏi sao lưu                 | Lỗi2lần; retest2 ngày05/09 đạt sau sửa managedtransport: local,1search/2get,35ngày,0child                                                              |
| C10 — Onboarding                            | Đạt00:09 ngày05/09:3search/4get HR/CNTT, đúngmốc4ngày/MFAngày1/9ngày/buddy30ngày/remote2ngày;0child                                                    |
| C11 — Điều kiện hoàn tất                    | Đạt00:10:05 ngày05/09: tái dùngHR-01v2 vừa đọc,9ngày/16trên20/thi lại2ngày/quảnlýxácnhận,0tool/child mới                                               |

## Bước cần người vận hành đồng ý

### Đã được duyệt và thực hiện lúc 23:21

Người dùng trả lời “sửa luôn k cần hỏi”. Đã chạy script `qa-repair-auth-owner-20260904.mjs`: backup riêng tại `/private/tmp/openclaw-qa-20260904.yZ2L8w/runtime/auth-owner-backup-KazPvi/openclaw.sqlite`, chỉ import marker qua API canonical, kiểm tra integrity `ok`; hash credentials/auth-state/config/grants/zones trước/sau không đổi. Gateway QA PID 2349 tắt sạch, khởi chạy lại đúng launch descriptor thành PID 28182 ở cổng 19789. Gateway chính cổng 18789 vẫn PID 10622. Có thể rollback đúng marker từ backup; không phục hồi cả database sau khi đã phát sinh chat mới.

Đã kết nối lại Chrome với phiên đăng nhập cũ, gửi lại nguyên văn C01 lúc 23:21 để kiểm tra sửa thật. Đoạn dưới lưu yêu cầu vận hành trước khi được duyệt, không phải blocker còn tồn tại.

Bổ sung duy nhất marker không chứa secret `auth.sharedStore={"location":"state-db"}` trong state DB của QA nêu trên và restart đúng gateway cổng 19789. Thực hiện backup/kiểm tra đúng đích trước sửa; không đụng gateway chính 18789, không đổi credential/model/quyền. Gateway này không do lượt kiểm thử hiện tại khởi chạy nên chưa tự restart.

Sau khi được phép và môi trường hoạt động: chạy lại C01, tiếp tục từng case, sửa lỗi trong phạm vi, rồi chạy đủ bộ trong một session tổng hợp mới. Nhánh hybrid C04 còn phải kiểm tra quyền chuyển chứng cứ thực tế; không tự cấp thêm để vượt kiểm thử.

## Bằng chứng C02 và C03 trong lượt đầu sau sửa môi trường

- C02 run `dc61e268-0aac-4460-a563-75c5eaec724e`: parent seq7 search×2, seq10 get FIN-01v1, seq12 final, đều Sol/OpenAI. Trả đúng7,08 triệu/7,56 triệu/vượt480 nghìn/5 ngày; giữ cảnh báo QA và cần CFO duyệt phần vượt trước phát sinh. Trong lúc tool chạy UI tạm hiện Luna/Off rồi về Sol/Medium. Đây là lỗi metadata hiển thị, không có bằng chứng model thực thi đổi.
- C03 child `e23bea00-aa9d-45e8-a04e-734e9cf910f0`, child session `agent:enterprise-finance-specialist:subagent:ab7c87b0-7fb2-47fc-9be0-52be517056df`, transcript `e0d42c6c-db59-4f96-8677-3ca3b65e6064`. Registry nhận/chạy/hoàn tất; Luna trả204/294/120, parent Sol trả đủ các kết quả trong UI. Parent completion seq17 bị cắt, có204 nhưng không chứa294/120; không dùng đáp án parent đúng để suy ra đã nhận đủ kết quả chuyên gia. Đã dừng trước C04 để sửa producer và kiểm thử lại.

## Kiểm chứng câu “đã chuyển đến chuyên gia” trong ảnh

1. Người dùng đồng ý một lần; đúng session có một plan được xác nhận và một child được nhận.
2. Child run `e23bea00-aa9d-45e8-a04e-734e9cf910f0` bắt đầu 23:23:18 UTC+7; có transcript riêng, message assistant riêng từ `openai/gpt-5.6-luna`, hoàn tất 23:23:36, outcome `ok`.
3. Kết quả chuyên gia được lưu đầy đủ 1.590 ký tự, gồm số tiền 204/294 triệu, hòa vốn120 triệu và khuyến nghị ở cuối. Không suy luận việc thực thi chỉ từ dòng status UI.
4. Parent nhận completion và trả lời lúc23:23:50. Tuy nhiên completion cũ seq17 chứa đúng projection512 ký tự, mất294/120. Việc đáp án parent đúng không chứng minh handoff đầy đủ vì parent có thể tự tính lại.
5. Sửa `src/agents/subagents/announce/subagent-announce-output.ts`: khi toàn bộ kết quả và nhãn nằm trong giới hạn tổng4.096 ký tự hiện hữu thì giữ đầy đủ; trường hợp vượt ngân sách giữ nguyên giới hạn gọn512, đánh dấu cắt/bỏ và ưu tiên lỗi. Không bỏ sanitize/escape hay nới tổng giới hạn.
6. Regression trước sửa: 2 case mất kết luận cuối thất bại,63 case hiện hữu đạt. Sau sửa: **103/103 tests** của output và requester-settle-wake đạt. Scoped lint/format/diff đạt.
7. Replay đúng payload child cũ qua source đã sửa: findings1.766 ký tự, bằng nguyên nội dung child đã sanitize, không cắt, có204/294/120. Artifact tái chạy: `qa-20260904-c03-completion-proof.mjs`, kết quả `qa-20260904-c03-completion-proof.md`. Đây là source replay, chưa thay thế lượt UI mới sau deploy.

### Sửa nhãn model liên quan C02

Event tra cứu/transcript từng dùng model mặc định process thay cho lựa chọn theo tài khoản. Đã sửa canonical session-event projection và hai producer gateway: event cập nhật tiến độ không ghi đè model/runtime của picker. **187/187 tests** trong3 files đạt; regression tool/transcript thất bại trước sửa. Model thực thi C02 vẫn Sol, không đổi cấu hình. Đang build bản QA có cả hai sửa để kiểm chứng live; gateway chính18789 không bị sửa/restart.

## C03 retest live sau sửa — đạt bàn giao thật

- BuildQA thành công (2m32,5s),4 file production khớp SHA256 với source đã review. QA PID55694 cổng19789 sẵn sàng23:33:44. Chỉ lifecycle QA do lượt này sở hữu; không khởi động lại gateway18789 (PID cổng đó đã đổi do hoạt động ngoài lượt này, không dùng PID cũ để khẳng định bất biến).
- Dùng nút New chat trên đúng ChromeUser; session `agent:enterprise-personal-2ae2cbc2deecdb86fe86:dashboard:953195f0-fac1-4df6-b484-f75864aa5c13`, parent transcript `e81ef49d-39a3-40ec-b313-daa30b92c880`. Gửi nguyên C03, đồng ý đúng một lần.
- Child `330c3b6b-f996-490a-9ce3-17e42c34900d`, transcript riêng `e1c22df0-6b12-4d8d-ac4c-bc9f6e480b4f`, Luna/OpenAI:23:34:52→23:35:09, outcomeok. Admin cập nhật `delegate_started` tương ứng; không lấy tổng2 lượt Admin thay bằng chứng exact-session.
- Child trả1478 ký tự. Parent seq5 chứa **đúng toàn bộ projection đã sanitize**, không markertruncated; completion thông báo xong23:35:28, parentstatusdone. Artifact read-only `qa-20260904-c03-live-proof.json`; tái kiểm bằng `node --import tsx output/qa-20260904-live-delegation-proof.mjs 953195f0`.
- UI trả đủ204/294/120; nêu giả định và khuyến nghị. Đã quan sát ảnh hoàn tất, nút gửi dùng được, không bị che. Lượt này chứng minh lỗi cắt kết quả đã sửa live, không chỉ test source.
- Lỗi nhãn model **vẫn tái hiện ở sự kiện tạo tiêu đề hội thoại mới**, Sol/Medium→Luna/Off→Sol/Medium. Không chấm UI model đạt. Đã khoanh nhánh emitter thiếu scoped config và đang sửa bổ sung.

## C04 — phối hợp thật, còn giới hạn cần tách riêng

- Tự chọn hybrid Contract+Finance, xin một lần đồng ý; không hỏi lại mãBT-0904. ChildContract `6b3f59ca-3a73-4d1d-b263-9ba3e18283c9` và Finance `d14e4a13-f82c-4a68-b93a-0d5f31fb199c`, đều có assistantLuna riêng và outcomeok.
- Sau khi cả2 child xong, parent seq24 tựsearch4lần, seq29 tựget6nguồn: FIN-02v1,OPS-01v1,OPS-02v2,LEG-01v1,LEG-02v1,IT-02v1; seq36Sol hoàn tất23:39:16. Không đồng nhất `local` với “không dùng tri thức”.
- Câu trả lời phân biệt giả địnhVAT10%: còn120.000đ theo hạn mức hoặc vượt360.000đ theo báo giá thực, chưa tính đi lại; ứng38,4triệu trướcthuế; nêu3báogiá,duyệtTài chính/CEO,Phápchế vì dữ liệu,NDA+DPA,ITvàaccountvendor14ngày,UAT/rollback,2lớp15người150phút,đăng ký9ngàylàmviệc,đạt18/20,học lại10ngày,bàn giao2ngày,bảo hành60ngày. Có cảnh báo nguồnQA và chưa nên ký.
- Nguồn hiện có được đọc bởi parent;0transfergrants vẫn giữ nguyên. Không có bằng chứng private-evidence packet được chuyển sang child. Chiều thứTư được parent nhắc là lựa chọn trước đây; không dùng chi tiết đó làm oracle nguồn chính sách mới hoặc khẳng định chỉ dựa vào ngữ cảnh session này.
- **Giới hạn handoff:** hai kết quả dài2835+1757=4592 ký tự; tổng vượt4096 nên producer dùng fallback512/child, parentseq23 có2dấu cắt. F4 đã sửa trường hợp toàn bộ vừa ngân sách; chưa giải quyết việc đọc đầy đủ kết quả lớn hơn ngân sách. Vì vậy không chấm C04 “nhận nguyên toàn bộ chuyên gia”.
- **Lỗi approval riêng:** Contract thử tìm file bằngsandbox_exec; tool không chạy vì brokerrequest thiếu Enterprisesession. Đây là chặn quyền, không phải lỗi spawn. Audit ghi `mutation_confirmation_expired` nhưng kết nối bị `enterprise_session_invalid` tức thì, callbackCANCELLED; không có bằng chứng đợi hếtTTL. Giữ nguyên từ chối, không đổi TTL/allowlist hay dùng đồng ý bàn giao để cho phép shell. Sửa đúng transport cần thêm hợp đồng xác thực và routingapproval theo tài khoản, vượt bản sửa nhỏ đã kiểm chứng; chưa triển khai.

### Bổ sung sửa nhãn ở title event

`session-change-event.ts` có scopedconfig nhưng không truyền vào `loadGatewaySessionRow`, làm loader quay về defaultgatewayLuna. Đã truyền cfg qua `session-utils-search.ts`; regression dùng SQLite thật tái hiệnSol→Luna trước sửa, sau sửa**196/196tests** của4suites đạt (bao gồm187tests nêu trước, không cộng trùng). Giữ nguyên publish khi user đổi override thật. Đã review/sync2file và đang buildQA; chưa chấm livepass cho nhánh title.

## C05–C06

- Sau bản buildQA mới thành công và gatewayready23:42:50, user/admin đăng nhập cũ vẫn dùng được; lịch sửC04 tải lại đủ. Hai filetitle fix khớpSHA256 main/snapshot. Chưa kiểm chứng title mới ở giai đoạn này.
- C05: userseq37,run `1383affd-a2b6-4c75-a237-88fb25283725`,finalseq38 lúc23:43:37. Đúng5việc; câu chắc chắn có điều kiệnVAT được ghi rõ, phân biệt đề xuất đàm phán, yêu cầu xác nhận phê duyệt/chính sách thật. Routerlocal/no_candidate, khôngtool haychild mới.
- C06: userseq39,run `1709ec99-54d9-4cc8-9846-786186e364a9`,finalseq40 lúc23:44:01. Dịch gọn “Budget & Contract Risk Analysis”; routerlocal/no_candidate dù có2từkhóa chuyên môn, khôngtool/child mới. UI đáp án và composer hiển thị đúngSol/Medium.

## C07

Run `40cc5d31-d637-4847-bb59-d4b4f240dac3`, userseq41→finalseq50 lúc23:44:50. Agent tựsearch4lần/get1lần rồi nói chưa xác định được mức hỗ trợ hay hạn hồ sơ; nguồn HR không quy định khoản này và là dữ liệuQA, cần xác nhận HR/C&B. Không tự lấy chế độ pháp luật chung thay chính sách nội bộ, không phát sinh child. UI đọc được câu trả lời và giữSol/Medium.

## C08–C09: làm rõ đúng, nhưng đổi chủ đề chưa đạt

- C08 gửi nguyên văn: “Mình còn một hợp đồng thuê kho khác, bạn xem điều khoản phạt trong đó có ổn không?” Userseq51, run `853f504c-178f-492f-9c84-b040e27da5bc`; hostseq52 lúc23:44:59 hỏi “Bạn cần kiểm tra hợp đồng số nào?”. Router báo thiếu input, không lấy nhầm mãBT-0904 của việc cũ và không khởi chạy chuyên gia mới: đạt.
- C09 gửi nguyên văn: “Thôi để hợp đồng kho sau nhé. Giờ mình cần biết dữ liệu bị xóa nhầm 31 ngày trước thì còn trong thời gian lưu bản sao của bên mình không?” Userseq53, run `2467c18e-35b1-4c40-a378-e6e62c04e655`; hostseq54 lúc23:45:24.896 yêu cầu gửi lại vì chưa chuyển việc. Event `babf633f-57ed-4d3b-97e3-7a543ff41386` ghi `router_response_invalid_schema`, latency2689ms, vẫn targetContract. Không có search/get hay child mới: lỗi xử lý đổi chủ đề, chưa đạt oracle35ngày.
- Parser giữ nguyên fail-closed và không lưu raw provider JSON để bảo vệ nội dung riêng tư. Vì vậy log trên không chứng minh được chính xác field nào của phản hồi cũ sai. Source xác nhận request hiện chỉ yêu cầu JSON bằng prompt, chưa ràng buộc schema ở transport; đang kiểm tra/sửa hợp đồng đầu ra và sẽ chạy lại đúng C08→C09. Không bổ sung từ khóa định tuyến riêng cho câu kiểm thử, không nới parser hoặc quyền.
- Dừng trướcC10 để sửaC09; số childaccepted/ended của session gốc vẫn3. Không gửi lại câuC09 rồi dùng may mắn ở lần sau để coi là đã sửa.

### Bản sửa C09 trước retest live

- Router thêm schema nghiêm ngặt, có đủ required fields và cấm keys ngoài hợp đồng; schema riêng cho lượt có/không có pending. Phân biệt ngữ nghĩa “hủy việc cũ và thay bằng việc khác” với chỉ hủy. Parser, consent/provenance/quyền, timeout, số retry và giới hạn không đổi.
- `simple-completion-runtime.ts` bổ sung type cho responseFormat. Hai chỗ làm rơi dữ liệu thật là `packages/ai/src/providers/simple-options.ts` và `openai-chatgpt-responses.ts`; đã chuyển schema qua cả hai. Tái dùng converter canonical bằng cách export, không copy thuật toán. Request Responses đặt schema dưới `text.format`, không thêm top-level response_format. Đối chiếu [tài liệu Structured Outputs chính thức](https://developers.openai.com/api/docs/guides/structured-outputs); khả năng chấp nhận của backend QA vẫn phải chứng minh bằng live, không suy từ tài liệu.
- Router regression trước sửa57đạt/1lỗi thiếuresponseFormat; sau sửa103/103đạt trong3suites. Kiểm tra wire trước sửa6lỗi/33đạt; sau sửa69/69đạt trong4suites, gồm đường direct/simple, schema nested/flat/JSONobject, mặc định và wrapper. Không có capture raw provider body của lần C09 cũ; không khẳng định biết field lỗi cụ thể.
- Typed lint production đạt; rawlint file continuationtest còn cảnh báo no-map-spread cũ và max-lines (file đã quá ngưỡng trước sửa), không gọi toàn bộ dirty-worktree gate đạt.
- Đã review và sync đúng5file production; snapshot trước/sau chỉ khác các hunk nhiệm vụ này và5SHA256 khớp. QA PID75582 dừng sạch158ms lúc23:54:51; build đầy đủ tại checkout QA thành công2m27,7s (gồm tsdown-ai và UI), khởi động lại đúng launchdescriptor để chạyC08→C09. Chưa chấm live đạt.
- Fingerprint môi trường trước/sau vẫn `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`: không đổi6vùngactive, accountpolicy4, routerpolicy2, binding hay0evidenceTransferGrants.

### C09 retest lần1 sau bản sửa — vẫn lỗi, không chấm xanh

- QA ready23:57:34, Chrome giữ đăng nhập cũ. New chat tạo session `a9fcab60-6376-4062-bdd4-ca306ad083fb`; C08 run `86530928-50a4-474d-a9ca-5b5e65e13c45` hỏi đúng mã hợp đồng, không có child. Trong sự kiện tạo tiêu đề mới “Xem điều khoản phạt hợp đồng thuê kho”, UI quan sát vẫnSol/Medium; nhánh title fix không còn tái hiện nhảyLuna ở mốc này.
- C09 nguyên văn run `65d39945-05f7-4661-8d00-8ffba3dc23c8`, event `aa9084cf-51c2-44ef-8c9b-7001f10159dc` lúc23:58:33 vẫn `router_response_invalid_schema` sau2540ms. Hostseq6 lại yêu cầu gửi lại; khôngsearch/get/child. Giữ nguyên lần lỗi, không dùng69tests xanh thay kết quảlive.
- Đã xác định đường thực tế qua `prepareCodexSimpleTransportModel` → managedalias `openclaw-openai-chatgpt-responses-transport` → `createOpenAIResponsesTransportStreamFn`, không đi qua physicalprovider được test ban đầu. Hàm tương thích ở `openai-responses-params-internal.ts` vẫn xóa `text.format`. Đang sửa/kiểm tra đúng activepath; chưa chấmC09đạt, chưa chạyC10/C11 hay phiên tổng hợp.

### Bổ sung đúng managed transport

- Xác minh builder lọc request lần1, sau `onPayload` lại lọc lần2. Cả hai gọi cùng sanitizer; điều kiện nhận diện nativebackend bao gồm đúng alias của QA. Nhận định trước đó rằng nhánh sanitizer chỉ là legacy không dùng trongQA là sai và đã được sửa trong kết luận.
- Bỏ duy nhất helper/call xóa `text.format`; giữ nguyên blacklist các trường top-level, auth/model/cache/reasoning, kiểm tra quyền và parser. Review độc lập xác nhận không thêm quyền hay dữ liệu đầu vào.
- Regression mới chỉ mock HTTPendpoint, giữ SDK/builder/sanitizer thật: trước sửa4caseChatGPTraw/managedalias từoptions/payloadhook thất bại,2casepublicResponses đạt; sau sửa95/95tests trong6suites đạt. Test vẫn không thay thế bằng chứng backendlive.
- Không chạy replay dựng lại config/auth vì helper hydration có thể ghi state; không có rawcompletion lịch sử được thu thập và không đoán field JSON nào từng sai.
- Sync đúng một productiondelta sangQA, SHA256 khớp `2befb47cfefb01551885a555f2c9dab94db6dad089c8fe0f4bd223925d7591f4`. PID7297 dừng sạch174ms lúc00:03:34 ngày05/09; build đầy đủ thành công2m37,1s rồi khởi động lại đúnglaunchdescriptor. Scopedtypedlint/diff đạt;95 là tổngsuite mới đã gồm69 trước đó, không cộng trùng.

### C09 retest2 — đạt live ngày05/09

QA ready00:06:25. New chat `92db399b-4dc7-49a3-b7ea-4db8882d8003`, C08 hỏi đúng mã hợp đồng, sau đó gửi nguyênC09 một lần. C09 run `5aa55c99-cc5b-4a4d-a6e9-3bdd70fa9ab8`; event `b2ecdf0e-d010-42d7-8632-ec397cee764c` chuyển sanglocal/router_no_candidate sau5056ms, khôngtargetContract. Parent tựsearch1lần/get2lần đọcIT-02v1 vàIT-01v1, trả “lưu35ngày;31ngày vẫn trong hạn”, phân biệt phạm vi/thời điểm sao lưu với khả năng khôi phục thực tế. Không có child, không tạo ticket hay khôi phục dữ liệu thật. UI hoàn tất, giữSol/Medium, Admin có đúngeventlocal và vẫn giữhai eventlỗi trước đó. Lần này chứng minh backend chấp nhận request và ứng dụng xử lý tiếp thành công; không chỉ kết quảunit.

## C10 — đạt ở phiên retest2

Session92db399b, parenttranscript `b7245053-d4a8-437f-ba77-de0605c54d68`, run `a161fdfe-0ed0-48c4-9c73-70afd0af35ce`. Tựsearch3lần/get4lần: HR-01v2,HR-02v1,IT-01v1,IT-02v1. Trả đúng laptop yêu cầu trước4ngàylàmviệc, MFAngày1, lịchngày1–5 và chươngtrình9ngày, buddy30ngày, quảnlýtrựctiếpxácnhận, remote≤2ngày/tuần/đăngkýtrước16h/ngàyliềntrước/khôngáppdụngcatrựcquầy. Nêu nguồnQA và không có ngoại lệ làmởnhàcảtuần; phần chuẩn bị7–10ngày vàcheck-in15phút ghi rõ là đềxuất, không phải chínhsách. Routerlocal3675ms,0child; UIhoàntất1phút9giây,Sol/Medium. Không tạo thiếtbị/tàikhoảnthật.

## C11 — đạt, không nhầm điều kiện hội nhập với đào tạo chi nhánh

Cùngsession92db399b, run `229af482-6d3e-4aad-aacc-11106f18e24e`, userseq23 → finalseq24 lúc00:10:05 ngày05/09. Tái dùngHR-01v2 vừa đọc ởC10, trả đúng chươngtrình9ngàylàmviệc,20câu/đạt16(80%), học bổ sung rồi thi lại sau2ngàylàmviệc, quảnlýtrựctiếpxácnhận/nhânviênkhôngtựđánh dấu. Phân biệtbuddy30ngày không phải điều kiện chờ đủ30ngày đểhoàntất. Routerlocal2448ms, khôngtool/child mới. UIhiểnthịđủ,cónguồn và giữSol/Medium.
