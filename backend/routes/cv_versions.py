from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime, timezone

router = APIRouter()

VERSIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "user_data", "versions")


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
    match_score: Optional[float] = None


class CVVersion(BaseModel):
    id: str
    name: str
    templateId: str
    texContent: str
    formData: Optional[CVFormData] = None
    jobDescription: Optional[str] = None
    companyName: Optional[str] = None
    matchScore: Optional[float] = None
    createdAt: str


class CVVersionMeta(BaseModel):
    id: str
    name: str
    templateId: str
    jobDescription: Optional[str] = None
    companyName: Optional[str] = None
    matchScore: Optional[float] = None
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


# --- Endpoints ---

@router.get("/cv-versions")
async def list_versions():
    """List all saved CV versions, sorted newest-first (metadata only)."""
    os.makedirs(VERSIONS_DIR, exist_ok=True)
    versions = []
    for fname in os.listdir(VERSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(VERSIONS_DIR, fname), "r") as f:
                data = json.load(f)
            versions.append({
                "id": data["id"],
                "name": data["name"],
                "templateId": data["templateId"],
                "jobDescription": data.get("jobDescription"),
                "companyName": data.get("companyName"),
                "matchScore": data.get("matchScore"),
                "createdAt": data["createdAt"],
            })
        except Exception:
            continue

    versions.sort(key=lambda v: v["createdAt"], reverse=True)
    return {"versions": versions}


@router.post("/cv-versions")
async def create_version(payload: CVVersionCreate):
    """Save a new CV version."""
    os.makedirs(VERSIONS_DIR, exist_ok=True)

    version_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    version_data = {
        "id": version_id,
        "name": payload.name,
        "templateId": payload.template_id,
        "texContent": payload.tex_content,
        "formData": payload.form_data.model_dump() if payload.form_data else None,
        "jobDescription": payload.job_description,
        "companyName": payload.company_name,
        "matchScore": payload.match_score,
        "createdAt": created_at,
    }

    with open(_version_path(version_id), "w") as f:
        json.dump(version_data, f, indent=2)

    return version_data


@router.get("/cv-versions/{version_id}")
async def get_version(version_id: str):
    """Get full CV version including tex content."""
    return _load_version(version_id)


@router.delete("/cv-versions/{version_id}")
async def delete_version(version_id: str):
    """Delete a saved CV version."""
    path = _version_path(version_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    os.remove(path)
    return {"status": "deleted"}
