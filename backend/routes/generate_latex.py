from fastapi import APIRouter, HTTPException
from jinja2 import Environment, FileSystemLoader
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


_jinja_env.filters["latex_escape"] = latex_escape
_jinja_env.filters["latex_url_escape"] = latex_url_escape

_DEFAULT_PERSONAL_ORDER = ["phone", "email", "location", "links"]


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

    personal_order = form_data.personalInfo.personalOrder or _DEFAULT_PERSONAL_ORDER
    context = {
        "personal": form_data.personalInfo,
        "personal_items": _build_personal_items(form_data.personalInfo, personal_order),
        "work": form_data.workExperience,
        "education": form_data.education,
        "skills": form_data.skills,
        "projects": form_data.projects or [],
        "awards": form_data.awards or [],
        "additional_sections": form_data.additionalSections or [],
        "section_order": form_data.sectionOrder or ["work", "education", "skills", "projects", "awards"],
    }

    try:
        tex_content = template.render(**context)
    except Exception as e:
        logger.exception("Template rendering failed for: %s", form_data.templateId)
        raise HTTPException(status_code=500, detail="An internal error occurred")

    return {"tex_content": tex_content}
