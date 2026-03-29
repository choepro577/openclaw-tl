# Detection Rules

Use these rules when the skill needs to infer the role or seed handover content from the local workspace.

## Detection Priority

1. Explicit input such as `--position`
2. Workspace metadata with named fields
3. Nearby agent hints such as `--agent-name` or `--agent-slug`
4. Ask one focused follow-up question if the position is still unresolved or translation is ambiguous

## Preferred Evidence Sources

Scan these sources first:

- `.agent/`
- `README*`
- `package.json`
- `pyproject.toml`
- `requirements.txt`
- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.yaml`
- example env files such as `.env.example`, `.env.sample`, `.env.template`
- prompts, profiles, or agent configuration files

## Field Hints

Recognize both English and Vietnamese keys where possible:

- `position`, `job title`, `role`, `chức vụ`, `vai trò`
- `department`, `team`, `phòng ban`
- `company`, `organization`, `công ty`
- `reports to`, `manager`, `báo cáo cho`

Prefer files under `.agent/` and files with `agent`, `prompt`, `profile`, or `README` in their path.

## Section Hints

When filling non-blocking sections, look for headings and bullet lists that resemble:

- Responsibilities: `responsibilities`, `accountabilities`, `nhiệm vụ`
- KPIs: `kpi`, `okr`, `metrics`, `chỉ số`
- Operating rhythm: `daily`, `weekly`, `monthly`, `routine`, `lịch`
- Workflows: `workflow`, `process`, `quy trình`, `sop`, `runbook`
- Stakeholders: `stakeholders`, `contacts`, `communication`, `phối hợp`

## Security Boundary

- Do not read live secret files such as `.env`, `.env.local`, or secret vault exports.
- Only include inline credentials when the user explicitly supplied them during the current request and the operator intentionally passed them into the generator.
- When in doubt, record an access reference, owner, or request path instead of a raw credential.

## Ambiguity Rule

If the workspace suggests a role but the English title is ambiguous for folder naming, stop and return a single follow-up question rather than inventing a title.
