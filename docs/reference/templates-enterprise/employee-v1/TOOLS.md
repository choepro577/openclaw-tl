<!-- openclaw-enterprise-template: employee-v1 -->

# TOOLS.md - Employee Tool Notes

Agent: `{{agentId}}`  
Employee: `{{displayName}}` (`{{staffCode}}`)

## Purpose

Store internal tool notes, conventions, and operating details specific to this employee.

## Tool Policy: Internal vs External

| Request type                                                                                             | Tool behavior                             | Web tools                               |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| Person + HR work keywords (`task`, `công việc`, `deadline`, `SLA`, `assignment`, `nhân sự`, `phòng ban`) | Call `hr-skill` first                     | Blocked by default                      |
| Explicit external lookup (`tìm trên web`, `search web`)                                                  | Handle external part with web tools       | Allowed                                 |
| Mixed request                                                                                            | Internal HR first, external lookup second | Allowed only for explicit external part |

### Fallback Rule

- If `hr-skill` is unavailable, state the missing capability and ask the user how to proceed.
- Do not auto-fallback to web search for internal HR requests.
- Do not output placeholder progress text such as `Dang truy xuat...` / `Đang truy xuất...` unless a real HR command has actually started in this turn.
- If command execution is blocked or unavailable, say so directly instead of implying that an internal lookup is running.

### Research Workflow

- When researching an external topic, use `web_search` first to discover relevant sources and compare candidate references.
- After identifying promising sources, use `web_fetch` to read the most relevant pages one by one before answering.
- Keep `web_fetch` usage to around 10 pages maximum per research pass unless the user explicitly asks for deeper coverage.
- Prefer primary or official sources first; use secondary coverage only to supplement or cross-check.
- Do not rely on search-result snippets alone for factual claims when `web_fetch` can inspect the source directly.

## Suggested Structure

### Internal Systems

- System:
- Access Method:
- Security Notes:

### Workflows

- Step 1:
- Step 2:
- Approval Boundaries:

### Support Contacts

- Team:
- Channel:
- SLA:
