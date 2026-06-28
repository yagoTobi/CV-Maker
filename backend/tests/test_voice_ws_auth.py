"""Voice WebSocket auth (before accept) + user-scoped voice session tests.

Two guarantees are locked here:

1. ``routes.voice_interview.voice_interview_ws`` validates the caller *before*
   ``websocket.accept()`` — an unauthenticated cognito client is closed at the
   handshake with code 1008 and is never accepted, even though pipecat is
   installed (so the close happens ahead of the PIPECAT gate too). Dev mode
   resolves to ``"local"`` and ignores any client-supplied ``user_id``/``token``.
2. ``POST /api/voice/extract-cv`` is owner-scoped: user B cannot read or delete
   user A's in-flight session.

Cognito token verification reuses the same RSA-keypair + fake-JWKS trick as
``test_auth.py`` so no network JWKS fetch happens.

Run with: cd backend && pytest tests/test_voice_ws_auth.py -q
"""

import contextlib
import os
import sys
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dependencies
from main import app
from routes import voice_interview
from services.voice import get_voice_session_store
from services.voice.voice_session_store import _create_session_store


TEST_REGION = "us-east-1"
TEST_POOL_ID = "us-east-1_TESTPOOL"
TEST_CLIENT_ID = "test-client-id"
TEST_ISSUER = f"https://cognito-idp.{TEST_REGION}.amazonaws.com/{TEST_POOL_ID}"
TEST_SUB = "11111111-2222-3333-4444-555555555555"

WS_PATH = "/api/ws/voice-interview"


def _gen_keypair() -> tuple[bytes, bytes]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


PRIVATE_PEM, PUBLIC_PEM = _gen_keypair()


class _FakeSigningKey:
    def __init__(self, key: bytes) -> None:
        self.key = key


class _FakeJWKSClient:
    def __init__(self, key: bytes) -> None:
        self._key = key

    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        return _FakeSigningKey(self._key)


class _FakeStorage:
    """Disk-free storage stub so the accepted-WS path never touches user_data/."""

    async def get_voice_profile(self, user_id: str):
        return None


def make_token(
    *,
    sub: str = TEST_SUB,
    aud: str = TEST_CLIENT_ID,
    iss: str = TEST_ISSUER,
    exp_delta_seconds: int = 3600,
) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "iss": iss,
        "aud": aud,
        "sub": sub,
        "token_use": "id",
        "exp": now + timedelta(seconds=exp_delta_seconds),
    }
    return jwt.encode(payload, PRIVATE_PEM, algorithm="RS256")


@pytest.fixture(autouse=True)
def _reset_state(monkeypatch):
    dependencies._jwks_client = None
    _create_session_store.cache_clear()
    monkeypatch.setattr(voice_interview, "get_storage", lambda: _FakeStorage())
    yield
    dependencies._jwks_client = None
    _create_session_store.cache_clear()


@pytest.fixture
def cognito_mode(monkeypatch):
    monkeypatch.setattr(dependencies.settings, "auth_mode", "cognito")
    monkeypatch.setattr(dependencies.settings, "aws_default_region", TEST_REGION)
    monkeypatch.setattr(dependencies.settings, "cognito_user_pool_id", TEST_POOL_ID)
    monkeypatch.setattr(dependencies.settings, "cognito_app_client_id", TEST_CLIENT_ID)
    monkeypatch.setattr(dependencies, "PyJWKClient", lambda url: _FakeJWKSClient(PUBLIC_PEM))
    yield


@pytest.fixture
def dev_mode(monkeypatch):
    monkeypatch.setattr(dependencies.settings, "auth_mode", "dev")
    yield


def _capture_user_id(monkeypatch) -> dict:
    """Force past the PIPECAT gate and capture the user_id threaded to the pipeline.

    Replaces the real Nova Sonic builder so the accepted path resolves the
    user id and then short-circuits without standing up AWS transports.
    """
    captured: dict = {}

    def fake_build_voice_pipeline(*, websocket, session_id, system_prompt, store, user_id):
        captured["user_id"] = user_id
        raise RuntimeError("stop: test only needs the resolved user_id")

    monkeypatch.setattr(voice_interview, "PIPECAT_AVAILABLE", True)
    monkeypatch.setattr(voice_interview, "build_voice_pipeline", fake_build_voice_pipeline)
    return captured


# --- WS handshake gate (auth before accept) ---------------------------------

def test_cognito_missing_token_closed_1008_before_accept(cognito_mode):
    """1. cognito + no ?token= -> closed 1008 at handshake, never accepted."""
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(WS_PATH):
            pass
    assert exc_info.value.code == 1008


def test_cognito_invalid_token_closed_1008(cognito_mode):
    """2. cognito + un-verifiable token -> closed 1008, never accepted."""
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"{WS_PATH}?token=not-a-real-jwt"):
            pass
    assert exc_info.value.code == 1008


def test_cognito_valid_token_accepted_resolves_sub(cognito_mode, monkeypatch):
    """3. cognito + valid id token -> accepted, user_id resolves to the sub claim."""
    captured = _capture_user_id(monkeypatch)
    token = make_token()
    client = TestClient(app)
    with client.websocket_connect(f"{WS_PATH}?token={token}") as ws:
        # Accepted (no 1008). Draining forces the server past pipeline construction.
        with contextlib.suppress(Exception):
            ws.receive_text()
    assert captured["user_id"] == TEST_SUB


def test_dev_mode_connects_as_local_ignoring_client_params(dev_mode, monkeypatch):
    """4. dev mode -> accepted as "local"; a client-supplied user_id/token is ignored."""
    captured = _capture_user_id(monkeypatch)
    client = TestClient(app)
    with client.websocket_connect(f"{WS_PATH}?user_id=attacker&token=whatever") as ws:
        with contextlib.suppress(Exception):
            ws.receive_text()
    assert captured["user_id"] == "local"


# --- extract-cv ownership ----------------------------------------------------

def test_extract_cv_non_owner_404_and_session_preserved(dev_mode):
    """5. User B extracting User A's session -> 404, and A's session is NOT deleted."""
    store = get_voice_session_store()
    store.create("userA", "sessionA")
    store.append_line("userA", "sessionA", "User: hello")
    store.append_line("userA", "sessionA", "AI: hi there")

    client = TestClient(app)
    resp = client.post(
        "/api/voice/extract-cv",
        json={"session_id": "sessionA"},
        headers={"X-User-Id": "userB"},
    )

    assert resp.status_code == 404
    surviving = store.get("userA", "sessionA")
    assert surviving is not None
    assert surviving["transcript"] == ["User: hello", "AI: hi there"]
