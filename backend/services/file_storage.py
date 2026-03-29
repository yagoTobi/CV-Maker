import json
import os
from typing import Optional

from utils.id_helpers import ensure_ids


class FileStorage:
    """File-based storage backend. Wraps existing JSON file I/O with zero behavior change."""

    def __init__(self, base_dir: str):
        self._base_dir = os.path.abspath(base_dir)

    def _versions_dir(self, user_id: str) -> str:
        # For backward compat, "local" user maps to flat user_data/versions/
        if user_id == "local":
            return os.path.join(self._base_dir, "versions")
        return os.path.join(self._base_dir, user_id, "versions")

    def _profile_path(self, user_id: str) -> str:
        if user_id == "local":
            return os.path.join(self._base_dir, "profile.json")
        return os.path.join(self._base_dir, user_id, "profile.json")

    def _voice_profile_path(self, user_id: str) -> str:
        if user_id == "local":
            return os.path.join(self._base_dir, "voice_profile.json")
        return os.path.join(self._base_dir, user_id, "voice_profile.json")

    # --- CV Versions ---

    async def list_versions(self, user_id: str) -> list[dict]:
        versions_dir = self._versions_dir(user_id)
        os.makedirs(versions_dir, exist_ok=True)
        results = []
        for fname in os.listdir(versions_dir):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(versions_dir, fname), "r") as f:
                    results.append(json.load(f))
            except Exception:
                continue
        return results

    async def get_version(self, user_id: str, version_id: str) -> Optional[dict]:
        path = os.path.join(self._versions_dir(user_id), f"{version_id}.json")
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            data = json.load(f)

        # Auto-migrate: ensure all entries have stable IDs (D-05, D-06)
        form_data = data.get("formData")
        if form_data:
            form_data, was_modified = ensure_ids(form_data)
            if was_modified:
                data["formData"] = form_data
                with open(path, "w") as f:
                    json.dump(data, f, indent=2)

        return data

    async def create_version(self, user_id: str, version_data: dict) -> dict:
        versions_dir = self._versions_dir(user_id)
        os.makedirs(versions_dir, exist_ok=True)
        path = os.path.join(versions_dir, f"{version_data['id']}.json")
        with open(path, "w") as f:
            json.dump(version_data, f, indent=2)
        return version_data

    async def update_version(self, user_id: str, version_id: str, updates: dict) -> Optional[dict]:
        path = os.path.join(self._versions_dir(user_id), f"{version_id}.json")
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            data = json.load(f)
        data.update(updates)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return data

    async def delete_version(self, user_id: str, version_id: str) -> bool:
        path = os.path.join(self._versions_dir(user_id), f"{version_id}.json")
        if not os.path.exists(path):
            return False
        os.remove(path)
        return True

    async def update_children_of_deleted_parent(self, user_id: str, parent_id: str) -> None:
        versions_dir = self._versions_dir(user_id)
        os.makedirs(versions_dir, exist_ok=True)
        for fname in os.listdir(versions_dir):
            if not fname.endswith(".json"):
                continue
            try:
                path = os.path.join(versions_dir, fname)
                with open(path, "r") as f:
                    data = json.load(f)
                if data.get("parentVersionId") == parent_id:
                    data["parentVersionId"] = None
                    with open(path, "w") as f:
                        json.dump(data, f, indent=2)
            except Exception:
                continue

    # --- User Profile ---

    async def get_profile(self, user_id: str) -> Optional[dict]:
        path = self._profile_path(user_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, Exception):
            return None

    async def save_profile(self, user_id: str, profile: dict) -> None:
        path = self._profile_path(user_id)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(profile, f, indent=2)

    async def delete_profile(self, user_id: str) -> bool:
        path = self._profile_path(user_id)
        if not os.path.exists(path):
            return False
        os.remove(path)
        return True

    # --- Voice Profile ---

    async def get_voice_profile(self, user_id: str) -> Optional[dict]:
        path = self._voice_profile_path(user_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            return None

    async def save_voice_profile(self, user_id: str, profile: dict) -> None:
        path = self._voice_profile_path(user_id)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(profile, f, indent=2)
