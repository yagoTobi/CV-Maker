from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from config.templates import TEMPLATES, get_template

router = APIRouter()


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
    return os.path.join(os.path.dirname(__file__), "..", "latex_templates", "_source")


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates():
    """List all available CV templates."""
    templates = []
    for template_id, config in TEMPLATES.items():
        templates.append(
            TemplateInfo(
                id=config.id,
                name=config.name,
                description=config.description,
                previewUrl=f"/api/templates/{template_id}/preview",
            )
        )
    return TemplateListResponse(templates=templates)


@router.get("/templates/{template_id}/preview")
async def get_template_preview(template_id: str):
    """Get the preview image for a template."""
    config = get_template(template_id)
    if not config:
        raise HTTPException(status_code=404, detail="Template not found")

    templates_dir = get_templates_dir()
    preview_path = os.path.join(templates_dir, config.folder, config.preview_file)

    if not os.path.exists(preview_path):
        raise HTTPException(status_code=404, detail="Preview image not found")

    return FileResponse(preview_path, media_type="image/png")


@router.get("/templates/{template_id}/content", response_model=TemplateContentResponse)
async def get_template_content(template_id: str):
    """Get the LaTeX content for a specific template."""
    config = get_template(template_id)
    if not config:
        raise HTTPException(status_code=404, detail="Template not found")

    templates_dir = get_templates_dir()

    # Read the main tex file
    tex_path = os.path.join(templates_dir, config.folder, config.tex_file)
    if not os.path.exists(tex_path):
        raise HTTPException(status_code=404, detail="Template tex file not found")

    with open(tex_path, "r") as f:
        content = f.read()

    # Read the cls file if it exists
    cls_content = None
    cls_path = os.path.join(templates_dir, config.folder, config.cls_file)
    if os.path.exists(cls_path):
        with open(cls_path, "r") as f:
            cls_content = f.read()

    return TemplateContentResponse(content=content, cls_content=cls_content)


@router.get("/templates/{template_id}/files/{filename}")
async def get_template_file(template_id: str, filename: str):
    """Get additional template files (cls, bib, etc.)."""
    config = get_template(template_id)
    if not config:
        raise HTTPException(status_code=404, detail="Template not found")

    templates_dir = get_templates_dir()

    # Security: only allow specific files
    allowed_files = [config.cls_file] + config.extra_files

    if filename not in allowed_files:
        raise HTTPException(status_code=403, detail="File not allowed")

    file_path = os.path.join(templates_dir, config.folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
