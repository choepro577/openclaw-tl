# HR Skill Routing Policy

This skill is search-first and routing-driven.

## Mandatory Flow

1. Always call `router_tool_search` first with the current user intent.
2. Select tool candidates only from `router_tool_search.results`.
3. Execute prerequisite tools from `results[].prerequisites` before the main tool.
4. Re-run `router_tool_search` with a refined query when results are empty/weak.

## Hard Restrictions

- Do not call tool-list endpoints (`GET /tools`, `GET /tools/{name}`).
- Do not use any list-tool script.
- Do not inspect/read source code to discover tool names or schemas.
- Do not guess IDs; rely on routed tool calls and tool outputs.

## Minimal Command Pattern

Search:

```bash
{baseDir}/scripts/hr_call.sh router_tool_search --args-json '{"query":"<user_intent>","top_k":5,"min_score":0.35,"company-id":1}'
```

Execute selected tool:

```bash
{baseDir}/scripts/hr_call.sh <tool_name_from_search> --args-json '<arguments_json>'
```
