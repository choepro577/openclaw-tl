# Entry Examples

Concrete examples for `.learnings/` entries.

## Learning Example

```markdown
## [LRN-20250115-001] knowledge_gap

**Logged**: 2025-01-15T14:22:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary

Project uses pnpm rather than npm

### Details

Attempted `npm install`, but the repo is built around `pnpm-lock.yaml`
and `pnpm-workspace.yaml`.

### Suggested Action

Check lockfiles before assuming the package manager.

### Metadata

- Source: error
- Related Files: pnpm-lock.yaml, pnpm-workspace.yaml
- Tags: package-manager, pnpm

---
```

## Error Example

```markdown
## [ERR-20250115-A3F] docker_build

**Logged**: 2025-01-15T09:15:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary

Docker build fails on Apple Silicon due to platform mismatch

### Error

error: failed to solve: no match for platform linux/arm64

### Context

- Command: `docker build -t myapp .`
- Running on Apple Silicon

### Suggested Fix

Use `--platform linux/amd64` or update the Dockerfile platform.

### Metadata

- Reproducible: yes
- Related Files: Dockerfile

---
```

## Feature Request Example

```markdown
## [FEAT-20250115-001] export_to_csv

**Logged**: 2025-01-15T16:45:00Z
**Priority**: medium
**Status**: pending
**Area**: backend

### Requested Capability

Export analysis results to CSV

### User Context

Stakeholders need spreadsheet-friendly output.

### Complexity Estimate

simple

### Suggested Implementation

Add `--output csv` alongside the existing JSON output path.

### Metadata

- Frequency: first_time
- Related Features: export_json

---
```
