"""App configuration from environment."""

import os
import tempfile
from pathlib import Path

# Paths for uploads and generated audio (local file storage for dev)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
AUDIO_DIR = BASE_DIR / "audio"

# Use OS temp dir for intermediate audio to avoid permission issues in the repo tree.
_default_temp_root = Path(tempfile.gettempdir()) / "esol-scripts-temp"
TEMP_DIR = Path(os.getenv("ESOL_TEMP_DIR", _default_temp_root))

# Ensure directories exist
for d in (UPLOAD_DIR, AUDIO_DIR, TEMP_DIR):
    d.mkdir(parents=True, exist_ok=True)

# TTS provider (e.g. openai, elevenlabs) - abstraction allows swap
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Optional: ElevenLabs for phase 2
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# Optional: required to read GET /stats (header X-Stats-Key). Set on Render for private usage metrics.
STATS_SECRET = os.getenv("STATS_SECRET", "").strip()

