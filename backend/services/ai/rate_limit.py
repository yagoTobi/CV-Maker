"""
Per-user + global in-memory rate limiter using cachetools TTLCache.

LIMITATIONS (documented — consistent with llm_cache.py):
- NOT horizontally scalable (single-instance only)
- In `cognito` auth mode, user_id is a verified Cognito `sub` (real teeth)
- In `dev` mode, user_id is the X-User-Id header (default "local") — 
  frontend never sends it so all dev traffic shares "local" → per-user weak in dev
- GLOBAL cap is the real backstop in both modes
"""

from dataclasses import dataclass
from typing import Literal

import cachetools

from config import assist_settings


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""

    allowed: bool
    retry_after: int  # seconds until the window resets
    scope: Literal["user-min", "user-day", "global-min", ""]  # which limit tripped


# Module-level caches (mirrors llm_cache.py pattern)
_per_min_cache: cachetools.TTLCache = cachetools.TTLCache(maxsize=10000, ttl=60)
_per_day_cache: cachetools.TTLCache = cachetools.TTLCache(maxsize=10000, ttl=86400)
_global_min_cache: cachetools.TTLCache = cachetools.TTLCache(maxsize=1, ttl=60)

_GLOBAL_KEY = "__global__"


def check_and_increment(user_id: str) -> RateLimitResult:
    """Check if this user can make a request; increment counters if allowed."""
    # 1. Check global per-minute cap first
    global_count = _global_min_cache.get(_GLOBAL_KEY, 0)
    if global_count >= assist_settings.global_rate_per_min:
        return RateLimitResult(allowed=False, retry_after=60, scope="global-min")

    # 2. Check per-user per-minute
    user_min_key = f"min:{user_id}"
    user_min_count = _per_min_cache.get(user_min_key, 0)
    if user_min_count >= assist_settings.rate_per_min:
        return RateLimitResult(allowed=False, retry_after=60, scope="user-min")

    # 3. Check per-user per-day
    user_day_key = f"day:{user_id}"
    user_day_count = _per_day_cache.get(user_day_key, 0)
    if user_day_count >= assist_settings.rate_per_day:
        return RateLimitResult(allowed=False, retry_after=86400, scope="user-day")

    # 4. All checks passed — increment all counters
    _global_min_cache[_GLOBAL_KEY] = global_count + 1
    _per_min_cache[user_min_key] = user_min_count + 1
    _per_day_cache[user_day_key] = user_day_count + 1

    return RateLimitResult(allowed=True, retry_after=0, scope="")
