from fastapi import APIRouter, HTTPException
from jinja2 import Environment, FileSystemLoader
import os
import re

from routes.cv_versions import CVFormData

router = APIRouter()

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


def latex_escape(value: str) -> str:
    """Escape special LaTeX characters in a single pass (no double-escaping risk)."""
    if not isinstance(value, str):
        value = str(value)
    return _LATEX_ESCAPE_RE.sub(lambda m: _LATEX_ESCAPE_MAP[m.group(0)], value)


_jinja_env.filters["latex_escape"] = latex_escape

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
        raise HTTPException(status_code=500, detail=f"Failed to load template: {e}")

    context = {
        "personal": form_data.personalInfo,
        "work": form_data.workExperience,
        "education": form_data.education,
        "skills": form_data.skills,
        "projects": form_data.projects or [],
        "awards": form_data.awards or [],
    }

    try:
        tex_content = template.render(**context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template rendering failed: {e}")

    return {"tex_content": tex_content}
