# OpenClaw Integration

Guidance for using `self-improving-agent` inside an OpenClaw workspace.

## What Changes In OpenClaw

OpenClaw already injects workspace guidance such as `AGENTS.md`, `SOUL.md`, and `TOOLS.md`. This skill complements those files by helping the agent capture raw learnings in `.learnings/` before promoting stable patterns into prompt-facing workspace files.

## Recommended Workspace Layout

```text
<workspace>/
├── AGENTS.md
├── SOUL.md
├── TOOLS.md
└── .learnings/
    ├── LEARNINGS.md
    ├── ERRORS.md
    └── FEATURE_REQUESTS.md
```

## Suggested Workflow

1. Capture fresh learnings in `.learnings/`.
2. Review for recurrence, breadth, and confidence.
3. Promote short prevention rules into workspace files when appropriate.
4. Extract a new reusable skill only when the pattern is stable and broadly useful.

## Promotion Guide

| If the learning is about...          | Promote to  |
| ------------------------------------ | ----------- |
| delegation, review steps, task flow  | `AGENTS.md` |
| communication style or behavior      | `SOUL.md`   |
| local tooling or environment gotchas | `TOOLS.md`  |

Keep `.learnings/` as the raw journal and workspace prompt files as the distilled rules.

## Session Tools

If the user explicitly wants cross-session sharing, OpenClaw session tools can help:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

Only send sanitized summaries and relevant paths. Avoid forwarding full transcripts or secret-bearing tool output.

## Important Scope Note

This bundled skill does not install or register a native OpenClaw internal hook. The upstream package advertises an OpenClaw hook, but the published `hooks/openclaw/*` files in `v3.0.10` are empty, so they are intentionally not bundled here.

Use `references/hooks-setup.md` only when configuring external agent CLIs such as Claude Code or Codex CLI.
