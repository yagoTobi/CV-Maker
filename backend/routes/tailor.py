# AI Speed Decision (Phase 5, D-15, AI-06, AI-07):
# Tailor suggestions use MODEL_TAILOR (default: Haiku 4.5) for sub-2s response target.
# If quality is insufficient, set TAILOR_MODEL_ID=us.anthropic.claude-sonnet-4-6
# in .env to fall back to Sonnet. Match analysis keeps Sonnet (quality, not speed-critical).

import json
import logging
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Union

from models.cv import CVFormData
from services.ai import bedrock_client, MODEL_TAILOR, llm_cache
from services.json_utils import strip_markdown_json, parse_json_with_retry
from prompts.cv_agent import TAILOR_SUGGEST_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)


def _strip_ids_for_ai(form_dict: dict) -> dict:
    """Strip IDs and flatten BulletItem/SkillItem to strings for AI consumption.

    The AI expects the old schema (bullets as string[], skills as string[]).
    This ensures the AI prompt matches training data format.
    """
    import copy
    d = copy.deepcopy(form_dict)

    def _flatten_bullets(items):
        return [b["text"] if isinstance(b, dict) and "text" in b else b for b in items]

    def _flatten_skills(items):
        return [s["text"] if isinstance(s, dict) and "text" in s else s for s in items]

    for work in d.get("workExperience", []):
        work.pop("id", None)
        work["bullets"] = _flatten_bullets(work.get("bullets", []))
    for edu in d.get("education", []):
        edu.pop("id", None)
        edu["details"] = _flatten_bullets(edu.get("details", []))
    for skill in d.get("skills", []):
        skill.pop("id", None)
        skill["skills"] = _flatten_skills(skill.get("skills", []))
    for proj in d.get("projects", []) or []:
        proj.pop("id", None)
        proj["bullets"] = _flatten_bullets(proj.get("bullets", []) or [])
    for award in d.get("awards", []) or []:
        award.pop("id", None)
    for section in d.get("additionalSections", []) or []:
        section.pop("id", None)
        for entry in section.get("entries", []):
            entry.pop("id", None)
            entry["bullets"] = _flatten_bullets(entry.get("bullets", []))
    for link in d.get("personalInfo", {}).get("links", []):
        link.pop("id", None)

    return d


class TailorRequest(BaseModel):
    form_data: CVFormData
    job_description: str
    company_name: Optional[str] = None
    role: Optional[str] = None
    # Phase 13 (D-07): user-confirmed clarifications volunteered via Gap Prompt chips.
    # Treated by the LLM as user-confirmed truth (see TAILOR_SUGGEST_PROMPT).
    # Empty / whitespace-only entries are filtered before joining (see suggest_changes).
    user_clarifications: Optional[List[str]] = None


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
    d = _strip_ids_for_ai(fd.model_dump(exclude_none=True))
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

    # Phase 13 (D-07): render user clarifications as a labeled section in the user_message.
    # Filter empty / whitespace-only entries so blank chip inputs don't pollute the prompt.
    cleaned_clarifications = [
        c.strip() for c in (payload.user_clarifications or []) if c and c.strip()
    ]
    clarifications_section = ""
    if cleaned_clarifications:
        clarifications_section = (
            "\n\n## User-Confirmed Clarifications\n"
            + "\n".join(f"- {c}" for c in cleaned_clarifications)
            + "\n"
        )

    user_message = f"""## CV Form Data (JSON)
{form_text}

## Target Position
{job_context}{clarifications_section}

Analyze this CV against the job description and suggest specific field-level changes."""

    serialized_form_data = form_text

    try:
        # Check cache first.
        # Phase 13 (D-07, threat T-13-01-01): fold user_clarifications fingerprint into the
        # cache key so two distinct clarification sets do NOT share a cached response.
        clarifications_fingerprint = "|".join(cleaned_clarifications)
        cache_key = llm_cache.cache_key(
            serialized_form_data,
            payload.job_description,
            payload.company_name or "",
            payload.role or "",
            clarifications_fingerprint,
        )
        cached = llm_cache.get(cache_key)
        if cached:
            try:
                parsed = json.loads(strip_markdown_json(cached))
            except json.JSONDecodeError:
                parsed = None  # Cache had bad data, proceed with fresh call
        else:
            parsed = None

        if parsed is None:
            start_time = time.monotonic()
            parsed = parse_json_with_retry(
                lambda: bedrock_client.chat(
                    messages=[{"role": "user", "content": user_message}],
                    system_prompt=TAILOR_SUGGEST_PROMPT,
                    stream=False,
                    max_tokens=8192,
                    model_id=MODEL_TAILOR,
                    temperature=0.5,
                ),
                max_retries=1,
            )
            elapsed = time.monotonic() - start_time
            logger.info(f"Tailor suggestions generated in {elapsed:.2f}s using model {MODEL_TAILOR}")
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
