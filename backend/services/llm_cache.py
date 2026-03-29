import hashlib
from typing import Optional

from cachetools import TTLCache

_cache: TTLCache[str, str] = TTLCache(maxsize=256, ttl=3600)


def cache_key(*parts: str) -> str:
    return hashlib.sha256("||".join(parts).encode()).hexdigest()


def get(key: str) -> Optional[str]:
    return _cache.get(key)


def put(key: str, value: str) -> None:
    _cache[key] = value
