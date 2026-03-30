"""Lightweight in-memory usage counters (no Vercel/Render analytics).

Counts reset when the server process restarts (common on free-tier deploys / cold starts).
"""

from __future__ import annotations

import hashlib
import threading
from datetime import datetime, timezone

from app.core.daily_stats_store import incr_audio_generations as _persist_audio
from app.core.daily_stats_store import incr_page_views as _persist_page_view
from app.core.daily_stats_store import utc_today_iso

_lock = threading.Lock()
_server_started = datetime.now(timezone.utc).isoformat()
_page_views_total = 0
_generations_success = 0
_today_key: str | None = None
_today_visitor_hashes: set[str] = set()


def _visitor_fingerprint(client_ip: str) -> str:
    ip = (client_ip or "").strip() or "unknown"
    day = utc_today_iso()
    return hashlib.sha256(f"{ip}|{day}".encode()).hexdigest()[:32]


def record_page_view(client_ip: str) -> None:
    """Count one app load; tracks rough unique visitors per calendar day (by IP)."""
    global _page_views_total, _today_key, _today_visitor_hashes
    with _lock:
        _page_views_total += 1
        d = utc_today_iso()
        if _today_key != d:
            _today_key = d
            _today_visitor_hashes = set()
        _today_visitor_hashes.add(_visitor_fingerprint(client_ip))
    _persist_page_view(d)


def record_generation_success() -> None:
    global _generations_success
    with _lock:
        _generations_success += 1
    _persist_audio(utc_today_iso())


def get_stats() -> dict:
    with _lock:
        return {
            "server_started_at_utc": _server_started,
            "page_views_total": _page_views_total,
            "unique_visitors_today": len(_today_visitor_hashes),
            "audio_generations_completed": _generations_success,
        }
