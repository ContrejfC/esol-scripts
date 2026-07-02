"""Generate line-by-line audio and merge into final MP3."""

import shutil
import subprocess
import threading
from pathlib import Path
from uuid import uuid4

from app.core.config import AUDIO_DIR, TEMP_DIR
from app.core.normalize import normalize_for_tts
from app.models.script import DialogueLine, GenerateAudioRequest, ParsedScript, VoiceAssignment
from app.services.tts import get_tts_provider

# The 300ms silence spacer is identical for every generation; build it once and
# reuse it instead of spawning an extra ffmpeg process per request.
_SILENCE_CACHE_PATH = TEMP_DIR / "silence_300ms_cache.mp3"
_silence_lock = threading.Lock()


def _ensure_silence_clip() -> Path:
    """Return the shared 300ms silence MP3, creating it on first use."""
    if _SILENCE_CACHE_PATH.exists() and _SILENCE_CACHE_PATH.stat().st_size > 0:
        return _SILENCE_CACHE_PATH
    with _silence_lock:
        if _SILENCE_CACHE_PATH.exists() and _SILENCE_CACHE_PATH.stat().st_size > 0:
            return _SILENCE_CACHE_PATH
        tmp_path = _SILENCE_CACHE_PATH.with_name(f"{_SILENCE_CACHE_PATH.stem}_{uuid4().hex[:8]}.mp3")
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                "-t", "0.3", "-q:a", "9", "-acodec", "libmp3lame", str(tmp_path),
            ],
            check=True,
            capture_output=True,
        )
        tmp_path.replace(_SILENCE_CACHE_PATH)
    return _SILENCE_CACHE_PATH


def _voice_for_speaker(speaker: str, assignments: list[VoiceAssignment], default_voice: str) -> str:
    for a in assignments:
        if a.speaker == speaker:
            return a.voice_id
    return default_voice


def _style_for_speaker(speaker: str, assignments: list[VoiceAssignment], global_style: str) -> str:
    for a in assignments:
        if a.speaker == speaker:
            return a.style
    return global_style


def generate_audio(
    request: GenerateAudioRequest,
    override_elevenlabs_api_key: str | None = None,
) -> tuple[str, str | None]:
    """
    Generate TTS for each line, merge with ffmpeg, save final MP3.
    Returns (audio_id, error_message).
    Validates everything before any API calls to avoid wasting credits.
    """
    script: ParsedScript = request.script
    voice_assignments = request.voice_assignments
    global_style = request.global_style
    announce_names = request.announce_names
    tts = get_tts_provider(override_elevenlabs_api_key=override_elevenlabs_api_key)
    voices = tts.list_voices()
    valid_voice_ids = {v["id"] for v in voices} if voices else set()
    narrator_voice_id = tts.narrator_voice_id()
    default_voice = voices[0]["id"] if voices else "alloy"
    if voice_assignments:
        default_voice = voice_assignments[0].voice_id

    # Validate before any TTS calls - don't waste credits on invalid input
    lines_to_synthesize = [
        line for line in script.lines
        if line.text and str(line.text).strip()
    ]
    if not lines_to_synthesize:
        return "", "No dialogue lines with text to generate. Remove empty lines or add content."

    for line in lines_to_synthesize:
        # Narrator lines always use the narrator voice and do not participate
        # in speaker voice validation.
        if line.speaker == "Narrator":
            continue
        voice_id = _voice_for_speaker(line.speaker, voice_assignments, default_voice)
        if valid_voice_ids and voice_id not in valid_voice_ids:
            return "", f"Voice '{voice_id}' is not available. Refresh the page to load current voices."
        # Ensure narrator voice is never reused as a speaker voice.
        if narrator_voice_id and voice_id == narrator_voice_id:
            return "", "Narrator voice is reserved and cannot be used for speakers. Please choose a different voice."

    run_id = uuid4().hex[:12]
    work_dir = TEMP_DIR / run_id
    work_dir.mkdir(parents=True, exist_ok=True)
    clip_paths: list[Path] = []
    list_file = work_dir / "concat_list.txt"

    try:
        for i, line in enumerate(lines_to_synthesize):
            if line.speaker == "Narrator":
                # Stage direction or description: narrator reads the text directly.
                if narrator_voice_id:
                    normalized = normalize_for_tts(line.text)
                    narr_clip = work_dir / f"line_{i:04d}_dir.mp3"
                    tts.synthesize(normalized, narrator_voice_id, "slow_clear", narr_clip)
                    clip_paths.append(narr_clip)
                continue

            # First: narrator announces who is speaking, using a fixed narrator voice
            if announce_names and narrator_voice_id:
                speaker_name = (line.speaker or "").strip() or "Speaker"
                narrator_text = f"{speaker_name}."
                narrator_clip = work_dir / f"line_{i:04d}_narr.mp3"
                tts.synthesize(narrator_text, narrator_voice_id, "slow_clear", narrator_clip)
                clip_paths.append(narrator_clip)

            # Then: actual speaker line in their assigned voice
            voice_id = _voice_for_speaker(line.speaker, voice_assignments, default_voice)
            style = _style_for_speaker(line.speaker, voice_assignments, global_style)
            normalized = normalize_for_tts(line.text)
            clip_path = work_dir / f"line_{i:04d}.mp3"
            tts.synthesize(normalized, voice_id, style, clip_path)
            clip_paths.append(clip_path)
            # Optional: add silence for pause_after_ms between clips (handled in concat)

        if not clip_paths:
            return "", "No dialogue lines to generate"

        # 300ms silence between lines for clarity (pause between speaker turns)
        silence_path = _ensure_silence_clip()
        with open(list_file, "w") as f:
            for j, p in enumerate(clip_paths):
                f.write(f"file '{p.absolute()}'\n")
                if j < len(clip_paths) - 1:
                    f.write(f"file '{silence_path.absolute()}'\n")
        # Concat - re-encode to normalize format (avoids sample-rate mismatch from say/ffmpeg)
        audio_id = f"esol_{run_id}.mp3"
        out_path = AUDIO_DIR / audio_id
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                "-c:a", "libmp3lame", "-ar", "44100", "-ac", "1", "-q:a", "9",
                str(out_path),
            ],
            check=True,
            capture_output=True,
        )
        return audio_id, None
    except subprocess.CalledProcessError as e:
        return "", f"Audio merge failed: {e.stderr.decode() if e.stderr else str(e)}"
    except Exception as e:
        return "", str(e)
    finally:
        # Cleanup temp directory
        try:
            if work_dir.exists():
                shutil.rmtree(work_dir)
        except Exception:
            pass
