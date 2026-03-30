"""API routes for upload, parse, generate-audio, and audio download."""

import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from app.core.app_stats import get_stats, record_generation_success, record_page_view
from app.core.daily_stats_store import get_daily_series
from app.core.config import AUDIO_DIR, TTS_PROVIDER, UPLOAD_DIR
from app.core.parser import parse_raw_script
from app.models.script import GenerateAudioRequest, GenerateAudioResponse
from app.services.audio_gen import generate_audio
from app.services.pdf_extract import extract_text_from_pdf
from app.services.tts import get_tts_provider

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host or ""
    return ""


@router.post("/stats/page-view")
def stats_page_view(request: Request):
    """Called once when the web UI loads; counts traffic in-app."""
    record_page_view(_client_ip(request))
    return {"ok": True}


@router.get("/stats")
def stats():
    """
    Aggregate counters since this server process started.
    Intentionally unlisted in the main app UI; obscurity is not strong security.
    """
    return get_stats()


@router.get("/stats/daily")
def stats_daily(days: int = Query(default=30, ge=1, le=366)):
    """Per-day page views and completed audio generations (UTC dates), persisted in SQLite."""
    return {"days": days, "timezone": "UTC", "series": get_daily_series(days)}


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Accept PDF, extract text, parse to script structure. Return raw text + parsed script."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file")
    path = UPLOAD_DIR / file.filename
    try:
        content = await file.read()
        path.write_bytes(content)
        raw_text = extract_text_from_pdf(path)
        script = parse_raw_script(raw_text, source_type="pdf", title=file.filename or "")
        return {"rawText": raw_text, "script": script.model_dump(by_alias=True)}
    finally:
        if path.exists():
            try:
                path.unlink()
            except Exception:
                pass


@router.post("/parse-text")
async def parse_text(body: dict | None = None):
    """Accept pasted script text; return parsed script structure."""
    body = body or {}
    raw = body.get("text") or body.get("rawText") or ""
    raw = str(raw) if raw is not None else ""
    title = body.get("title") or ""
    script = parse_raw_script(raw, source_type="text", title=str(title))
    return {"script": script.model_dump(by_alias=True)}


@router.post("/parse-script")
async def parse_script(body: dict | None = None):
    """Accept raw text from any source; parse and return structured script."""
    body = body or {}
    raw = body.get("text") or body.get("rawText") or ""
    raw = str(raw) if raw is not None else ""
    source_type = body.get("sourceType") or "text"
    title = body.get("title") or ""
    script = parse_raw_script(raw, source_type=source_type, title=str(title))
    return {"script": script.model_dump(by_alias=True)}


@router.post("/generate-audio", response_model=GenerateAudioResponse)
async def generate_audio_endpoint(
    body: GenerateAudioRequest,
    elevenlabs_api_key: str | None = Header(default=None, alias="x-elevenlabs-api-key"),
):
    """Generate line-by-line audio, merge to MP3, return audio id."""
    try:
        audio_id, err = generate_audio(body, override_elevenlabs_api_key=elevenlabs_api_key)
        if err:
            return GenerateAudioResponse(audio_id="", success=False, error=err)
        if audio_id:
            record_generation_success()
        return GenerateAudioResponse(audio_id=audio_id)
    except Exception as e:
        # Log full traceback on the server so we can debug, and return a
        # detailed but single-line error to the client.
        logging.exception("generate-audio failed with unexpected error")
        return GenerateAudioResponse(
            audio_id="",
            success=False,
            error=f"Server error ({type(e).__name__}): {str(e)}",
        )


@router.get("/audio/{audio_id}")
def get_audio(audio_id: str):
    """Stream or return generated MP3 file."""
    # Sanitize: only allow filename-style id
    if ".." in audio_id or "/" in audio_id or "\\" in audio_id:
        raise HTTPException(400, "Invalid audio id")
    path = AUDIO_DIR / audio_id
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(path, media_type="audio/mpeg", filename=audio_id)


@router.get("/voices")
def list_voices(
    elevenlabs_api_key: str | None = Header(default=None, alias="x-elevenlabs-api-key"),
):
    """Return available TTS voices for dropdown."""
    try:
        provider = get_tts_provider(override_elevenlabs_api_key=elevenlabs_api_key)
        return {"voices": provider.list_voices()}
    except Exception as e:
        raise HTTPException(500, detail=f"TTS provider error: {str(e)}")


@router.get("/usage")
def usage(
    elevenlabs_api_key: str | None = Header(default=None, alias="x-elevenlabs-api-key"),
):
    """
    Return TTS provider usage/credit info when available.

    For ElevenLabs, this includes character_limit, character_count, and
    character_remaining. For other providers, usage will be {}.
    """
    try:
        provider = get_tts_provider(override_elevenlabs_api_key=elevenlabs_api_key)
        return {"provider": TTS_PROVIDER, "usage": provider.get_usage()}
    except Exception as e:
        raise HTTPException(500, detail=f"Usage error: {str(e)}")

