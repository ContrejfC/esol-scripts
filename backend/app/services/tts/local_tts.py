"""Local TTS provider using macOS `say` (no API cost).

This provider is intended for development on macOS only. It uses the
system `say` command to synthesize speech to an AIFF file, then uses
ffmpeg to convert that AIFF into MP3 so the rest of the audio pipeline
can remain unchanged.
"""

import subprocess
from pathlib import Path

from app.services.tts.base import TTSProvider


# Map logical voice ids to macOS voice names. You can customize these
# based on the voices installed on your machine (`say -v ?`).
VOICE_MAP = {
    "alloy": "Alex",       # neutral US English
    "echo": "Samantha",    # warm US English
    "fable": "Serena",     # UK English
    "onyx": "Daniel",      # deep UK English
    "nova": "Karen",       # AU English
    "shimmer": "Victoria", # bright US English
}

_NARRATOR_LOCAL_VOICE_ID = "alloy"


class LocalSayTTSProvider(TTSProvider):
    """Use macOS `say` + ffmpeg to synthesize speech locally."""

    def synthesize(
        self,
        text: str,
        voice_id: str,
        style: str,
        output_path: Path,
    ) -> None:
        # Pick a macOS voice name based on requested voice_id
        voice_name = VOICE_MAP.get(voice_id, VOICE_MAP[_NARRATOR_LOCAL_VOICE_ID])

        # `say` can write AIFF; we then convert to MP3 with ffmpeg
        tmp_aiff = output_path.with_suffix(".aiff")

        # Slower/faster rates relative to macOS `say` default (~175 wpm).
        # Approximate Beginner / Intermediate / Advanced speeds.
        if style == "slow_clear":
            rate = "110"  # Beginner (~0.70×)
        elif style == "fast":
            rate = "130"  # Advanced (~0.78×)
        else:
            rate = "120"  # Intermediate (~0.75×)

        # Generate AIFF with `say`
        subprocess.run(
            [
                "say",
                "-v",
                voice_name,
                "-r",
                rate,
                "-o",
                str(tmp_aiff),
                text,
            ],
            check=True,
        )

        # Convert AIFF to MP3 with ffmpeg - use 44100 Hz mono to match concat pipeline
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(tmp_aiff),
                "-ar",
                "44100",
                "-ac",
                "1",
                "-q:a",
                "9",
                str(output_path),
            ],
            check=True,
            capture_output=True,
        )

        # Clean up intermediate file
        try:
            tmp_aiff.unlink(missing_ok=True)
        except Exception:
            pass

    def list_voices(self) -> list[dict]:
        # Hide narrator voice from dropdown so it is never assigned to a speaker.
        return [
            {"id": vid, "name": f"Local ({name})"}
            for vid, name in VOICE_MAP.items()
            if vid != _NARRATOR_LOCAL_VOICE_ID
        ]

    def narrator_voice_id(self) -> str:
        return _NARRATOR_LOCAL_VOICE_ID

