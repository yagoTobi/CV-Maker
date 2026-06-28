"""TDD tests for the section-assist route: ``POST /api/assist/bullets``.

Drives the route through a real FastAPI app + TestClient, overriding the
``get_current_user`` dependency (the dev-auth shim) so each request resolves to
a known user id. The three downstream services — ``assist_complete`` (LLM),
``guardrail_screen`` (Bedrock Guardrails), ``check_and_increment`` (rate
limiter) — are patched on the route module so the tests never touch AWS or the
network.

The in-memory caches (``llm_cache`` + the three rate-limit caches) are replaced
with fresh instances before every test so cross-test state never leaks.

Run with: cd backend && python3 -m pytest tests/test_assist_route.py -q
"""

import os
import sys
from unittest.mock import MagicMock

import cachetools
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dependencies  # noqa: E402
import routes.assist as assist_route  # noqa: E402
from config import assist_settings  # noqa: E402
from dependencies import get_current_user  # noqa: E402
from routes.assist import router  # noqa: E402
from services.ai import llm_cache, rate_limit  # noqa: E402
from services.ai.guardrails import GuardrailResult  # noqa: E402
from services.ai.rate_limit import RateLimitResult  # noqa: E402


# --- App + client (override the auth shim to a fixed user) -------------------

app = FastAPI()
app.include_router(router, prefix="/api")
app.dependency_overrides[get_current_user] = lambda: "user-a"
client = TestClient(app)


# --- Fixtures ----------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    """Fresh caches + deterministic settings + a clean user-a override per test."""
    # Swap in brand-new caches so no entry survives from a prior test.
    monkeypatch.setattr(llm_cache, "_cache", cachetools.TTLCache(maxsize=256, ttl=3600))
    monkeypatch.setattr(
        rate_limit, "_per_min_cache", cachetools.TTLCache(maxsize=10000, ttl=60)
    )
    monkeypatch.setattr(
        rate_limit, "_per_day_cache", cachetools.TTLCache(maxsize=10000, ttl=86400)
    )
    monkeypatch.setattr(
        rate_limit, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60)
    )
    # Pin the knobs the assertions depend on; individual tests may override.
    monkeypatch.setattr(assist_settings, "max_bullets", 3)
    monkeypatch.setattr(assist_settings, "guardrail_output", False)
    app.dependency_overrides[get_current_user] = lambda: "user-a"
    yield
    app.dependency_overrides.pop(get_current_user, None)


# --- Helpers -----------------------------------------------------------------

def _payload(**overrides):
    """A valid AssistRequest body; override any field per test."""
    body = {
        "section_type": "work",
        "entry_context": {"title": "Software Engineer", "organization": "Acme"},
        "user_answer": "I led a team that built a data pipeline",
        "existing_bullets": [],
    }
    body.update(overrides)
    return body


def _allow(monkeypatch):
    """Patch the rate limiter to always allow."""
    monkeypatch.setattr(
        assist_route,
        "check_and_increment",
        MagicMock(return_value=RateLimitResult(allowed=True, retry_after=0, scope="")),
    )


def _guardrail_pass(monkeypatch):
    """Patch the guardrail to never block; return the mock for inspection."""
    m = MagicMock(return_value=GuardrailResult(blocked=False))
    monkeypatch.setattr(assist_route, "guardrail_screen", m)
    return m


def _assist(monkeypatch, raw_json):
    """Patch the LLM seam to return ``raw_json`` (a JSON string); return the mock."""
    m = MagicMock(return_value=raw_json)
    monkeypatch.setattr(assist_route, "assist_complete", m)
    return m


# --- 1. Happy path -----------------------------------------------------------

def test_happy_path_returns_bullets(monkeypatch):
    """Valid request -> 200 with <=3 bullets and blocked=False."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    _assist(monkeypatch, '{"bullets": ["Led team of 5", "Built data pipeline"]}')

    resp = client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked"] is False
    assert isinstance(body["bullets"], list)
    assert 1 <= len(body["bullets"]) <= 3


# --- 2. Blank answer AND focus ------------------------------------------------

def test_blank_answer_and_focus_returns_400(monkeypatch):
    """Whitespace-only user_answer and focus -> 400 (nothing to work with)."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    _assist(monkeypatch, '{"bullets": ["x"]}')

    resp = client.post(
        "/api/assist/bullets", json=_payload(user_answer="   ", focus="  ")
    )

    assert resp.status_code == 400


# --- 3. Rate limited ----------------------------------------------------------

def test_rate_limited_returns_429_with_retry_after(monkeypatch):
    """Limiter rejects -> 429 with a Retry-After header carrying retry_after."""
    monkeypatch.setattr(
        assist_route,
        "check_and_increment",
        MagicMock(
            return_value=RateLimitResult(allowed=False, retry_after=60, scope="user-min")
        ),
    )

    resp = client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 429
    assert resp.headers.get("Retry-After") == "60"


# --- 4. INPUT guardrail intervened -------------------------------------------

def test_input_guardrail_blocks_returns_200_blocked(monkeypatch):
    """INPUT guardrail blocks -> 200 blocked=True, bullets=[], no LLM call."""
    _allow(monkeypatch)
    monkeypatch.setattr(
        assist_route,
        "guardrail_screen",
        MagicMock(return_value=GuardrailResult(blocked=True, message="Content policy")),
    )
    mock_assist = _assist(monkeypatch, '{"bullets": ["x"]}')

    resp = client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked"] is True
    assert body["bullets"] == []
    mock_assist.assert_not_called()


# --- 5. Cache hit on identical requests --------------------------------------

def test_identical_requests_hit_cache(monkeypatch):
    """Two identical requests -> assist_complete called exactly once."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    mock_assist = _assist(
        monkeypatch, '{"bullets": ["Led team", "Built pipeline"]}'
    )

    body = _payload()
    r1 = client.post("/api/assist/bullets", json=body)
    r2 = client.post("/api/assist/bullets", json=body)

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["bullets"] == r2.json()["bullets"]
    assert mock_assist.call_count == 1


# --- 6. Truncation to max_bullets --------------------------------------------

def test_model_returns_five_bullets_truncated_to_three(monkeypatch):
    """Model emits 5 bullets -> response truncated to 3."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    _assist(monkeypatch, '{"bullets": ["b1", "b2", "b3", "b4", "b5"]}')

    resp = client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 200
    assert len(resp.json()["bullets"]) == 3


# --- 7. Wrong-shape JSON ------------------------------------------------------

def test_wrong_shape_json_is_safe_never_500(monkeypatch):
    """Malformed bullet shapes are coerced safely; never a 500."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)

    # Case A: wrong key entirely -> no bullets -> blocked, never 500.
    _assist(monkeypatch, '{"bullet_1": "Led a team"}')
    r1 = client.post("/api/assist/bullets", json=_payload())
    assert r1.status_code == 200
    b1 = r1.json()
    assert b1["bullets"] == []
    assert b1["blocked"] is True

    # Case B: bullets is a string, not a list -> still a list out, never 500.
    _assist(monkeypatch, '{"bullets": "just a single string"}')
    r2 = client.post(
        "/api/assist/bullets", json=_payload(user_answer="a different answer entirely")
    )
    assert r2.status_code == 200
    assert isinstance(r2.json()["bullets"], list)


# --- 8. Global cap across distinct users -------------------------------------

def test_global_cap_across_distinct_users_returns_429(monkeypatch):
    """Real limiter: global cap of 1 trips on a SECOND, different user -> 429."""
    # Deliberately do NOT mock check_and_increment — exercise the real global cap.
    monkeypatch.setattr(assist_settings, "global_rate_per_min", 1)
    _guardrail_pass(monkeypatch)
    _assist(monkeypatch, '{"bullets": ["Led team"]}')

    app.dependency_overrides[get_current_user] = lambda: "user-a"
    r1 = client.post("/api/assist/bullets", json=_payload())
    assert r1.status_code == 200

    app.dependency_overrides[get_current_user] = lambda: "user-b"
    r2 = client.post("/api/assist/bullets", json=_payload())
    assert r2.status_code == 429


# --- 9. Empty bullets -> blocked with reason ---------------------------------

def test_empty_bullets_returns_blocked_with_reason(monkeypatch):
    """Model yields no usable bullets -> 200 blocked=True with reason (never blocked=False, never 500)."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    _assist(monkeypatch, '{"bullets": []}')

    resp = client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked"] is True
    assert body["blocked"] is not False
    assert body["reason"]
    assert body["bullets"] == []


# --- 10. Cache key varies with existing_bullets ------------------------------

def test_cache_key_varies_with_existing_bullets(monkeypatch):
    """Different existing_bullets -> different cache key -> assist_complete called again."""
    _allow(monkeypatch)
    _guardrail_pass(monkeypatch)
    mock_assist = _assist(monkeypatch, '{"bullets": ["Led team"]}')

    r1 = client.post("/api/assist/bullets", json=_payload(existing_bullets=["one"]))
    r2 = client.post("/api/assist/bullets", json=_payload(existing_bullets=["two"]))

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert mock_assist.call_count == 2


# --- 11. OUTPUT guardrail runs on a cache hit --------------------------------

def test_output_guardrail_blocks_on_cache_hit(monkeypatch):
    """guardrail_output=on: a cached result whose OUTPUT guardrail blocks -> blocked."""
    monkeypatch.setattr(assist_settings, "guardrail_output", True)
    _allow(monkeypatch)
    mock_screen = MagicMock(return_value=GuardrailResult(blocked=False))
    monkeypatch.setattr(assist_route, "guardrail_screen", mock_screen)
    mock_assist = _assist(monkeypatch, '{"bullets": ["Led team", "Built pipeline"]}')

    body = _payload()

    # First call: primes the cache; OUTPUT guardrail passes -> 200.
    r1 = client.post("/api/assist/bullets", json=body)
    assert r1.status_code == 200
    assert r1.json()["blocked"] is False

    # Now make the OUTPUT guardrail block (INPUT still passes).
    def _screen(text, source):
        if source == "OUTPUT":
            return GuardrailResult(blocked=True, message="Content policy")
        return GuardrailResult(blocked=False)

    mock_screen.side_effect = _screen

    # Second call: same payload -> cache HIT, but OUTPUT guardrail now blocks.
    r2 = client.post("/api/assist/bullets", json=body)
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["blocked"] is True
    assert b2["bullets"] == []
    assert mock_assist.call_count == 1  # second request did not regenerate


# --- 12. Unauthenticated in cognito mode -------------------------------------

def test_unauthenticated_cognito_returns_401(monkeypatch):
    """No dependency override + cognito mode + no Authorization header -> 401."""
    monkeypatch.setattr(dependencies.settings, "auth_mode", "cognito")

    fresh_app = FastAPI()
    fresh_app.include_router(router, prefix="/api")
    fresh_client = TestClient(fresh_app)

    resp = fresh_client.post("/api/assist/bullets", json=_payload())

    assert resp.status_code == 401
