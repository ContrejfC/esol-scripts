"""ElevenLabs TTS - natural, high-quality voices for ESOL dialogues."""

import threading
import time
from pathlib import Path

import httpx

from app.core.config import ELEVENLABS_API_KEY
from app.services.tts.base import TTSProvider

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

# Shared client: reuses TCP/TLS connections across the many sequential requests
# made during a generation instead of a new handshake per call. httpx.Client is
# thread-safe, so this is fine even when generation runs in a worker thread.
_client = httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0))

# The /voices response rarely changes; cache it briefly per API key so a single
# generation (list_voices + narrator_voice_id + validation) hits the API once.
_VOICES_CACHE_TTL_SECONDS = 60.0
_voices_cache: dict[str, tuple[float, list[dict]]] = {}
_voices_cache_lock = threading.Lock()


class ElevenLabsTTSProvider(TTSProvider):
    """ElevenLabs TTS - natural voices, MP3 output at 44.1kHz for pipeline compatibility."""

    def __init__(self, api_key_override: str | None = None):
        # Allow overriding the API key per-request so different ElevenLabs
        # accounts/credits can be used without restarting the backend.
        self._api_key = api_key_override or ELEVENLABS_API_KEY or ""

    def _headers(self, accept: str = "application/json") -> dict:
        return {"xi-api-key": self._api_key, "Content-Type": "application/json", "Accept": accept}

    def _fetch_voices_raw(self) -> list[dict]:
        """Raw voice objects from /voices, cached briefly per API key."""
        key = self._api_key
        now = time.monotonic()
        with _voices_cache_lock:
            cached = _voices_cache.get(key)
            if cached and now - cached[0] < _VOICES_CACHE_TTL_SECONDS:
                return cached[1]
        resp = _client.get(f"{ELEVENLABS_BASE}/voices", headers=self._headers(), timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        voices = data.get("voices", data if isinstance(data, list) else [])
        with _voices_cache_lock:
            _voices_cache[key] = (time.monotonic(), voices)
        return voices

    def synthesize(
        self,
        text: str,
        voice_id: str,
        style: str,
        output_path: Path,
    ) -> None:
        if not self._api_key:
            raise RuntimeError("ELEVENLABS_API_KEY is not set")
        # Map logical styles to pedagogical levels:
        # slow_clear -> Beginner, normal -> Intermediate, fast -> Advanced.
        if style == "slow_clear":
            speed = 0.70  # Beginner
        elif style == "fast":
            speed = 0.78  # Advanced
        else:
            speed = 0.75  # Intermediate
        url = f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}"
        params = {"output_format": "mp3_44100_128"}
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": speed},
        }
        resp = _client.post(
            url,
            json=payload,
            params=params,
            headers=self._headers(accept="audio/mpeg"),
            timeout=60.0,
        )
        resp.raise_for_status()
        output_path.write_bytes(resp.content)

    def list_voices(self) -> list[dict]:
        if not self._api_key:
            return []
        try:
            voices = self._fetch_voices_raw()
            parsed = [
                {
                    "id": v.get("voice_id", ""),
                    "name": v.get("name", "Unknown"),
                    "preview_url": v.get("preview_url") or "",
                }
                for v in voices
            ]
            narrator_id = self.narrator_voice_id()
            # Hide narrator from dropdown if present so speakers never share the same voice.
            return [v for v in parsed if v["id"] and v["id"] != narrator_id]
        except Exception:
            return []

    def narrator_voice_id(self) -> str:
        """
        Choose a stable narrator voice id.

        We currently pick the first available ElevenLabs voice id, and
        hide it from list_voices so it is not assignable to speakers.
        """
        if not self._api_key:
            return ""
        try:
            voices = self._fetch_voices_raw()
            if not voices:
                return ""
            first = voices[0]
            return str(first.get("voice_id", "")) or ""
        except Exception:
            return ""

    def get_usage(self) -> dict:
        """
        Return ElevenLabs subscription usage (character_limit, character_count).

        This does not consume TTS credits; it only queries account metadata.
        """
        if not self._api_key:
            return {}
        try:
            resp = _client.get(
                f"{ELEVENLABS_BASE}/user/subscription", headers=self._headers(), timeout=15.0
            )
            resp.raise_for_status()
            data = resp.json()
            limit = int(data.get("character_limit") or 0)
            used = int(data.get("character_count") or 0)
            return {
                "character_limit": limit,
                "character_count": used,
                "character_remaining": max(limit - used, 0),
            }
        except Exception:
            return {}
