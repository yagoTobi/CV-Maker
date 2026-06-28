"""
CV import route — accepts PDF, DOCX, or JSON uploads
and returns structured CVFormData via AI extraction.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import logging

from dependencies import get_current_user
from services.cv_extractor import extract_from_pdf, extract_from_docx, extract_from_json

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".json"}
MIME_MAP = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/json": ".json",
    "text/json": ".json",
}

EXTRACTORS = {
    ".pdf": extract_from_pdf,
    ".docx": extract_from_docx,
    ".json": extract_from_json,
}


def _detect_extension(filename: str, content_type: str | None) -> str | None:
    """Determine file extension from filename or MIME type."""
    for ext in ALLOWED_EXTENSIONS:
        if filename.lower().endswith(ext):
            return ext
    if content_type:
        return MIME_MAP.get(content_type)
    return None


@router.post("/cv-import")
async def import_cv(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    """Import a CV from PDF, DOCX, or JSON and return extracted CVFormData."""
    ext = _detect_extension(file.filename or "", file.content_type)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, DOCX, or JSON file.",
        )

    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    result = await EXTRACTORS[ext](file_bytes)

    if not result.success:
        logger.warning("CV import failed (%s): %s", result.source, result.error)
        return {
            "success": False,
            "error": result.error,
            "source": result.source,
            "warnings": result.warnings,
        }

    logger.info("CV imported successfully from %s", result.source)
    return {
        "success": True,
        "formData": result.form_data,
        "source": result.source,
        "confidence": result.confidence,
        "summary": result.summary,
        "warnings": result.warnings,
    }
