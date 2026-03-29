---
name: position-handover-builder
description: Create a standardized handover package for a company position or assistant agent by resolving the active workspace, detecting the role or position from local context, and generating JSON plus Markdown handover files. Use when asked to create a handover, ban giao cong viec, job handover, position transition pack, role documentation, successor onboarding notes, or assistant handover for a role, team, or agent workspace.
---

# Position Handover Builder

Use this skill to build a structured handover pack for a position or assistant agent. The output is a folder in the active workspace root with a normalized `handover.json` source file and seven Markdown documents for humans.

## Quick Start

Run the generator from the active workspace:

```bash
python3 {baseDir}/scripts/init_handover.py --position "Human Resources Assistant"
```

If the role is Vietnamese, pass it as-is and let the script translate it for folder naming:

```bash
python3 {baseDir}/scripts/init_handover.py --position "Trợ lý nhân sự"
```

If the user refers to an agent instead of a role, pass the best identifier you have and let the script inspect the workspace:

```bash
python3 {baseDir}/scripts/init_handover.py --agent-name "HR Personnel Assistant"
python3 {baseDir}/scripts/init_handover.py --agent-slug hr-personnel
```

## Workflow

1. Resolve the workspace root.
   - Use `--workspace-path` when the target workspace is different from the current repository.
   - Otherwise the script falls back to the current git root, then the current working directory.
2. Detect the role in this order.
   - Explicit `--position`
   - Local workspace evidence such as `.agent/`, prompts, configs, docs, and nearby metadata
   - `--agent-name` or `--agent-slug`
   - If still unresolved, stop and ask the single follow-up question returned by the script
3. Normalize the handover parameters.
   - Default document language is Vietnamese.
   - Convert Vietnamese position names to concise English titles for folder naming.
   - Do not overwrite an existing folder; timestamp the new folder instead.
4. Scan the workspace for evidence.
   - Prefer non-secret sources such as `README`, `.agent`, `package.json`, `pyproject.toml`, `docker-compose.yml`, and example env files.
   - Never read actual secret files to fill credentials automatically.
5. Generate the handover pack.
   - Write `handover.json`
   - Render Markdown from `assets/templates/`
   - Mark unresolved content as `missing` and inferred content as `inferred`
6. Ask only for unresolved critical gaps.
   - The only hard blocker for generation is an unresolved or ambiguous position.
   - Non-critical gaps should remain in `knowledge_gaps`, `open_items`, and section placeholders.

## Inputs

Supported primary inputs:

- `--position`
- `--agent-name`
- `--agent-slug`
- `--workspace-path`
- `--company`
- `--department`
- `--reports-to`
- `--handover-owner`
- `--successor`
- `--effective-date`
- `--language`
- `--include-credentials`

Optional sensitive input:

- `--credential-item`
  - Use only when the user explicitly provides the credential in the current interaction.
  - Accepts freeform text or a JSON object string.
  - Never invent, scrape, or recover secrets from repo files.

## Output Contract

The generator creates `handover-<english-position-slug>` in the workspace root and writes:

- `handover.json`
- `00-handover-index.md`
- `01-position-overview.md`
- `02-responsibilities-and-kpis.md`
- `03-routines-and-calendar.md`
- `04-workflows-and-sops.md`
- `05-systems-and-access.md`
- `06-stakeholders-and-communications.md`
- `07-open-items-risks-and-next-steps.md`

`handover.json` is the source of truth. It contains section fields with:

- `value` or `items`
- `status`: `confirmed`, `inferred`, or `missing`
- `sources`: short references such as `arg:position`, `scan:README.md`, or `derived:agent_slug`

## Safety Rules

- Do not read `.env`, `.env.local`, `.env.production`, or secret stores to populate credentials.
- Only include inline credentials when the user explicitly supplied them and you intentionally passed `--credential-item`.
- Keep uncertain facts as `inferred` or `missing`; do not silently promote guesses to `confirmed`.
- If the script returns `status = needs_user_input`, ask the returned question once, then rerun.

## References

- Read [references/handover-schema.md](references/handover-schema.md) for the canonical JSON shape and section meanings.
- Read [references/detection-rules.md](references/detection-rules.md) for workspace scanning rules, priority order, and safety boundaries.
