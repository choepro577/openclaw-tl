#!/usr/bin/env python3
"""
Inventory accounting source files and infer likely accounting workstreams.

Supported inputs:
- .xlsx
- .csv
- .tsv
- .docx
- .pdf (text extraction is best-effort)

The script avoids non-standard dependencies so it can run in constrained
environments. It provides a quick intake summary before deeper accounting work.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET

SUPPORTED_EXTENSIONS = {".xlsx", ".csv", ".tsv", ".docx", ".pdf"}

OFFICE_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
    "word": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}

FIELD_PATTERNS = {
    "posting_date": ["ngay hach toan", "posting date", "document date", "ngay ct", "date"],
    "document_no": ["so chung tu", "voucher no", "document no", "ref no", "reference no"],
    "description": ["dien giai", "description", "narration", "text", "memo"],
    "gl_account": ["tai khoan", "account", "g/l account", "gl account", "tk"],
    "debit": ["phat sinh no", "debit", "debit amount"],
    "credit": ["phat sinh co", "credit", "credit amount"],
    "amount": ["so tien", "amount", "value", "net amount", "gross amount"],
    "tax_code": ["ma thue", "tax code", "vat code", "vat rate", "thue suat"],
    "branch": ["chi nhanh", "store", "outlet", "branch", "restaurant", "shop"],
    "warehouse": ["kho", "warehouse", "location", "storage location"],
    "item_code": ["ma hang", "item code", "material", "sku", "product code"],
    "quantity": ["so luong", "quantity", "qty"],
    "unit_cost": ["gia von", "unit cost", "gia nhap", "gia xuat"],
    "vendor": ["nha cung cap", "vendor", "supplier"],
    "customer": ["khach hang", "customer"],
}

DOCUMENT_PATTERNS = {
    "general-ledger-detail": [
        "so cai",
        "general ledger",
        "ledger detail",
        "nhat ky chung",
        "journal",
        "gl account",
        "tai khoan",
    ],
    "trial-balance": [
        "can doi so phat sinh",
        "trial balance",
        "opening balance",
        "closing balance",
        "balance by account",
    ],
    "sales-report": [
        "doanh thu",
        "sales",
        "revenue",
        "pos",
        "bill",
        "order",
        "delivery",
        "grabfood",
        "shopeefood",
        "beamin",
    ],
    "inventory-movement": [
        "ton kho",
        "inventory",
        "warehouse",
        "xuat kho",
        "nhap kho",
        "item code",
        "sku",
        "bom",
        "recipe",
    ],
    "bank-statement": [
        "so phu",
        "bank statement",
        "merchant settlement",
        "bank",
        "transaction detail",
    ],
    "accounts-payable": [
        "cong no phai tra",
        "ap aging",
        "vendor aging",
        "supplier",
        "payable",
    ],
    "accounts-receivable": [
        "cong no phai thu",
        "ar aging",
        "customer aging",
        "receivable",
        "platform receivable",
    ],
    "payroll": [
        "bang luong",
        "payroll",
        "salary",
        "timesheet",
        "service charge",
        "tip",
        "tncn",
    ],
    "tax-support": [
        "gtgt",
        "vat",
        "tax return",
        "hoa don",
        "invoice list",
        "thue",
        "cit",
    ],
    "contract-or-policy": [
        "hop dong",
        "contract",
        "agreement",
        "policy",
        "quy che",
        "appendix",
        "phu luc",
    ],
}


@dataclass
class FileReport:
    path: str
    file_type: str
    size_bytes: int
    probable_document: str
    relevant_fields: list[str]
    notes: list[str]
    preview: list[str]
    sheets: list[str] | None = None


def fold_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text or "")
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = without_marks.lower()
    alnum_only = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", alnum_only).strip()


def normalize_for_match(text: str) -> str:
    return f" {fold_text(text)} "


def discover_files(paths: Iterable[str]) -> list[Path]:
    found: list[Path] = []
    seen: set[Path] = set()
    for raw_path in paths:
        path = Path(raw_path).expanduser().resolve()
        if not path.exists():
            print(f"[WARN] Path not found: {path}", file=sys.stderr)
            continue
        candidates = (
            [item for item in path.rglob("*") if item.is_file()]
            if path.is_dir()
            else [path]
        )
        for item in candidates:
            if item.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            if item not in seen:
                found.append(item)
                seen.add(item)
    return sorted(found)


def column_letters_to_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha()).upper()
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch) - ord("A") + 1)
    return max(index - 1, 0)


def trim_row(values: list[str]) -> list[str]:
    trimmed = list(values)
    while trimmed and not trimmed[-1]:
        trimmed.pop()
    return trimmed


def shared_strings_from_xlsx(workbook: zipfile.ZipFile) -> list[str]:
    shared_strings: list[str] = []
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return shared_strings

    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    for item in root.findall("main:si", OFFICE_NS):
        text_parts = []
        for text_node in item.findall(".//main:t", OFFICE_NS):
            text_parts.append(text_node.text or "")
        shared_strings.append("".join(text_parts).strip())
    return shared_strings


def workbook_sheets_from_xlsx(workbook: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook_xml = ET.fromstring(workbook.read("xl/workbook.xml"))
    rels_xml = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))

    rel_map: dict[str, str] = {}
    for rel in rels_xml.findall("pkg:Relationship", OFFICE_NS):
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rel_id and target:
            rel_map[rel_id] = target.lstrip("/")

    sheets: list[tuple[str, str]] = []
    for sheet in workbook_xml.findall("main:sheets/main:sheet", OFFICE_NS):
        name = sheet.attrib.get("name", "Sheet")
        rel_id = sheet.attrib.get(f"{{{OFFICE_NS['rel']}}}id")
        if rel_id and rel_id in rel_map:
            target = rel_map[rel_id]
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            sheets.append((name, target))
    return sheets


def cell_value_from_xlsx(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", OFFICE_NS)
    inline_node = cell.find("main:is", OFFICE_NS)

    if cell_type == "inlineStr" and inline_node is not None:
        parts = [node.text or "" for node in inline_node.findall(".//main:t", OFFICE_NS)]
        return "".join(parts).strip()
    if value_node is None:
        return ""

    value = (value_node.text or "").strip()
    if not value:
        return ""
    if cell_type == "s":
        try:
            return shared_strings[int(value)]
        except (ValueError, IndexError):
            return value
    if cell_type == "b":
        return "TRUE" if value == "1" else "FALSE"
    return value


def preview_sheet_from_xlsx(
    workbook: zipfile.ZipFile,
    sheet_path: str,
    shared_strings: list[str],
    sample_rows: int,
) -> list[list[str]]:
    rows: list[list[str]] = []
    with workbook.open(sheet_path) as handle:
        for _event, elem in ET.iterparse(handle, events=("end",)):
            if not elem.tag.endswith("row"):
                continue
            cell_map: dict[int, str] = {}
            for cell in elem.findall("main:c", OFFICE_NS):
                ref = cell.attrib.get("r", "")
                value = cell_value_from_xlsx(cell, shared_strings)
                if not value:
                    continue
                cell_map[column_letters_to_index(ref)] = value
            if cell_map:
                width = max(cell_map) + 1
                row = [""] * width
                for index, value in cell_map.items():
                    row[index] = value
                rows.append(trim_row(row))
            elem.clear()
            if len(rows) >= sample_rows:
                break
    return rows


def read_xlsx(path: Path, sample_rows: int, max_sheets: int) -> tuple[list[str], list[str], list[str]]:
    notes: list[str] = []
    preview: list[str] = []
    all_headers: list[str] = []
    sheet_names: list[str] = []

    with zipfile.ZipFile(path) as workbook:
        shared_strings = shared_strings_from_xlsx(workbook)
        sheets = workbook_sheets_from_xlsx(workbook)
        sheet_names = [name for name, _target in sheets]
        if len(sheets) > max_sheets:
            notes.append(
                f"Preview limited to first {max_sheets} sheets out of {len(sheets)} total sheets."
            )

        for sheet_name, sheet_path in sheets[:max_sheets]:
            sample = preview_sheet_from_xlsx(workbook, sheet_path, shared_strings, sample_rows)
            if not sample:
                preview.append(f"[{sheet_name}] No non-empty rows found in first scanned rows.")
                continue
            headers = sample[0]
            if headers:
                all_headers.extend(headers)
            preview.append(f"[{sheet_name}] Sample rows:")
            for row in sample[:sample_rows]:
                preview.append(f"  - {' | '.join(cell or '-' for cell in row)}")

    if not sheet_names:
        notes.append("Workbook sheet names could not be read.")
    return sheet_names, all_headers, preview


def sniff_csv_dialect(path: Path) -> csv.Dialect:
    sample = path.read_text(encoding="utf-8-sig", errors="replace")[:4096]
    if not sample.strip():
        return csv.get_dialect("excel")
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        return csv.get_dialect("excel")


def read_csv_like(path: Path, sample_rows: int) -> tuple[list[str], list[str], list[str]]:
    dialect = sniff_csv_dialect(path)
    preview: list[str] = []
    headers: list[str] = []
    notes: list[str] = []

    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.reader(handle, dialect)
        rows = []
        for row in reader:
            cleaned = [cell.strip() for cell in row]
            if any(cleaned):
                rows.append(cleaned)
            if len(rows) >= sample_rows:
                break

    if rows:
        headers = rows[0]
        preview.append("Sample rows:")
        for row in rows[:sample_rows]:
            preview.append(f"  - {' | '.join(cell or '-' for cell in row)}")
    else:
        notes.append("No non-empty rows found.")
    return headers, notes, preview


def read_docx(path: Path, max_paragraphs: int) -> tuple[list[str], list[str]]:
    notes: list[str] = []
    preview: list[str] = []
    try:
        with zipfile.ZipFile(path) as archive:
            xml_bytes = archive.read("word/document.xml")
    except KeyError:
        return ["DOCX structure missing word/document.xml."], preview

    root = ET.fromstring(xml_bytes)
    paragraphs = []
    for para in root.findall(".//word:p", OFFICE_NS):
        text_parts = [node.text or "" for node in para.findall(".//word:t", OFFICE_NS)]
        text = "".join(text_parts).strip()
        if text:
            paragraphs.append(text)
        if len(paragraphs) >= max_paragraphs:
            break

    if paragraphs:
        preview.append("Paragraph preview:")
        for para in paragraphs:
            preview.append(f"  - {para}")
    else:
        notes.append("No text paragraphs extracted from DOCX.")
    return notes, preview


def try_read_pdf_with_pypdf(path: Path, max_pages: int) -> list[str] | None:
    reader_cls = None
    try:
        from pypdf import PdfReader  # type: ignore

        reader_cls = PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader  # type: ignore

            reader_cls = PdfReader
        except ImportError:
            return None

    reader = reader_cls(str(path))
    preview = ["PDF text preview:"]
    for page in reader.pages[:max_pages]:
        text = (page.extract_text() or "").strip()
        if text:
            preview.append(f"  - {collapse_text(text, 220)}")
    return preview if len(preview) > 1 else None


def try_read_pdf_with_pdftotext(path: Path, max_pages: int) -> list[str] | None:
    try:
        completed = subprocess.run(
            [
                "pdftotext",
                "-f",
                "1",
                "-l",
                str(max_pages),
                "-nopgbrk",
                str(path),
                "-",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None

    text = collapse_text(completed.stdout, 400)
    if not text:
        return None
    return ["PDF text preview:", f"  - {text}"]


def read_pdf(path: Path, max_pages: int) -> tuple[list[str], list[str]]:
    preview = try_read_pdf_with_pypdf(path, max_pages)
    if preview:
        return [], preview

    preview = try_read_pdf_with_pdftotext(path, max_pages)
    if preview:
        return [], preview

    return [
        "PDF text extraction unavailable. Install `pypdf`, `PyPDF2`, or `pdftotext` for deeper preview."
    ], []


def collapse_text(text: str, max_chars: int) -> str:
    collapsed = re.sub(r"\s+", " ", text or "").strip()
    if len(collapsed) <= max_chars:
        return collapsed
    return collapsed[: max_chars - 3].rstrip() + "..."


def infer_relevant_fields(headers: Iterable[str]) -> list[str]:
    header_text = normalize_for_match(" ".join(headers))
    relevant = []
    for field_name, patterns in FIELD_PATTERNS.items():
        if any(f" {fold_text(pattern)} " in header_text for pattern in patterns):
            relevant.append(field_name)
    return relevant


def classify_document(path: Path, headers: Iterable[str], preview: Iterable[str]) -> str:
    combined = " ".join([path.name, *headers, *preview])
    normalized = normalize_for_match(combined)
    best_match = "unknown"
    best_score = 0
    for document_type, patterns in DOCUMENT_PATTERNS.items():
        score = 0
        for pattern in patterns:
            if f" {fold_text(pattern)} " in normalized:
                score += 1
        if document_type == "contract-or-policy" and path.suffix.lower() in {".docx", ".pdf"}:
            score += 1
        if score > best_score:
            best_match = document_type
            best_score = score
    return best_match


def summarize_file(path: Path, sample_rows: int, max_sheets: int, max_pages: int) -> FileReport:
    file_type = path.suffix.lower().lstrip(".")
    notes: list[str] = []
    preview: list[str] = []
    headers: list[str] = []
    sheets: list[str] | None = None

    if file_type == "xlsx":
        try:
            sheets, headers, preview = read_xlsx(path, sample_rows, max_sheets)
        except zipfile.BadZipFile:
            notes.append("Workbook could not be opened as a valid XLSX file.")
    elif file_type in {"csv", "tsv"}:
        headers, notes, preview = read_csv_like(path, sample_rows)
    elif file_type == "docx":
        notes, preview = read_docx(path, sample_rows)
    elif file_type == "pdf":
        notes, preview = read_pdf(path, max_pages)

    probable_document = classify_document(path, headers, preview)
    relevant_fields = infer_relevant_fields(headers)

    if not relevant_fields and file_type in {"xlsx", "csv", "tsv"}:
        notes.append("No canonical accounting headers inferred from sampled rows.")

    return FileReport(
        path=str(path),
        file_type=file_type,
        size_bytes=path.stat().st_size,
        probable_document=probable_document,
        relevant_fields=relevant_fields,
        notes=notes,
        preview=preview,
        sheets=sheets,
    )


def render_markdown(reports: list[FileReport]) -> str:
    lines = [
        "# Accounting Source Intake",
        "",
        f"- Generated at: {datetime.now().isoformat(timespec='seconds')}",
        f"- Files analyzed: {len(reports)}",
        "",
    ]
    for report in reports:
        lines.append(f"## {report.path}")
        lines.append(f"- Type: `{report.file_type}`")
        lines.append(f"- Size: `{report.size_bytes}` bytes")
        lines.append(f"- Probable document: `{report.probable_document}`")
        lines.append(
            "- Relevant fields: "
            + (", ".join(f"`{field}`" for field in report.relevant_fields) if report.relevant_fields else "`none inferred`")
        )
        if report.sheets:
            lines.append("- Sheets: " + ", ".join(f"`{name}`" for name in report.sheets))
        if report.notes:
            lines.append("- Notes:")
            for note in report.notes:
                lines.append(f"  - {note}")
        if report.preview:
            lines.append("- Preview:")
            for entry in report.preview:
                lines.append(f"  - {entry}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_json(reports: list[FileReport]) -> str:
    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "files": [report.__dict__ for report in reports],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize accounting source files.")
    parser.add_argument("paths", nargs="+", help="Files or directories to analyze")
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output format",
    )
    parser.add_argument(
        "--sample-rows",
        type=int,
        default=5,
        help="Sample row or paragraph count per source",
    )
    parser.add_argument(
        "--max-sheets",
        type=int,
        default=3,
        help="Maximum workbook sheets to preview",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=2,
        help="Maximum PDF pages to preview when extraction is available",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    files = discover_files(args.paths)
    if not files:
        print("No supported files found.", file=sys.stderr)
        return 1

    reports = [
        summarize_file(
            path=file_path,
            sample_rows=args.sample_rows,
            max_sheets=args.max_sheets,
            max_pages=args.max_pages,
        )
        for file_path in files
    ]

    output = render_markdown(reports) if args.format == "markdown" else render_json(reports)
    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
