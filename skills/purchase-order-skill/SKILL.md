---
name: purchase-order-skill
description: Tra cuu va thao tac purchase order (PO), purchase request, nha cung cap, hang hoa va chi nhanh qua PO MCP; bat buoc kiem tra USER.md de dang nhap PO khi can, bat buoc goi router_tool_search truoc moi tool, va chi hoi nguoi dung cac truong required cua tool.
metadata: { "openclaw": { "emoji": "🧾", "requires": { "bins": ["curl"] } } }
---

# Purchase Order Skill

Use this skill to tra cuu va thao tac nghiep vu mua hang / purchase order qua `po-mcp-server` HTTP.

Default connection:

- Base URL: `http://127.0.0.1:10002`
- Override with: `PO_MCP_BASE_URL` (hoac `COMNIEU_MCP_BASE_URL`)
- Health endpoint: `GET /health`
- User memory: uu tien `USER.md` trong `$CODEX_HOME`, neu khong co thi dung `~/.codex/USER.md`
- Auth memory section name: `# po authentication`

## Mandatory Rules

1. Truoc khi dung PO tools can auth, phai doc system `USER.md` va kiem tra section `# po authentication`.
2. Neu `USER.md` da co `userName` va `password`, phai thu `employee_login` de lay `authorization` moi truoc khi goi nghiep vu PO. Neu login fail, xem thong tin cu la sai/het hieu luc, khong duoc ghi nho lai, va phai yeu cau user dang nhap lai bang `userName` va `password`.
3. Neu `USER.md` chua co thong tin PO, phai yeu cau user cung cap `userName` va `password`, sau do dung `employee_login` de xac thuc truoc. Chi khi `employee_login` thanh cong moi duoc ghi/ghi de thong tin vao `USER.md` duoi section `# po authentication`.
4. Khong duoc luu credential that bai. Khong duoc coi `authorization` cu la nguon su that lau dai; token phai duoc lay lai tu login thanh cong.
5. Luon goi `router_tool_search` truoc de tim tool, ke ca khi can tim `employee_login`.
6. Ngoai `router_tool_search` va `router_index_status`, chi duoc goi cac tool xuat hien trong ket qua `router_tool_search`.
7. Sau khi chon tool, phai doc ky `input_schema`, dac biet la danh sach `required`.
8. Chi duoc hoi user cac truong required dang thieu. Khong hoi them field optional neu chua that su can. Khong hoi lai `serectkey`, `application`, `version`.
9. Khong duoc goi list tool:
   - Khong `GET /tools`
   - Khong `GET /tools/{name}`
   - Khong dung script list tools.
10. Khong duoc doc/truy cap source code de suy doan tool/schema.
11. Public PO tools chi can truyen `authorization` trong input. MCP server tu dong chen:

- `serectkey=ad48d1e5be166b1cf084810ccab27ac6`
- `application=ai`
- `version=1.0`
  Exception: `employee_login` co the bo qua `authorization`.

12. Uu tien tool read-only de kiem tra du lieu truoc. Moi tool ghi du lieu (`create_po_draft`, `update_po_draft`, `save_po_product`, `delete_po_product`, `confirm_po`) deu phai co user confirmation ro rang neu current turn chua xac nhan hanh dong ghi.
13. Uu tien goi tool truc tiep do router de xuat. Chi dung workflow tools neu user can orchestration nhieu buoc va router thuc su chi ra workflow phu hop.
14. Neu `router_tool_search` khong du ro, phai refine query roi goi lai `router_tool_search` hoac hoi ro user.
15. Neu current run khong the thuc su doc skill / chay command / goi tool, phai noi ro la khong truy cap duoc capability nay; khong duoc noi nhu the dang tra cuu.
16. Khong duoc viet placeholder progress text kieu "Dang truy xuat..." hoac "Toi dang kiem tra..." tru khi da bat dau chay command that trong chinh turn nay.

## Allowed Commands

Health check:

```bash
{baseDir}/scripts/po_health.sh
```

Router health / index diagnostic:

```bash
{baseDir}/scripts/po_call.sh router_index_status --args-json '{}'
```

Tool discovery (bat buoc):

```bash
{baseDir}/scripts/po_call.sh router_tool_search --args-json '{"query":"lay danh sach de nghi mua hang dang mo cho chi nhanh S1","top_k":3,"min_score":0.35,"company-id":1}'
```

Call tool duoc de xuat boi router:

```bash
{baseDir}/scripts/po_call.sh <tool_name_from_search> --args-json '{"authorization":"...","...":"..."}'
```

## Execution Loop (Strict)

1. Xac dinh request la read-only hay write. Neu la write, dat diem dung de xin confirmation.
2. Doc system `USER.md` va kiem tra section `# po authentication`.
3. Neu request can auth va chua co credential hop le, yeu cau user chi cung cap `userName` va `password`, sau do goi `router_tool_search` de tim `employee_login` va thuc hien dang nhap.
4. Neu `employee_login` thanh cong, dung token vua nhan cho buoc tiep theo va cap nhat `USER.md`. Neu login that bai, thong bao user credential chua dung va yeu cau dang nhap lai; khong duoc ghi nho credential loi.
5. Chuyen yeu cau user thanh query routing.
6. Goi `router_tool_search`.
7. Doc `results`, `prerequisites`, `input_schema`, va danh sach `required`.
8. Chi hoi user cac truong required dang thieu; tu dien cac gia tri he thong tu dong chen va bo qua field optional neu khong can.
9. Chuan bi `authorization` (neu tool can auth) va tham so nghiep vu can thiet.
10. Chay prerequisite tools truoc (neu co), sau do chay tool chinh.
11. Neu la write tool, confirm lan cuoi truoc khi execute.
12. Tong hop ket qua cho user, giu lai cac ma PO / nha cung cap / chi nhanh / next step quan trong.
13. Neu ket qua khong dat, quay lai buoc 5 voi query cu the hon.

Read `references/tool-catalog.md` chi de biet quy tac routing, auth va nhom tool PO thuong gap. Khong duoc dung file nay de thay the `router_tool_search`.
