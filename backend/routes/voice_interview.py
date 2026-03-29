import json
import os
import time
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from prompts.voice_interview import (
    VOICE_EXTRACTION_PROMPT,
    VOICE_PROFILE_SUMMARY_PROMPT,
    get_voice_system_prompt,
)
from pydantic import BaseModel
from services.bedrock import bedrock_client
from services.json_utils import parse_markdown_json, parse_json_with_retry
from services.storage import StorageBackend
from services.storage_factory import get_storage
from dependencies import get_current_user

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
    logger.warning("Pipecat not available: {}", e)


router = APIRouter()

# In-memory session transcripts — cleared on restart; fine for POC
# Each entry: {"transcript": [...], "created_at": <timestamp>}
_sessions: dict[str, dict] = {}

SESSION_TTL_SECONDS = 3600  # 1 hour


def _cleanup_stale_sessions():
    """Remove sessions older than SESSION_TTL_SECONDS."""
    now = time.time()
    stale_ids = [
        sid for sid, data in _sessions.items()
        if now - data.get("created_at", 0) > SESSION_TTL_SECONDS
    ]
    for sid in stale_ids:
        logger.info("[voice] Cleaning up stale session %s", sid)
        del _sessions[sid]




# ---------------------------------------------------------------------------
# Custom Pipecat processor — collects transcript server-side for the
# extract-cv endpoint. The frontend uses RTVI callbacks for live display.
# ---------------------------------------------------------------------------

if PIPECAT_AVAILABLE:

    class TranscriptCollector(FrameProcessor):
        """Accumulates transcript lines server-side for the extract-cv endpoint.

        The frontend receives transcripts via RTVI callbacks (onUserTranscript,
        onBotOutput) and detects the session-complete trigger phrase client-side.
        This processor only needs to store the transcript for later extraction.
        """

        def __init__(self, session_id: str):
            super().__init__()
            self._session_id = session_id
            _sessions[session_id] = {"transcript": [], "created_at": time.time()}

        async def process_frame(self, frame: Frame, direction: FrameDirection):
            await super().process_frame(frame, direction)

            if isinstance(frame, TranscriptionFrame):
                text = getattr(frame, "text", "") or getattr(frame, "transcript", "")
                if text:
                    logger.info(
                        "[voice] session {} — USER: {}", self._session_id, text
                    )
                    _sessions[self._session_id]["transcript"].append(f"User: {text}")

            elif isinstance(frame, TextFrame) and frame.text:
                logger.info(
                    "[voice] session {} — AI: {}", self._session_id, frame.text
                )
                _sessions[self._session_id]["transcript"].append(f"AI: {frame.text}")

            await self.push_frame(frame, direction)


# ---------------------------------------------------------------------------
# WebSocket endpoint — voice interview pipeline
# ---------------------------------------------------------------------------


@router.websocket("/ws/voice-interview")
async def voice_interview_ws(websocket: WebSocket):
    if not PIPECAT_AVAILABLE:
        await websocket.accept()
        await websocket.send_text(
            json.dumps(
                {
                    "type": "error",
                    "message": "pipecat-ai is not installed. Run: pip install 'pipecat-ai[aws]'",
                }
            )
        )
        await websocket.close()
        return

    await websocket.accept()
    _cleanup_stale_sessions()

    # Accept client-provided session ID and user ID (query params)
    session_id = websocket.query_params.get("session_id") or str(uuid.uuid4())
    user_id = websocket.query_params.get("user_id") or "local"
    logger.info("[voice] session {} — WebSocket accepted", session_id)

    try:
        storage = get_storage()
        profile = await storage.get_voice_profile(user_id)
        system_prompt = get_voice_system_prompt(profile)

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
        collector = TranscriptCollector(session_id)

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

        # --- Event handlers (each at the TOP level, not nested!) ---

        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info(
                "[voice] session {} — client disconnected, cancelling task",
                session_id,
            )
            await task.cancel()

        @task.rtvi.event_handler("on_client_ready")
        async def on_client_ready(rtvi):
            try:
                logger.info("[voice] session {} — on_client_ready fired", session_id)
                await rtvi.set_bot_ready()
                logger.info("[voice] session {} — set_bot_ready completed", session_id)
                await task.queue_frames([LLMRunFrame()])
                logger.info(
                    "[voice] session {} — LLMRunFrame queued",
                    session_id,
                )
            except Exception as e:
                logger.exception(
                    "[voice] session {} — on_client_ready FAILED: {}", session_id, e
                )

        logger.info("[voice] session {} — starting pipeline runner", session_id)
        await runner.run(task)
        logger.info("[voice] session {} — runner finished", session_id)

    except WebSocketDisconnect:
        logger.info("[voice] session {} — WebSocketDisconnect", session_id)
        # Don't delete session here — the extract-cv endpoint still needs the transcript.
        # TTL cleanup handles abandoned sessions.
    except Exception as exc:
        logger.exception("[voice] session {} — pipeline error: {}", session_id, exc)
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": "An internal error occurred"})
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# REST: extract CV from accumulated transcript
# ---------------------------------------------------------------------------


class CareerHistoryEntry(BaseModel):
    company: str = ""
    title: str = ""
    years: str = ""


class VoiceProfileData(BaseModel):
    fullName: str = ""
    summary: str = ""
    skills_mentioned: list[str] = []
    career_history: list[CareerHistoryEntry] = []
    projects_mentioned: list[str] = []
    last_updated: str = ""


class ExtractCVRequest(BaseModel):
    session_id: str


@router.post("/voice/extract-cv")
async def extract_cv(
    request: ExtractCVRequest,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    session_data = _sessions.get(request.session_id)
    transcript_lines = session_data["transcript"] if session_data else []
    if not transcript_lines:
        raise HTTPException(
            status_code=404, detail="Session not found or empty transcript"
        )

    transcript_text = "\n".join(transcript_lines)

    try:
        form_data = parse_json_with_retry(
            lambda: bedrock_client.chat(
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Here is the voice interview transcript:\n\n"
                            f"{transcript_text}\n\n"
                            "Extract the CV data as a JSON object."
                        ),
                    }
                ],
                system_prompt=VOICE_EXTRACTION_PROMPT,
                stream=False,
                max_tokens=4096,
                temperature=0.2,
            ),
            max_retries=1,
        )
    except (json.JSONDecodeError, Exception):
        logger.error("[voice] session %s — failed to parse CV JSON from transcript", request.session_id)
        raise HTTPException(
            status_code=500, detail="An internal error occurred"
        )

    # Best-effort: save a profile summary for future sessions
    try:
        profile_result = bedrock_client.chat(
            messages=[
                {
                    "role": "user",
                    "content": f"CV data:\n{json.dumps(form_data)}\n\nCreate a brief profile summary.",
                }
            ],
            system_prompt=VOICE_PROFILE_SUMMARY_PROMPT,
            stream=False,
            max_tokens=1024,
            temperature=0.3,
        )
        profile_data = parse_markdown_json(profile_result)
        if profile_data:
            profile_data["last_updated"] = date.today().isoformat()
            await storage.save_voice_profile(user_id, profile_data)
    except Exception:
        pass

    _sessions.pop(request.session_id, None)
    return {"formData": form_data}


# ---------------------------------------------------------------------------
# REST: voice profile persistence
# ---------------------------------------------------------------------------


@router.get("/voice/profile")
async def get_voice_profile_endpoint(
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    profile = await storage.get_voice_profile(user_id)
    return {"profile": profile}


@router.post("/voice/profile")
async def post_voice_profile(
    profile: VoiceProfileData,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    await storage.save_voice_profile(user_id, profile.model_dump())
    return {"ok": True}

