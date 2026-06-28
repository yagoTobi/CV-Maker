"""Test that LLM cache keys are scoped per user at the call sites."""
import json
import os
import sys
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402
from services.ai import llm_cache  # noqa: E402


@pytest.fixture
def client():
    """Create a test client with dev auth mode."""
    with patch.dict("os.environ", {"AUTH_MODE": "dev"}):
        yield TestClient(app)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the cache before and after each test."""
    llm_cache._cache.clear()
    yield
    llm_cache._cache.clear()


def test_match_analysis_same_user_cache_hit(client):
    """Same user + same input → cache hit (Bedrock called once)."""
    user_id = "user_a"
    cv_content = "Python, React, 5 years experience"
    job_description = "Senior Python Developer"
    company_name = "TechCorp"

    mock_response = {
        "requirements": ["Python", "React"],
        "matching": ["Python", "React"],
        "missing": ["Docker"],
        "suggestions": ["Add Docker skills"],
        "match_score": 85,
    }

    with patch("routes.chat.bedrock_client.chat") as mock_chat:
        mock_chat.return_value = json.dumps(mock_response)

        # First call
        response1 = client.post(
            "/api/chat/match-analysis",
            json={
                "cv_content": cv_content,
                "job_description": job_description,
                "company_name": company_name,
            },
            headers={"X-User-Id": user_id},
        )
        assert response1.status_code == 200
        assert response1.json()["match_score"] == 85

        # Second call (should hit cache)
        response2 = client.post(
            "/api/chat/match-analysis",
            json={
                "cv_content": cv_content,
                "job_description": job_description,
                "company_name": company_name,
            },
            headers={"X-User-Id": user_id},
        )
        assert response2.status_code == 200
        assert response2.json()["match_score"] == 85

        # Bedrock should be called exactly once
        assert mock_chat.call_count == 1


def test_match_analysis_different_user_cache_miss(client):
    """Different user + same input → cache miss (Bedrock called twice)."""
    cv_content = "Python, React, 5 years experience"
    job_description = "Senior Python Developer"
    company_name = "TechCorp"

    mock_response = {
        "requirements": ["Python", "React"],
        "matching": ["Python", "React"],
        "missing": ["Docker"],
        "suggestions": ["Add Docker skills"],
        "match_score": 85,
    }

    with patch("routes.chat.bedrock_client.chat") as mock_chat:
        mock_chat.return_value = json.dumps(mock_response)

        # User A calls
        response1 = client.post(
            "/api/chat/match-analysis",
            json={
                "cv_content": cv_content,
                "job_description": job_description,
                "company_name": company_name,
            },
            headers={"X-User-Id": "user_a"},
        )
        assert response1.status_code == 200

        # User B calls with identical input
        response2 = client.post(
            "/api/chat/match-analysis",
            json={
                "cv_content": cv_content,
                "job_description": job_description,
                "company_name": company_name,
            },
            headers={"X-User-Id": "user_b"},
        )
        assert response2.status_code == 200

        # Bedrock should be called twice (no cross-user cache hit)
        assert mock_chat.call_count == 2


def test_tailor_suggest_changes_same_user_cache_hit(client):
    """Same user + same input → cache hit (Bedrock called once)."""
    user_id = "user_a"
    form_data = {
        "templateId": "modern",
        "personalInfo": {
            "fullName": "John Doe",
            "email": "john@example.com",
        },
        "workExperience": [
            {
                "company": "TechCorp",
                "position": "Developer",
                "duration": "2020-2023",
            }
        ],
    }
    job_description = "Senior Python Developer"
    company_name = "NewCorp"
    role = "Senior Developer"

    mock_response = {
        "changes": [],
        "estimated_score": 90,
        "summary": "Good match with minor updates",
    }

    with patch("routes.tailor.bedrock_client.chat") as mock_chat:
        mock_chat.return_value = json.dumps(mock_response)

        # First call
        response1 = client.post(
            "/api/tailor/suggest-changes",
            json={
                "form_data": form_data,
                "job_description": job_description,
                "company_name": company_name,
                "role": role,
                "user_clarifications": ["Interested in remote work"],
            },
            headers={"X-User-Id": user_id},
        )
        assert response1.status_code == 200
        assert response1.json()["estimatedScore"] == 90

        # Second call (should hit cache)
        response2 = client.post(
            "/api/tailor/suggest-changes",
            json={
                "form_data": form_data,
                "job_description": job_description,
                "company_name": company_name,
                "role": role,
                "user_clarifications": ["Interested in remote work"],
            },
            headers={"X-User-Id": user_id},
        )
        assert response2.status_code == 200
        assert response2.json()["estimatedScore"] == 90

        # Bedrock should be called exactly once
        assert mock_chat.call_count == 1


def test_tailor_suggest_changes_different_user_cache_miss(client):
    """Different user + same input → cache miss (Bedrock called twice)."""
    form_data = {
        "templateId": "modern",
        "personalInfo": {
            "fullName": "John Doe",
            "email": "john@example.com",
        },
        "workExperience": [
            {
                "company": "TechCorp",
                "position": "Developer",
                "duration": "2020-2023",
            }
        ],
    }
    job_description = "Senior Python Developer"
    company_name = "NewCorp"
    role = "Senior Developer"

    mock_response = {
        "changes": [],
        "estimated_score": 90,
        "summary": "Good match with minor updates",
    }

    with patch("routes.tailor.bedrock_client.chat") as mock_chat:
        mock_chat.return_value = json.dumps(mock_response)

        # User A calls
        response1 = client.post(
            "/api/tailor/suggest-changes",
            json={
                "form_data": form_data,
                "job_description": job_description,
                "company_name": company_name,
                "role": role,
                "user_clarifications": ["Interested in remote work"],
            },
            headers={"X-User-Id": "user_a"},
        )
        assert response1.status_code == 200

        # User B calls with identical input
        response2 = client.post(
            "/api/tailor/suggest-changes",
            json={
                "form_data": form_data,
                "job_description": job_description,
                "company_name": company_name,
                "role": role,
                "user_clarifications": ["Interested in remote work"],
            },
            headers={"X-User-Id": "user_b"},
        )
        assert response2.status_code == 200

        # Bedrock should be called twice (no cross-user cache hit)
        assert mock_chat.call_count == 2


def test_cache_key_includes_user_id():
    """Verify that cache_key includes user_id as first argument."""
    user_a_key = llm_cache.cache_key("user_a", "cv", "job", "company")
    user_b_key = llm_cache.cache_key("user_b", "cv", "job", "company")

    # Different user_ids should produce different cache keys
    assert user_a_key != user_b_key

    # Same user_id should produce same cache key
    user_a_key_2 = llm_cache.cache_key("user_a", "cv", "job", "company")
    assert user_a_key == user_a_key_2
