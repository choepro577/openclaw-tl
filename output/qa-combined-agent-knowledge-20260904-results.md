# Kết quả kiểm thử kết hợp — 04/09/2026

Đã hoàn tất 10 case, 15 tin nhắn người dùng, trong **một session** từ 14:46 đến 15:06 ngày 04/09/2026 (UTC+7). Dùng lại hai tab Chrome User/Admin đang mở. Đối chiếu cuối trên User và nạp lại bảng log Admin lúc khoảng 15:10.

**Kết luận: chưa đạt mục tiêu xác nhận điều phối kết hợp ổn định.** Agent lấy được tri thức doanh nghiệp và thường trả lời đúng, nhưng ở C03/C04 đã xin và nhận đồng ý giao chuyên gia rồi không thực hiện bàn giao. Chỉ C02 tạo một child thật; child thiếu đường lấy chính sách nên parent phải tự tra cứu để hoàn thiện câu trả lời.

Chấm bảo thủ theo kế hoạch: **5 đạt, 3 đạt một phần, 2 không đạt**. Đây là kết quả một lượt chạy, không phải tỷ lệ thành công thống kê. C08 chỉ nghiệm thu bước hỏi làm rõ; C10 đúng phần chính của câu hỏi nhưng thiếu một mục trong oracle nên chưa chấm đạt đầy đủ.

- [Kế hoạch chi tiết và 10 prompt nguyên văn](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-agent-knowledge-20260904-plan.md).
- [Mở lại session kiểm thử trên ứng dụng local](http://127.0.0.1:18789/app/chat/enterprise-personal-2ae2cbc2deecdb86fe86/0c6bce71).

## Bảng chốt 10 case

S/G là số lần gọi tìm kiếm/đọc chứng cứ doanh nghiệp ở parent, không phải số tài liệu duy nhất. Child là số lượt chuyên gia thực sự được tạo. `local` của router không có nghĩa là không dùng tri thức.

| Case | Tình huống                        | Đường xử lý thực tế                                         | S/G | Child | Kết quả chung                                    | Seq parent |
| ---- | --------------------------------- | ----------------------------------------------------------- | --: | ----: | ------------------------------------------------ | ---------- |
| C01  | Tính tiền nước                    | Parent trả lời trực tiếp                                    | 0/0 |     0 | Đạt                                              | 1–4        |
| C02  | Hạn mức công tác phí              | Xin phép → Finance child → parent tra chính sách            | 4/1 |     1 | Một phần: nội dung đúng, bàn giao vòng và lỗi UI | 5–19       |
| C03  | Phân tích dòng tiền               | Xin phép → đồng ý → parent tự tính bằng `exec`              | 0/0 |     0 | Không đạt điều phối                              | 20–25      |
| C04  | Ngân sách + hợp đồng + triển khai | Xin hai chuyên gia → hỏi lại mã/đồng ý → chỉ parent tra cứu | 5/6 |     0 | Không đạt kết hợp                                | 26–47      |
| C05  | Rút thành 5 việc                  | Parent tổng hợp; gọi memory bị lỗi                          | 0/0 |     0 | Một phần: lộ hướng dẫn sửa lỗi kỹ thuật          | 48–51      |
| C06  | Dịch tiêu đề chuyên môn           | Parent dịch trực tiếp                                       | 0/0 |     0 | Đạt                                              | 52–53      |
| C07  | Trợ cấp sinh con không có dữ liệu | Parent tra HR, không bịa mức/hạn                            | 5/2 |     0 | Đạt                                              | 54–66      |
| C08  | Hợp đồng mới thiếu thông tin      | Hỏi mã, không dùng nhầm hợp đồng cũ                         | 0/0 |     0 | Đạt bước làm rõ                                  | 67–68      |
| C09  | Gác hợp đồng, hỏi sao lưu         | Parent tra CNTT, không chạy việc đã gác                     | 1/1 |     0 | Đạt                                              | 69–74      |
| C10  | Onboarding và làm từ xa           | Parent tra HR + CNTT đúng phiên bản                         | 3/3 |     0 | Một phần: thiếu tiêu chí 16/20 trong oracle      | 75–84      |

Tổng parent: 18 search invocation (16 thành công, 2 skipped), 13 get, 1 delegate, 1 exec tính toán, 1 memory_search. Có đúng 1 child, 14 routing event thuộc hash của chính session này. Không cộng child/event của các phiên cũ. Trạng thái cuối parent và child đều `done`.

Đã kiểm tra tự động 10 prompt mở đầu khớp nguyên văn kế hoạch; 5 tin bổ sung chỉ đồng ý hoặc nhắc lại mã hợp đồng. Không gửi tên tool, vùng tri thức, đường dẫn hay chỉ dẫn phải dùng chuyên gia nào. Việc agent tự nêu tên chuyên gia trong câu xin phép không phải chỉ dẫn của người kiểm thử.

## Môi trường đã xác minh

- Chrome profile Hiếu; dùng lại tab user `1369521197` và admin `1369521194`, không đăng nhập lại. Tạo đúng một hội thoại kiểm thử; không tạo tài khoản/zone hoặc nới quyền.
- Hội thoại `0c6bce71-9c17-41c1-af76-222d313d081a`; transcript parent `c93646ed-9f31-4a25-a620-9933c4a0d22d`.
- User Hiếu DZ; Personal Agent `enterprise-personal-2ae2cbc2deecdb86fe86`; model hiển thị GPT-5.6 Sol/Medium. Router Active, model `openai/gpt-5.6-luna`, policy revision 2. Gateway quan sát PID 53793, local port 18789.
- Admin xác nhận: tài chính luôn xin phép; hợp đồng tự chuyển khi chắc chắn, hỏi mã hợp đồng nếu thiếu; HR chỉ khi người dùng gọi tên. Do đó các prompt cố ý không gọi tên HR không thể chứng minh tự điều phối HR.
- 6 vùng được xuất bản, vector ready, graph tắt, chính sách egress hiện là external_allowed. Chỉ Personal Agent có 6 binding; các specialist không có binding trực tiếp. Đây là trạng thái có sẵn, không phải thay đổi của đợt test.
- Doctor lúc 14:51: Tốt; 28 artifact, 0 lỗi integrity, queued/running/stuck đều 0. 2 job lỗi 24h là lịch sử; không dùng con số này để kết luận memory riêng của specialist khỏe.
- Publication active: CNTT #2, Vận hành #3, Nhân sự #3, Pháp chế #2, Sản phẩm #2, Tài chính #2. Phân biệt số publication với version tài liệu: HR-01 v2 là 9 ngày; OPS-02 v2 là 9 ngày đăng ký/60 ngày bảo hành.
- Tất cả tình huống và tài liệu là QA/hư cấu. Chỉ đánh giá khả năng hệ thống; không dùng kết quả làm quyết định tài chính/pháp lý/nhân sự thật.
- So sánh snapshot trước/sau: 6 active publication và 6 zone binding giữ nguyên toàn bộ các trường đã thu thập, gồm ID/version/trạng thái vector/egress/update time. Admin cuối vẫn Active, revision 2. Không có thao tác thay cấu hình trong đợt này.

## Kết quả theo case

### C01 — Phép tính đơn giản

- 14:46:31–14:46:44 theo transcript; UI ghi 8 giây sinh đáp án, không đồng nhất với tổng thời gian kể từ thao tác gửi.
- Router `local / ai / router_no_candidate`; không gọi tool hoặc chuyên gia.
- Trả đúng `27 × 14.000 = 378.000 đồng`.
- **Đạt** cả đường xử lý, nội dung và hoàn tất.

### C02 — Hạn mức công tác phí

- 14:47:06 hỏi → xin đồng ý chuyên gia tài chính → 14:47:36 đồng ý → child được tạo 14:47:49 → parent trả cuối 14:49:39.
- Child `02c8ddfb-a50e-4a35-8af4-dcfd8af5c72f`, transcript `00e2621d-ac9d-4dcb-a6e3-4c9f0daf9f66` nhận đủ câu hỏi. Tính đúng dự toán 7,56 triệu nhưng không lấy được chính sách, không giải được hạn mức/hạn hồ sơ.
- Child thử 4 `memory_search` (index báo built for `fts-only`, expected `text-embedding-3-small`), 1 `sandbox_exec` (bị từ chối phê duyệt), 11 `read` các đường dẫn dự đoán không có tài liệu. Không có enterprise knowledge call ở child.
- Parent có 4 search invocation: 2 bị bỏ qua khi completion của child được đưa vào hàng chờ, 2 chạy thành công; 1 get đọc FIN-01 v1. Phân biệt invocation với truy vấn thực thi thành công.
- Parent tự hoàn thiện đúng: khách sạn 5,1 triệu, ăn 1,98 triệu, tổng 7,08 triệu; vượt 480 nghìn; 5 ngày làm việc; ngoại lệ phải duyệt trước. Nêu rõ nguồn QA không phải chính sách chính thức.
- **Nội dung đạt; định tuyến/hiệu quả có vấn đề; UI chưa đạt.** Câu tra cứu đơn giản bị giao cho specialist không có dữ liệu cần thiết rồi parent phải làm lại. UI vẫn hiện hai thẻ “Knowledge request failed”, trong khi raw result là “Skipped due to queued user message.” Không có thêm tin nhắn người dùng ngoài lời đồng ý; phần đến hàng chờ là internal child completion.
- Admin có `mutation_confirmation_expired`; tool child trả `Plugin approval request rejected: unauthorized`. Không nên đọc mã expired thành bằng chứng người dùng để hết thời gian duyệt. Không sửa quyền hoặc tự duyệt hành động.

### C03 — Phân tích dòng tiền sau khi đồng ý

- 14:50:11 hệ thống xin giao chuyên gia. 14:51:09 nhận đúng câu “Ừ, bạn làm giúp mình nhé.”; 14:51:45 trả kết quả.
- **Nội dung đạt:** vốn vận hành 240 triệu, cố định 72/tháng, hòa vốn 120; hai kịch bản còn 204/294 triệu sau 3 tháng; tách cọc 60 triệu khỏi tiền mặt và nêu giả định.
- **Điều phối không đạt:** chỉ có `exec` ở parent để tính; không có `enterprise_delegate` hoặc child mới. Tổng child vẫn là 1 của C02. Log chỉ có lời xin phép, không có `delegate_started` cho C03.
- Tool report tạo lúc 14:51:11.954 có `enterprise_delegate` và các công cụ tri thức; không thể giải thích bằng việc tool này không được cấp ở lượt C03. Bằng chứng riêng: `qa-combined-c03-tool-availability.json`.
- Chuỗi nhân–quả quan sát: hứa chuyển → người dùng đồng ý → parent tự xử lý → trả đáp án đúng nhưng việc bàn giao đã hứa không xảy ra. Chưa kết luận nguyên nhân sâu ở provider/context vì đợt này không ghi payload gửi provider hoặc thay đổi runtime.

### C04 — Kết hợp ngân sách, hợp đồng và triển khai Bến Tre

- 14:52:16 xin giao Tài chính + Hợp đồng. Người dùng đồng ý 14:53:16; hệ thống hỏi lại mã dù `BT-0904` đã nằm trong prompt đầu. 14:54:02 nhắc lại mã, hệ thống lại xin đồng ý. Bổ sung một lần đồng ý tự nhiên lúc 14:54:35 để kiểm tra phục hồi, không chỉ định cách làm; đây là nhánh phát sinh được ghi lại, không xóa các lượt lỗi trước.
- Trả cuối 14:58:07; UI ghi 3 phút 29 giây cho lượt xử lý cuối, vượt ngưỡng cảnh báo 180 giây; tổng thời gian còn gồm các lượt làm rõ và thời gian thao tác của người kiểm thử.
- **Điều phối kết hợp không đạt.** Parent tự gọi 5 search, 6 get, không gọi delegate. Không có child mới ngoài C02. Admin vẫn chỉ tăng tổng delegated từ 20 trước test lên 21 của C02; C03/C04 chỉ có clarification, không có dispatch.
- Bằng chứng doanh nghiệp đọc thật: OPS-01, OPS-02 v2, FIN-02, LEG-01, LEG-02, IT-02. Có 4 vùng: vận hành, tài chính, pháp chế, CNTT. FIN-01 đã đọc ở C02 và được dùng lại trong cùng ngữ cảnh.
- **Nội dung phần lớn đúng:** 38,4 triệu tiền ứng; dùng dự toán thực chi 7,56 triệu nên còn 4,44 triệu trước VAT, đồng thời phân biệt 7,08 triệu trong hạn mức. Các kịch bản VAT 8%/10% được nêu rõ là giả định cần xác nhận, không phải thuế suất đã biết. Đúng ngưỡng 3 báo giá, duyệt Tài chính + GĐĐH, dữ liệu khách hàng bắt buộc qua Pháp chế, NDA/DPA/MFA/14 ngày, 2 lớp × 15 người, 9 ngày đăng ký, 18/20, bàn giao 2 ngày. Nêu rõ tài liệu QA.
- Giải thích chênh với oracle ngân sách: kế hoạch tính 4,92 triệu còn lại theo **chi trong hạn mức**; đáp án tính 4,44 triệu theo **thực chi dự kiến**, cao hơn 480 nghìn. Đây là hai cơ sở tính khác nhau đã được phân biệt, không chấm 4,44 triệu thành lỗi số học.
- Điểm nội dung cần hoàn thiện: đề xuất go-live 22/09 mà không nói rõ khác mốc dự kiến 18/09 trong OPS-01; không nêu thời lượng bảo hành 60 ngày mặc dù đã đọc OPS-02. Lịch được ghi “đề xuất”, không có hành động đổi lịch thật. C05 sau đó có yêu cầu xác nhận lịch 20–22/09, nhưng không thay thế việc giải thích chênh lệch với nguồn ở C04.
- Không tính parent tự phân tích điều khoản là bằng chứng chuyên gia pháp chế đã làm; đây chính là ranh giới cần kiểm thử.

### C05 — Rút thành 5 việc ưu tiên

- 14:58:34–14:59:55 theo transcript; router local, không bàn giao mới. UI ghi khoảng 1 phút 17 giây cho phần xử lý.
- Nội dung đạt: đúng 5 việc, giữ số 4,44 triệu/38,4 triệu/2 triệu và bối cảnh Bến Tre; tách chắc chắn với cần xác nhận; tiếp tục cảnh báo nguồn QA và chưa ký/chuyển tiền.
- **Đạt nội dung, đạt một phần trải nghiệm/hiệu quả:** parent gọi thêm `memory_search` cho thông tin vừa có trong hội thoại; memory bị lỗi lệch model chỉ mục giống C02. Kết quả vẫn được tổng hợp từ ngữ cảnh hiện tại, nhưng cuối câu trả lời đưa lệnh sửa chỉ mục kỹ thuật cho người dùng công ty. Không thực thi các lệnh sửa đó.

### C06 — Dịch tiêu đề chứa từ khóa tài chính/hợp đồng

- 15:00:15–15:00:29 theo transcript; UI ghi 11 giây.
- Trả đúng một tiêu đề: `Budget & Contract Risk Analysis`.
- Router local; không tool, không xin mã, không xin chuyên gia, không mang việc BT-0904 vào câu dịch.
- **Đạt.**

### C07 — Trợ cấp sinh con chưa có dữ liệu

- Trả cuối 15:02:26; UI ghi 1 phút 2 giây.
- Tìm và đọc chứng cứ HR; trả rõ chưa xác nhận được số tiền/hạn nộp vì tài liệu ghi chưa có dữ liệu, đề nghị xác nhận quy chế/HR thật. Không bịa con số, không thay bằng chế độ luật định khác.
- Router local, không tự gọi HR explicit-only.
- **Đạt nội dung và giới hạn quyền.** Có nhiều lượt tìm thêm sau khi đã có HR-02; ghi số chính xác ở bảng trace, không coi số query lớn là bằng chứng chất lượng tốt hơn.

### C08 — Hợp đồng thuê kho mới còn thiếu thông tin

- 15:02:55 hỏi lại “Bạn cần kiểm tra hợp đồng số nào?”; Admin `clarified / required_input_missing:input_a759abfedeed`.
- Không tự gán BT-0904 cho hợp đồng khác, không tự phân tích điều khoản chưa được cung cấp, không tạo child.
- **Đạt phạm vi ca hỏi làm rõ.** Chưa thử hoàn thành hợp đồng mới, vì ca kế tiếp cố ý gác yêu cầu này lại.

### C09 — Gác hợp đồng, chuyển sang sao lưu

- Router chuyển local; 1 search và 1 get đọc IT-02, không tạo chuyên gia hợp đồng.
- Trả đúng 35 ngày, 31 ngày còn trong khoảng lưu; có lưu ý nguồn QA và yêu cầu CNTT xác nhận chính sách thật/bản sao cụ thể còn khả dụng. Không thực hiện phục hồi dữ liệu hoặc gửi yêu cầu thật.
- **Đạt.** Ý định hợp đồng đang chờ không cản trở câu hỏi mới; chưa có bằng chứng yêu cầu cũ tự chạy lại.

### C10 — Onboarding liên phòng ban

- 15:04:30–15:06:15 theo transcript; UI ghi 1 phút 41 giây. Router local; 3 search, 3 get đọc IT-01, HR-01 v2, HR-02. Không tự gọi HR explicit-only.
- Đúng: yêu cầu 2 laptop trước 4 ngày làm việc; tài khoản/MFA ngày 1; lịch ngày 1–5; chương trình 9 ngày, buddy 30 ngày; làm từ xa tối đa 2 ngày/tuần, đăng ký trước 16:00 ngày làm việc liền trước, không áp dụng ca trực quầy. Không dùng mốc onboarding cũ 7 ngày.
- **Đạt định tuyến và dữ kiện chính; một phần về độ phủ oracle:** không đưa tiêu chí hoàn tất 16/20 dù đã đọc HR-01 v2. Prompt chủ yếu hỏi tuần đầu nên đây là khoảng trống độ phủ kế hoạch, không phải một con số trả lời sai. Không nâng thành đạt đầy đủ sau khi nhìn kết quả.
- Câu ưu tiên đến văn phòng tuần đầu được diễn đạt như lời khuyên. Câu “trường hợp đặc biệt cần HR/quản lý phê duyệt riêng” chưa có quy trình ngoại lệ tương ứng trong HR-02; cần diễn đạt là việc nên hỏi xác nhận, không phải một cơ chế ngoại lệ đã được nguồn chứng minh.
- Không tạo máy/tài khoản thật hoặc gửi thông báo. UI có câu trả lời cuối và nút gửi ở trạng thái nghỉ.

## Vấn đề cần xử lý và phép kiểm lại

Mức ưu tiên dưới đây là đề xuất từ tác động quan sát, chưa phải phân công sửa code.

1. **Ưu tiên cao — đồng ý bàn giao nhưng không có bàn giao (C03/C04).** C03: xin phép → đồng ý → chỉ `exec`, không `enterprise_delegate`. C04: xin Tài chính + Hợp đồng → nhận đồng ý → chỉ 5 search/6 get. Tool report C03 chứng minh `enterprise_delegate` có sẵn, nhưng chưa xác định nguyên nhân sâu khiến model không gọi. Khi sửa, kiểm lại bằng chính prompt tự nhiên và bắt buộc có child input/output cùng kết quả về parent; đáp án hay không thay thế bằng chứng này.
2. **Ưu tiên cao — vòng hỏi lại mã/đồng ý (C04).** `BT-0904` đã có ở seq 26 nhưng vẫn bị hỏi ở seq 29; trả mã ở seq 30 lại bị hỏi đồng ý ở seq 31. Người dùng phải gửi 3 lượt bổ sung thay vì một lần đồng ý. Kiểm lại việc giữ input và consent trong cùng yêu cầu đa chuyên môn, đồng thời vẫn giữ C08/C09 để tránh mang nhầm dữ liệu sang việc mới.
3. **Ưu tiên vừa — giao câu chính sách cho chuyên gia không lấy được chính sách (C02).** Child không có binding enterprise knowledge; 4 memory_search lỗi, 11 lần đoán đường dẫn không có nguồn; parent sau đó mới đọc FIN-01. Cần quyết định rõ parent tra và cung cấp chứng cứ trước khi bàn giao, hoặc chọn tra cứu trực tiếp cho câu chỉ có quy định + số học. Không tự cấp thêm quyền chỉ để làm test đạt.
4. **Ưu tiên vừa — phục hồi đúng nhưng hiển thị lỗi gây hiểu nhầm (C02/C05).** Hai search bị skip do internal completion được hiện là “Knowledge request failed”. Memory lỗi lại đưa lệnh sửa chỉ mục vào câu trả lời cho nhân viên. Kiểm lại trạng thái skipped/retried và tách hướng dẫn quản trị khỏi nội dung nghiệp vụ. Doctor enterprise knowledge tốt không phủ định lỗi index của hệ memory riêng.
5. **Ưu tiên vừa — tổng hợp chưa phân biệt đủ nguồn, đề xuất và phần thiếu (C04/C10).** Cần nêu rõ lịch go-live đề xuất khác 18/09 của nguồn; không bỏ mốc bảo hành 60 ngày trong ca hỏi bàn giao; giữ tiêu chí 16/20 nếu trả checklist onboarding đầy đủ; không khẳng định quy trình ngoại lệ remote chưa có chứng cứ.

Đây mới là kiểm thử/đối chiếu, chưa sửa các vấn đề trên. Không chạy lại âm thầm để thay thế kết quả ban đầu. Khi có thay đổi được duyệt, nên mở một session mới cho lượt hồi quy và giữ báo cáo này làm baseline.

## Bằng chứng có thể kiểm tra lại

- [Metrics từng case, tất cả 15 prompt/follow-up, timestamp và seq](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-case-metrics.json).
- [Transcript parent cuối: text, tool call/result, model/provider, không lấy hidden reasoning](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-evidence-parent-final.json).
- [Child Finance duy nhất: nhiệm vụ, tool trace và kết quả thực tế](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-evidence-children-final.json).
- [Tool availability của lượt C03 sau đồng ý](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-c03-tool-availability.json).
- [Môi trường trước](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-environment-before.json) và [môi trường sau + 14 routing event được lọc bằng session hash](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-environment-after.json).
- [Bộ đọc evidence SQLite read-only, đã giới hạn đúng parent/child của phiên này](/Users/hieunguyenduc/workplace/outsource/assistant-tl/openclaw-tl/output/qa-combined-evidence-reader.mjs). Chạy lại đọc trạng thái hiện tại; dùng các snapshot JSON trên để tái hiện kết quả của đợt đã chốt.

Timestamp JSON là UTC; giờ trong báo cáo là UTC+7. Timestamp transcript không bao gồm toàn bộ thời gian router trước khi ghi tin nhắn: chẳng hạn C08 ghi user/assistant sát nhau nhưng router mất 5.276 giây, không được báo thành phản hồi tức thì. Thời lượng UI, router latency và tổng khoảng thời gian có thao tác xác nhận của người kiểm thử là ba số khác nhau.

## Phạm vi bằng chứng

Đây là một đợt kiểm thử người dùng tự nhiên trên gateway local, không phải unit-test suite, benchmark thống kê hoặc nghiệm thu production. Không cộng kết quả kiểm thử của các đợt trước. Không sửa source sản phẩm, build, restart, đổi model, cấp quyền, publish/rollback tri thức hoặc gửi thông tin tới người thật.

Chưa chứng minh: điều phối HR tự động (cấu hình không cho), một lượt chuyên gia Hợp đồng hoàn tất, nhiều child song song, trường hợp specialist đọc trực tiếp zone được cấp, khả năng tái lập theo tỷ lệ nhiều lần, hoặc độ đúng của chính sách doanh nghiệp thật. Các tài liệu đều là fixture QA; câu trả lời trong session không phải tư vấn tài chính/pháp lý/nhân sự chính thức. Đợt này không thay đổi thời gian lưu, quyền hay nội dung chứng cứ để làm cho đáp án khớp kỳ vọng.
