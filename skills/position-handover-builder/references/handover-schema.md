# Handover Schema

Canonical sections written to `handover.json`:

## `meta`

- `created_at`
- `workspace_root`
- `handover_directory`
- `language`
- `include_credentials`
- `files_scanned`

Use this block for execution metadata and reproducibility.

## `role_context`

- `position`
- `position_english`
- `agent_name`
- `agent_slug`
- `company`
- `department`
- `reports_to`
- `handover_owner`
- `successor`
- `effective_date`

Use `confirmed` when the user provided the field directly. Use `inferred` when the field came from workspace evidence or deterministic derivation. Use `missing` when the field still requires follow-up.

## `responsibilities`

List the main duties, deliverables, and scope boundaries of the role.

## `kpis`

List KPIs, OKRs, service levels, or success metrics tied to the role.

## `operating_rhythm`

List recurring work by day, week, month, or quarter.

## `workflows`

List SOPs, checklists, escalation paths, operational routines, and runbooks.

## `systems_access`

List tools, systems, shared accounts, access request paths, and explicit inline credentials when the user supplied them directly in the current interaction.

Never auto-fill secrets from `.env`, vaults, browser data, or secret stores.

## `stakeholders`

List key collaborators, approvers, escalation contacts, and communication channels.

## `artifacts`

List files, folders, dashboards, documents, or directories that a successor should review first.

## `open_items`

List unresolved tasks that must be completed before or during transition.

## `risks`

List operational risks, continuity concerns, and access risks that could affect handover quality.

## `knowledge_gaps`

List missing or uncertain information that still needs confirmation.

## Field Shape

Scalar field:

```json
{
  "value": "Human Resources Assistant",
  "status": "confirmed",
  "sources": ["arg:position"]
}
```

List field:

```json
{
  "items": [
    {
      "value": "Review incoming hiring requests every morning.",
      "status": "inferred",
      "sources": ["scan:README.md"]
    }
  ],
  "status": "inferred",
  "sources": ["scan:README.md"]
}
```
