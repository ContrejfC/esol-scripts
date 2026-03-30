import type { ParsedScript, VoiceAssignment, VoiceOption, ReadingStyle } from "./types";

// By default use /api (Next.js proxy). In dev, you can override with
// NEXT_PUBLIC_API_BASE=http://127.0.0.1:8002 to talk directly to FastAPI.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

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
const BACKEND_UNREACHABLE_MSG =
  `Backend not reachable on port ${BACKEND_PORT}. Start it: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port ${BACKEND_PORT}. Then refresh.`;

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
}): Promise<{ audio_id: string; success: boolean; error?: string }> {
  const { elevenLabsApiKey, ...body } = params;
  const headers: Record<string, string> = {};
  if (elevenLabsApiKey) {
    headers["x-elevenlabs-api-key"] = elevenLabsApiKey;
  }
  return post("/generate-audio", body, headers);
}

export async function listVoices(elevenLabsApiKey?: string): Promise<{ voices: VoiceOption[] }> {
  try {
    const res = await fetch(`${API_BASE}/voices`, {
      headers: elevenLabsApiKey ? { "x-elevenlabs-api-key": elevenLabsApiKey } : undefined,
    });
    if (!res.ok) throw new Error("Failed to load voices");
    return res.json();
  } catch (e) {
    if (isNetworkError(e)) throw new Error(BACKEND_UNREACHABLE_MSG);
    throw e;
  }
}

export async function getUsage(elevenLabsApiKey?: string): Promise<{ provider: string; usage: { character_limit?: number; character_count?: number; character_remaining?: number } }> {
  const res = await fetch(`${API_BASE}/usage`, {
    headers: elevenLabsApiKey ? { "x-elevenlabs-api-key": elevenLabsApiKey } : undefined,
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
