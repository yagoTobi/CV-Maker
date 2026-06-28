"""
TDD tests for per-user + global rate limiter.

Tests the RateLimitResult dataclass and check_and_increment() function
with per-minute, per-day, and global caps.
"""

import os
import sys
import pytest
import cachetools

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ai import rate_limit as rl  # noqa: E402
from config import assist_settings  # noqa: E402


class TestPerMinuteLimit:
    """Per-user per-minute rate limiting."""

    def test_allows_up_to_limit(self, monkeypatch):
        """First N calls within per-minute limit are allowed."""
        # Reset caches
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 10)
        monkeypatch.setattr(assist_settings, "rate_per_day", 1000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        user_id = "user_123"
        for i in range(10):
            result = rl.check_and_increment(user_id)
            assert result.allowed is True, f"Call {i+1} should be allowed"
            assert result.retry_after == 0
            assert result.scope == ""

    def test_rejects_over_limit(self, monkeypatch):
        """11th call within per-minute window is rejected."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 10)
        monkeypatch.setattr(assist_settings, "rate_per_day", 1000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        user_id = "user_123"
        # Make 10 allowed calls
        for _ in range(10):
            result = rl.check_and_increment(user_id)
            assert result.allowed is True

        # 11th call should be rejected
        result = rl.check_and_increment(user_id)
        assert result.allowed is False
        assert result.retry_after > 0
        assert result.scope == "user-min"

    def test_distinct_users_separate_buckets(self, monkeypatch):
        """Different user_ids have separate per-minute counters."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 10)
        monkeypatch.setattr(assist_settings, "rate_per_day", 1000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        user_1 = "user_123"
        user_2 = "user_456"

        # User 1 maxes out
        for _ in range(10):
            result = rl.check_and_increment(user_1)
            assert result.allowed is True

        # User 1 is now throttled
        result = rl.check_and_increment(user_1)
        assert result.allowed is False

        # User 2 should NOT be throttled (separate bucket)
        result = rl.check_and_increment(user_2)
        assert result.allowed is True
        assert result.scope == ""


class TestPerDayLimit:
    """Per-user per-day rate limiting."""

    def test_per_day_limit_enforced(self, monkeypatch):
        """Exceeding per-day limit returns allowed=False, scope='user-day'."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 1000)  # High per-min to not interfere
        monkeypatch.setattr(assist_settings, "rate_per_day", 5)  # Low per-day for testing
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        user_id = "user_123"

        # Make 5 allowed calls
        for _ in range(5):
            result = rl.check_and_increment(user_id)
            assert result.allowed is True

        # 6th call should be rejected by per-day limit
        result = rl.check_and_increment(user_id)
        assert result.allowed is False
        assert result.retry_after > 0
        assert result.scope == "user-day"


class TestGlobalLimit:
    """Global per-minute rate limiting across all users."""

    def test_global_limit_enforced(self, monkeypatch):
        """When total calls exceed global_rate_per_min, returns allowed=False, scope='global-min'."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 1000)  # High per-user to not interfere
        monkeypatch.setattr(assist_settings, "rate_per_day", 10000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 5)  # Low global for testing

        # Make 5 calls from different users
        for i in range(5):
            user_id = f"user_{i}"
            result = rl.check_and_increment(user_id)
            assert result.allowed is True

        # 6th call from any user should be rejected by global limit
        result = rl.check_and_increment("user_new")
        assert result.allowed is False
        assert result.retry_after > 0
        assert result.scope == "global-min"

    def test_global_limit_blocks_same_user_too(self, monkeypatch):
        """Global limit blocks even the same user if global cap is hit."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 1000)
        monkeypatch.setattr(assist_settings, "rate_per_day", 10000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 3)

        user_id = "user_123"

        # Make 3 calls
        for _ in range(3):
            result = rl.check_and_increment(user_id)
            assert result.allowed is True

        # 4th call from same user should be rejected by global limit
        result = rl.check_and_increment(user_id)
        assert result.allowed is False
        assert result.scope == "global-min"


class TestRetryAfter:
    """retry_after field is correctly set."""

    def test_retry_after_positive_on_rejection(self, monkeypatch):
        """retry_after is a positive integer when rejected."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 1)
        monkeypatch.setattr(assist_settings, "rate_per_day", 1000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        user_id = "user_123"
        rl.check_and_increment(user_id)  # Use up the 1 allowed call

        result = rl.check_and_increment(user_id)  # This should be rejected
        assert result.allowed is False
        assert isinstance(result.retry_after, int)
        assert result.retry_after > 0

    def test_retry_after_zero_on_allowed(self, monkeypatch):
        """retry_after is 0 when allowed."""
        monkeypatch.setattr(rl, "_per_min_cache", cachetools.TTLCache(maxsize=1000, ttl=60))
        monkeypatch.setattr(rl, "_per_day_cache", cachetools.TTLCache(maxsize=1000, ttl=86400))
        monkeypatch.setattr(rl, "_global_min_cache", cachetools.TTLCache(maxsize=1, ttl=60))
        monkeypatch.setattr(assist_settings, "rate_per_min", 10)
        monkeypatch.setattr(assist_settings, "rate_per_day", 1000)
        monkeypatch.setattr(assist_settings, "global_rate_per_min", 1000)

        result = rl.check_and_increment("user_123")
        assert result.allowed is True
        assert result.retry_after == 0


class TestRateLimitResult:
    """RateLimitResult dataclass structure."""

    def test_result_has_required_fields(self):
        """RateLimitResult has allowed, retry_after, and scope fields."""
        result = rl.RateLimitResult(allowed=True, retry_after=0, scope="")
        assert hasattr(result, "allowed")
        assert hasattr(result, "retry_after")
        assert hasattr(result, "scope")
        assert result.allowed is True
        assert result.retry_after == 0
        assert result.scope == ""
