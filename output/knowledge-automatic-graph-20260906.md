# Kiểm chứng Graph tự động — 06/09/2026

## Kết quả trên runtime

Đã build và khởi động lại gateway được quản lý bởi LaunchAgent trên **http://127.0.0.1:18789**. Kiểm thử trình duyệt chỉ dùng port 18789.

Trước sửa, cả 6 vùng Active có `graph_status=not_built`. Sau khi tải trang quản trị tri thức, cả 6 vùng tự có graph `ready`, tổng **24 nút, 12 liên kết**:

| Vùng               | Nút | Liên kết | Trạng thái |
| ------------------ | --: | -------: | ---------- |
| Pháp chế & Mua sắm |   4 |        2 | ready      |
| CNTT               |   4 |        2 | ready      |
| Nhân sự            |   4 |        2 | ready      |
| Tài chính          |   4 |        2 | ready      |
| Sản phẩm           |   4 |        2 | ready      |
| Vận hành           |   4 |        2 | ready      |

Candidate hiện có của Pháp chế cũng ready với 4 nút, 2 liên kết. Đối chiếu 7 snapshot: checksum index gốc và publication ID giữ nguyên. Không tạo publication mới, không thay cấu hình hoặc thêm nguồn để làm graph xuất hiện.

Trên trình duyệt, đã kiểm tra trực tiếp vùng Pháp chế trong ảnh báo lỗi: graph 3D hiển thị, chuyển 2D và Danh sách, mở nút xem nguồn/evidence, chuyển Candidate và Compare Active–Candidate. Compare trả 0 thêm, 0 bỏ, 0 đổi cho dữ liệu hiện tại. Các vùng còn lại được xác nhận qua tổng quan graph và trạng thái/count trong database; không tuyên bố đã thao tác từng chế độ của từng vùng.

Portal `/app/knowledge` của phiên người dùng hiện tại không liệt kê vùng nào, nên chưa có bằng chứng trình duyệt cho graph ở portal của một người dùng được cấp vùng.

## Nguyên nhân và thay đổi

1. Trước đây bước dựng graph phụ thuộc cấu hình bật graph. Các index đã tạo khi cấu hình tắt không chứa bảng graph, nên giao diện Active báo phải tạo/publish Candidate mới.
2. Nay mỗi lần dựng index đều tạo graph cấu trúc từ tài liệu. Cấu hình AI chỉ điều khiển lớp làm giàu quan hệ bổ sung.
3. Với snapshot cũ thiếu graph, lần đọc graph đầu tiên tự tạo cache graph cạnh index, dựa trên đúng dữ liệu snapshot đó. Các lần sau dùng lại cache; cache thiếu/hỏng được dựng lại.
4. Ví dụ: mở vùng Pháp chế đã publish từ trước sẽ có các nút tài liệu và mục tài liệu ngay sau khi tự dựng, không cần publish lại để bổ sung graph. Nguồn mới chưa publish vẫn không trở thành evidence Active.

## Kiểm thử

- Backend: 14 file, **73 test đạt**, gồm mặc định không cấu hình, cờ tắt, snapshot cũ Active/Candidate, cache thiếu/hỏng, checksum bị thay đổi, evidence, compare và export.
- UI: **32 test đạt** cho graph và admin/lifecycle.
- `pnpm tsgo:core`: đạt.
- `pnpm build gatewayWatch`: đạt; gateway đã nạp bản build.
- Autoreview ở ngưỡng P0: không phát hiện P0. Đây không phải khẳng định không có vấn đề ở mọi mức độ.
- Kiểm tra rộng `check:changed` trước đó còn vướng SAFETY assertion ratchet trong các thay đổi khác đang có sẵn; không sửa các phần ngoài phạm vi.

Graph tự động ở đây là graph cấu trúc. Quan hệ suy luận bằng AI vẫn phụ thuộc cấu hình enrichment. Không commit hoặc push repository.
