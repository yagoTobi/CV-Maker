"""DOCX text extraction.

Walks a python-docx `Document` and produces a markdown-ish string that gives
Claude enough structural cues to correctly identify bullets, section
boundaries, and entry titles. The actual `Document(...)` instantiation
happens in the package `__init__.py` so that test patches against
`services.cv_extractor.Document` continue to work.
"""

from __future__ import annotations


def extract_docx_text(doc) -> str:
    """Extract text from DOCX preserving structure as markdown-like format.

    Detects headings, list items (via style name, XML numPr, or left indent),
    bold-only paragraphs (treated as section headers), and tables. The output
    is a markdown-ish string that gives Claude enough structural cues to
    correctly identify bullets, section boundaries, and entry titles.
    """
    WML_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    parts: list[str] = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style_name = para.style.name if para.style else ""

        # ── Heading styles ────────────────────────────────────────────
        if "Heading" in style_name:
            level = 1
            for char in style_name:
                if char.isdigit():
                    level = int(char)
                    break
            parts.append(f"\n{'#' * min(level + 1, 4)} {text}\n")
            continue

        # ── List detection ────────────────────────────────────────────
        is_list = False
        indent_level = 0

        # Method 1: style name contains list-related keywords
        list_keywords = ["list", "bullet", "numbered"]
        if any(kw in style_name.lower() for kw in list_keywords):
            is_list = True

        # Method 2: XML numPr (numbering properties) — catches custom
        # styled lists that don't use a "List …" style name.
        pPr = para._p.pPr
        if pPr is not None:
            numPr = pPr.find(f".//{WML_NS}numPr")
            if numPr is not None:
                is_list = True
                ilvl = numPr.find(f"{WML_NS}ilvl")
                if ilvl is not None:
                    val = ilvl.get(f"{WML_NS}val")
                    if val is not None:
                        indent_level = int(val)

        # Method 3: left indent on non-list-styled but indented paragraphs
        if not is_list and para.paragraph_format.left_indent:
            emu_per_indent = 457200  # 0.5 inch in EMUs
            indent_level = max(
                0, int(para.paragraph_format.left_indent / emu_per_indent)
            )
            if indent_level > 0:
                is_list = True

        if is_list:
            prefix = "  " * indent_level + "- "
            parts.append(f"{prefix}{text}")
            continue

        # ── Bold-only paragraphs → likely section header / entry title ─
        runs = para.runs
        if runs and all(r.bold for r in runs if r.text.strip()):
            parts.append(f"**{text}**")
            continue

        # ── Regular paragraph ─────────────────────────────────────────
        parts.append(text)

    # ── Tables ────────────────────────────────────────────────────────
    for table in doc.tables:
        parts.append("")  # blank line before table
        for row in table.rows:
            cells = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
            if cells:
                parts.append(cells)

    return "\n".join(parts)


__all__ = ["extract_docx_text"]
