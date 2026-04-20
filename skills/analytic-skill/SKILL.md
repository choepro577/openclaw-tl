---
name: analytic-skill
description: "Dung cho cac yeu cau phan tich kinh doanh/CEO/doanh thu va bao cao nhap mua PI. Neu user noi chung ve tinh hinh kinh doanh, goc nhin CEO, hoac phan tich doanh thu thi agent phai tu dong tong hop full nhom CEO Dashboard (khong hoi lai muon xem dang nao, chi nhanh nao); chi hoi user khi co truong required khong the suy luan/tu dien. Bat buoc goi router_tool_search truoc moi tool va chi duoc goi tool duoc de xuat."
metadata: { "openclaw": { "emoji": "📈", "requires": { "bins": ["curl"] } } }
---

# Analytic Skill

Use this skill to tra cuu va phan tich du lieu tu Analytic HOS MCP HTTP.

## Trigger and Intent Mapping

Khi user noi cac cau tu nhien nhu:

- "cho toi xem bao cao phan tich kinh doanh"
- "xem bao cao doanh thu / KPI / dashboard"
- "phan tich hieu qua kinh doanh hom nay / tuan nay / thang nay"
- "bao cao nhap mua / bien dong gia nhap / tong hop NCC"

Thi mac dinh coi day la intent cua `analytic-skill`, khong can user phai noi ten tool.

Mapping nhanh:

- Neu user nghieng ve doanh thu, KPI tong quan, van hanh, chi nhanh, khach hang, khuyen mai, san pham: uu tien nhom CEO Dashboard.
- Neu user nghieng ve nhap mua, NCC, gia nhap, chi tiet mat hang nhap, bien dong don gia: uu tien nhom PI report.
- Neu user noi chung chung "bao cao phan tich kinh doanh", "phan tich tinh hinh kinh doanh", "phan tich goc nhin CEO", "phan tich doanh thu": bat buoc vao `CEO_AUTO_AGGREGATE_MODE`.

`CEO_AUTO_AGGREGATE_MODE` (mac dinh cho intent chung ve kinh doanh/CEO/doanh thu):

- Khong hoi lai user muon phan tich dang nao, muon xem chi nhanh nao.
- Tu dong tong hop toi da cac goc CEO Dashboard co the lay du lieu duoc trong run hien tai:
  - Executive Summary
  - MTD/YTD performance
  - Store performance
  - Customer metrics
  - Promotion performance
  - Product performance
  - Inventory cost
  - Operations
  - Financial snapshot
  - Daily briefing
- Uu tien chay nhieu tool CEO roi tong hop thanh 1 ban bao cao dieu hanh duy nhat cho user.
- Chi duoc hoi lai khi gap truong `required` ma khong the tu dien theo schema/tool discovery.

Scope nghiep vu hien tai gom 2 nhom bao cao:

1. CEO Dashboard reports:

- Executive Summary
- MTD/YTD performance
- Store performance
- Customer metrics
- Promotion performance
- Product performance
- Inventory cost
- Operations
- Financial snapshot
- Daily briefing

2. PI (purchase import) reports:

- Tong quan nhap mua theo ky
- Tong quan theo chi nhanh / nha cung cap / san pham
- Chi tiet theo chi nhanh / nha cung cap / san pham
- Bien dong don gia nhap theo mat hang + NCC
- Lookup danh muc `sites`, `suppliers`, `products` de loc bao cao

Default connection:

- Base URL: `http://192.168.10.249:10004`
- Override with: `ANALYTIC_MCP_BASE_URL` (hoac `COMNIEU_MCP_BASE_URL`)
- Health endpoint: `GET /health`
- Auth policy: khong yeu cau login/USER.md; auth upstream duoc uu tien cau hinh qua `AI_CONTROLLER_AUTHORIZATION` tren analytic-hos-mcp-server.

## Mandatory Rules

1. Luon goi `router_tool_search` truoc de tim tool.
2. Ngoai `router_tool_search` va `router_index_status`, chi duoc goi cac tool xuat hien trong ket qua `router_tool_search`.
3. Sau khi chon tool, phai doc ky `input_schema`, dac biet la danh sach `required`.
4. Neu intent la chung ve kinh doanh/CEO/doanh thu, bat buoc dung `CEO_AUTO_AGGREGATE_MODE`: tu dong goi nhieu tool CEO de tong hop, khong hoi lai user ve loai bao cao/chi nhanh.
5. Chi duoc hoi user khi co truong `required` ma khong the suy luan hoac tu dien duoc. Khong hoi them field optional neu chua that su can.
6. Khong hoi user cac field he thong neu khong nam trong `required` (vi du `response_mode`, `include_headers` la optional).
7. Uu tien cach tu dien tham so truoc khi hoi user:
   - Dung `suggested_arguments` tu `router_tool_search` neu co.
   - Neu can date range ma user chua noi: mac dinh `from` = ngay dau thang hien tai, `to` = hom nay.
   - Neu can 1 moc ngay ma user chua noi: mac dinh ngay hien tai.
   - Neu can `siteIds` ma user chua noi: uu tien lay danh muc site (tool search site) va dung toan bo site hop le.
8. Sau khi da tu dien, neu tool van bao thieu `required` thi moi hoi user dung truong do.
9. Phai tong hop ket qua theo goc nhin CEO (key signal, bien dong, rui ro, de xuat hanh dong), khong tra tung manh roi rac neu user dang hoi tong quan.
10. Khong duoc goi list tool:

- Khong `GET /tools`
- Khong `GET /tools/{name}`
- Khong dung script list tools.

11. Khong duoc doc/truy cap source code de suy doan tool/schema.
12. Neu `router_tool_search` khong du ro, phai refine query roi goi lai `router_tool_search` hoac hoi ro user.
13. Neu current run khong the thuc su doc skill / chay command / goi tool, phai noi ro la khong truy cap duoc capability nay; khong duoc noi nhu the dang tra cuu.
14. Khong duoc viet placeholder progress text kieu "Dang truy xuat..." hoac "Toi dang kiem tra..." tru khi da bat dau chay command that trong chinh turn nay.
15. Neu tool duoc router de xuat co tinh chat ghi/doi du lieu, phai xin user confirmation ro rang truoc khi execute.
16. Skill nay mac dinh khong xu ly login memory; neu tool tra unauthorized, thong bao ro va hoi user thong tin auth can thiet theo `input_schema.required`.

## Allowed Commands

Health check:

```bash
{baseDir}/scripts/analytic_health.sh
```

Router health / index diagnostic:

```bash
{baseDir}/scripts/analytic_call.sh router_index_status --args-json '{}'
```

Tool discovery (bat buoc):

```bash
{baseDir}/scripts/analytic_call.sh router_tool_search --args-json '{"query":"tong hop doanh thu theo chi nhanh trong 7 ngay qua","top_k":3,"min_score":0.35,"company-id":1}'
```

Call tool duoc de xuat boi router:

```bash
{baseDir}/scripts/analytic_call.sh <tool_name_from_search> --args-json '<suggested_arguments_json>'
```

Vi du tool nghiep vu thuong gap:

```bash
{baseDir}/scripts/analytic_call.sh get_ai_ceo_daily_briefing --args-json '{"siteIds":"S1,S2"}'
{baseDir}/scripts/analytic_call.sh get_ai_pi_report_summary --args-json '{"from":"2026-04-01","to":"2026-04-20"}'
{baseDir}/scripts/analytic_call.sh get_ai_pi_report_price_fluctuations_product --args-json '{"siteIds":"S1","from":"2026-03-01","to":"2026-03-31"}'
```

## Execution Loop (Strict)

1. Xac dinh request la read-only hay write. Neu la write, dat diem dung de xin confirmation.
2. Classify intent:
   - Neu la intent chung ve kinh doanh/CEO/doanh thu => bat buoc `CEO_AUTO_AGGREGATE_MODE`.
   - Neu la intent nhap mua => PI mode.
3. Tao query routing va goi `router_tool_search`.
4. Doc `results`, `prerequisites`, `input_schema`, va danh sach `required`.
5. Tu dien toi da cac truong required theo rule (suggested args, date default, all sites) truoc khi hoi user.
6. Chay prerequisite tools truoc (neu co), sau do chay tool chinh.
7. Neu `CEO_AUTO_AGGREGATE_MODE` dang bat:
   - Lap lai buoc 3-6 cho nhieu query/nhieu tool CEO de phu cac goc quan tri quan trong.
   - Tong hop ket qua thanh 1 executive brief thong nhat (tong quan, diem sang, diem canh bao, hanh dong de xuat).
8. Neu la write tool, summarize hanh dong se gui va confirm lan cuoi truoc khi execute.
9. Neu ket qua khong dat, quay lai buoc 3 voi query cu the hon.

Read `references/tool-catalog.md` chi de biet quy tac routing va danh muc tool theo 2 nhom CEO/PI. Khong duoc dung file nay de thay the `router_tool_search`.
