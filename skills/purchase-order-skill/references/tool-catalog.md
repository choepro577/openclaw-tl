# Purchase Order Skill Routing Policy

This skill is search-first, auth-aware, and confirmation-gated for write actions.

## Mandatory Flow

1. Before auth-required PO work, read system `USER.md` and inspect section `# po authentication`.
2. If PO credentials are missing or stale, route to `employee_login` first and validate with real login before business tools.
3. Always call `router_tool_search` first with the current user intent, including when you need to find `employee_login`.
4. Select tool candidates only from `router_tool_search.results`.
5. Read `results[].prerequisites` and execute those first when needed.
6. Re-run `router_tool_search` with a refined query when results are empty, weak, or ambiguous.

## Auth Bundle

Most PO tools only require this input field on every call:

- `authorization`

The MCP server injects these fixed upstream headers automatically:

- `serectkey=ad48d1e5be166b1cf084810ccab27ac6`
- `application=ai`
- `version=1.0`

Exception:

- `employee_login` can omit `authorization`.

Credential memory rules:

- Store PO credentials in `USER.md` under `# po authentication` only after `employee_login` succeeds.
- If login fails, treat stored credentials as invalid, do not save them, and ask the user to provide `userName` and `password` again.
- Do not ask the user for `serectkey`, `application`, or `version`.
- Do not rely on an old `authorization` token as long-term memory; get a fresh token from successful login.

## Required Inputs

After selecting a tool, inspect `input_schema.required` and ask the user only for the missing required fields.

- Do not ask for optional fields unless they become necessary.
- Do not ask again for server-managed headers.
- For login, only ask for `userName` and `password`.

## Write Safety

Treat these as mutation tools and require explicit user approval unless the user has already confirmed in the current turn:

- `create_po_draft`
- `update_po_draft`
- `save_po_product`
- `delete_po_product`
- `confirm_po`

Before a write, summarize the target PO code, supplier, site, products, and the exact action that will be sent.

## Common Tool Families

These names are reference-only. Router output remains the source of truth.

- Discovery and diagnostics: `router_tool_search`, `router_index_status`
- Auth and profile: `employee_login`, `employee_get_info`
- Lookup: `search_po_products`, `search_po_suppliers`, `search_po_sites`, `get_po_suggest_suppliers`
- Read PO data: `get_po_request_list`, `get_po_draft_list`, `get_po_detail`, `get_po_aggregate_purchase_goods_summary`, `get_po_aggregate_purchase_goods_detail`
- Write PO data: `create_po_draft`, `update_po_draft`, `save_po_product`, `delete_po_product`, `confirm_po`

## Minimal Command Pattern

Search:

```bash
{baseDir}/scripts/po_call.sh router_tool_search --args-json '{"query":"<user_intent>","top_k":5,"min_score":0.35,"company-id":1}'
```

Execute selected tool:

```bash
{baseDir}/scripts/po_call.sh <tool_name_from_search> --args-json '{"authorization":"<token>", "...":"..."}'
```

Health:

```bash
{baseDir}/scripts/po_health.sh
```
