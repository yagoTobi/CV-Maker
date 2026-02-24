import subprocess
import tempfile
import os
import shutil
import base64
import re
import logging
from typing import Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CompileResult:
    success: bool
    pdf_base64: str | None = None
    error: str | None = None
    page_count: int = 0


class LaTeXCompiler:
    # Template configurations
    TEMPLATES = {
        "med-length-proff-cv": {
            "folder": "med-length-proff-cv",
            "files": ["resume.cls"],
            "engine": "pdflatex",
        },
        "deedy-resume": {
            "folder": "deedy-resume",
            "files": ["deedy-resume-openfont.cls", "publications.bib"],
            "directories": ["fonts"],
            "engine": "xelatex",
        },
        "mcdowell-cv": {
            "folder": "mcdowell-cv-master",
            "files": ["mcdowellcv.cls", "tabu.sty", "varwidth.sty"],
            "engine": "xelatex",
        },
    }

    def __init__(self):
        self.pdflatex_path = shutil.which("pdflatex") or "/Library/TeX/texbin/pdflatex"
        self.xelatex_path = shutil.which("xelatex") or "/Library/TeX/texbin/xelatex"
        self.templates_dir = os.path.join(
            os.path.dirname(__file__), "..", "..", "cv-templates"
        )

    def compile(self, tex_content: str, cls_content: str = None, template_id: str = None) -> CompileResult:
        """
        Compile LaTeX content to PDF.

        Returns:
            CompileResult with success status, PDF data, error message, and page count
        """
        logger.info(f"Compiling with template_id: {template_id}")

        with tempfile.TemporaryDirectory() as temp_dir:
            tex_path = os.path.join(temp_dir, "document.tex")

            # Write the main tex file
            with open(tex_path, "w") as f:
                f.write(tex_content)

            # Copy template files based on template_id
            self._copy_template_files(temp_dir, template_id, cls_content)

            # Log files in temp directory
            files_in_dir = os.listdir(temp_dir)
            logger.info(f"Files in compile directory: {files_in_dir}")

            # Determine which LaTeX engine to use
            engine_path = self._get_engine_path(template_id)
            logger.info(f"Using engine: {engine_path}")

            # Run LaTeX twice for proper references
            for _ in range(2):
                result = subprocess.run(
                    [
                        engine_path,
                        "-interaction=nonstopmode",
                        "-halt-on-error",
                        "document.tex"
                    ],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=90  # XeLaTeX can be slower
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
        context_lines = []

        if os.path.exists(log_path):
            with open(log_path, "r", errors="ignore") as f:
                log_content = f.read()
                lines = log_content.split("\n")

                # Find error lines and capture context
                for i, line in enumerate(lines):
                    if line.startswith("!") or "Error:" in line or "Fatal" in line:
                        # Capture the error line and a few lines of context
                        start = max(0, i - 2)
                        end = min(len(lines), i + 5)
                        context = lines[start:end]
                        errors.append("\n".join(context))

        if not errors:
            # Fall back to stdout/stderr
            for line in output.split("\n"):
                if "error" in line.lower() or line.startswith("!"):
                    errors.append(line.strip())

        if errors:
            # Return more context - up to 20 lines total
            full_error = "\n---\n".join(errors[:3])
            if len(full_error) > 2000:
                full_error = full_error[:2000] + "\n... (truncated)"
            return full_error
        return "Unknown compilation error. Check LaTeX syntax."

    def _get_engine_path(self, template_id: str = None) -> str:
        """Get the appropriate LaTeX engine path for a template."""
        if template_id and template_id in self.TEMPLATES:
            engine = self.TEMPLATES[template_id].get("engine", "pdflatex")
            if engine == "xelatex":
                return self.xelatex_path
        return self.pdflatex_path

    def _copy_template_files(self, temp_dir: str, template_id: str = None, cls_content: str = None):
        """Copy template support files (cls, bib, etc.) to temp directory."""
        # If template_id is provided and valid, copy its files
        if template_id and template_id in self.TEMPLATES:
            template_config = self.TEMPLATES[template_id]
            template_folder = os.path.join(self.templates_dir, template_config["folder"])

            # Copy individual files
            for filename in template_config["files"]:
                src_path = os.path.join(template_folder, filename)
                if os.path.exists(src_path):
                    shutil.copy(src_path, os.path.join(temp_dir, filename))

            # Copy directories (e.g., fonts)
            for dirname in template_config.get("directories", []):
                src_dir = os.path.join(template_folder, dirname)
                if os.path.exists(src_dir) and os.path.isdir(src_dir):
                    shutil.copytree(src_dir, os.path.join(temp_dir, dirname))
        else:
            # Fallback: copy default resume.cls for backwards compatibility
            default_cls = os.path.join(
                self.templates_dir, "med-length-proff-cv", "resume.cls"
            )
            if os.path.exists(default_cls):
                shutil.copy(default_cls, os.path.join(temp_dir, "resume.cls"))
            elif cls_content:
                with open(os.path.join(temp_dir, "resume.cls"), "w") as f:
                    f.write(cls_content)


compiler = LaTeXCompiler()
