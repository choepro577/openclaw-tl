# Phiên tổng hợp kiểm thử tự nhiên — kết quả cuối

## Kết luận

Đã chạy đủ **11 case trong một hội thoại mới**, sau lượt kiểm thử từng bước và sửa lỗi. Gửi đúng nguyên văn 11 prompt trong kế hoạch, đúng thứ tự; chỉ thêm 2 câu đồng ý tự nhiên khi được hỏi. Không chèn tên tool, nguồn hoặc chuyên gia để ép quyết định.

Phiên có **3 lượt chuyên gia thực sự chạy**, **16 lần tìm kiếm + 16 lần đọc tri thức**, không có lỗi tool của parent. Case đổi chủ đề đã đạt sau sửa. **Không chấm toàn bộ xanh:** C03 còn cảnh báo chất lượng nội dung child; C04 còn giới hạn kết quả dài và lỗi approval riêng của lượt đầu chưa sửa.

[Mở session tổng hợp trên Chrome User](http://127.0.0.1:19789/app/chat/enterprise-personal-2ae2cbc2deecdb86fe86/t-nh-ti-n-27-ph-n-n-e4bfd79e).

- Thời gian: 00:11–00:23:28 ngày **05/09/2026**, UTC+7.
- Session: `agent:enterprise-personal-2ae2cbc2deecdb86fe86:dashboard:e4bfd79e-6068-4ced-8ae2-5d126ce033ce`.
- Transcript: `7c9fd715-70a5-43c5-8169-5a2833eb9f31`.
- Dùng lại Chrome User/Admin đang đăng nhập. User giữ Sol/Medium; router Luna, policy revision 2.
- Runtime QA cổng **19789**, PID quan sát cuối **25940**. Không deploy/restart gateway chính 18789.
- Fingerprint cấu hình/quyền/nguồn trước và sau vẫn `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`.
- Không ký, thanh toán, tạo tài khoản, khôi phục dữ liệu, mở rộng quyền hay sửa dữ liệu nghiệp vụ.

## Kết quả từng case

“Local” chỉ có nghĩa không bàn giao cho chuyên gia; parent vẫn có thể tự đọc tri thức.

| Case | Câu hỏi nghiệp vụ                            | Thực thi quan sát được                                      | Kết quả                                                                                            |
| ---- | -------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| C01  | Tính tiền 27 phần nước                       | Local; seq1→4; không tool/child                             | Đạt: 378.000đ                                                                                      |
| C02  | Công tác phí và hạn chứng từ                 | 2 search, 1 get FIN-01 v1; seq5→11                          | Đạt: tối đa 7,08 triệu, thực dự tính 7,56 triệu, vượt 480.000đ; 5 ngày làm việc                    |
| C03  | Phân tích dòng tiền điểm bán                 | Xin đồng ý một lần; 1 Finance child thật; seq12→17          | Đạt bàn giao đầy đủ và đáp án cuối 204/294/120; có cảnh báo nội dung child                         |
| C04  | Ngân sách, hợp đồng, đào tạo và triển khai   | Xin đồng ý một lần; 2 child thật, 5 search, 7 get; seq18→37 | Đạt phối hợp và đọc nguồn; chưa đạt yêu cầu nhận nguyên kết quả dài                                |
| C05  | Rút lại thành 5 việc cho cuộc họp            | Local; seq38→39; không tool/child mới                       | Đạt đúng 5 việc, tách điều cần xác nhận                                                            |
| C06  | Dịch tiêu đề có từ ngân sách/hợp đồng        | Local; seq40→41; không tool/child mới                       | Đạt: “Budget & Contract Risk Analysis”, không điều phối vì từ khóa                                 |
| C07  | Trợ cấp sinh con thứ hai chưa có trong nguồn | 4 search, 2 get HR-02 v1/HR-01 v2; seq42→52                 | Đạt: không bịa mức tiền/hạn hồ sơ, không tự gọi HR                                                 |
| C08  | Hợp đồng thuê kho mới thiếu thông tin        | Làm rõ; seq53→54; không tool/child mới                      | Đạt: hỏi mã hợp đồng, không dùng nhầm BT-0904                                                      |
| C09  | Gác hợp đồng, hỏi sao lưu 31 ngày            | Local; 1 search, 1 get IT-02 v1; seq55→60                   | Đạt: 35 ngày, còn khoảng 4 ngày; không gọi Contract cũ, không hứa chắc phục hồi                    |
| C10  | Chuẩn bị người mới và làm ở nhà cả tuần      | 3 search, 4 get HR/CNTT; seq61→71                           | Đạt: máy trước 4 ngày làm việc, MFA ngày 1, buddy 30 ngày, lịch tuần đầu và remote tối đa 2 ngày   |
| C11  | Điều kiện hoàn tất và thi lại                | 1 search, 1 get HR-01 v2; seq72→77                          | Đạt: đủ 9 ngày, ít nhất 16/20, học bổ sung/thi lại sau 2 ngày làm việc, quản lý trực tiếp xác nhận |

Tổng registry của đúng session: 13 routing events, 3 kế hoạch được chọn, 2 kế hoạch được đồng ý, 3 child được tiếp nhận và kết thúc. Kế hoạch thứ ba là C08 đang thiếu dữ kiện, không phải child đã chạy. C09 không tạo thêm child từ kế hoạch đó.

## Bằng chứng gọi chuyên gia thật

### C03 — một chuyên gia

1. Seq12 hỏi tự nhiên; seq13 hệ thống xin đồng ý; seq14 trả lời “Ừ, bạn xem giúp mình nhé.” đúng một lần.
2. Child run `da566ce6-b197-4058-8d15-b36fa31e9aa9`, transcript `22cbc9a9-0939-41d3-872c-c5151e31f22c`, có assistant Luna độc lập.
3. Chạy **00:13:10 → 00:13:33**, outcome `ok`; trả **2.179 ký tự**.
4. Parent seq16 nhận **đúng toàn bộ projection đã sanitize**, không dấu cắt. Seq17 Sol trả kết quả lúc **00:13:50**.
5. Đáp án cuối đúng: vốn vận hành 240 triệu, cố định 72 triệu/tháng, còn 204/294 triệu sau 3 tháng, hòa vốn 120 triệu/tháng; tiền cọc 60 triệu được tách riêng.

Đây là kiểm chứng bằng registry + assistant của child + nội dung thực nhận tại parent, không chỉ dựa vào câu “đã chuyển”.

Lỗi gốc trong ảnh: child thật đã trả 1.590 ký tự nhưng producer chỉ bàn giao 512 ký tự, mất phần kết luận 294/120. Bản sửa gửi đủ khi toàn bộ kết quả và nhãn vừa budget 4.096 ký tự sẵn có. Lượt retest độc lập trước phiên này cũng đã nhận đủ 1.478 ký tự.

[Bằng chứng C03](qa-20260904-combined-c03-proof.json) · [Giải thích đầy đủ cho ảnh người dùng](qa-20260904-specialist-verification.md).

### C04 — hai chuyên gia và tri thức trong cùng lượt

- Contract run `b66383cb-830d-429f-bbb8-c229ea3a417b`, transcript `50ad9ce5-751c-4456-b9c0-7f678308a58b`: **00:15:18 → 00:15:44**, assistant Luna riêng, 3.273 ký tự.
- Finance run `c11bbb3c-10ff-43ea-980e-763d12bd3240`, transcript `9188a1aa-c7ed-4f3e-930b-3ab874e320c4`: **00:15:18 → 00:15:42**, assistant Luna riêng, 2.246 ký tự.
- Cả hai outcome `ok`. Parent nhận completion tại seq22 rồi tự tìm/đọc nguồn.
- Nguồn đọc đầy đủ: **OPS-01 v1, OPS-02 v2, FIN-02 v1, LEG-01 v1, LEG-02 v1, IT-02 v1, FIN-01 v1**.
- Parent Sol hoàn tất seq37 lúc **00:17:37**, khoảng 141 giây sau đồng ý, dưới ngưỡng chậm 180 giây đã đặt.

Kết quả đúng các điểm chính: ứng 38,4 triệu trước thuế; phân biệt VAT chưa xác nhận, thực chi và hạn mức. Với giả định VAT 10%, thực chi thiếu 360.000đ hoặc dùng hạn mức còn 120.000đ, chưa có đi lại. Nêu 3 báo giá/phê duyệt, Pháp chế vì dữ liệu khách hàng, NDA/DPA, quyền nhà cung cấp tối đa 14 ngày, UAT/backup/rollback; 2 lớp × 15 người, 150 phút, đăng ký trước 9 ngày, đạt 18/20, học lại trong 10 ngày, bàn giao 2 ngày và bảo hành 60 ngày. Đề xuất đàm phán được tách khỏi chính sách, có cảnh báo nguồn QA.

**Giới hạn:** tổng hai child 5.519 ký tự vượt budget, nên seq22 nhận bản gọn 512 ký tự/child với dấu cắt. Chứng minh đã gọi thật và có bàn giao, không chứng minh nhận nguyên toàn bộ. Lượt này hai child không gọi tool; không dùng việc không phát sinh lỗi để kết luận đã sửa kênh approval.

## Nhật ký các nhánh còn lại

| Case | Run ID                                 | Mốc kết thúc UTC+7 | Kiểm tra đáng chú ý                                             |
| ---- | -------------------------------------- | ------------------ | --------------------------------------------------------------- |
| C01  | `3d92c3a6-cd85-4126-a135-7c01b018905e` | 00:11:10           | Local 2.632ms; tiêu đề mới vẫn Sol/Medium                       |
| C02  | `00287e65-f09e-4086-b6ae-960b2feb8a79` | 00:11:53           | Local 2.496ms; CFO duyệt bằng văn bản trước phần vượt           |
| C05  | `00de6f88-668c-4a5d-ab8c-2314015701e5` | 00:19:16           | Local 2.263ms; đúng 5 việc, không gọi lại thừa                  |
| C06  | `74230d8b-2d48-4c34-8878-fd0c9772861f` | 00:19:40           | Local 2.323ms; dịch trực tiếp                                   |
| C07  | `f09dddb7-77c0-4729-820d-e5a8eb4cfa9e` | 00:20:34           | Local 2.308ms; không thay quy định công ty bằng pháp luật chung |
| C08  | `6ab4d5b1-262e-47f4-b70a-f3ca44af806f` | 00:20:49           | Required input missing, 3.794ms; chỉ hỏi mã                     |
| C09  | `6159f50f-048a-432d-b2e5-1a44ef0ec46c` | 00:21:31           | Local 5.705ms; bỏ chủ đề cũ, không tạo ticket/restore thật      |
| C10  | `e4edafbd-64b7-4fc5-afbb-a282d6c650a0` | 00:22:39           | Local 2.525ms; đọc HR-01 v2, HR-02 v1, IT-01 v1, IT-02 v1       |
| C11  | `cb7f014c-8af4-4838-95bb-7ba08acd4157` | 00:23:28           | Local 3.366ms; không nhầm buddy 30 ngày với điều kiện hoàn tất  |

C10 còn nêu đăng ký remote trước 16:00 ngày làm việc liền trước, giờ phối hợp 09:30–11:30/14:00–16:00, không áp dụng ca trực quầy. Check-in cuối ngày được ghi rõ là gợi ý, không bịa thành quy định.

C11 đọc lại đúng HR-01 v2; nhân viên không tự đánh dấu hoàn tất, tài liệu không nêu giới hạn số lần thi lại.

## Các lỗi đã sửa và bằng chứng hồi quy

1. **Seed QA sai auth owner:** bổ sung đúng marker shared-state ownership; không copy lại credential hoặc thay profile. Kiểm tra owner: 5/5 tests.
2. **C03 cắt kết quả dù còn budget:** sửa producer bàn giao. Hai suite output/settle-wake: **103/103**, chạy lại cuối lúc 00:21:45 vẫn đạt.
3. **Nhãn model nhảy Luna/Off khi tool/title event:** sửa projection và truyền scoped config qua loader/title producer. **196/196** tests; UI các phiên mới và phiên tổng hợp quan sát giữ Sol/Medium sau hydrate.
4. **C09 không đổi được chủ đề:** ràng buộc schema đầu ra router và giữ schema qua đúng managed transport, kể cả hai lần sanitize. Router **103/103**, transport/wrapper **95/95**. Hai lần lỗi trước đó vẫn được giữ trong lịch sử; retest độc lập và phiên tổng hợp này đều đạt.

Bản sửa schema có đối chiếu [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs); việc backend đang dùng chấp nhận schema được xác nhận riêng bằng lượt QA thật, không chỉ suy từ tài liệu.

Build đầy đủ QA cuối thành công trong **2m37,1s**. Đối chiếu lại **11 file production** giữa source và snapshot: tất cả SHA256 khớp. Scoped diff/syntax checks đạt. Đây là các nhóm kiểm thử có phạm vi, không phải tuyên bố toàn bộ repository hoặc mọi baseline lint đều đạt.

## Giới hạn chưa xử lý

- **Kết quả nhiều chuyên gia quá dài:** vẫn dùng budget 4.096 và fallback có dấu cắt. Chưa có cơ chế đọc tiếp toàn bộ được kiểm chứng; không tăng cap để che lỗi.
- **Approval của tool ở C04 lượt đầu:** kết nối broker thiếu Enterprise session, bị từ chối ngay nhưng audit thể hiện `mutation_confirmation_expired`. Chưa sửa transport xác thực/routing approval. Không coi đồng ý bàn giao là đồng ý chạy tool hoặc tự cấp thêm quyền.
- **Chất lượng child C03:** một ghi chú sai đã trừ tiền cọc lần hai và nêu 144/234. Parent cuối không lặp sai đó. Chưa có bản sửa tổng quát được kiểm chứng cho lỗi suy luận này; không cài đáp án hoặc keyword vào router.
- **Chứng cứ riêng cho child:** `evidenceTransferGrants=0`. Chỉ chứng minh parent đọc nguồn được cấp quyền, chưa kiểm chứng luồng chuyển private evidence sang child.
- Chi tiết “ưu tiên chiều thứ Tư” được trả ra như sở thích cũ; nguồn sở thích cá nhân này chưa kiểm chứng riêng, không dùng làm oracle chính sách mới.
- Dữ liệu có nhãn QA/hư cấu; không dùng kết quả này làm chính sách nhân sự, pháp lý hoặc quyết định chi tiền production.

## Bằng chứng và tái kiểm

- [Kế hoạch chi tiết từng case, prompt và oracle](qa-natural-session-20260904-plan.md).
- [Lịch sử từng bước, lỗi và retest](qa-natural-session-20260904-results.md).
- [Trace phiên tổng hợp đã loại nội dung riêng](qa-20260904-combined-trace.json).
- [Registry/assistant/receipt của cả 3 child](qa-20260904-combined-delegation-proof.json).
- [Chẩn đoán approval C04](qa-20260904-c04-proof.md).

Tại checkout `openclaw-tl`:

```sh
node output/qa-case-evidence-20260904.mjs e4bfd79e 0
node --import tsx output/qa-20260904-live-delegation-proof.mjs e4bfd79e
```

Hai lệnh chỉ đọc đúng state QA. Artifact không chứa hidden reasoning, credential, tool arguments hay nội dung đầy đủ của nguồn riêng.

Đã quan sát UI trước/trong/sau các lượt; cuối phiên có đáp án hoàn tất, nút gửi/composer đọc được. Sau reload vẫn đúng session, lịch sử C09–C11 và nhãn Sol/Medium được phục hồi. Admin hiển thị các event `delegate_started` tương ứng; không dùng tổng dashboard thay bằng chứng exact-session.
