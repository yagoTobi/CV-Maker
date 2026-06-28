"""
Test LaTeX template rendering across various data scenarios.

This module tests that Jinja2 templates can render CVFormData without errors
and that special characters are properly escaped. It does NOT test actual
LaTeX compilation (that would require a full TeX installation).

Test Coverage:
- All 3 templates (med-length-proff-cv, deedy-resume, mcdowell-cv)
- Minimal data (just name + 1 work entry)
- Maximal data (all sections filled with multiple entries)
- Special characters requiring LaTeX escaping (&, %, $, #, _, {, }, ~, ^, \)
- Empty optional sections (no projects/awards/summary)
- Work entries with empty bullet arrays
- CV with only name (no contact info)
- Section ordering (respects sectionOrder field)
- Direct testing of latex_escape and latex_url_escape filters

Run with: python3 -m pytest tests/test_template_rendering.py -v
"""

import sys
import os
import pytest
import re

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from jinja2 import Environment, FileSystemLoader
from models.cv import (
    CVFormData,
    PersonalInfo,
    WorkEntry,
    EducationEntry,
    SkillCategory,
    Project,
    Award,
    BulletItem,
    SkillItem,
)

# Import the latex_escape function and template setup from generate_latex
from routes.generate_latex import latex_escape, latex_url_escape, _build_personal_items, _flatten_for_template

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


class TestFixtures:
    """Test data fixtures for various scenarios."""

    @staticmethod
    def minimal_data() -> CVFormData:
        """Minimal valid CV: just name and one work entry with one bullet."""
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="John Doe"),
            workExperience=[
                WorkEntry(
                    company="Acme Corp",
                    title="Software Engineer",
                    startDate="2020",
                    endDate="2023",
                    location="New York, NY",
                    bullets=["Developed software"],
                )
            ],
        )

    @staticmethod
    def maximal_data() -> CVFormData:
        """Maximal CV: all sections filled with multiple entries.

        Uses new structured format (BulletItem/SkillItem) to verify rendering
        with ID-bearing data after flattening.
        """
        return CVFormData(
            templateId="med-length-proff-cv",
            sectionOrder=["work", "education", "projects", "skills", "awards"],
            personalInfo=PersonalInfo(
                fullName="Jane Smith",
                email="jane@example.com",
                phone="+1-555-0123",
                location="San Francisco, CA",
                links=[
                    {"url": "https://github.com/janesmith", "label": "GitHub"},
                    {"url": "https://linkedin.com/in/janesmith", "label": "LinkedIn"},
                ],
                summary="Experienced software engineer with a passion for building scalable systems.",
                personalOrder=["email", "phone", "location", "links"],
            ),
            workExperience=[
                WorkEntry(
                    id="test-work-1",
                    company="Tech Giant Inc",
                    title="Senior Software Engineer",
                    startDate="2021",
                    endDate="Present",
                    location="San Francisco, CA",
                    bullets=[
                        BulletItem(id="test-wb-1", text="Led a team of 5 engineers to build microservices architecture"),
                        BulletItem(id="test-wb-2", text="Improved system performance by 40% through optimization"),
                        BulletItem(id="test-wb-3", text="Mentored junior developers and conducted code reviews"),
                    ],
                ),
                WorkEntry(
                    id="test-work-2",
                    company="StartupXYZ",
                    title="Software Engineer",
                    startDate="2019",
                    endDate="2021",
                    location="Remote",
                    bullets=[
                        BulletItem(id="test-wb-4", text="Built RESTful APIs using Python and FastAPI"),
                        BulletItem(id="test-wb-5", text="Implemented CI/CD pipelines with GitHub Actions"),
                    ],
                ),
            ],
            education=[
                EducationEntry(
                    id="test-edu-1",
                    school="University of California, Berkeley",
                    degree="B.S. in Computer Science",
                    startDate="2015",
                    endDate="2019",
                    location="Berkeley, CA",
                    gpa="3.8/4.0",
                    details=[
                        BulletItem(id="test-ed-1", text="Dean's List all semesters"),
                        BulletItem(id="test-ed-2", text="Relevant coursework: Data Structures, Algorithms, Machine Learning"),
                    ],
                ),
            ],
            skills=[
                SkillCategory(
                    id="test-skill-1",
                    category="Languages",
                    skills=[
                        SkillItem(id="test-sk-1", text="Python"),
                        SkillItem(id="test-sk-2", text="JavaScript"),
                        SkillItem(id="test-sk-3", text="TypeScript"),
                        SkillItem(id="test-sk-4", text="Go"),
                        SkillItem(id="test-sk-5", text="Rust"),
                    ],
                ),
                SkillCategory(
                    id="test-skill-2",
                    category="Frameworks",
                    skills=[
                        SkillItem(id="test-sk-6", text="React"),
                        SkillItem(id="test-sk-7", text="FastAPI"),
                        SkillItem(id="test-sk-8", text="Django"),
                        SkillItem(id="test-sk-9", text="Express.js"),
                    ],
                ),
                SkillCategory(
                    id="test-skill-3",
                    category="Tools",
                    skills=[
                        SkillItem(id="test-sk-10", text="Docker"),
                        SkillItem(id="test-sk-11", text="Kubernetes"),
                        SkillItem(id="test-sk-12", text="AWS"),
                        SkillItem(id="test-sk-13", text="Git"),
                        SkillItem(id="test-sk-14", text="PostgreSQL"),
                    ],
                ),
            ],
            projects=[
                Project(
                    id="test-proj-1",
                    name="Open Source Contributor",
                    year="2023",
                    description="Contributed to several high-profile open source projects including React and Kubernetes",
                    technologies="JavaScript, Go",
                ),
                Project(
                    id="test-proj-2",
                    name="Personal Blog Platform",
                    year="2022",
                    description="Built a full-stack blog platform with markdown support and real-time comments",
                    technologies="Next.js, PostgreSQL, WebSockets",
                ),
            ],
            awards=[
                Award(
                    id="test-award-1",
                    year="2023",
                    title="Best Innovation Award",
                    description="For developing an AI-powered code review system",
                ),
                Award(
                    id="test-award-2",
                    year="2022",
                    title="Hackathon Winner",
                    description="First place in company-wide hackathon",
                ),
            ],
        )

    @staticmethod
    def special_chars_data() -> CVFormData:
        """CV with special LaTeX characters that need escaping."""
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(
                fullName="José García-López",
                email="jose@example.com",
                location="São Paulo & Brazil",
            ),
            workExperience=[
                WorkEntry(
                    company="Johnson & Johnson",
                    title="R&D Engineer #1",
                    startDate="2020",
                    endDate="2023",
                    location="New Jersey, USA",
                    bullets=[
                        "Worked on $10M project with 50% ROI",
                        "Used C# and C++ for system programming",
                        "Improved efficiency by ~25% using new algorithms",
                        "Managed team_size of 10+ engineers",
                        "Worked with {complex} data structures",
                        "Achieved 100% test coverage ^annually",
                    ],
                ),
            ],
            education=[
                EducationEntry(
                    school="MIT & Stanford (Joint Program)",
                    degree="M.S. in Computer Science & Engineering",
                    startDate="2018",
                    endDate="2020",
                    location="Cambridge, MA",
                    gpa="3.9/4.0",
                    details=["Thesis: \"Machine Learning & AI: A $1M Problem\""],
                ),
            ],
            skills=[
                SkillCategory(
                    category="Programming",
                    skills=["C#", "C++", "Python 3.10+", "Java & Kotlin", "R_Stats"],
                ),
                SkillCategory(
                    category="Special Chars",
                    skills=["LaTeX", "100% proficient", "$bash", "#scripting", "git~flow"],
                ),
            ],
        )

    @staticmethod
    def empty_optional_sections() -> CVFormData:
        """CV with empty optional sections (projects, awards, summary)."""
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(
                fullName="Alice Brown",
                email="alice@example.com",
                phone="555-0100",
                location="Boston, MA",
                # No summary
            ),
            workExperience=[
                WorkEntry(
                    company="Corp ABC",
                    title="Developer",
                    startDate="2022",
                    endDate="Present",
                    location="Boston, MA",
                    bullets=["Wrote code", "Fixed bugs"],
                ),
            ],
            education=[
                EducationEntry(
                    school="Boston University",
                    degree="B.S. Computer Science",
                    startDate="2018",
                    endDate="2022",
                    location="Boston, MA",
                ),
            ],
            skills=[
                SkillCategory(
                    category="Technical",
                    skills=["Python", "JavaScript"],
                ),
            ],
            # projects=None (or empty list)
            # awards=None (or empty list)
        )

    @staticmethod
    def empty_bullets() -> CVFormData:
        """CV with work entries that have empty bullets arrays."""
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="Bob Wilson"),
            workExperience=[
                WorkEntry(
                    company="No Details Corp",
                    title="Mystery Role",
                    startDate="2020",
                    endDate="2021",
                    location="Unknown",
                    bullets=[],  # Empty bullets
                ),
                WorkEntry(
                    company="Some Company",
                    title="Some Title",
                    startDate="2021",
                    endDate="2023",
                    location="Somewhere",
                    bullets=["Did something"],
                ),
            ],
        )

    @staticmethod
    def no_contact_info() -> CVFormData:
        """CV with only name, no other contact information."""
        return CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(
                fullName="Anonymous Person",
                # All contact fields empty/missing
            ),
            workExperience=[
                WorkEntry(
                    company="Secret Company",
                    title="Classified",
                    startDate="Unknown",
                    endDate="Present",
                    location="Undisclosed",
                    bullets=["Cannot disclose responsibilities"],
                ),
            ],
        )


class TestTemplateRendering:
    """Test suite for LaTeX template rendering."""

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_minimal_render(self, template_id: str, template_file: str):
        """Test that minimal data renders without errors."""
        data = TestFixtures.minimal_data()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        # Should not raise any exceptions
        latex_output = template.render(**context)

        # Basic assertions
        assert latex_output is not None
        assert "\\begin{document}" in latex_output
        assert "\\end{document}" in latex_output
        # Name might be split in some templates
        assert "John" in latex_output or "John Doe" in latex_output
        assert "Acme Corp" in latex_output

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_maximal_render(self, template_id: str, template_file: str):
        """Test that maximal data renders without errors."""
        data = TestFixtures.maximal_data()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        latex_output = template.render(**context)

        assert "\\begin{document}" in latex_output
        assert "\\end{document}" in latex_output
        # Name might be split in some templates
        assert ("Jane" in latex_output and "Smith" in latex_output) or "Jane Smith" in latex_output
        assert "Tech Giant Inc" in latex_output
        assert "University of California, Berkeley" in latex_output

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_special_chars_escaped(self, template_id: str, template_file: str):
        """Test that special LaTeX characters are properly escaped."""
        data = TestFixtures.special_chars_data()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        latex_output = template.render(**context)

        # Check that special characters are escaped
        assert "Johnson \\& Johnson" in latex_output  # & -> \&
        assert "C\\#" in latex_output  # # -> \#
        assert "\\$10M" in latex_output  # $ -> \$
        assert "50\\%" in latex_output  # % -> \%

        # Check that raw special chars don't appear outside LaTeX commands
        # Split into lines to check context
        lines = latex_output.split('\n')
        in_tabular = False
        for line in lines:
            # Track if we're in a tabular environment
            if '\\begin{tabular}' in line:
                in_tabular = True
            elif '\\end{tabular}' in line:
                in_tabular = False

            # Check for unescaped & outside tabular environments
            if '&' in line and not in_tabular:
                # Must be escaped with backslash
                unescaped = re.search(r'(?<!\\)&', line)
                assert unescaped is None, f"Unescaped & found outside tabular: {line}"

        # Check for unescaped # (not part of \#)
        unescaped_hash = re.search(r'(?<!\\)#', latex_output)
        assert unescaped_hash is None, f"Unescaped # found at position {unescaped_hash.start() if unescaped_hash else 'N/A'}"

        # Check for unescaped % (not part of \% and not a comment)
        lines = latex_output.split('\n')
        for line in lines:
            if '%' in line and not line.strip().startswith('%'):  # Not a comment line
                # Check that all % are escaped, except for LaTeX line-end % to prevent spaces
                unescaped_percent = re.search(r'(?<!\\)%', line)
                if unescaped_percent:
                    # Allow % at end of LaTeX commands (like \address{% or \namesection{...}{%)
                    # This is valid LaTeX to prevent unwanted spaces
                    if not (line.rstrip().endswith('{%') or line.strip().startswith('%')):
                        assert False, f"Unescaped % found in line: {line}"

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_empty_optional_sections(self, template_id: str, template_file: str):
        """Test that empty optional sections don't cause rendering errors."""
        data = TestFixtures.empty_optional_sections()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        latex_output = template.render(**context)

        assert "\\begin{document}" in latex_output
        assert "\\end{document}" in latex_output
        # Name might be split in some templates
        assert ("Alice" in latex_output and "Brown" in latex_output) or "Alice Brown" in latex_output

        # Projects and Awards sections should not appear if empty
        # (Though section headers might still appear in some templates)

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_empty_bullets(self, template_id: str, template_file: str):
        """Test that work entries with empty bullets render correctly."""
        data = TestFixtures.empty_bullets()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        latex_output = template.render(**context)

        assert "\\begin{document}" in latex_output
        assert "\\end{document}" in latex_output
        # Name might be split in some templates
        assert ("Bob" in latex_output and "Wilson" in latex_output) or "Bob Wilson" in latex_output
        assert "No Details Corp" in latex_output
        assert "Some Company" in latex_output

    @pytest.mark.parametrize("template_id,template_file", TEMPLATE_FILES.items())
    def test_no_contact_info(self, template_id: str, template_file: str):
        """Test CV with only name, no contact info."""
        data = TestFixtures.no_contact_info()
        data.templateId = template_id

        template = jinja_env.get_template(template_file)
        context = self._build_context(data)

        latex_output = template.render(**context)

        assert "\\begin{document}" in latex_output
        assert "\\end{document}" in latex_output
        # Name might be split in some templates
        assert ("Anonymous" in latex_output and "Person" in latex_output) or "Anonymous Person" in latex_output
        assert "Secret Company" in latex_output

    def test_latex_escape_function(self):
        """Test the latex_escape filter function directly."""
        # Test all special characters
        assert latex_escape("&") == "\\&"
        assert latex_escape("%") == "\\%"
        assert latex_escape("$") == "\\$"
        assert latex_escape("#") == "\\#"
        assert latex_escape("_") == "\\_"
        assert latex_escape("{") == "\\{"
        assert latex_escape("}") == "\\}"
        assert latex_escape("~") == "\\textasciitilde{}"
        assert latex_escape("^") == "\\^{}"
        assert latex_escape("\\") == "\\textbackslash{}"

        # Test combined string
        assert latex_escape("50% of $100 & C#") == "50\\% of \\$100 \\& C\\#"

        # Test that normal text is unchanged
        assert latex_escape("Normal text") == "Normal text"

    def test_latex_url_escape_function(self):
        """Test the latex_url_escape filter function directly."""
        # URLs only need % and # escaped
        assert latex_url_escape("https://example.com/page#section") == "https://example.com/page\\#section"
        assert latex_url_escape("https://example.com/search?q=50%") == "https://example.com/search?q=50\\%"
        assert latex_url_escape("https://github.com/user/repo") == "https://github.com/user/repo"

        # Other special characters should NOT be escaped in URLs
        assert latex_url_escape("https://example.com/path_to/file") == "https://example.com/path_to/file"
        assert latex_url_escape("https://example.com?a=1&b=2") == "https://example.com?a=1&b=2"

    def test_section_ordering(self):
        """Test that section_order is respected in rendering."""
        data = TestFixtures.maximal_data()
        # Custom section order
        data.sectionOrder = ["skills", "education", "work", "awards", "projects"]

        template = jinja_env.get_template(TEMPLATE_FILES["med-length-proff-cv"])
        context = self._build_context(data)

        latex_output = template.render(**context)

        # Find positions of section headers in the output
        # Note: We look for the section commands, not the titles
        skills_pos = latex_output.find("\\begin{rSection}{Skills}")
        education_pos = latex_output.find("\\begin{rSection}{Education}")
        work_pos = latex_output.find("\\begin{rSection}{Experience}")
        awards_pos = latex_output.find("\\begin{rSection}{Awards}")
        projects_pos = latex_output.find("\\begin{rSection}{Projects}")

        # Verify order (some might be -1 if not found, which is OK for this template)
        if skills_pos > 0 and education_pos > 0:
            assert skills_pos < education_pos, "Skills should come before Education"
        if education_pos > 0 and work_pos > 0:
            assert education_pos < work_pos, "Education should come before Work"
        if work_pos > 0 and awards_pos > 0:
            assert work_pos < awards_pos, "Work should come before Awards"
        if awards_pos > 0 and projects_pos > 0:
            assert awards_pos < projects_pos, "Awards should come before Projects"

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


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])