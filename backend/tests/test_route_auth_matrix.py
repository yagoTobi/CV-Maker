"""Table-driven public/private route authentication matrix.

Under ``AUTH_MODE=cognito`` every private ``/api``-prefixed route must reject a
request that carries no ``Authorization`` header with a 401, and every public
route must still respond (200). The ``get_current_user`` dependency
short-circuits before the handler body runs when no token is present, so no
Bedrock / LaTeX / storage side effects fire — the minimal valid bodies below
exist only so request-body validation passes and the failure is purely auth.

The routers mount under the ``/api`` prefix (see ``main.py``), so every path
here is ``/api``-prefixed.

Run with: cd backend && AUTH_MODE=cognito pytest tests/test_route_auth_matrix.py -q
"""

import os
import sys
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dependencies  # noqa: E402
from main import app  # noqa: E402


VERSION_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def client(monkeypatch):
    """App in cognito mode with dummy pool config and NO Authorization header.

    Monkeypatching ``dependencies.settings`` (the same singleton ``get_current_user``
    reads) forces cognito mode regardless of the ambient env, so the matrix holds
    even if the suite is run without ``AUTH_MODE=cognito`` exported.
    """
    monkeypatch.setattr(dependencies.settings, "auth_mode", "cognito")
    monkeypatch.setattr(dependencies.settings, "cognito_user_pool_id", "us-east-1_TESTPOOL")
    monkeypatch.setattr(dependencies.settings, "cognito_app_client_id", "test-client-id")
    return TestClient(app)


def _json_files(body):
    """Build a fresh multipart 'file' field for the cv-import route each call."""
    return {"file": ("cv.json", BytesIO(body), "application/json")}


# (id, method, path, json_body, files_factory) — files_factory is a no-arg
# callable so each parametrized run gets a fresh BytesIO (streams are consumed).
PRIVATE_ROUTES = [
    ("chat", "POST", "/api/chat",
     {"messages": [], "cv_content": "", "job_description": ""}, None),
    ("chat_analyze", "POST", "/api/chat/analyze",
     {"messages": [], "cv_content": "", "job_description": ""}, None),
    ("chat_match_analysis", "POST", "/api/chat/match-analysis",
     {"cv_content": "", "job_description": ""}, None),
    ("compile", "POST", "/api/compile",
     {"tex_content": "x"}, None),
    ("compile_pdf", "POST", "/api/compile/pdf",
     {"tex_content": "x"}, None),
    ("generate_latex", "POST", "/api/generate-latex",
     {"templateId": "med-length-proff-cv"}, None),
    ("cv_import", "POST", "/api/cv-import",
     None, lambda: _json_files(b"{}")),
    ("tailor_suggest", "POST", "/api/tailor/suggest-changes",
     {"form_data": {"templateId": "med-length-proff-cv"}, "job_description": ""}, None),
    ("user_data_get", "GET", "/api/user-data", None, None),
    ("user_data_post", "POST", "/api/user-data",
     {"additional_experiences": [], "skills_mentioned": [], "conversation_history": []}, None),
    ("user_data_delete", "DELETE", "/api/user-data", None, None),
    ("user_data_experience", "POST", "/api/user-data/experience",
     {"topic": "t", "description": "d"}, None),
    ("cv_versions_list", "GET", "/api/cv-versions", None, None),
    ("cv_versions_create", "POST", "/api/cv-versions",
     {"name": "test", "template_id": "med-length-proff-cv", "tex_content": "x"}, None),
    ("cv_versions_get", "GET", f"/api/cv-versions/{VERSION_ID}", None, None),
    ("cv_versions_delete", "DELETE", f"/api/cv-versions/{VERSION_ID}", None, None),
    ("cv_versions_patch", "PATCH", f"/api/cv-versions/{VERSION_ID}", {}, None),
    ("voice_profile_get", "GET", "/api/voice/profile", None, None),
    ("voice_profile_post", "POST", "/api/voice/profile",
     {"fullName": "", "summary": "", "skills_mentioned": [], "career_history": [],
      "projects_mentioned": [], "last_updated": ""}, None),
    ("voice_extract_cv", "POST", "/api/voice/extract-cv",
     {"session_id": "x"}, None),
]

PUBLIC_ROUTES = [
    ("health", "GET", "/api/health"),
    ("templates", "GET", "/api/templates"),
]


@pytest.mark.parametrize(
    "method,path,json_body,files_factory",
    [params[1:] for params in PRIVATE_ROUTES],
    ids=[params[0] for params in PRIVATE_ROUTES],
)
def test_private_route_requires_auth(client, method, path, json_body, files_factory):
    """Every private /api route returns 401 with no Authorization header."""
    kwargs = {}
    if json_body is not None:
        kwargs["json"] = json_body
    if files_factory is not None:
        kwargs["files"] = files_factory()
    resp = client.request(method, path, **kwargs)
    assert resp.status_code == 401, (
        f"{method} {path} returned {resp.status_code}, expected 401 "
        f"(body: {resp.text[:200]})"
    )


@pytest.mark.parametrize(
    "method,path",
    [params[1:] for params in PUBLIC_ROUTES],
    ids=[params[0] for params in PUBLIC_ROUTES],
)
def test_public_route_no_auth(client, method, path):
    """Public routes stay reachable (200) with no Authorization header."""
    resp = client.request(method, path)
    assert resp.status_code == 200, (
        f"{method} {path} returned {resp.status_code}, expected 200 "
        f"(body: {resp.text[:200]})"
    )
