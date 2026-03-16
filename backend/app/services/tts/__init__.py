"""TTS providers - use factory to get configured provider."""

from app.core.config import TTS_PROVIDER
from app.services.tts.base import TTSProvider
from app.services.tts.elevenlabs_tts import ElevenLabsTTSProvider
from app.services.tts.local_tts import LocalSayTTSProvider
from app.services.tts.openai_tts import OpenAITTSProvider


def get_tts_provider(override_elevenlabs_api_key: str | None = None) -> TTSProvider:
    """Return the configured TTS provider (openai by default).

    For ElevenLabs, an optional override key can be supplied so a different
    account's credits can be used for a given request.
    """
    if TTS_PROVIDER == "openai":
        return OpenAITTSProvider()
    if TTS_PROVIDER == "elevenlabs":
        return ElevenLabsTTSProvider(api_key_override=override_elevenlabs_api_key)
    if TTS_PROVIDER == "local":
        return LocalSayTTSProvider()
    raise ValueError(f"Unknown TTS_PROVIDER: {TTS_PROVIDER}")

