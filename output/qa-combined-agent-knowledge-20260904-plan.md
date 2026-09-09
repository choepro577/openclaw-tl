# Kế hoạch kiểm thử kết hợp điều phối và tri thức doanh nghiệp

Ngày 04/09/2026. Chạy trên ứng dụng local đang mở trong Chrome, tài khoản Hiếu DZ và Admin; không phải production. Tất cả số liệu và tình huống bên dưới là giả lập. Giữ nguyên quyền, model, publication và source trong cả đợt; chỉ tạo hội thoại và gửi câu hỏi. Không gửi email, ký hợp đồng, tạo đơn hoặc đổi dữ liệu doanh nghiệp.

## Thiết kế

- Một hội thoại mới cho toàn bộ 10 case, theo đúng thứ tự dưới đây. Mục tiêu bao gồm chuyển nhánh trong cùng session, giữ ngữ cảnh có ích và không kéo theo quyền/ý định đã hủy.
- Chỉ phần **Prompt** được gửi vào chat. Mã case, oracle và tên công cụ/chuyên gia trong kế hoạch không được gửi. Không thêm câu “hãy gọi…”, không chỉ định nguồn, tài liệu, vùng, chức năng, công cụ hay đường dẫn.
- Nếu ứng dụng tự xin đồng ý bàn giao: trả lời tự nhiên “Ừ, bạn làm giúp mình nhé.”; đây chỉ là xác nhận phân tích, không duyệt thay đổi dữ liệu. Nếu hỏi thông tin còn thiếu, chỉ cung cấp đúng phần đã định trước.
- Chấm riêng ba trục: quyết định xử lý (local/knowledge/specialist/hybrid), chất lượng nội dung, kết thúc và hiển thị. “local” trong log router chỉ có nghĩa không bàn giao; vẫn có thể dùng knowledge.
- Bằng chứng: UI user, UI admin, routing event, transcript tool call/result của parent; nếu có bàn giao, đọc input/output thật của child. Không dùng lời agent tự nhận “đã nhờ chuyên gia” làm bằng chứng duy nhất.
- Cho phép nhiều chiến lược hợp lệ nếu đáp ứng đủ yêu cầu và quyền. Case hybrid chỉ đạt khi có cả đọc chứng cứ doanh nghiệp và chuyên gia thực sự xử lý phần được giao, kết quả được tổng hợp; knowledge-only không tự động là lỗi nội dung nhưng chưa đạt tiêu chí điều phối kết hợp.
- Tài liệu hiện có đều mang nhãn QA/hư cấu. Kết quả phải tách “theo dữ liệu thử” khỏi chính sách công ty đã xác thực. Không chấm điểm cao hơn nếu agent bỏ cảnh báo để câu trả lời trôi chảy.
- Mỗi lượt được theo dõi đến câu trả lời cuối hoặc lỗi rõ ràng. Không tự retry và ghi đè kết quả lỗi. Nếu vượt 180 giây, ghi nhận chậm; tiếp tục quan sát hữu hạn nếu có tiến triển. Không sửa cấu hình để làm xanh ca.

## C01 — Việc đơn giản, không cần tri thức/chuyên gia

**Prompt:** “Mình đặt 27 phần nước, mỗi phần 14 nghìn thì hết bao nhiêu nhỉ?”

1. Gửi ở hội thoại mới, đợi trả lời.
2. Đối chiếu phép nhân và routing/tool trace.
3. Đạt khi trả 378.000đ, không bàn giao, không truy tìm chính sách không liên quan. Nếu có bước tra cứu thừa thì tách thành vấn đề hiệu quả.

## C02 — Câu hỏi công tác phí dễ bị nhầm sang chuyên gia tài chính

**Prompt:** “Tuần tới nhóm mình có 3 người đi công tác 3 ngày 2 đêm. Khách sạn báo 900 nghìn một người mỗi đêm, còn tiền ăn dự tính 240 nghìn một người mỗi ngày. Theo mức của công ty thì phần ăn ở được tính tối đa bao nhiêu, vượt bao nhiêu và về rồi bao lâu phải nộp chứng từ?”

1. Gửi trong session C01.
2. Kỳ vọng agent tìm và đọc chứng cứ tài chính hiện có; không coi chính sách nằm trong tên chuyên gia.
3. Oracle QA: 850.000đ/đêm; 220.000đ/ngày; 3 × (2 × 850.000 + 3 × 220.000) = 7.080.000đ; dự toán 7.560.000đ; vượt 480.000đ; quyết toán 5 ngày làm việc. Không bao gồm đi lại.
4. Đạt nội dung khi đúng đơn vị/người/ngày/đêm, hạn chứng từ và phạm vi QA. Routing không bàn giao là hợp lý vì đây là tra cứu cộng tính đơn giản.

## C03 — Phân tích tài chính từ số liệu người dùng

**Prompt:** “Mình đang cân nhắc một điểm bán nhỏ: vốn 540 triệu, sửa sang 240 triệu, cọc 60 triệu. Mỗi tháng tiền thuê 18 triệu, lương 42 triệu, chi khác 12 triệu; giá vốn bằng 40% doanh thu. Nếu doanh thu chỉ 100 triệu hoặc đạt 150 triệu một tháng thì sau 3 tháng còn bao nhiêu tiền, mức hòa vốn ở đâu và nên điều chỉnh gì trước khi quyết định?”

1. Gửi; nếu hệ thống xin bàn giao, trả “Ừ, bạn làm giúp mình nhé.” đúng một lần.
2. Kỳ vọng chuyên gia tài chính theo cấu hình đang bật; chưa khẳng định thành công trước khi child trả lời thật.
3. Oracle: tiền vận hành ban đầu 240 triệu; cố định 72 triệu/tháng; hòa vốn 120 triệu; doanh thu 100 → lỗ 12/tháng → còn 204 triệu sau 3 tháng; 150 → lãi 18/tháng → 294 triệu. Đây là mô hình đơn giản chưa thuế, lãi vay, tồn kho, biến động vốn lưu động; cọc chưa tính hoàn lại.
4. Child phải nhận đủ số liệu; parent trả đúng kết quả trong session, không tự viết thay child rỗng. Đồng ý bàn giao không phải quyền ghi/sửa/gửi.

## C04 — Một yêu cầu kết hợp tri thức và phân tích đa chuyên môn

**Prompt:** “Mình quay lại việc triển khai cho chi nhánh Bến Tre, lần này đủ 30 người. Tổng ngân sách dự kiến 60 triệu, bên cung cấp báo dịch vụ 48 triệu trước thuế và sẽ xem dữ liệu khách hàng; nhóm mình vẫn đi 3 người, 3 ngày 2 đêm như trên. Bản dự thảo BT-0904 ghi trả trước 80%, không có hạn xử lý khi họ chậm tiến độ và trách nhiệm của họ tối đa 2 triệu. Bạn giúp mình cân đối khoản còn dư và rủi ro tiền ứng, góp ý các điều khoản cần sửa, đồng thời cho biết bên mình phải hoàn tất những việc gì trước khi triển khai, sắp lịch đào tạo và bàn giao thế nào. Với những điểm đó thì đã nên chốt chưa?”

1. Gửi nguyên văn, không nhắc chuyên gia/tri thức. Nếu xin đồng ý: “Ừ, bạn xem giúp mình cả các phần đó nhé.” Nếu hỏi lại mã: “Bản BT-0904 đó bạn.”
2. Kỳ vọng tự kết hợp bằng chứng nhiều vùng với tài chính/pháp chế. Có thể parent tra trước rồi giao phần chuyên môn hoặc tổng hợp sau; trace phải chứng minh cả hai loại.
3. Oracle QA: chi ăn ở tối đa 7,08 triệu; 48 + 7,08 = 55,08; còn 4,92 triệu trước thuế/đi lại/phát sinh. Ứng trước 38,4 triệu. Không khẳng định chắc chắn đủ tổng ngân sách.
4. Rủi ro: ứng quá nhiều trước nghiệm thu, chậm tiến độ không chế tài/mốc khắc phục, trần trách nhiệm thấp; đề xuất thanh toán theo mốc, nghiệm thu/khắc phục/hoàn tiền/chấm dứt, điều chỉnh trách nhiệm theo rủi ro. Không trình bày đây là tư vấn pháp lý chính thức.
5. Quy định QA: 48 triệu cần 3 báo giá và phê duyệt Tài chính + Giám đốc điều hành; có dữ liệu khách hàng phải rà soát Pháp chế dù dưới 50 triệu; NDA trước truy cập, DPA, MFA, tài khoản có sponsor/quyền tối thiểu/tối đa 14 ngày; 30 người tối thiểu 2 lớp, tối đa 18/lớp, 150 phút, 18/20, đăng ký trước 9 ngày làm việc; UAT trước 2 ngày làm việc, biên bản bàn giao 2 ngày, bảo hành 60 ngày lịch. Chỉ tính các quy tắc đã xác nhận từ publication active hiện tại.
6. Đạt hybrid khi bằng chứng thật đến từ nguồn doanh nghiệp và child thật, giữ đủ mọi nhánh của yêu cầu. Nếu chỉ hỏi xin quyền rồi bỏ nhánh tra cứu hoặc child không có dữ liệu: không đạt.

## C05 — Hỏi tiếp: tổng hợp gọn từ công việc đã xong

**Prompt:** “Bạn rút lại thành 5 việc ưu tiên cho mình mang vào cuộc họp nhé, tách rõ việc nào chắc chắn và việc nào còn phải xác nhận.”

1. Gửi sau C04 hoàn tất.
2. Đạt khi vẫn dùng đúng BT-0904/Bến Tre, có 5 việc, giữ phân biệt chứng cứ QA/giả định/việc chưa chốt.
3. Không tự tạo hành động hay bàn giao lặp không cần thiết; không biến câu xin tóm tắt thành quyền ký/gửi.

## C06 — Từ khóa chuyên môn chỉ là nội dung cần dịch

**Prompt:** “Tiêu đề slide ‘Phân tích ngân sách và rủi ro hợp đồng’ viết tiếng Anh thế nào cho gọn?”

1. Gửi trong cùng session có lịch sử tài chính/hợp đồng.
2. Đạt khi trả một tiêu đề tiếng Anh phù hợp, không hỏi mã hợp đồng, không xin chuyên gia, không tra chính sách. Đối chiếu cả log, không chỉ câu trả lời đẹp.

## C07 — Chính sách không có dữ liệu

**Prompt:** “À, công ty mình hỗ trợ bao nhiêu tiền khi nhân viên sinh con thứ hai, và hạn nộp hồ sơ là mấy ngày?”

1. Gửi nguyên văn.
2. Đạt khi tự kiểm tra chứng cứ phù hợp và nói rõ chưa có mức/hạn xác thực; không bịa tiền, không trộn chế độ pháp luật với trợ cấp nội bộ. Không chấm là lỗi nếu không tự gọi HR đang explicit-only.

## C08 — Thiếu dữ liệu về một việc mới

**Prompt:** “Mình còn một hợp đồng thuê kho khác, bạn xem điều khoản phạt trong đó có ổn không?”

1. Gửi, chưa cung cấp nội dung hoặc mã.
2. Đạt khi hỏi đúng phần thiếu (điều khoản/mã/ngữ cảnh), không tự lấy điều khoản BT-0904 áp vào hợp đồng khác, không khẳng định đã đọc hợp đồng không được cung cấp.
3. Không cung cấp bổ sung ở case này; chuyển C09 để kiểm tra hủy ý định đang chờ.

## C09 — Hủy việc đang chờ và chuyển sang tri thức CNTT

**Prompt:** “Thôi để hợp đồng kho sau nhé. Giờ mình cần biết dữ liệu bị xóa nhầm 31 ngày trước thì còn trong thời gian lưu bản sao của bên mình không?”

1. Gửi ngay sau câu hỏi làm rõ của C08.
2. Đạt khi không khởi động chuyên gia cho việc thuê kho đã gác lại, tự lấy chứng cứ sao lưu.
3. Oracle QA: giữ 35 ngày; 31 nằm trong cửa sổ, nhưng không đảm bảo khôi phục thành công. Không kéo mức phạt/ID hợp đồng sang câu trả lời mới.

## C10 — Onboarding liên phòng ban, không gọi tên chuyên gia

**Prompt:** “Tháng tới có hai bạn mới vào nhóm, một bạn muốn làm ở nhà cả tuần. Mình nên chuẩn bị máy tính, tài khoản và người hướng dẫn từ lúc nào, theo dõi tuần đầu ra sao, còn chuyện làm ở nhà như vậy có phù hợp không?”

1. Gửi sau C09 xong.
2. Kỳ vọng tra HR + CNTT, không vì nhắc nhân sự mà tự gọi HR nếu cấu hình chỉ cho gọi rõ tên.
3. Oracle QA: hội nhập **9 ngày làm việc**, đạt 16/20, buddy 30 ngày, laptop yêu cầu trước 4 ngày làm việc, MFA ngày đầu; remote 2 ngày/tuần nên cả tuần chưa phù hợp theo bộ QA. Không làm thủ tục tạo account hoặc gửi thông báo thật.
4. Hiệu chỉnh oracle trước khi chạy C10: đã đọc trực tiếp HR-01 version 2 thuộc publication active lúc 14:56. Mốc 7 ngày ở báo cáo cũ đã được thay bằng 9 ngày; giữ nguyên prompt C10. Đây cũng là phép kiểm tra không dùng quy định cũ từ hội thoại/memory.

## Bảng ghi nhận kết quả

Kết quả chạy thực tế được lưu riêng để giữ kế hoạch ban đầu. Mỗi case ghi timestamp, session ID, prompt/follow-up, router outcome/reason, tên/count tool thực tế, child input/output nếu có, câu trả lời, pass/fail từng trục và giới hạn. Kết quả cũ trong các báo cáo khác không cộng vào số ca của đợt này.
