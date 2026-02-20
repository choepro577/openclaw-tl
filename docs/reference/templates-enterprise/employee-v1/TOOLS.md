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
