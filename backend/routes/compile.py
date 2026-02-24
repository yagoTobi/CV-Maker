from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import base64

from services.latex_compiler import compiler

router = APIRouter()


class CompileRequest(BaseModel):
    tex_content: str
    cls_content: str | None = None
    template_id: str | None = None


class CompileResponse(BaseModel):
    success: bool
    pdf_base64: str | None = None
    error: str | None = None
    page_count: int = 0


@router.post("/compile", response_model=CompileResponse)
async def compile_latex(request: CompileRequest):
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
            page_count=result.page_count
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compile/pdf")
async def compile_latex_pdf(request: CompileRequest):
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
