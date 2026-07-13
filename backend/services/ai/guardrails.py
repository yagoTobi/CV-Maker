"""
Optional Bedrock Guardrails wrapper using the model-independent ApplyGuardrail API.

The guardrail client is constructed LAZILY on first use only when guardrail_id is
configured — so missing AWS region/credentials never breaks local dev startup.

Fail-open on any error (including timeout) — guardrails are a production safety
net, not a hard gate; availability matters more than blocking.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Literal

import boto3
import botocore.config

from config import assist_settings

logger = logging.getLogger(__name__)

_guardrail_client = None  # lazy singleton
_screening_off_logged = False  # log once on first screen() call when unset


@dataclass
class GuardrailResult:
    """Result of guardrail screening."""

    blocked: bool
    message: str | None = None


def _get_client():
    """Lazy client construction — only built when guardrail_id is set."""
    global _guardrail_client
    if _guardrail_client is None:
        region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        _guardrail_client = boto3.client(
            "bedrock-runtime",
            region_name=region,
            config=botocore.config.Config(
                connect_timeout=2,
                read_timeout=assist_settings.guardrail_timeout_s,
                retries={"max_attempts": 0},
            ),
        )
    return _guardrail_client


def screen(text: str, source: Literal["INPUT", "OUTPUT"]) -> GuardrailResult:
    """
    Screen text via Bedrock Guardrails.

    Returns blocked=False immediately if unconfigured (guardrail_id is empty).
    Fails open on any error (timeout, boto3 exception, etc.) — guardrails are
    a safety net, not a hard gate.

    Args:
        text: The text to screen.
        source: "INPUT" for user input, "OUTPUT" for model output.

    Returns:
        GuardrailResult with blocked=True/False and optional message.
    """
    global _screening_off_logged

    if not assist_settings.guardrail_id:
        if not _screening_off_logged:
            logger.info("Guardrail screening is OFF (ASSIST_GUARDRAIL_ID not set)")
            _screening_off_logged = True
        return GuardrailResult(blocked=False)

    try:
        client = _get_client()
        resp = client.apply_guardrail(
            guardrailIdentifier=assist_settings.guardrail_id,
            guardrailVersion=assist_settings.guardrail_version,
            source=source,
            content=[{"text": {"text": text}}],
        )
        blocked = resp.get("action") == "GUARDRAIL_INTERVENED"
        message = None
        if blocked and resp.get("outputs"):
            message = resp["outputs"][0].get("text")
        return GuardrailResult(blocked=blocked, message=message)
    except Exception as e:
        logger.warning(
            f"Guardrail screening failed (fail-open): {type(e).__name__}: {e}"
        )
        return GuardrailResult(blocked=False)
