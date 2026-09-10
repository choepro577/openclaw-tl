---
name: hr-skill
description: Tra cuu du lieu van hanh nhan su qua HRM Comnieu MCP authoritative; bat buoc goi router_tool_search truoc, khong fallback sang Enterprise Knowledge; cam list tools va cam truy cap source code.
metadata: { "openclaw": { "emoji": "👥", "requires": { "bins": ["curl"] } } }
---

# HR Skill

Use this skill to tra cuu nghiep vu nhan su noi bo (staff, phong ban, assignment task, SLA) qua Comnieu MCP HTTP.

Default connection:

- Base URL: `http://192.168.10.249:10000`
- Override with: `HR_MCP_BASE_URL` (hoac `COMNIEU_MCP_BASE_URL`)

## Authoritative HRM boundary

For operational HR data, HRM MCP is the only authoritative source. This
includes staff, position/title, department, area/branch, assignment, and SLA
records. Do not use Enterprise Knowledge, cached prose, a previous answer, or
an unrelated document as a fallback for any of those records.

- Never call `enterprise_knowledge_search` (or any Enterprise Knowledge tool)
  to answer an operational HRM question.
- If health, connectivity, or an HRM tool call fails, return no staff data and
  report the safe script classification (`CONNECT_TIMEOUT`, `UNREACHABLE`,
  `HTTP_ERROR`, or `TOOL_ERROR`). A failure is not evidence that the employee
  list is empty.
- If the user says `thử lại`, `tra cứu lại`, `hỏi lại`, `làm lại`, or `retry`
  after an HRM failure, repeat the same HRM operation with the same canonical
  scope and filters. Do not reinterpret the follow-up as a new local search or
  switch to Enterprise Knowledge. If the previous action is ambiguous, ask one
  targeted question naming the last HRM operation.
- A result scoped to one area never proves a whole-system result. Re-query HRM
  when the requested scope changes, even if a previous answer is available in
  the conversation.

## Staff and position lookup contract

Apply this contract to every request for a staff list or a staff list filtered
by title, including `Bếp trưởng`, `quản lý`, and similar roles.

### 1. Resolve the requested scope before selecting arguments

- `Văn phòng tổng`, a named branch, or a named area is a scoped request. Resolve
  its `area_id` through a routed HRM lookup; never invent an ID.
- `toàn hệ thống`, `tất cả chi nhánh`, or `mọi khu vực` resets scope: remove
  prior `area_id`, `department_id`, and branch filters unless repeated. Rebuild
  arguments when the area changes and retain only explicitly repeated filters
  (for example, `Bếp trưởng`); never reuse a prior HQ result as system-wide.

### 2. Resolve an exact title and fan out every matching position

First route and execute the position lookup, then compare `position_name` using
normalized Unicode case, trimmed/collapsed whitespace, and exact equality. Do
not use substring matching (`Bếp trưởng` must not include `Phó bếp trưởng`).
For every matching exact title, call the staff-list tool once per
`position_id`, merge all responses, and never choose only the first ID. If none
matches, refine `router_tool_search` or report that HRM returned no exact title;
never guess an ID or substitute a related title.

The router may list lookup tools for optional staff-list arguments. Treat those
as conditional prerequisites: use the returned tool's
`input_schema.properties[argument].tool_relate` metadata and execute only the
lookup needed for an argument you will actually send. For example, a title-only
query needs `get_positions`; it does not need unrelated area, department, or
level lookups. A named-area title query needs both the position and area
lookups. Keep router-first ordering and call only tools present in the router
result.

### 3. Fetch every page

Use the largest supported page size (normally `limit: 100`) and fetch pages
sequentially for every position fan-out. Continue on `pagination.has_more`, a
next page/cursor, an uncollected `total`, or a full page. Without metadata,
continue past page one until an empty page confirms the end. A short page is
not proof, and a non-empty repeated page or non-advancing cursor is a
pagination failure: mark the result `partial` and never treat repetition as
completion. Treat `total` and `has_more` as authoritative only when the API
actually returns them; never infer `total` or `has_more: false` from the number
of rows returned. Cap each `position_id` fan-out at 100 pages; a repeated
cursor or cap means `partial`, never a complete list.

### 4. Deduplicate and verify the displayed count

- Deduplicate across pages and position fan-outs by normalized `staff_id`.
- Keep one canonical row per `staff_id`; do not count the same employee twice
  merely because multiple position IDs or pages returned them.
- Keep rows missing `staff_id` visible as a data-quality issue rather than
  silently dropping them. Do not deduplicate such rows by name alone.
- Before answering, calculate `unique_staff_count` and compare it with the
  number of rows actually displayed. Only claim a count when those numbers
  match. If the UI/message is intentionally truncated, state both the total
  unique count and the number displayed.
- For a title-filtered result, verify every displayed row has the exact title
  and that deduplication did not remove a distinct valid `staff_id`.

Keep field meanings distinct in the specialist report: `position_name` is the
position/job title (vị trí/chức danh), while `level_name` is the grade
(cấp bậc). Never replace a title with its grade. When reporting a title-filtered
list, label the exact title explicitly; label a grade separately if useful.

### 5. Explain a scoped/partial result truthfully

If a whole-system query completed without `area_id` or branch filters and all
returned rows happen to belong to `Văn phòng tổng`, report that as the actual
unfiltered HRM result; do not relabel it as an HQ-scoped query. For example:

> HRM toàn hệ thống trả N bếp trưởng và tất cả hiện thuộc Văn phòng tổng; truy
> vấn không áp dụng bộ lọc khu vực.

Only mark the result partial when an area filter actually remained, pagination
was incomplete, or HRM reported an unavailable scope. In that case say exactly
what was verified. For example:

> Mình mới xác minh được dữ liệu HRM của Văn phòng tổng (N nhân viên, M bếp
> trưởng). HRM chưa trả đủ dữ liệu các khu vực còn lại, nên mình chưa thể kết
> luận danh sách bếp trưởng toàn hệ thống.

Never present scoped rows as whole-system data or turn an unavailable HRM call
into `không có nhân viên`.

## Dinh danh user dang dang nhap

Moi Enterprise run (ke ca subagent) duoc server nap khoi trusted sau vao
runtime context cua luot hien tai:

```text
## Authenticated Enterprise account
Enterprise username: <username>
```

Voi tai khoan nhan vien, `Enterprise username` la khoa tra cuu `staff_code` cua
HRM. Vi du username `tl00275` thi tim nhan vien co `staff_code` chinh xac la
`tl00275`. Day la dinh danh tra cuu, khong phai quyen truy cap.

Khi user noi `toi`, `cua toi`, `duoc giao cho toi`, hoac `viec toi giao`:

1. Lay `Enterprise username` tu khoi `Authenticated Enterprise account` trong
   runtime context hien tai; khong doc file de tim lai va khong hoi user neu
   gia tri da co. Day la context server nap, khong phai file tren disk:
   `USER.md` co the chi la mau preferences va khong phu dinh dinh danh nay.
   Neu khoi runtime thuc su vang mat, bao thieu dinh danh phien; khong doan tu
   ten hien thi, ket qua cu, hoac tai khoan cua user khac.
2. Goi `router_tool_search` cho dung y dinh nghiep vu truoc.
3. Neu tool chinh nhan truc tiep `staff_code`/`user_code`, truyen username vao
   dung truong do.
4. Neu tool chinh can `user_id` so va router tra prerequisite tra cuu nhan vien
   (thuong la `get_staff_list`), route prerequisite do, tim bang
   `search: <Enterprise username>`, roi so sanh `staff_code` sau khi trim va
   lowercase bang chinh xac username. Chi khi co dung mot match moi dung
   `staff_id` cua match lam `user_id`.
5. Neu khong co match, co nhieu match, hoac match khong co `staff_id`, dung lai
   va bao loi dinh danh. Khong chon theo ten gan dung.

Khong dung Enterprise account UUID, `profileId`, display name, hoac username
nguyen ban lam `user_id` so. Khong dung `employee_get_info` de thay buoc resolve
tren tru khi router chon tool do va current run thuc su co employee token ma
schema yeu cau.

## Trigger: Task giao viec cua user hien tai

Khi user hoi cac cau nhu:

- "Cong viec tren giao viec cua toi"
- "Hom qua toi duoc giao nhung task gi"
- "Tong hop task giao viec cua toi hom qua"

thi mac dinh tra cuu task **duoc giao cho user hien tai**. Khong tu mo rong
thanh bon nhom neu user khong yeu cau.

### CURRENT_USER_ASSIGNMENT_MODE

1. Goi `router_tool_search` voi query phan anh dung scope:
   - `task/công việc của tôi` hoac `duoc giao cho toi`: task user duoc giao.
   - `viec toi giao - approver`: task theo vai tro approver.
   - `viec toi giao - viewer`: task theo vai tro viewer.
   - `task toi tu tao`: chi dung neu router tra mot tool co semantics loc theo
     creator/current user. Neu khong co, bao scope nay chua duoc HRM MCP ho tro;
     khong ghi `Khong co task`.
2. Resolve user mot lan theo muc `Dinh danh user dang dang nhap`, roi tai su dung
   cung `user_id` cho moi trang va moi tool co schema can no.
3. Chi gui tham so co trong `input_schema` cua tool duoc router tra ve. Khong
   bien `role_user_id` thanh ID cua current user neu schema mo ta do la nguoi
   nam vai tro approver/viewer trong task.
4. Doc semantics `from`/`to` trong schema duoc router tra ve. Neu user hoi task
   `tu hom qua` hoac task dang quan ly `hom qua`, truyen `from` la ngay hom qua
   va bo `to` khi schema cho phep, de giu cac task co deadline keo dai ve sau.
   Chi dat `from = to` cung mot ngay khi user muon deadline dung ngay do. Neu
   schema bat buoc cap `from`/`to`, truyen ca hai; khong gui mot cap tham so ma
   schema tu choi. Neu tool khong ho tro loc ngay, neu ro gioi han thay vi gia
   vo da loc.
5. Dung `per_page`/`limit` lon nhat schema cho phep va lay het trang. Reuse ID
   da resolve; khong tra cuu lai nhan vien moi trang.
6. Moi dong task uu tien hien ten, deadline (`from`/`to`), trang thai/loai neu
   API tra ve. Mot scope chi duoc ghi `Khong co task` sau khi call thanh cong va
   pagination cua scope do da hoan tat.
7. Neu user yeu cau nhieu scope, goi router rieng cho tung scope va chia ket qua
   theo tieu de. Khong hoi user chon nhom nao khi y dinh da ro.

Neu `USER.md` khong co `Enterprise username`, hoi user ma nhan vien hoac bao
current session chua duoc gan dinh danh; khong suy ra tu ten hien thi.

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
8. Staff/title requests must follow the authoritative HRM boundary and the staff/position lookup contract above.

## Allowed Commands

Trong Enterprise HRM sandbox, `{baseDir}` la `/workspace/.openclaw/sandbox-skills/skills/hr-skill`. Bat buoc dung duong dan tuyet doi nay; khong dung `./scripts/...`, khong dat `host: "gateway"`, va khong doi `workdir`, vi subagent nen khong co kenh phe duyet cho cac bien the lenh do.

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

Both wrappers use finite connection/request deadlines. A non-zero exit emits
exactly one safe classification on stderr: `CONNECT_TIMEOUT`, `UNREACHABLE`,
`HTTP_ERROR`, or `TOOL_ERROR`. Preserve that classification in the user-facing
explanation; never expose curl diagnostics, request payloads, authorization
headers, or URLs containing credentials.

## Execution Loop (Strict)

1. Neu request thuoc `CURRENT_USER_ASSIGNMENT_MODE`, resolve current user theo
   `Enterprise username` va chi tra cuu cac scope user thuc su yeu cau.
2. Chuyen yeu cau user thanh query routing.
3. Goi `router_tool_search`.
4. Doc `results` va `prerequisites`.
5. Chay cac prerequisite can thiet cho tham so thuc su dung truoc, dua tren
   `input_schema.properties[argument].tool_relate`, sau do chay tool chinh.
6. Voi staff/title queries, ap dung `Staff and position lookup contract`: reset scope neu la toan he thong, fan-out exact title, lay het trang, dedupe `staff_id`, va kiem tra displayed count.
7. Tong hop ket qua cho user chi tu HRM evidence. Ghi ro scope, so ban ghi unique, va partial/HQ-only neu co.
8. Neu ket qua khong dat, quay lai buoc 2 voi query cu the hon nhung van giu HRM lam nguon. Neu loi van chuyen, phan loai loi va dung lai; khong doi sang Enterprise Knowledge.

Read `references/tool-catalog.md` chi de biet quy tac routing. Khong duoc dung file nay de thay the `router_tool_search`.
