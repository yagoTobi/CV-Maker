"""Voice subpackage: voice-driven CV interview pipeline + session store.

Re-exports public surface so callers can use:

    from services.voice import (
        extract_cv_from_transcript,
        summarize_profile_from_cv,
        VoiceSessionStore,
        get_voice_session_store,
        build_voice_pipeline,
        LLMRunFrame,
        PIPECAT_AVAILABLE,
    )

instead of importing each submodule individually.
"""

from .voice_extractor import (
    extract_cv_from_transcript,
    summarize_profile_from_cv,
)
from .voice_pipeline import (
    LLMRunFrame,
    PIPECAT_AVAILABLE,
    VoicePipeline,
    build_voice_pipeline,
)
from .voice_session_store import (
    InMemoryVoiceSessionStore,
    SESSION_TTL_SECONDS,
    VoiceSessionStore,
    get_voice_session_store,
)

__all__ = [
    "InMemoryVoiceSessionStore",
    "LLMRunFrame",
    "PIPECAT_AVAILABLE",
    "SESSION_TTL_SECONDS",
    "VoicePipeline",
    "VoiceSessionStore",
    "build_voice_pipeline",
    "extract_cv_from_transcript",
    "get_voice_session_store",
    "summarize_profile_from_cv",
]
