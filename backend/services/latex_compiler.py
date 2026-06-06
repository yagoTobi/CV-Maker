import subprocess
import tempfile
import os
import shutil
import base64
import re
import logging
from dataclasses import dataclass

from config.templates import TEMPLATES, get_template

logger = logging.getLogger(__name__)


@dataclass
class CompileResult:
    success: bool
    pdf_base64: str | None = None
    error: str | None = None
    page_count: int = 0
    warnings: list[str] | None = None


class LaTeXCompiler:
    # Dangerous LaTeX commands that could execute shell commands or access files
    DANGEROUS_PATTERNS = [
        r'\\write18\s*\{',          # Shell escape
        r'\\immediate',             # Immediate execution (shell escape, file writes)
        r'\\input\s*\|',            # Pipe input (shell command)
        r'\\openin',                # Open file for reading
        r'\\openout',               # Open file for writing
        r'\\read',                  # Read from file
        r'\\closein',               # Close input file
        r'\\closeout',              # Close output file
        r'\\catcode',               # Change category codes (can be used for exploits)
        r'\\csname\s+input\s+\|',   # Alternative pipe input
        r'\\def\\',                 # TeX primitive definition
        r'\\let\\',                 # TeX primitive assignment
        r'\\special\s*\{',          # DVI special commands
    ]

    def __init__(self):
        self.pdflatex_path = shutil.which("pdflatex") or "/Library/TeX/texbin/pdflatex"
        self.xelatex_path = shutil.which("xelatex") or "/Library/TeX/texbin/xelatex"
        self.templates_dir = os.path.join(
            os.path.dirname(__file__), "..", "latex_templates", "_source"
        )
        # Compile dangerous patterns once
        self._dangerous_regex = re.compile(
            '|'.join(self.DANGEROUS_PATTERNS),
            re.IGNORECASE
        )

    def _sanitize_content(self, content: str) -> tuple[str, list[str]]:
        """
        Remove dangerous LaTeX commands that could execute shell commands.
        Returns sanitized content and list of removed patterns.
        """
        removed = []

        def replace_dangerous(match):
            removed.append(match.group(0)[:50])  # Log first 50 chars
            return '% [REMOVED: potentially dangerous command]'

        sanitized = self._dangerous_regex.sub(replace_dangerous, content)
        return sanitized, removed

    def compile(self, tex_content: str, cls_content: str = None, template_id: str = None) -> CompileResult:
        """
        Compile LaTeX content to PDF.

        Returns:
            CompileResult with success status, PDF data, error message, and page count
        """
        logger.info(f"Compiling with template_id: {template_id}")

        # Sanitize content before compilation
        sanitized_content, removed_patterns = self._sanitize_content(tex_content)
        if removed_patterns:
            logger.warning(f"Removed dangerous patterns: {removed_patterns}")

        with tempfile.TemporaryDirectory() as temp_dir:
            tex_path = os.path.join(temp_dir, "document.tex")

            # Write the sanitized tex file
            with open(tex_path, "w") as f:
                f.write(sanitized_content)

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
                try:
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
                except subprocess.TimeoutExpired:
                    logger.warning("LaTeX compilation timed out")
                    return CompileResult(success=False, error="Compilation timed out. Your document may be too complex.")

                if result.returncode != 0:
                    # Extract meaningful error from log
                    log_path = os.path.join(temp_dir, "document.log")
                    error_msg = self._extract_error(log_path, result.stdout + result.stderr)
                    return CompileResult(success=False, error=error_msg)

            # Check for overflow warnings in log
            log_path = os.path.join(temp_dir, "document.log")
            warnings = self._extract_overflow_warnings(log_path)

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
                    page_count=page_count,
                    warnings=warnings or None,
                )
            else:
                return CompileResult(success=False, error="PDF file was not generated")

    def _get_page_count(self, pdf_bytes: bytes) -> int:
        """Extract page count from PDF bytes."""
        try:
            # Parse PDF structure directly (no external dependency needed)
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

    def _extract_overflow_warnings(self, log_path: str) -> list[str]:
        """Parse LaTeX log for Overfull hbox warnings (text overflow)."""
        warnings = []
        if not os.path.exists(log_path):
            return warnings
        try:
            with open(log_path, "r", errors="ignore") as f:
                for line in f:
                    if line.startswith("Overfull \\hbox"):
                        # e.g. "Overfull \hbox (12.3pt too wide) in paragraph at lines 45--47"
                        warnings.append(line.strip())
        except Exception:
            pass
        if warnings:
            count = len(warnings)
            summary = f"{count} line{'s' if count > 1 else ''} overflow{'s' if count == 1 else ''} the page margin — some text may be cut off"
            return [summary]
        return []

    def _get_engine_path(self, template_id: str = None) -> str:
        """Get the appropriate LaTeX engine path for a template."""
        config = get_template(template_id) if template_id else None
        if config and config.engine == "xelatex":
            return self.xelatex_path
        return self.pdflatex_path

    def _copy_template_files(self, temp_dir: str, template_id: str = None, cls_content: str = None):
        """Copy template support files (cls, bib, etc.) to temp directory."""
        config = get_template(template_id) if template_id else None

        if config:
            template_folder = os.path.join(self.templates_dir, config.folder)

            # Copy cls file and extra files
            files_to_copy = [config.cls_file] + config.extra_files
            for filename in files_to_copy:
                src_path = os.path.join(template_folder, filename)
                if os.path.exists(src_path):
                    shutil.copy(src_path, os.path.join(temp_dir, filename))

            # Copy directories (e.g., fonts)
            for dirname in config.extra_dirs:
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
