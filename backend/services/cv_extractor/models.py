"""Pydantic models and constants for CV extraction."""

import os
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from services.ai import MODEL_HAIKU

# Use Haiku 4.5 for CV extraction by default — faster than Sonnet for
# structured data extraction. CV_IMPORT_MODEL_ID lets deployments swap in a
# faster/cheaper import model without touching chat or match-analysis quality.
DEFAULT_EXTRACTION_MODEL_ID = MODEL_HAIKU
EXTRACTION_MODEL_ID = (
    os.environ.get("CV_IMPORT_MODEL_ID")
    or os.environ.get("EXTRACTION_MODEL_ID")
    or DEFAULT_EXTRACTION_MODEL_ID
)


class ImportSummary(BaseModel):
    workEntries: int = 0
    educationEntries: int = 0
    skillCategories: int = 0
    projects: int = 0
    awards: int = 0
    additionalSections: int = 0


class CVImportResult(BaseModel):
    success: bool
    form_data: Optional[Dict[str, Any]] = None
    source: str  # "pdf" | "docx" | "json"
    confidence: Optional[Dict[str, Any]] = None
    summary: Optional[ImportSummary] = None
    warnings: Optional[List[str]] = None
    error: Optional[str] = None


__all__ = [
    "DEFAULT_EXTRACTION_MODEL_ID",
    "EXTRACTION_MODEL_ID",
    "ImportSummary",
    "CVImportResult",
]
