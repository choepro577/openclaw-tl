# Nghiệm thu Shared Agent — 12/09/2026

## Kết luận

**Các ca live chỉ đọc của lỗi Shared Agent đã đạt trên gateway 18789:** chính phiên
Personal cũ trong ảnh, session Mua hàng mới, session Personal mới giao Mua hàng
khi Personal bị deny tool, thu hồi/cấp lại agent trên session cũ, thêm/bỏ skill ở
lượt kế tiếp và Personal giao việc cho HRM.

Dùng Chrome đang mở, user `hieu`, role `employee`, không dùng tài khoản admin.
PO chỉ có grant agent, không cấp riêng PO skill. Không thực hiện ghi PO trong
đợt nghiệm thu sáng 12/09. Đã đối chiếu tool call thực tế và kết quả trên UI;
không dùng dấu tích hoàn tất làm bằng chứng nghiệp vụ.

## Artifact thực chạy

- Gateway: http://127.0.0.1:18789; health `live`.
- Build: `2026.8.1-2d6f02d14f5e-2026-09-11T17-15-18.656Z`.
- HEAD: `2d6f02d14f5e60869a0a3864fb3365fa3aa233e9`, có thay đổi chưa commit.
- Codex: `codex-cli 0.148.0`.
- Source SHA-256: `verification/final-source-manifest.json`; kiểm tra sau nghiệm
  thu không có file nào lệch manifest.
- Gateway ready sau restart lúc 00:18:57 +07:00. Các session mới được tạo/chạy
  sau restart; giữ nguyên lịch sử phiên lỗi cũ.
- Backup 9 SQLite DB và cấu hình trước restart; integrity cả 9 DB `ok`.

## Vì sao phiên trong ảnh lỗi và bản sửa thay đổi gì

1. Personal tạo child Mua hàng từ cấu hình đã bổ sung reader/runner và sandbox.
2. Revision lúc tạo child là `14ea47b81a7f8d3b`; guard đọc cấu hình nguồn profile
   minimal và tính `8aba66161bab4c0f`, dù quyền không thực sự thay đổi.
3. Guard vì vậy trả `DELEGATION_CAPABILITY_CHANGED` trước khi gọi nghiệp vụ.
4. Bản sửa dùng revision nguồn chuẩn từ metadata request cho cả hai đường.
   Guard vẫn kiểm tra quyền hiện hành, không bỏ kiểm tra thu hồi.
5. Trong phiên cũ sau sửa: child đọc skill → router tìm operation → tìm chi nhánh
   → gọi `get_po_draft_list` → PO trả HTTP 200/status_code 0 → Personal nhận kết quả.

## Kết quả live trên bản cuối

| Ca                                 | Kết quả và bằng chứng                                                                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đúng phiên Personal cũ             | PASS. Parent `c203315a-acef-44f4-b1f6-78a21f1f1df1`; child `811f374f-edab-4673-aa6f-d9f1fc69eb72`; run `2e1c338b-9c8a-4e01-a34b-b4c9371cb936`. 5 tool call, không lỗi tool. PO trả 10 đơn nháp hiện có, 0 đơn ngày 12/09.   |
| Đăng nhập PO từ child              | PASS. Hộp đăng nhập PO hiện trên đúng parent; nhập tài khoản đã được user cung cấp, lời gọi chỉ đọc đang chờ tiếp tục thành công. Không lưu mật khẩu vào biên bản.                                                          |
| Session Mua hàng mới               | PASS. Session `d88a4963-c920-4d9a-bb59-3fbe2d328f6b`, run `785361dd-31db-4967-990a-84ec5ae307aa`. 5 tool call; Personal đang deny `read` và `skill_script` ở policy revision 6.                                             |
| Session Personal mới + deny        | PASS. Parent `9e46ca35-18bb-48aa-994e-1fc452a358c4`; child `81802a99-e79d-4cd4-8a3a-60b94f88aaea`; run `ea70ed3d-5e46-4f02-9be6-9939fa92c2d9`. 5 child tool call, PO thành công, không lỗi revision/quyền.                  |
| Thu hồi rồi cấp lại grant Mua hàng | PASS. Session PO đang mở bị gateway chặn lượt mới với `Enterprise policy denied this request.` Sau cấp lại, cùng session và lịch sử tiếp tục tra cứu; run `f5e06f73-1e3a-4845-a52f-a6b81cbef75f`, thêm 3 tool call chỉ đọc. |
| Thêm skill ở lượt tiếp theo        | PASS. Cùng session PO nhận marker qua assignment agent. Reader thành công, runner trả `QA_SHARED_SKILL_OK`, transcript seq 27/29.                                                                                           |
| Bỏ skill ở lượt tiếp theo          | PASS. Giữ nguyên file nhưng bỏ assignment; reader bị chặn, runner trả `SKILL_NOT_GRANTED`, seq 34/36. Không thực thi marker sau thu hồi.                                                                                    |
| Personal → HRM                     | PASS. Child `f9e70f2d-7943-46a1-ab7d-a471ed726ee0`, run `7fde7b66-9981-4725-9a86-bd12308805e0`. 3 tool call gồm đọc skill, router, `get_departments`; parent nhận 16 phòng ban.                                             |

Catalog đã ghi trước/sau schema-normalization, codex-profile, runtime-allowlist,
final-catalog cùng capability revision: `verification/final-catalog-boundaries.json`.
Transcript/call/result theo từng session ở `session-evidence/final-*.json`.
Kiểm tra chỉ đọc: `verification/final-readonly-audit.json`.

Ảnh đã trực tiếp xem:

- [Phiên lỗi cũ đã thành công](screenshots/final-original-parent-success.png)
- [Mua hàng mới khi Personal deny](screenshots/final-new-direct-success.png)
- [Personal mới giao Mua hàng khi deny](screenshots/final-new-delegated-deny-success.png)
- [Thu hồi grant bị chặn](screenshots/final-agent-revoked.png)
- [Cấp lại chạy được trên cùng session](screenshots/final-regrant-success.png)
- [Thêm/bỏ skill trên cùng session](screenshots/final-skill-revision.png)
- [Personal nhận 16 phòng ban từ HRM](screenshots/final-delegated-hr-success.png)

## Kiểm thử mã nguồn và giới hạn bằng chứng

- 53 ca plugin service/gateway policy/delegation guard/skill runtime đạt.
- 148 ca connector guard/gateway dispatcher/host capability/common approval đạt;
  riêng approval 101 ca. Chạy lại 15 ca plugin/connector sau cleanup: đạt.
  Các lần chạy có trùng ca, không cộng thành tổng ca độc lập.
- Build và `git diff --check` đạt. Review cuối không có finding P0.
- Typecheck còn 166 lỗi nền, không có diagnostic mới so với lần đối chiếu trước.
  Lint module mới đạt; còn lint nền tại helper cũ của store/service. Không tuyên bố
  typecheck/lint toàn dự án pass.
- Personal bị tắt vẫn mở direct PO, direct HR, migration/plugin nhiều user,
  callback/run hết hiệu lực và chống replay có bằng chứng các vòng trước/fixture.
  Không coi chúng là live write acceptance của bản cuối.
- Hiện không có grant plugin `shared_agent` trong môi trường đích. Kế thừa plugin
  nhiều user được kiểm bằng fixture; không tự chia sẻ Gmail cá nhân để tạo ca test.

## Khôi phục sau thử

Đã khôi phục đúng danh sách 7 grant, Personal bật, policy tool Personal về giá trị
trước test (revision 7), account policy revision 23. PO chỉ còn assignment
`purchase-order-skill`; thư mục marker đã xóa. Revision tăng đơn điệu, không lùi
revision để giả lập trạng thái cũ. Xem `verification/final-restoration-check.json`.

## Giới hạn và dữ liệu lịch sử cần biết

**Theo yêu cầu mới nhất: mọi nghiệm thu PO từ đây chỉ đọc.** Không thực hiện
create/update/delete, không thử ghi để chứng minh approval/replay. Approval và
chống chạy lặp chỉ được kiểm bằng fixture tự động trong phạm vi lần bàn giao này.

Trong phép thử ghi đã được cho phép trước chỉ dẫn read-only, đơn test
`260911161623586`, hàng `HH_0012` đã được đổi rồi khôi phục ghi chú về rỗng;
số lượng 10 và đơn giá 10.400 không đổi. Backend vẫn để `PriceManualID` từ rỗng
thành `260521161700416`. Đây là khôi phục một phần, không phải khôi phục nguyên trạng.
Không ghi tiếp để dọn trường này sau khi user yêu cầu chỉ đọc.

Hosted connector Codex dùng danh tính tài khoản riêng chưa có hợp đồng ánh xạ
đăng nhập theo từng user Enterprise. Bản sửa chặn shared hosted connector bằng
`CODEX_CONNECTOR_IDENTITY_REQUIRED`, giữ nguyên grant cá nhân; không giả định
share agent đồng nghĩa chia sẻ tài khoản đăng nhập của người cài plugin.
