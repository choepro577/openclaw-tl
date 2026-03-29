#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from string import Template
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATE_DIR = SKILL_DIR / "assets" / "templates"

TEXT_EXTENSIONS = {
    ".cfg",
    ".conf",
    ".env.example",
    ".env.sample",
    ".env.template",
    ".ini",
    ".json",
    ".md",
    ".prompt",
    ".py",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}

PRIORITY_FILES = {
    ".agent",
    "agent",
    "agents",
    "handover",
    "package.json",
    "profile",
    "prompt",
    "readme",
    "role",
    "workspace",
}

SKIP_DIRS = {
    ".git",
    ".idea",
    ".next",
    ".pytest_cache",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "venv",
}

IGNORE_SECRET_FILES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
}

MAX_SCAN_FILES = 250
MAX_FILE_SIZE = 200_000
MAX_SECTION_ITEMS = 8

FIELD_PATTERNS = {
    "position": [
        r'["\']?(?:position|job[_ -]?title|job title|title|chuc vu|chức vụ|vai tro|vai trò|role)["\']?\s*[:=]\s*["\']?([^\n,"\']+)',
    ],
    "department": [
        r'["\']?(?:department|dept|phong ban|phòng ban|team)["\']?\s*[:=]\s*["\']?([^\n,"\']+)',
    ],
    "company": [
        r'["\']?(?:company|organization|organisation|cong ty|công ty)["\']?\s*[:=]\s*["\']?([^\n,"\']+)',
    ],
    "reports_to": [
        r'["\']?(?:reports[_ -]?to|reports to|manager|supervisor|bao cao cho|báo cáo cho)["\']?\s*[:=]\s*["\']?([^\n,"\']+)',
    ],
}

SECTION_HEADINGS = {
    "responsibilities": [
        "responsibilities",
        "responsibility",
        "accountabilities",
        "scope",
        "nhiem vu",
        "nhiệm vụ",
        "pham vi",
        "phạm vi",
    ],
    "kpis": ["kpi", "okr", "metric", "metrics", "chi so", "chỉ số"],
    "operating_rhythm": [
        "daily",
        "weekly",
        "monthly",
        "routine",
        "cadence",
        "calendar",
        "lich",
        "lịch",
    ],
    "workflows": ["workflow", "workflows", "process", "processes", "quy trinh", "quy trình", "sop", "runbook"],
    "stakeholders": [
        "stakeholder",
        "stakeholders",
        "contacts",
        "communication",
        "phoi hop",
        "phối hợp",
        "lien he",
        "liên hệ",
    ],
}

SYSTEM_HINTS = [
    ("package.json", "Node.js application", "Repo contains package metadata."),
    ("package-lock.json", "npm dependency lockfile", "Repo uses npm package locking."),
    ("pnpm-lock.yaml", "pnpm workspace", "Repo uses pnpm package management."),
    ("yarn.lock", "Yarn workspace", "Repo uses Yarn package management."),
    ("pyproject.toml", "Python project", "Repo contains Python packaging metadata."),
    ("requirements.txt", "Python dependencies", "Repo contains requirements.txt."),
    ("Dockerfile", "Docker image build", "Repo contains Docker build instructions."),
    ("docker-compose.yml", "Docker Compose stack", "Repo contains docker-compose orchestration."),
    ("docker-compose.yaml", "Docker Compose stack", "Repo contains docker-compose orchestration."),
    (".agent", "Agent workspace metadata", "Repo contains local agent skills or workflows."),
    ("mcp-server", "MCP service", "Workspace contains an MCP server directory."),
    ("scripts", "Local automation scripts", "Workspace contains a scripts directory."),
]

COMMON_POSITION_MAP = {
    "tro ly nhan su": "Human Resources Assistant",
    "tro ly hanh chinh": "Administrative Assistant",
    "tro ly kinh doanh": "Sales Assistant",
    "tro ly marketing": "Marketing Assistant",
    "tro ly giam doc": "Executive Assistant",
    "chuyen vien nhan su": "Human Resources Specialist",
    "truong phong nhan su": "Human Resources Department Head",
    "truong phong kinh doanh": "Sales Department Head",
    "truong phong marketing": "Marketing Department Head",
    "truong phong hanh chinh": "Administration Department Head",
    "quan ly van hanh": "Operations Manager",
    "quan ly kinh doanh": "Sales Manager",
    "quan ly marketing": "Marketing Manager",
    "giam doc nhan su": "Human Resources Director",
    "giam doc kinh doanh": "Sales Director",
    "giam doc marketing": "Marketing Director",
    "tong giam doc": "Chief Executive Officer",
    "pho tong giam doc": "Deputy Chief Executive Officer",
}

VN_NOUN_MAP = {
    "nhan su": "Human Resources",
    "hanh chinh": "Administration",
    "kinh doanh": "Sales",
    "marketing": "Marketing",
    "van hanh": "Operations",
    "san pham": "Product",
    "du an": "Project",
    "cong nghe": "Technology",
    "ky thuat": "Technical",
    "ke toan": "Accounting",
    "tai chinh": "Finance",
    "mua hang": "Procurement",
    "phap che": "Legal",
    "noi dung": "Content",
    "thiet ke": "Design",
    "du lieu": "Data",
    "chat luong": "Quality",
    "cham soc khach hang": "Customer Service",
    "tuyen dung": "Recruitment",
    "ho tro": "Support",
    "doi tac": "Partnership",
    "chien luoc": "Strategy",
}

VN_TITLE_RULES = [
    ("pho tong giam doc", lambda rest: "Deputy Chief Executive Officer"),
    ("tong giam doc", lambda rest: "Chief Executive Officer"),
    ("giam doc", lambda rest: f"{translate_vn_noun_phrase(rest)} Director" if rest else "Director"),
    ("truong phong", lambda rest: f"{translate_vn_noun_phrase(rest)} Department Head" if rest else "Department Head"),
    ("pho phong", lambda rest: f"Deputy {translate_vn_noun_phrase(rest)} Manager" if rest else "Deputy Manager"),
    ("quan ly", lambda rest: f"{translate_vn_noun_phrase(rest)} Manager" if rest else "Manager"),
    ("truong nhom", lambda rest: f"{translate_vn_noun_phrase(rest)} Team Lead" if rest else "Team Lead"),
    ("tro ly", lambda rest: f"{translate_vn_noun_phrase(rest)} Assistant" if rest else "Assistant"),
    ("chuyen vien", lambda rest: f"{translate_vn_noun_phrase(rest)} Specialist" if rest else "Specialist"),
]


def translate_vn_noun_phrase(text: str) -> str:
    phrase = normalize_lookup(text)
    if not phrase:
        return ""
    if phrase in VN_NOUN_MAP:
        return VN_NOUN_MAP[phrase]
    for vn, en in sorted(VN_NOUN_MAP.items(), key=lambda item: len(item[0]), reverse=True):
        if phrase == vn:
            return en
    words = [VN_NOUN_MAP.get(word, word.title()) for word in phrase.split()]
    return " ".join(words).strip()


def clean_value(value: str) -> str:
    value = value.strip().strip("`'\" ")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"[|,;]+$", "", value)
    return value.strip()


def normalize_lookup(value: str) -> str:
    lowered = value.strip().lower()
    normalized = unicodedata.normalize("NFKD", lowered)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("đ", "d")
    normalized = re.sub(r"[^a-z0-9\s/-]", " ", normalized)
    normalized = re.sub(r"[_/]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def looks_vietnamese(value: str) -> bool:
    if re.search(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", value.lower()):
        return True
    normalized = normalize_lookup(value)
    if normalized in COMMON_POSITION_MAP:
        return True
    return any(token in normalized for token in VN_NOUN_MAP) or any(normalized.startswith(prefix) for prefix, _ in VN_TITLE_RULES)


def title_case_preserving_acronyms(value: str) -> str:
    words = []
    for word in re.split(r"\s+", value.strip()):
        if not word:
            continue
        if word.isupper() and len(word) <= 5:
            words.append(word)
        else:
            words.append(word.capitalize())
    return " ".join(words)


def slugify(value: str) -> str:
    normalized = normalize_lookup(value)
    normalized = normalized.replace(" ", "-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-")


def strip_agent_suffixes(value: str) -> str:
    stripped = re.sub(
        r"\b(?:assistant|agent|bot|copilot|worker|ai)\b",
        "",
        value,
        flags=re.IGNORECASE,
    )
    stripped = re.sub(r"\s+", " ", stripped).strip(" -_")
    return stripped or value.strip()


def to_field(value: Any, status: str, sources: list[str], notes: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": status, "sources": sources}
    if isinstance(value, list):
        payload["items"] = value
    else:
        payload["value"] = value
    if notes:
        payload["notes"] = notes
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a standardized handover pack for a role or assistant workspace.")
    parser.add_argument("--position")
    parser.add_argument("--agent-name")
    parser.add_argument("--agent-slug")
    parser.add_argument("--workspace-path")
    parser.add_argument("--company")
    parser.add_argument("--department")
    parser.add_argument("--reports-to")
    parser.add_argument("--handover-owner")
    parser.add_argument("--successor")
    parser.add_argument("--effective-date")
    parser.add_argument("--language", default="vi", choices=["vi", "en"])
    parser.add_argument("--include-credentials", action="store_true")
    parser.add_argument(
        "--credential-item",
        action="append",
        default=[],
        help="Freeform text or JSON string to include only when the user explicitly provided the secret.",
    )
    return parser.parse_args()


def resolve_workspace(workspace_path: str | None) -> tuple[Path, str]:
    if workspace_path:
        resolved = Path(workspace_path).expanduser().resolve()
        if not resolved.exists():
            raise FileNotFoundError(f"Workspace path does not exist: {resolved}")
        return resolved, "arg:workspace_path"
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            check=True,
            capture_output=True,
            text=True,
        )
        git_root = result.stdout.strip()
        if git_root:
            return Path(git_root).resolve(), "derived:git_root"
    except Exception:
        pass
    return Path.cwd().resolve(), "derived:cwd"


def iter_candidate_files(workspace_root: Path) -> list[Path]:
    collected: list[Path] = []
    for root, dirs, files in os.walk(workspace_root):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        current_root = Path(root)
        for file_name in sorted(files):
            if file_name in IGNORE_SECRET_FILES:
                continue
            path = current_root / file_name
            suffix = path.suffix.lower()
            if file_name.startswith(".env.") and file_name not in {".env.example", ".env.sample", ".env.template"}:
                continue
            if suffix not in TEXT_EXTENSIONS and file_name.lower() not in TEXT_EXTENSIONS:
                if file_name.lower() not in {"readme", "license"}:
                    continue
            try:
                if path.stat().st_size > MAX_FILE_SIZE:
                    continue
            except OSError:
                continue
            collected.append(path)
    def priority(path: Path) -> tuple[int, str]:
        lowered = str(path.relative_to(workspace_root)).lower()
        bonus = sum(1 for hint in PRIORITY_FILES if hint in lowered)
        return (-bonus, lowered)
    collected.sort(key=priority)
    return collected[:MAX_SCAN_FILES]


def read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def file_relevance_score(relative_path: str) -> int:
    lowered = relative_path.lower()
    score = 1
    if ".agent/" in lowered or lowered.startswith(".agent"):
        score += 4
    if "agent" in lowered or "prompt" in lowered or "profile" in lowered:
        score += 3
    if "readme" in lowered:
        score += 2
    if lowered.endswith((".json", ".yaml", ".yml", ".toml")):
        score += 1
    return score


def scan_field_candidates(text: str, relative_path: str) -> dict[str, list[dict[str, Any]]]:
    candidates: dict[str, list[dict[str, Any]]] = defaultdict(list)
    relevance = file_relevance_score(relative_path)
    for field, patterns in FIELD_PATTERNS.items():
        for pattern in patterns:
            for match in re.finditer(pattern, text, flags=re.IGNORECASE):
                value = clean_value(match.group(1))
                if len(value) < 2 or len(value) > 120:
                    continue
                if value.lower() in {"assistant", "agent", "system", "user"}:
                    continue
                candidates[field].append(
                    {
                        "value": value,
                        "score": relevance,
                        "source": f"scan:{relative_path}",
                    }
                )
    return candidates


def normalize_inline_list_item(line: str) -> str:
    item = re.sub(r"^[-*+]\s*", "", line.strip())
    item = clean_value(item)
    return item


def extract_heading_items(text: str, headings: list[str]) -> list[str]:
    items: list[str] = []
    active = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        lowered = normalize_lookup(line)
        if not line:
            continue
        if line.startswith("#"):
            active = any(keyword in lowered for keyword in headings)
            continue
        if active and re.match(r"^[-*+]\s+", line):
            item = normalize_inline_list_item(line)
            if item:
                items.append(item)
        elif active and re.match(r"^\d+\.\s+", line):
            item = re.sub(r"^\d+\.\s*", "", line)
            item = clean_value(item)
            if item:
                items.append(item)
        elif active and line.startswith("##"):
            active = False
    return items[:MAX_SECTION_ITEMS]


def extract_keyword_lines(text: str, keywords: list[str]) -> list[str]:
    items: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or len(line) > 180:
            continue
        normalized = normalize_lookup(line)
        if any(keyword in normalized for keyword in keywords):
            if ":" in line:
                _, right = line.split(":", 1)
                candidate = clean_value(right)
            else:
                candidate = clean_value(line)
            if candidate:
                items.append(candidate)
    deduped: list[str] = []
    seen = set()
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        deduped.append(item)
        seen.add(key)
    return deduped[:MAX_SECTION_ITEMS]


def parse_explicit_credentials(raw_items: list[str]) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    for raw in raw_items:
        raw = raw.strip()
        if not raw:
            continue
        try:
            value = json.loads(raw)
            if isinstance(value, dict):
                parsed.append(
                    {
                        "value": value,
                        "status": "confirmed",
                        "sources": ["arg:credential_item"],
                    }
                )
                continue
        except json.JSONDecodeError:
            pass
        parsed.append(
            {
                "value": {"detail": raw},
                "status": "confirmed",
                "sources": ["arg:credential_item"],
            }
        )
    return parsed


def collect_workspace_evidence(workspace_root: Path) -> dict[str, Any]:
    files = iter_candidate_files(workspace_root)
    field_candidates: dict[str, list[dict[str, Any]]] = defaultdict(list)
    section_candidates: dict[str, list[dict[str, Any]]] = defaultdict(list)
    artifacts: list[dict[str, Any]] = []

    for path in files:
        relative_path = str(path.relative_to(workspace_root))
        text = read_text(path)
        for field, items in scan_field_candidates(text, relative_path).items():
            field_candidates[field].extend(items)

        for section, headings in SECTION_HEADINGS.items():
            items = extract_heading_items(text, headings)
            if not items:
                items = extract_keyword_lines(text, headings)
            if items:
                section_candidates[section].append(
                    {
                        "items": items,
                        "source": f"scan:{relative_path}",
                    }
                )

        if path.name.lower().startswith("readme") or ".agent" in relative_path or path.name in {
            "package.json",
            "pyproject.toml",
            "requirements.txt",
            "Dockerfile",
        }:
            artifacts.append(
                {
                    "path": relative_path,
                    "reason": "priority workspace artifact",
                    "status": "inferred",
                    "sources": [f"scan:{relative_path}"],
                }
            )

    systems: list[dict[str, Any]] = []
    for hint, label, reason in SYSTEM_HINTS:
        candidate = workspace_root / hint
        if candidate.exists():
            relative_path = str(candidate.relative_to(workspace_root))
            systems.append(
                {
                    "value": {
                        "name": label,
                        "access": "Reference owner and request path before granting access.",
                        "evidence": relative_path,
                    },
                    "status": "inferred",
                    "sources": [f"scan:{relative_path}"],
                    "notes": reason,
                }
            )

    return {
        "field_candidates": field_candidates,
        "section_candidates": section_candidates,
        "artifacts": artifacts[:12],
        "systems": systems[:12],
        "files_scanned": len(files),
    }


def choose_best_candidate(items: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not items:
        return None
    sorted_items = sorted(items, key=lambda item: (-item["score"], len(item["value"])))
    return sorted_items[0]


def translate_position(position: str) -> tuple[str | None, str]:
    cleaned = clean_value(position)
    if not cleaned:
        return None, "missing"
    if not looks_vietnamese(cleaned):
        return title_case_preserving_acronyms(cleaned), "confirmed"

    lookup = normalize_lookup(cleaned)
    if lookup in COMMON_POSITION_MAP:
        return COMMON_POSITION_MAP[lookup], "confirmed"

    for prefix, renderer in VN_TITLE_RULES:
        if lookup == prefix:
            return renderer(""), "confirmed"
        if lookup.startswith(prefix + " "):
            rest = lookup[len(prefix) :].strip()
            english = renderer(rest).strip()
            english = re.sub(r"\s+", " ", english)
            if english:
                return english, "inferred"

    translated = translate_vn_noun_phrase(lookup)
    if translated and translated != lookup.title():
        return translated, "inferred"
    return None, "ambiguous"


def derive_position_from_agent_hints(agent_name: str | None, agent_slug: str | None) -> list[dict[str, Any]]:
    derived: list[dict[str, Any]] = []
    if agent_name:
        derived.append(
            {
                "value": strip_agent_suffixes(agent_name),
                "score": 6,
                "source": "derived:agent_name",
            }
        )
    if agent_slug:
        words = [word.upper() if len(word) <= 3 else word.capitalize() for word in agent_slug.replace("_", "-").split("-") if word]
        if words:
            derived.append(
                {
                    "value": strip_agent_suffixes(" ".join(words)),
                    "score": 5,
                    "source": "derived:agent_slug",
                }
            )
    return derived


def build_list_field(candidates: list[dict[str, Any]], missing_message: str) -> dict[str, Any]:
    if not candidates:
        return to_field([], "missing", [], notes=missing_message)
    items: list[dict[str, Any]] = []
    seen = set()
    sources: list[str] = []
    for candidate in candidates:
        source = candidate["source"]
        for item in candidate["items"]:
            cleaned = clean_value(item)
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            items.append(
                {
                    "value": cleaned,
                    "status": "inferred",
                    "sources": [source],
                }
            )
            seen.add(key)
            if source not in sources:
                sources.append(source)
        if len(items) >= MAX_SECTION_ITEMS:
            break
    return to_field(items[:MAX_SECTION_ITEMS], "inferred", sources)


def render_inline_field(field: dict[str, Any]) -> str:
    value = field.get("value")
    if value:
        return str(value)
    return "Chưa xác nhận"


def render_status(field: dict[str, Any]) -> str:
    status = field.get("status", "missing")
    return {
        "confirmed": "Confirmed",
        "inferred": "Inferred",
        "missing": "Missing",
    }.get(status, status.title())


def render_field_table(rows: list[tuple[str, dict[str, Any]]]) -> str:
    lines = ["| Trường | Giá trị | Trạng thái | Nguồn |", "| --- | --- | --- | --- |"]
    for label, field in rows:
        lines.append(
            f"| {label} | {render_inline_field(field)} | {render_status(field)} | {', '.join(field.get('sources', [])) or 'n/a'} |"
        )
    return "\n".join(lines)


def render_list_block(field: dict[str, Any], empty_label: str) -> str:
    items = field.get("items", [])
    if not items:
        return f"- {empty_label}"
    lines = []
    for item in items:
        if isinstance(item, dict):
            value = item.get("value")
            if value is None and item.get("path"):
                reason = item.get("reason", "")
                value = item["path"] if not reason else f'{item["path"]}: {reason}'
            sources = item.get("sources", [])
            if isinstance(sources, str):
                source = sources or "n/a"
            else:
                source = ", ".join(sources) or "n/a"
            status = render_status(item)
            lines.append(f"- {value} [{status}; {source}]")
        else:
            lines.append(f"- {item}")
    return "\n".join(lines)


def render_systems_block(field: dict[str, Any]) -> str:
    items = field.get("items", [])
    if not items:
        return "- Chưa có danh sách hệ thống hoặc quyền truy cập đã xác nhận."
    lines = []
    for item in items:
        value = item.get("value", {})
        name = value.get("name", "Unknown system")
        access = value.get("access")
        evidence = value.get("evidence")
        extra_fields = {key: val for key, val in value.items() if key not in {"name", "access", "evidence"}}
        source = ", ".join(item.get("sources", [])) or "n/a"
        note = item.get("notes", "")
        details: list[str] = []
        if access:
            details.append(access)
        if extra_fields:
            details.append(", ".join(f"{key}={val}" for key, val in extra_fields.items()))
        detail_text = "; ".join(details) if details else "Chưa có hướng dẫn truy cập."
        meta_parts = [f"source: {source}"]
        if evidence:
            meta_parts.insert(0, f"evidence: {evidence}")
        line = f"- {name}: {detail_text} ({'; '.join(meta_parts)})"
        if note:
            line += f" - {note}"
        lines.append(line)
    return "\n".join(lines)


def build_handover_payload(args: argparse.Namespace, workspace_root: Path, workspace_source: str, evidence: dict[str, Any]) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    field_candidates = evidence["field_candidates"]
    derived_candidates = derive_position_from_agent_hints(args.agent_name, args.agent_slug)
    for candidate in derived_candidates:
        field_candidates["position"].append(candidate)

    if args.position:
        field_candidates["position"].insert(
            0,
            {"value": args.position, "score": 100, "source": "arg:position"},
        )

    top_position = choose_best_candidate(field_candidates["position"])
    if not top_position:
        summary = {
            "status": "needs_user_input",
            "workspace_root": str(workspace_root),
            "files_scanned": evidence["files_scanned"],
            "follow_up_question": "Vui lòng xác nhận chức danh hoặc vị trí cần bàn giao để mình tạo đúng bộ handover.",
        }
        return None, summary

    english_position, translation_status = translate_position(top_position["value"])
    if not english_position:
        summary = {
            "status": "needs_user_input",
            "workspace_root": str(workspace_root),
            "detected_position": top_position["value"],
            "detected_from": top_position["source"],
            "files_scanned": evidence["files_scanned"],
            "follow_up_question": f'Mình đang thấy vị trí "{top_position["value"]}" nhưng chưa dịch chắc chắn sang tiếng Anh để đặt tên folder. Vui lòng xác nhận job title tiếng Anh mong muốn.',
        }
        return None, summary

    base_folder_name = f"handover-{slugify(english_position)}"
    handover_dir = workspace_root / base_folder_name
    if handover_dir.exists():
        handover_dir = workspace_root / f"{base_folder_name}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    def explicit_or_scanned(value: str | None, field_name: str, arg_source: str) -> dict[str, Any]:
        if value:
            return to_field(value, "confirmed", [arg_source])
        candidate = choose_best_candidate(field_candidates[field_name])
        if candidate:
            return to_field(candidate["value"], "inferred", [candidate["source"]])
        return to_field("", "missing", [], notes=f"Thiếu thông tin {field_name}.")

    company_field = explicit_or_scanned(args.company, "company", "arg:company")
    department_field = explicit_or_scanned(args.department, "department", "arg:department")
    reports_to_field = explicit_or_scanned(args.reports_to, "reports_to", "arg:reports_to")
    position_field = to_field(top_position["value"], "confirmed" if top_position["source"] == "arg:position" else "inferred", [top_position["source"]])
    english_position_field = to_field(english_position, translation_status, [top_position["source"]])

    responsibilities_field = build_list_field(
        evidence["section_candidates"]["responsibilities"],
        "Bổ sung phạm vi trách nhiệm chính cho vị trí này.",
    )
    kpis_field = build_list_field(
        evidence["section_candidates"]["kpis"],
        "Bổ sung KPI, OKR, hoặc chỉ số vận hành đang dùng.",
    )
    rhythm_field = build_list_field(
        evidence["section_candidates"]["operating_rhythm"],
        "Bổ sung lịch vận hành ngày, tuần, tháng của vị trí.",
    )
    workflows_field = build_list_field(
        evidence["section_candidates"]["workflows"],
        "Bổ sung SOP, workflow, checklist, hoặc runbook liên quan.",
    )
    stakeholders_field = build_list_field(
        evidence["section_candidates"]["stakeholders"],
        "Bổ sung stakeholder chính, đầu mối phối hợp, và kênh liên lạc.",
    )

    include_credentials = args.include_credentials or bool(args.credential_item)
    systems_items = evidence["systems"][:]
    if include_credentials and args.credential_item:
        systems_items.extend(parse_explicit_credentials(args.credential_item))
    elif include_credentials:
        systems_items.append(
            {
                "value": {
                    "name": "Inline credentials",
                    "access": "Được phép điền tay khi user đã cung cấp trực tiếp.",
                    "evidence": "arg:include_credentials",
                },
                "status": "missing",
                "sources": ["arg:include_credentials"],
                "notes": "Không có credential cụ thể được truyền vào lần chạy này.",
            }
        )
    if args.credential_item and not args.include_credentials:
        include_sources = ["arg:credential_item"]
    elif args.include_credentials:
        include_sources = ["arg:include_credentials"]
    else:
        include_sources = ["derived:defaults"]
    systems_field = to_field(
        systems_items,
        "inferred" if systems_items else "missing",
        [item["sources"][0] for item in systems_items] if systems_items else include_sources,
    )

    artifacts_field = to_field(evidence["artifacts"], "inferred" if evidence["artifacts"] else "missing", ["scan:workspace"])

    knowledge_gap_items = []
    if not responsibilities_field["items"]:
        knowledge_gap_items.append({"value": "Thiếu danh sách trách nhiệm chính.", "status": "missing", "sources": []})
    if not kpis_field["items"]:
        knowledge_gap_items.append({"value": "Thiếu KPI hoặc cách đo kết quả công việc.", "status": "missing", "sources": []})
    if not rhythm_field["items"]:
        knowledge_gap_items.append({"value": "Thiếu lịch vận hành định kỳ ngày/tuần/tháng.", "status": "missing", "sources": []})
    if not workflows_field["items"]:
        knowledge_gap_items.append({"value": "Thiếu SOP hoặc workflow bàn giao.", "status": "missing", "sources": []})
    if not stakeholders_field["items"]:
        knowledge_gap_items.append({"value": "Thiếu stakeholder và quy tắc phối hợp.", "status": "missing", "sources": []})

    open_items_field = to_field(
        [
            {"value": "Xác nhận KPI/KRA cuối cùng với quản lý trực tiếp.", "status": "missing", "sources": []},
            {"value": "Rà soát quyền truy cập và owner cho từng hệ thống trước khi bàn giao.", "status": "missing", "sources": []},
        ],
        "missing",
        [],
    )
    risks_field = to_field(
        [
            {
                "value": "Bàn giao thiếu ngữ cảnh vận hành nếu không có SOP hiện hành.",
                "status": "inferred",
                "sources": workflows_field.get("sources", []) or ["derived:default_risks"],
            },
            {
                "value": "Rủi ro mất quyền truy cập nếu không xác nhận owner hệ thống và tài khoản dùng chung.",
                "status": "inferred",
                "sources": systems_field.get("sources", []) or ["derived:default_risks"],
            },
        ],
        "inferred",
        ["derived:default_risks"],
    )
    knowledge_gaps_field = to_field(knowledge_gap_items, "missing" if knowledge_gap_items else "inferred", [])

    payload = {
        "meta": {
            "created_at": to_field(datetime.now().isoformat(timespec="seconds"), "confirmed", ["system:clock"]),
            "workspace_root": to_field(str(workspace_root), "confirmed", [workspace_source]),
            "handover_directory": to_field(str(handover_dir), "confirmed", ["derived:handover_dir"]),
            "language": to_field(args.language, "confirmed", ["arg:language"]),
            "include_credentials": to_field(include_credentials, "confirmed", ["arg:include_credentials" if args.include_credentials else "derived:defaults"]),
            "files_scanned": to_field(evidence["files_scanned"], "confirmed", ["scan:workspace"]),
        },
        "role_context": {
            "position": position_field,
            "position_english": english_position_field,
            "agent_name": to_field(args.agent_name or "", "confirmed" if args.agent_name else "missing", ["arg:agent_name"] if args.agent_name else []),
            "agent_slug": to_field(args.agent_slug or "", "confirmed" if args.agent_slug else "missing", ["arg:agent_slug"] if args.agent_slug else []),
            "company": company_field,
            "department": department_field,
            "reports_to": reports_to_field,
            "handover_owner": to_field(args.handover_owner or "", "confirmed" if args.handover_owner else "missing", ["arg:handover_owner"] if args.handover_owner else []),
            "successor": to_field(args.successor or "", "confirmed" if args.successor else "missing", ["arg:successor"] if args.successor else []),
            "effective_date": to_field(args.effective_date or "", "confirmed" if args.effective_date else "missing", ["arg:effective_date"] if args.effective_date else []),
        },
        "responsibilities": responsibilities_field,
        "kpis": kpis_field,
        "operating_rhythm": rhythm_field,
        "workflows": workflows_field,
        "systems_access": systems_field,
        "stakeholders": stakeholders_field,
        "artifacts": artifacts_field,
        "open_items": open_items_field,
        "risks": risks_field,
        "knowledge_gaps": knowledge_gaps_field,
    }

    summary = {
        "status": "created",
        "workspace_root": str(workspace_root),
        "handover_directory": str(handover_dir),
        "position": top_position["value"],
        "position_english": english_position,
        "position_source": top_position["source"],
    }
    return payload, summary


def write_handover_files(payload: dict[str, Any]) -> list[str]:
    handover_dir = Path(payload["meta"]["handover_directory"]["value"])
    handover_dir.mkdir(parents=True, exist_ok=False)

    json_path = handover_dir / "handover.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    role_context = payload["role_context"]
    summary_table = render_field_table(
        [
            ("Position", role_context["position"]),
            ("English Title", role_context["position_english"]),
            ("Company", role_context["company"]),
            ("Department", role_context["department"]),
            ("Reports To", role_context["reports_to"]),
            ("Handover Owner", role_context["handover_owner"]),
            ("Successor", role_context["successor"]),
            ("Effective Date", role_context["effective_date"]),
        ]
    )

    template_vars = {
        "position_display": render_inline_field(role_context["position"]),
        "position_english": render_inline_field(role_context["position_english"]),
        "company_display": render_inline_field(role_context["company"]),
        "department_display": render_inline_field(role_context["department"]),
        "reports_to_display": render_inline_field(role_context["reports_to"]),
        "handover_owner_display": render_inline_field(role_context["handover_owner"]),
        "successor_display": render_inline_field(role_context["successor"]),
        "effective_date_display": render_inline_field(role_context["effective_date"]),
        "workspace_root": payload["meta"]["workspace_root"]["value"],
        "handover_dir": payload["meta"]["handover_directory"]["value"],
        "language": payload["meta"]["language"]["value"],
        "summary_table": summary_table,
        "responsibilities_block": render_list_block(payload["responsibilities"], "Chưa có trách nhiệm đã xác nhận."),
        "kpis_block": render_list_block(payload["kpis"], "Chưa có KPI hoặc chỉ số đã xác nhận."),
        "rhythm_block": render_list_block(payload["operating_rhythm"], "Chưa có lịch vận hành đã xác nhận."),
        "workflows_block": render_list_block(payload["workflows"], "Chưa có workflow hoặc SOP đã xác nhận."),
        "systems_block": render_systems_block(payload["systems_access"]),
        "stakeholders_block": render_list_block(payload["stakeholders"], "Chưa có stakeholder hoặc quy tắc phối hợp đã xác nhận."),
        "artifacts_block": render_list_block(payload["artifacts"], "Chưa có artifact ưu tiên nào được suy ra."),
        "open_items_block": render_list_block(payload["open_items"], "Chưa có open item."),
        "risks_block": render_list_block(payload["risks"], "Chưa có rủi ro nào được ghi nhận."),
        "knowledge_gaps_block": render_list_block(payload["knowledge_gaps"], "Không còn khoảng trống thông tin trọng yếu."),
        "created_at": payload["meta"]["created_at"]["value"],
    }

    created_files = [str(json_path)]
    for name in sorted(TEMPLATE_DIR.glob("*.md.tmpl")):
        output_name = name.name.replace(".tmpl", "")
        rendered = Template(name.read_text(encoding="utf-8")).safe_substitute(template_vars)
        output_path = handover_dir / output_name
        output_path.write_text(rendered.rstrip() + "\n", encoding="utf-8")
        created_files.append(str(output_path))

    return created_files


def emit_summary(summary: dict[str, Any], exit_code: int) -> int:
    sys.stdout.write(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    return exit_code


def main() -> int:
    args = parse_args()
    try:
        workspace_root, workspace_source = resolve_workspace(args.workspace_path)
    except FileNotFoundError as exc:
        return emit_summary(
            {
                "status": "needs_user_input",
                "follow_up_question": str(exc),
            },
            2,
        )
    evidence = collect_workspace_evidence(workspace_root)
    payload, summary = build_handover_payload(args, workspace_root, workspace_source, evidence)
    if payload is None:
        return emit_summary(summary, 2)
    created_files = write_handover_files(payload)
    summary["created_files"] = created_files
    return emit_summary(summary, 0)


if __name__ == "__main__":
    raise SystemExit(main())
