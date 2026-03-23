import hashlib
import time
from typing import Optional

_cache: dict[str, tuple[str, float]] = {}
TTL = 3600  # 1 hour


def cache_key(*parts: str) -> str:
    return hashlib.sha256("||".join(parts).encode()).hexdigest()


def get(key: str) -> Optional[str]:
    if key in _cache:
        val, ts = _cache[key]
        if time.time() - ts < TTL:
            return val
        del _cache[key]
    return None


def put(key: str, value: str) -> None:
    _cache[key] = (value, time.time())
