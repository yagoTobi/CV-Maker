"""Per-user isolation tests against DynamoDB Local.

Proves that user A's data is invisible to user B for ALL entity types:
CV versions, USER_PROFILE, and VOICE_PROFILE. Isolation is structural —
every entity lives under PK=USER#{user_id}, so distinct users never share keys.

Run against DynamoDB Local (docker compose up -d dynamodb-local), with the
test table created via scripts/create_table.py:

    cd backend && \
      DYNAMODB_ENDPOINT_URL=http://localhost:8100 \
      AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
      AWS_DEFAULT_REGION=us-east-1 DYNAMODB_TABLE_NAME=cv-maker-test \
      STORAGE_BACKEND=dynamodb pytest tests/test_dynamo_isolation.py -q
"""

import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set env BEFORE importing storage modules so the boto3 client points at
# DynamoDB Local rather than real AWS.
os.environ.setdefault("DYNAMODB_ENDPOINT_URL", "http://localhost:8100")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "dummy")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "dummy")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("DYNAMODB_TABLE_NAME", "cv-maker-test")
os.environ["STORAGE_BACKEND"] = "dynamodb"

from services.storage.dynamo_storage import DynamoStorage  # noqa: E402
from services.storage.storage_factory import _create_storage  # noqa: E402


@pytest.fixture
def storage():
    """Fresh DynamoStorage instance pointing at the test table.

    The storage factory memoizes its backend via @lru_cache(maxsize=1); without
    clearing it, a stale FileStorage/table singleton would yield a false pass.
    """
    _create_storage.cache_clear()  # CRITICAL: clear the lru_cache singleton
    os.environ["STORAGE_BACKEND"] = "dynamodb"
    os.environ["DYNAMODB_TABLE_NAME"] = "cv-maker-test"
    os.environ["DYNAMODB_ENDPOINT_URL"] = "http://localhost:8100"
    os.environ["AWS_ACCESS_KEY_ID"] = "dummy"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "dummy"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    store = DynamoStorage()
    yield store
    _create_storage.cache_clear()


USER_A = "sub-user-a-isolation-test"
USER_B = "sub-user-b-isolation-test"


# --- CV Version isolation ---

def test_version_isolation_list(storage):
    """User B cannot list user A's versions."""
    version_data = {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "User A CV",
        "templateId": "med-length-proff-cv",
        "texContent": "\\documentclass{article}",
        "createdAt": "2026-01-01T00:00:00Z",
    }
    asyncio.run(storage.create_version(USER_A, version_data))
    try:
        b_versions = asyncio.run(storage.list_versions(USER_B))
        b_ids = {v["id"] for v in b_versions}
        assert version_data["id"] not in b_ids, "User B can see User A's version!"
    finally:
        asyncio.run(storage.delete_version(USER_A, version_data["id"]))


def test_version_isolation_get(storage):
    """User B cannot get user A's specific version."""
    version_data = {
        "id": "00000000-0000-0000-0000-000000000002",
        "name": "User A CV",
        "templateId": "med-length-proff-cv",
        "texContent": "\\documentclass{article}",
        "createdAt": "2026-01-01T00:00:00Z",
    }
    asyncio.run(storage.create_version(USER_A, version_data))
    try:
        result = asyncio.run(storage.get_version(USER_B, version_data["id"]))
        assert result is None, "User B can read User A's version!"
    finally:
        asyncio.run(storage.delete_version(USER_A, version_data["id"]))


def test_version_owner_can_read_own(storage):
    """Sanity: the owning user CAN read their own version (isolation is not over-broad)."""
    version_data = {
        "id": "00000000-0000-0000-0000-000000000003",
        "name": "User A CV",
        "templateId": "med-length-proff-cv",
        "texContent": "\\documentclass{article}",
        "createdAt": "2026-01-01T00:00:00Z",
    }
    asyncio.run(storage.create_version(USER_A, version_data))
    try:
        own = asyncio.run(storage.get_version(USER_A, version_data["id"]))
        assert own is not None, "User A cannot read their own version!"
        assert own["id"] == version_data["id"]
    finally:
        asyncio.run(storage.delete_version(USER_A, version_data["id"]))


# --- Profile isolation ---

def test_profile_isolation(storage):
    """User B cannot read user A's profile."""
    profile = {
        "additional_experiences": [{"topic": "A", "description": "A's data"}],
        "skills_mentioned": [],
        "conversation_history": [],
    }
    asyncio.run(storage.save_profile(USER_A, profile))
    try:
        b_profile = asyncio.run(storage.get_profile(USER_B))
        if b_profile is not None:
            assert "A's data" not in str(b_profile), "User B can see User A's profile data!"
    finally:
        asyncio.run(storage.delete_profile(USER_A))


# --- Voice Profile isolation ---

def test_voice_profile_isolation(storage):
    """User B cannot read user A's voice profile."""
    voice_profile = {
        "fullName": "User A",
        "summary": "A's voice data",
        "skills_mentioned": [],
        "career_history": [],
        "projects_mentioned": [],
        "last_updated": "2026-01-01",
    }
    asyncio.run(storage.save_voice_profile(USER_A, voice_profile))
    try:
        b_voice = asyncio.run(storage.get_voice_profile(USER_B))
        if b_voice is not None:
            assert "A's voice data" not in str(b_voice), "User B can see User A's voice profile!"
    finally:
        # VOICE_PROFILE lives under the same PK; delete it directly so the row
        # does not leak across test runs (no delete_voice_profile method exists).
        storage._table.delete_item(
            Key={"PK": DynamoStorage._pk(USER_A), "SK": "VOICE_PROFILE"}
        )
