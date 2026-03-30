"""Persist per-day page views and audio generation counts (UTC calendar days)."""

from __future__ import annotations

import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import STATS_DATA_DIR

_lock = threading.Lock()
_esdb = os.getenv("ESOL_STATS_DB")
_db_path = Path(_esdb).expanduser() if _esdb else (STATS_DATA_DIR / "usage_daily.sqlite")


def _connect() -> sqlite3.Connection:
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_db_path), check_same_thread=False, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_metrics (
            day TEXT PRIMARY KEY,
            page_views INTEGER NOT NULL DEFAULT 0,
            audio_generations INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    conn.commit()


def utc_today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def incr_page_views(day: str | None = None) -> None:
    d = day or utc_today_iso()
    with _lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                """
                INSERT INTO daily_metrics (day, page_views, audio_generations)
                VALUES (?, 1, 0)
                ON CONFLICT(day) DO UPDATE SET
                    page_views = page_views + 1
                """,
                (d,),
            )
            conn.commit()
        finally:
            conn.close()


def incr_audio_generations(day: str | None = None) -> None:
    d = day or utc_today_iso()
    with _lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                """
                INSERT INTO daily_metrics (day, page_views, audio_generations)
                VALUES (?, 0, 1)
                ON CONFLICT(day) DO UPDATE SET
                    audio_generations = audio_generations + 1
                """,
                (d,),
            )
            conn.commit()
        finally:
            conn.close()


def get_daily_series(days: int) -> list[dict]:
    """Return ascending dates for the last `days` UTC days including today; fill gaps with zeros."""
    days = max(1, min(int(days), 366))
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)

    rows: dict[str, tuple[int, int]] = {}
    with _lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.execute(
                """
                SELECT day, page_views, audio_generations
                FROM daily_metrics
                WHERE day >= ? AND day <= ?
                """,
                (start.isoformat(), end.isoformat()),
            )
            for day_s, pv, ag in cur.fetchall():
                rows[str(day_s)] = (int(pv), int(ag))
        finally:
            conn.close()

    out: list[dict] = []
    d = start
    while d <= end:
        key = d.isoformat()
        pv, ag = rows.get(key, (0, 0))
        out.append({"date": key, "page_views": pv, "audio_generations": ag})
        d = d + timedelta(days=1)
    return out
