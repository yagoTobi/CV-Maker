"""
Pluggable AI assist provider seam: Groq (json_object) with Bedrock Haiku fallback.

Routes to Groq when configured, with automatic fallback to Bedrock Haiku on any error.
Groq is an optional dependency — lazy imported only when needed.
"""

import logging
import time

from services.ai.bedrock import bedrock_client, MODEL_HAIKU
from config import assist_settings

logger = logging.getLogger(__name__)


def assist_complete(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int,
    temperature: float,
) -> str:
    """
    Generate text via Groq (json_object) with Bedrock Haiku fallback.

    Attempts Groq first if provider="groq" and groq_api_key is configured.
    Falls back to Bedrock Haiku on any Groq error (rate limit, API error, empty response, etc.).
    Never re-raises Groq exceptions — always returns a result via fallback.

    Args:
        system_prompt: System prompt for the AI
        user_message: User message to process
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature (0.0-1.0)

    Returns:
        Generated text (JSON string for Groq, plain text for Bedrock)
    """
    start = time.monotonic()

    # Try Groq if configured
    if assist_settings.provider == "groq" and assist_settings.groq_api_key:
        try:
            # Lazy import — groq is optional
            from groq import Groq

            client = Groq(
                api_key=assist_settings.groq_api_key,
                timeout=assist_settings.groq_timeout_s,
            )
            resp = client.chat.completions.create(
                model=assist_settings.model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=temperature,
                max_tokens=max_tokens,
            )

            # Extract content from response
            content = resp.choices[0].message.content if resp.choices else None
            if not content:
                raise ValueError("Empty Groq response")

            elapsed = time.monotonic() - start
            logger.info(f"assist_complete: groq {elapsed:.2f}s")
            return content

        except Exception as e:
            # Catch ALL exceptions from Groq path (SDK errors, empty responses, etc.)
            # Do not re-raise — fall back to Bedrock
            logger.warning(
                f"Groq failed ({type(e).__name__}: {e}), falling back to Bedrock Haiku"
            )

    # Bedrock Haiku fallback
    result = bedrock_client.chat(
        messages=[{"role": "user", "content": user_message}],
        system_prompt=system_prompt,
        stream=False,
        max_tokens=max_tokens,
        model_id=MODEL_HAIKU,
        temperature=temperature,
    )
    elapsed = time.monotonic() - start
    logger.info(f"assist_complete: bedrock-haiku {elapsed:.2f}s")
    return result
