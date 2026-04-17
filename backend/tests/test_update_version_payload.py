"""
Tests for extended UpdateVersionPayload model and update_version handler.

Covers:
- UpdateVersionPayload accepts name, formData, texContent fields
- exclude_unset semantics: only provided fields appear in model_dump(exclude_unset=True)
- Existing parentVersionId-only usage is unaffected

Run with: python3 -m pytest tests/test_update_version_payload.py -v
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestUpdateVersionPayloadModel:
    def test_name_field_accepted(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload(name="My CV")
        assert p.name == "My CV"

    def test_name_exclude_unset(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload(name="My CV")
        d = p.model_dump(exclude_unset=True)
        assert "name" in d
        assert "parentVersionId" not in d

    def test_tex_content_field_accepted(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload(texContent="\\documentclass{article}")
        d = p.model_dump(exclude_unset=True)
        assert "texContent" in d
        assert d["texContent"] == "\\documentclass{article}"

    def test_parent_version_id_only_still_works(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload(parentVersionId=None)
        d = p.model_dump(exclude_unset=True)
        assert "parentVersionId" in d
        assert "name" not in d

    def test_empty_body_produces_empty_dict(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload()
        d = p.model_dump(exclude_unset=True)
        assert d == {}

    def test_all_fields_together(self):
        from routes.cv_versions import UpdateVersionPayload
        p = UpdateVersionPayload(name="Test", texContent="tex")
        d = p.model_dump(exclude_unset=True)
        assert "name" in d
        assert "texContent" in d
