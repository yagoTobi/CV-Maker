"""
Tests for section-assist prompt generation (T6 from section-ai-assist plan).

Covers:
- get_section_assist_prompt(section_type) returns section-type-aware system prompts
- Prompts follow the gold-standard bullet format
- Prompts enforce ≤3 bullet constraint
- Prompts include no-fabrication rule
- Prompts output valid JSON with {"bullets": [...]} contract
- Unknown section types return a generic fallback (no exception)
- Language detection mirrors cv_agent.py line 24 rule

Run with: python3 -m pytest tests/test_section_assist_prompt.py -v
"""

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from prompts.cv_agent import SECTION_ASSIST_PROMPT, get_section_assist_prompt


class TestSectionAssistPromptConstant:
    """Test the SECTION_ASSIST_PROMPT constant exists and is non-empty."""

    def test_section_assist_prompt_is_string(self):
        """SECTION_ASSIST_PROMPT is a non-empty string."""
        assert isinstance(SECTION_ASSIST_PROMPT, str)
        assert len(SECTION_ASSIST_PROMPT) > 0

    def test_section_assist_prompt_contains_gold_standard_guidance(self):
        """SECTION_ASSIST_PROMPT references the gold-standard bullet format."""
        assert "Action Verb" in SECTION_ASSIST_PROMPT or "action verb" in SECTION_ASSIST_PROMPT.lower()


class TestGetSectionAssistPrompt:
    """Test get_section_assist_prompt(section_type) function."""

    def test_work_section_returns_non_empty_string(self):
        """get_section_assist_prompt('work') returns a non-empty string."""
        result = get_section_assist_prompt("work")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_work_section_contains_impact_or_metrics_guidance(self):
        """Work section prompt contains guidance on impact or metrics."""
        result = get_section_assist_prompt("work")
        result_lower = result.lower()
        assert "impact" in result_lower or "metrics" in result_lower or "achievement" in result_lower

    def test_education_section_returns_non_empty_string(self):
        """get_section_assist_prompt('education') returns a non-empty string."""
        result = get_section_assist_prompt("education")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_education_section_contains_thesis_or_coursework_guidance(self):
        """Education section prompt contains guidance on thesis, coursework, or research."""
        result = get_section_assist_prompt("education")
        result_lower = result.lower()
        assert (
            "thesis" in result_lower
            or "coursework" in result_lower
            or "research" in result_lower
            or "specialization" in result_lower
        )

    def test_project_section_returns_non_empty_string(self):
        """get_section_assist_prompt('project') returns a non-empty string."""
        result = get_section_assist_prompt("project")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_additional_section_returns_non_empty_string(self):
        """get_section_assist_prompt('additional') returns a non-empty string."""
        result = get_section_assist_prompt("additional")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_unknown_section_type_returns_non_empty_string(self):
        """get_section_assist_prompt('unknown_type') returns a non-empty string (generic fallback, no exception)."""
        result = get_section_assist_prompt("unknown_type")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_unknown_section_type_does_not_raise(self):
        """Unknown section types do not raise an exception."""
        # Should not raise
        get_section_assist_prompt("nonexistent_section")
        get_section_assist_prompt("")
        get_section_assist_prompt("xyz123")

    def test_all_prompts_contain_json_contract(self):
        """All section prompts contain the JSON contract {"bullets": [...]}."""
        for section_type in ["work", "education", "project", "additional", "unknown"]:
            result = get_section_assist_prompt(section_type)
            result_lower = result.lower()
            assert '{"bullets"' in result or '"bullets"' in result

    def test_all_prompts_contain_bullet_count_constraint(self):
        """All section prompts contain text about ≤3 bullets or 'at most 3' or 'maximum 3'."""
        for section_type in ["work", "education", "project", "additional"]:
            result = get_section_assist_prompt(section_type)
            result_lower = result.lower()
            assert (
                "≤3" in result
                or "at most 3" in result_lower
                or "maximum 3" in result_lower
                or "3 bullet" in result_lower
                or "three bullet" in result_lower
            )

    def test_all_prompts_contain_no_fabrication_rule(self):
        """All section prompts contain text about NOT fabricating/inventing."""
        for section_type in ["work", "education", "project", "additional"]:
            result = get_section_assist_prompt(section_type)
            result_lower = result.lower()
            assert (
                "fabricat" in result_lower
                or "invent" in result_lower
                or "never fabricat" in result_lower
                or "do not fabricat" in result_lower
                or "don't fabricat" in result_lower
            )

    def test_work_section_emphasizes_team_and_scale(self):
        """Work section prompt emphasizes team size, scale, and metrics."""
        result = get_section_assist_prompt("work")
        result_lower = result.lower()
        assert (
            "team" in result_lower
            or "scale" in result_lower
            or "metrics" in result_lower
            or "achievement" in result_lower
        )

    def test_education_section_emphasizes_research_or_specialization(self):
        """Education section prompt emphasizes research, specialization, or publications."""
        result = get_section_assist_prompt("education")
        result_lower = result.lower()
        assert (
            "research" in result_lower
            or "specialization" in result_lower
            or "publication" in result_lower
            or "thesis" in result_lower
        )

    def test_project_section_emphasizes_tech_stack_and_outcome(self):
        """Project section prompt emphasizes tech stack, what was built, or outcome."""
        result = get_section_assist_prompt("project")
        result_lower = result.lower()
        assert (
            "tech" in result_lower
            or "built" in result_lower
            or "outcome" in result_lower
            or "stack" in result_lower
        )

    def test_prompts_are_deterministic(self):
        """Calling get_section_assist_prompt twice with the same section_type returns identical strings."""
        for section_type in ["work", "education", "project", "additional"]:
            result1 = get_section_assist_prompt(section_type)
            result2 = get_section_assist_prompt(section_type)
            assert result1 == result2

    def test_prompts_contain_language_detection_rule(self):
        """Prompts reference language detection (mirror cv_agent.py line 24 rule)."""
        # At least one prompt should mention language detection
        prompts = [
            get_section_assist_prompt("work"),
            get_section_assist_prompt("education"),
            get_section_assist_prompt("project"),
        ]
        combined = " ".join(prompts)
        combined_lower = combined.lower()
        assert (
            "language" in combined_lower
            or "detect" in combined_lower
            or "respond in" in combined_lower
        )

    def test_prompts_reference_gold_standard_format(self):
        """Prompts reference the gold-standard bullet format."""
        # At least one prompt should mention the format
        prompts = [
            get_section_assist_prompt("work"),
            get_section_assist_prompt("education"),
            get_section_assist_prompt("project"),
        ]
        combined = " ".join(prompts)
        combined_lower = combined.lower()
        assert (
            "action verb" in combined_lower
            or "gold standard" in combined_lower
            or "quantified" in combined_lower
        )
