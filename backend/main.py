import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from config import settings, validate_production_settings

# Build allow_origins: split on comma, strip whitespace, drop empty entries
# (a trailing comma or blank entry must never become a "" allowlist member).
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]


from routes.chat import router as chat_router
from routes.compile import router as compile_router
from routes.cv_import import router as cv_import_router
from routes.cv_versions import router as cv_versions_router
from routes.generate_latex import router as generate_latex_router
from routes.templates import router as templates_router
from routes.user_data import router as user_data_router
from routes.tailor import router as tailor_router
from routes.assist import router as assist_router
from routes.voice_interview import router as voice_interview_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail closed in production if invariants are violated
    validate_production_settings(settings)
    yield


app = FastAPI(title="CV Maker API", lifespan=lifespan)

# CORS middleware for frontend.
# X-User-Id is only needed in dev mode (the auth shim reads it); in production
# (cognito mode) the browser sends a Bearer token, so we must not advertise it.
_allow_headers = ["Content-Type", "Authorization"]
if settings.auth_mode == "dev":
    _allow_headers.append("X-User-Id")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,  # KEEP: frontend is on a different origin from the API
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=_allow_headers,
    max_age=600,
)


# Security headers middleware (placed after CORS so CORS headers are set first)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include routers
app.include_router(compile_router, prefix="/api", tags=["compile"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(user_data_router, prefix="/api", tags=["user-data"])
app.include_router(templates_router, prefix="/api", tags=["templates"])
app.include_router(cv_versions_router, prefix="/api", tags=["cv-versions"])
app.include_router(generate_latex_router, prefix="/api", tags=["generate-latex"])
app.include_router(cv_import_router, prefix="/api", tags=["cv-import"])
app.include_router(tailor_router, prefix="/api", tags=["tailor"])
app.include_router(assist_router, prefix="/api", tags=["assist"])
app.include_router(voice_interview_router, prefix="/api", tags=["voice"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
