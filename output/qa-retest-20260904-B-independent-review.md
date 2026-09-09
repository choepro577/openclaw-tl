# Rà soát lượt B — 04/09/2026

Lượt B đã có **một Finance child thực sự chạy và trả kết quả**, nhưng chưa đạt luồng hoàn chỉnh: parent không có đáp án tổng hợp cho C03 trong snapshot. C04 vẫn chỉ parent tra cứu và phân tích sau lời đồng ý, không có Finance/Contract child mới. C02 đi vào nhánh kết hợp không cần thiết rồi dừng, không trả lời câu công tác phí.

## Snapshot và số đếm

- [Evidence B](qa-retest-20260904-B-evidence.json), chụp 21:29:20 UTC+7.
- [Metrics B](qa-retest-20260904-B-metrics.json).
- Session: `c66f48cd-0eaf-4aa4-a18b-5fbdfd76b90f`.
- 11 prompt mở đầu khớp kế hoạch; **14 tin người dùng + 3 sự kiện nội bộ dạng role=user**. Chỉ 3 tin bổ sung của người dùng là lời đồng ý; không tính completion/wake của child thành người dùng.
- 14 routing event, đều gắn exact session/run hash; 3 selected plan, 2 confirmed plan; 1 child được tiếp nhận và hoàn tất.
- Parent: 14 search, 14 get, 1 specialists_list, 0 memory.
- Fingerprint môi trường vẫn `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`; 0 quyền chuyển chứng cứ. Không thay cấu hình để làm xanh.

Bộ đọc giữ nguyên child assistant output/frozen result, nhưng chỉ xuất hash/số ký tự của thông điệp nội bộ. Không suy ra tin người dùng từ mỗi dòng role=user.

## B-C02 — Sai nhánh, báo không có chứng cứ phù hợp thay vì trả lời

1. Seq 5 gửi dự toán công tác như kế hoạch.
2. Seq 6 hỏi đồng ý giao Finance; audit plan `866eb775-7ce4-4369-8006-5e5e8043bbd8` mang `handling: hybrid`.
3. Seq 7 đồng ý; cùng plan revision 1 có audit `confirmed`.
4. Event `056f293b-53b0-4b60-8270-cb1b3339d8df` ghi `delegate_spawn_failed / approved`, child IDs rỗng.
5. Seq 8 báo chưa khởi chạy được Finance vì chưa tìm thấy chứng cứ phù hợp; không có phép tính/hạn chứng từ.

**Không đạt:** câu tra quy định + số học đơn giản bị định tuyến hybrid, rồi không hoàn tất nội dung. Thông báo thừa nhận chưa làm xong là đúng về tính trung thực; không biến nó thành ca thành công.

Parent transcript có 0 search/get trong C02. Không dùng sự vắng mặt này để khẳng định tuyệt đối bước chuẩn bị riêng không chạy: ngữ cảnh chuẩn bị chứng cứ có thể cố ý không được lưu vào transcript parent. Tài liệu FIN-01 vẫn tồn tại và được đọc thành công ở B-C04 cùng môi trường; thông báo này không chứng minh nguồn công tác phí bị thiếu publication.

Thời gian chờ đồng ý từ khoảng 21:11:45 đến 21:16:28 là thời gian người kiểm thử chưa thao tác; không gán khoảng đó thành latency model hoặc lỗi xử lý chậm.

## B-C03 — Có child thật, chưa có tổng hợp parent

- Seq 9 đủ số liệu; seq 10 hỏi Finance, seq 11 đồng ý.
- Plan `036561c2-44ae-465e-82db-ec7bf5f1b975` revision 1 có selected và confirmed.
- Event `81aea9d6-6378-4af9-8399-65924ceedc96`: `delegate_started / delegated / approved`.
- Child run `78efd186-e93b-4b4f-bb2c-87b07cd835c9`; child session `agent:enterprise-finance-specialist:subagent:86870836-6b30-4886-a0e3-3d9ccabf978e`; transcript `7282550c-c1bd-47c0-b037-fc71f7023a84`.
- Child bắt đầu 21:17:26.963, kết thúc 21:17:46.051; registry outcome `ok`, reason `subagent-complete`.
- Child assistant output thực tế, model gpt-5.6-luna/provider openai, có đủ số 540/240/60, chi phí 18/42/12, giá vốn 40%, hai kịch bản 100/150; trả đúng 240 triệu tiền vận hành, 72 triệu cố định, 204/294 triệu cuối tháng 3 và 120 triệu hòa vốn. Kết quả được giữ trong frozen result.

Parent chỉ có hai ACK giống nhau ở seq 12 và 13: đã chuyển và đang chờ. Sau đó là sự kiện nội bộ; **không có câu tổng hợp nghiệp vụ C03 của parent** trước C04. Không gọi ACK là kết quả cuối.

Người điều khiển Chrome quan sát parent bị lỗi xác thực sau khi child hoàn tất. Snapshot sanitized hiện tại không chứa diagnostic auth nguyên văn; báo cáo cuối cần gắn ảnh/log UI tương ứng để xác nhận nguyên nhân. Từ artifact độc lập chỉ chốt chắc: child thành công, nhưng kết quả không được tổng hợp thành đáp án parent. Hai ACK trùng trong transcript cũng cần đối chiếu UI để kết luận có hiển thị lặp.

Chấm riêng: **child thực tế và nội dung child đạt; hoàn tất/tổng hợp về parent chưa đạt**. Không tính child C03 làm bằng chứng chuyên gia cho C04.

## B-C04 — Nguồn đúng và nội dung tốt hơn, nhưng không có bàn giao

- Seq 17 đã có mã BT-0904; seq 18 hỏi Contract + Finance.
- Người dùng đồng ý một lần ở seq 19.
- Router: `router_target_invalid / clarified / pending` → `router_no_candidate / local / not_required`.
- Parent gọi `enterprise_specialists_list` một lần; **liệt kê chuyên gia không phải gọi chuyên gia**.
- Parent chạy 5 search và 7 get, rồi tự trả seq 37. Không có child mới, không có plan selected/confirmed của C04.

Nguồn get thật, không lỗi:

| Seq | Nguồn / version |
| --- | --------------- |
| 28  | FIN-01 v1       |
| 29  | FIN-02 v1       |
| 30  | OPS-01 v1       |
| 31  | OPS-02 v2       |
| 32  | LEG-01 v1       |
| 33  | LEG-02 v1       |
| 34  | IT-02 v1        |

Các hash body trùng nguồn đã dùng ở lượt A/baseline. Đây là bằng chứng parent đọc đúng nguồn, **không phải bằng chứng gói nguồn được chuyển đến Finance hoặc Contract**.

Các điểm nội dung đạt:

- Phân biệt 7,56 triệu dự toán và 7,08 triệu hạn mức; vượt 480 nghìn.
- VAT 8%/10% được nêu là kịch bản cần xác nhận: còn 600 nghìn hoặc thiếu 360 nghìn theo thực chi; không khẳng định thuế suất thật.
- Ứng 38,4 triệu; nhận diện trần 2 triệu, thiếu khắc phục, rủi ro dữ liệu.
- Đề xuất tỷ lệ ứng/phạt/trách nhiệm được ghi là đề xuất đàm phán, không phải chính sách đã duyệt.
- Nêu mốc dự kiến 18/09 trong nguồn, không tự đổi ngày; giữ đăng ký trước 9 ngày làm việc.
- Có 2 lớp/tối đa 18 người, 150 phút, 18/20; UAT trước 2 ngày làm việc, bàn giao trong 2 ngày, trực 10 ngày.
- Bảo hành 60 ngày theo lịch **chỉ cấu hình đã thống nhất**, tính năng mới báo giá riêng.

Khoảng trống nội dung theo oracle: **không nêu phải bật MFA trong thân câu trả lời**. IT-02 đã được get, nhưng từ MFA chỉ xuất hiện trong tên nguồn dẫn; tên nguồn không thay cho việc chỉ ra điều kiện truy cập bắt buộc. Có NDA, DPA, sponsor, quyền tối thiểu, 14 ngày và log.

**Điều phối không đạt** dù trả lời nghiệp vụ phần lớn đúng. Đáp án cuối không nói rõ Finance/Contract chưa hoàn tất như lời bàn giao đã xin; không dùng văn phong đầy đủ để suy ra chuyên gia đã làm.

## B-C10 — Đúng giới hạn chính, thiếu phạm vi áp dụng ca trực quầy

Seq 70 nêu đúng 4 ngày yêu cầu laptop, MFA ngày 1, buddy 30 ngày, lịch tuần đầu, 9 ngày chương trình, 16/20 và thi lại sau 2 ngày làm việc. Remote tối đa 2 ngày/tuần, đăng ký trước 16:00, giờ phối hợp đúng; nói rõ nguồn không có ngoại lệ cho cả tuần.

Tuy nhiên, nguồn HR-02 được get tại seq 68 có điều kiện **không áp dụng cho ca trực quầy**, nhưng đáp án bỏ điều kiện này. Đây là thiếu phạm vi áp dụng theo oracle đã chốt, không phải sai phép tính hay bịa một cơ chế ngoại lệ. Không tự hạ yêu cầu sau khi thấy câu trả lời.

## Case còn lại và giới hạn

- C01: đúng 378.000, không tool/child.
- C05: đúng năm việc, không tool/memory, dùng kết quả parent C04 vừa có; không lặp lịch sai của A. Chỉ tóm tắt nội dung parent, không xác nhận bàn giao C04 thành công.
- C06: chỉ dịch tiêu đề.
- C07: nói rõ chưa có mức/hạn trợ cấp; không bịa.
- C08: hỏi mã hợp đồng mới, không dùng BT-0904.
- C09: gác việc kho, đúng 35 ngày/31 ngày trong cửa sổ, không bảo đảm bản sao cụ thể.
- C11: đủ 16/20 = 80%, học bổ sung/thi lại sau 2 ngày, quản lý xác nhận; phân biệt buddy 30 ngày không phải phải đợi đủ 30 ngày mới hoàn tất.

Chưa có chuyển chứng cứ thành công, Contract child, nhiều child cùng yêu cầu, kiểm thử thu hồi quyền/retry/restart, hoặc lỗi skipped UI. Không dùng B-C03 để tuyên bố các nhánh đó đạt. Cấu hình, quyền và publication giữ nguyên; lane này chỉ đọc artifact và tạo ghi chú output.
