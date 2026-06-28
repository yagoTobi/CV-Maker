import asyncio
import time
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dependencies
from main import app


@pytest.fixture(autouse=True)
def dev_mode(monkeypatch):
    monkeypatch.setattr(dependencies.settings, "auth_mode", "dev")


def test_compile_does_not_block_event_loop():
    """Health endpoint responds quickly while a slow compile is pending."""
    BLOCK_SECONDS = 0.5
    HEALTH_THRESHOLD = 0.3  # health must respond in < 300ms while compile blocks

    def slow_compile(*args, **kwargs):
        time.sleep(BLOCK_SECONDS)
        # Return a minimal CompileResult-like object
        from services.latex_compiler import CompileResult
        return CompileResult(success=False, error="test", pdf_base64=None, page_count=0, warnings=None)

    client = TestClient(app)

    with patch("routes.compile.compiler.compile", side_effect=slow_compile):
        # Start compile in a thread (TestClient is sync, so we use threading)
        import threading
        compile_result = {}

        def do_compile():
            resp = client.post("/api/compile", json={"tex_content": "x"})
            compile_result["status"] = resp.status_code

        t = threading.Thread(target=do_compile)
        t.start()

        # Give compile a moment to start
        time.sleep(0.1)

        # Health should respond quickly even while compile is running
        start = time.monotonic()
        health_resp = client.get("/api/health")
        elapsed = time.monotonic() - start

        t.join()

        assert health_resp.status_code == 200
        assert elapsed < HEALTH_THRESHOLD, f"Health took {elapsed:.3f}s, expected < {HEALTH_THRESHOLD}s"
        assert compile_result.get("status") == 200  # compile completed (even if LaTeX failed)
