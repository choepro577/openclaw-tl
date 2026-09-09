# Rà soát độc lập lượt A — 04/09/2026

Kết luận từ artifact: **chưa đạt điều phối**. A-C03 đã hỏi và nhận đồng ý nhưng không có child; A-C04 hỏi đồng ý bốn lần, không có bước đọc nguồn hoặc child, và kết thúc phần kiểm thử bằng một câu xin phép nữa. A-C05 có kết quả năm việc nhưng lịch đăng ký/đào tạo không bảo đảm điều kiện chín ngày làm việc của nguồn đã đọc.

Đây là rà soát read-only của artifact đã chụp, không thao tác UI, không chạy test hay đổi source/runtime/quyền. Các nhận xét UI cần được người điều khiển Chrome xác minh riêng. Không cộng kết quả của B/C.

## Bằng chứng và phạm vi

- [Evidence A](qa-retest-20260904-A-evidence.json), snapshot 21:11:16 ngày 04/09/2026 (UTC+7).
- [Metrics A](qa-retest-20260904-A-metrics.json), ranh giới case theo đúng prompt nguyên văn và router theo session/run hash.
- [Plan A/B/C và oracle cố định](qa-retest-20260904-plan.md).
- [Nguồn baseline đã lưu](qa-combined-evidence-parent-final.json), dùng để xác minh nội dung OPS-02; không truy vấn DB live trong lượt rà soát này.

Có 11 case, 16 tin người dùng, 5 lời đáp bổ sung; 16 routing event, 17 search, 11 get, 0 memory, 0 child. Hai audit `selected` thuộc C04 và C08; không có audit `confirmed`. Không dùng trạng thái parent `done` cuối session để suy ra tất cả case đã hoàn tất.

Fingerprint môi trường sau A trùng snapshot trước: `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`. Có 0 quyền chuyển chứng cứ. Đây là điều kiện của nhánh chuyển chứng cứ thành công, không phải bằng chứng giải thích được mọi lỗi trước bước chuyển.

## Lỗi và bất nhất cần giữ trong báo cáo

### A-R01 — C03: đã hứa bàn giao nhưng parent tự trả lời

1. Prompt C03 đủ toàn bộ đầu vào tại seq 14.
2. Seq 15 hỏi đồng ý giao Chuyên gia Tài chính & Ngân sách. Router event `07db4a09-20cd-41f9-a2e1-52b4ddacfadd`: `clarified / router_target_invalid / pending`, target Finance.
3. Người dùng đồng ý tại seq 16: “Ừ, bạn làm giúp mình nhé.”
4. Router event tiếp theo `c292c8e0-1c70-4bbf-959b-20fa8a488d72`: `local / router_no_candidate / not_required`.
5. Seq 17 trả phép tính; không có tool hoặc child thuộc case, không có `selected/confirmed` audit cho C03.

Số học đúng: tiền vận hành 240 triệu, chi cố định 72 triệu/tháng, hòa vốn 120 triệu; còn 204/294 triệu. Cọc có thể thu hồi được diễn đạt là giả định và tách khỏi tiền mặt. **Nội dung đạt không thay được bằng chứng bàn giao: child/điều phối không đạt.**

Ranh giới nguyên nhân: artifact chứng minh lựa chọn/đồng ý không dẫn đến child. Chưa đủ dữ liệu để kết luận chính xác transient state nào mất, hoặc lỗi provider/model. Không gán trường hợp này cho lỗi private-context của runtime khi chưa có child được tiếp nhận.

### A-R02 — C04: vòng xin phép, đề xuất cả target bị giới hạn

Chuỗi tại seq 18–25:

| Lượt             | Người dùng / phản hồi                                        | Router                                                                                |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Ban đầu          | Đủ mã BT-0904 và dữ kiện; seq 19 hỏi Contract + Finance + HR | `router_mode_disallowed`, pending                                                     |
| Đồng ý 1, seq 20 | Seq 21 lại hỏi đúng ba chuyên gia trên                       | `router_target_invalid`; metadata ghi not_required và chỉ hai target Contract/Finance |
| Đồng ý 2, seq 22 | Seq 23 hỏi lại, lần này chỉ Contract + Finance               | `router_target_invalid`, pending                                                      |
| Đồng ý 3, seq 24 | Seq 25 vẫn hỏi Contract + Finance                            | `router_target_invalid`, pending                                                      |

Điểm xác nhận:

- Hai vòng rõ ràng hỏi lại cùng danh sách sau sự đồng ý: seq 20→21 và 24→25. Có thêm một lần đổi danh sách, phải ghi riêng thay vì coi mọi câu hỏi đều cùng một plan.
- Prompt không gọi HR đích danh; seq 19/21 vẫn nêu HR dù cấu hình kiểm thử HR explicit-only. Router đầu đã chặn bằng `router_mode_disallowed`; không có HR child nên **chưa có bằng chứng vượt quyền thực thi**, nhưng lời xin phép đưa ra target không hợp lệ và gây hiểu nhầm.
- Seq 21 hiển thị ba target trong khi routing metadata cùng lượt chỉ ghi hai và `not_required`: đây là bất nhất cụ thể giữa câu hỏi cho người dùng và trạng thái đã ghi.
- C04 có 0 search, 0 get, 0 child. Không có câu trả lời nghiệp vụ; câu cuối của case vẫn là yêu cầu đồng ý.
- Mã BT-0904 không bị hỏi lại trong A; không được ghi lỗi hỏi lại mã theo baseline cũ sang lượt A này.
- C04 không hoàn tất. Các nguồn được parent đọc ở C05 không được tính ngược thành bằng chứng kết hợp C04.

Không quy kết nguyên nhân dừng ở C04 này cho thiếu quyền chuyển hoặc private-context: trace chưa đến bước chuẩn bị/gửi chứng cứ. Việc thiếu quyền vẫn là một tiền điều kiện chưa đáp ứng cho nhánh thành công về sau.

### A-R03 — C02: lời xin phép thừa và handoff không xảy ra

- Seq 6 hỏi đồng ý giao Finance; router `router_target_invalid / clarified / pending`.
- Sau lời đồng ý seq 7, router chuyển `local / router_no_candidate`; parent tự chạy 2 search + 1 get FIN-01 và trả seq 13.
- Nội dung đúng 7,08 triệu hạn mức, 7,56 triệu dự toán, 480 nghìn vượt, 5 ngày làm việc; tách đúng ngoại lệ phải duyệt trước và nguồn QA.
- Hướng xử lý cuối parent đọc + tính là phù hợp case; tuy nhiên có một câu xin bàn giao không cần thiết và lời bàn giao đã hứa không xảy ra. **Không chấm đường xử lý đạt chỉ vì cuối cùng không có child.**
- Không thấy memory, đoán file hoặc child trong C02 A. Không tái sử dụng lỗi child thiếu nguồn của baseline cũ để mô tả A.

### A-R04 — C05: lịch đề xuất không bảo đảm thời gian đăng ký

C05 có năm việc và 0 memory; không đưa lệnh quản trị. Tuy nhiên tiền điều kiện “tóm tắt C04 đã hoàn tất” không có: C04 bị kẹt xin phép. C05 tự bổ sung 4 search + 5 get; phải ghi đây là phân tích mới trong C05, không phải chỉ rút gọn một kết quả C04 đã hoàn thành.

Nguồn được đọc thật tại seq 34: OPS-02 version 2, publication time `2026-09-04T07:17:47.375Z`, `isError: false`, 997 ký tự, evidence SHA-256:

`dc0fad686162628fa47f37b91c34048c9f2ccb338b23d381a568e5aa7bda0ac6`

Hash này trùng chính xác body OPS-02 trong evidence baseline (seq 40), không chỉ trùng tên tài liệu. Nguồn yêu cầu đăng ký trước **ít nhất 9 ngày làm việc**.

Seq 38 đề xuất: “đăng ký trước 07/09”; học hai lớp ngày 14–15/09. Lỗi nằm ở **deadline cho phép**, không phải khẳng định ai đã đăng ký thực tế ngày 07/09:

1. “Trước 07/09” vẫn cho phép nộp vào thứ Sáu 04/09.
2. Giả sử lịch làm việc thứ Hai–thứ Sáu, kể cả đếm rộng cả ngày nộp và ngày học, từ 04 đến 14/09 chỉ có 7 ngày: 04, 07, 08, 09, 10, 11, 14.
3. Đến 15/09 chỉ có 8 ngày; cả hai vẫn dưới 9. Nếu loại ngày đầu/cuối hoặc có nghỉ thêm, khoảng cách còn ngắn hơn.
4. Người nộp sớm hơn nữa có thể đạt, nhưng câu trả lời không yêu cầu deadline sớm phù hợp, không nêu đã đăng ký từ trước và không cảnh báo phải dời lịch đào tạo.

Vì vậy lịch này không bảo đảm điều kiện trong nguồn. Việc gọi đó là “đề xuất” và “cần xác nhận” không giải thích được sự lệch điều kiện đã biết. Không tự suy ra deadline thay thế chính xác khi chưa có lịch nghỉ/lịch làm việc được nguồn xác nhận.

Các điểm đúng vẫn giữ riêng: 4,44 triệu trước VAT theo chi thực tế; ứng 38,4 triệu; 2 lớp × 15 người; 150 phút/lớp; 18/20; bảo hành 60 ngày từ nghiệm thu. Nguồn còn giới hạn bảo hành cho cấu hình đã thống nhất; C05 dùng cụm “bảo hành cấu hình”, không đủ dữ liệu để từ câu tóm tắt này suy ra đã hứa bảo hành mọi tính năng.

### A-R05 — C09: dấu hiệu lỗi trình bày, cần kiểm UI

Số 35 ngày lưu, 31 ngày đã xóa và lưu ý bản sao thật còn tồn tại đều đúng. Nhưng text trả về seq 61 chứa từ lạ “dữ liệuANDA QA” và citation markup bị biến dạng bởi chuỗi/từ chèn vào token.

Collector đã được siết để xóa toàn bộ nội dung citation markup, kể cả token malformed; không đưa token vào ghi chú. Metadata nguồn vẫn còn. **Chưa chấm UI/link nguồn hỏng từ artifact đơn độc**: người đang điều khiển Chrome cần đối chiếu cách hiển thị/link sau reload. Không đổi nội dung câu trả lời gốc trong DB.

## Các case còn lại

| Case | Kết luận từ transcript / khoảng trống                                                                                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01  | Đạt nội dung và đường xử lý: 378.000đ, không tool/child                                                                                                                                                                                                    |
| C06  | Đạt: chỉ trả tiêu đề tiếng Anh, không tool/child/hỏi mã                                                                                                                                                                                                    |
| C07  | Đạt nội dung giới hạn: đọc HR-02, nói rõ chưa có tiền/hạn trợ cấp, không bịa; 5 search là chi phí quan sát, không tự coi là lỗi nếu oracle không đặt trần                                                                                                  |
| C08  | Đạt bước làm rõ: hỏi số hợp đồng mới, không dùng BT-0904; chưa kiểm hoàn tất hợp đồng mới                                                                                                                                                                  |
| C09  | Đạt số liệu/không hồi sinh việc kho trong phạm vi case; UI/citation cần kiểm như A-R05; chưa có case gửi một câu “ừ” sau khi gác để chứng minh không hồi sinh lâu hơn                                                                                      |
| C10  | Nội dung đúng 9 ngày, buddy 30 ngày, laptop trước 4 ngày làm việc, MFA ngày 1; 2 ngày remote/tuần, hạn 16:00, loại ca trực quầy. Không bịa cơ chế ngoại lệ. IT-01/HR-02 đã được get ở C09/C07 cùng session; không cần ép get lại mọi nguồn trong chính C10 |
| C11  | Đạt nội dung: 16/20 = 80%, học bổ sung, thi lại sau 2 ngày làm việc, không tự đánh dấu; quản lý trực tiếp xác nhận, HR lo lịch, buddy 30 ngày                                                                                                              |

## Khoảng trống bằng chứng không được biến thành “đạt”

- A không có child nào: chưa chứng minh native child thực sự chạy, kết quả được parent nhận/tổng hợp, nhiều child song song, lỗi một child, retry/restart không trùng.
- Không có chuyển chứng cứ thực tế: chưa chứng minh đích model nhận đúng gói, quyền thu hồi sau get, publication thay đổi, giới hạn trích đoạn, local_only, hoặc packet không vào task/memory.
- Không có tình huống skipped hoặc lỗi memory trong A; “không thấy lỗi” không chứng minh UI phân biệt skipped/error sau reload hay mọi memory index đã khỏe.
- Không xem ảnh/video trong lane này, nên không tự xác nhận UI live/nhóm tool/lịch sử. Screenshot và quan sát Chrome do lane chính thực hiện.
- Hash body OPS-02 nối được nguồn đã đọc với baseline; các policy oracle khác vẫn cần đối chiếu metadata/nguồn tương ứng, không thay bằng trí nhớ.
- Không đọc/log credentials, không sửa publication/quyền/index, không restart gateway, không chỉnh code để thay kết quả kiểm thử.

Ghi chú này tách lỗi chắc chắn, nội dung đúng và phần chưa có bằng chứng. Không có tỷ lệ chung hoặc khẳng định toàn bộ chương trình đã đạt.
