---
name: hr-skill
description: Tra cuu he thong noi bo nhan su qua Comnieu MCP; bat buoc goi router_tool_search truoc, sau do moi duoc goi tool duoc de xuat; cam list tools va cam truy cap source code.
metadata: { "openclaw": { "emoji": "👥", "requires": { "bins": ["curl"] } } }
---

# HR Skill

Use this skill to tra cuu nghiep vu nhan su noi bo (staff, phong ban, assignment task, SLA) qua Comnieu MCP HTTP.

Default connection:

- Base URL: `http://192.168.10.249:10000`
- Override with: `HR_MCP_BASE_URL` (hoac `COMNIEU_MCP_BASE_URL`)

## Trigger: Danh sach task giao viec (hom qua / theo ngay)

Khi user hoi cac cau tu nhien nhu:

- "Gui Danh sach cac task tren giao viec hom qua cho toi"
- "Hom qua tren giao viec co nhung task gi cua toi"
- "Tong hop task giao viec cua toi hom qua"

Thi mac dinh vao `ASSIGNMENT_TASK_DIGEST_MODE` (khong can user chon loai task truoc).

### ASSIGNMENT_TASK_DIGEST_MODE

1. Suy luan moc thoi gian loc:
   - "hom qua" = `from` = 00:00:00 cua ngay hom qua (theo mui gio he thong).
   - Neu user noi ngay cu the, dat `from` = 00:00:00 cua ngay do.
   - **Chi truyen `from`, khong truyen `to`.** Task giao viec co the keo dai nhieu ngay, khong gioi han trong mot ngay; dung `to` se bo sot task con dang lam hoac deadline sau ngay loc.
   - Ap dung quy tac nay cho moi tool tim task trong `ASSIGNMENT_TASK_DIGEST_MODE` (ca 4 nhom pham vi).

2. Voi moi nhom pham vi ben duoi, **bat buoc** goi `router_tool_search` rieng (khong doan ten tool), chon tool tu `results`, chay prerequisite (neu co), roi goi tool chinh:
   - **Task tu tao**: query goi y `"danh sach task toi tu tao tren giao viec"`.
   - **Duoc giao lam**: query goi y `"danh sach task duoc giao cho toi tren giao viec"`.
   - **Quan ly**: query goi y `"danh sach task toi quan ly vai tro approver tren giao viec"`.
   - **Duoc xem**: query goi y `"danh sach task toi duoc xem vai tro viewer tren giao viec"`.

3. Neu tool can `user_id` ma chua co, uu tien lay tu prerequisite do router de xuat (vi du `employee_get_info`); khong tu doan ID.

4. Tong hop ket qua thanh **mot danh sach de doc**, chia 4 nhom co tieu de ro rang:

```text
## Task tu tao (hom qua)
- ...

## Duoc giao lam (hom qua)
- ...

## Quan ly (hom qua)
- ...

## Duoc xem (hom qua)
- ...
```

5. Moi dong task uu tien hien: ten task, deadline (`from`/`to` neu co), trang thai/loai neu API tra ve. Neu nhom rong, ghi ro `Khong co task`.

6. Neu mot nhom con nhieu ban ghi (`pagination.has_more` hoac tuong duong), lap trang tiep theo cho dung nhom do truoc khi chuyen sang nhom khac.

7. Khong hoi lai user muon xem nhom nao; chi hoi khi thieu truong `required` ma khong the tu dien.

## Mandatory Rules

1. Luon goi `router_tool_search` truoc de tim tool.
2. Chi duoc goi cac tool xuat hien trong ket qua `router_tool_search`.
3. Khong duoc goi list tool:
   - Khong `GET /tools`
   - Khong `GET /tools/{name}`
   - Khong dung script list tools.
4. Khong duoc doc/truy cap source code de suy doan tool/schema.
5. Neu `router_tool_search` khong du ro, phai refine query roi goi lai `router_tool_search` hoac hoi ro user.
6. Neu current run khong the thuc su doc skill / chay command / goi tool, phai noi ro la khong truy cap duoc capability nay; khong duoc noi nhu the dang tra cuu.
7. Khong duoc viet placeholder progress text kieu "Dang truy xuat..." hoac "Toi dang kiem tra..." tru khi da bat dau chay command that trong chinh turn nay.

## Allowed Commands

Health check:

```bash
{baseDir}/scripts/hr_health.sh
```

Tool discovery (bat buoc):

```bash
{baseDir}/scripts/hr_call.sh router_tool_search --args-json '{"query":"tim danh sach nhan vien phong Ke toan","top_k":1,"min_score":0.35,"company-id":1}'
```

Call tool duoc de xuat boi router:

```bash
{baseDir}/scripts/hr_call.sh <tool_name_from_search> --args-json '<suggested_arguments_json>'
```

## Execution Loop (Strict)

1. Neu request thuoc `ASSIGNMENT_TASK_DIGEST_MODE`, chuyen sang luong tong hop 4 nhom task (tu tao / duoc giao / quan ly / duoc xem) theo muc "Trigger: Danh sach task giao viec".
2. Chuyen yeu cau user thanh query routing.
3. Goi `router_tool_search`.
4. Doc `results` va `prerequisites`.
5. Chay prerequisite tools truoc (neu co), sau do chay tool chinh.
6. Tong hop ket qua cho user.
7. Neu ket qua khong dat, quay lai buoc 2 voi query cu the hon.

Read `references/tool-catalog.md` chi de biet quy tac routing. Khong duoc dung file nay de thay the `router_tool_search`.
