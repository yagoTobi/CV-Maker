"""Business logic for CV version management.

Pure-ish helpers that operate on a `StorageBackend` (passed in by callers, not
imported via `storage_factory`) so they remain unit-testable. Routes orchestrate
HTTP concerns and delegate validation, tree-building, naming, and re-parent /
cascade-delete logic to this module.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from models.cv import CVFormData
from .storage import StorageBackend


# --- ID validation --------------------------------------------------------

def validate_version_id(version_id: str) -> None:
    """Validate that `version_id` is a UUID. Raises 400 on invalid input.

    Used to defend against path-traversal style values reaching storage.
    """
    try:
        uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID")


# --- Parent / cycle validation -------------------------------------------

async def validate_no_circular_reference(
    storage: StorageBackend,
    user_id: str,
    version_id: str,
    new_parent_id: str,
    visited: Optional[set] = None,
) -> None:
    """Walk up the parent chain from `new_parent_id` and ensure `version_id`
    isn't reachable. Raises 400 on cycle.
    """
    if visited is None:
        visited = set()

    if new_parent_id in visited:
        raise HTTPException(status_code=400, detail="Circular parent reference detected")

    visited.add(new_parent_id)

    parent_data = await storage.get_version(user_id, new_parent_id)
    if parent_data is None:
        return  # Parent doesn't exist — OK for this validation

    parent_of_parent = parent_data.get("parentVersionId")
    if parent_of_parent == version_id:
        raise HTTPException(status_code=400, detail="Circular parent reference detected")

    if parent_of_parent:
        await validate_no_circular_reference(
            storage, user_id, version_id, parent_of_parent, visited
        )


async def ensure_parent_exists(
    storage: StorageBackend,
    user_id: str,
    parent_version_id: str,
) -> None:
    """Validate `parent_version_id` is a UUID and refers to an existing version."""
    validate_version_id(parent_version_id)
    parent = await storage.get_version(user_id, parent_version_id)
    if parent is None:
        raise HTTPException(
            status_code=400,
            detail=f"Parent version {parent_version_id} not found",
        )


# --- Default-name generation --------------------------------------------

def generate_default_name(
    company_name: Optional[str],
    role: Optional[str],
) -> str:
    """Pick a friendly default name when the user submits an empty `name`.

    Mirrors the original create-version behaviour: prefer "Company Role",
    fall back to "Company Application", then to the role alone, and finally
    to a date-stamped placeholder.
    """
    if company_name and role:
        return f"{company_name} {role}"
    if company_name:
        return f"{company_name} Application"
    if role:
        return role
    return f"Application {datetime.now(timezone.utc).strftime('%b %d')}"


# --- Tree building -------------------------------------------------------

def _to_meta(data: dict) -> dict:
    """Project a stored version dict to the metadata fields exposed in lists."""
    return {
        "id": data["id"],
        "name": data["name"],
        "templateId": data["templateId"],
        "jobDescription": data.get("jobDescription"),
        "companyName": data.get("companyName"),
        "role": data.get("role"),
        "matchScore": data.get("matchScore"),
        "baselineMatchScore": data.get("baselineMatchScore"),
        "parentVersionId": data.get("parentVersionId"),
        "createdAt": data["createdAt"],
    }


def build_versions_tree(all_versions_raw: list[dict]) -> dict:
    """Group raw stored versions into base CVs (with nested children) and
    orphaned job applications. Output shape matches what the list endpoint
    returns: `{ "versions": [...], "ungrouped": [...] }`.
    """
    all_versions = [_to_meta(data) for data in all_versions_raw]

    # Separate base CVs (parentVersionId = null) from job applications
    base_cvs = [v for v in all_versions if not v.get("parentVersionId")]
    job_apps = [v for v in all_versions if v.get("parentVersionId")]

    # Build hierarchical structure
    base_cvs_with_children = []
    for base in base_cvs:
        children = [app for app in job_apps if app["parentVersionId"] == base["id"]]
        children.sort(key=lambda v: v["createdAt"], reverse=True)
        base_with_children = base.copy()
        base_with_children["children"] = children
        base_cvs_with_children.append(base_with_children)

    base_cvs_with_children.sort(key=lambda v: v["createdAt"], reverse=True)

    # Find ungrouped (orphaned) job applications (parent doesn't exist)
    parent_ids = {base["id"] for base in base_cvs}
    ungrouped = [app for app in job_apps if app["parentVersionId"] not in parent_ids]
    ungrouped.sort(key=lambda v: v["createdAt"], reverse=True)

    return {"versions": base_cvs_with_children, "ungrouped": ungrouped}


# --- High-level service operations --------------------------------------

async def create_version(
    storage: StorageBackend,
    user_id: str,
    *,
    name: str,
    template_id: str,
    tex_content: str,
    form_data: Optional[CVFormData] = None,
    job_description: Optional[str] = None,
    company_name: Optional[str] = None,
    role: Optional[str] = None,
    match_score: Optional[float] = None,
    baseline_match_score: Optional[float] = None,
    parent_version_id: Optional[str] = None,
) -> dict:
    """Create a new CV version, applying naming defaults and parent validation."""
    resolved_name = name if name.strip() else generate_default_name(company_name, role)

    if parent_version_id:
        await ensure_parent_exists(storage, user_id, parent_version_id)

    version_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    version_data = {
        "id": version_id,
        "name": resolved_name,
        "templateId": template_id,
        "texContent": tex_content,
        "formData": form_data.model_dump() if form_data else None,
        "jobDescription": job_description,
        "companyName": company_name,
        "role": role,
        "matchScore": match_score,
        "baselineMatchScore": baseline_match_score,
        "parentVersionId": parent_version_id,
        "createdAt": created_at,
    }

    await storage.create_version(user_id, version_data)
    return version_data


async def list_versions_tree(
    storage: StorageBackend,
    user_id: str,
) -> dict:
    """List user versions in the hierarchical {versions, ungrouped} shape."""
    all_versions_raw = await storage.list_versions(user_id)
    return build_versions_tree(all_versions_raw)


async def get_version(
    storage: StorageBackend,
    user_id: str,
    version_id: str,
) -> dict:
    """Fetch a full version record. Raises 400/404 as appropriate."""
    validate_version_id(version_id)
    data = await storage.get_version(user_id, version_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    return data


async def delete_version(
    storage: StorageBackend,
    user_id: str,
    version_id: str,
) -> None:
    """Delete a version after orphaning its children. Raises 400/404."""
    validate_version_id(version_id)
    data = await storage.get_version(user_id, version_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    await storage.update_children_of_deleted_parent(user_id, version_id)
    await storage.delete_version(user_id, version_id)


async def update_version(
    storage: StorageBackend,
    user_id: str,
    version_id: str,
    payload_dict: dict,
    *,
    new_parent_id: Optional[str] = None,
    new_name: Optional[str] = None,
    new_form_data: Optional[CVFormData] = None,
    new_tex_content: Optional[str] = None,
) -> Optional[str]:
    """Apply a partial update to a version.

    `payload_dict` must come from `payload.model_dump(exclude_unset=True)` so we
    can distinguish "field omitted" from "field explicitly null". The keyword
    arguments carry the actual values.

    Returns the resolved `parentVersionId` (so callers can echo it in the
    response body, matching prior behaviour).
    """
    validate_version_id(version_id)
    version_data = await storage.get_version(user_id, version_id)
    if version_data is None:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")

    updates: dict = {}

    # Update parent relationship
    if "parentVersionId" in payload_dict:
        if new_parent_id:
            await ensure_parent_exists(storage, user_id, new_parent_id)

            if new_parent_id == version_id:
                raise HTTPException(
                    status_code=400, detail="A version cannot be its own parent"
                )

            await validate_no_circular_reference(
                storage, user_id, version_id, new_parent_id
            )

        updates["parentVersionId"] = new_parent_id

    # Update name (only if provided and non-empty)
    if "name" in payload_dict and new_name:
        updates["name"] = new_name

    # Update formData (only if provided)
    if "formData" in payload_dict and new_form_data:
        updates["formData"] = new_form_data.model_dump()

    # Update texContent (only if provided; empty string is a valid value)
    if "texContent" in payload_dict and new_tex_content is not None:
        updates["texContent"] = new_tex_content

    if updates:
        await storage.update_version(user_id, version_id, updates)

    return new_parent_id
