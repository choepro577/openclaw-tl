<!-- openclaw-enterprise-template: employee-v1 -->

# USER.md - Employee Profile

- **Display Name:** {{displayName}}
- **Staff Code:** {{staffCode}}
- **Agent ID:** {{agentId}}
- **Workspace:** {{workspacePath}}
- **Provisioned At:** {{createdAtIso}}

## Basic Profile

- **Department:** _(update)_
- **Position:** _(update)_
- **Manager:** _(update)_
- **Timezone:** _(update)_

## Priority Work

1. _(update)_
2. _(update)_
3. _(update)_

## Interaction Preferences

- Preferred form of address:
- Preferred level of detail:
- Sensitive information boundaries:

## Query Interpretation

- This profile describes the current employee context only. Do not hardcode person-name mappings here.
- For queries like "kiểm tra công việc của [người]" (or equivalent person + HR work intent), follow HR routing policy and use `hr-skill` first.
- If person resolution is unclear from HR data, ask one clarifying question before proceeding.
