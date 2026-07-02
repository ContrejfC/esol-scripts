import type { ParsedScript, VoiceAssignment, VoiceOption, ReadingStyle } from "./types";

/**
 * Backend origin for API calls.
 * - Default `/api` uses Next.js rewrites to the real backend (see next.config.js).
 * - If NEXT_PUBLIC_API_BASE is a full URL, trailing slashes are stripped.
 * - If it mistakenly ends with `/api` (copy-paste from Next convention), that is stripped
 *   so paths become `.../stats` not `.../api/stats` (FastAPI has no /api prefix).
 */
function normalizeApiBase(raw: string | undefined): string {
  const r = (raw ?? "").trim();
  if (!r || r === "/api") return "/api";
  let b = r.replace(/\/+$/, "");
  if (b.startsWith("http://") || b.startsWith("https://")) {
    if (b.endsWith("/api")) b = b.slice(0, -4).replace(/\/+$/, "");
    return b;
  }
  return b;
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);

export function getApiBase(): string {
  return API_BASE;
}

/** Call backend /health to verify connection; returns error message or null if OK. */
export async function checkConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) return { ok: true, message: "Connected" };
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError && (e.message === "Failed to fetch" || e.message === "Load failed");
}

const BACKEND_PORT = typeof process.env.NEXT_PUBLIC_BACKEND_PORT !== "undefined" ? process.env.NEXT_PUBLIC_BACKEND_PORT : "8002";

/** True when the app talks to a local dev backend (Next rewrite or localhost URL). */
export function isLocalApi(): boolean {
  if (API_BASE === "/api") return true;
  try {
    const u = new URL(API_BASE);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

// Local dev gets the exact command to start the backend; against a hosted API
// that command is meaningless, so show a wake-up-and-retry message instead.
const BACKEND_UNREACHABLE_MSG = isLocalApi()
  ? `Backend not reachable on port ${BACKEND_PORT}. Start it: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port ${BACKEND_PORT}. Then refresh.`
  : "The audio server is not responding. It may be waking up — wait about 30 seconds, then try again.";

/** Server-side profiles (see backend ELEVENLABS_API_KEY / ELEVENLABS_API_KEY_ELIZABETH). */
export type ElevenLabsKeyProfile = "default" | "elizabeth";

function buildElevenLabsHeaders(opts: {
  profile: ElevenLabsKeyProfile;
  overrideKey?: string;
}): Record<string, string> {
  const trimmed = opts.overrideKey?.trim();
  if (trimmed) {
    return { "x-elevenlabs-api-key": trimmed };
  }
  if (opts.profile === "elizabeth") {
    return { "x-elevenlabs-key-profile": "elizabeth" };
  }
  return {};
}

async function post<T>(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  try {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        const j = JSON.parse(text);
        if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
        /* use text as-is */
      }
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    if (isNetworkError(e)) throw new Error(BACKEND_UNREACHABLE_MSG);
    throw e;
  }
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        const j = JSON.parse(text);
        if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
        /* use text as-is */
      }
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    if (isNetworkError(e)) throw new Error(BACKEND_UNREACHABLE_MSG);
    throw e;
  }
}

export async function uploadPdf(file: File): Promise<{
  rawText: string;
  script: ParsedScript;
}> {
  const form = new FormData();
  form.append("file", file);
  return postFormData("/upload-pdf", form);
}

export async function parseText(text: string, title?: string): Promise<{ script: ParsedScript }> {
  return post("/parse-text", { text, title: title || "" });
}

export async function generateAudio(params: {
  script: ParsedScript;
  voiceAssignments: VoiceAssignment[];
  globalStyle: ReadingStyle;
  announceNames: boolean;
  elevenLabsApiKey?: string;
  elevenLabsProfile?: ElevenLabsKeyProfile;
}): Promise<{ audio_id: string; success: boolean; error?: string }> {
  const { elevenLabsApiKey, elevenLabsProfile, ...body } = params;
  const headers = buildElevenLabsHeaders({
    profile: elevenLabsProfile ?? "default",
    overrideKey: elevenLabsApiKey,
  });
  return post("/generate-audio", body, headers);
}

export async function listVoices(opts?: {
  elevenLabsApiKey?: string;
  elevenLabsProfile?: ElevenLabsKeyProfile;
}): Promise<{ voices: VoiceOption[] }> {
  const headers = buildElevenLabsHeaders({
    profile: opts?.elevenLabsProfile ?? "default",
    overrideKey: opts?.elevenLabsApiKey,
  });
  const controller = new AbortController();
  const timeoutMs = 90_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/voices`, {
      headers: Object.keys(headers).length ? headers : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to load voices (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { voices: VoiceOption[] };
    if (!data.voices?.length) {
      throw new Error(
        "No ElevenLabs voices returned. Check ELEVENLABS_API_KEY on the server (or the Elizabeth profile key).",
      );
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "Loading voices timed out. The hosted API may be waking up—wait 30 seconds and try again.",
      );
    }
    if (isNetworkError(e)) throw new Error(BACKEND_UNREACHABLE_MSG);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getUsage(opts?: {
  elevenLabsApiKey?: string;
  elevenLabsProfile?: ElevenLabsKeyProfile;
}): Promise<{ provider: string; usage: { character_limit?: number; character_count?: number; character_remaining?: number } }> {
  const headers = buildElevenLabsHeaders({
    profile: opts?.elevenLabsProfile ?? "default",
    overrideKey: opts?.elevenLabsApiKey,
  });
  const res = await fetch(`${API_BASE}/usage`, {
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (!res.ok) {
    // If usage fails, just return empty info; don't break the UI.
    return { provider: "unknown", usage: {} };
  }
  return res.json();
}

export function audioUrl(audioId: string): string {
  return `${API_BASE}/audio/${audioId}`;
}

/** Report one browser session load (best-effort; ignored on failure). */
export async function recordPageView(): Promise<void> {
  try {
    await fetch(`${API_BASE}/stats/page-view`, { method: "POST" });
  } catch {
    /* ignore */
  }
}

export type AppActivityStats = {
  server_started_at_utc: string;
  page_views_total: number;
  unique_visitors_today: number;
  audio_generations_completed: number;
};

export type DailyStatPoint = {
  date: string;
  page_views: number;
  audio_generations: number;
};

export type DailyStatsPayload = {
  days: number;
  timezone: string;
  series: DailyStatPoint[];
};

/**
 * Fetch /stats. Returns { data, error } so callers can show why a request failed
 * (e.g. backend down, CORS, 404).
 */
export async function getAppStats(): Promise<{
  data: AppActivityStats | null;
  error: string | null;
}> {
  const url = `${API_BASE}/stats`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text;
      try {
        const j = JSON.parse(text) as { detail?: unknown };
        if (j.detail != null) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
        /* use raw text */
      }
      return {
        data: null,
        error: `API returned ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      };
    }
    const data = (await res.json()) as AppActivityStats;
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: `${msg}. Is the backend running at ${API_BASE}?`,
    };
  }
}

/** Per-day aggregates (UTC dates); persisted on the server when disk survives restarts. */
export async function getAppDailyStats(
  days = 30
): Promise<{ data: DailyStatsPayload | null; error: string | null }> {
  const n = Math.min(366, Math.max(1, Math.floor(days)));
  const url = `${API_BASE}/stats/daily?days=${encodeURIComponent(String(n))}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text;
      try {
        const j = JSON.parse(text) as { detail?: unknown };
        if (j.detail != null) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
        /* use raw text */
      }
      return {
        data: null,
        error: `API returned ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      };
    }
    const data = (await res.json()) as DailyStatsPayload;
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: `${msg}. Is the backend running at ${API_BASE}?`,
    };
  }
}
