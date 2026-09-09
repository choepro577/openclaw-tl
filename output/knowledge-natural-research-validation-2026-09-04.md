# Kiểm thử tri thức doanh nghiệp bằng câu hỏi tự nhiên

Ngày 04/09/2026, trên gateway local `127.0.0.1:18789`. Đây là dữ liệu hư cấu phục vụ kiểm thử, không phải chính sách thật của doanh nghiệp. Kết luận: các ca hỏi tự nhiên, đọc nhiều vùng, nhớ lựa chọn cá nhân qua hội thoại mới, phân biệt publication mới và không bịa chính sách đã đạt sau các sửa nêu dưới đây. Lỗi nhân đôi thẻ hoạt động cũng đã sửa và kiểm chứng bằng một lượt hỏi mới. Các giới hạn cấu hình được ghi riêng; không kết luận toàn bộ sản phẩm không còn lỗi.

## Phiên và phạm vi

- Dùng các phiên Chrome đang đăng nhập: Admin `@admin` và người dùng `Hiếu DZ @hieu`; không phải đăng nhập lại.
- Agent cá nhân: `enterprise-personal-2ae2cbc2deecdb86fe86`.
- Thao tác tạo nguồn, phân quyền, preview, publish và gửi câu hỏi đều qua giao diện thực tế. Đọc SQLite/source chỉ dùng để truy nguyên lỗi và đối chiếu bằng chứng.
- Tác vụ điều phối chạy trong hai tab riêng; không điều khiển tab của tác vụ đó. Các lượt Vitest được điều phối độc quyền, tạm dừng chỉnh source/tests trước khi chạy.
- Kế thừa 5 vùng/10 tài liệu từ đợt trước trong `output/knowledge-validation-2026-09-04.md`; đợt này bổ sung vùng Dự án & Vận hành với 2 tài liệu, tạo thêm một version cập nhật và trực tiếp kiểm tra quyền Hiếu ở cả 6 vùng.

## Dữ liệu và trạng thái cuối phần Admin

| Vùng                           | Số nguồn | Ví dụ quy tắc                                                                      | Publication active |
| ------------------------------ | -------: | ---------------------------------------------------------------------------------- | -----------------: |
| Nhân sự & Onboarding           |        2 | Hội nhập 7 ngày làm việc, đạt 16/20, buddy 30 ngày; remote 2 ngày/tuần             |                  1 |
| Tài chính & Chi phí            |        2 | Khách sạn 850.000đ/đêm, ăn 220.000đ/ngày, quyết toán 5 ngày làm việc               |                  1 |
| Pháp chế & Mua sắm             |        2 | Rà soát khi từ 50 triệu **hoặc** có dữ liệu khách hàng; NDA trước truy cập         |                  1 |
| CNTT & An toàn thông tin       |        2 | Laptop trước 4 ngày làm việc; MFA ngày đầu; vendor tối đa 14 ngày; sao lưu 35 ngày |                  1 |
| Sản phẩm & Chăm sóc khách hàng |        2 | Aurora Desk, các gói dịch vụ và giới hạn người dùng; SLA/hoàn phí                  |                  1 |
| Dự án & Vận hành               |        2 | Bến Tre thử nghiệm 18 người, mở rộng 30; đào tạo 2 lớp; UAT và bàn giao            |                  2 |

Toàn bộ 6 vùng active, `local_only`, FTS ready và chỉ bind agent cá nhân Hiếu. Việc cấp toàn bộ vùng đã xác minh bằng checkbox trong Admin và đối chiếu 6 binding. Các agent chuyên gia không được tự động cấp thêm quyền.

Vùng mới có hai nguồn:

1. **OPS-01 — Kế hoạch triển khai chi nhánh Bến Tre:** triển khai CÁNH BUỒM, ngày vận hành dự kiến 18/09/2026; UAT trước 2 ngày làm việc; điều kiện dừng và trình quyết định hoàn tác; theo dõi 10 ngày làm việc; ngân sách 48 triệu nhưng có xử lý dữ liệu khách hàng.
2. **OPS-02 — Đào tạo và bàn giao chi nhánh:** tối đa 18 người/lớp, 150 phút, đạt 18/20 tình huống; học lại 1 lần trong 10 ngày làm việc; gửi biên bản trong 2 ngày làm việc. Version 1: đăng ký trước 6 ngày, bảo hành 45 ngày. Version 2: đổi thành 9 ngày và 60 ngày.

Preview version 2 xác nhận đúng 9/60 trước publish. Khi còn ở bản nháp, user vẫn nhận 6/45 từ publication 1: **đạt cách ly bản nháp**. Publication 2 được xuất bản qua Admin lúc 09:48, lịch sử hiển thị `#2 · Active`, version cũ vẫn có thể rollback.

Doctor lúc 09:51: tổng thể **Tốt**, 28 artifact kiểm tra, 0 lỗi integrity, 0 queued/running/stuck. Hai job thất bại lịch sử lúc 02:41 có mã `STALE_BUILD`, không phải job của đợt bổ sung nguồn này. Search p95 16ms/41 truy vấn là thời gian backend tìm kiếm, không phải thời gian trả lời của mô hình.

Kiểm tra lại trên Admin lúc **10:32**: vẫn **Tốt**, 28 artifact/0 lỗi, hàng đợi và job chạy/kẹt đều 0; vẫn chỉ 2 job lỗi lịch sử. Search p95 47ms/57 truy vấn trên toàn hệ thống lúc quan sát. Ảnh: `knowledge-doctor-final-20260904.png`.

## Các lượt hỏi tự nhiên trước khi sửa

Không câu hỏi nào chỉ định zone, slug, mã tài liệu hay công cụ phải gọi.

| Tình huống                | Câu hỏi/ý định                                                                                                                                                              | Kết quả quan sát                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onboarding liên phòng ban | Đón 2 nhân viên làm từ xa, chuẩn bị máy tính/tài khoản/người hướng dẫn và theo dõi hội nhập                                                                                 | Đạt: tự tra nguồn nhân sự + CNTT; đúng 7 ngày, 16/20, MFA, laptop trước 4 ngày, buddy 30 ngày. Chỉ ra remote toàn thời gian chưa phù hợp giới hạn 2 ngày/tuần. ~73 giây. |
| Đào tạo Bến Tre           | Cần đăng ký trước bao lâu, chia lớp thế nào, học bao lâu, điều kiện đạt, bàn giao và bảo hành                                                                               | Đạt: 6 ngày, 2 lớp cho 30 người, tối đa 18/lớp, 150 phút, 18/20, biên bản 2 ngày, bảo hành 45 ngày. ~29 giây.                                                            |
| Ghi nhớ lựa chọn riêng    | Chốt 2 lớp × 15 người, ưu tiên chiều thứ Tư; ghi nhớ, đây không phải quy định công ty                                                                                       | Agent ghi và đọc lại `MEMORY.md`, file thực tế chứa đầy đủ lựa chọn. ~21 giây.                                                                                           |
| Nhớ lại ở hội thoại mới   | “Lần trước mình đã chốt phương án chia lớp và thời điểm học cho Bến Tre thế nào nhỉ? Nhắc lại lựa chọn đó, rồi đối chiếu với quy định hiện tại về hạn đăng ký và bảo hành.” | **Không đạt trước sửa:** chỉ tìm doanh nghiệp, nói “Hồ sơ không lưu giờ/ca học cụ thể”, mất chiều thứ Tư. Quy định vẫn đúng 6/45 khi version 2 còn draft. ~66 giây.      |

Các hội thoại kiểm chứng: `caec0813` (onboarding), `3b0da394` (đào tạo và ghi nhớ), `30bc1c6f` (lỗi nhớ lại). Ảnh lỗi: `knowledge-memory-before-20260904.png`.

## Nguyên nhân và thay đổi

1. **Ghi được memory nhưng không gọi được công cụ nhớ lại.** Preset phiên bản `standard-coding@1` của Hiếu chỉ cấp 6 công cụ làm việc với file/process. `memory_search` và `memory_get` bị chặn cả quyền tool và sandbox. Đã dùng Admin → Personal Agents → Hiếu DZ → Tools để cấp đúng hai công cụ này, giữ 6 quyền cũ. UI sau lưu xác nhận cả hai “Đã cấp / Sandbox đã mở”. Không đổi preset chung hay mở web/browser cho Hiếu.
2. **Câu hỏi dài mất từ khóa cuối.** FTS trước đây chỉ lấy 32 token đầu. Nay xét tất cả từ duy nhất trong giới hạn 2.000 ký tự có sẵn.
3. **Kết quả đầu tiên của nhiều vùng bị đồng điểm dù độ liên quan khác nhau.** Điểm RRF theo từng vùng không đủ so sánh giữa các vùng. Bổ sung mức khớp từ khóa có dấu và bỏ dấu với tổng trọng số tối đa bằng một kênh RRF. Giữ ưu tiên tiêu đề chính xác và phân biệt các từ Việt như “bạn/bàn”, “nhận/nhân”.
4. **Yêu cầu 12 kết quả bị cắt xuống 8.** Tách số kết quả hybrid khỏi 8 điểm xuất phát dùng để duyệt graph. Giữ đủ kết quả khi graph tắt, shadow, bật nhưng chưa build và khi timeout.
5. **Hướng dẫn agent:** tách câu hỏi nhiều ý thành nhóm từ khóa, thử câu ngắn/từ đồng nghĩa khi thiếu kết quả; tìm lại quy định hiện tại thay vì coi câu trả lời cũ/memory cá nhân là quy định đang hiệu lực. Search vẫn chỉ trả reference; agent phải gọi get để có chứng cứ.

Source thay đổi trong đợt này: `src/enterprise/knowledge/index-store.ts`, test cùng tên, mô tả tool trong `src/agents/tools/enterprise-knowledge-tools.ts`, một đoạn contract trong `docs/specs/enterprise-knowledge-zones.md`. Không commit/push.

## Kiểm tra mã

- Trước sửa: các regression mới tái hiện đồng điểm, từ khóa cuối không được tìm và trả 8 thay vì 12 kết quả.
- Sau sửa: **13/13 test, 3 file, 2 shard, 6,61 giây**. Bao gồm `index-store.test.ts`, `graph-index.test.ts`, `enterprise-knowledge-tools.test.ts`.
- Format 4 file: đạt. Diff whitespace: đạt.
- Focused lint: chưa xanh do 7 lỗi sẵn có ở `index-store.ts`: giới hạn dòng, catch thiếu `unknown`, 5 ép `Number` thừa. Các biểu thức lỗi đã đối chiếu tồn tại ở HEAD; không thêm suppression/đổi baseline. File vốn 841 dòng vật lý, thay đổi này tăng 12 dòng.
- Typecheck dùng chung với tác vụ điều phối: **core đạt**. Core test types còn một lỗi fixture có sẵn tại `src/gateway/gateway-misc.test.ts:798`, thiếu `avatarRevision` của profile; hai đợt sửa không thay file này và không sửa baseline để làm xanh kiểm tra.

## Bằng chứng sau sửa

Kiểm thử trong khoảng dừng chỉnh source, gateway PID 47823, đúng phiên Chrome Hiếu.

### Memory và publication mới: đạt

Hội thoại mới `8eeebb76`, gửi lại nguyên câu hỏi đã thất bại trước đó. Agent gọi 1 `memory_search`, 1 `memory_get`, 1 tìm kiếm doanh nghiệp và 2 lần đọc chứng cứ. Kết quả trong 35 giây:

- Nhớ đúng **2 lớp × 15 người, ưu tiên chiều thứ Tư**, chưa chốt ngày cụ thể; dẫn `MEMORY.md#L3-L6`.
- Quy định hiện tại: **9 ngày làm việc, 60 ngày theo lịch**, dẫn OPS-02 version 2.
- Tách lựa chọn của Hiếu khỏi quy định công ty. Ảnh: `knowledge-memory-after-20260904.png`.

### Nghiên cứu nhiều vùng: đạt

Hội thoại `7b94aedd`. Câu hỏi: chi nhánh Bến Tre chạy thử 18 người rồi mở rộng 30, ngân sách dịch vụ 48 triệu trước thuế, vendor xem dữ liệu khách hàng, công tác 3 ngày 2 đêm; nhờ đề xuất gói phần mềm, thủ tục pháp lý/cấp quyền, mức ăn ở và hạn chứng từ. Không chỉ định vùng/tài liệu.

Agent tự tìm 4 lần và đọc 8 nguồn thuộc 5 vùng: OPS-01/02, PROD-01, FIN-01/02, LEG-01/02, IT-02. Kết quả 89 giây:

- Chọn Enterprise, giải thích Growth tối đa 20 người nên không đủ 30. Không tự bịa giá Enterprise hay khẳng định ngân sách 48 triệu đủ.
- Đúng ngưỡng mua sắm: 3 báo giá, Tài chính + Giám đốc điều hành phê duyệt. Đúng điều kiện **dữ liệu khách hàng ⇒ phải qua Pháp chế**, dù dưới 50 triệu.
- NDA, DPA riêng, MFA, người bảo trợ, quyền tối thiểu và tài khoản vendor tối đa 14 ngày.
- Ăn ở một người: `850.000 × 2 + 220.000 × 3 = 2.360.000đ`; hoàn ứng trong 5 ngày làm việc; không cộng chi phí đi lại chưa biết.
- Nêu đúng đăng ký đào tạo 9 ngày, UAT trước 2 ngày, bàn giao sau 2 ngày và các thông tin còn thiếu. Ảnh: `knowledge-multi-zone-20260904.png`.

### Câu dài không dấu: đã sửa và kiểm thử lại đạt

Hội thoại `03c903f8`, câu hỏi có đoạn mở đầu dài, từ khóa nằm cuối: dữ liệu xóa nhầm 31 ngày trước còn trong thời hạn sao lưu không, bản sao lưu giữ bao lâu?

Search **đã xếp đúng IT-02 đầu tiên** (0,0264; truy vấn tiếng Anh còn chỉ có duy nhất IT-02). Tuy nhiên agent bỏ qua tài liệu vì tên “MFA và truy cập nhà cung cấp”, đọc IT-01/PROD-01/CS-01 và kết luận sai rằng không có thời hạn sao lưu. Thực tế publication active của IT-02 có nguyên câu “Bản sao lưu vận hành giữ 35 ngày.” Tổng 8 search/3 get, 58 giây. Ảnh: `knowledge-backup-before-20260904.png`.

Lỗi nằm ở chiến lược đọc chứng cứ, không phải index không tìm thấy. Đã bổ sung hướng dẫn vào description và kết quả search: đọc những reference được xếp cao trước khi tìm lặp hoặc kết luận không có; không quyết định chỉ từ tiêu đề. Không đưa excerpt vào search, không thay dữ liệu hay nới quyền.

Sau khi watcher nạp bản sửa (PID 73545; `dist/openclaw-tools-Cbz_NL0O.js` chứa hướng dẫn mới), mở chat mới `e8ef94f4` và hỏi lại **nguyên văn câu đã thất bại**. Agent tìm **1 lần**, đọc **IT-02 và IT-01**, trả lời đúng **35 ngày; 31 ngày vẫn nằm trong thời hạn**, đồng thời không cam kết chắc chắn phục hồi được. Thời gian giảm từ **58 xuống 30 giây**, context UI từ khoảng **86,1k xuống 20,2k token** trong hai lượt quan sát; đây là so sánh hai ca thực tế, không phải benchmark thống kê. Ảnh: `knowledge-backup-after-20260904.png`.

Tool contract sau thay đổi prompt được chạy lại trong batch chung của tác vụ điều phối: **1/1 đạt**, batch chung 8 file/499 test đạt. Các test index/graph trước đó vẫn 13/13 đạt; không cộng chồng hai số test.

### Chính sách chưa có dữ liệu

Hội thoại độc lập `0780b5aa`: “Công ty mình hỗ trợ tiền mặt bao nhiêu khi nhân viên sinh con thứ hai, và phải nộp hồ sơ trong bao lâu?” **Đạt:** agent nói chưa xác định được mức/hạn từ kho hiện có, dẫn HR-02 có ghi chưa có thông tin về trợ cấp sinh con. Không tự đưa ra một số tiền hoặc hạn hồ sơ. UI báo hoàn tất trong 35 giây.

### Hiển thị activity: đã sửa và kiểm chứng trực tiếp

UI sau khi hydrate có lúc nhân đôi số search; transcript thực tế vẫn có đúng các lần gọi nêu trên. Truy nguyên transcript xác nhận call/result dùng ID khớp hoàn toàn. Lỗi nằm ở bước loại bản sao lịch sử khi đã có live card: chỉ loại block mang type toolcall/toolresult, trong khi result lưu thực tế có role toolResult và content dạng text, nên kết quả lịch sử còn lại và xuất hiện cạnh live card.

Lúc 10:25, mở lại hội thoại `e8ef94f4` từ danh sách lịch sử đã thấy đúng **1 search + 2 get**, ba card riêng và câu trả lời 35 ngày. Do đó không có bằng chứng get bị mất khỏi lịch sử. Đường history-only đã đúng trước bản sửa UI, nên không dùng riêng kết quả này làm bằng chứng sửa thành công.

Tác vụ điều phối sở hữu bản sửa dùng chung trong `chat-thread-build.ts`, `tool-stream-identity.ts` và bước ghép call/result. Kết quả lưu được ghép vào đúng invocation đang hiển thị, giữ tham số và kết quả, đồng thời kiểm tra lượt chat/nguồn để không gộp nhầm hai hoạt động có mã được dùng lại. Regression giao diện: **257/257 đạt trong 4 file**, gồm 13 ca mới; không gộp các lần gọi chỉ vì cùng tên tool.

Sau bước refactor cuối: vẫn **257/257 đạt**, typed lint 4 file UI đạt. UI-only build cuối đạt trong 3,84 giây, boot asset `control-ui-boot-bXzAsT4m.js`; không restart backend, PID 7753 giữ nguyên. Core regression chung 502 test đạt, core typecheck đạt. UI typecheck toàn dự án vẫn có lỗi baseline ngoài các file sửa: duplicate keys trong `enterprise-user.ts` và cast tại `models-page.ts:196`.

Sau UI build lúc 10:33, tạo chat **`0a0029b9`**, gửi lại nguyên câu hỏi sao lưu dài không dấu, không chỉ định vùng/tài liệu. Lượt này hoàn tất trong **62 giây**, trả lời đúng 35 ngày, 31 ngày còn trong cửa sổ lưu và không hứa chắc phục hồi được. Transcript thực tế có **3 search + 2 get**: hai truy vấn Việt/Anh, đọc IT-02 và IT-01, rồi một truy vấn xác nhận câu “35 ngày”.

Quan sát ngay sau hoàn tất, chưa reload: mở “Worked for 1m 3s” thấy đúng **5 thẻ**, gồm nhóm 2 search, nhóm 2 get và 1 search xác nhận. Không có thẻ bị nhân đôi; hai get vẫn được giữ riêng. Đây là bằng chứng trực tiếp cho trường hợp live/history cùng tồn tại. Ảnh: `knowledge-activity-after-20260904.png`; transcript đã thêm vào `knowledge-natural-runtime-20260904.json`. Số lượt tìm và thời gian có thể khác nhau giữa các lần chạy mô hình; không coi lượt 30 giây trước đó là cam kết độ trễ.

Kiểm tra sau **bản build cuối**: reload `0a0029b9` vẫn hiển thị đúng “Enterprise knowledge searches: 3, evidence requests: 2”, đủ 5 thẻ và câu trả lời 35 ngày. Mở lại `8eeebb76` thấy đúng 1 memory search, 1 memory get, 1 enterprise search, 2 get; câu trả lời vẫn phân biệt lựa chọn 2 × 15/chiều thứ Tư với quy định hiện hành 9 ngày/60 ngày. Cả hai phiên Admin và Hiếu vẫn đăng nhập; Admin để ở danh sách 6 vùng đã xuất bản. Ảnh: `knowledge-activity-history-20260904.png`, `knowledge-memory-history-20260904.png`.

## Artifact kiểm chứng

- `knowledge-memory-before-20260904.png`, `knowledge-memory-after-20260904.png`: trước/sau cấp quyền memory.
- `knowledge-backup-before-20260904.png`, `knowledge-backup-after-20260904.png`: trước/sau sửa chiến lược đọc chứng cứ.
- `knowledge-multi-zone-20260904.png`: phép tính công tác phí và mốc triển khai.
- `knowledge-activity-after-20260904.png`: lượt hỏi mới sau sửa UI, mở đủ 5 hoạt động và không bị trùng.
- `knowledge-activity-history-20260904.png`, `knowledge-memory-history-20260904.png`: lịch sử sao lưu và memory sau bản build cuối.
- `knowledge-six-zones-20260904.png`, `knowledge-doctor-20260904.png`, `knowledge-doctor-final-20260904.png`: danh sách vùng và các lần kiểm tra doctor trên Admin.
- `knowledge-natural-tests-20260904.log`, `knowledge-natural-lint-20260904.log`: kết quả kiểm tra mã.
- `knowledge-natural-runtime-20260904.json`: tên tool, truy vấn và câu trả lời của các lượt kiểm thử; không chứa thông tin đăng nhập.

## Giới hạn bằng chứng

- Đây là kiểm thử thật trên ứng dụng local và phiên thật được người dùng chỉ định; chưa chứng minh một bản triển khai production.
- Các vùng hiện dùng FTS-only có lý do phê duyệt; vector chưa cấu hình, graph đang tắt, OCR qua provider bị policy `local_only` chặn. Đợt này không bật provider ngoài hoặc thay đổi chính sách dữ liệu để làm đẹp kết quả.
- Tìm kiếm hiện vẫn dựa trên từ khóa; không đồng nghĩa với khả năng tìm ngữ nghĩa khi chưa có embedding. Agent cần phân rã truy vấn và đọc chứng cứ.
- Watcher gateway đang chạy sẵn tự restart khi source thay đổi; đã dừng lượt chat trong giai đoạn này. Không tự chạy thêm lệnh restart thủ công.
