"""LLM response parsing for CV extraction.

Handles the post-processing of Claude's JSON extraction response: markdown
fence stripping, truncation detection, JSON parsing, schema validation, and
construction of the typed `CVImportResult`.

The Bedrock invocation itself lives in the package `__init__.py` so that
test patches against `services.cv_extractor.bedrock_client` continue to work.
"""

from __future__ import annotations

import json
import logging

from pydantic import ValidationError

from models.cv import CVFormData
from utils.id_helpers import ensure_ids

from .models import CVImportResult, ImportSummary

logger = logging.getLogger(__name__)


def parse_extraction_response(raw: str, source: str) -> CVImportResult:
    """Parse Claude's JSON response and build a CVImportResult."""
    # Strip markdown fences if Claude wrapped the response
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3].rstrip()

    # Detect truncation — response likely hit max_tokens
    truncated = not text.rstrip().endswith("}")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        if truncated:
            logger.warning("Extraction response appears truncated (did not end with })")
            return CVImportResult(
                success=False,
                source=source,
                error="The extraction was cut short — your CV may be too long for a single pass. Try removing some content or uploading a shorter version.",
            )
        logger.error("Failed to parse extraction JSON: %s", e)
        return CVImportResult(
            success=False,
            source=source,
            error="Failed to parse extraction results. The AI response was not valid JSON.",
        )

    confidence = data.pop("_confidence", {"overall": "medium", "fields": {}})
    warnings: list[str] = data.pop("_warnings", [])
    data.pop("templateId", None)

    summary = ImportSummary(
        workEntries=len(data.get("workExperience", [])),
        educationEntries=len(data.get("education", [])),
        skillCategories=len(data.get("skills", [])),
        projects=len(data.get("projects") or []),
        awards=len(data.get("awards") or []),
        additionalSections=len(data.get("additionalSections") or []),
    )

    # Validate loosely — try building a CVFormData to catch shape issues
    try:
        CVFormData(**(data | {"templateId": "_validation"}))
    except ValidationError as e:
        logger.warning("Extracted data has schema issues: %s", e)
        warnings.append("Some fields may not match the expected format.")

    # Ensure all extracted entries have stable IDs
    data, _ = ensure_ids(data)

    return CVImportResult(
        success=True,
        form_data=data,
        source=source,
        confidence=confidence,
        summary=summary,
        warnings=warnings or None,
    )


__all__ = ["parse_extraction_response"]
