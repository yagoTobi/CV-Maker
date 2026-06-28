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

