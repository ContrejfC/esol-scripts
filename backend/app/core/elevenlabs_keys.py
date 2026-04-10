"""Resolve which ElevenLabs API key to use (client override vs server profile)."""

from __future__ import annotations

from app.core.config import ELEVENLABS_API_KEY, ELEVENLABS_API_KEY_ELIZABETH


def resolve_elevenlabs_api_key(
    client_override: str | None,
    profile_header: str | None,
) -> str | None:
    """
    Pasted browser key wins. Otherwise use server env by profile:
    - default / missing → ELEVENLABS_API_KEY
    - elizabeth → ELEVENLABS_API_KEY_ELIZABETH
    """
    if client_override and client_override.strip():
        return client_override.strip()
    profile = (profile_header or "default").strip().lower()
    if profile == "elizabeth":
        k = (ELEVENLABS_API_KEY_ELIZABETH or "").strip()
        return k or None
    k = (ELEVENLABS_API_KEY or "").strip()
    return k or None
