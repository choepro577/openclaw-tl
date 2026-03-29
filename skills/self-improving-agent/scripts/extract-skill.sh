#!/bin/bash
# Create a new skill scaffold from a learning entry.

set -euo pipefail

skills_dir="./skills"
skill_name=""
dry_run=false

red='\033[0;31m'
green='\033[0;32m'
yellow='\033[1;33m'
nc='\033[0m'

usage() {
  cat <<EOF
Usage: $(basename "$0") <skill-name> [options]

Create a new skill scaffold from a learning entry.

Arguments:
  skill-name     Name of the skill (lowercase letters, digits, hyphens)

Options:
  --dry-run      Show the files that would be created without writing them
  --output-dir   Relative output directory under the current directory (default: ./skills)
  -h, --help     Show this help message

Examples:
  $(basename "$0") docker-m1-fixes
  $(basename "$0") api-timeout-patterns --dry-run
  $(basename "$0") pnpm-setup --output-dir ./skills/custom
EOF
}

log_info() {
  echo -e "${green}[INFO]${nc} $1"
}

log_error() {
  echo -e "${red}[ERROR]${nc} $1" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=true
      shift
      ;;
    --output-dir)
      if [ -z "${2:-}" ] || [[ "${2:-}" == -* ]]; then
        log_error "--output-dir requires a relative path argument"
        usage
        exit 1
      fi
      skills_dir="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      log_error "Unknown option: $1"
      usage
      exit 1
      ;;
    *)
      if [ -n "$skill_name" ]; then
        log_error "Unexpected argument: $1"
        usage
        exit 1
      fi
      skill_name="$1"
      shift
      ;;
  esac
done

if [ -z "$skill_name" ]; then
  log_error "Skill name is required"
  usage
  exit 1
fi

if ! [[ "$skill_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  log_error "Invalid skill name format. Use lowercase letters, digits, and hyphens only."
  exit 1
fi

if [[ "$skills_dir" = /* ]]; then
  log_error "Output directory must be relative to the current directory."
  exit 1
fi

if [[ "$skills_dir" =~ (^|/)\.\.(/|$) ]]; then
  log_error "Output directory cannot include '..' segments."
  exit 1
fi

skills_dir="${skills_dir#./}"
skills_dir="./$skills_dir"
skill_path="$skills_dir/$skill_name"

if [ -d "$skill_path" ] && [ "$dry_run" = false ]; then
  log_error "Skill already exists: $skill_path"
  exit 1
fi

skill_title=$(echo "$skill_name" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')

template=$(cat <<EOF
---
name: $skill_name
description: "[TODO: Add a concise description of what this skill does and when to use it]"
---

# $skill_title

[TODO: Brief introduction explaining the skill purpose]

## Quick Reference

| Situation | Action |
|-----------|--------|
| [Trigger condition] | [What to do] |

## Usage

[TODO: Detailed usage instructions]

## Examples

[TODO: Add concrete examples]

## Source Learning

This skill was extracted from a learning entry.
- Learning ID: [TODO: Add original learning ID]
- Original File: .learnings/LEARNINGS.md
EOF
)

if [ "$dry_run" = true ]; then
  log_info "Dry run - would create:"
  echo "  $skill_path/"
  echo "  $skill_path/SKILL.md"
  echo
  echo "$template"
  exit 0
fi

mkdir -p "$skill_path"
printf '%s\n' "$template" > "$skill_path/SKILL.md"

log_info "Created: $skill_path/SKILL.md"
echo
echo -e "${yellow}Next steps:${nc}"
echo "  1. Fill in the TODO sections."
echo "  2. Add references/ or scripts/ if needed."
echo "  3. Update the original learning entry with:"
echo "     **Status**: promoted_to_skill"
echo "     **Skill-Path**: skills/$skill_name"
