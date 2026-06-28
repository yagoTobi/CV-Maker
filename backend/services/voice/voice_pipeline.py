"""Pipecat voice interview pipeline builder.

Pure construction logic — no FastAPI dependency beyond the WebSocket type
hint. The Pipecat import is conditional so the rest of the app boots when
pipecat-ai isn't installed (e.g. lightweight CI). Callers must check
``PIPECAT_AVAILABLE`` before invoking ``build_voice_pipeline``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from loguru import logger

from .voice_session_store import VoiceSessionStore


# Optional Pipecat import — the app still starts if pipecat isn't installed
try:
    from pipecat.frames.frames import (
        Frame,
        LLMRunFrame,
        TextFrame,
        TranscriptionFrame,
    )
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.runner import PipelineRunner
    from pipecat.pipeline.task import PipelineParams, PipelineTask
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import (
        LLMContextAggregatorPair,
    )
    from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
    from pipecat.serializers.base_serializer import FrameSerializer
    from pipecat.serializers.protobuf import ProtobufFrameSerializer
    from pipecat.services.aws.nova_sonic.llm import AWSNovaSonicLLMService
    from pipecat.transports.websocket.fastapi import (
        FastAPIWebsocketParams,
        FastAPIWebsocketTransport,
    )

    PIPECAT_AVAILABLE = True
    logger.info("Pipecat loaded successfully")
except ImportError as e:
    PIPECAT_AVAILABLE = False
    # Stubs so callers can do ``from services.voice import LLMRunFrame``
    # at module load time. Any actual use is gated on ``PIPECAT_AVAILABLE``.
    LLMRunFrame = None  # type: ignore[assignment,misc]
    logger.warning("Pipecat not available: {}", e)


# Re-export so route code can construct LLMRunFrame without importing pipecat directly
__all__ = [
    "PIPECAT_AVAILABLE",
    "VoicePipeline",
    "build_voice_pipeline",
    "LLMRunFrame",
]


if PIPECAT_AVAILABLE:

    class TranscriptCollector(FrameProcessor):
        """Accumulates transcript lines server-side for the extract-cv endpoint.

        The frontend receives transcripts via RTVI callbacks (onUserTranscript,
        onBotOutput) and detects the session-complete trigger phrase client-side.
        This processor only needs to store the transcript for later extraction.
        """

        def __init__(self, session_id: str, store: VoiceSessionStore, user_id: str):
            super().__init__()
            self._session_id = session_id
            self._store = store
            self._user_id = user_id
            self._store.create(user_id, session_id)

        async def process_frame(self, frame: Frame, direction: FrameDirection):
            await super().process_frame(frame, direction)

            if isinstance(frame, TranscriptionFrame):
                text = getattr(frame, "text", "") or getattr(frame, "transcript", "")
                if text:
                    logger.info(
                        "[voice] session {} — USER: {}", self._session_id, text
                    )
                    self._store.append_line(self._user_id, self._session_id, f"User: {text}")

            elif isinstance(frame, TextFrame) and frame.text:
                logger.info(
                    "[voice] session {} — AI: {}", self._session_id, frame.text
                )
                self._store.append_line(self._user_id, self._session_id, f"AI: {frame.text}")

            await self.push_frame(frame, direction)


@dataclass
class VoicePipeline:
    """Bundle of constructed pipeline objects returned to the route handler.

    The route attaches event handlers to ``transport`` and ``task`` and then
    awaits ``runner.run(task)``.
    """

    transport: Any
    task: Any
    runner: Any


def build_voice_pipeline(
    *,
    websocket: Any,
    session_id: str,
    system_prompt: str,
    store: VoiceSessionStore,
    user_id: str,
) -> "VoicePipeline":
    """Construct the Nova Sonic S2S pipeline for a single voice session.

    Raises ``RuntimeError`` if pipecat isn't installed — callers must gate on
    ``PIPECAT_AVAILABLE`` first.
    """
    if not PIPECAT_AVAILABLE:
        raise RuntimeError(
            "pipecat-ai is not installed. Run: pip install 'pipecat-ai[aws]'"
        )

    # --- Transport (now with serializer!) ---
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=ProtobufFrameSerializer(
                params=FrameSerializer.InputParams(ignore_rtvi_messages=False)
            ),
        ),
    )

    # --- Nova Sonic LLM ---
    aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    logger.info(
        "[voice] session {} — AWS region={}, key_set={}, secret_set={}",
        session_id,
        aws_region,
        bool(aws_key),
        bool(aws_secret),
    )

    llm = AWSNovaSonicLLMService(
        secret_access_key=aws_secret,
        access_key_id=aws_key,
        region=aws_region,
        settings=AWSNovaSonicLLMService.Settings(
            voice="tiffany",
            system_instruction=system_prompt,
        ),
    )

    # --- Context + aggregators (manages conversation turns) ---
    context = LLMContext(
        messages=[
            {
                "role": "user",
                "content": "Begin the interview. Greet me and ask your first question.",
            }
        ]
    )
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

    # --- Transcript collector ---
    collector = TranscriptCollector(session_id, store, user_id)

    # --- Pipeline (S2S pattern: no separate STT or TTS) ---
    pipeline = Pipeline(
        [
            transport.input(),
            user_aggregator,
            llm,
            collector,
            transport.output(),
            assistant_aggregator,
        ]
    )

    runner = PipelineRunner(handle_sigint=False)
    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    return VoicePipeline(transport=transport, task=task, runner=runner)
