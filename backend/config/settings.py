"""
Typed configuration settings using pydantic-settings.
Single source of truth for all environment-driven configuration.
"""

from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Field types are constrained with Literal types for validation.
    Production cross-field invariants are enforced at lifespan startup.
    """
    
    env: Literal["development", "production"] = "development"
    auth_mode: Literal["dev", "cognito"] = "dev"
    aws_default_region: str = "us-east-1"
    cognito_user_pool_id: str | None = None
    cognito_app_client_id: str | None = None
    storage_backend: Literal["file", "dynamodb"] = "file"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


# Module singleton
settings = Settings()


def validate_production_settings(s: Settings) -> None:
    """Raise RuntimeError if production invariants are violated.

    Called from the FastAPI lifespan startup — the SERVER fails to start,
    not the import. This keeps import-time vs startup-time distinct and testable.
    """
    if s.env != "production":
        return
    if s.auth_mode != "cognito":
        raise RuntimeError(
            "Production requires AUTH_MODE=cognito (got: auth_mode='dev'). "
            "Set AUTH_MODE=cognito in your environment."
        )
    if not s.cognito_user_pool_id:
        raise RuntimeError(
            "Production requires COGNITO_USER_POOL_ID to be set."
        )
    if not s.cognito_app_client_id:
        raise RuntimeError(
            "Production requires COGNITO_APP_CLIENT_ID to be set."
        )
    if s.storage_backend != "dynamodb":
        raise RuntimeError(
            f"Production requires STORAGE_BACKEND=dynamodb (got: '{s.storage_backend}'). "
            "File storage is not safe for multi-user production."
        )

