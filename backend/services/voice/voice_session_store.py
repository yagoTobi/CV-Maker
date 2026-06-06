"""Voice interview session store.

In-memory implementation today (cleared on process restart) — sufficient for
single-instance POC. The Protocol interface exists so a Phase C task can swap
in a horizontally-scalable backend (e.g. DynamoDB) without touching the
WebSocket route or pipeline builder.
"""

from __future__ import annotations

import time
from functools import lru_cache
from typing import Optional, Protocol

from loguru import logger


SESSION_TTL_SECONDS = 3600  # 1 hour


class VoiceSessionStore(Protocol):
    """Abstract store for in-flight voice interview transcripts."""

    def get(self, session_id: str) -> Optional[dict]: ...
    def create(self, session_id: str) -> dict: ...
    def append_line(self, session_id: str, line: str) -> None: ...
    def delete(self, session_id: str) -> None: ...
    def cleanup_stale(self, ttl_seconds: int = SESSION_TTL_SECONDS) -> None: ...


class InMemoryVoiceSessionStore:
    """Process-local dict-backed session store.

    Each entry: ``{"transcript": list[str], "created_at": float}``.
    Not safe across multi-instance deploys — Phase C will replace this with a
    shared backend behind the same Protocol.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}

    def get(self, session_id: str) -> Optional[dict]:
        return self._sessions.get(session_id)

    def create(self, session_id: str) -> dict:
        entry = {"transcript": [], "created_at": time.time()}
        self._sessions[session_id] = entry
        return entry

    def append_line(self, session_id: str, line: str) -> None:
        entry = self._sessions.get(session_id)
        if entry is None:
            return
        entry["transcript"].append(line)

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def cleanup_stale(self, ttl_seconds: int = SESSION_TTL_SECONDS) -> None:
        now = time.time()
        stale_ids = [
            sid
            for sid, data in self._sessions.items()
            if now - data.get("created_at", 0) > ttl_seconds
        ]
        for sid in stale_ids:
            logger.info("[voice] Cleaning up stale session %s", sid)
            del self._sessions[sid]


@lru_cache(maxsize=1)
def _create_session_store() -> VoiceSessionStore:
    # Single backend today; factory shape mirrors storage_factory.py so a future
    # env-var driven swap (e.g. STORAGE_BACKEND=dynamodb -> DynamoVoiceSessionStore)
    # is a one-line change.
    return InMemoryVoiceSessionStore()


def get_voice_session_store() -> VoiceSessionStore:
    """FastAPI-friendly accessor — returns the singleton voice session store."""
    return _create_session_store()
