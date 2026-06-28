"""Authentication dependency for FastAPI routes.

Two modes, selected by ``settings.auth_mode``:

- ``dev`` (default): the user id comes straight from the ``X-User-Id`` header
  (defaults to ``"local"``). This is the local single-user shim — **not** auth.
- ``cognito``: the ``Authorization: Bearer <id-token>`` header is verified
  against the configured Cognito user pool (signature, expiry, audience,
  issuer, required claims, ``token_use == "id"``) and the ``sub`` claim is
  returned as the user id.

``verify_cognito_token`` is exposed separately so non-HTTP entry points (e.g.
the voice WebSocket handler, which cannot use header dependency injection) can
reuse the exact same verification.
"""

from fastapi import Header, HTTPException

import jwt
from jwt import PyJWKClient

from config import settings


# Process-wide JWKS client. Constructed lazily on the first cognito-mode request
# and reused across requests — PyJWKClient caches the fetched signing keys
# internally, so we avoid re-fetching the JWKS document on every call.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Return the cached PyJWKClient, constructing it on first use."""
    global _jwks_client
    if _jwks_client is None:
        region = settings.aws_default_region
        pool_id = settings.cognito_user_pool_id
        _jwks_client = PyJWKClient(
            f"https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json"
        )
    return _jwks_client


def verify_cognito_token(token: str) -> str:
    """Verify a Cognito **ID** token and return its ``sub`` claim.

    Raises ``HTTPException(401)`` on any verification failure: bad/missing
    signature, expired token, wrong audience or issuer, a missing required
    claim, the wrong ``token_use``, or a missing/blank subject. Never leaks the
    underlying reason to the caller.
    """
    region = settings.aws_default_region
    pool_id = settings.cognito_user_pool_id
    client_id = settings.cognito_app_client_id
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=f"https://cognito-idp.{region}.amazonaws.com/{pool_id}",
            options={"require": ["exp", "iss", "aud", "sub", "token_use"]},
        )
    except jwt.PyJWTError:
        # Covers every PyJWT failure mode (decode, signature, expiry,
        # audience/issuer mismatch, missing required claim, and JWKS-client
        # errors, which all subclass PyJWTError) — collapse them to a 401.
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Reject access tokens: only ID tokens carry the verified identity.
    if claims.get("token_use") != "id":
        raise HTTPException(status_code=401, detail="Not authenticated")

    # A signed token with a missing/blank subject is still unusable as an id —
    # treat it as an auth failure (401), never let it surface as a 500.
    sub = claims.get("sub", "")
    if not sub or not sub.strip():
        raise HTTPException(status_code=401, detail="Not authenticated")

    return sub


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_user_id: str = Header(default="local"),
) -> str:
    """Resolve the current user id for the request.

    - ``cognito`` mode: verify the ``Authorization: Bearer`` ID token and return
      its ``sub`` claim (401 if the header is missing/malformed or invalid).
    - ``dev`` mode: trust the ``X-User-Id`` header, defaulting to ``"local"``.
    """
    if settings.auth_mode == "cognito":
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        token = authorization.removeprefix("Bearer ")
        return verify_cognito_token(token)
    # dev mode: fall back to the X-User-Id header
    return x_user_id
