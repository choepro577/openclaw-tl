---
name: purchase-order-skill
description: Tra cuu va thao tac de nghi mua hang, purchase order (PO), nha cung cap, hang hoa va chi nhanh qua PO service; router-first, dung dang nhap PO bao mat trong chat, va xac nhan truoc moi thao tac ghi.
metadata:
  {
    "openclaw":
      {
        "emoji": "🧾",
        "requires": { "bins": ["curl"] },
        "scriptRuntime":
          {
            "entrypoints":
              {
                "health":
                  {
                    "path": "scripts/po_health.sh",
                    "kind": "fixed",
                    "risk": "read",
                    "timeoutMs": 30000,
                  },
                "call":
                  {
                    "path": "scripts/po_call.sh",
                    "kind": "operation",
                    "routerOperation": "router_tool_search",
                    "routerBypassOperations": ["router_index_status"],
                    "authExemptOperations": ["router_tool_search", "router_index_status"],
                    "readOperations":
                      [
                        "router_tool_search",
                        "router_index_status",
                        "employee_get_info",
                        "search_po_products",
                        "search_po_suppliers",
                        "search_po_sites",
                        "get_po_request_list",
                        "get_po_draft_list",
                        "get_po_detail",
                      ],
                    "writeOperations":
                      [
                        "create_po_draft",
                        "update_po_draft",
                        "save_po_product",
                        "delete_po_product",
                        "confirm_po",
                      ],
                    "unknownRisk": "approval",
                    "timeoutMs": 30000,
                  },
              },
            "auth":
              {
                "mode": "login-token",
                "loginEntrypoint": "call",
                "loginOperation": "employee_login",
                "fields":
                  [
                    {
                      "id": "username",
                      "label": "Tài khoản PO",
                      "argument": "userName",
                      "type": "text",
                    },
                    {
                      "id": "password",
                      "label": "Mật khẩu",
                      "argument": "password",
                      "type": "password",
                    },
                  ],
                "tokenPaths": ["result.data.token", "data.authorization", "authorization"],
                "injectArgument": "authorization",
                "ttlSeconds": 28800,
              },
          },
      },
  }
---

# Purchase Order Skill

Dùng tool nội bộ chung `skill_script` cho mọi thao tác PO. PO service
là nguồn dữ liệu vận hành duy nhất; không dùng Enterprise Knowledge, câu trả lời
cũ hoặc dữ liệu nháp lịch sử để thay thế kết quả của yêu cầu hiện tại.

Skill này chạy khi chọn trực tiếp Shared Agent Mua hàng hoặc khi Personal Agent
giao việc cho Mua hàng. Quyền dùng Mua hàng cấp toàn bộ skill của agent đó; không
cần cấp `purchase-order-skill` hoặc `skill_script` riêng. Personal Agent giao việc
cho Mua hàng để sử dụng năng lực này trong phạm vi Mua hàng.

Trước lần gọi đầu tiên, giữ một request receipt cố định gồm:
`action`, `scope`, `sDate` và các bộ lọc user đã nêu. Không tự đổi `create` thành
`preview/read`, không bỏ ngày, không thu hẹp `toàn bộ chi nhánh`. Chuẩn hóa ngày
`dd.mm.yyyy` hoặc `dd/mm/yyyy` thành `yyyy-mm-dd`. Khi user nói `tiếp tục`,
`làm tiếp`, `đã đăng nhập` hoặc `đăng nhập rồi`, lặp lại đúng receipt gần nhất;
không diễn giải thành một yêu cầu mới.

## Dang nhap PO bao mat

1. Khong bao gio hoi, nhan, lap lai hoac luu password/token trong chat,
   transcript, file, command hay tool arguments.
2. Khong goi `employee_login`. Dang nhap do UI/Gateway thuc hien ngoai
   transcript bang hop thoai bao mat; nut **PO** canh o chat van dung de mo lai.
3. Nếu `skill_script` trả `SKILL_AUTH_REQUIRED`, dừng các operation PO còn
   lại. UI tự mở hộp thoại tài khoản/mật khẩu; đăng nhập thành công sẽ tiếp tục
   đúng lời gọi đang chờ một lần. Không gọi lại thao tác ghi đã hoàn thành. Nút **PO** cạnh ô chat vẫn mở lại hộp
   thoại. Không yêu cầu user gửi credential trong chat.
4. Neu user da dan credential vao chat, khong lap lai gia tri; khuyen nghi doi
   mat khau do credential da xuat hien trong transcript.

## Router-first bắt buộc

1. Tạo query phản ánh nguyên văn action, scope và ngày trong receipt.
2. Gọi `skill_script` với:

```json
{
  "skill": "purchase-order-skill",
  "entrypoint": "call",
  "operation": "router_tool_search",
  "arguments": {
    "query": "tạo bản nháp PO ngày 2026-09-10 cho toàn bộ chi nhánh",
    "top_k": 3,
    "min_score": 0.35,
    "company-id": 1
  }
}
```

3. Chỉ chọn tool có trong kết quả router. Đọc `input_schema.required`,
   `suggested_arguments` và `prerequisites`.
4. Chỉ hỏi user các trường nghiệp vụ required còn thiếu; không hỏi
   `authorization`, `password`, `serectkey`, `application` hay `version`.
5. Gọi lại cùng built-in tool với tên tool router đã trả.

```json
{
  "skill": "purchase-order-skill",
  "entrypoint": "call",
  "operation": "get_po_draft_list",
  "arguments": { "sites": "S1,S2" }
}
```

Gateway tự chèn `authorization`. Không thêm field này vào arguments.

6. Nếu router không đủ rõ, refine query và gọi lại `router_tool_search`; không
   list tool và không đọc source để suy đoán schema.
7. `router_index_status` chi dung de chan doan khi router gap loi.

## Tạo PO cho toàn bộ chi nhánh

Với yêu cầu như “tạo PO ngày 10.09.2026 cho tất cả chi nhánh”, thực hiện đúng
chuỗi sau:

1. Router query cho `create_po_draft` với scope toàn bộ và ngày đã chuẩn hóa.
2. Gọi prerequisite `search_po_sites` nếu router/schema yêu cầu. Thu đủ trang,
   lấy mọi mã chi nhánh hợp lệ, trim và loại trùng; không dùng tên thay mã.
3. Gọi `create_po_draft` một lần với payload từ schema, thông thường:

```json
{
  "sites": "<toàn bộ mã chi nhánh, phân tách bằng dấu phẩy>",
  "getFrom": 1,
  "sDate": "2026-09-10"
}
```

Không gọi `get_po_request_list` hoặc `get_po_draft_list` để thay cho bước tạo,
trừ khi user thật sự yêu cầu xem trước hoặc schema hiện tại bắt buộc. Danh sách
đề nghị rỗng không chứng minh rằng không thể tạo; PO nháp cũ không phải kết quả
của lần tạo hiện tại.

## An toàn thao tác ghi

Trước các tool ghi như
`create_po_draft`, `update_po_draft`, `save_po_product`,
`delete_po_product`, `confirm_po`, phai tom tat PO/chi nhanh/nha cung cap/san
phẩm và xin xác nhận rõ ràng nếu user chưa yêu cầu ghi trong current turn. Nếu
current turn đã nói rõ “tạo”, chuẩn bị payload và gọi tool; mutation guard vẫn
hiển thị bước phê duyệt một lần trước khi ghi.

Sau `create_po_draft`, chỉ báo thành công khi chính call đó trả thành công. Link
duy nhất được phép gửi là URL nguyên văn trong `result.data` của call đó. Không
tạo URL từ `Notes`, mã PO, dữ liệu nháp cũ hoặc ghép query string. Nếu không có
`result.data`, nói rõ service không trả link; không tự dựng link.

Neu tool tra loi, giu nguyen ma phan loai de user biet buoc tiep theo:

- `SKILL_AUTH_REQUIRED`: đăng nhập trong hộp thoại tự động; hệ thống tự tiếp tục.
- `CONNECT_TIMEOUT`/`UNREACHABLE`/`HTTP_ERROR`: dịch vụ PO không kết nối được.
- `SKILL_ROUTER_REQUIRED`: gọi router trước rồi mới gọi operation nghiệp vụ.

Doc `references/tool-catalog.md` de biet quy tac routing va nhom nghiep vu;
router output van la source of truth cho tool va schema hien tai.
