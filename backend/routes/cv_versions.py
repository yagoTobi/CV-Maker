from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Dict, List, Optional
import logging
import uuid
from datetime import datetime, timezone

from dependencies import get_current_user
from services.storage import StorageBackend
from services.storage_factory import get_storage

router = APIRouter()
logger = logging.getLogger(__name__)


def _validate_version_id(version_id: str):
    """Validate that version_id is a valid UUID to prevent path traversal."""
    try:
        uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID")


# --- Pydantic Models ---

class BulletItem(BaseModel):
    id: Optional[str] = None
    text: str = ""


class SkillItem(BaseModel):
    id: Optional[str] = None
    text: str = ""


class PersonalInfo(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    links: List[dict] = []
    summary: Optional[str] = None
    personalOrder: Optional[List[str]] = None  # e.g. ['phone', 'email', 'location', 'links']


class WorkEntry(BaseModel):
    id: Optional[str] = None
    company: str = ""
    title: str = ""
    startDate: str = ""
    endDate: str = ""
    location: str = ""
    bullets: List[BulletItem] = []

    @field_validator("bullets", mode="before")
    @classmethod
    def coerce_bullets(cls, v):
        if isinstance(v, list):
            return [BulletItem(text=b) if isinstance(b, str) else b for b in v]
        return v


class EducationEntry(BaseModel):
    id: Optional[str] = None
    school: str = ""
    degree: str = ""
    startDate: str = ""
    endDate: str = ""
    location: str = ""
    gpa: Optional[str] = None
    details: List[BulletItem] = []

    @field_validator("details", mode="before")
    @classmethod
    def coerce_details(cls, v):
        if isinstance(v, list):
            return [BulletItem(text=b) if isinstance(b, str) else b for b in v]
        return v


class SkillCategory(BaseModel):
    id: Optional[str] = None
    category: str = ""
    skills: List[SkillItem] = []

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skills(cls, v):
        if isinstance(v, list):
            return [SkillItem(text=s) if isinstance(s, str) else s for s in v]
        return v


class Project(BaseModel):
    id: Optional[str] = None
    name: str = ""
    year: str = ""
    description: str = ""
    technologies: Optional[str] = None
    bullets: Optional[List[BulletItem]] = None

    @field_validator("bullets", mode="before")
    @classmethod
    def coerce_bullets(cls, v):
        if isinstance(v, list):
            return [BulletItem(text=b) if isinstance(b, str) else b for b in v]
        return v


class Award(BaseModel):
    id: Optional[str] = None
    year: str = ""
    title: str = ""
    description: Optional[str] = None


class AdditionalEntry(BaseModel):
    id: Optional[str] = None
    title: str = ""
    subtitle: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    bullets: List[BulletItem] = []

    @field_validator("bullets", mode="before")
    @classmethod
    def coerce_bullets(cls, v):
        if isinstance(v, list):
            return [BulletItem(text=b) if isinstance(b, str) else b for b in v]
        return v


class AdditionalSection(BaseModel):
    id: Optional[str] = None
    title: str = ""
    entries: List[AdditionalEntry] = []


class CVFormData(BaseModel):
    templateId: str
    sectionOrder: Optional[List[str]] = None  # e.g. ['work', 'education', 'skills', 'projects', 'awards']
    sectionLabels: Optional[Dict[str, str]] = None  # e.g. {'work': 'Erfahrung', 'education': 'Bildung'}
    personalInfo: PersonalInfo = PersonalInfo()
    workExperience: List[WorkEntry] = []
    education: List[EducationEntry] = []
    skills: List[SkillCategory] = []
    projects: Optional[List[Project]] = None
    awards: Optional[List[Award]] = None
    additionalSections: Optional[List[AdditionalSection]] = None


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


class CVVersion(BaseModel):
    id: str
    name: str
    templateId: str
    texContent: str
    formData: Optional[CVFormData] = None
    jobDescription: Optional[str] = None
    companyName: Optional[str] = None
    role: Optional[str] = None
    matchScore: Optional[float] = None
    baselineMatchScore: Optional[float] = None
    parentVersionId: Optional[str] = None
    createdAt: str


class CVVersionMeta(BaseModel):
    id: str
    name: str
    templateId: str
    jobDescription: Optional[str] = None
    companyName: Optional[str] = None
    role: Optional[str] = None
    matchScore: Optional[float] = None
    baselineMatchScore: Optional[float] = None
    parentVersionId: Optional[str] = None
    createdAt: str


# --- Helpers ---

async def _validate_no_circular_reference(
    storage: StorageBackend,
    user_id: str,
    version_id: str,
    new_parent_id: str,
    visited: Optional[set] = None,
) -> None:
    """
    Validate that setting new_parent_id as parent of version_id won't create a circular reference.
    Walks up the parent chain from new_parent_id to ensure version_id isn't encountered.
    """
    if visited is None:
        visited = set()

    if new_parent_id in visited:
        raise HTTPException(status_code=400, detail="Circular parent reference detected")

    visited.add(new_parent_id)

    parent_data = await storage.get_version(user_id, new_parent_id)
    if parent_data is None:
        return  # Parent doesn't exist — OK for this validation

    parent_of_parent = parent_data.get("parentVersionId")
    if parent_of_parent == version_id:
        raise HTTPException(status_code=400, detail="Circular parent reference detected")

    if parent_of_parent:
        await _validate_no_circular_reference(storage, user_id, version_id, parent_of_parent, visited)


# --- Endpoints ---

@router.get("/cv-versions")
async def list_versions(
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """List all saved CV versions in hierarchical structure (base CVs with nested job applications)."""
    all_versions_raw = await storage.list_versions(user_id)

    # Extract metadata only
    all_versions = []
    for data in all_versions_raw:
        all_versions.append({
            "id": data["id"],
            "name": data["name"],
            "templateId": data["templateId"],
            "jobDescription": data.get("jobDescription"),
            "companyName": data.get("companyName"),
            "role": data.get("role"),
            "matchScore": data.get("matchScore"),
            "baselineMatchScore": data.get("baselineMatchScore"),
            "parentVersionId": data.get("parentVersionId"),
            "createdAt": data["createdAt"],
        })

    # Separate base CVs (parentVersionId = null) from job applications
    base_cvs = [v for v in all_versions if not v.get("parentVersionId")]
    job_apps = [v for v in all_versions if v.get("parentVersionId")]

    # Build hierarchical structure
    base_cvs_with_children = []
    for base in base_cvs:
        children = [app for app in job_apps if app["parentVersionId"] == base["id"]]
        children.sort(key=lambda v: v["createdAt"], reverse=True)
        base_with_children = base.copy()
        base_with_children["children"] = children
        base_cvs_with_children.append(base_with_children)

    # Sort base CVs by creation date (newest first)
    base_cvs_with_children.sort(key=lambda v: v["createdAt"], reverse=True)

    # Find ungrouped (orphaned) job applications (parent doesn't exist)
    parent_ids = {base["id"] for base in base_cvs}
    ungrouped = [app for app in job_apps if app["parentVersionId"] not in parent_ids]
    ungrouped.sort(key=lambda v: v["createdAt"], reverse=True)

    return {
        "versions": base_cvs_with_children,
        "ungrouped": ungrouped
    }


@router.post("/cv-versions")
async def create_version(
    payload: CVVersionCreate,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Save a new CV version."""
    # Auto-generate name if empty and job details provided
    name = payload.name
    if not name.strip():
        if payload.company_name and payload.role:
            name = f"{payload.company_name} {payload.role}"
        elif payload.company_name:
            name = f"{payload.company_name} Application"
        elif payload.role:
            name = payload.role
        else:
            name = f"Application {datetime.now(timezone.utc).strftime('%b %d')}"

    # Validate parent exists if specified
    if payload.parent_version_id:
        _validate_version_id(payload.parent_version_id)
        parent = await storage.get_version(user_id, payload.parent_version_id)
        if parent is None:
            raise HTTPException(status_code=400, detail=f"Parent version {payload.parent_version_id} not found")

    version_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    version_data = {
        "id": version_id,
        "name": name,
        "templateId": payload.template_id,
        "texContent": payload.tex_content,
        "formData": payload.form_data.model_dump() if payload.form_data else None,
        "jobDescription": payload.job_description,
        "companyName": payload.company_name,
        "role": payload.role,
        "matchScore": payload.match_score,
        "baselineMatchScore": payload.baseline_match_score,
        "parentVersionId": payload.parent_version_id,
        "createdAt": created_at,
    }

    await storage.create_version(user_id, version_data)
    return version_data


@router.get("/cv-versions/{version_id}")
async def get_version(
    version_id: str,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Get full CV version including tex content."""
    _validate_version_id(version_id)
    data = await storage.get_version(user_id, version_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    return data


@router.delete("/cv-versions/{version_id}")
async def delete_version(
    version_id: str,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Delete a saved CV version. Orphan any child versions (set their parentVersionId to null)."""
    _validate_version_id(version_id)
    data = await storage.get_version(user_id, version_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    await storage.update_children_of_deleted_parent(user_id, version_id)
    await storage.delete_version(user_id, version_id)
    return {"status": "deleted"}


class UpdateVersionPayload(BaseModel):
    parentVersionId: Optional[str] = None


@router.patch("/cv-versions/{version_id}")
async def update_version(
    version_id: str,
    payload: UpdateVersionPayload,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Update a CV version (currently supports re-parenting only)."""
    _validate_version_id(version_id)
    version_data = await storage.get_version(user_id, version_id)
    if version_data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    # Update parent relationship
    if "parentVersionId" in payload.model_dump(exclude_unset=True):
        new_parent_id = payload.parentVersionId

        # Validate new parent exists (if not null)
        if new_parent_id:
            _validate_version_id(new_parent_id)
            parent = await storage.get_version(user_id, new_parent_id)
            if parent is None:
                raise HTTPException(status_code=400, detail=f"Parent version {new_parent_id} not found")

            # Prevent self-parenting
            if new_parent_id == version_id:
                raise HTTPException(status_code=400, detail="A version cannot be its own parent")

            # Prevent circular references
            await _validate_no_circular_reference(storage, user_id, version_id, new_parent_id)

        await storage.update_version(user_id, version_id, {"parentVersionId": new_parent_id})

    return {
        "id": version_id,
        "parentVersionId": payload.parentVersionId,
        "message": "Version updated successfully"
    }
