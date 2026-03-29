---
name: self-improving-agent
description: Capture durable learnings, errors, corrections, and missing-feature requests in `.learnings/`. Use when a command fails unexpectedly, a user corrects you, you discover a non-obvious workaround or project pattern, or a repeated insight should be promoted into AGENTS/SOUL/TOOLS or extracted into a reusable skill.
homepage: https://github.com/peterskoett/self-improving-agent
metadata: { "openclaw": { "emoji": "🧠" } }
---

# self-improving-agent

Capture non-obvious learnings while the context is still fresh. The goal is to turn one-off debugging and corrections into reusable project memory.

Use this skill when:

- a command or operation fails in a meaningful way
- the user corrects you or provides missing context
- you discover a better approach than your first attempt
- a feature request is out of scope or unsupported today
- a recurring issue should be promoted into `AGENTS.md`, `SOUL.md`, `TOOLS.md`, or a new skill

## First Use

Before logging anything, ensure the workspace or project has `.learnings/` initialized:

```bash
mkdir -p .learnings
[ -f .learnings/LEARNINGS.md ] || cp {baseDir}/assets/LEARNINGS.md .learnings/LEARNINGS.md
[ -f .learnings/ERRORS.md ] || cp {baseDir}/assets/ERRORS.md .learnings/ERRORS.md
[ -f .learnings/FEATURE_REQUESTS.md ] || cp {baseDir}/assets/FEATURE_REQUESTS.md .learnings/FEATURE_REQUESTS.md
```

Never overwrite existing files. If you cannot safely copy from the skill directory, create equivalent files inline with the same headings.

Do not log secrets, tokens, private keys, environment variables, or full source/config files unless the user explicitly wants that level of detail. Prefer short summaries or redacted excerpts over raw transcripts or raw tool output.

## Quick Reference

| Situation                                    | Action                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Command or tool fails unexpectedly           | Log to `.learnings/ERRORS.md`                                               |
| User corrects you                            | Log to `.learnings/LEARNINGS.md` with category `correction`                 |
| You learn an undocumented project convention | Log to `.learnings/LEARNINGS.md` with category `insight` or `knowledge_gap` |
| You discover a better recurring approach     | Log to `.learnings/LEARNINGS.md` with category `best_practice`              |
| User asks for an unsupported capability      | Log to `.learnings/FEATURE_REQUESTS.md`                                     |
| Similar issue already exists                 | Link it with `See Also` and consider raising priority                       |
| Pattern becomes broadly reusable             | Promote to `AGENTS.md`, `SOUL.md`, `TOOLS.md`, or extract a new skill       |

## Promotion Targets

Promote broadly applicable learnings into workspace files once they are proven useful:

| Learning type                        | Promote to                        |
| ------------------------------------ | --------------------------------- |
| Workflow or delegation guidance      | `AGENTS.md`                       |
| Behavioral or communication guidance | `SOUL.md`                         |
| Tool-specific gotchas or setup rules | `TOOLS.md`                        |
| Copilot-specific context             | `.github/copilot-instructions.md` |

Keep promoted rules short and preventative. Do not copy full incident write-ups into prompt files.

## Logging Format

### Learning Entry

Append to `.learnings/LEARNINGS.md`:

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary

One-line description of what was learned

### Details

What happened, what was wrong, and what is now understood

### Suggested Action

Specific fix, prevention step, or follow-up

### Metadata

- Source: conversation | error | user_feedback | simplify-and-harden
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001
- Pattern-Key: simplify.dead_code | harden.input_validation
- Recurrence-Count: 1
- First-Seen: 2025-01-15
- Last-Seen: 2025-01-15

---
```

### Error Entry

Append to `.learnings/ERRORS.md`:

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary

Brief description of what failed

### Error

Short error message or a redacted excerpt

### Context

- Command or operation attempted
- Inputs or parameters used
- Environment details if relevant
- Relevant output summary

### Suggested Fix

If identifiable, what is likely to resolve it

### Metadata

- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001

---
```

### Feature Request Entry

Append to `.learnings/FEATURE_REQUESTS.md`:

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability

What the user wanted to do

### User Context

Why they needed it

### Complexity Estimate

simple | medium | complex

### Suggested Implementation

How it could be built or where it would fit

### Metadata

- Frequency: first_time | recurring
- Related Features: existing_feature_name

---
```

## Recurring Pattern Workflow

If a new issue looks similar to an existing one:

1. Search first: `rg -n "keyword|Pattern-Key" .learnings`
2. Reuse or add `See Also` links instead of creating disconnected duplicates
3. Bump `Recurrence-Count` and `Last-Seen` for recurring patterns
4. Promote the pattern once it is repeated and clearly generalizable

For simplify-and-harden style feeds, use `Pattern-Key` as the stable dedupe key.

## Review Rhythm

Review `.learnings/` at natural checkpoints:

- before a major task in the same area
- after completing a feature or bugfix
- when the user asks for process improvement
- periodically during active development

Useful checks:

```bash
grep -h "Status\\*\\*: pending" .learnings/*.md | wc -l
grep -B5 "Priority\\*\\*: high" .learnings/*.md | grep "^## \\["
grep -l "Area\\*\\*: backend" .learnings/*.md
```

## Skill Extraction

Extract a new skill when a learning is recurring, verified, non-obvious, broadly applicable, or the user explicitly asks to save it as a skill.

Use the helper:

```bash
{baseDir}/scripts/extract-skill.sh skill-name --dry-run
{baseDir}/scripts/extract-skill.sh skill-name
```

Before extraction, verify:

- the solution works
- the description stands on its own
- examples are self-contained
- no project-specific secrets or hardcoded values remain

## External-Agent Helpers

This bundled skill includes helper scripts for external agent hook systems:

- `scripts/activator.sh`
- `scripts/error-detector.sh`
- `references/hooks-setup.md`

Use those only when the user is configuring Claude Code, Codex CLI, or another compatible tool that supports shell hook commands.

These are not native OpenClaw bundled hooks. This repo currently does not expose direct OpenClaw equivalents for the upstream `UserPromptSubmit` and `PostToolUse(Bash)` flow, so keep that setup separate from OpenClaw internal hooks.

## References

- `references/examples.md` for concrete learning/error/feature-request entries
- `references/openclaw-integration.md` for workspace-oriented promotion guidance
- `references/hooks-setup.md` for optional external-agent hook wiring
