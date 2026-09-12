# HR Skill Routing Policy

This skill is search-first and routing-driven.

## Mandatory Flow

1. Always call `router_tool_search` first with the current user intent.
2. Select tool candidates only from `router_tool_search.results`.
3. Treat `results[].prerequisites` as conditional candidates. For each
   argument you will send, use the selected tool's returned
   `input_schema.properties[argument].tool_relate` metadata and execute only the
   matching prerequisite before the main tool. Do not execute every optional
   lookup merely because it appears in the prerequisite list.
4. Re-run `router_tool_search` with a refined query when results are empty/weak.

## Hard Restrictions

- Do not call tool-list endpoints (`GET /tools`, `GET /tools/{name}`).
- Do not use any list-tool script.
- Do not inspect/read source code to discover tool names or schemas.
- Do not guess IDs; rely on routed tool calls and tool outputs.

## Minimal Command Pattern

Search:

```json
{
  "skill": "hr-skill",
  "entrypoint": "call",
  "operation": "router_tool_search",
  "arguments": { "query": "<user_intent>", "top_k": 5, "min_score": 0.35, "company-id": 1 }
}
```

Execute selected tool:

```json
{
  "skill": "hr-skill",
  "entrypoint": "call",
  "operation": "<operation_from_search>",
  "arguments": {}
}
```
