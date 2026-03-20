from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from dependencies import get_current_user
from services.storage import StorageBackend
from services.storage_factory import get_storage

router = APIRouter()
logger = logging.getLogger(__name__)


class AdditionalExperience(BaseModel):
    topic: str
    description: str
    added_from_job: Optional[str] = None


class UserProfile(BaseModel):
    additional_experiences: List[AdditionalExperience] = []
    skills_mentioned: List[str] = []
    conversation_history: List[Dict[str, Any]] = []


def get_default_profile() -> dict:
    return {
        "additional_experiences": [],
        "skills_mentioned": [],
        "conversation_history": []
    }


@router.get("/user-data")
async def get_user_data(
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Load saved user profile."""
    try:
        profile = await storage.get_profile(user_id)
        return profile if profile is not None else get_default_profile()
    except Exception:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.post("/user-data")
async def save_user_data(
    profile: UserProfile,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Save user profile."""
    try:
        await storage.save_profile(user_id, profile.model_dump())
        return {"status": "saved"}
    except Exception:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.post("/user-data/experience")
async def add_experience(
    experience: AdditionalExperience,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Add a single experience to the profile."""
    try:
        profile = await storage.get_profile(user_id)
        if profile is None:
            profile = get_default_profile()
        profile["additional_experiences"].append(experience.model_dump())
        await storage.save_profile(user_id, profile)
        return {"status": "added", "profile": profile}
    except Exception:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.delete("/user-data")
async def clear_user_data(
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Clear all user data."""
    try:
        await storage.delete_profile(user_id)
        return {"status": "cleared"}
    except Exception:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")
