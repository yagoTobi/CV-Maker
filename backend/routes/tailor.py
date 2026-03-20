import json
import logging
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Union

from routes.cv_versions import CVFormData
from services.bedrock import bedrock_client
from services.json_utils import strip_markdown_json
from prompts.cv_agent import TAILOR_SUGGEST_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)


class TailorRequest(BaseModel):
    form_data: CVFormData
    job_description: str
    company_name: Optional[str] = None
    role: Optional[str] = None


class TailorChangeItem(BaseModel):
    id: str
    field_path: str
    section: str
    description: str
    current_value: Union[str, List[str], None] = ""
    new_value: Union[str, List[str], None] = ""
    change_type: str  # 'modify' | 'add' | 'remove'


class TailorResponse(BaseModel):
    changes: List[TailorChangeItem]
    estimated_score: int
    summary: str


def _serialize_form_data(fd: CVFormData) -> str:
    """Serialize form data to readable structured text for AI consumption."""
    d = fd.model_dump(exclude_none=True)
    # Remove empty arrays and blank strings to reduce token count
    def _clean(obj):
        if isinstance(obj, dict):
            return {k: _clean(v) for k, v in obj.items() if v not in (None, "", [], {})}
        if isinstance(obj, list):
            cleaned = [_clean(i) for i in obj]
            return [c for c in cleaned if c not in (None, "", [], {})]
        return obj
    cleaned = _clean(d)
    return json.dumps(cleaned, indent=2)


def _resolve_path(data: dict, path: str) -> bool:
    """Check if a field path is resolvable against the form data."""
    import re
    segments = re.findall(r'([^.\[]+)|\[(\d+)\]', path)
    cur = data
    for seg_name, seg_idx in segments:
        key = seg_name if seg_name else int(seg_idx)
        try:
            if isinstance(key, int):
                cur = cur[key]
            else:
                cur = cur[key]
        except (KeyError, IndexError, TypeError):
            return False
    return True


@router.post("/tailor/suggest-changes", response_model=TailorResponse)
async def suggest_changes(payload: TailorRequest):
    """Analyze CV form data against a job description and suggest field-level changes."""
    form_text = _serialize_form_data(payload.form_data)
    form_dict = payload.form_data.model_dump(exclude_none=True)

    job_context = f"Job Description:\n{payload.job_description}"
    if payload.company_name:
        job_context += f"\nCompany: {payload.company_name}"
    if payload.role:
        job_context += f"\nRole: {payload.role}"

    user_message = f"""## CV Form Data (JSON)
{form_text}

## Target Position
{job_context}

Analyze this CV against the job description and suggest specific field-level changes."""

    try:
        response = bedrock_client.chat(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=TAILOR_SUGGEST_PROMPT,
            stream=False,
            max_tokens=4096,
        )

        # Parse JSON from response (handle markdown code blocks)
        text = strip_markdown_json(response)
        parsed = json.loads(text)

        changes = []
        for item in parsed.get("changes", []):
            field_path = item.get("field_path", "")
            # Validate path resolves against form data
            if not _resolve_path(form_dict, field_path):
                logger.warning(f"Skipping unresolvable path: {field_path}")
                continue
            changes.append(TailorChangeItem(
                id=str(uuid.uuid4()),
                field_path=field_path,
                section=item.get("section", ""),
                description=item.get("description", ""),
                current_value=item.get("current_value") or "",
                new_value=item.get("new_value") or "",
                change_type=item.get("change_type", "modify"),
            ))

        return TailorResponse(
            changes=changes,
            estimated_score=parsed.get("estimated_score", 0),
            summary=parsed.get("summary", ""),
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI tailor response: {e}")
        raise HTTPException(status_code=502, detail="AI returned invalid response format")
    except Exception as e:
        logger.error(f"Tailor suggest-changes failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
