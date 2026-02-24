from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

router = APIRouter()

# Template metadata - could be moved to a config file later
TEMPLATES = {
    "med-length-proff-cv": {
        "id": "med-length-proff-cv",
        "name": "Professional CV",
        "description": "Clean, traditional layout ideal for corporate roles and experienced professionals.",
        "folder": "med-length-proff-cv",
        "tex_file": "CV - English.tex",
        "cls_file": "resume.cls",
        "preview_file": "med-length-preview.png",
        "engine": "pdflatex",
    },
    "deedy-resume": {
        "id": "deedy-resume",
        "name": "Deedy Resume",
        "description": "Compact two-column design perfect for tech roles and dense information.",
        "folder": "deedy-resume",
        "tex_file": "deedy-resume-openfont.tex",
        "cls_file": "deedy-resume-openfont.cls",
        "preview_file": "deedy-cv-preview.png",
        "extra_files": ["publications.bib"],
        "extra_dirs": ["fonts"],
        "engine": "xelatex",
    },
    "mcdowell-cv": {
        "id": "mcdowell-cv",
        "name": "McDowell CV",
        "description": "Minimalist single-column style with clear hierarchy and elegant spacing.",
        "folder": "mcdowell-cv-master",
        "tex_file": "McDowell_CV_Template.tex",
        "cls_file": "mcdowellcv.cls",
        "preview_file": "McDowell_CV.png",
        "extra_files": ["tabu.sty", "varwidth.sty"],
        "engine": "xelatex",
    },
}


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    previewUrl: str


class TemplateListResponse(BaseModel):
    templates: list[TemplateInfo]


class TemplateContentResponse(BaseModel):
    content: str
    cls_content: str | None = None


def get_templates_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "..", "cv-templates")


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates():
    """List all available CV templates."""
    templates = []
    for template_id, meta in TEMPLATES.items():
        templates.append(
            TemplateInfo(
                id=meta["id"],
                name=meta["name"],
                description=meta["description"],
                previewUrl=f"/api/templates/{template_id}/preview",
            )
        )
    return TemplateListResponse(templates=templates)


@router.get("/templates/{template_id}/preview")
async def get_template_preview(template_id: str):
    """Get the preview image for a template."""
    if template_id not in TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    meta = TEMPLATES[template_id]
    templates_dir = get_templates_dir()
    preview_path = os.path.join(templates_dir, meta["folder"], meta["preview_file"])

    if not os.path.exists(preview_path):
        raise HTTPException(status_code=404, detail="Preview image not found")

    return FileResponse(preview_path, media_type="image/png")


@router.get("/templates/{template_id}/content", response_model=TemplateContentResponse)
async def get_template_content(template_id: str):
    """Get the LaTeX content for a specific template."""
    if template_id not in TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    meta = TEMPLATES[template_id]
    templates_dir = get_templates_dir()

    # Read the main tex file
    tex_path = os.path.join(templates_dir, meta["folder"], meta["tex_file"])
    if not os.path.exists(tex_path):
        raise HTTPException(status_code=404, detail="Template tex file not found")

    with open(tex_path, "r") as f:
        content = f.read()

    # Read the cls file if it exists
    cls_content = None
    cls_path = os.path.join(templates_dir, meta["folder"], meta["cls_file"])
    if os.path.exists(cls_path):
        with open(cls_path, "r") as f:
            cls_content = f.read()

    return TemplateContentResponse(content=content, cls_content=cls_content)


@router.get("/templates/{template_id}/files/{filename}")
async def get_template_file(template_id: str, filename: str):
    """Get additional template files (cls, bib, etc.)."""
    if template_id not in TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    meta = TEMPLATES[template_id]
    templates_dir = get_templates_dir()

    # Security: only allow specific files
    allowed_files = [meta["cls_file"]]
    if "extra_files" in meta:
        allowed_files.extend(meta["extra_files"])

    if filename not in allowed_files:
        raise HTTPException(status_code=403, detail="File not allowed")

    file_path = os.path.join(templates_dir, meta["folder"], filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
