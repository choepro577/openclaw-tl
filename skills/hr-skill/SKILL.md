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

## Mandatory Rules

1. Luon goi `router_tool_search` truoc de tim tool.
2. Chi duoc goi cac tool xuat hien trong ket qua `router_tool_search`.
3. Khong duoc goi list tool:
   - Khong `GET /tools`
   - Khong `GET /tools/{name}`
   - Khong dung script list tools.
4. Khong duoc doc/truy cap source code de suy doan tool/schema.
5. Neu `router_tool_search` khong du ro, phai refine query roi goi lai `router_tool_search` hoac hoi ro user.

## Allowed Commands

Health check:

```bash
{baseDir}/scripts/hr_health.sh
```

Tool discovery (bat buoc):

```bash
{baseDir}/scripts/hr_call.sh router_tool_search --args-json '{"query":"tim danh sach nhan vien phong Ke toan","top_k":5,"min_score":0.35,"company-id":1}'
```

Call tool duoc de xuat boi router:

```bash
{baseDir}/scripts/hr_call.sh <tool_name_from_search> --args-json '<suggested_arguments_json>'
```

## Execution Loop (Strict)

1. Chuyen yeu cau user thanh query routing.
2. Goi `router_tool_search`.
3. Doc `results` va `prerequisites`.
4. Chay prerequisite tools truoc (neu co), sau do chay tool chinh.
5. Tong hop ket qua cho user.
6. Neu ket qua khong dat, quay lai buoc 1 voi query cu the hon.

Read `references/tool-catalog.md` chi de biet quy tac routing. Khong duoc dung file nay de thay the `router_tool_search`.
