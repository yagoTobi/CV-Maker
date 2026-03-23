import json
import logging
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Union

from routes.cv_versions import CVFormData
from services.bedrock import bedrock_client, MODEL_SONNET
from services import llm_cache
from services.json_utils import strip_markdown_json, parse_json_with_retry
from prompts.cv_agent import TAILOR_SUGGEST_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)


class TailorRequest(BaseModel):
    form_data: CVFormData
    job_description: str
    company_name: Optional[str] = None
    role: Optional[str] = None


class TailorAlternative(BaseModel):
    label: str
    value: Union[str, List[str]]


class TailorChangeItem(BaseModel):
    id: str
    fieldPath: str
    section: str
    description: str
    currentValue: Union[str, List[str], None] = ""
    alternatives: List[TailorAlternative]
    changeType: str  # 'modify' | 'add' | 'remove'


class TailorResponse(BaseModel):
    changes: List[TailorChangeItem]
    estimatedScore: int
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


def _resolve_path(data: dict, path: str, change_type: str = "modify") -> bool:
    """Check if a field path is resolvable against the form data.

    For 'add' changes, allows the path if the parent object exists
    (the leaf key may not exist yet, e.g. adding personalInfo.summary).
    """
    import re
    segments = re.findall(r'([^.\[]+)|\[(\d+)\]', path)
    parsed = [seg_name if seg_name else int(seg_idx) for seg_name, seg_idx in segments]

    cur = data
    for i, key in enumerate(parsed):
        try:
            cur = cur[key]
        except (KeyError, IndexError, TypeError):
            # For 'add' changes, it's OK if just the last segment is missing
            if change_type == "add" and i == len(parsed) - 1:
                return True
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

    serialized_form_data = form_text

    try:
        # Check cache first
        cache_key = llm_cache.cache_key(serialized_form_data, payload.job_description, payload.company_name or "", payload.role or "")
        cached = llm_cache.get(cache_key)
        if cached:
            try:
                parsed = json.loads(strip_markdown_json(cached))
            except json.JSONDecodeError:
                parsed = None  # Cache had bad data, proceed with fresh call
        else:
            parsed = None

        if parsed is None:
            parsed = parse_json_with_retry(
                lambda: bedrock_client.chat(
                    messages=[{"role": "user", "content": user_message}],
                    system_prompt=TAILOR_SUGGEST_PROMPT,
                    stream=False,
                    max_tokens=8192,
                    model_id=MODEL_SONNET,
                    temperature=0.5,
                ),
                max_retries=1,
            )
            # Cache the raw response for future hits
            llm_cache.put(cache_key, json.dumps(parsed))

        changes = []
        for item in parsed.get("changes", []):
            field_path = item.get("field_path", "")
            change_type = item.get("change_type", "modify")
            # Validate path resolves against form data
            if not _resolve_path(form_dict, field_path, change_type):
                logger.warning(f"Skipping unresolvable path: {field_path}")
                continue
            # Parse alternatives array, with fallback for flat new_value
            raw_alts = item.get("alternatives")
            if isinstance(raw_alts, list) and len(raw_alts) > 0:
                alternatives = [
                    TailorAlternative(label=a.get("label", "Option"), value=a.get("value", ""))
                    for a in raw_alts if isinstance(a, dict) and a.get("value")
                ]
            else:
                alternatives = []

            # Fallback: wrap flat new_value as single alternative
            if not alternatives:
                flat_value = item.get("new_value") or ""
                if flat_value:
                    alternatives = [TailorAlternative(label="Suggested", value=flat_value)]

            if not alternatives:
                logger.warning(f"Skipping change with no alternatives: {field_path}")
                continue

            changes.append(TailorChangeItem(
                id=str(uuid.uuid4()),
                fieldPath=field_path,
                section=item.get("section", ""),
                description=item.get("description", ""),
                currentValue=item.get("current_value") or "",
                alternatives=alternatives,
                changeType=item.get("change_type", "modify"),
            ))

        return TailorResponse(
            changes=changes,
            estimatedScore=parsed.get("estimated_score", 0),
            summary=parsed.get("summary", ""),
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI tailor response: {e}")
        raise HTTPException(status_code=502, detail="AI returned invalid response format")
    except Exception as e:
        logger.error(f"Tailor suggest-changes failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
