from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Load CORS origins from environment variable, with fallback for local dev
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

from routes.compile import router as compile_router
from routes.chat import router as chat_router
from routes.user_data import router as user_data_router
from routes.templates import router as templates_router

app = FastAPI(title="CV Maker API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(compile_router, prefix="/api", tags=["compile"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(user_data_router, prefix="/api", tags=["user-data"])
app.include_router(templates_router, prefix="/api", tags=["templates"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


