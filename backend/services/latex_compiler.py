import subprocess
import tempfile
import os
import shutil
import base64
import re
from typing import Tuple
from dataclasses import dataclass


@dataclass
class CompileResult:
    success: bool
    pdf_base64: str | None = None
    error: str | None = None
    page_count: int = 0


class LaTeXCompiler:
    def __init__(self):
        self.pdflatex_path = shutil.which("pdflatex") or "/Library/TeX/texbin/pdflatex"

    def compile(self, tex_content: str, cls_content: str = None) -> CompileResult:
        """
        Compile LaTeX content to PDF.

        Returns:
            CompileResult with success status, PDF data, error message, and page count
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            tex_path = os.path.join(temp_dir, "document.tex")

            # Write the main tex file
            with open(tex_path, "w") as f:
                f.write(tex_content)

            # Copy the resume.cls file if provided, otherwise try to copy from template
            cls_source = os.path.join(
                os.path.dirname(__file__), "..", "..", "cv-templates", "med-length-proff-cv", "resume.cls"
            )
            if os.path.exists(cls_source):
                shutil.copy(cls_source, os.path.join(temp_dir, "resume.cls"))
            elif cls_content:
                with open(os.path.join(temp_dir, "resume.cls"), "w") as f:
                    f.write(cls_content)

            # Run pdflatex twice for proper references
            for _ in range(2):
                result = subprocess.run(
                    [
                        self.pdflatex_path,
                        "-interaction=nonstopmode",
                        "-halt-on-error",
                        "document.tex"
                    ],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.returncode != 0:
                    # Extract meaningful error from log
                    log_path = os.path.join(temp_dir, "document.log")
                    error_msg = self._extract_error(log_path, result.stdout + result.stderr)
                    return CompileResult(success=False, error=error_msg)

            # Read the generated PDF
            pdf_path = os.path.join(temp_dir, "document.pdf")
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()

                page_count = self._get_page_count(pdf_bytes)
                pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

                return CompileResult(
                    success=True,
                    pdf_base64=pdf_base64,
                    page_count=page_count
                )
            else:
                return CompileResult(success=False, error="PDF file was not generated")

    def _get_page_count(self, pdf_bytes: bytes) -> int:
        """Extract page count from PDF bytes."""
        try:
            # Try PyPDF2 first (most reliable)
            try:
                import io
                from PyPDF2 import PdfReader
                reader = PdfReader(io.BytesIO(pdf_bytes))
                return len(reader.pages)
            except ImportError:
                pass

            # Fallback: Parse PDF structure
            pdf_text = pdf_bytes.decode('latin-1')

            # Look for the root Pages object with /Count
            # Pattern: /Type /Pages ... /Count N
            # We need to find the Pages object (not Page) and get its Count
            pages_match = re.search(r'/Type\s*/Pages\s*[^>]*?/Count\s*(\d+)', pdf_text, re.DOTALL)
            if pages_match:
                return int(pages_match.group(1))

            # Alternative: count individual /Type /Page entries (not /Pages)
            # Use word boundary to avoid matching /Pages
            page_count = len(re.findall(r'/Type\s*/Page\s*[^s]', pdf_text))
            if page_count > 0:
                return page_count

            return 1
        except Exception:
            return 1  # Default to 1 if we can't determine

    def _extract_error(self, log_path: str, output: str) -> str:
        """Extract meaningful error messages from LaTeX output."""
        errors = []

        if os.path.exists(log_path):
            with open(log_path, "r", errors="ignore") as f:
                log_content = f.read()
                # Look for error lines
                for line in log_content.split("\n"):
                    if line.startswith("!") or "Error:" in line:
                        errors.append(line.strip())

        if not errors:
            # Fall back to stdout/stderr
            for line in output.split("\n"):
                if "error" in line.lower() or line.startswith("!"):
                    errors.append(line.strip())

        if errors:
            return "\n".join(errors[:5])  # Return first 5 errors
        return "Unknown compilation error"


compiler = LaTeXCompiler()
