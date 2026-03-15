from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

USER_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "user_data", "profile.json")


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
async def get_user_data():
    """Load saved user profile."""
    try:
        if os.path.exists(USER_DATA_PATH):
            with open(USER_DATA_PATH, "r") as f:
                data = json.load(f)
            return data
        return get_default_profile()
    except json.JSONDecodeError:
        return get_default_profile()
    except Exception as e:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.post("/user-data")
async def save_user_data(profile: UserProfile):
    """Save user profile."""
    try:
        os.makedirs(os.path.dirname(USER_DATA_PATH), exist_ok=True)
        with open(USER_DATA_PATH, "w") as f:
            json.dump(profile.model_dump(), f, indent=2)
        return {"status": "saved"}
    except Exception as e:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.post("/user-data/experience")
async def add_experience(experience: AdditionalExperience):
    """Add a single experience to the profile."""
    try:
        profile = await get_user_data()
        profile["additional_experiences"].append(experience.model_dump())

        os.makedirs(os.path.dirname(USER_DATA_PATH), exist_ok=True)
        with open(USER_DATA_PATH, "w") as f:
            json.dump(profile, f, indent=2)

        return {"status": "added", "profile": profile}
    except Exception as e:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.delete("/user-data")
async def clear_user_data():
    """Clear all user data."""
    try:
        if os.path.exists(USER_DATA_PATH):
            os.remove(USER_DATA_PATH)
        return {"status": "cleared"}
    except Exception as e:
        logger.exception("User data operation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred")
