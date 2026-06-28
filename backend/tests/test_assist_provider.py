"""
Test suite for assist_complete provider seam (Groq → Bedrock fallback).

Tests the pluggable provider logic:
- Groq happy path (json_object response)
- Missing GROQ_API_KEY → Bedrock
- provider="bedrock" → Bedrock (no Groq attempt)
- Groq RateLimitError → Bedrock fallback
- Groq generic APIError → Bedrock fallback
- Groq empty choices → Bedrock fallback
- Groq generic Exception → Bedrock fallback (not re-raised)
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from services.ai.assist import assist_complete


class TestAssistCompleteGroqHappyPath:
    """Groq happy path: provider=groq, GROQ_API_KEY set, returns content."""

    def test_groq_happy_path_returns_content(self):
        """When Groq succeeds, return its content."""
        mock_groq_response = Mock()
        mock_groq_response.choices = [Mock(message=Mock(content='{"result": "test"}'))]

        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance
            mock_groq_instance.chat.completions.create.return_value = mock_groq_response

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == '{"result": "test"}'
            mock_groq_instance.chat.completions.create.assert_called_once()


class TestAssistCompleteMissingGroqKey:
    """Missing GROQ_API_KEY: skip Groq, go straight to Bedrock."""

    def test_missing_groq_api_key_uses_bedrock(self):
        """When groq_api_key is empty, skip Groq and use Bedrock."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = ""  # Empty = not configured
            mock_bedrock.chat.return_value = "Bedrock response"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock response"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteProviderBedrock:
    """provider="bedrock": skip Groq entirely, use Bedrock."""

    def test_provider_bedrock_skips_groq(self):
        """When provider=bedrock, never attempt Groq."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "bedrock"
            mock_settings.groq_api_key = "test-key"  # Even if set, ignored
            mock_bedrock.chat.return_value = "Bedrock response"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock response"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteGroqRateLimitError:
    """Groq RateLimitError: fallback to Bedrock."""

    def test_groq_rate_limit_error_fallback(self):
        """When Groq raises RateLimitError, use Bedrock."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance

            # Simulate RateLimitError from groq SDK
            from groq import RateLimitError
            mock_groq_instance.chat.completions.create.side_effect = RateLimitError(
                "Rate limit exceeded", response=Mock(), body={}
            )
            mock_bedrock.chat.return_value = "Bedrock fallback"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock fallback"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteGroqAPIError:
    """Groq generic APIError: fallback to Bedrock."""

    def test_groq_api_error_fallback(self):
        """When Groq raises APIError, use Bedrock."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance

            # Simulate APIError from groq SDK
            from groq import APIError
            mock_groq_instance.chat.completions.create.side_effect = APIError(
                "API error", request=Mock(), body={}
            )
            mock_bedrock.chat.return_value = "Bedrock fallback"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock fallback"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteGroqEmptyChoices:
    """Groq returns empty choices: fallback to Bedrock."""

    def test_groq_empty_choices_fallback(self):
        """When Groq returns empty choices, use Bedrock."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance

            # Empty choices
            mock_groq_response = Mock()
            mock_groq_response.choices = []
            mock_groq_instance.chat.completions.create.return_value = mock_groq_response
            mock_bedrock.chat.return_value = "Bedrock fallback"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock fallback"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteGroqMissingContent:
    """Groq returns choice but no content: fallback to Bedrock."""

    def test_groq_missing_content_fallback(self):
        """When Groq choice has no content, use Bedrock."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance

            # Choice with None content
            mock_groq_response = Mock()
            mock_groq_response.choices = [Mock(message=Mock(content=None))]
            mock_groq_instance.chat.completions.create.return_value = mock_groq_response
            mock_bedrock.chat.return_value = "Bedrock fallback"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock fallback"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteGroqGenericException:
    """Groq raises generic Exception: fallback to Bedrock (not re-raised)."""

    def test_groq_generic_exception_fallback(self):
        """When Groq raises any Exception, use Bedrock and don't re-raise."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("groq.Groq") as mock_groq_class, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock:
            mock_settings.provider = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.model_id = "llama-3.1-8b-instant"
            mock_settings.groq_timeout_s = 6.0

            mock_groq_instance = Mock()
            mock_groq_class.return_value = mock_groq_instance
            mock_groq_instance.chat.completions.create.side_effect = RuntimeError("Unexpected error")
            mock_bedrock.chat.return_value = "Bedrock fallback"

            result = assist_complete(
                system_prompt="You are helpful.",
                user_message="Test message",
                max_tokens=512,
                temperature=0.5,
            )

            assert result == "Bedrock fallback"
            mock_bedrock.chat.assert_called_once()


class TestAssistCompleteBedrockcallParameters:
    """Verify Bedrock is called with correct parameters."""

    def test_bedrock_called_with_correct_params(self):
        """Bedrock call includes system_prompt, messages, max_tokens, temperature, MODEL_HAIKU."""
        with patch("services.ai.assist.assist_settings") as mock_settings, \
             patch("services.ai.assist.bedrock_client") as mock_bedrock, \
             patch("services.ai.assist.MODEL_HAIKU", "test-haiku-model"):
            mock_settings.provider = "bedrock"
            mock_bedrock.chat.return_value = "Bedrock response"

            assist_complete(
                system_prompt="System prompt text",
                user_message="User message text",
                max_tokens=256,
                temperature=0.7,
            )

            # Verify bedrock_client.chat was called with correct args
            call_args = mock_bedrock.chat.call_args
            assert call_args is not None
            assert call_args.kwargs["system_prompt"] == "System prompt text"
            assert call_args.kwargs["max_tokens"] == 256
            assert call_args.kwargs["temperature"] == 0.7
            assert call_args.kwargs["model_id"] == "test-haiku-model"
            assert call_args.kwargs["stream"] is False
