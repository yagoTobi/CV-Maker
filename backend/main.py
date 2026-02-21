from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routes.compile import router as compile_router
from routes.chat import router as chat_router
from routes.user_data import router as user_data_router

app = FastAPI(title="CV Maker API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(compile_router, prefix="/api", tags=["compile"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(user_data_router, prefix="/api", tags=["user-data"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/template")
async def get_template():
    """Load the base CV template."""
    template_path = os.path.join(
        os.path.dirname(__file__), "..", "LaTeX-CV-Template", "CV - English.tex"
    )
    try:
        with open(template_path, "r") as f:
            content = f.read()
        return {"content": content}
    except FileNotFoundError:
        return {"error": "Template not found", "content": ""}
