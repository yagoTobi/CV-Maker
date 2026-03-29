"""ID generation and migration helpers for stable entry identifiers."""

import secrets


def generate_id() -> str:
    """Generate a stable unique ID for a data model entry."""
    return secrets.token_urlsafe(16)  # 22-char URL-safe string


def ensure_ids(form_data: dict) -> tuple[dict, bool]:
    """Add IDs to any entries/bullets/skills/links missing them.

    Handles legacy data where bullets are bare strings and skills are bare strings.
    Returns (data, was_modified).
    """
    modified = False

    def _ensure_id(obj: dict) -> bool:
        if not obj.get("id"):
            obj["id"] = generate_id()
            return True
        return False

    def _ensure_bullet_ids(bullets: list) -> bool:
        changed = False
        for i, b in enumerate(bullets):
            if isinstance(b, str):
                bullets[i] = {"id": generate_id(), "text": b}
                changed = True
            elif isinstance(b, dict) and not b.get("id"):
                b["id"] = generate_id()
                changed = True
        return changed

    def _ensure_skill_ids(skills: list) -> bool:
        changed = False
        for i, s in enumerate(skills):
            if isinstance(s, str):
                skills[i] = {"id": generate_id(), "text": s}
                changed = True
            elif isinstance(s, dict) and not s.get("id"):
                s["id"] = generate_id()
                changed = True
        return changed

    # Personal info links
    for link in form_data.get("personalInfo", {}).get("links", []):
        if isinstance(link, dict):
            modified |= _ensure_id(link)

    # Work experience
    for entry in form_data.get("workExperience", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("bullets", []))

    # Education
    for entry in form_data.get("education", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("details", []))

    # Skills
    for entry in form_data.get("skills", []):
        modified |= _ensure_id(entry)
        modified |= _ensure_skill_ids(entry.get("skills", []))

    # Projects
    for entry in form_data.get("projects", []) or []:
        modified |= _ensure_id(entry)
        modified |= _ensure_bullet_ids(entry.get("bullets", []) or [])

    # Awards
    for entry in form_data.get("awards", []) or []:
        modified |= _ensure_id(entry)

    # Additional sections
    for section in form_data.get("additionalSections", []) or []:
        modified |= _ensure_id(section)
        for entry in section.get("entries", []):
            modified |= _ensure_id(entry)
            modified |= _ensure_bullet_ids(entry.get("bullets", []))

    return form_data, modified
