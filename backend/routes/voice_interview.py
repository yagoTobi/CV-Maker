import json
import os
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from prompts.voice_interview import (
    VOICE_EXTRACTION_PROMPT,
    VOICE_PROFILE_SUMMARY_PROMPT,
    get_voice_system_prompt,
)
from pydantic import BaseModel
from services.bedrock import bedrock_client

# Optional Pipecat import — the app still starts if pipecat isn't installed
try:
    from pipecat.frames.frames import (
        Frame,
        LLMRunFrame,
        OutputTransportMessageFrame,
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
_sessions: dict[str, list[str]] = {}

PROFILE_PATH = Path("user_data/voice_profile.json")


# ---------------------------------------------------------------------------
# Profile helpers
# ---------------------------------------------------------------------------


def load_voice_profile() -> dict | None:
    if PROFILE_PATH.exists():
        try:
            return json.loads(PROFILE_PATH.read_text())
        except Exception:
            return None
    return None


def save_voice_profile(profile: dict) -> None:
    PROFILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROFILE_PATH.write_text(json.dumps(profile, indent=2))


# ---------------------------------------------------------------------------
# Custom Pipecat processor — collects transcript server-side, sends updates
# to the client via OutputTransportMessageFrame (so messages flow through
# the serializer instead of bypassing the transport).
# ---------------------------------------------------------------------------

if PIPECAT_AVAILABLE:

    class TranscriptCollector(FrameProcessor):
        """Accumulates transcript lines and forwards custom events to the client."""

        def __init__(self, session_id: str):
            super().__init__()
            self._session_id = session_id
            _sessions[session_id] = []

        async def process_frame(self, frame: Frame, direction: FrameDirection):
            await super().process_frame(frame, direction)

            if isinstance(frame, TranscriptionFrame):
                text = getattr(frame, "text", "") or getattr(frame, "transcript", "")
                if text:
                    logger.info(
                        "[voice] session {} — 🎤 USER: {}", self._session_id, text
                    )
                    _sessions[self._session_id].append(f"User: {text}")
                    await self.push_frame(
                        OutputTransportMessageFrame(
                            message={
                                "type": "transcript",
                                "speaker": "user",
                                "text": text,
                            }
                        ),
                        FrameDirection.DOWNSTREAM,
                    )

            elif isinstance(frame, TextFrame) and frame.text:
                text = frame.text
                logger.info("[voice] session {} — 🤖 AI: {}", self._session_id, text)
                _sessions[self._session_id].append(f"AI: {text}")

                if "generating your cv now" in text.lower():
                    await self.push_frame(
                        OutputTransportMessageFrame(
                            message={"type": "session_complete"}
                        ),
                        FrameDirection.DOWNSTREAM,
                    )
                else:
                    await self.push_frame(
                        OutputTransportMessageFrame(
                            message={
                                "type": "transcript",
                                "speaker": "ai",
                                "text": text,
                            }
                        ),
                        FrameDirection.DOWNSTREAM,
                    )

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
    session_id = str(uuid.uuid4())
    logger.info("[voice] session {} — WebSocket accepted", session_id)

    try:
        profile = load_voice_profile()
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
                await task.queue_frames(
                    [
                        OutputTransportMessageFrame(
                            message={
                                "type": "session_start",
                                "session_id": session_id,
                            }
                        ),
                        LLMRunFrame(),
                    ]
                )
                logger.info(
                    "[voice] session {} — session_start + LLMRunFrame queued",
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
    except Exception as exc:
        logger.exception("[voice] session {} — pipeline error: {}", session_id, exc)
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": str(exc)})
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# REST: extract CV from accumulated transcript
# ---------------------------------------------------------------------------


class ExtractCVRequest(BaseModel):
    session_id: str


@router.post("/voice/extract-cv")
async def extract_cv(request: ExtractCVRequest):
    transcript_lines = _sessions.get(request.session_id, [])
    if not transcript_lines:
        raise HTTPException(
            status_code=404, detail="Session not found or empty transcript"
        )

    transcript_text = "\n".join(transcript_lines)

    result = bedrock_client.chat(
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
    )

    form_data = _parse_json_response(result)
    if form_data is None:
        raise HTTPException(
            status_code=500, detail="Failed to parse CV JSON from transcript"
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
        )
        profile_data = _parse_json_response(profile_result)
        if profile_data:
            profile_data["last_updated"] = date.today().isoformat()
            save_voice_profile(profile_data)
    except Exception:
        pass

    _sessions.pop(request.session_id, None)
    return {"formData": form_data}


# ---------------------------------------------------------------------------
# REST: voice profile persistence
# ---------------------------------------------------------------------------


@router.get("/voice/profile")
async def get_voice_profile():
    return {"profile": load_voice_profile()}


@router.post("/voice/profile")
async def post_voice_profile(profile: dict):
    save_voice_profile(profile)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_json_response(text: str) -> dict | None:
    """Strip markdown fences and parse JSON from a Bedrock response."""
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        for part in parts[1:]:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part:
                clean = part
                break
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return None
