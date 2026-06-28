"""CORS middleware behaviour tests.

``main`` builds its allow-origin list from ``CORS_ORIGINS`` at import time and
reads ``auth_mode`` from the ``config`` settings singleton, so each case sets the
env / mutates that singleton and then ``importlib.reload``s ``main`` to re-run
the middleware wiring. The singleton must be mutated in place (not via a
reloaded ``config.settings`` copy) because ``config/__init__.py`` re-exports the
instance, which is the object ``main`` actually reads.

Run with: cd backend && pytest tests/test_cors.py -q
"""

import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import settings as _settings  # noqa: E402  (the singleton main reads)
import main as _main  # noqa: E402


@pytest.fixture(autouse=True)
def _restore_state():
    """Snapshot and restore the shared auth_mode / CORS env so cases stay hermetic."""
    original_auth_mode = _settings.auth_mode
    original_cors = os.environ.get("CORS_ORIGINS")
    yield
    _settings.auth_mode = original_auth_mode  # type: ignore[assignment]
    if original_cors is None:
        os.environ.pop("CORS_ORIGINS", None)
    else:
        os.environ["CORS_ORIGINS"] = original_cors


def _make_client(cors_origins: str, auth_mode: str = "dev") -> TestClient:
    """Reload main with specific env + auth_mode to avoid stale CORS state."""
    os.environ["CORS_ORIGINS"] = cors_origins
    _settings.auth_mode = auth_mode  # type: ignore[assignment]
    importlib.reload(_main)
    return TestClient(_main.app)


def test_allowed_origin_passes_preflight():
    client = _make_client("http://localhost:5173")
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert resp.status_code == 200
    assert resp.headers.get("Access-Control-Allow-Credentials") == "true"
    assert "http://localhost:5173" in resp.headers.get("Access-Control-Allow-Origin", "")


def test_disallowed_origin_rejected():
    client = _make_client("http://localhost:5173")
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        }
    )
    # Disallowed origin: no ACAO header or wildcard
    acao = resp.headers.get("Access-Control-Allow-Origin", "")
    assert "evil.example.com" not in acao


def test_max_age_header_present():
    client = _make_client("http://localhost:5173")
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert resp.headers.get("Access-Control-Max-Age") == "600"


def test_trailing_comma_cors_origins_no_empty_member():
    """CORS_ORIGINS with trailing comma must not add a blank allowlist member."""
    client = _make_client("http://localhost:5173, ")
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
    )
    acao = resp.headers.get("Access-Control-Allow-Origin", "")
    assert acao != ""  # allowed origin still works
    # The empty string must not appear as an allowed origin
    assert " " not in acao


def test_cognito_mode_omits_x_user_id_from_allow_headers():
    """In cognito mode, X-User-Id must NOT be advertised in allow_headers."""
    client = _make_client("http://localhost:5173", auth_mode="cognito")
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-User-Id",
        }
    )
    allowed_headers = resp.headers.get("Access-Control-Allow-Headers", "").lower()
    assert "x-user-id" not in allowed_headers
