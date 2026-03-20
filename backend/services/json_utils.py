"""Shared utilities for parsing AI responses."""

import json


def strip_markdown_json(text: str) -> str:
    """Strip markdown code fences from an AI response and return the inner text.

    Handles ```json ... ```, bare ``` ... ```, and plain text.
    """
    clean = text.strip()
    if "```json" in clean:
        clean = clean.split("```json")[1].split("```")[0].strip()
    elif clean.startswith("```"):
        lines = clean.split("\n")
        # Drop first line (```<lang>) and last line (```)
        if lines[-1].strip() == "```":
            clean = "\n".join(lines[1:-1])
        else:
            clean = "\n".join(lines[1:])
    return clean


def parse_markdown_json(text: str) -> dict | None:
    """Strip markdown fences and parse JSON. Returns None on failure."""
    try:
        return json.loads(strip_markdown_json(text))
    except (json.JSONDecodeError, ValueError):
        return None
