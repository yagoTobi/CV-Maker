"""
Tests for Bedrock Guardrails screening wrapper.

TDD: Tests written first, covering:
1. Guardrail disabled (empty guardrail_id) → no-op
2. Guardrail enabled + blocked → blocked=True with message
3. Guardrail enabled + allowed → blocked=False
4. Boto3 exception → fail-open (blocked=False, warning logged)
5. Timeout exception → fail-open (blocked=False, warning logged)
"""

import logging
import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ReadTimeoutError

from services.ai.guardrails import GuardrailResult, screen


class TestGuardrailResult:
    """GuardrailResult dataclass tests."""

    def test_blocked_true_with_message(self):
        result = GuardrailResult(blocked=True, message="Content violates policy")
        assert result.blocked is True
        assert result.message == "Content violates policy"

    def test_blocked_false_no_message(self):
        result = GuardrailResult(blocked=False)
        assert result.blocked is False
        assert result.message is None


class TestScreenFunction:
    """screen() function tests."""

    def test_guardrail_disabled_returns_not_blocked(self, monkeypatch):
        """When guardrail_id is empty, screen() returns blocked=False immediately."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "")
        
        result = screen("any text", source="INPUT")
        
        assert result.blocked is False
        assert result.message is None

    def test_guardrail_disabled_logs_once(self, monkeypatch, caplog):
        """When guardrail_id is empty, log once on first call."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "")
        # Reset the module-level flag
        import services.ai.guardrails
        services.ai.guardrails._screening_off_logged = False
        
        with caplog.at_level(logging.INFO, logger="services.ai.guardrails"):
            screen("text1", source="INPUT")
            screen("text2", source="INPUT")
        
        # Should log exactly once
        assert caplog.text.count("Guardrail screening is OFF") == 1

    def test_guardrail_intervened_returns_blocked_with_message(self, monkeypatch):
        """When guardrail blocks, return blocked=True with message from response."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_version", "DRAFT")
        
        mock_client = MagicMock()
        mock_client.apply_guardrail.return_value = {
            "action": "GUARDRAIL_INTERVENED",
            "outputs": [{"text": "This content is not allowed"}],
        }
        
        with patch("services.ai.guardrails._get_client", return_value=mock_client):
            result = screen("bad content", source="INPUT")
        
        assert result.blocked is True
        assert result.message == "This content is not allowed"
        mock_client.apply_guardrail.assert_called_once()

    def test_guardrail_allowed_returns_not_blocked(self, monkeypatch):
        """When guardrail allows, return blocked=False."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_version", "DRAFT")
        
        mock_client = MagicMock()
        mock_client.apply_guardrail.return_value = {
            "action": "NONE",
            "outputs": [{"text": "good content"}],
        }
        
        with patch("services.ai.guardrails._get_client", return_value=mock_client):
            result = screen("good content", source="OUTPUT")
        
        assert result.blocked is False
        assert result.message is None

    def test_boto_exception_fails_open(self, monkeypatch, caplog):
        """When boto3 raises any exception, fail-open (blocked=False) and log warning."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        
        mock_client = MagicMock()
        mock_client.apply_guardrail.side_effect = ValueError("Some boto error")
        
        with patch("services.ai.guardrails._get_client", return_value=mock_client):
            result = screen("text", source="INPUT")
        
        assert result.blocked is False
        assert result.message is None
        assert "Guardrail screening failed" in caplog.text
        assert "ValueError" in caplog.text

    def test_timeout_exception_fails_open(self, monkeypatch, caplog):
        """When apply_guardrail times out, fail-open (blocked=False) and log warning."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        
        mock_client = MagicMock()
        mock_client.apply_guardrail.side_effect = ReadTimeoutError(endpoint_url="http://test")
        
        with patch("services.ai.guardrails._get_client", return_value=mock_client):
            result = screen("text", source="INPUT")
        
        assert result.blocked is False
        assert result.message is None
        assert "Guardrail screening failed" in caplog.text
        assert "ReadTimeoutError" in caplog.text

    def test_lazy_client_construction(self, monkeypatch):
        """Client is constructed lazily only when guardrail_id is set."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        
        # Reset the module-level client
        import services.ai.guardrails
        services.ai.guardrails._guardrail_client = None
        
        mock_boto_client = MagicMock()
        mock_boto_client.apply_guardrail.return_value = {"action": "NONE"}
        
        with patch("services.ai.guardrails.boto3.client", return_value=mock_boto_client) as mock_boto:
            # First call should construct the client
            screen("text", source="INPUT")
            mock_boto.assert_called_once()
            
            # Second call should reuse the same client
            screen("text2", source="INPUT")
            mock_boto.assert_called_once()  # Still only called once

    def test_client_config_has_correct_timeouts(self, monkeypatch):
        """Client is configured with correct timeout settings."""
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_id", "test-id")
        monkeypatch.setattr("services.ai.guardrails.assist_settings.guardrail_timeout_s", 3.5)
        
        # Reset the module-level client
        import services.ai.guardrails
        services.ai.guardrails._guardrail_client = None
        
        mock_boto_client = MagicMock()
        mock_boto_client.apply_guardrail.return_value = {"action": "NONE"}
        
        with patch("services.ai.guardrails.boto3.client", return_value=mock_boto_client) as mock_boto:
            with patch("services.ai.guardrails.botocore.config.Config") as mock_config:
                screen("text", source="INPUT")
                
                # Verify Config was called with correct timeout
                mock_config.assert_called_once()
                call_kwargs = mock_config.call_args[1]
                assert call_kwargs["read_timeout"] == 3.5
                assert call_kwargs["connect_timeout"] == 2
                assert call_kwargs["retries"]["max_attempts"] == 0
