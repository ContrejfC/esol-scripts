"""OpenAI TTS implementation - clear, natural voices for English learners."""

from pathlib import Path

from openai import OpenAI

from app.core.config import OPENAI_API_KEY
from app.services.tts.base import TTSProvider

# OpenAI TTS voice options (distinct, clear for ESOL)
OPENAI_VOICES = [
    {"id": "alloy", "name": "Alloy (neutral)"},
    {"id": "echo", "name": "Echo (warm)"},
    {"id": "fable", "name": "Fable (British)"},
    {"id": "onyx", "name": "Onyx (deep)"},
    {"id": "nova", "name": "Nova (friendly)"},
    {"id": "shimmer", "name": "Shimmer (clear)"},
]

# Reserve one logical voice id for the narrator only.
_NARRATOR_OPENAI_VOICE_ID = "alloy"


class OpenAITTSProvider(TTSProvider):
    """OpenAI TTS (tts-1) - prioritizes clarity and natural pacing."""

    def __init__(self):
        self._client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

    def synthesize(
        self,
        text: str,
        voice_id: str,
        style: str,
        output_path: Path,
    ) -> None:
        if not self._client:
            raise RuntimeError("OPENAI_API_KEY is not set")
        allowed_voice_ids = [v["id"] for v in OPENAI_VOICES]
        voice = voice_id if voice_id in allowed_voice_ids else _NARRATOR_OPENAI_VOICE_ID
        # Map logical styles to OpenAI speed values (Beginner/Intermediate/Advanced).
        if style == "slow_clear":
            speed = 0.70  # Beginner
        elif style == "fast":
            speed = 0.78  # Advanced
        else:
            speed = 0.75  # Intermediate
        response = self._client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed,
        )
        response.stream_to_file(str(output_path))

    def list_voices(self) -> list[dict]:
        # Do not expose the narrator voice in the dropdown so it stays unique.
        return [v for v in OPENAI_VOICES if v["id"] != _NARRATOR_OPENAI_VOICE_ID]

    def narrator_voice_id(self) -> str:
        # Fixed narrator logical id for OpenAI provider.
        return _NARRATOR_OPENAI_VOICE_ID
