"""Bedrock-backed extraction helpers for voice interview transcripts.

Pulled out of ``routes/voice_interview.py`` so the route stays a thin
orchestration layer. These helpers are pure-ish wrappers around
``bedrock_client.chat`` plus JSON parsing — they raise on hard failure for
the CV extraction path and swallow errors on the best-effort profile-summary
path (matches prior behaviour).
"""

from __future__ import annotations

import json
from datetime import date
from typing import Optional

from loguru import logger

from prompts.voice_interview import (
    VOICE_EXTRACTION_PROMPT,
    VOICE_PROFILE_SUMMARY_PROMPT,
)
from services.ai import bedrock_client
from services.json_utils import parse_markdown_json, parse_json_with_retry


def extract_cv_from_transcript(transcript_lines: list[str]) -> dict:
    """Run the voice-extraction Bedrock prompt and return the parsed CV dict.

    Raises ``Exception`` on parse / Bedrock failure — caller decides how to
    surface it (the route returns a 500).
    """
    transcript_text = "\n".join(transcript_lines)
    return parse_json_with_retry(
        lambda: bedrock_client.chat(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Here is the voice interview transcript:\n\n"
                        f"{transcript_text}\n\n"
                        "Extract the CV data as a JSON object."
                    ),
                }
            ],
            system_prompt=VOICE_EXTRACTION_PROMPT,
            stream=False,
            max_tokens=4096,
            temperature=0.2,
        ),
        max_retries=1,
    )


def summarize_profile_from_cv(form_data: dict) -> Optional[dict]:
    """Best-effort profile summary for future sessions.

    Returns the parsed profile dict (with ``last_updated`` stamped) or
    ``None`` if any step failed. Never raises — matches the original
    swallow-and-continue behaviour.
    """
    try:
        profile_result = bedrock_client.chat(
            messages=[
                {
                    "role": "user",
                    "content": f"CV data:\n{json.dumps(form_data)}\n\nCreate a brief profile summary.",
                }
            ],
            system_prompt=VOICE_PROFILE_SUMMARY_PROMPT,
            stream=False,
            max_tokens=1024,
            temperature=0.3,
        )
        profile_data = parse_markdown_json(profile_result)
        if profile_data:
            profile_data["last_updated"] = date.today().isoformat()
            return profile_data
    except Exception:
        logger.exception("[voice] profile summary failed")
    return None
