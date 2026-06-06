"""PDF handling for CV extraction.

Note on design: PDFs are not parsed locally. They are sent to Claude (via
Bedrock) as a multimodal document content block, and Claude does the
visual/text parsing in one pass. The actual `bedrock_client.chat_with_document`
call lives in the package `__init__.py` so that test patches against
`services.cv_extractor.bedrock_client` continue to work.

This module exists to document that decision and to provide a stable home for
any future PDF pre-processing (e.g., page-count checks, OCR fallback).
"""

from __future__ import annotations


# Deliberately minimal — see module docstring.
PDF_MEDIA_TYPE = "application/pdf"


def is_likely_empty_pdf(file_bytes: bytes) -> bool:
    """Cheap heuristic for an obviously-empty / corrupt PDF.

    Currently unused by the extraction path (Bedrock will surface its own
    error), but kept here as the natural home for future pre-flight checks.
    """
    return len(file_bytes) < 100 or not file_bytes.startswith(b"%PDF")


__all__ = ["PDF_MEDIA_TYPE", "is_likely_empty_pdf"]
