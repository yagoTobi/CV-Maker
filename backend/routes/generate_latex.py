from fastapi import APIRouter, HTTPException
from jinja2 import Environment, FileSystemLoader
import html.parser
import logging
import os
import re

from routes.cv_versions import CVFormData

router = APIRouter()
logger = logging.getLogger(__name__)

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "latex_templates")

# Build Jinja2 environment with custom delimiters to avoid LaTeX brace conflicts
_jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    variable_start_string="((",
    variable_end_string="))",
    block_start_string="(%",
    block_end_string="%)",
    comment_start_string="(#",
    comment_end_string="#)",
    keep_trailing_newline=True,
)

# Single-pass regex escape — avoids the sequential-replacement bug where
# { and } added by \textbackslash{} would themselves get escaped in a later pass.
_LATEX_ESCAPE_MAP = {
    "\\": r"\textbackslash{}",
    "&":  r"\&",
    "%":  r"\%",
    "$":  r"\$",
    "#":  r"\#",
    "_":  r"\_",
    "{":  r"\{",
    "}":  r"\}",
    "~":  r"\textasciitilde{}",
    "^":  r"\^{}",
}
_LATEX_ESCAPE_RE = re.compile(
    "(" + "|".join(re.escape(k) for k in _LATEX_ESCAPE_MAP) + ")"
)


# Unicode characters that should be normalized before LaTeX escaping
_UNICODE_NORMALIZE = {
    "\u223C": "~",   # ∼ tilde operator → ASCII tilde
    "\u2019": "'",   # ' right single quote
    "\u2018": "'",   # ' left single quote
    "\u201C": "``",  # " left double quote → LaTeX opening quote
    "\u201D": "''",  # " right double quote → LaTeX closing quote
    "\u2013": "--",  # – en dash
    "\u2014": "---", # — em dash
    "\u2026": "...", # … ellipsis
    "\u00A0": " ",   # non-breaking space
}
_UNICODE_NORMALIZE_RE = re.compile(
    "(" + "|".join(re.escape(k) for k in _UNICODE_NORMALIZE) + ")"
)


def latex_escape(value: str) -> str:
    """Escape special LaTeX characters in a single pass (no double-escaping risk)."""
    if not isinstance(value, str):
        value = str(value)
    # Normalize problematic Unicode to ASCII/LaTeX equivalents first
    value = _UNICODE_NORMALIZE_RE.sub(lambda m: _UNICODE_NORMALIZE[m.group(0)], value)
    return _LATEX_ESCAPE_RE.sub(lambda m: _LATEX_ESCAPE_MAP[m.group(0)], value)


def latex_url_escape(value: str) -> str:
    """Escape special characters in URLs for LaTeX \href{}.

    This is lighter than latex_escape because hyperref handles most characters.
    We only need to escape % (starts a comment) and # (parameter character).
    """
    if not isinstance(value, str):
        value = str(value)
    # Only escape % and # for URLs
    value = value.replace("%", r"\%")
    value = value.replace("#", r"\#")
    return value


def html_latex(value: str) -> str:
    """Convert HTML-formatted text to LaTeX with proper escaping.

    Handles <strong>, <em>, <a href="..."> tags and HTML entities.
    With convert_charrefs=True, entities like &amp; are decoded before
    latex_escape is applied, so round-trips from innerHTML are safe.
    Falls back to plain latex_escape for strings with no HTML/entities.
    """
    if not isinstance(value, str):
        value = str(value)
    if '<' not in value and '&' not in value:
        return latex_escape(value)

    class _Parser(html.parser.HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.parts = []
            self.tag_stack = []

        def handle_starttag(self, tag, attrs):
            attrs_dict = dict(attrs)
            if tag in ('strong', 'b'):
                self.parts.append(r'\textbf{')
                self.tag_stack.append(tag)
            elif tag in ('em', 'i'):
                self.parts.append(r'\textit{')
                self.tag_stack.append(tag)
            elif tag == 'a' and 'href' in attrs_dict:
                escaped_url = latex_url_escape(attrs_dict['href'])
                self.parts.append(f'\\href{{{escaped_url}}}{{')
                self.tag_stack.append(tag)

        def handle_endtag(self, tag):
            if tag in ('strong', 'b', 'em', 'i', 'a'):
                if self.tag_stack and self.tag_stack[-1] == tag:
                    self.parts.append('}')
                    self.tag_stack.pop()

        def handle_data(self, data):
            self.parts.append(latex_escape(data))

        def get_result(self):
            return ''.join(self.parts)

    parser = _Parser()
    parser.feed(value)
    return parser.get_result()


_jinja_env.filters["latex_escape"] = latex_escape
_jinja_env.filters["latex_url_escape"] = latex_url_escape
_jinja_env.filters["html_latex"] = html_latex

_DEFAULT_PERSONAL_ORDER = ["phone", "email", "location", "links"]

# Default display labels for built-in sections — match the LaTeX template defaults.
_DEFAULT_SECTION_LABELS = {
    "work": "Experience",
    "education": "Education",
    "skills": "Skills",
    "projects": "Projects",
    "awards": "Awards",
}


def _build_personal_items(personal, order: list) -> list:
    """Build an ordered list of personal header items for template rendering.

    Each item is a dict with 'field', 'value', and 'url' (None for plain text).
    Links are expanded inline so the template just loops once.
    """
    items = []
    for field in order:
        if field == "phone" and personal.phone:
            items.append({"field": "phone", "value": personal.phone, "url": f"tel:{personal.phone}"})
        elif field == "email" and personal.email:
            items.append({"field": "email", "value": personal.email, "url": f"mailto:{personal.email}"})
        elif field == "location" and personal.location:
            items.append({"field": "location", "value": personal.location, "url": None})
        elif field == "links":
            for link in personal.links:
                url = link.get("url", "")
                label = link.get("label") or url
                if url:
                    items.append({"field": "link", "value": label, "url": url})
    return items


def _flatten_for_template(form_data: CVFormData) -> dict:
    """Flatten BulletItem/SkillItem back to strings for Jinja2 template consumption.

    Templates expect bullets as strings and skills as strings.
    This strips IDs and extracts .text values so templates need no changes.
    """
    d = form_data.model_dump(exclude_none=True)

    def _flatten_bullets(items):
        return [b["text"] if isinstance(b, dict) and "text" in b else str(b) for b in items]

    def _flatten_skills(items):
        return [s["text"] if isinstance(s, dict) and "text" in s else str(s) for s in items]

    for work in d.get("workExperience", []):
        work["bullets"] = _flatten_bullets(work.get("bullets", []))
        work.pop("id", None)
    for edu in d.get("education", []):
        edu["details"] = _flatten_bullets(edu.get("details", []))
        edu.pop("id", None)
    for skill in d.get("skills", []):
        skill["skills"] = _flatten_skills(skill.get("skills", []))
        skill.pop("id", None)
    for proj in d.get("projects", []) or []:
        proj["bullets"] = _flatten_bullets(proj.get("bullets", []) or [])
        proj.pop("id", None)
    for award in d.get("awards", []) or []:
        award.pop("id", None)
    for section in d.get("additionalSections", []) or []:
        section.pop("id", None)
        for entry in section.get("entries", []):
            entry["bullets"] = _flatten_bullets(entry.get("bullets", []))
            entry.pop("id", None)

    # Strip id from personal info links
    for link in d.get("personalInfo", {}).get("links", []):
        link.pop("id", None)

    return d


_TEMPLATE_FILE_MAP = {
    "med-length-proff-cv": "med-length-proff-cv.tex.j2",
    "deedy-resume": "deedy-resume.tex.j2",
    "mcdowell-cv": "mcdowell-cv.tex.j2",
}


@router.post("/generate-latex")
async def generate_latex(form_data: CVFormData):
    """Generate LaTeX source from structured CV form data."""
    template_file = _TEMPLATE_FILE_MAP.get(form_data.templateId)
    if not template_file:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown templateId: {form_data.templateId}. Valid values: {list(_TEMPLATE_FILE_MAP.keys())}",
        )

    try:
        template = _jinja_env.get_template(template_file)
    except Exception as e:
        logger.exception("Failed to load template: %s", form_data.templateId)
        raise HTTPException(status_code=500, detail="An internal error occurred")

    flat = _flatten_for_template(form_data)

    personal_order = form_data.personalInfo.personalOrder or _DEFAULT_PERSONAL_ORDER

    # Merge user overrides on top of defaults so omitted keys still have a value
    section_labels = {**_DEFAULT_SECTION_LABELS, **(form_data.sectionLabels or {})}

    context = {
        "personal": form_data.personalInfo,
        "personal_items": _build_personal_items(form_data.personalInfo, personal_order),
        "work": flat.get("workExperience", []),
        "education": flat.get("education", []),
        "skills": flat.get("skills", []),
        "projects": flat.get("projects", []),
        "awards": flat.get("awards", []),
        "additional_sections": flat.get("additionalSections", []),
        "section_order": form_data.sectionOrder or ["work", "education", "skills", "projects", "awards"],
        "section_labels": section_labels,
    }

    try:
        tex_content = template.render(**context)
    except Exception as e:
        logger.exception("Template rendering failed for: %s", form_data.templateId)
        raise HTTPException(status_code=500, detail="An internal error occurred")

    return {"tex_content": tex_content}
