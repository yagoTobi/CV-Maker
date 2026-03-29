"""
Unit tests for _parse_extraction_response() in backend/services/cv_extractor.py.

This function parses Claude's JSON extraction response and builds a CVImportResult.
It handles markdown fence stripping, truncation detection, JSON parsing errors,
Pydantic validation, confidence/warning extraction, and summary calculation.

Test Coverage:
- Valid JSON: clean response produces success with correct form_data, confidence, summary
- Markdown fences: JSON wrapped in ```json...``` is stripped correctly
- Truncation detection: responses not ending with } trigger truncation error
- Malformed JSON: parsing errors return failure with appropriate error message
- Missing _confidence: defaults to medium confidence
- Missing _warnings: defaults to empty array (converted to None in result)
- Pydantic validation failures: invalid schema adds warning but doesn't fail
- Summary calculation: workEntries, educationEntries, etc. counts are correct
- Edge cases: empty arrays, minimal data, maximal data, templateId stripping

Run with: cd backend && python3 -m pytest tests/test_cv_extractor.py -v
"""

import json
import os
import sys

import pytest

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.cv_extractor import (
    CVImportResult,
    _parse_extraction_response,
)

# ---------------------------------------------------------------------------
# Fixture data builders
# ---------------------------------------------------------------------------


def _minimal_valid_response() -> dict:
    """Minimal valid CV JSON that passes Pydantic validation."""
    return {
        "personalInfo": {
            "fullName": "Jane Doe",
            "email": "jane@example.com",
            "phone": "",
            "location": "",
            "links": [],
        },
        "workExperience": [],
        "education": [],
        "skills": [],
        "_confidence": {"overall": "high", "fields": {}},
        "_warnings": [],
    }


def _full_valid_response() -> dict:
    """Full CV JSON with all sections populated."""
    return {
        "sectionOrder": [
            "work",
            "education",
            "skills",
            "projects",
            "awards",
            "additional-0",
        ],
        "personalInfo": {
            "fullName": "John Smith",
            "email": "john@example.com",
            "phone": "+1-555-0100",
            "location": "San Francisco, CA",
            "links": [
                {"label": "LinkedIn", "url": "https://linkedin.com/in/johnsmith"},
                {"label": "GitHub", "url": "https://github.com/johnsmith"},
            ],
            "summary": "Senior software engineer with 10 years of experience.",
        },
        "workExperience": [
            {
                "company": "Acme Corp",
                "title": "Senior Engineer",
                "startDate": "Jan 2020",
                "endDate": "Present",
                "location": "San Francisco, CA",
                "bullets": [
                    "Led team of 5 engineers on platform migration",
                    "Reduced latency by 40% through caching strategy",
                ],
            },
            {
                "company": "StartupXYZ",
                "title": "Software Engineer",
                "startDate": "Jun 2017",
                "endDate": "Dec 2019",
                "location": "New York, NY",
                "bullets": ["Built REST API serving 1M+ requests/day"],
            },
        ],
        "education": [
            {
                "school": "MIT",
                "degree": "B.S. Computer Science",
                "startDate": "Sep 2013",
                "endDate": "Jun 2017",
                "location": "Cambridge, MA",
                "gpa": "3.8",
                "details": ["Dean's List", "Teaching Assistant for CS101"],
            },
        ],
        "skills": [
            {"category": "Languages", "skills": ["Python", "TypeScript", "Go"]},
            {"category": "Tools", "skills": ["Docker", "Kubernetes", "AWS"]},
            {"category": "Frameworks", "skills": ["FastAPI", "React", "Django"]},
        ],
        "projects": [
            {
                "name": "CV Maker",
                "year": "2024",
                "description": "AI-powered CV builder",
                "technologies": "React, FastAPI, AWS Bedrock",
                "bullets": ["Implemented drag-and-drop section ordering"],
            },
            {
                "name": "Data Pipeline",
                "year": "2023",
                "description": "Real-time ETL pipeline",
                "technologies": "Python, Kafka, Spark",
                "bullets": [],
            },
        ],
        "awards": [
            {
                "year": "2022",
                "title": "Engineer of the Year",
                "description": "Company-wide award",
            },
            {"year": "2019", "title": "Hackathon Winner", "description": ""},
        ],
        "additionalSections": [
            {
                "title": "Volunteer Work",
                "entries": [
                    {
                        "title": "Code Mentor",
                        "subtitle": "Code.org",
                        "startDate": "Jan 2021",
                        "endDate": "Present",
                        "location": "Remote",
                        "description": "Mentoring underrepresented students",
                        "bullets": ["Mentored 20+ students"],
                    }
                ],
            }
        ],
        "_confidence": {
            "overall": "high",
            "fields": {
                "workExperience[1].endDate": "medium",
                "education[0].gpa": "medium",
            },
        },
        "_warnings": ["Phone number format may be incorrect"],
    }


# ---------------------------------------------------------------------------
# Test class: Valid JSON responses
# ---------------------------------------------------------------------------


class TestValidJsonResponse:
    """Tests for successful parsing of well-formed JSON responses."""

    def test_minimal_valid_response_succeeds(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.source == "pdf"
        assert result.error is None
        assert result.form_data is not None

    def test_minimal_response_has_correct_personal_info(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"
        assert result.form_data["personalInfo"]["email"] == "jane@example.com"

    def test_minimal_response_summary_counts_are_zero(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.workEntries == 0
        assert result.summary.educationEntries == 0
        assert result.summary.skillCategories == 0
        assert result.summary.projects == 0
        assert result.summary.awards == 0
        assert result.summary.additionalSections == 0

    def test_full_response_succeeds(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="docx")

        assert result.success is True
        assert result.source == "docx"
        assert result.error is None

    def test_full_response_summary_counts(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="docx")

        assert result.summary is not None
        assert result.summary.workEntries == 2
        assert result.summary.educationEntries == 1
        assert result.summary.skillCategories == 3
        assert result.summary.projects == 2
        assert result.summary.awards == 2
        assert result.summary.additionalSections == 1

    def test_full_response_confidence_extracted(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.confidence is not None
        assert result.confidence["overall"] == "high"
        assert "workExperience[1].endDate" in result.confidence["fields"]
        assert result.confidence["fields"]["workExperience[1].endDate"] == "medium"

    def test_full_response_warnings_extracted(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.warnings is not None
        assert "Phone number format may be incorrect" in result.warnings

    def test_confidence_and_warnings_stripped_from_form_data(self):
        """_confidence and _warnings should be popped from the data dict,
        not present in form_data."""
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        assert "_confidence" not in result.form_data
        assert "_warnings" not in result.form_data

    def test_template_id_stripped_from_form_data(self):
        """templateId in response should be stripped since it's not part of form_data."""
        data = _minimal_valid_response()
        data["templateId"] = "deedy-resume"
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        assert result.success is True
        assert "templateId" not in result.form_data

    def test_source_parameter_passed_through(self):
        raw = json.dumps(_minimal_valid_response())

        for source in ["pdf", "docx", "json"]:
            result = _parse_extraction_response(raw, source=source)
            assert result.source == source

    def test_section_order_preserved_in_form_data(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        assert result.form_data["sectionOrder"] == [
            "work",
            "education",
            "skills",
            "projects",
            "awards",
            "additional-0",
        ]

    def test_work_experience_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        work = result.form_data["workExperience"]
        assert len(work) == 2
        assert work[0]["company"] == "Acme Corp"
        assert work[0]["title"] == "Senior Engineer"
        assert work[0]["endDate"] == "Present"
        assert len(work[0]["bullets"]) == 2
        assert work[1]["company"] == "StartupXYZ"

    def test_education_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        edu = result.form_data["education"]
        assert len(edu) == 1
        assert edu[0]["school"] == "MIT"
        assert edu[0]["gpa"] == "3.8"
        assert len(edu[0]["details"]) == 2

    def test_skills_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        skills = result.form_data["skills"]
        assert len(skills) == 3
        assert skills[0]["category"] == "Languages"
        # After ensure_ids, skills are structured: [{"id": "...", "text": "Python"}, ...]
        skill_texts = [s["text"] if isinstance(s, dict) else s for s in skills[0]["skills"]]
        assert "Python" in skill_texts

    def test_projects_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        projects = result.form_data["projects"]
        assert len(projects) == 2
        assert projects[0]["name"] == "CV Maker"
        assert projects[0]["technologies"] == "React, FastAPI, AWS Bedrock"

    def test_awards_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        awards = result.form_data["awards"]
        assert len(awards) == 2
        assert awards[0]["title"] == "Engineer of the Year"

    def test_additional_sections_data_preserved(self):
        raw = json.dumps(_full_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.form_data is not None
        additional = result.form_data["additionalSections"]
        assert len(additional) == 1
        assert additional[0]["title"] == "Volunteer Work"
        assert additional[0]["entries"][0]["title"] == "Code Mentor"


# ---------------------------------------------------------------------------
# Test class: Markdown fence stripping
# ---------------------------------------------------------------------------


class TestMarkdownFenceStripping:
    """Tests for stripping markdown code fences from Claude's response."""

    def test_json_fence_stripped(self):
        data = _minimal_valid_response()
        raw = "```json\n" + json.dumps(data) + "\n```"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"

    def test_plain_fence_stripped(self):
        """Test ``` without language specifier."""
        data = _minimal_valid_response()
        raw = "```\n" + json.dumps(data) + "\n```"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_fence_with_trailing_whitespace(self):
        data = _minimal_valid_response()
        raw = "```json\n" + json.dumps(data) + "\n```  \n"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_fence_with_leading_whitespace(self):
        data = _minimal_valid_response()
        raw = "  \n```json\n" + json.dumps(data) + "\n```"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_no_fence_also_works(self):
        data = _minimal_valid_response()
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_pretty_printed_json_in_fences(self):
        data = _minimal_valid_response()
        raw = "```json\n" + json.dumps(data, indent=2) + "\n```"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"


# ---------------------------------------------------------------------------
# Test class: Truncation detection
# ---------------------------------------------------------------------------


class TestTruncationDetection:
    """Tests for detecting truncated AI responses (max_tokens hit)."""

    def test_truncated_json_returns_failure(self):
        """Response cut off mid-JSON should return truncation error."""
        raw = '{"personalInfo": {"fullName": "Jane Doe", "email": "jane@'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error

    def test_truncated_with_trailing_whitespace(self):
        """Truncation detection should work even with trailing whitespace."""
        raw = '{"personalInfo": {"fullName": "test"  '
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error

    def test_truncated_mid_array(self):
        """Response cut off in the middle of an array."""
        raw = '{"workExperience": [{"company": "Acme", "title": "Eng'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error

    def test_truncated_in_fenced_block(self):
        """Response with opening fence but truncated before closing."""
        raw = '```json\n{"personalInfo": {"fullName": "test"'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error

    def test_valid_json_ending_with_brace_not_truncated(self):
        """Valid JSON ending with } should not be flagged as truncated."""
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_truncated_source_preserved(self):
        raw = '{"incomplete": true, "data": ['
        result = _parse_extraction_response(raw, source="docx")

        assert result.source == "docx"


# ---------------------------------------------------------------------------
# Test class: Malformed JSON (non-truncated)
# ---------------------------------------------------------------------------


class TestMalformedJson:
    """Tests for JSON that is complete but syntactically invalid."""

    def test_completely_invalid_json_not_ending_with_brace(self):
        """Plain text not ending with } is treated as truncated (truncation
        check takes priority over JSON parse error)."""
        raw = "This is not JSON at all, just plain text."
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        # Ends with '.', not '}', so truncation error fires first
        assert "cut short" in result.error

    def test_completely_invalid_json_ending_with_brace(self):
        """Plain text that happens to end with } gets the JSON parse error."""
        raw = "This is not JSON at all, just plain text}"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "not valid JSON" in result.error

    def test_invalid_json_ending_with_brace(self):
        """Malformed JSON that happens to end with } (not truncated, just broken)."""
        raw = "{invalid json content here}"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "not valid JSON" in result.error

    def test_empty_string(self):
        """Empty response should be detected as truncated (doesn't end with })."""
        raw = ""
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False

    def test_only_whitespace(self):
        """Whitespace-only response should fail."""
        raw = "   \n  \t  "
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False

    def test_json_with_trailing_comma(self):
        """Trailing comma makes JSON invalid."""
        raw = '{"personalInfo": {"fullName": "Jane"},}'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "not valid JSON" in result.error

    def test_json_array_instead_of_object_raises_unhandled_error(self):
        """BUG: A JSON array is valid JSON but not the expected dict shape.
        The function calls data.pop("_confidence", default) which fails on a
        list because list.pop() only accepts an index, not a key+default.
        This raises an unhandled TypeError.

        This is a real bug — the function should guard against non-dict JSON
        responses (e.g., with `if not isinstance(data, dict): return failure`).
        """
        raw = "[1, 2, 3]"
        with pytest.raises(TypeError):
            _parse_extraction_response(raw, source="pdf")

    def test_malformed_json_source_preserved(self):
        raw = "not json}"
        result = _parse_extraction_response(raw, source="docx")

        # Ends with } so not flagged as truncated, but is still invalid JSON
        assert result.success is False
        assert result.source == "docx"


# ---------------------------------------------------------------------------
# Test class: Missing _confidence and _warnings
# ---------------------------------------------------------------------------


class TestDefaultConfidenceAndWarnings:
    """Tests for default values when _confidence and _warnings are absent."""

    def test_missing_confidence_defaults_to_medium(self):
        data = _minimal_valid_response()
        del data["_confidence"]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.confidence is not None
        assert result.confidence["overall"] == "medium"
        assert result.confidence["fields"] == {}

    def test_missing_warnings_defaults_to_none(self):
        """Missing _warnings defaults to empty list, which becomes None in result
        (because of `warnings or None` logic)."""
        data = _minimal_valid_response()
        del data["_warnings"]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        # Empty list becomes None via `warnings or None`
        assert result.warnings is None

    def test_both_missing_uses_defaults(self):
        data = _minimal_valid_response()
        del data["_confidence"]
        del data["_warnings"]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.confidence is not None
        assert result.confidence["overall"] == "medium"
        assert result.warnings is None

    def test_empty_warnings_list_becomes_none(self):
        """Explicit empty _warnings list should result in warnings=None."""
        data = _minimal_valid_response()
        data["_warnings"] = []
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.warnings is None

    def test_nonempty_warnings_preserved(self):
        data = _minimal_valid_response()
        data["_warnings"] = ["Date format uncertain", "Phone number missing"]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.warnings is not None
        assert len(result.warnings) == 2
        assert "Date format uncertain" in result.warnings

    def test_custom_confidence_preserved(self):
        data = _minimal_valid_response()
        data["_confidence"] = {
            "overall": "low",
            "fields": {"personalInfo.email": "low", "personalInfo.phone": "medium"},
        }
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.confidence is not None
        assert result.confidence["overall"] == "low"
        assert result.confidence["fields"]["personalInfo.email"] == "low"


# ---------------------------------------------------------------------------
# Test class: Pydantic validation
# ---------------------------------------------------------------------------


class TestPydanticValidation:
    """Tests for Pydantic CVFormData validation behavior."""

    def test_valid_data_no_validation_warning(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        # No warnings if data is valid and _warnings was empty
        assert result.warnings is None

    def test_invalid_field_type_adds_warning_but_succeeds(self):
        """Invalid field types should add a warning but not fail the import.
        For example, personalInfo as a string instead of an object."""
        data = _minimal_valid_response()
        # personalInfo expects an object, give it a string
        data["personalInfo"] = "not an object"
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.warnings is not None
        assert any(
            "format" in w.lower() or "match" in w.lower() for w in result.warnings
        )

    def test_extra_unknown_fields_still_succeed(self):
        """Extra fields not in the schema should not cause validation failure."""
        data = _minimal_valid_response()
        data["extraField"] = "something unexpected"
        data["anotherExtra"] = [1, 2, 3]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_work_experience_with_wrong_type_adds_warning(self):
        """workExperience as a string instead of array should trigger warning."""
        data = _minimal_valid_response()
        data["workExperience"] = "not an array"
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.warnings is not None
        assert any(
            "format" in w.lower() or "match" in w.lower() for w in result.warnings
        )


# ---------------------------------------------------------------------------
# Test class: Summary calculation
# ---------------------------------------------------------------------------


class TestSummaryCalculation:
    """Tests for ImportSummary field counts."""

    def test_all_empty_sections(self):
        data = _minimal_valid_response()
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.workEntries == 0
        assert result.summary.educationEntries == 0
        assert result.summary.skillCategories == 0
        assert result.summary.projects == 0
        assert result.summary.awards == 0
        assert result.summary.additionalSections == 0

    def test_single_entry_per_section(self):
        data = _minimal_valid_response()
        data["workExperience"] = [
            {
                "company": "A",
                "title": "E",
                "startDate": "",
                "endDate": "",
                "location": "",
                "bullets": [],
            }
        ]
        data["education"] = [
            {
                "school": "B",
                "degree": "D",
                "startDate": "",
                "endDate": "",
                "location": "",
                "details": [],
            }
        ]
        data["skills"] = [{"category": "C", "skills": ["X"]}]
        data["projects"] = [{"name": "P", "year": "2024", "description": ""}]
        data["awards"] = [{"year": "2024", "title": "A"}]
        data["additionalSections"] = [{"title": "S", "entries": []}]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.workEntries == 1
        assert result.summary.educationEntries == 1
        assert result.summary.skillCategories == 1
        assert result.summary.projects == 1
        assert result.summary.awards == 1
        assert result.summary.additionalSections == 1

    def test_multiple_entries(self):
        data = _minimal_valid_response()
        data["workExperience"] = [
            {
                "company": f"Company{i}",
                "title": "",
                "startDate": "",
                "endDate": "",
                "location": "",
                "bullets": [],
            }
            for i in range(5)
        ]
        data["education"] = [
            {
                "school": f"School{i}",
                "degree": "",
                "startDate": "",
                "endDate": "",
                "location": "",
                "details": [],
            }
            for i in range(3)
        ]
        data["skills"] = [
            {"category": f"Cat{i}", "skills": ["skill"]} for i in range(4)
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.workEntries == 5
        assert result.summary.educationEntries == 3
        assert result.summary.skillCategories == 4

    def test_none_optional_sections_count_as_zero(self):
        """When projects, awards, additionalSections are absent (None), count as 0."""
        data = _minimal_valid_response()
        # These keys are not present at all
        assert "projects" not in data
        assert "awards" not in data
        assert "additionalSections" not in data
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.projects == 0
        assert result.summary.awards == 0
        assert result.summary.additionalSections == 0

    def test_null_optional_sections_count_as_zero(self):
        """Explicit null values for optional sections should count as 0.
        The `or []` guard in the code handles this."""
        data = _minimal_valid_response()
        data["projects"] = None
        data["awards"] = None
        data["additionalSections"] = None
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.summary is not None
        assert result.summary.projects == 0
        assert result.summary.awards == 0
        assert result.summary.additionalSections == 0


# ---------------------------------------------------------------------------
# Test class: Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases and unusual but valid inputs."""

    def test_unicode_content_preserved(self):
        data = _minimal_valid_response()
        data["personalInfo"]["fullName"] = "Rene Descartes"
        data["personalInfo"]["location"] = "Tokyo, Japan"
        data["workExperience"] = [
            {
                "company": "Osterreichische Firma",
                "title": "Ingenieur",
                "startDate": "Jan 2020",
                "endDate": "Present",
                "location": "Wien",
                "bullets": ["Managed budget of 500,000 EUR"],
            }
        ]
        raw = json.dumps(data, ensure_ascii=False)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Rene Descartes"
        assert result.summary is not None
        assert result.summary.workEntries == 1

    def test_very_long_response(self):
        """A response with many entries should still parse correctly."""
        data = _minimal_valid_response()
        data["workExperience"] = [
            {
                "company": f"Company {i}",
                "title": f"Role {i}",
                "startDate": "Jan 2020",
                "endDate": "Dec 2020",
                "location": "Somewhere",
                "bullets": [f"Achievement {j} at company {i}" for j in range(10)],
            }
            for i in range(20)
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 20

    def test_special_characters_in_text(self):
        """LaTeX special characters in content should be preserved as-is
        (escaping is handled elsewhere, not in parsing)."""
        data = _minimal_valid_response()
        data["personalInfo"]["fullName"] = "Jane & John O'Brien $100"
        data["workExperience"] = [
            {
                "company": "AT&T #1 {Corp}",
                "title": "Engineer ~ Lead",
                "startDate": "Jan 2020",
                "endDate": "Present",
                "location": "100% Remote",
                "bullets": ["Managed $5M budget with 50% ROI"],
            }
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.form_data is not None
        assert (
            result.form_data["personalInfo"]["fullName"] == "Jane & John O'Brien $100"
        )
        assert result.form_data["workExperience"][0]["company"] == "AT&T #1 {Corp}"

    def test_empty_strings_in_all_fields(self):
        """All fields as empty strings should still parse."""
        data = {
            "personalInfo": {
                "fullName": "",
                "email": "",
                "phone": "",
                "location": "",
                "links": [],
            },
            "workExperience": [
                {
                    "company": "",
                    "title": "",
                    "startDate": "",
                    "endDate": "",
                    "location": "",
                    "bullets": [],
                }
            ],
            "education": [],
            "skills": [],
            "_confidence": {"overall": "low", "fields": {}},
            "_warnings": ["Mostly empty CV"],
        }
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 1

    def test_nested_json_in_fences_with_extra_whitespace(self):
        """Pretty-printed JSON inside fences with extra whitespace."""
        data = _minimal_valid_response()
        raw = "\n\n```json\n\n" + json.dumps(data, indent=4) + "\n\n```\n\n"
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True

    def test_multiple_additional_sections(self):
        data = _minimal_valid_response()
        data["additionalSections"] = [
            {
                "title": "Certifications",
                "entries": [{"title": "AWS Certified", "bullets": []}],
            },
            {"title": "Languages", "entries": [{"title": "Spanish", "bullets": []}]},
            {"title": "Publications", "entries": [{"title": "Paper 1", "bullets": []}]},
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.summary is not None
        assert result.summary.additionalSections == 3

    def test_projects_with_empty_bullets_and_description_only(self):
        data = _minimal_valid_response()
        data["projects"] = [
            {
                "name": "Project A",
                "year": "2024",
                "description": "A cool project",
                "bullets": [],
            },
            {"name": "Project B", "year": "2023", "description": "Another project"},
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.summary is not None
        assert result.summary.projects == 2

    def test_response_with_only_opening_fence(self):
        """Response starts with ``` but never closes — this is a truncation case."""
        raw = '```json\n{"personalInfo": {"fullName": "test"'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error

    def test_links_with_various_labels(self):
        data = _minimal_valid_response()
        data["personalInfo"]["links"] = [
            {"label": "LinkedIn", "url": "https://linkedin.com/in/jane"},
            {"label": "GitHub", "url": "https://github.com/jane"},
            {"label": "Portfolio", "url": "https://jane.dev"},
            {"label": "Twitter/X", "url": "https://x.com/jane"},
        ]
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.form_data is not None
        assert len(result.form_data["personalInfo"]["links"]) == 4


# ---------------------------------------------------------------------------
# Test class: Return type verification
# ---------------------------------------------------------------------------


class TestReturnType:
    """Verify that the function always returns a CVImportResult."""

    def test_success_returns_cvimportresult(self):
        raw = json.dumps(_minimal_valid_response())
        result = _parse_extraction_response(raw, source="pdf")
        assert isinstance(result, CVImportResult)

    def test_truncation_failure_returns_cvimportresult(self):
        raw = '{"incomplete": true, "data": ['
        result = _parse_extraction_response(raw, source="pdf")
        assert isinstance(result, CVImportResult)

    def test_parse_error_returns_cvimportresult(self):
        raw = "not json at all}"
        result = _parse_extraction_response(raw, source="pdf")
        assert isinstance(result, CVImportResult)

    def test_failure_result_has_none_for_optional_fields(self):
        raw = '{"broken json'
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is False
        assert result.form_data is None
        assert result.confidence is None
        assert result.summary is None
        assert result.warnings is None


# ---------------------------------------------------------------------------
# Test class: Pydantic validation warning message
# ---------------------------------------------------------------------------


class TestPydanticValidationWarning:
    """Test the specific warning message added on validation failure."""

    def test_validation_warning_text(self):
        """When Pydantic validation fails, the exact warning text should be added."""
        data = _minimal_valid_response()
        data["workExperience"] = "not a list"  # Invalid type
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.warnings is not None
        assert "Some fields may not match the expected format." in result.warnings

    def test_validation_warning_appended_to_existing_warnings(self):
        """Pydantic warning should be added to any existing _warnings."""
        data = _minimal_valid_response()
        data["_warnings"] = ["Existing warning"]
        data["education"] = "not a list"  # Invalid type
        raw = json.dumps(data)
        result = _parse_extraction_response(raw, source="pdf")

        assert result.success is True
        assert result.warnings is not None
        assert "Existing warning" in result.warnings
        assert "Some fields may not match the expected format." in result.warnings
        assert len(result.warnings) == 2
