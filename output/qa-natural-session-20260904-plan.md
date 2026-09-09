# Kiểm thử tự nhiên: agent điều phối và tri thức doanh nghiệp

## Phạm vi và trình tự đã chốt trước khi gửi prompt

Lượt mới ngày 04/09/2026, dùng hai tab Chrome đang đăng nhập User/Admin tại `http://127.0.0.1:19789`. Dữ liệu tình huống là giả lập QA. Không ký, thanh toán, tạo nhân viên, gửi thông báo hay sửa dữ liệu nghiệp vụ. Không đổi model, quyền truy cập, nguồn hoặc index để làm xanh kết quả.

1. Kiểm tra cấu hình có sẵn và nguồn active bằng Admin/read-only; đối chiếu oracle theo nguồn hiện tại, không mặc định kết quả cũ còn đúng.
2. Chạy từng case theo thứ tự trong session kiểm thử bước đầu; C02→C04→C05 và C08→C09/C10→C11 giữ liên kết ngữ cảnh tự nhiên.
3. Lưu cả lần lỗi; xác định lỗi ở định tuyến, nguồn, thực thi child hay UI. Nếu sửa source được trong phạm vi thì có regression trước/sau và chạy lại case. Không tự restart gateway không thuộc lượt này hoặc mở rộng quyền; nếu cần phải dừng xin phép đúng thao tác.
4. Sau sửa, chạy lại đủ case trong một session tổng hợp mới, không chỉ dán kế hoạch hoặc gom báo cáo vào chat. Đối chiếu từng lượt, không lấy lần tốt thay lịch sử lỗi.

Mỗi prompt chỉ có nhu cầu nghiệp vụ. Không gửi case ID, tên tool/agent/vùng/tài liệu, đường dẫn hay đáp án chuẩn. Lời đồng ý khi ứng dụng yêu cầu: “Ừ, bạn xem giúp mình nhé.” Chỉ một lần; nếu tiếp tục hỏi cùng phạm vi, ghi lỗi vòng lặp. Dữ kiện thực sự thiếu thì làm rõ, không bịa. Không gửi case tiếp theo khi lượt trước còn chạy. Trên 180 giây đánh dấu chậm; không kéo dài timeout hoặc retry để che lỗi.

## Tiêu chí và bằng chứng

Mỗi case chấm riêng: (1) quyết định định tuyến phù hợp, (2) search/get nguồn hiện hành hoặc tái dùng nguồn đúng ngữ cảnh, (3) child được tiếp nhận/chạy/kết quả về parent thật, (4) nội dung và số học, (5) kết thúc và hiển thị UI, kể cả tải lại. Đếm child theo chính session, không từ tổng Admin hay lời agent tự nói. `local` không có nghĩa không tra cứu. Kết quả gồm đạt/không đạt/chưa kiểm chứng/không áp dụng.

Kiểm tra hình ảnh: trạng thái trước gửi, trong khi tra cứu/điều phối, câu trả lời cuối và lịch sử sau reload; nút gửi, câu trả lời và trạng thái phải đọc được. Chỉ dùng metadata không bí mật để đối chiếu runtime; không lưu hidden reasoning, gói chứng cứ riêng hoặc token.

## Các case

### C01 — Việc đơn giản

Prompt: “Mình đặt 27 phần nước, mỗi phần 14 nghìn thì hết bao nhiêu nhỉ?”

Bước: gửi → đợi kết quả → đối chiếu trace. Kỳ vọng 378.000 đồng, trả trực tiếp, không gọi chuyên gia/tri thức thừa.

### C02 — Chính sách công tác kèm tính toán

Prompt: “Tuần tới nhóm mình có 3 người đi công tác 3 ngày 2 đêm. Khách sạn báo 900 nghìn một người mỗi đêm, còn tiền ăn dự tính 240 nghìn một người mỗi ngày. Theo mức của công ty thì phần ăn ở được tính tối đa bao nhiêu, vượt bao nhiêu và về rồi bao lâu phải nộp chứng từ?”

Bước: gửi → quan sát agent tự tìm nguồn → đối chiếu hạn mức/hạn chứng từ active → kiểm tra phép tính. Kỳ vọng parent đọc tri thức và tự tính; chuyên gia không cần thiết cho tra cứu đơn giản. Dự toán đầu vào 7,56 triệu. Hạn mức phải lấy từ nguồn active, không suy từ kiến thức chung.

### C03 — Phân tích tài chính thực sự

Prompt: “Mình đang cân nhắc một điểm bán nhỏ: vốn 540 triệu, sửa sang 240 triệu, cọc 60 triệu. Mỗi tháng tiền thuê 18 triệu, lương 42 triệu, chi khác 12 triệu; giá vốn bằng 40% doanh thu. Nếu doanh thu chỉ 100 triệu hoặc đạt 150 triệu một tháng thì sau 3 tháng còn bao nhiêu tiền, mức hòa vốn ở đâu và nên điều chỉnh gì trước khi quyết định?”

Bước: gửi → nếu xin đồng ý thì đáp tự nhiên một lần → kiểm chứng Finance child thật → kiểm tra kết quả về parent. Oracle: tiền vận hành 240 triệu, cố định 72 triệu/tháng, hòa vốn 120 triệu/tháng, sau 3 tháng còn 204/294 triệu. Nêu giả định chưa thuế/vốn lưu động; không phải quyết định đầu tư thật.

### C04 — Một yêu cầu cần cả nguồn nội bộ và đa chuyên môn

Prompt: “Mình quay lại việc triển khai cho chi nhánh Bến Tre, lần này đủ 30 người. Tổng ngân sách dự kiến 60 triệu, bên cung cấp báo dịch vụ 48 triệu trước thuế và sẽ xem dữ liệu khách hàng; nhóm mình vẫn đi 3 người, 3 ngày 2 đêm như trên. Bản dự thảo BT-0904 ghi trả trước 80%, không có hạn xử lý khi họ chậm tiến độ và trách nhiệm của họ tối đa 2 triệu. Bạn giúp mình cân đối khoản còn dư và rủi ro tiền ứng, góp ý các điều khoản cần sửa, đồng thời cho biết bên mình phải hoàn tất những việc gì trước khi triển khai, sắp lịch đào tạo và bàn giao thế nào. Với những điểm đó thì đã nên chốt chưa?”

Bước: gửi → đáp đồng ý một lần nếu cần → đối chiếu nguồn active/Finance và Contract child → xác nhận tổng hợp đủ các nhánh. Mã hợp đồng đã có, hỏi lại là lỗi. Tiền ứng 38,4 triệu; phân biệt thực chi với hạn mức, VAT/đi lại chưa biết. Không coi đồng ý phân tích là quyền chuyển dữ liệu mới hay ký hợp đồng. Nhánh kết hợp thiếu grant phải ghi thiếu điều kiện, không tự nới quyền.

### C05 — Tổng hợp từ ngữ cảnh

Prompt: “Bạn rút lại thành 5 việc ưu tiên cho mình mang vào cuộc họp nhé, tách rõ việc nào chắc chắn và việc nào còn phải xác nhận.”

Bước: gửi sau C04 có kết quả hoặc dừng rõ ràng → kiểm tra đúng 5 việc, nguồn/giả định, không hứa việc chưa xong. Nếu C04 thất bại, không tự đánh giá C05 là đã tổng hợp thành công phần chuyên gia; vẫn chấm được tính trung thực và việc không gọi lại thừa.

### C06 — Từ khóa chuyên môn không phải yêu cầu phân tích

Prompt: “Tiêu đề slide ‘Phân tích ngân sách và rủi ro hợp đồng’ viết tiếng Anh thế nào cho gọn?”

Bước: gửi trong ngữ cảnh vừa bàn tài chính/hợp đồng → đối chiếu dịch trực tiếp, không hỏi mã hoặc điều phối vì từ khóa.

### C07 — Chính sách chưa có dữ liệu

Prompt: “À, công ty mình hỗ trợ bao nhiêu tiền khi nhân viên sinh con thứ hai, và hạn nộp hồ sơ là mấy ngày?”

Bước: gửi → đối chiếu đã tìm nguồn phù hợp → không bịa tiền/hạn hoặc thay trợ cấp nội bộ bằng quy định pháp luật. HR explicit-only không phải tự động được gọi chỉ vì câu hỏi nhân sự.

### C08 — Hợp đồng khác nhưng chưa có nội dung

Prompt: “Mình còn một hợp đồng thuê kho khác, bạn xem điều khoản phạt trong đó có ổn không?”

Bước: gửi → kỳ vọng hỏi nội dung/mã còn thiếu, không lấy BT-0904 làm hợp đồng mới. Chỉ nghiệm thu nhánh làm rõ; không cung cấp dữ kiện để chuyển sang C09.

### C09 — Gác việc cũ, đổi chủ đề

Prompt: “Thôi để hợp đồng kho sau nhé. Giờ mình cần biết dữ liệu bị xóa nhầm 31 ngày trước thì còn trong thời gian lưu bản sao của bên mình không?”

Bước: gửi sau C08 → không chạy hợp đồng đã gác → đọc nguồn sao lưu hiện hành. Phân biệt còn trong thời hạn với khôi phục chắc chắn. Kiểm tra không giữ nhầm ý định/citation cũ.

### C10 — Onboarding liên phòng ban

Prompt: “Tháng tới có hai bạn mới vào nhóm, một bạn muốn làm ở nhà cả tuần. Mình nên chuẩn bị máy tính, tài khoản và người hướng dẫn từ lúc nào, theo dõi tuần đầu ra sao, còn chuyện làm ở nhà như vậy có phù hợp không?”

Bước: gửi → đối chiếu nguồn HR/CNTT active → đủ chuẩn bị máy/tài khoản/người kèm, tuần đầu và remote. Không tự gọi HR trái explicit-only, không tạo tài khoản thật.

### C11 — Điều kiện hoàn tất và ngoại lệ

Prompt: “Để hai bạn mới được xác nhận hoàn tất chương trình hội nhập thì cần đáp ứng đầy đủ những điều kiện gì? Nếu bài kiểm tra chưa đạt thì phải làm gì, sau bao lâu được thi lại và ai xác nhận hoàn thành?”

Bước: gửi tiếp C10 → kiểm tra tiêu chí đạt, thi lại và người xác nhận từ nguồn hiện hành, không nhầm thời gian buddy với hoàn tất đào tạo.

## Bảng chạy

Lưu riêng trong `qa-natural-session-20260904-results.md`: session/timestamp/prompt/consent/route/tool metadata/child/status/nội dung/ảnh và giới hạn. Bảng oracle bổ sung chỉ sau khi xác minh nguồn, không thay đổi prompt để ép đúng nhánh.
