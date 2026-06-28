from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
import base64
import logging

from dependencies import get_current_user
from services.latex_compiler import compiler

router = APIRouter()
logger = logging.getLogger(__name__)


class CompileRequest(BaseModel):
    tex_content: str = Field(max_length=500_000)
    cls_content: str | None = None
    template_id: str | None = None


class CompileResponse(BaseModel):
    success: bool
    pdf_base64: str | None = None
    error: str | None = None
    page_count: int = 0
    warnings: list[str] | None = None


@router.post("/compile", response_model=CompileResponse)
async def compile_latex(request: CompileRequest, user_id: str = Depends(get_current_user)):
    """Compile LaTeX content to PDF."""
    try:
        result = compiler.compile(
            request.tex_content,
            cls_content=request.cls_content,
            template_id=request.template_id
        )

        return CompileResponse(
            success=result.success,
            pdf_base64=result.pdf_base64,
            error=result.error,
            page_count=result.page_count,
            warnings=result.warnings,
        )

    except Exception:
        logger.exception("LaTeX compilation error")
        raise HTTPException(status_code=500, detail="An internal error occurred")


@router.post("/compile/pdf")
async def compile_latex_pdf(request: CompileRequest, user_id: str = Depends(get_current_user)):
    """Compile LaTeX and return PDF directly."""
    try:
        result = compiler.compile(
            request.tex_content,
            cls_content=request.cls_content,
            template_id=request.template_id
        )

        if result.success and result.pdf_base64:
            pdf_bytes = base64.b64decode(result.pdf_base64)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": "inline; filename=cv.pdf",
                    "X-Page-Count": str(result.page_count)
                }
            )
        else:
            raise HTTPException(status_code=400, detail=result.error)

    except HTTPException:
        raise
    except Exception:
        logger.exception("LaTeX PDF compilation error")
        raise HTTPException(status_code=500, detail="An internal error occurred")
