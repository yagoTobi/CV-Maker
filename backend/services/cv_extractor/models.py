"""Pydantic models and constants for CV extraction."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel

# Use Haiku 4.5 for CV extraction — faster than Sonnet for structured data extraction
EXTRACTION_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"


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


__all__ = ["EXTRACTION_MODEL_ID", "ImportSummary", "CVImportResult"]
