"""Production fail-closed invariants for ``validate_production_settings``.

Two layers are covered:

1. UNIT — ``validate_production_settings`` raises on each violated invariant and
   passes on a valid production config (and on dev defaults). Settings instances
   are built with explicit kwargs so the result never depends on the ambient
   environment or a local ``.env``.
2. STARTUP — the FastAPI ``lifespan`` actually invokes the validator. A
   ``TestClient`` context manager runs lifespan startup on ``__enter__``, so a
   bad prod config makes the server refuse to boot.

Note: ``config/__init__.py`` re-exports the ``settings`` singleton, which shadows
the ``config.settings`` submodule attribute. The lifespan reads ``main.settings``,
so the startup tests monkeypatch that exact object.

Run with: cd backend && pytest tests/test_production_settings.py -q
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main  # noqa: E402
from config.settings import Settings, validate_production_settings  # noqa: E402


def test_prod_with_dev_auth_mode_raises():
    s = Settings(env="production", auth_mode="dev", storage_backend="dynamodb")
    with pytest.raises(RuntimeError, match="AUTH_MODE=cognito"):
        validate_production_settings(s)


def test_prod_missing_user_pool_id_raises():
    s = Settings(
        env="production",
        auth_mode="cognito",
        cognito_user_pool_id=None,
        cognito_app_client_id="client",
        storage_backend="dynamodb",
    )
    with pytest.raises(RuntimeError, match="COGNITO_USER_POOL_ID"):
        validate_production_settings(s)


def test_prod_missing_app_client_id_raises():
    s = Settings(
        env="production",
        auth_mode="cognito",
        cognito_user_pool_id="us-east-1_TEST",
        cognito_app_client_id=None,
        storage_backend="dynamodb",
    )
    with pytest.raises(RuntimeError, match="COGNITO_APP_CLIENT_ID"):
        validate_production_settings(s)


def test_prod_file_storage_raises():
    s = Settings(
        env="production",
        auth_mode="cognito",
        cognito_user_pool_id="us-east-1_TEST",
        cognito_app_client_id="client",
        storage_backend="file",
    )
    with pytest.raises(RuntimeError, match="STORAGE_BACKEND"):
        validate_production_settings(s)


def test_valid_prod_config_passes():
    s = Settings(
        env="production",
        auth_mode="cognito",
        cognito_user_pool_id="us-east-1_TEST",
        cognito_app_client_id="client",
        storage_backend="dynamodb",
    )
    assert validate_production_settings(s) is None


def test_dev_defaults_pass():
    s = Settings(env="development", auth_mode="dev", storage_backend="file")
    assert validate_production_settings(s) is None


def test_lifespan_fails_closed_in_production(monkeypatch):
    monkeypatch.setattr(main.settings, "env", "production")
    monkeypatch.setattr(main.settings, "auth_mode", "dev")
    monkeypatch.setattr(main.settings, "storage_backend", "dynamodb")

    with pytest.raises(RuntimeError, match="AUTH_MODE=cognito"):
        with TestClient(main.app):
            pass


def test_lifespan_boots_with_valid_prod_config(monkeypatch):
    monkeypatch.setattr(main.settings, "env", "production")
    monkeypatch.setattr(main.settings, "auth_mode", "cognito")
    monkeypatch.setattr(main.settings, "cognito_user_pool_id", "us-east-1_TEST")
    monkeypatch.setattr(main.settings, "cognito_app_client_id", "test-client")
    monkeypatch.setattr(main.settings, "storage_backend", "dynamodb")

    with TestClient(main.app):
        pass
