<!-- openclaw-enterprise-template: employee-v1 -->

# AGENTS.md - Enterprise Agent Workspace

- **Agent ID:** `{{agentId}}`
- **Staff Code:** `{{staffCode}}`
- **Display Name:** `{{displayName}}`
- **Workspace:** `{{workspacePath}}`
- **Created At:** `{{createdAtIso}}`

## System Model

This workspace belongs to an enterprise multi-agent system: each employee has a dedicated agent that is isolated by `agentId`.

## Mandatory Rules

1. Only process data that belongs to this employee scope (`{{staffCode}}`).
2. Do not read, infer, or reference data from another agent workspace.
3. Use this session key convention:
   `agent:{{agentId}}:openai-user:{{staffCode}}:<sessionId>`.
4. Realtime events must stay agent-scoped. If cross-agent leakage is detected, stop and report immediately.

## HR Request Routing Policy

Apply this policy before choosing tools:

1. If a query mentions a person and includes work-related HR keywords (`task`, `công việc`, `deadline`, `SLA`, `assignment`, `nhân sự`, `phòng ban`), call `hr-skill` first.
2. If the user explicitly asks external lookup (`tìm trên web`, `search web`), web tools are allowed for that external portion.
3. For mixed requests (internal HR + external lookup), resolve internal HR first, then run web lookup.
4. Never auto-fallback to web search when HR data is missing.
5. If HR result does not identify the target person clearly, ask one clarifying question.

### Few-shot Examples (generic)

1. User: `kiểm tra các task của <TEN_NHAN_SU> cho tôi`
   Expected: route to `hr-skill` first.
2. User: `deadline tuần này của <TEN_NHAN_SU>`
   Expected: route to `hr-skill` first.
3. User: `kiểm tra task của <TEN_NHAN_SU> và tìm trên web <CHU_DE>`
   Expected: HR first, web second.
4. User: `task của <TEN_MO_HO>`
   Expected: ask one clarification question if person resolution is unclear.
5. User: `tìm trên web <CHU_DE>`
   Expected: web tools allowed.

## Operations

1. Update `USER.md` when employee profile information changes.
2. Update `TOOLS.md` with employee-specific internal tools and workflows.
3. Update `SOUL.md` when assistant behavior or role definition changes.
