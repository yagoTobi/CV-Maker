"""FastAPI router for voice interview WebSocket + extract-CV / profile REST.

Pipeline construction lives in ``services.voice_pipeline``; transcript session
state lives in ``services.voice_session_store``; Bedrock extraction calls live
in ``services.voice_extractor``. This module is the thin orchestration layer.
"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from prompts.voice_interview import get_voice_system_prompt
from pydantic import BaseModel

from dependencies import get_current_user
from services.storage import StorageBackend
from services.storage_factory import get_storage
from services.voice_extractor import (
    extract_cv_from_transcript,
    summarize_profile_from_cv,
)
from services.voice_pipeline import (
    LLMRunFrame,
    PIPECAT_AVAILABLE,
    build_voice_pipeline,
)
from services.voice_session_store import (
    VoiceSessionStore,
    get_voice_session_store,
)


router = APIRouter()


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


@router.websocket("/ws/voice-interview")
async def voice_interview_ws(websocket: WebSocket):
    if not PIPECAT_AVAILABLE:
        await websocket.accept()
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "pipecat-ai is not installed. Run: pip install 'pipecat-ai[aws]'",
        }))
        await websocket.close()
        return

    await websocket.accept()
    store = get_voice_session_store()
    store.cleanup_stale()

    session_id = websocket.query_params.get("session_id") or str(uuid.uuid4())
    user_id = websocket.query_params.get("user_id") or "local"
    logger.info("[voice] session {} — WebSocket accepted", session_id)

    try:
        storage = get_storage()
        profile = await storage.get_voice_profile(user_id)
        pipeline = build_voice_pipeline(
            websocket=websocket,
            session_id=session_id,
            system_prompt=get_voice_system_prompt(profile),
            store=store,
        )

        @pipeline.transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info("[voice] session {} — client disconnected, cancelling", session_id)
            await pipeline.task.cancel()

        @pipeline.task.rtvi.event_handler("on_client_ready")
        async def on_client_ready(rtvi):
            try:
                await rtvi.set_bot_ready()
                await pipeline.task.queue_frames([LLMRunFrame()])
                logger.info("[voice] session {} — bot ready, LLMRunFrame queued", session_id)
            except Exception as e:
                logger.exception("[voice] session {} — on_client_ready failed: {}", session_id, e)

        logger.info("[voice] session {} — starting pipeline runner", session_id)
        await pipeline.runner.run(pipeline.task)
        logger.info("[voice] session {} — runner finished", session_id)

    except WebSocketDisconnect:
        # Keep transcript — extract-cv still needs it; TTL cleanup handles abandoned sessions.
        logger.info("[voice] session {} — WebSocketDisconnect", session_id)
    except Exception as exc:
        logger.exception("[voice] session {} — pipeline error: {}", session_id, exc)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": "An internal error occurred"}))
        except Exception:
            pass


@router.post("/voice/extract-cv")
async def extract_cv(
    request: ExtractCVRequest,
    user_id: str = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
    store: VoiceSessionStore = Depends(get_voice_session_store),
):
    session_data = store.get(request.session_id)
    transcript_lines = session_data["transcript"] if session_data else []
    if not transcript_lines:
        raise HTTPException(status_code=404, detail="Session not found or empty transcript")

    try:
        form_data = extract_cv_from_transcript(transcript_lines)
    except Exception:
        logger.exception("[voice] session %s — failed to parse CV JSON from transcript", request.session_id)
        raise HTTPException(status_code=500, detail="An internal error occurred")

    profile_data = summarize_profile_from_cv(form_data)
    if profile_data:
        try:
            await storage.save_voice_profile(user_id, profile_data)
        except Exception:
            logger.exception("[voice] session %s — failed to persist profile summary", request.session_id)

    store.delete(request.session_id)
    return {"formData": form_data}


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
