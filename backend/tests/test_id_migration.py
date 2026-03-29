"""
Tests for the ensure_ids migration helper and backward compatibility.

Covers:
- Legacy data (bare string bullets/skills) is migrated to structured format
- IDs are generated for all entry types
- Already-migrated data passes through unchanged
- Pydantic models accept both old and new formats

Run with: python3 -m pytest tests/test_id_migration.py -v
"""
import sys
import os
import json
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.id_helpers import generate_id, ensure_ids
from routes.cv_versions import (
    CVFormData, PersonalInfo, WorkEntry, EducationEntry,
    SkillCategory, Project, Award, AdditionalEntry,
    AdditionalSection, BulletItem, SkillItem,
)


class TestGenerateId:
    def test_returns_nonempty_string(self):
        rid = generate_id()
        assert isinstance(rid, str)
        assert len(rid) > 0

    def test_unique_ids(self):
        ids = {generate_id() for _ in range(100)}
        assert len(ids) == 100  # All unique


class TestEnsureIds:
    def test_adds_ids_to_work_entries(self):
        data = {"workExperience": [{"company": "Acme", "bullets": ["Built X"]}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["workExperience"][0].get("id")
        assert isinstance(result["workExperience"][0]["bullets"][0], dict)
        assert result["workExperience"][0]["bullets"][0]["text"] == "Built X"
        assert result["workExperience"][0]["bullets"][0].get("id")

    def test_adds_ids_to_education(self):
        data = {"education": [{"school": "MIT", "details": ["GPA 4.0"]}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["education"][0].get("id")
        assert result["education"][0]["details"][0]["text"] == "GPA 4.0"

    def test_adds_ids_to_skills(self):
        data = {"skills": [{"category": "Languages", "skills": ["Python", "Go"]}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["skills"][0].get("id")
        assert result["skills"][0]["skills"][0]["text"] == "Python"
        assert result["skills"][0]["skills"][1]["text"] == "Go"

    def test_adds_ids_to_projects(self):
        data = {"projects": [{"name": "Proj", "bullets": ["Did X"]}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["projects"][0].get("id")

    def test_adds_ids_to_awards(self):
        data = {"awards": [{"year": "2023", "title": "Best"}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["awards"][0].get("id")

    def test_adds_ids_to_additional_sections(self):
        data = {"additionalSections": [{"title": "Custom", "entries": [{"title": "Entry", "bullets": ["Item"]}]}]}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["additionalSections"][0].get("id")
        assert result["additionalSections"][0]["entries"][0].get("id")

    def test_adds_ids_to_links(self):
        data = {"personalInfo": {"links": [{"label": "GitHub", "url": "https://github.com"}]}}
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["personalInfo"]["links"][0].get("id")

    def test_already_migrated_data_not_modified(self):
        data = {
            "workExperience": [{
                "id": "existing-id",
                "company": "Acme",
                "bullets": [{"id": "b1", "text": "Built X"}]
            }]
        }
        result, modified = ensure_ids(data)
        assert modified is False
        assert result["workExperience"][0]["id"] == "existing-id"
        assert result["workExperience"][0]["bullets"][0]["id"] == "b1"

    def test_handles_empty_data(self):
        data = {}
        result, modified = ensure_ids(data)
        assert modified is False

    def test_handles_none_optional_sections(self):
        data = {"projects": None, "awards": None, "additionalSections": None}
        result, modified = ensure_ids(data)
        assert modified is False

    def test_partial_migration_fills_missing_ids(self):
        """Entries with some IDs and some without get only the missing ones filled."""
        data = {
            "workExperience": [
                {"id": "w1", "company": "Acme", "bullets": [{"id": "b1", "text": "X"}, "bare string"]},
            ]
        }
        result, modified = ensure_ids(data)
        assert modified is True
        assert result["workExperience"][0]["id"] == "w1"  # Preserved
        assert result["workExperience"][0]["bullets"][0]["id"] == "b1"  # Preserved
        assert result["workExperience"][0]["bullets"][1]["text"] == "bare string"  # Migrated
        assert result["workExperience"][0]["bullets"][1].get("id")  # Got new ID

    def test_ids_are_stable_across_calls(self):
        """Running ensure_ids twice on already-migrated data should not change IDs."""
        data = {"workExperience": [{"company": "Acme", "bullets": ["Built X"]}]}
        result1, _ = ensure_ids(data)
        id1 = result1["workExperience"][0]["id"]
        bullet_id1 = result1["workExperience"][0]["bullets"][0]["id"]

        result2, modified = ensure_ids(result1)
        assert modified is False
        assert result2["workExperience"][0]["id"] == id1
        assert result2["workExperience"][0]["bullets"][0]["id"] == bullet_id1


class TestPydanticBackwardCompat:
    """Pydantic models must accept both old format (bare strings) and new format (structured)."""

    def test_work_entry_accepts_bare_string_bullets(self):
        w = WorkEntry(company="Acme", bullets=["Built X", "Did Y"])
        assert w.bullets[0].text == "Built X"
        assert w.bullets[1].text == "Did Y"

    def test_work_entry_accepts_structured_bullets(self):
        w = WorkEntry(company="Acme", bullets=[{"id": "b1", "text": "Built X"}])
        assert w.bullets[0].text == "Built X"
        assert w.bullets[0].id == "b1"

    def test_education_accepts_bare_string_details(self):
        e = EducationEntry(school="MIT", details=["GPA 4.0"])
        assert e.details[0].text == "GPA 4.0"

    def test_skills_accepts_bare_string_skills(self):
        s = SkillCategory(category="Languages", skills=["Python"])
        assert s.skills[0].text == "Python"

    def test_skills_accepts_structured_skills(self):
        s = SkillCategory(category="Languages", skills=[{"id": "sk1", "text": "Python"}])
        assert s.skills[0].text == "Python"

    def test_full_cv_form_data_with_legacy_format(self):
        """Full CVFormData with legacy format (no IDs, bare strings) should deserialize."""
        fd = CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="John"),
            workExperience=[WorkEntry(company="Acme", bullets=["Built X"])],
            education=[EducationEntry(school="MIT", details=["GPA"])],
            skills=[SkillCategory(category="Lang", skills=["Python"])],
        )
        assert fd.workExperience[0].bullets[0].text == "Built X"
        assert fd.skills[0].skills[0].text == "Python"

    def test_full_cv_form_data_with_new_format(self):
        """Full CVFormData with new structured format should deserialize."""
        fd = CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="John"),
            workExperience=[WorkEntry(
                id="w1",
                company="Acme",
                bullets=[BulletItem(id="b1", text="Built X")],
            )],
            skills=[SkillCategory(
                id="s1",
                category="Lang",
                skills=[SkillItem(id="sk1", text="Python")],
            )],
        )
        assert fd.workExperience[0].id == "w1"
        assert fd.workExperience[0].bullets[0].id == "b1"
        assert fd.workExperience[0].bullets[0].text == "Built X"


class TestFlattenForTemplate:
    """Test that _flatten_for_template produces template-ready dicts."""

    def test_flattens_bullets_to_strings(self):
        from routes.generate_latex import _flatten_for_template
        fd = CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="Test"),
            workExperience=[WorkEntry(id="w1", bullets=[BulletItem(id="b1", text="Built X")])],
        )
        flat = _flatten_for_template(fd)
        assert flat["workExperience"][0]["bullets"] == ["Built X"]
        assert "id" not in flat["workExperience"][0]

    def test_flattens_skills_to_strings(self):
        from routes.generate_latex import _flatten_for_template
        fd = CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="Test"),
            skills=[SkillCategory(id="s1", category="Lang", skills=[SkillItem(id="sk1", text="Python")])],
        )
        flat = _flatten_for_template(fd)
        assert flat["skills"][0]["skills"] == ["Python"]
        assert "id" not in flat["skills"][0]

    def test_flattens_education_details(self):
        from routes.generate_latex import _flatten_for_template
        fd = CVFormData(
            templateId="med-length-proff-cv",
            personalInfo=PersonalInfo(fullName="Test"),
            education=[EducationEntry(id="e1", school="MIT", details=[BulletItem(id="d1", text="GPA 4.0")])],
        )
        flat = _flatten_for_template(fd)
        assert flat["education"][0]["details"] == ["GPA 4.0"]
        assert "id" not in flat["education"][0]


class TestStripIdsForAi:
    """Test that _strip_ids_for_ai removes IDs and flattens for AI consumption."""

    def test_strips_work_ids_and_flattens_bullets(self):
        from routes.tailor import _strip_ids_for_ai
        data = {
            "workExperience": [{"id": "w1", "company": "Acme", "bullets": [{"id": "b1", "text": "Built X"}]}]
        }
        result = _strip_ids_for_ai(data)
        assert "id" not in result["workExperience"][0]
        assert result["workExperience"][0]["bullets"] == ["Built X"]

    def test_does_not_mutate_original(self):
        from routes.tailor import _strip_ids_for_ai
        data = {
            "workExperience": [{"id": "w1", "company": "Acme", "bullets": [{"id": "b1", "text": "X"}]}]
        }
        _strip_ids_for_ai(data)
        assert data["workExperience"][0]["id"] == "w1"
        assert data["workExperience"][0]["bullets"][0]["id"] == "b1"

    def test_handles_all_sections(self):
        from routes.tailor import _strip_ids_for_ai
        data = {
            "personalInfo": {"links": [{"id": "l1", "label": "GH", "url": "https://gh.com"}]},
            "workExperience": [{"id": "w1", "bullets": [{"id": "b1", "text": "X"}]}],
            "education": [{"id": "e1", "details": [{"id": "d1", "text": "GPA"}]}],
            "skills": [{"id": "s1", "skills": [{"id": "sk1", "text": "Py"}]}],
            "projects": [{"id": "p1", "bullets": [{"id": "pb1", "text": "Y"}]}],
            "awards": [{"id": "a1", "title": "Best"}],
            "additionalSections": [{"id": "as1", "entries": [{"id": "ae1", "bullets": [{"id": "ab1", "text": "Z"}]}]}],
        }
        result = _strip_ids_for_ai(data)
        assert "id" not in result["personalInfo"]["links"][0]
        assert "id" not in result["workExperience"][0]
        assert "id" not in result["education"][0]
        assert "id" not in result["skills"][0]
        assert "id" not in result["projects"][0]
        assert "id" not in result["awards"][0]
        assert "id" not in result["additionalSections"][0]
        assert "id" not in result["additionalSections"][0]["entries"][0]
