"""JSON CV import + shared validation/normalization helpers.

The PDF and DOCX async entry points live in the package `__init__.py` (so
that `services.cv_extractor.bedrock_client` and `services.cv_extractor.Document`
patches in tests continue to work). This module owns the AI-free JSON path
and any helpers shared across formats.
"""

from __future__ import annotations

import json

from pydantic import ValidationError

from models.cv import CVFormData
from utils.id_helpers import ensure_ids

from .models import CVImportResult, ImportSummary


def _build_summary(form_data: dict) -> ImportSummary:
    """Build an ImportSummary from a parsed CV dict."""
    return ImportSummary(
        workEntries=len(form_data.get("workExperience", [])),
        educationEntries=len(form_data.get("education", [])),
        skillCategories=len(form_data.get("skills", [])),
        projects=len(form_data.get("projects") or []),
        awards=len(form_data.get("awards") or []),
        additionalSections=len(form_data.get("additionalSections") or []),
    )


async def extract_from_json(file_bytes: bytes) -> CVImportResult:
    """Parse JSON directly, validate against CVFormData schema. No AI needed."""
    try:
        data = json.loads(file_bytes.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return CVImportResult(
            success=False,
            source="json",
            error=f"Invalid JSON file: {e}",
        )

    data.pop("templateId", None)

    # Ensure minimum required keys
    data.setdefault("personalInfo", {})
    data.setdefault("workExperience", [])
    data.setdefault("education", [])
    data.setdefault("skills", [])

    try:
        validated = CVFormData(**(data | {"templateId": "_validation"}))
        form_data = validated.model_dump()
        form_data.pop("templateId")
    except ValidationError as e:
        field_errors = [
            f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}"
            for err in e.errors()
        ]
        return CVImportResult(
            success=False,
            source="json",
            error="JSON structure doesn't match the CV schema.",
            warnings=field_errors[:5],
        )

    # Ensure all entries have stable IDs
    form_data, _ = ensure_ids(form_data)

    return CVImportResult(
        success=True,
        form_data=form_data,
        source="json",
        confidence={"overall": "high", "fields": {}},
        summary=_build_summary(form_data),
        warnings=None,
    )


__all__ = ["extract_from_json", "_build_summary"]
