"""
Test LaTeX template compilation to PDF.

This module extends test_template_rendering.py by actually compiling the
rendered LaTeX through pdflatex/xelatex to verify it produces valid PDFs.

Test scenarios:
- Minimal data (name + 1 work entry)
- Maximal data (all sections filled)
- Special characters (LaTeX escaping edge cases)
- Empty optional sections (no projects/awards/summary)

All compilation tests are marked @pytest.mark.slow since they take 2-5 seconds each.
Use `pytest -m "not slow"` to skip these tests.

Tests are also skipped if the required LaTeX engine is not installed.

Run with: python3 -m pytest tests/test_template_compilation.py -v
"""

import sys
import os
import pytest
import shutil
from typing import Optional

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from jinja2 import Environment, FileSystemLoader
from models.cv import CVFormData, BulletItem
from routes.generate_latex import latex_escape, latex_url_escape, _build_personal_items, _flatten_for_template
from services.latex_compiler import LaTeXCompiler, CompileResult
from config.templates import get_template

# Import test fixtures from the rendering tests
sys.path.insert(0, os.path.dirname(__file__))
from test_template_rendering import TestFixtures

# Template directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "latex_templates")

# Build Jinja2 environment with custom delimiters (same as in generate_latex.py)
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    variable_start_string="((",
    variable_end_string="))",
    block_start_string="(%",
    block_end_string="%)",
    comment_start_string="(#",
    comment_end_string="#)",
    keep_trailing_newline=True,
)
jinja_env.filters["latex_escape"] = latex_escape
jinja_env.filters["latex_url_escape"] = latex_url_escape

# Templates to test
TEMPLATE_FILES = {
    "med-length-proff-cv": "med-length-proff-cv.tex.j2",
    "deedy-resume": "deedy-resume.tex.j2",
    "mcdowell-cv": "mcdowell-cv.tex.j2",
}

# Check for LaTeX engines
PDFLATEX_AVAILABLE = shutil.which("pdflatex") is not None
XELATEX_AVAILABLE = shutil.which("xelatex") is not None


class TestTemplateCompilation:
    """Test suite for LaTeX template compilation to PDF."""

    @pytest.fixture
    def compiler(self):
        """Create a LaTeX compiler instance."""
        return LaTeXCompiler()

    def _build_context(self, form_data: CVFormData) -> dict:
        """Build template rendering context (mirrors generate_latex.py logic).

        Uses _flatten_for_template to convert BulletItem/SkillItem to strings,
        matching the production generate_latex route behavior.
        """
        flat = _flatten_for_template(form_data)
        personal_order = form_data.personalInfo.personalOrder or ["phone", "email", "location", "links"]
        return {
            "personal": form_data.personalInfo,
            "personal_items": _build_personal_items(form_data.personalInfo, personal_order),
            "work": flat.get("workExperience", []),
            "education": flat.get("education", []),
            "skills": flat.get("skills", []),
            "projects": flat.get("projects", []),
            "awards": flat.get("awards", []),
            "section_order": form_data.sectionOrder or ["work", "education", "skills", "projects", "awards"],
        }

    def _render_and_compile(
        self,
        compiler: LaTeXCompiler,
        template_id: str,
        form_data: CVFormData
    ) -> CompileResult:
        """Render template and compile to PDF."""
        # Update template ID in form data
        form_data.templateId = template_id

        # Get template file
        template_file = TEMPLATE_FILES[template_id]
        template = jinja_env.get_template(template_file)

        # Build context
        context = self._build_context(form_data)

        # Render LaTeX
        tex_content = template.render(**context)

        # Compile to PDF
        result = compiler.compile(tex_content, template_id=template_id)
        return result

    @pytest.mark.slow
    @pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
    def test_minimal_professional_cv(self, compiler):
        """Test minimal data compilation for Professional CV (pdflatex)."""
        data = TestFixtures.minimal_data()
        result = self._render_and_compile(compiler, "med-length-proff-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_minimal_deedy_resume(self, compiler):
        """Test minimal data compilation for Deedy Resume (xelatex)."""
        data = TestFixtures.minimal_data()
        result = self._render_and_compile(compiler, "deedy-resume", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_minimal_mcdowell_cv(self, compiler):
        """Test minimal data compilation for McDowell CV (xelatex)."""
        data = TestFixtures.minimal_data()
        result = self._render_and_compile(compiler, "mcdowell-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
    def test_maximal_professional_cv(self, compiler):
        """Test maximal data compilation for Professional CV (pdflatex)."""
        data = TestFixtures.maximal_data()
        result = self._render_and_compile(compiler, "med-length-proff-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_maximal_deedy_resume(self, compiler):
        """Test maximal data compilation for Deedy Resume (xelatex)."""
        data = TestFixtures.maximal_data()
        result = self._render_and_compile(compiler, "deedy-resume", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_maximal_mcdowell_cv(self, compiler):
        """Test maximal data compilation for McDowell CV (xelatex)."""
        data = TestFixtures.maximal_data()
        result = self._render_and_compile(compiler, "mcdowell-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
    def test_special_chars_professional_cv(self, compiler):
        """Test special characters compilation for Professional CV (pdflatex)."""
        data = TestFixtures.special_chars_data()
        result = self._render_and_compile(compiler, "med-length-proff-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_special_chars_deedy_resume(self, compiler):
        """Test special characters compilation for Deedy Resume (xelatex)."""
        data = TestFixtures.special_chars_data()
        result = self._render_and_compile(compiler, "deedy-resume", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_special_chars_mcdowell_cv(self, compiler):
        """Test special characters compilation for McDowell CV (xelatex)."""
        data = TestFixtures.special_chars_data()
        result = self._render_and_compile(compiler, "mcdowell-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not PDFLATEX_AVAILABLE, reason="pdflatex not installed")
    def test_empty_sections_professional_cv(self, compiler):
        """Test empty optional sections compilation for Professional CV (pdflatex)."""
        data = TestFixtures.empty_optional_sections()
        result = self._render_and_compile(compiler, "med-length-proff-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_empty_sections_deedy_resume(self, compiler):
        """Test empty optional sections compilation for Deedy Resume (xelatex)."""
        data = TestFixtures.empty_optional_sections()
        result = self._render_and_compile(compiler, "deedy-resume", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.skipif(not XELATEX_AVAILABLE, reason="xelatex not installed")
    def test_empty_sections_mcdowell_cv(self, compiler):
        """Test empty optional sections compilation for McDowell CV (xelatex)."""
        data = TestFixtures.empty_optional_sections()
        result = self._render_and_compile(compiler, "mcdowell-cv", data)

        assert result.success, f"Compilation failed: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0
        assert result.page_count >= 1

    @pytest.mark.slow
    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_compilation_with_unicode(self, compiler, template_id, template_file):
        """Test compilation with Unicode characters (accented names, etc.)."""
        # Skip if required engine not available
        template_config = get_template(template_id)
        if template_config.engine == "xelatex" and not XELATEX_AVAILABLE:
            pytest.skip("xelatex not installed")
        elif template_config.engine == "pdflatex" and not PDFLATEX_AVAILABLE:
            pytest.skip("pdflatex not installed")

        # Create data with various Unicode characters
        data = TestFixtures.minimal_data()
        data.personalInfo.fullName = "François Müller-García"
        data.personalInfo.location = "Zürich, Switzerland"
        data.workExperience[0].company = "Société Générale"
        data.workExperience[0].bullets = [
            BulletItem(text="Développé des applications en français"),
            BulletItem(text="Worked with über-complex systems"),
            BulletItem(text="Managed €10M budget efficiently"),
        ]

        result = self._render_and_compile(compiler, template_id, data)

        assert result.success, f"Compilation failed with Unicode: {result.error}"
        assert result.pdf_base64 is not None
        assert len(result.pdf_base64) > 0

    @pytest.mark.slow
    @pytest.mark.parametrize("template_id", ["med-length-proff-cv", "deedy-resume", "mcdowell-cv"])
    def test_pdf_has_reasonable_size(self, compiler, template_id):
        """Test that generated PDFs have reasonable file sizes."""
        # Skip if required engine not available
        template_config = get_template(template_id)
        if template_config.engine == "xelatex" and not XELATEX_AVAILABLE:
            pytest.skip("xelatex not installed")
        elif template_config.engine == "pdflatex" and not PDFLATEX_AVAILABLE:
            pytest.skip("pdflatex not installed")

        data = TestFixtures.maximal_data()
        result = self._render_and_compile(compiler, template_id, data)

        assert result.success, f"Compilation failed: {result.error}"

        # Decode base64 to get actual size
        import base64
        pdf_bytes = base64.b64decode(result.pdf_base64)
        pdf_size_kb = len(pdf_bytes) / 1024

        # PDFs should be between 10KB and 500KB (reasonable for 1-2 page CVs)
        assert 10 < pdf_size_kb < 500, f"PDF size {pdf_size_kb:.1f}KB is outside reasonable range"

        # XeLaTeX templates tend to be larger due to embedded fonts
        if template_config.engine == "xelatex":
            assert pdf_size_kb < 300, f"XeLaTeX PDF too large: {pdf_size_kb:.1f}KB"
        else:
            assert pdf_size_kb < 100, f"PDFLaTeX PDF too large: {pdf_size_kb:.1f}KB"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
