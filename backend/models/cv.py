"""Pydantic domain models for CV data.

These models describe the canonical CV shape (`CVFormData`) plus the saved
version envelopes (`CVVersion`, `CVVersionMeta`). They were originally defined
inside `routes/cv_versions.py`; they live here so services and other routes can
import them without depending on a route module.
"""

from pydantic import BaseModel, field_validator
from typing import Dict, List, Optional


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


__all__ = [
    "BulletItem",
    "SkillItem",
    "PersonalInfo",
    "WorkEntry",
    "EducationEntry",
    "SkillCategory",
    "Project",
    "Award",
    "AdditionalEntry",
    "AdditionalSection",
    "CVFormData",
    "CVVersion",
    "CVVersionMeta",
]
