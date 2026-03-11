from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Optional

from services.llm import cover_letter_provider

router = APIRouter()


class CoverLetterRequest(BaseModel):
    cv_content: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    company_name: Optional[str] = None
    instructions: Optional[str] = None


class CoverLetterResponse(BaseModel):
    cover_letter: str
    key_matches: list[str]
    missing_or_weaker_points: list[str]
    tone_notes: list[str]
    provider: str
    mode: Literal["mock", "live"]


@router.post("/cover-letter/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(request: CoverLetterRequest):
    try:
        result = cover_letter_provider.generate_cover_letter(
            cv_content=request.cv_content,
            job_description=request.job_description,
            company_name=request.company_name,
            instructions=request.instructions,
        )
        provider_name = getattr(cover_letter_provider, "name", "unknown")
        return CoverLetterResponse(
            cover_letter=result.get("cover_letter", ""),
            key_matches=result.get("key_matches", []),
            missing_or_weaker_points=result.get("missing_or_weaker_points", []),
            tone_notes=result.get("tone_notes", []),
            provider=provider_name,
            mode="mock" if provider_name == "mock" else "live",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
