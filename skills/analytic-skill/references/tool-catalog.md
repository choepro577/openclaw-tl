# Analytic Skill Routing Policy

This skill is search-first, no-auth-by-default, and confirmation-gated for write actions.

## Mandatory Flow

1. Always call `router_tool_search` first with the current user intent.
2. Select tool candidates only from `router_tool_search.results`.
3. Read `results[].input_schema.required` and ask only for missing required fields.
4. Execute prerequisite tools from `results[].prerequisites` before the main tool.
5. Re-run `router_tool_search` with a refined query when results are empty, weak, or ambiguous.

## Auth Policy (v1)

- This skill does not enforce login memory in `USER.md`.
- Upstream auth is commonly configured by environment variable `AI_CONTROLLER_AUTHORIZATION` on analytic-hos-mcp-server.
- If a routed tool still needs auth fields, request only required auth fields from `input_schema.required`.

## Write Safety

- Most analytic requests are read-only; prefer read tools first.
- If router suggests a mutation/write tool, summarize the exact action and get explicit user approval before executing.

## Common Tool Families

These names are reference-only. Router output remains the source of truth.

- Discovery and diagnostics: `router_tool_search`, `router_index_status`
- CEO Dashboard reporting:
  - `get_ai_ceo_executive_summary`
  - `get_ai_ceo_mtd_performance`
  - `get_ai_ceo_ytd_performance`
  - `get_ai_ceo_store_performance`
  - `get_ai_ceo_customer_metrics`
  - `get_ai_ceo_promotion_performance`
  - `get_ai_ceo_product_performance`
  - `get_ai_ceo_inventory_cost`
  - `get_ai_ceo_operations`
  - `get_ai_ceo_financial_snapshot`
  - `get_ai_ceo_daily_briefing`
- PI purchase-import reporting:
  - `get_ai_pi_report_summary`
  - `get_ai_pi_report_summary_site`
  - `get_ai_pi_report_summary_supplier`
  - `get_ai_pi_report_summary_product`
  - `get_ai_pi_report_detail_site`
  - `get_ai_pi_report_detail_supplier`
  - `get_ai_pi_report_detail_product`
  - `get_ai_pi_report_price_fluctuations_product`
- Supporting lookups for filters:
  - `get_ai_report_sites`
  - `get_ai_report_suppliers`
  - `get_ai_report_products`

## Hard Restrictions

- Do not call tool-list endpoints (`GET /tools`, `GET /tools/{name}`).
- Do not use any list-tool script.
- Do not inspect/read source code to discover tool names or schemas.

## Minimal Command Pattern

Search:

```bash
{baseDir}/scripts/analytic_call.sh router_tool_search --args-json '{"query":"<user_intent>","top_k":5,"min_score":0.35,"company-id":1}'
```

Execute selected tool:

```bash
{baseDir}/scripts/analytic_call.sh <tool_name_from_search> --args-json '<arguments_json>'
```

Health:

```bash
{baseDir}/scripts/analytic_health.sh
```
