"""
CV extraction service for importing CVs from PDF, DOCX, and JSON files.
Uses Claude AI via AWS Bedrock for intelligent extraction from unstructured documents.
"""

import json
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ValidationError
from docx import Document
from io import BytesIO

from routes.cv_versions import CVFormData
from services.bedrock import bedrock_client

logger = logging.getLogger(__name__)


class ImportSummary(BaseModel):
    workEntries: int = 0
    educationEntries: int = 0
    skillCategories: int = 0
    projects: int = 0
    awards: int = 0


class CVImportResult(BaseModel):
    success: bool
    form_data: Optional[Dict[str, Any]] = None
    source: str  # "pdf" | "docx" | "json"
    confidence: Optional[Dict[str, Any]] = None
    summary: Optional[ImportSummary] = None
    warnings: Optional[List[str]] = None
    error: Optional[str] = None


EXTRACTION_SYSTEM_PROMPT = """You are a CV/resume data extraction expert. Your task is to extract structured information from CV documents and return it as JSON.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown fences, no explanations, just the JSON object.
2. Leave fields as empty strings ("") rather than guessing or fabricating information.
3. Normalize all dates to "MMM YYYY" format (e.g., "Jan 2021", "Dec 2023").
4. For current/ongoing positions, use "Present" as the endDate.
5. Extract bullet points / details as arrays of strings.
6. Include a _confidence annotation block and a _warnings array.

Required JSON schema:

{
  "personalInfo": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "links": [{"label": "string (e.g. LinkedIn, GitHub, Portfolio)", "url": "string"}],
    "summary": ""
  },
  "workExperience": [
    {
      "company": "",
      "title": "",
      "startDate": "MMM YYYY",
      "endDate": "MMM YYYY or Present",
      "location": "",
      "bullets": [""]
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "startDate": "MMM YYYY",
      "endDate": "MMM YYYY",
      "location": "",
      "gpa": "",
      "details": [""]
    }
  ],
  "skills": [
    {
      "category": "e.g. Programming Languages, Tools, Frameworks",
      "skills": [""]
    }
  ],
  "projects": [
    {
      "name": "",
      "year": "YYYY",
      "description": "",
      "technologies": ""
    }
  ],
  "awards": [
    {
      "year": "YYYY",
      "title": "",
      "description": ""
    }
  ],
  "_confidence": {
    "overall": "high|medium|low",
    "fields": {
      "personalInfo.fullName": "high|medium|low",
      "personalInfo.email": "high|medium|low",
      "workExperience[0].company": "high|medium|low"
    }
  },
  "_warnings": []
}

Confidence guidelines:
- "high": clearly stated and unambiguous
- "medium": required some interpretation or inference
- "low": unclear, incomplete, or uncertain

Date examples:
- "January 2021" → "Jan 2021"
- "01/2021" → "Jan 2021"
- "2021-01" → "Jan 2021"
- "Current" / "Now" / "present" → "Present"

For links, identify: LinkedIn, GitHub, personal websites, portfolios.
Omit sections entirely (empty array) if the CV has no data for them."""

EXTRACTION_USER_PROMPT = (
    "Extract all CV/resume information from this document and return it as "
    "structured JSON matching the schema in your instructions. "
    "Be thorough but accurate — only include information actually present."
)


def _parse_extraction_response(raw: str, source: str) -> CVImportResult:
    """Parse Claude's JSON response and build a CVImportResult."""
    # Strip markdown fences if Claude wrapped the response
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3].rstrip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse extraction JSON: %s — raw[:500]: %s", e, raw[:500])
        return CVImportResult(
            success=False,
            source=source,
            error="Failed to parse extraction results. The AI response was not valid JSON.",
        )

    confidence = data.pop("_confidence", {"overall": "medium", "fields": {}})
    warnings: list[str] = data.pop("_warnings", [])
    data.pop("templateId", None)
    data.pop("sectionOrder", None)

    summary = ImportSummary(
        workEntries=len(data.get("workExperience", [])),
        educationEntries=len(data.get("education", [])),
        skillCategories=len(data.get("skills", [])),
        projects=len(data.get("projects") or []),
        awards=len(data.get("awards") or []),
    )

    # Validate loosely — try building a CVFormData to catch shape issues
    try:
        CVFormData(**(data | {"templateId": "_validation"}))
    except ValidationError as e:
        logger.warning("Extracted data has schema issues: %s", e)
        warnings.append("Some fields may not match the expected format.")

    return CVImportResult(
        success=True,
        form_data=data,
        source=source,
        confidence=confidence,
        summary=summary,
        warnings=warnings or None,
    )


async def extract_from_pdf(file_bytes: bytes) -> CVImportResult:
    """Send PDF to Claude as a document content block for multimodal extraction."""
    try:
        response = bedrock_client.chat_with_document(
            document_bytes=file_bytes,
            document_media_type="application/pdf",
            text_prompt=EXTRACTION_USER_PROMPT,
            system_prompt=EXTRACTION_SYSTEM_PROMPT,
        )
        return _parse_extraction_response(response, source="pdf")
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return CVImportResult(
            success=False,
            source="pdf",
            error=(
                "Could not extract text from this PDF. "
                "The file may be image-based (scanned). "
                "Try uploading a Word document or JSON file instead."
            ),
        )


async def extract_from_docx(file_bytes: bytes) -> CVImportResult:
    """Extract text from DOCX via python-docx, then send to Claude for structuring."""
    try:
        doc = Document(BytesIO(file_bytes))
        parts: list[str] = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            if para.style and "Heading" in para.style.name:
                parts.append(f"\n### {text}\n")
            else:
                parts.append(text)

        for table in doc.tables:
            for row in table.rows:
                cells = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if cells:
                    parts.append(cells)

        full_text = "\n".join(parts)
        if not full_text.strip():
            return CVImportResult(
                success=False,
                source="docx",
                error="The DOCX file appears to be empty or contains no extractable text.",
            )

        user_prompt = (
            f"{EXTRACTION_USER_PROMPT}\n\nDocument content:\n---\n{full_text}\n---"
        )

        response = bedrock_client.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=EXTRACTION_SYSTEM_PROMPT,
            stream=False,
        )
        return _parse_extraction_response(response, source="docx")
    except Exception as e:
        logger.error("DOCX extraction failed: %s", e)
        return CVImportResult(
            success=False,
            source="docx",
            error=f"Failed to extract CV from DOCX: {e}",
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
    data.pop("sectionOrder", None)

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

    summary = ImportSummary(
        workEntries=len(form_data.get("workExperience", [])),
        educationEntries=len(form_data.get("education", [])),
        skillCategories=len(form_data.get("skills", [])),
        projects=len(form_data.get("projects") or []),
        awards=len(form_data.get("awards") or []),
    )

    return CVImportResult(
        success=True,
        form_data=form_data,
        source="json",
        confidence={"overall": "high", "fields": {}},
        summary=summary,
        warnings=None,
    )
