"""TTS provider abstraction - swap providers without changing callers."""

from abc import ABC, abstractmethod
from pathlib import Path


class TTSProvider(ABC):
    """Interface for text-to-speech. Implement per provider (OpenAI, ElevenLabs, etc.)."""

    @abstractmethod
    def synthesize(
        self,
        text: str,
        voice_id: str,
        style: str,
        output_path: Path,
    ) -> None:
        """Generate speech for text with given voice and style; write to output_path."""
        pass

    @abstractmethod
    def list_voices(self) -> list[dict]:
        """Return list of {id, name, ...} for voice dropdown."""
        pass

    def narrator_voice_id(self) -> str:
        """
        Logical narrator voice id for this provider.

        Default: first voice from list_voices (if any). Providers can override
        this and hide the narrator voice from list_voices so that speakers
        can never use the same logical id as the narrator.
        """
        voices = self.list_voices()
        return voices[0]["id"] if voices else "alloy"

    def get_usage(self) -> dict:
        """
        Optional: return usage/credit info for this provider.

        Default implementation returns an empty dict; providers that
        support usage queries (like ElevenLabs) can override.
        """
        return {}
