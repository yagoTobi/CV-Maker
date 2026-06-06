"""PDF text extraction for CV import.

Text-based PDFs are parsed locally with pypdf so the LLM only handles the
schema-structuring step. If local extraction cannot read useful text, the
package entry point can fall back to the existing Bedrock document path.
"""

from __future__ import annotations

from io import BytesIO

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - exercised in environments without pypdf
    PdfReader = None  # type: ignore[assignment]

PDF_MEDIA_TYPE = "application/pdf"


class PDFTextExtractionError(ValueError):
    """Raised when a PDF has no usable local text layer."""


def is_likely_empty_pdf(file_bytes: bytes) -> bool:
    """Cheap heuristic for an obviously-empty / corrupt PDF.

    This is intentionally shallow; pypdf still does the real parsing.
    """
    return len(file_bytes) < 100 or not file_bytes.startswith(b"%PDF")


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract selectable text from a PDF.

    Raises PDFTextExtractionError when the PDF is corrupt, image-only, or when
    pypdf is unavailable in the runtime.
    """
    if PdfReader is None:
        raise PDFTextExtractionError("pypdf is not installed")
    if is_likely_empty_pdf(file_bytes):
        raise PDFTextExtractionError("PDF is empty or invalid")

    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        raise PDFTextExtractionError("PDF could not be parsed") from exc

    parts: list[str] = []
    for index, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            raise PDFTextExtractionError("PDF text layer could not be read") from exc

        text = text.strip()
        if text:
            parts.append(f"--- Page {index + 1} ---\n{text}")

    full_text = "\n\n".join(parts).strip()
    if not full_text:
        raise PDFTextExtractionError("PDF has no selectable text")

    return full_text


__all__ = [
    "PDF_MEDIA_TYPE",
    "PDFTextExtractionError",
    "PdfReader",
    "extract_pdf_text",
    "is_likely_empty_pdf",
]
