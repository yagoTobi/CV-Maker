"""
Centralized template configuration.
Single source of truth for all template metadata.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TemplateConfig:
    id: str
    name: str
    description: str
    folder: str
    tex_file: str
    cls_file: str
    preview_file: str
    engine: str = "pdflatex"
    extra_files: list[str] = field(default_factory=list)
    extra_dirs: list[str] = field(default_factory=list)


TEMPLATES: dict[str, TemplateConfig] = {
    "med-length-proff-cv": TemplateConfig(
        id="med-length-proff-cv",
        name="Professional CV",
        description="Clean, traditional layout ideal for corporate roles and experienced professionals.",
        folder="med-length-proff-cv",
        tex_file="CV - English.tex",
        cls_file="resume.cls",
        preview_file="med-length-preview.png",
        engine="pdflatex",
    ),
    "deedy-resume": TemplateConfig(
        id="deedy-resume",
        name="Deedy Resume",
        description="Compact two-column design perfect for tech roles and dense information.",
        folder="deedy-resume",
        tex_file="deedy-resume-openfont.tex",
        cls_file="deedy-resume-openfont.cls",
        preview_file="deedy-cv-preview.png",
        engine="xelatex",
        extra_files=["publications.bib"],
        extra_dirs=["fonts"],
    ),
    "mcdowell-cv": TemplateConfig(
        id="mcdowell-cv",
        name="McDowell CV",
        description="Minimalist single-column style with clear hierarchy and elegant spacing.",
        folder="mcdowell-cv-master",
        tex_file="McDowell_CV_Template.tex",
        cls_file="mcdowellcv.cls",
        preview_file="McDowell_CV.png",
        engine="xelatex",
        extra_files=["tabu.sty", "varwidth.sty"],
    ),
}


def get_template(template_id: str) -> Optional[TemplateConfig]:
    """Get template config by ID."""
    return TEMPLATES.get(template_id)
