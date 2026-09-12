# Purchase Order Routing Reference

## Agent call contract

Chỉ dùng tool nội bộ chung `skill_script`:

```json
{
  "skill": "purchase-order-skill",
  "entrypoint": "call",
  "operation": "router_tool_search",
  "arguments": { "query": "<user_intent>", "top_k": 5, "min_score": 0.35, "company-id": 1 }
}
```

Sau do goi mot tool xuat hien trong `results`:

```json
{
  "skill": "purchase-order-skill",
  "entrypoint": "call",
  "operation": "<operation_from_search>",
  "arguments": { "<required_business_field>": "<value>" }
}
```

Khong truyen `password` hoac `authorization`. Gateway so huu phien dang nhap
PO, tu chen token vao upstream request va redacted secret truoc khi tra ket qua
cho agent.

## Routing rules

1. Luon `router_tool_search` cho dung intent hien tai.
2. Chi goi tool xuat hien trong router result cua run hien tai.
3. Doc `input_schema.required`; chi hoi field nghiep vu bat buoc dang thieu.
4. Dung `suggested_arguments` neu co.
5. Chay prerequisite phu hop voi `tool_relate`; khong chay tat ca prerequisite.
6. Refine query khi ket qua yeu hoac mo ho.
7. Khong `GET /tools`, khong doc source va khong suy doan schema.

## Immutable request receipt

Giữ nguyên bốn trường qua mọi lần auth/retry:

- `action`: `read`, `preview`, `create`, `update`, `confirm` hoặc `delete`.
- `scope`: mã chi nhánh đã resolve; `toàn bộ` luôn thay thế scope cũ.
- `sDate`: ngày nghiệp vụ ở dạng `yyyy-mm-dd`.
- `filters`: nhà cung cấp, sản phẩm và các điều kiện user đã nêu.

Ví dụ user nói `10.09.2026 tạo PO ngày này cho tất cả chi nhánh` thì receipt là
`create + all sites + 2026-09-10`. Auth hoặc câu `tiếp tục` không được làm mất
bất kỳ trường nào và không được biến thành tra cứu nháp.

## Authentication

- `employee_login` khong phai agent tool va khong duoc agent goi.
- `SKILL_AUTH_REQUIRED`: UI tự mở hộp thoại từ `auth.fields` trong metadata;
  nếu user đóng thì nút skill cạnh composer vẫn mở lại. Tuyệt đối
  khong xin credential trong chat.
- Gateway chỉ lưu token mã hóa theo account + skill đến khi hết TTL hoặc bị thu hồi.
- Đăng xuất Enterprise không xóa token; password không được lưu.

## Create-all execution

1. Route đúng intent `create_po_draft`.
2. Resolve toàn bộ site code qua `search_po_sites` và hoàn tất pagination theo
   metadata/schema trả về.
3. Trim, bỏ mã rỗng, deduplicate, rồi truyền toàn bộ mã trong `sites`.
4. Giữ `getFrom: 1` và `sDate` đã chuẩn hóa nếu schema/router hiện tại hỗ trợ.
5. Không dùng request list rỗng để kết luận không thể tạo. Không dùng draft list
   lịch sử làm kết quả tạo mới.
6. Chỉ trả link nguyên văn từ `create_po_draft.result.data`; nếu field vắng mặt
   thì báo không có link. Cấm ghép hoặc đoán URL.

## Write gate

Can xac nhan ro rang truoc cac mutation tool, gom:

- `create_po_draft`
- `update_po_draft`
- `save_po_product`
- `delete_po_product`
- `confirm_po`

Tom tat target va payload nghiep vu truoc khi xin xac nhan.

## Common families

Ten ben duoi chi de tao query; router output moi la source of truth:

- Discovery: `router_tool_search`, `router_index_status`
- Profile: `employee_get_info`
- Lookup: `search_po_products`, `search_po_suppliers`, `search_po_sites`
- Read: `get_po_request_list`, `get_po_draft_list`, `get_po_detail`
- Write: `create_po_draft`, `update_po_draft`, `save_po_product`,
  `delete_po_product`, `confirm_po`
