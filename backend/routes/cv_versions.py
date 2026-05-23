from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from dependencies import get_current_user
from services.storage import StorageBackend
from services.storage_factory import get_storage
from services import version_service

# Domain models live in `models.cv` so services and other routes can import
# them without depending on a route module. Re-imported here so existing
# callers (and tests) that do `from routes.cv_versions import CVFormData`
# keep working.
from models.cv import (
    AdditionalEntry,
    AdditionalSection,
    Award,
    BulletItem,
    CVFormData,
    CVVersion,
    CVVersionMeta,
    EducationEntry,
    PersonalInfo,
    Project,
    SkillCategory,
    SkillItem,
    WorkEntry,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# --- Route-local request payload models ---
# These are request shapes consumed only by handlers in this module.

class CVVersionCreate(BaseModel):
    name: str
    template_id: str
    tex_content: str
    form_data: Optional[CVFormData] = None
    job_description: Optional[str] = None
    company_name: Optional[str] = None
    role: Optional[str] = None  # Job role/title (e.g., "Senior Product Designer")
    match_score: Optional[float] = None
    baseline_match_score: Optional[float] = None
    parent_version_id: Optional[str] = None  # ID of base CV this application derives from


class UpdateVersionPayload(BaseModel):
    parentVersionId: Optional[str] = None
    name: Optional[str] = None
    formData: Optional[CVFormData] = None
    texContent: Optional[str] = None


# --- Endpoints ---

@router.get("/cv-versions")
async def list_versions(
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """List all saved CV versions in hierarchical structure (base CVs with nested job applications)."""
    return await version_service.list_versions_tree(storage, user_id)


@router.post("/cv-versions")
async def create_version(
    payload: CVVersionCreate,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Save a new CV version."""
    return await version_service.create_version(
        storage,
        user_id,
        name=payload.name,
        template_id=payload.template_id,
        tex_content=payload.tex_content,
        form_data=payload.form_data,
        job_description=payload.job_description,
        company_name=payload.company_name,
        role=payload.role,
        match_score=payload.match_score,
        baseline_match_score=payload.baseline_match_score,
        parent_version_id=payload.parent_version_id,
    )


@router.get("/cv-versions/{version_id}")
async def get_version(
    version_id: str,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Get full CV version including tex content."""
    return await version_service.get_version(storage, user_id, version_id)


@router.delete("/cv-versions/{version_id}")
async def delete_version(
    version_id: str,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Delete a saved CV version. Orphan any child versions (set their parentVersionId to null)."""
    await version_service.delete_version(storage, user_id, version_id)
    return {"status": "deleted"}


@router.patch("/cv-versions/{version_id}")
async def update_version(
    version_id: str,
    payload: UpdateVersionPayload,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Update a CV version (supports re-parenting, name update, and full content update)."""
    payload_dict = payload.model_dump(exclude_unset=True)
    resolved_parent_id = await version_service.update_version(
        storage,
        user_id,
        version_id,
        payload_dict,
        new_parent_id=payload.parentVersionId,
        new_name=payload.name,
        new_form_data=payload.formData,
        new_tex_content=payload.texContent,
    )
    return {
        "id": version_id,
        "parentVersionId": resolved_parent_id,
        "message": "Version updated successfully",
    }
