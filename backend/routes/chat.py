from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import json
import logging

from dependencies import get_current_user
from services.ai import bedrock_client, MODEL_SONNET, llm_cache
from services.json_utils import strip_markdown_json, parse_json_with_retry

logger = logging.getLogger(__name__)
from prompts.cv_agent import get_chat_system_prompt, get_match_analysis_prompt


async def _stream_chat(messages, system_prompt, model_id=None, temperature=None):
    """Shared SSE streaming generator for chat endpoints."""
    for chunk in bedrock_client.chat(messages, system_prompt, stream=True, model_id=model_id, temperature=temperature):
        yield f"data: {json.dumps({'text': chunk})}\n\n"
    yield "data: [DONE]\n\n"

router = APIRouter()


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    cv_content: str
    job_description: str
    company_name: Optional[str] = None
    user_profile: Optional[Dict] = None
    stream: bool = True


class ChatResponse(BaseModel):
    response: str


class MatchAnalysisRequest(BaseModel):
    cv_content: str
    job_description: str
    company_name: Optional[str] = None


class MatchAnalysisResponse(BaseModel):
    requirements: List[str]
    matching: List[str]
    missing: List[str]
    suggestions: List[str]
    match_score: int


@router.post("/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """Send a message to the AI agent."""
    try:
        # Build the system prompt with context
        job_context = request.job_description
        if request.company_name:
            job_context = f"Company: {request.company_name}\n\n{job_context}"

        system_prompt = get_chat_system_prompt(
            cv_content=request.cv_content,
            job_description=job_context,
            user_profile=request.user_profile
        )

        # Convert messages to the format expected by Bedrock
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        if request.stream:
            return StreamingResponse(
                _stream_chat(messages, system_prompt, model_id=MODEL_SONNET, temperature=0.7),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            response = bedrock_client.chat(messages, system_prompt, stream=False, model_id=MODEL_SONNET, temperature=0.7)
            return ChatResponse(response=response)

    except Exception:
        logger.exception("AI service error")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@router.post("/chat/analyze")
async def analyze_job(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """Initial analysis of job description against CV."""
    try:
        job_context = request.job_description
        if request.company_name:
            job_context = f"Company: {request.company_name}\n\n{job_context}"

        system_prompt = get_chat_system_prompt(
            cv_content=request.cv_content,
            job_description=job_context,
            user_profile=request.user_profile
        )

        # Create initial analysis request
        messages = [{
            "role": "user",
            "content": "Please analyze the job description and my CV. Identify the key requirements, highlight gaps between my CV and the job requirements, and ask me 3-5 targeted questions to discover relevant experiences I may not have listed."
        }]

        if request.stream:
            return StreamingResponse(
                _stream_chat(messages, system_prompt, model_id=MODEL_SONNET, temperature=0.5),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            response = bedrock_client.chat(messages, system_prompt, stream=False, model_id=MODEL_SONNET, temperature=0.5)
            return ChatResponse(response=response)

    except Exception:
        logger.exception("AI service error")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@router.post("/chat/match-analysis", response_model=MatchAnalysisResponse)
async def match_analysis(request: MatchAnalysisRequest, user_id: str = Depends(get_current_user)):
    """Analyze job requirements and calculate match score."""
    try:
        job_context = request.job_description
        if request.company_name:
            job_context = f"Company: {request.company_name}\n\n{job_context}"

        system_prompt = get_match_analysis_prompt()

        messages = [{
            "role": "user",
            "content": f"""Analyze this CV against the job description and return a JSON response.

## CV Content:
{request.cv_content}

## Job Description:
{job_context}

Return ONLY a valid JSON object with this exact structure:
{{
    "requirements": ["requirement 1", "requirement 2", ...],
    "matching": ["matching skill 1", "matching experience 1", ...],
    "missing": ["missing skill 1", "missing experience 1", ...],
    "suggestions": ["suggestion 1", "suggestion 2", ...],
    "match_score": 75
}}"""
        }]

        # Check cache first
        cache_key = llm_cache.cache_key(user_id, request.cv_content, request.job_description, request.company_name or "")
        cached = llm_cache.get(cache_key)
        if cached:
            try:
                data = json.loads(strip_markdown_json(cached))
                return MatchAnalysisResponse(
                    requirements=data.get("requirements", []),
                    matching=data.get("matching", []),
                    missing=data.get("missing", []),
                    suggestions=data.get("suggestions", []),
                    match_score=min(100, max(0, int(data.get("match_score", 50))))
                )
            except json.JSONDecodeError:
                pass  # Cache had bad data, proceed with fresh call

        # Parse JSON from response with retry logic
        try:
            data = parse_json_with_retry(
                lambda: bedrock_client.chat(messages, system_prompt, stream=False, model_id=MODEL_SONNET, temperature=0.3),
                max_retries=1,
            )
            # Cache the raw response for future hits
            llm_cache.put(cache_key, json.dumps(data))
            return MatchAnalysisResponse(
                requirements=data.get("requirements", []),
                matching=data.get("matching", []),
                missing=data.get("missing", []),
                suggestions=data.get("suggestions", []),
                match_score=min(100, max(0, int(data.get("match_score", 50))))
            )
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return MatchAnalysisResponse(
                requirements=["Unable to parse requirements"],
                matching=[],
                missing=["Analysis failed - please try again"],
                suggestions=["Try rephrasing the job description"],
                match_score=0
            )

    except Exception:
        logger.exception("AI service error")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")
