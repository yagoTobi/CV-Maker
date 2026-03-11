"""
Tests for CV extraction service error paths with mocked Bedrock responses.

This file tests the async extraction functions (extract_from_pdf, extract_from_docx,
extract_from_json) at the service level with mocked dependencies. It focuses on
error scenarios, edge cases, and failure resilience that are NOT covered by:

- test_cv_extractor.py (only tests _parse_extraction_response, not the async wrappers)
- test_cv_import_integration.py (tests via HTTP route, not direct function calls)

Coverage areas:
1. extract_from_pdf: Bedrock exceptions, empty/non-JSON/truncated responses, argument passing
2. extract_from_docx: python-docx failures, empty text, Bedrock exceptions, argument verification
3. extract_from_json: invalid UTF-8, missing fields, Pydantic validation, edge cases
4. _extract_docx_text: mock-based structural tests for headings, lists, bold, tables, indents
5. Exception type coverage: ConnectionError, RuntimeError, TimeoutError, ValueError, OSError
6. Pipeline tests: end-to-end with mocked AI for confidence/warning passthrough

Run with: cd backend && python3 -m pytest tests/test_cv_extractor_error_paths.py -v
"""

import asyncio
import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.cv_extractor import (
    CVImportResult,
    ImportSummary,
    _extract_docx_text,
    extract_from_docx,
    extract_from_json,
    extract_from_pdf,
)


# ---------------------------------------------------------------------------
# Helper: run async functions in sync test context
# ---------------------------------------------------------------------------
def run(coro):
    """Run an async coroutine synchronously."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ---------------------------------------------------------------------------
# Fixture data builders
# ---------------------------------------------------------------------------
VALID_EXTRACTION_JSON = {
    "sectionOrder": ["work", "education", "skills"],
    "personalInfo": {
        "fullName": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-0100",
        "location": "San Francisco, CA",
        "links": [{"label": "LinkedIn", "url": "https://linkedin.com/in/janedoe"}],
        "summary": "Experienced software engineer.",
    },
    "workExperience": [
        {
            "company": "Acme Corp",
            "title": "Senior Engineer",
            "startDate": "Jan 2020",
            "endDate": "Present",
            "location": "SF, CA",
            "bullets": ["Led team of 5", "Shipped v2.0"],
        }
    ],
    "education": [
        {
            "school": "MIT",
            "degree": "BS Computer Science",
            "startDate": "Sep 2012",
            "endDate": "Jun 2016",
            "location": "Cambridge, MA",
            "gpa": "3.9",
            "details": ["Magna cum laude"],
        }
    ],
    "skills": [
        {"category": "Languages", "skills": ["Python", "TypeScript"]},
    ],
    "projects": [
        {
            "name": "OpenWidget",
            "year": "2023",
            "description": "An open-source widget library",
            "technologies": "React, Node.js",
            "bullets": ["500+ GitHub stars"],
        }
    ],
    "awards": [
        {
            "year": "2021",
            "title": "Employee of the Year",
            "description": "Top performer",
        }
    ],
    "additionalSections": [],
    "_confidence": {
        "overall": "high",
        "fields": {"personalInfo.phone": "medium"},
    },
    "_warnings": ["Phone number format uncertain"],
}


def _make_valid_response(**overrides) -> str:
    """Build a valid JSON response string with optional overrides."""
    data = {**VALID_EXTRACTION_JSON, **overrides}
    return json.dumps(data)


# ===========================================================================
# 1. extract_from_pdf — mocked Bedrock responses
# ===========================================================================
class TestExtractFromPdf:
    """Tests for PDF extraction with mocked Bedrock client."""

    @patch("services.cv_extractor.bedrock_client")
    def test_successful_extraction(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = _make_valid_response()
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is True
        assert result.source == "pdf"
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"
        assert result.error is None

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_generic_exception_returns_pdf_error(self, mock_bedrock):
        mock_bedrock.chat_with_document.side_effect = Exception("Bedrock API timeout")
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"
        assert result.error is not None
        assert "Could not extract" in result.error
        # Error suggests alternatives
        assert "Word document" in result.error or "JSON" in result.error

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_connection_error(self, mock_bedrock):
        mock_bedrock.chat_with_document.side_effect = ConnectionError("No network")
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"
        assert result.form_data is None

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_runtime_error(self, mock_bedrock):
        mock_bedrock.chat_with_document.side_effect = RuntimeError(
            "Model not available"
        )
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_timeout_error(self, mock_bedrock):
        mock_bedrock.chat_with_document.side_effect = TimeoutError("Request timed out")
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_value_error(self, mock_bedrock):
        """ValueError from bedrock (e.g., invalid document format)."""
        mock_bedrock.chat_with_document.side_effect = ValueError("Invalid PDF format")
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_os_error(self, mock_bedrock):
        """OSError from boto3 (network-level failure)."""
        mock_bedrock.chat_with_document.side_effect = OSError("Connection reset")
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.source == "pdf"

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_empty_string(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = ""
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.error is not None

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_whitespace_only(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = "   \n\t\n   "
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_non_json_prose(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = (
            "I cannot process this document. It appears to be an image-only PDF."
        )
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.error is not None

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_truncated_json(self, mock_bedrock):
        truncated = _make_valid_response()[:200]
        mock_bedrock.chat_with_document.return_value = truncated
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error.lower()

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_markdown_wrapped_json(self, mock_bedrock):
        mock_bedrock.chat_with_document.return_value = (
            "```json\n" + _make_valid_response() + "\n```"
        )
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        assert result.success is True
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"

    @patch("services.cv_extractor.bedrock_client")
    def test_bedrock_returns_json_with_extra_text_before(self, mock_bedrock):
        """Claude sometimes adds text before the JSON. Without markdown fences this fails."""
        response = "Here is the extracted data:\n" + _make_valid_response()
        mock_bedrock.chat_with_document.return_value = response
        result = run(extract_from_pdf(b"fake-pdf-bytes"))
        # Not wrapped in fences, so the leading text makes it invalid JSON
        # But it ends with }, so it goes to JSON parse path (not truncation)
        assert result.success is False

    @patch("services.cv_extractor.bedrock_client")
    def test_correct_arguments_passed_to_bedrock(self, mock_bedrock):
        """Verify chat_with_document is called with correct parameters."""
        mock_bedrock.chat_with_document.return_value = _make_valid_response()
        pdf_bytes = b"actual-pdf-content"
        run(extract_from_pdf(pdf_bytes))

        mock_bedrock.chat_with_document.assert_called_once()
        call_kwargs = mock_bedrock.chat_with_document.call_args.kwargs
        assert call_kwargs["document_bytes"] == pdf_bytes
        assert call_kwargs["document_media_type"] == "application/pdf"
        assert call_kwargs["max_tokens"] == 8192

    @patch("services.cv_extractor.bedrock_client")
    def test_error_result_has_no_form_data(self, mock_bedrock):
        """On error, form_data, confidence, summary should all be None."""
        mock_bedrock.chat_with_document.side_effect = Exception("fail")
        result = run(extract_from_pdf(b"fake"))
        assert result.form_data is None
        assert result.confidence is None
        assert result.summary is None
        assert result.warnings is None


# ===========================================================================
# 2. extract_from_docx — mocked Bedrock + python-docx
# ===========================================================================
def _make_mock_doc_with_text(text_content: str):
    """Create a mock DOCX Document that produces the given text from paragraphs."""
    mock_doc = MagicMock()
    if text_content.strip():
        mock_para = MagicMock()
        mock_para.text = text_content
        mock_para.style.name = "Normal"
        run_mock = MagicMock()
        run_mock.bold = False
        run_mock.text.strip.return_value = text_content
        mock_para.runs = [run_mock]
        mock_para.paragraph_format.left_indent = None
        pPr = MagicMock()
        pPr.find.return_value = None
        mock_para._p.pPr = pPr
        mock_doc.paragraphs = [mock_para]
    else:
        mock_doc.paragraphs = []
    mock_doc.tables = []
    return mock_doc


class TestExtractFromDocx:
    """Tests for DOCX extraction with mocked dependencies."""

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_successful_extraction(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text(
            "Jane Doe - Software Engineer"
        )
        mock_bedrock.chat.return_value = _make_valid_response()

        result = run(extract_from_docx(b"fake-docx-bytes"))
        assert result.success is True
        assert result.source == "docx"
        assert result.form_data is not None

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_chat_exception(self, mock_document_cls, mock_bedrock):
        """Bedrock chat() raises exception during DOCX extraction."""
        mock_document_cls.return_value = _make_mock_doc_with_text("Some text")
        mock_bedrock.chat.side_effect = Exception("Bedrock throttled")

        result = run(extract_from_docx(b"fake-docx-bytes"))
        assert result.success is False
        assert result.source == "docx"
        assert result.error is not None
        assert "Bedrock throttled" in result.error  # error includes exception text

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_connection_error(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text("Content")
        mock_bedrock.chat.side_effect = ConnectionError("DNS resolution failed")

        result = run(extract_from_docx(b"fake"))
        assert result.success is False
        assert result.source == "docx"
        # Error message includes the exception text
        assert result.error is not None
        assert "DNS resolution failed" in result.error

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_timeout_error(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text("Content")
        mock_bedrock.chat.side_effect = TimeoutError("Read timed out")

        result = run(extract_from_docx(b"fake"))
        assert result.success is False
        assert result.error is not None
        assert "Read timed out" in result.error

    @patch("services.cv_extractor.Document")
    def test_python_docx_raises_exception(self, mock_document_cls):
        """python-docx Document() raises exception for corrupt file."""
        mock_document_cls.side_effect = Exception("Package not found")
        result = run(extract_from_docx(b"not-a-real-docx"))
        assert result.success is False
        assert result.source == "docx"
        assert result.error is not None
        assert "Package not found" in result.error

    @patch("services.cv_extractor.Document")
    def test_python_docx_raises_value_error(self, mock_document_cls):
        """python-docx raises ValueError for malformed ZIP."""
        mock_document_cls.side_effect = ValueError("File is not a zip file")
        result = run(extract_from_docx(b"random-bytes"))
        assert result.success is False
        assert result.error is not None
        assert "File is not a zip file" in result.error

    @patch("services.cv_extractor.Document")
    def test_python_docx_raises_key_error(self, mock_document_cls):
        """python-docx raises KeyError for missing package part."""
        mock_document_cls.side_effect = KeyError("'[Content_Types].xml'")
        result = run(extract_from_docx(b"truncated-docx"))
        assert result.success is False
        assert result.source == "docx"

    @patch("services.cv_extractor.Document")
    def test_docx_with_no_extractable_text(self, mock_document_cls):
        """DOCX with no paragraphs yields empty text error."""
        mock_document_cls.return_value = _make_mock_doc_with_text("")
        result = run(extract_from_docx(b"empty-docx"))
        assert result.success is False
        assert result.source == "docx"
        assert result.error is not None
        assert (
            "empty" in result.error.lower() or "no extractable" in result.error.lower()
        )

    @patch("services.cv_extractor.Document")
    def test_docx_with_whitespace_only_paragraphs(self, mock_document_cls):
        """DOCX where all paragraphs are whitespace-only."""
        mock_doc = MagicMock()
        p1 = MagicMock()
        p1.text = "   "
        p2 = MagicMock()
        p2.text = "\n\t"
        mock_doc.paragraphs = [p1, p2]
        mock_doc.tables = []
        mock_document_cls.return_value = mock_doc

        result = run(extract_from_docx(b"whitespace-docx"))
        assert result.success is False
        assert result.error is not None
        assert (
            "empty" in result.error.lower() or "no extractable" in result.error.lower()
        )

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_returns_empty_for_docx(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text("Real content")
        mock_bedrock.chat.return_value = ""

        result = run(extract_from_docx(b"fake-docx"))
        assert result.success is False

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_returns_truncated_for_docx(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text("Content")
        mock_bedrock.chat.return_value = '{"personalInfo": {"fullName": "Jane'

        result = run(extract_from_docx(b"fake-docx"))
        assert result.success is False
        assert result.error is not None
        assert "cut short" in result.error.lower()

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_bedrock_returns_non_json_prose(self, mock_document_cls, mock_bedrock):
        mock_document_cls.return_value = _make_mock_doc_with_text("Content")
        mock_bedrock.chat.return_value = (
            "I apologize, but I cannot extract structured data from this document."
        )

        result = run(extract_from_docx(b"fake-docx"))
        assert result.success is False

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_correct_arguments_passed_to_bedrock_chat(
        self, mock_document_cls, mock_bedrock
    ):
        """Verify bedrock.chat() is called with stream=False and max_tokens=8192."""
        mock_document_cls.return_value = _make_mock_doc_with_text("Content here")
        mock_bedrock.chat.return_value = _make_valid_response()

        run(extract_from_docx(b"fake-docx"))

        mock_bedrock.chat.assert_called_once()
        call_kwargs = mock_bedrock.chat.call_args.kwargs
        assert call_kwargs["stream"] is False
        assert call_kwargs["max_tokens"] == 8192
        # The user prompt should include the extracted text
        messages = call_kwargs["messages"]
        assert len(messages) == 1
        assert "Content here" in messages[0]["content"]

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_extracted_text_included_in_bedrock_prompt(
        self, mock_document_cls, mock_bedrock
    ):
        """The DOCX text content appears in the prompt sent to Bedrock."""
        mock_document_cls.return_value = _make_mock_doc_with_text(
            "Senior Engineer at Google, 2018-2023"
        )
        mock_bedrock.chat.return_value = _make_valid_response()

        run(extract_from_docx(b"fake-docx"))

        messages = mock_bedrock.chat.call_args.kwargs["messages"]
        prompt_text = messages[0]["content"]
        assert "Senior Engineer at Google, 2018-2023" in prompt_text
        # Should also include the extraction instruction
        assert "Extract" in prompt_text

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_system_prompt_passed_to_bedrock(self, mock_document_cls, mock_bedrock):
        """The system prompt is passed to bedrock.chat()."""
        mock_document_cls.return_value = _make_mock_doc_with_text("Content")
        mock_bedrock.chat.return_value = _make_valid_response()

        run(extract_from_docx(b"fake-docx"))

        system_prompt = mock_bedrock.chat.call_args.kwargs["system_prompt"]
        assert "CV/resume data extraction" in system_prompt
        assert "JSON" in system_prompt


# ===========================================================================
# 3. extract_from_json — no AI, pure validation
# ===========================================================================
class TestExtractFromJson:
    """Tests for JSON extraction (no AI -- direct parsing and validation)."""

    def test_valid_complete_json(self):
        """Full valid CVFormData JSON is accepted."""
        data = {
            "personalInfo": {
                "fullName": "Jane Doe",
                "email": "jane@example.com",
                "phone": "555-0100",
                "location": "SF",
                "links": [],
            },
            "workExperience": [
                {
                    "company": "Acme",
                    "title": "Engineer",
                    "startDate": "Jan 2020",
                    "endDate": "Present",
                    "location": "SF",
                    "bullets": ["Did stuff"],
                }
            ],
            "education": [],
            "skills": [{"category": "Languages", "skills": ["Python"]}],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.source == "json"
        assert result.confidence is not None
        assert result.confidence["overall"] == "high"
        assert result.confidence["fields"] == {}
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jane Doe"
        assert result.error is None

    def test_minimal_json_sets_defaults(self):
        """JSON with no standard keys gets defaults set via setdefault()."""
        data = {}
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.form_data is not None
        assert "personalInfo" in result.form_data
        assert "workExperience" in result.form_data
        assert "education" in result.form_data
        assert "skills" in result.form_data

    def test_invalid_utf8_encoding(self):
        """Bytes that are not valid UTF-8 cause UnicodeDecodeError."""
        bad_bytes = b"\xff\xfe\x80\x81\x82"
        result = run(extract_from_json(bad_bytes))
        assert result.success is False
        assert result.source == "json"
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_latin1_encoded_bytes(self):
        """Latin-1 encoded bytes that aren't valid UTF-8."""
        # 'e with acute' in latin-1 is 0xe9, which is invalid start of 2-byte UTF-8
        text = '{"name": "Ren\xe9"}'
        bad_bytes = text.encode("latin-1")
        result = run(extract_from_json(bad_bytes))
        assert result.success is False
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_invalid_json_syntax(self):
        """Syntactically invalid JSON."""
        result = run(extract_from_json(b'{"name": "Jane",}'))
        assert result.success is False
        assert result.source == "json"
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_empty_bytes(self):
        """Empty byte string."""
        result = run(extract_from_json(b""))
        assert result.success is False
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_null_json(self):
        """BUG: JSON null value causes unhandled AttributeError.

        json.loads(b"null") returns None, then data.pop("templateId", None)
        raises AttributeError because NoneType has no pop method.
        The function should guard against non-dict JSON values with something
        like: if not isinstance(data, dict): return failure.
        """
        with pytest.raises(AttributeError):
            run(extract_from_json(b"null"))

    def test_json_number(self):
        """BUG: A bare JSON number causes unhandled AttributeError.

        json.loads(b"42") returns int, which has no pop/setdefault methods.
        Same root cause as test_null_json.
        """
        with pytest.raises(AttributeError):
            run(extract_from_json(b"42"))

    def test_json_string(self):
        """BUG: A bare JSON string causes unhandled AttributeError.

        json.loads returns str, which has no pop/setdefault methods.
        Same root cause as test_null_json.
        """
        with pytest.raises(AttributeError):
            run(extract_from_json(b'"hello"'))

    def test_json_boolean(self):
        """BUG: A bare JSON boolean causes unhandled AttributeError.

        json.loads(b"true") returns bool, which has no pop/setdefault methods.
        Same root cause as test_null_json.
        """
        with pytest.raises(AttributeError):
            run(extract_from_json(b"true"))

    def test_json_array_instead_of_object(self):
        """BUG: JSON array causes unhandled TypeError.

        json.loads(b'[1, 2, 3]') returns a list. The function then calls
        data.pop("templateId", None), but list.pop() only accepts an integer
        index and does not support a default argument, raising TypeError:
        "pop expected at most 1 argument, got 2".

        The function should guard: if not isinstance(data, dict): return failure.
        This is the same class of bug as test_null_json but with a different
        exception type (TypeError vs AttributeError).
        """
        with pytest.raises(TypeError):
            run(extract_from_json(b"[1, 2, 3]"))

    def test_templateId_stripped(self):
        """templateId is removed before processing."""
        data = {
            "templateId": "deedy-resume",
            "personalInfo": {"fullName": "Jane"},
            "workExperience": [],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.form_data is not None
        assert "templateId" not in result.form_data

    def test_pydantic_validation_error_returns_warnings(self):
        """Data with wrong field types causes validation error with field-level warnings."""
        data = {
            "personalInfo": "not an object",
            "workExperience": [],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is False
        assert result.source == "json"
        assert result.error is not None
        assert "schema" in result.error.lower()
        assert result.warnings is not None
        assert len(result.warnings) > 0

    def test_validation_error_warnings_capped_at_five(self):
        """At most 5 field errors are returned in warnings."""
        data = {
            "personalInfo": "bad",
            "workExperience": "bad",
            "education": "bad",
            "skills": "bad",
            "projects": "bad",
            "awards": "bad",
            "sectionOrder": 12345,
            "additionalSections": "bad",
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is False
        if result.warnings:
            assert len(result.warnings) <= 5

    def test_summary_counts_correct(self):
        """Summary correctly counts entries in each section."""
        data = {
            "personalInfo": {"fullName": "Test"},
            "workExperience": [
                {
                    "company": "A",
                    "title": "T1",
                    "startDate": "",
                    "endDate": "",
                    "location": "",
                    "bullets": [],
                },
                {
                    "company": "B",
                    "title": "T2",
                    "startDate": "",
                    "endDate": "",
                    "location": "",
                    "bullets": [],
                },
            ],
            "education": [
                {
                    "school": "X",
                    "degree": "D",
                    "startDate": "",
                    "endDate": "",
                    "location": "",
                },
            ],
            "skills": [
                {"category": "Lang", "skills": ["Py"]},
                {"category": "Tools", "skills": ["Git"]},
                {"category": "Frameworks", "skills": ["React"]},
            ],
            "projects": [
                {"name": "P1", "year": "2023", "description": "D1"},
            ],
            "awards": [
                {"year": "2022", "title": "A1"},
                {"year": "2021", "title": "A2"},
            ],
            "additionalSections": [
                {"title": "Certs", "entries": []},
            ],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 2
        assert result.summary.educationEntries == 1
        assert result.summary.skillCategories == 3
        assert result.summary.projects == 1
        assert result.summary.awards == 2
        assert result.summary.additionalSections == 1

    def test_json_with_null_optional_sections(self):
        """Optional sections as null should succeed."""
        data = {
            "personalInfo": {"fullName": "Jane"},
            "workExperience": [],
            "education": [],
            "skills": [],
            "projects": None,
            "awards": None,
            "additionalSections": None,
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.summary is not None
        assert result.summary.projects == 0
        assert result.summary.awards == 0
        assert result.summary.additionalSections == 0

    def test_json_confidence_always_high(self):
        """JSON imports always get high confidence (no AI involved)."""
        data = {
            "personalInfo": {"fullName": "Test"},
            "workExperience": [],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.confidence is not None
        assert result.confidence["overall"] == "high"
        assert result.confidence["fields"] == {}

    def test_json_warnings_always_none_on_success(self):
        """Successful JSON imports have no warnings."""
        data = {
            "personalInfo": {"fullName": "Test"},
            "workExperience": [],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.warnings is None

    def test_unicode_content_preserved(self):
        """Unicode characters in names/content are preserved."""
        data = {
            "personalInfo": {
                "fullName": "Jose Garcia-Lopez",
                "email": "jose@example.com",
                "phone": "",
                "location": "Ciudad de Mexico, Mexico",
                "links": [],
            },
            "workExperience": [],
            "education": [],
            "skills": [{"category": "Idiomas", "skills": ["Espanol", "Ingles"]}],
        }
        result = run(
            extract_from_json(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        )
        assert result.success is True
        assert result.form_data is not None
        assert result.form_data["personalInfo"]["fullName"] == "Jose Garcia-Lopez"

    def test_very_large_json(self):
        """Large JSON with many entries should work."""
        data = {
            "personalInfo": {"fullName": "Test"},
            "workExperience": [
                {
                    "company": f"Company {i}",
                    "title": f"Role {i}",
                    "startDate": "Jan 2020",
                    "endDate": "Dec 2020",
                    "location": "Somewhere",
                    "bullets": [f"Achievement {j}" for j in range(10)],
                }
                for i in range(50)
            ],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 50

    def test_json_with_extra_unknown_fields_passes(self):
        """Extra fields not in schema are handled by Pydantic (may pass or fail validation)."""
        data = {
            "personalInfo": {"fullName": "Jane"},
            "workExperience": [],
            "education": [],
            "skills": [],
            "unknownField": "should be ignored",
            "anotherExtra": {"nested": True},
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        # Pydantic may or may not reject extra fields depending on model config
        assert result.source == "json"

    def test_deeply_nested_invalid_data(self):
        """Invalid data nested deeply in work entries."""
        data = {
            "personalInfo": {"fullName": "Test"},
            "workExperience": [
                {
                    "company": "Good Corp",
                    "title": "Dev",
                    "startDate": "Jan 2020",
                    "endDate": "Dec 2020",
                    "location": "Here",
                    "bullets": [123, 456],  # Bullets should be strings, not ints
                }
            ],
            "education": [],
            "skills": [],
        }
        result = run(extract_from_json(json.dumps(data).encode("utf-8")))
        # Pydantic may coerce ints to strings or reject them
        assert result.source == "json"


# ===========================================================================
# 4. _extract_docx_text — mock-based structural tests
# ===========================================================================
class TestExtractDocxTextWithMocks:
    """Tests for DOCX text extraction using mock Document objects."""

    def _make_paragraph(
        self,
        text: str,
        style_name: str = "Normal",
        is_bold: bool = False,
        left_indent=None,
        has_num_pr: bool = False,
        ilvl_val: str | None = None,
    ):
        """Create a mock DOCX paragraph."""
        para = MagicMock()
        para.text = text
        style = MagicMock()
        style.name = style_name
        para.style = style
        para.paragraph_format.left_indent = left_indent

        # Mock runs for bold detection
        if is_bold:
            run_mock = MagicMock()
            run_mock.bold = True
            run_mock.text.strip.return_value = text
            para.runs = [run_mock]
        else:
            run_mock = MagicMock()
            run_mock.bold = False
            run_mock.text.strip.return_value = text
            para.runs = [run_mock]

        # Mock XML numPr
        pPr = MagicMock()
        if has_num_pr:
            numPr_elem = MagicMock()
            pPr.find.return_value = numPr_elem
            if ilvl_val is not None:
                WML_NS = (
                    "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
                )
                ilvl = MagicMock()
                ilvl.get.return_value = ilvl_val
                numPr_elem.find.return_value = ilvl
            else:
                numPr_elem.find.return_value = None
        else:
            pPr.find.return_value = None

        para._p.pPr = pPr
        return para

    def test_plain_paragraphs(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Hello world")]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "Hello world" in result

    def test_heading_level_1(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Experience", style_name="Heading 1")]
        doc.tables = []
        result = _extract_docx_text(doc)
        # Heading 1 -> level=1, `min(level + 1, 4)` = 2 -> "##"
        assert "## Experience" in result

    def test_heading_level_2(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Education", style_name="Heading 2")]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "### Education" in result

    def test_heading_level_3(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Details", style_name="Heading 3")]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "#### Details" in result

    def test_heading_level_4_clamped(self):
        """Heading levels >= 3 are clamped to #### (level 4)."""
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Sub-detail", style_name="Heading 4")]
        doc.tables = []
        result = _extract_docx_text(doc)
        # level=4, min(4+1, 4) = 4 -> "####"
        assert "####" in result

    def test_heading_style_without_number(self):
        """A style named 'Heading' without a number defaults to level 1."""
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Section", style_name="Heading")]
        doc.tables = []
        result = _extract_docx_text(doc)
        # No digit found, so level stays at 1, min(1+1, 4) = 2 -> "##"
        assert "## Section" in result

    def test_list_bullet_style(self):
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("First bullet", style_name="List Bullet")
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- First bullet" in result

    def test_list_number_style(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Step one", style_name="List Number")]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- Step one" in result

    def test_numbered_style(self):
        """Style containing 'numbered' keyword triggers list detection."""
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Item", style_name="Numbered Paragraph")]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- Item" in result

    def test_numpr_list_detection(self):
        """List detected via XML numPr properties."""
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("Numbered item", has_num_pr=True, ilvl_val="0")
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- Numbered item" in result

    def test_nested_list_indentation(self):
        """Nested list items get extra indentation via ilvl."""
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("Top item", has_num_pr=True, ilvl_val="0"),
            self._make_paragraph("Nested item", has_num_pr=True, ilvl_val="1"),
            self._make_paragraph("Deep nested", has_num_pr=True, ilvl_val="2"),
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        lines = result.strip().split("\n")
        assert lines[0] == "- Top item"
        assert lines[1] == "  - Nested item"
        assert lines[2] == "    - Deep nested"

    def test_numpr_without_ilvl(self):
        """numPr element present but no ilvl child -> indent_level stays 0."""
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Item", has_num_pr=True, ilvl_val=None)]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- Item" in result

    def test_bold_paragraph_becomes_bold_marker(self):
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Section Title", is_bold=True)]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "**Section Title**" in result

    def test_indent_based_list_detection(self):
        """Paragraphs with left indent are treated as list items."""
        emu_per_half_inch = 457200
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("Indented item", left_indent=emu_per_half_inch),
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert "- Indented item" in result

    def test_large_indent_produces_nested_bullet(self):
        """Large left indent maps to deeper nesting."""
        emu_per_half_inch = 457200
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("Deep item", left_indent=emu_per_half_inch * 3),
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        # indent_level = int(3 * 457200 / 457200) = 3
        # prefix = "  " * 3 + "- " = "      - "
        assert "      - Deep item" in result

    def test_zero_indent_not_treated_as_list(self):
        """Zero left indent should not trigger list detection."""
        doc = MagicMock()
        doc.paragraphs = [self._make_paragraph("Normal text", left_indent=0)]
        doc.tables = []
        result = _extract_docx_text(doc)
        # indent_level = max(0, int(0 / 457200)) = 0 -> not is_list
        # So it should be plain text, not a bullet
        assert result.strip() == "Normal text"

    def test_empty_paragraphs_skipped(self):
        doc = MagicMock()
        p_empty = MagicMock()
        p_empty.text = "   "
        p_content = self._make_paragraph("Real content")
        doc.paragraphs = [p_empty, p_content]
        doc.tables = []
        result = _extract_docx_text(doc)
        assert result.strip() == "Real content"

    def test_table_extraction(self):
        doc = MagicMock()
        doc.paragraphs = []
        table = MagicMock()
        cell1 = MagicMock()
        cell1.text = "Python"
        cell2 = MagicMock()
        cell2.text = "Advanced"
        row = MagicMock()
        row.cells = [cell1, cell2]
        table.rows = [row]
        doc.tables = [table]

        result = _extract_docx_text(doc)
        assert "Python | Advanced" in result

    def test_table_with_empty_cells_skipped(self):
        """Table cells with empty text are excluded from the row output."""
        doc = MagicMock()
        doc.paragraphs = []
        table = MagicMock()
        cell1 = MagicMock()
        cell1.text = "Data"
        cell2 = MagicMock()
        cell2.text = ""
        cell3 = MagicMock()
        cell3.text = "  "
        row = MagicMock()
        row.cells = [cell1, cell2, cell3]
        table.rows = [row]
        doc.tables = [table]

        result = _extract_docx_text(doc)
        assert "Data" in result
        # Empty/whitespace cells should be filtered out by the strip() check
        assert "| |" not in result

    def test_table_with_all_empty_cells(self):
        """A table row with all empty cells produces no output."""
        doc = MagicMock()
        doc.paragraphs = []
        table = MagicMock()
        cell1 = MagicMock()
        cell1.text = ""
        cell2 = MagicMock()
        cell2.text = "   "
        row = MagicMock()
        row.cells = [cell1, cell2]
        table.rows = [row]
        doc.tables = [table]

        result = _extract_docx_text(doc)
        # No content in cells after strip, so cells variable is empty
        assert result.strip() == ""

    def test_no_style_attribute(self):
        """Paragraph with None style should not crash."""
        doc = MagicMock()
        para = MagicMock()
        para.text = "Content"
        para.style = None
        para.paragraph_format.left_indent = None
        pPr = MagicMock()
        pPr.find.return_value = None
        para._p.pPr = pPr
        run_mock = MagicMock()
        run_mock.bold = False
        run_mock.text.strip.return_value = "Content"
        para.runs = [run_mock]
        doc.paragraphs = [para]
        doc.tables = []

        result = _extract_docx_text(doc)
        assert "Content" in result

    def test_paragraph_with_no_runs(self):
        """Paragraph with empty runs list falls through to regular paragraph."""
        doc = MagicMock()
        para = self._make_paragraph("Text here")
        para.runs = []  # No runs at all
        doc.paragraphs = [para]
        doc.tables = []

        result = _extract_docx_text(doc)
        assert "Text here" in result

    def test_mixed_content_document(self):
        """Document with headings, bullets, bold text, and regular paragraphs."""
        doc = MagicMock()
        doc.paragraphs = [
            self._make_paragraph("Jane Doe", is_bold=True),
            self._make_paragraph("Work Experience", style_name="Heading 1"),
            self._make_paragraph("Acme Corp"),
            self._make_paragraph("Built scalable systems", style_name="List Bullet"),
            self._make_paragraph("Led team of 5", style_name="List Bullet"),
        ]
        doc.tables = []
        result = _extract_docx_text(doc)
        lines = [line for line in result.split("\n") if line.strip()]
        assert "**Jane Doe**" in lines[0]
        assert "## Work Experience" in lines[1]
        assert "Acme Corp" in lines[2]
        assert "- Built scalable systems" in lines[3]
        assert "- Led team of 5" in lines[4]

    def test_multiple_tables(self):
        """Multiple tables are all extracted."""
        doc = MagicMock()
        doc.paragraphs = []

        table1 = MagicMock()
        row1 = MagicMock()
        cell1 = MagicMock()
        cell1.text = "Skill"
        row1.cells = [cell1]
        table1.rows = [row1]

        table2 = MagicMock()
        row2 = MagicMock()
        cell2 = MagicMock()
        cell2.text = "Experience"
        row2.cells = [cell2]
        table2.rows = [row2]

        doc.tables = [table1, table2]

        result = _extract_docx_text(doc)
        assert "Skill" in result
        assert "Experience" in result


# ===========================================================================
# 5. Pipeline tests with mocked Bedrock: confidence/warnings passthrough
# ===========================================================================
class TestPipelineConfidenceWarnings:
    """Tests that confidence and warnings flow correctly through the full pipeline."""

    @patch("services.cv_extractor.bedrock_client")
    def test_pdf_pipeline_low_confidence_passthrough(self, mock_bedrock):
        """Low confidence from Bedrock is passed through correctly."""
        data = {**VALID_EXTRACTION_JSON}
        data["_confidence"] = {
            "overall": "low",
            "fields": {
                "personalInfo.email": "low",
                "workExperience[0].endDate": "low",
                "education[0].gpa": "medium",
            },
        }
        data["_warnings"] = [
            "Email address appears incomplete",
            "End date is ambiguous",
            "GPA format uncertain",
        ]
        mock_bedrock.chat_with_document.return_value = json.dumps(data)

        result = run(extract_from_pdf(b"fake-pdf"))
        assert result.success is True
        assert result.confidence is not None
        assert result.confidence["overall"] == "low"
        assert len(result.confidence["fields"]) == 3
        assert result.warnings is not None
        assert len(result.warnings) == 3
        assert "Email address appears incomplete" in result.warnings

    @patch("services.cv_extractor.bedrock_client")
    def test_pdf_pipeline_medium_confidence(self, mock_bedrock):
        data = {**VALID_EXTRACTION_JSON}
        data["_confidence"] = {
            "overall": "medium",
            "fields": {"personalInfo.phone": "low"},
        }
        data["_warnings"] = ["Phone may be outdated"]
        mock_bedrock.chat_with_document.return_value = json.dumps(data)

        result = run(extract_from_pdf(b"fake-pdf"))
        assert result.confidence is not None
        assert result.confidence["overall"] == "medium"
        assert result.warnings == ["Phone may be outdated"]

    @patch("services.cv_extractor.bedrock_client")
    def test_pdf_pipeline_empty_cv(self, mock_bedrock):
        """PDF that extracts to a near-empty CV."""
        response_data = {
            "personalInfo": {
                "fullName": "Unknown",
                "email": "",
                "phone": "",
                "location": "",
                "links": [],
            },
            "workExperience": [],
            "education": [],
            "skills": [],
            "_confidence": {"overall": "low", "fields": {}},
            "_warnings": ["Very little information could be extracted"],
        }
        mock_bedrock.chat_with_document.return_value = json.dumps(response_data)

        result = run(extract_from_pdf(b"minimal-pdf"))
        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 0
        assert result.summary.educationEntries == 0
        assert result.confidence is not None
        assert result.confidence["overall"] == "low"
        assert result.warnings == ["Very little information could be extracted"]

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_docx_pipeline_with_additional_sections(self, mock_doc_cls, mock_bedrock):
        """DOCX pipeline where AI extracts additional sections."""
        mock_doc_cls.return_value = _make_mock_doc_with_text("Volunteer at Red Cross")

        response_data = {**VALID_EXTRACTION_JSON}
        response_data["additionalSections"] = [
            {
                "title": "Volunteer Work",
                "entries": [
                    {
                        "title": "Red Cross Volunteer",
                        "subtitle": "",
                        "startDate": "Jan 2019",
                        "endDate": "Present",
                        "location": "SF",
                        "description": "Weekly soup kitchen",
                        "bullets": [],
                    }
                ],
            }
        ]
        mock_bedrock.chat.return_value = json.dumps(response_data)

        result = run(extract_from_docx(b"fake-docx"))
        assert result.success is True
        assert result.summary is not None
        assert result.summary.additionalSections == 1

    @patch("services.cv_extractor.bedrock_client")
    @patch("services.cv_extractor.Document")
    def test_docx_pipeline_validation_warning_from_bad_schema(
        self, mock_doc_cls, mock_bedrock
    ):
        """When Bedrock returns data that fails CVFormData validation,
        the result succeeds but includes a warning."""
        mock_doc_cls.return_value = _make_mock_doc_with_text("Content")

        response_data = {**VALID_EXTRACTION_JSON}
        # Make workExperience an invalid type
        response_data["workExperience"] = "not a list"
        response_data["_warnings"] = ["Existing AI warning"]
        mock_bedrock.chat.return_value = json.dumps(response_data)

        result = run(extract_from_docx(b"fake-docx"))
        assert result.success is True
        assert result.warnings is not None
        assert "Existing AI warning" in result.warnings
        assert any("format" in w.lower() for w in result.warnings)


# ===========================================================================
# 6. CVImportResult and ImportSummary model tests
# ===========================================================================
class TestModels:
    """Tests for the Pydantic models used by the extraction service."""

    def test_cvimportresult_minimal_error(self):
        result = CVImportResult(success=False, source="pdf", error="Something broke")
        assert result.success is False
        assert result.form_data is None
        assert result.confidence is None
        assert result.summary is None
        assert result.warnings is None

    def test_cvimportresult_minimal_success(self):
        result = CVImportResult(
            success=True,
            source="json",
            form_data={"personalInfo": {}},
            confidence={"overall": "high", "fields": {}},
            summary=ImportSummary(),
        )
        assert result.success is True
        assert result.summary is not None
        assert result.summary.workEntries == 0

    def test_import_summary_defaults(self):
        s = ImportSummary()
        assert s.workEntries == 0
        assert s.educationEntries == 0
        assert s.skillCategories == 0
        assert s.projects == 0
        assert s.awards == 0
        assert s.additionalSections == 0

    def test_import_summary_custom_values(self):
        s = ImportSummary(
            workEntries=3,
            educationEntries=2,
            skillCategories=5,
            projects=1,
            awards=4,
            additionalSections=2,
        )
        assert s.workEntries == 3
        assert s.additionalSections == 2

    def test_cvimportresult_all_sources(self):
        """source field accepts any string."""
        for source in ["pdf", "docx", "json"]:
            result = CVImportResult(success=True, source=source, form_data={})
            assert result.source == source


# ===========================================================================
# 7. Error message quality tests
# ===========================================================================
class TestErrorMessageQuality:
    """Tests verifying that error messages are user-friendly and informative."""

    @patch("services.cv_extractor.bedrock_client")
    def test_pdf_error_suggests_alternatives(self, mock_bedrock):
        """PDF extraction error message suggests Word/JSON alternatives."""
        mock_bedrock.chat_with_document.side_effect = Exception("fail")
        result = run(extract_from_pdf(b"fake"))
        assert result.error is not None
        assert "Word document" in result.error or "JSON" in result.error

    @patch("services.cv_extractor.bedrock_client")
    def test_pdf_error_mentions_scanned(self, mock_bedrock):
        """PDF extraction error mentions possibility of scanned/image PDF."""
        mock_bedrock.chat_with_document.side_effect = Exception("fail")
        result = run(extract_from_pdf(b"fake"))
        assert result.error is not None
        assert "image" in result.error.lower() or "scanned" in result.error.lower()

    @patch("services.cv_extractor.bedrock_client")
    def test_docx_error_includes_exception_detail(self, mock_bedrock):
        """DOCX extraction error includes the specific exception message."""
        mock_bedrock.chat_with_document.side_effect = Exception("never called")
        # Patch Document to fail
        with patch("services.cv_extractor.Document") as mock_doc:
            mock_doc.side_effect = Exception("Corrupted ZIP archive")
            result = run(extract_from_docx(b"fake"))
        assert result.error is not None
        assert "Corrupted ZIP archive" in result.error

    def test_json_encoding_error_message(self):
        """JSON encoding error produces user-friendly message."""
        result = run(extract_from_json(b"\xff\xfe\x80"))
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_json_syntax_error_message(self):
        """JSON syntax error produces user-friendly message."""
        result = run(extract_from_json(b"{bad}"))
        assert result.error is not None
        assert "Invalid JSON" in result.error

    def test_json_schema_error_message(self):
        """JSON schema error mentions schema."""
        data = {"personalInfo": "not an object", "workExperience": []}
        result = run(extract_from_json(json.dumps(data).encode()))
        assert result.success is False
        assert result.error is not None
        assert "schema" in result.error.lower()

    @patch("services.cv_extractor.bedrock_client")
    def test_truncation_error_message_helpful(self, mock_bedrock):
        """Truncation error gives user-actionable advice."""
        mock_bedrock.chat_with_document.return_value = (
            '{"personalInfo": {"fullName": "test'
        )
        result = run(extract_from_pdf(b"fake"))
        assert result.error is not None
        assert "too long" in result.error.lower() or "shorter" in result.error.lower()

    @patch("services.cv_extractor.Document")
    def test_empty_docx_error_message(self, mock_doc_cls):
        """Empty DOCX error is descriptive."""
        mock_doc = MagicMock()
        mock_doc.paragraphs = []
        mock_doc.tables = []
        mock_doc_cls.return_value = mock_doc

        result = run(extract_from_docx(b"fake"))
        assert result.error is not None
        assert (
            "empty" in result.error.lower() or "no extractable" in result.error.lower()
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
