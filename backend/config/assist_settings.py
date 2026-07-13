"""
AI Assist configuration settings using pydantic-settings.
Configures LLM provider, model, rate limits, and guardrails for section-level assistance.
"""

from typing import Literal
from pydantic_settings import BaseSettings


class AssistSettings(BaseSettings):
    """
    AI Assist settings loaded from environment variables with ASSIST_ prefix.
    
    Supports multiple LLM providers (groq, bedrock) with provider-specific configuration.
    Rate limits and guardrails are enforced at the service layer.
    """
    
    provider: Literal["groq", "bedrock"] = "groq"
    model_id: str = "llama-3.1-8b-instant"
    groq_api_key: str = ""
    groq_timeout_s: float = 6.0
    
    # Output constraints
    max_bullets: int = 3
    max_answer_chars: int = 500
    max_tokens: int = 512
    temperature: float = 0.5
    
    # Rate limiting
    rate_per_min: int = 10
    rate_per_day: int = 100
    global_rate_per_min: int = 25
    
    # Input constraints
    max_context_field_chars: int = 200
    max_focus_chars: int = 60
    max_existing_bullets: int = 12
    max_existing_bullet_chars: int = 300
    max_prompt_chars: int = 6000
    
    # Prompt and guardrail configuration
    prompt_version: str = "v1"
    guardrail_timeout_s: float = 2.0
    guardrail_id: str = ""
    guardrail_version: str = "DRAFT"
    guardrail_output: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


# Module singleton
assist_settings = AssistSettings()
