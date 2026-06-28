"""Section-level AI assist: ``POST /api/assist/bullets``.

Generates up to ``max_bullets`` resume bullet points for a single CV section
entry from a short free-text answer (and/or a focus hint). The flow:

  rate-limit -> validate -> clamp -> INPUT guardrail -> cache lookup ->
  generate (LLM) -> validate/truncate bullets -> OUTPUT guardrail -> respond

Safety net, not a hard gate: a blocked guardrail, an empty/garbled model
response, or a generation error all resolve to a 200 with ``blocked=True`` and
a user-facing ``reason`` — never a 500 that leaks internals, and never a raw
exception message to the caller.
"""

import hashlib
import json
import logging
import time
from dataclasses import dataclass, replace
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import assist_settings
from dependencies import get_current_user
from prompts.cv_agent import get_section_assist_prompt
from services.ai import assist_complete, llm_cache
from services.ai.guardrails import screen as guardrail_screen
from services.ai.rate_limit import check_and_increment
from services.json_utils import parse_json_with_retry

router = APIRouter()
logger = logging.getLogger(__name__)

_BLOCKED_REASON = (
    "Couldn't generate usable bullets — add a little more detail and try again."
)


# --- Request / response models ----------------------------------------------

class AssistEntryContext(BaseModel):
    title: str = ""
    organization: Optional[str] = None
    dates: Optional[str] = None
    extra: Optional[str] = None


class AssistRequest(BaseModel):
    section_type: Literal["work", "education", "project", "additional"]
    entry_context: AssistEntryContext = Field(default_factory=AssistEntryContext)
    user_answer: str = ""
    focus: Optional[str] = None
    existing_bullets: list[str] = Field(default_factory=list)


class AssistResponse(BaseModel):
    bullets: list[str]
    blocked: bool = False
    reason: Optional[str] = None


# --- Prompt assembly ---------------------------------------------------------

@dataclass(frozen=True)
class _PromptContext:
    """Clamped, trusted inputs for one bullet-generation prompt."""

    section_type: str
    title: str
    org: str
    dates: str
    extra: str
    focus: str
    answer: str
    existing: list[str]
    max_chars: int


def _build_user_message(ctx: _PromptContext) -> str:
    """Assemble the prompt user message, trimming existing bullets first if oversized."""
    parts = [f"Section: {ctx.section_type}"]
    if ctx.title:
        parts.append(f"Title: {ctx.title}")
    if ctx.org:
        parts.append(f"Organization: {ctx.org}")
    if ctx.dates:
        parts.append(f"Dates: {ctx.dates}")
    if ctx.extra:
        parts.append(f"Additional context: {ctx.extra}")
    if ctx.focus:
        parts.append(f"Focus area: {ctx.focus}")
    if ctx.answer:
        parts.append(f"What to highlight: {ctx.answer}")
    if ctx.existing:
        parts.append(f"Existing bullets: {json.dumps(ctx.existing)}")
    msg = "\n".join(parts)

    # Over budget: drop the (lowest-value) existing bullets first, then hard-trim.
    if len(msg) > ctx.max_chars and ctx.existing:
        msg = _build_user_message(replace(ctx, existing=[]))
    return msg[: ctx.max_chars]


def _validate_bullets(parsed: dict) -> list[str]:
    """Extract bullets from parsed JSON, coercing any wrong shape to a safe list."""
    bullets = parsed.get("bullets")
    if isinstance(bullets, list):
        return [b for b in bullets if isinstance(b, str) and b.strip()]
    if isinstance(bullets, str) and bullets.strip():
        return [bullets]
    return []


def _cache_key(ctx: _PromptContext) -> str:
    """A stable digest over the prompt inputs + the model/guardrail config that shaped them."""
    payload = json.dumps(
        {
            "v": assist_settings.prompt_version,
            "section_type": ctx.section_type,
            "title": ctx.title,
            "org": ctx.org,
            "dates": ctx.dates,
            "extra": ctx.extra,
            "focus": ctx.focus,
            "answer": ctx.answer,
            "existing": ctx.existing,
            "model": assist_settings.model_id,
            "temp": assist_settings.temperature,
            "max_tokens": assist_settings.max_tokens,
            "guardrail_output": assist_settings.guardrail_output,
            "guardrail_id": assist_settings.guardrail_id,
            "guardrail_version": assist_settings.guardrail_version,
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


# --- Route -------------------------------------------------------------------

@router.post("/assist/bullets", response_model=AssistResponse)
async def assist_bullets(
    payload: AssistRequest, user_id: str = Depends(get_current_user)
):
    """Generate up to ``max_bullets`` bullet points for one CV section entry."""
    # 1. Rate limit (per-user + global, in-memory).
    rl = check_and_increment(user_id)
    if not rl.allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"},
            headers={"Retry-After": str(rl.retry_after)},
        )

    # 2. Require something to work with.
    if not payload.user_answer.strip() and not (payload.focus or "").strip():
        raise HTTPException(status_code=400, detail="user_answer or focus is required")

    # 3. Clamp every untrusted input to its configured ceiling.
    ec = payload.entry_context
    field_cap = assist_settings.max_context_field_chars
    ctx = _PromptContext(
        section_type=payload.section_type,
        title=(ec.title or "")[:field_cap],
        org=(ec.organization or "")[:field_cap],
        dates=(ec.dates or "")[:field_cap],
        extra=(ec.extra or "")[:field_cap],
        focus=(payload.focus or "")[: assist_settings.max_focus_chars],
        answer=payload.user_answer[: assist_settings.max_answer_chars],
        existing=[
            b[: assist_settings.max_existing_bullet_chars]
            for b in payload.existing_bullets[: assist_settings.max_existing_bullets]
        ],
        max_chars=assist_settings.max_prompt_chars,
    )

    # 4. Build the prompt body.
    user_message = _build_user_message(ctx)

    # 5. INPUT guardrail (fail-open inside screen()).
    g_in = guardrail_screen(user_message, "INPUT")
    if g_in.blocked:
        return AssistResponse(
            bullets=[], blocked=True, reason=g_in.message or "Content policy"
        )

    # 6. Cache lookup (keyed on the clamped inputs + model/guardrail config).
    cache_key = _cache_key(ctx)
    cached = llm_cache.get(cache_key)
    if cached is not None:
        bullets = json.loads(cached)
    else:
        # 7. Generate. Any failure here resolves to a soft block, never a 500.
        start = time.monotonic()
        try:
            parsed = parse_json_with_retry(
                lambda: assist_complete(
                    system_prompt=get_section_assist_prompt(payload.section_type),
                    user_message=user_message,
                    max_tokens=assist_settings.max_tokens,
                    temperature=assist_settings.temperature,
                ),
                max_retries=1,
            )
            bullets = _validate_bullets(parsed)
        except Exception:
            logger.exception("assist_bullets: generation failed")
            return AssistResponse(bullets=[], blocked=True, reason=_BLOCKED_REASON)
        elapsed = time.monotonic() - start

        if not bullets:
            return AssistResponse(bullets=[], blocked=True, reason=_BLOCKED_REASON)

        bullets = bullets[: assist_settings.max_bullets]
        logger.info(
            f"assist_bullets: generated {len(bullets)} bullets in {elapsed:.2f}s"
        )
        llm_cache.put(cache_key, json.dumps(bullets))

    # 8. OUTPUT guardrail — runs for BOTH cache hits and fresh generations.
    if assist_settings.guardrail_output:
        g_out = guardrail_screen("\n".join(bullets), "OUTPUT")
        if g_out.blocked:
            return AssistResponse(
                bullets=[], blocked=True, reason=g_out.message or "Content policy"
            )

    return AssistResponse(bullets=bullets[: assist_settings.max_bullets])
