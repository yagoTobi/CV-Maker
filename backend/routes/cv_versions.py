from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import logging
import os
import uuid
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger(__name__)

VERSIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "user_data", "versions")


def _validate_version_id(version_id: str):
    """Validate that version_id is a valid UUID to prevent path traversal."""
    try:
        uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID")


# --- Pydantic Models ---

class PersonalInfo(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    links: List[dict] = []
    summary: Optional[str] = None
    personalOrder: Optional[List[str]] = None  # e.g. ['phone', 'email', 'location', 'links']


class WorkEntry(BaseModel):
    company: str = ""
    title: str = ""
    startDate: str = ""
    endDate: str = ""
    location: str = ""
    bullets: List[str] = []


class EducationEntry(BaseModel):
    school: str = ""
    degree: str = ""
    startDate: str = ""
    endDate: str = ""
    location: str = ""
    gpa: Optional[str] = None
    details: List[str] = []


class SkillCategory(BaseModel):
    category: str = ""
    skills: List[str] = []


class Project(BaseModel):
    name: str = ""
    year: str = ""
    description: str = ""
    technologies: Optional[str] = None
    bullets: Optional[list[str]] = None


class Award(BaseModel):
    year: str = ""
    title: str = ""
    description: Optional[str] = None


class AdditionalEntry(BaseModel):
    title: str = ""
    subtitle: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    bullets: list[str] = []


class AdditionalSection(BaseModel):
    title: str = ""
    entries: list[AdditionalEntry] = []


class CVFormData(BaseModel):
    templateId: str
    sectionOrder: Optional[List[str]] = None  # e.g. ['work', 'education', 'skills', 'projects', 'awards']
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
    parentVersionId: Optional[str] = None
    createdAt: str


# --- Helpers ---

def _version_path(version_id: str) -> str:
    return os.path.join(VERSIONS_DIR, f"{version_id}.json")


def _load_version(version_id: str) -> dict:
    path = _version_path(version_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    with open(path, "r") as f:
        return json.load(f)


def _validate_no_circular_reference(version_id: str, new_parent_id: str, visited: Optional[set] = None) -> None:
    """
    Validate that setting new_parent_id as parent of version_id won't create a circular reference.
    Walks up the parent chain from new_parent_id to ensure version_id isn't encountered.
    """
    if visited is None:
        visited = set()

    if new_parent_id in visited:
        raise HTTPException(status_code=400, detail="Circular parent reference detected")

    visited.add(new_parent_id)

    try:
        parent_data = _load_version(new_parent_id)
        parent_of_parent = parent_data.get("parentVersionId")

        if parent_of_parent == version_id:
            raise HTTPException(status_code=400, detail="Circular parent reference detected")

        if parent_of_parent:
            _validate_no_circular_reference(version_id, parent_of_parent, visited)
    except HTTPException as e:
        if e.status_code == 404:
            # Parent doesn't exist, but that's OK for this validation
            pass
        else:
            raise


# --- Endpoints ---

@router.get("/cv-versions")
async def list_versions():
    """List all saved CV versions in hierarchical structure (base CVs with nested job applications)."""
    os.makedirs(VERSIONS_DIR, exist_ok=True)
    all_versions = []

    # Load all versions
    for fname in os.listdir(VERSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(VERSIONS_DIR, fname), "r") as f:
                data = json.load(f)
            all_versions.append({
                "id": data["id"],
                "name": data["name"],
                "templateId": data["templateId"],
                "jobDescription": data.get("jobDescription"),
                "companyName": data.get("companyName"),
                "role": data.get("role"),
                "matchScore": data.get("matchScore"),
                "parentVersionId": data.get("parentVersionId"),
                "createdAt": data["createdAt"],
            })
        except Exception:
            continue

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
async def create_version(payload: CVVersionCreate):
    """Save a new CV version."""
    os.makedirs(VERSIONS_DIR, exist_ok=True)

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
        parent_path = _version_path(payload.parent_version_id)
        if not os.path.exists(parent_path):
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
        "parentVersionId": payload.parent_version_id,
        "createdAt": created_at,
    }

    with open(_version_path(version_id), "w") as f:
        json.dump(version_data, f, indent=2)

    return version_data


@router.get("/cv-versions/{version_id}")
async def get_version(version_id: str):
    """Get full CV version including tex content."""
    _validate_version_id(version_id)
    return _load_version(version_id)


@router.delete("/cv-versions/{version_id}")
async def delete_version(version_id: str):
    """Delete a saved CV version. Orphan any child versions (set their parentVersionId to null)."""
    _validate_version_id(version_id)
    path = _version_path(version_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    # Find all children and orphan them
    os.makedirs(VERSIONS_DIR, exist_ok=True)
    for fname in os.listdir(VERSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            child_path = os.path.join(VERSIONS_DIR, fname)
            with open(child_path, "r") as f:
                child_data = json.load(f)

            if child_data.get("parentVersionId") == version_id:
                # Orphan this child
                child_data["parentVersionId"] = None
                with open(child_path, "w") as f:
                    json.dump(child_data, f, indent=2)
        except Exception:
            continue

    os.remove(path)
    return {"status": "deleted"}


class UpdateVersionPayload(BaseModel):
    parentVersionId: Optional[str] = None


@router.patch("/cv-versions/{version_id}")
async def update_version(version_id: str, payload: UpdateVersionPayload):
    """Update a CV version (currently supports re-parenting only)."""
    _validate_version_id(version_id)
    version_data = _load_version(version_id)

    # Update parent relationship
    if "parentVersionId" in payload.model_dump(exclude_unset=True):
        new_parent_id = payload.parentVersionId

        # Validate new parent exists (if not null)
        if new_parent_id:
            _validate_version_id(new_parent_id)
            parent_path = _version_path(new_parent_id)
            if not os.path.exists(parent_path):
                raise HTTPException(status_code=400, detail=f"Parent version {new_parent_id} not found")

            # Prevent self-parenting
            if new_parent_id == version_id:
                raise HTTPException(status_code=400, detail="A version cannot be its own parent")

            # Prevent circular references
            _validate_no_circular_reference(version_id, new_parent_id)

        version_data["parentVersionId"] = new_parent_id

        # Save updated version
        with open(_version_path(version_id), "w") as f:
            json.dump(version_data, f, indent=2)

    return {
        "id": version_id,
        "parentVersionId": version_data.get("parentVersionId"),
        "message": "Version updated successfully"
    }
