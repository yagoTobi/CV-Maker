"""Tests for the auth dependency in ``dependencies.py``.

Covers Cognito ID-token verification (``verify_cognito_token`` /
``get_current_user`` in cognito mode) and the dev-mode ``X-User-Id`` fallback.

A real RSA keypair is generated in this module; tokens are minted with
``jwt.encode`` and the JWKS network fetch is bypassed by patching the
module-level ``PyJWKClient`` so ``_get_jwks_client()`` builds a fake client that
hands back the test public key.

Run with: python3 -m pytest tests/test_auth.py -q
"""

import os
import sys
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dependencies
from dependencies import get_current_user, verify_cognito_token


# --- Test config values (must match what the token is minted with) ----------

TEST_REGION = "us-east-1"
TEST_POOL_ID = "us-east-1_TESTPOOL"
TEST_CLIENT_ID = "test-client-id"
TEST_ISSUER = f"https://cognito-idp.{TEST_REGION}.amazonaws.com/{TEST_POOL_ID}"
TEST_SUB = "11111111-2222-3333-4444-555555555555"


# --- RSA keypairs (generated once for the whole module) ----------------------

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
# A second, unrelated key used to forge a token the real key cannot verify.
OTHER_PRIVATE_PEM, _OTHER_PUBLIC_PEM = _gen_keypair()


# --- Fake JWKS client --------------------------------------------------------

class _FakeSigningKey:
    def __init__(self, key: bytes) -> None:
        self.key = key


class _FakeJWKSClient:
    """Stand-in for PyJWKClient that always returns the test public key."""

    def __init__(self, key: bytes) -> None:
        self._key = key

    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        return _FakeSigningKey(self._key)


# --- Token builder -----------------------------------------------------------

def make_token(
    *,
    private_key: bytes = PRIVATE_PEM,
    sub: str = TEST_SUB,
    include_sub: bool = True,
    aud: str = TEST_CLIENT_ID,
    iss: str = TEST_ISSUER,
    token_use: str = "id",
    include_token_use: bool = True,
    exp_delta_seconds: int = 3600,
    include_exp: bool = True,
) -> str:
    """Mint an RS256 JWT with controllable claims for each test case."""
    now = datetime.now(tz=timezone.utc)
    payload: dict = {"iss": iss, "aud": aud}
    if include_sub:
        payload["sub"] = sub
    if include_token_use:
        payload["token_use"] = token_use
    if include_exp:
        payload["exp"] = now + timedelta(seconds=exp_delta_seconds)
    return jwt.encode(payload, private_key, algorithm="RS256")


# --- Fixtures ----------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_jwks_global():
    """Reset the cached JWKS client between tests to avoid contamination."""
    dependencies._jwks_client = None
    yield
    dependencies._jwks_client = None


@pytest.fixture
def cognito_mode(monkeypatch):
    """Put the app in cognito mode and bypass the real JWKS network fetch."""
    monkeypatch.setattr(dependencies.settings, "auth_mode", "cognito")
    monkeypatch.setattr(dependencies.settings, "aws_default_region", TEST_REGION)
    monkeypatch.setattr(dependencies.settings, "cognito_user_pool_id", TEST_POOL_ID)
    monkeypatch.setattr(dependencies.settings, "cognito_app_client_id", TEST_CLIENT_ID)
    # _get_jwks_client() builds PyJWKClient(url); hand it our fake instead.
    monkeypatch.setattr(
        dependencies, "PyJWKClient", lambda url: _FakeJWKSClient(PUBLIC_PEM)
    )
    yield


@pytest.fixture
def dev_mode(monkeypatch):
    monkeypatch.setattr(dependencies.settings, "auth_mode", "dev")
    yield


def _client() -> TestClient:
    """Minimal app exposing get_current_user through real DI/header handling."""
    app = FastAPI()

    @app.get("/whoami")
    async def whoami(user_id: str = Depends(get_current_user)):
        return {"user_id": user_id}

    return TestClient(app)


def _assert_401(call):
    with pytest.raises(HTTPException) as exc_info:
        call()
    assert exc_info.value.status_code == 401


# --- Cognito claim-verification cases (verify_cognito_token directly) ---------

def test_happy_path_returns_sub(cognito_mode):
    """1. Valid id token with all required claims -> returns sub."""
    assert verify_cognito_token(make_token()) == TEST_SUB


def test_expired_token_401(cognito_mode):
    """2. exp in the past -> 401."""
    token = make_token(exp_delta_seconds=-3600)
    _assert_401(lambda: verify_cognito_token(token))


def test_missing_exp_401(cognito_mode):
    """3. token without exp claim -> 401."""
    token = make_token(include_exp=False)
    _assert_401(lambda: verify_cognito_token(token))


def test_wrong_audience_401(cognito_mode):
    """4. audience doesn't match client_id -> 401."""
    token = make_token(aud="some-other-client")
    _assert_401(lambda: verify_cognito_token(token))


def test_wrong_issuer_401(cognito_mode):
    """5. issuer doesn't match -> 401."""
    token = make_token(iss="https://cognito-idp.us-east-1.amazonaws.com/evil")
    _assert_401(lambda: verify_cognito_token(token))


def test_missing_token_use_401(cognito_mode):
    """6. no token_use claim -> 401."""
    token = make_token(include_token_use=False)
    _assert_401(lambda: verify_cognito_token(token))


def test_access_token_rejected_401(cognito_mode):
    """7. token_use == 'access' -> 401."""
    token = make_token(token_use="access")
    _assert_401(lambda: verify_cognito_token(token))


def test_missing_sub_401_not_500(cognito_mode):
    """9. signed token with no sub claim -> 401 (NOT 500)."""
    token = make_token(include_sub=False)
    with pytest.raises(HTTPException) as exc_info:
        verify_cognito_token(token)
    assert exc_info.value.status_code == 401


def test_blank_sub_401_not_500(cognito_mode):
    """10. signed token with sub == '' -> 401 (NOT 500)."""
    token = make_token(sub="")
    with pytest.raises(HTTPException) as exc_info:
        verify_cognito_token(token)
    assert exc_info.value.status_code == 401


def test_whitespace_sub_401(cognito_mode):
    """10b. signed token with a whitespace-only sub -> 401."""
    token = make_token(sub="   ")
    _assert_401(lambda: verify_cognito_token(token))


def test_bad_signature_401(cognito_mode):
    """11. token signed by a different key -> 401."""
    token = make_token(private_key=OTHER_PRIVATE_PEM)
    _assert_401(lambda: verify_cognito_token(token))


# --- Header-level cases (through FastAPI dependency injection) ----------------

def test_missing_authorization_header_401(cognito_mode):
    """8. no Authorization header in cognito mode -> 401."""
    resp = _client().get("/whoami")
    assert resp.status_code == 401


def test_malformed_authorization_header_401(cognito_mode):
    """8b. Authorization header without a Bearer prefix -> 401."""
    resp = _client().get("/whoami", headers={"Authorization": TEST_SUB})
    assert resp.status_code == 401


def test_cognito_happy_path_through_http(cognito_mode):
    """1b. valid Bearer id token over HTTP -> 200 and user_id == sub."""
    token = make_token()
    resp = _client().get("/whoami", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": TEST_SUB}


def test_dev_mode_uses_x_user_id_header(dev_mode):
    """12. AUTH_MODE=dev, X-User-Id: testuser -> returns testuser."""
    resp = _client().get("/whoami", headers={"X-User-Id": "testuser"})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "testuser"}


def test_dev_mode_default_user(dev_mode):
    """13. AUTH_MODE=dev, no header -> returns 'local'."""
    resp = _client().get("/whoami")
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "local"}


def test_dev_mode_ignores_bearer_token(dev_mode):
    """Dev mode never verifies tokens: a Bearer header is irrelevant."""
    resp = _client().get(
        "/whoami",
        headers={"Authorization": "Bearer whatever", "X-User-Id": "devuser"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "devuser"}
