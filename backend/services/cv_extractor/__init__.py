"""CV extraction service package.

Public entry points:
    - extract_from_pdf(file_bytes)  → CVImportResult
    - extract_from_docx(file_bytes) → CVImportResult
    - extract_from_json(file_bytes) → CVImportResult

Internal layout:
    - models.py       — Pydantic models + EXTRACTION_MODEL_ID
    - parser.py       — JSON path + shared summary helper
    - pdf_parser.py   — local PDF text extraction
    - docx_parser.py  — DOCX text extraction
    - llm_client.py   — Claude response parsing (markdown/truncation/validate)

The Bedrock call sites and the `Document(...)` instantiation live in this
file so that existing test patches (`@patch("services.cv_extractor.bedrock_client")`,
`@patch("services.cv_extractor.Document")`) keep working without any test
changes — the names being patched are looked up from this module's namespace.
"""

from __future__ import annotations

import logging
from io import BytesIO

# Re-exported names — also referenced directly below so they live in this
# module's namespace and stay patchable as `services.cv_extractor.<name>`.
from docx import Document  # noqa: F401  (used + re-exported for patches)

from prompts.cv_extraction import (
    CV_EXTRACTION_SYSTEM_PROMPT,
    CV_EXTRACTION_USER_PROMPT,
)
from services.ai import bedrock_client  # noqa: F401  (used + re-exported)

from .docx_parser import extract_docx_text as _extract_docx_text
from .llm_client import parse_extraction_response as _parse_extraction_response
from .models import CVImportResult, EXTRACTION_MODEL_ID, ImportSummary
from .parser import extract_from_json
from .pdf_parser import (
    PDF_MEDIA_TYPE,
    PDFTextExtractionError,
    extract_pdf_text as _extract_pdf_text,
)

logger = logging.getLogger(__name__)


def _structure_text_with_model(full_text: str, source: str) -> CVImportResult:
    """Ask the fast extraction model to structure already-extracted text."""
    user_prompt = f"{CV_EXTRACTION_USER_PROMPT}\n\nDocument content:\n---\n{full_text}\n---"

    response = bedrock_client.chat(
        messages=[{"role": "user", "content": user_prompt}],
        system_prompt=CV_EXTRACTION_SYSTEM_PROMPT,
        stream=False,
        max_tokens=8192,
        model_id=EXTRACTION_MODEL_ID,
        temperature=0.2,
    )
    return _parse_extraction_response(response, source=source)


def _extract_pdf_with_document(file_bytes: bytes) -> CVImportResult:
    """Fallback to Claude document parsing when local PDF text is unavailable."""
    response = bedrock_client.chat_with_document(
        document_bytes=file_bytes,
        document_media_type=PDF_MEDIA_TYPE,
        text_prompt=CV_EXTRACTION_USER_PROMPT,
        system_prompt=CV_EXTRACTION_SYSTEM_PROMPT,
        max_tokens=8192,
        model_id=EXTRACTION_MODEL_ID,
        temperature=0.2,
    )
    return _parse_extraction_response(response, source="pdf")


async def extract_from_pdf(file_bytes: bytes) -> CVImportResult:
    """Extract text from text-based PDFs locally, then structure it with the LLM."""
    try:
        try:
            full_text = _extract_pdf_text(file_bytes)
        except PDFTextExtractionError as e:
            logger.info("Local PDF text extraction skipped: %s", e)
            return _extract_pdf_with_document(file_bytes)

        return _structure_text_with_model(full_text, source="pdf")
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
        full_text = _extract_docx_text(doc)
        if not full_text.strip():
            return CVImportResult(
                success=False,
                source="docx",
                error="The DOCX file appears to be empty or contains no extractable text.",
            )

        return _structure_text_with_model(full_text, source="docx")
    except Exception:
        logger.exception("DOCX extraction failed")
        return CVImportResult(
            success=False,
            source="docx",
            error="Failed to extract CV from DOCX. Please try a different file format.",
        )


__all__ = [
    # Public API
    "extract_from_pdf",
    "extract_from_docx",
    "extract_from_json",
    # Models / constants
    "CVImportResult",
    "ImportSummary",
    "EXTRACTION_MODEL_ID",
    # Internal helpers re-exported for tests
    "_parse_extraction_response",
    "_extract_docx_text",
    "_extract_pdf_text",
    "_structure_text_with_model",
    # Names re-exported so existing @patch targets keep working
    "Document",
    "bedrock_client",
]
