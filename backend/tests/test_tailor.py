"""
Tests for POST /api/tailor/suggest-changes — Phase 13 plan 01 (D-07):

Covers:
- TailorRequest accepts optional user_clarifications: List[str]
- user_clarifications render under "## User-Confirmed Clarifications" in user_message
- Empty / whitespace-only clarifications are filtered before joining
- llm_cache.cache_key folds in user_clarifications fingerprint (separate cache buckets)
- Pydantic 422 on non-string list elements
- TAILOR_SUGGEST_PROMPT contains the new clarifications instruction block

Analog: backend/tests/test_update_version_payload.py (TestClient + monkeypatch pattern)
Threat: T-13-01-01 mitigation (cache key separation), T-13-01-04 (Pydantic validation).

Run with: python3 -m pytest tests/test_tailor.py -x -q
"""
import json
import os
import sys
from typing import List
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402
from prompts.cv_agent import TAILOR_SUGGEST_PROMPT  # noqa: E402


client = TestClient(app)


def _minimal_form_data() -> dict:
    """Tiny CVFormData payload that satisfies the Pydantic schema."""
    return {
        "templateId": "med-length-proff-cv",
        "personalInfo": {"fullName": "Jane Doe"},
        "workExperience": [
            {
                "id": "w1",
                "company": "Acme",
                "title": "Engineer",
                "startDate": "2020",
                "endDate": "2023",
                "location": "NYC",
                "bullets": [{"id": "b1", "text": "Built X"}],
            }
        ],
        "education": [
            {
                "id": "e1",
                "school": "MIT",
                "degree": "BS",
                "startDate": "2016",
                "endDate": "2020",
                "location": "MA",
                "details": [{"id": "d1", "text": "GPA 4.0"}],
            }
        ],
        "skills": [
            {"id": "s1", "category": "Languages", "skills": [{"id": "sk1", "text": "Python"}]}
        ],
    }


def _fake_ai_response() -> str:
    """A minimal valid TailorResponse JSON the route's parser accepts."""
    return json.dumps(
        {
            "changes": [
                {
                    "field_path": "workExperience[0].bullets[0]",
                    "section": "Work Experience",
                    "description": "Reword to highlight ownership",
                    "current_value": "Built X",
                    "alternatives": [
                        {"label": "Action-focused", "value": "Owned X end-to-end"}
                    ],
                    "change_type": "modify",
                }
            ],
            "estimated_score": 80,
            "summary": "1 reword.",
        }
    )


@pytest.fixture
def captured_messages(monkeypatch):
    """Mock bedrock_client.chat to capture the rendered user_message."""
    captured: List[str] = []

    def fake_chat(messages, system_prompt, **kwargs):
        # Capture user message content for assertions.
        if messages:
            captured.append(messages[0]["content"])
        return _fake_ai_response()

    from services import bedrock as bedrock_module

    monkeypatch.setattr(bedrock_module.bedrock_client, "chat", fake_chat)
    return captured


@pytest.fixture
def fresh_cache(monkeypatch):
    """Force every call to skip the cache by stubbing get → None."""
    from services import llm_cache as cache_module

    monkeypatch.setattr(cache_module, "get", lambda _key: None)
    monkeypatch.setattr(cache_module, "put", lambda *_args, **_kwargs: None)
    return cache_module


def test_user_clarifications_omitted_works(captured_messages, fresh_cache):
    """Backwards compat: omitting user_clarifications still returns 200, prompt has no clarifications block."""
    resp = client.post(
        "/api/tailor/suggest-changes",
        json={
            "form_data": _minimal_form_data(),
            "job_description": "Senior Engineer role at Acme.",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["changes"], "expected at least one change in response"
    assert captured_messages, "bedrock chat was not called"
    user_message = captured_messages[0]
    assert "User-Confirmed Clarifications" not in user_message


def test_user_clarifications_present_renders_in_user_message(captured_messages, fresh_cache):
    """When user_clarifications is non-empty, the user_message includes a labeled block with each entry."""
    payload = {
        "form_data": _minimal_form_data(),
        "job_description": "SWE role, Spanish-speaking team.",
        "user_clarifications": [
            "Native Spanish, lived in Madrid 3 years",
            "Led team of 12",
        ],
    }
    resp = client.post("/api/tailor/suggest-changes", json=payload)
    assert resp.status_code == 200, resp.text
    user_message = captured_messages[0]
    assert "## User-Confirmed Clarifications" in user_message
    assert "Native Spanish, lived in Madrid 3 years" in user_message
    assert "Led team of 12" in user_message


def test_user_clarifications_empty_strings_are_filtered(captured_messages, fresh_cache):
    """Empty / whitespace-only entries are filtered out before joining; no blank list rows."""
    payload = {
        "form_data": _minimal_form_data(),
        "job_description": "JD body",
        "user_clarifications": ["", "   ", "Real one"],
    }
    resp = client.post("/api/tailor/suggest-changes", json=payload)
    assert resp.status_code == 200, resp.text
    user_message = captured_messages[0]
    assert "## User-Confirmed Clarifications" in user_message
    assert "- Real one" in user_message
    # No blank bullet rows — "- \n" or "- " followed by newline must not appear inside the block.
    block_start = user_message.index("## User-Confirmed Clarifications")
    block_tail = user_message[block_start:]
    assert "- \n" not in block_tail
    assert "-  " not in block_tail.replace("- Real one", "")  # only valid bullet is "- Real one"


def test_user_clarifications_separate_cache_keys(monkeypatch):
    """Two requests with identical form_data/jd but different clarifications produce DIFFERENT cache keys."""
    from services import llm_cache as cache_module
    from services import bedrock as bedrock_module

    cache_key_spy = MagicMock(side_effect=lambda *parts: "key-" + "|".join(parts))
    monkeypatch.setattr(cache_module, "cache_key", cache_key_spy)
    monkeypatch.setattr(cache_module, "get", lambda _key: None)
    monkeypatch.setattr(cache_module, "put", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        bedrock_module.bedrock_client, "chat", lambda *a, **k: _fake_ai_response()
    )

    base_payload = {
        "form_data": _minimal_form_data(),
        "job_description": "Identical JD",
        "company_name": "Acme",
        "role": "SWE",
    }

    r1 = client.post(
        "/api/tailor/suggest-changes",
        json={**base_payload, "user_clarifications": ["I have native Spanish"]},
    )
    r2 = client.post(
        "/api/tailor/suggest-changes",
        json={**base_payload, "user_clarifications": ["I led a 12-person team"]},
    )
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    assert cache_key_spy.call_count >= 2
    args_first = cache_key_spy.call_args_list[0].args
    args_second = cache_key_spy.call_args_list[1].args
    assert args_first != args_second, (
        "cache_key was called with identical args for distinct clarification sets — "
        "this would collide caches across users (T-13-01-01)."
    )


def test_user_clarifications_invalid_type_returns_422():
    """Pydantic rejects non-string elements at the FastAPI layer (T-13-01-04)."""
    resp = client.post(
        "/api/tailor/suggest-changes",
        json={
            "form_data": _minimal_form_data(),
            "job_description": "JD",
            "user_clarifications": [123],  # not a string
        },
    )
    assert resp.status_code == 422, resp.text


def test_tailor_prompt_contains_clarifications_instruction():
    """TAILOR_SUGGEST_PROMPT contains the new clarifications block + 'PREFER add change_type' rule."""
    assert "User-Confirmed Clarifications" in TAILOR_SUGGEST_PROMPT
    assert "PREFER `add` change_type" in TAILOR_SUGGEST_PROMPT
