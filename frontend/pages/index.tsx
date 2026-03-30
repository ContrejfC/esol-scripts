"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InputModeTabs from "../app/components/InputModeTabs";
import PdfUpload from "../app/components/PdfUpload";
import PasteScript, { SAMPLE_SCRIPT } from "../app/components/PasteScript";
import ScriptReview from "../app/components/ScriptReview";
import SpeakerVoices from "../app/components/SpeakerVoices";
import AudioOutput from "../app/components/AudioOutput";
import {
  uploadPdf,
  parseText,
  generateAudio,
  listVoices,
  getApiBase,
  checkConnection,
  getUsage,
  recordPageView,
  getAppStats,
  type AppActivityStats,
} from "../app/lib/api";
import type { ParsedScript, VoiceOption, VoiceAssignment, ReadingStyle } from "../app/lib/types";

type InputMode = "pdf" | "paste";

const STATS_KEY_STORAGE = "esol_stats_secret";

/** User-facing line when /health succeeds — avoids implying Vercel uses your laptop. */
function connectedApiMessage(): string {
  const base = getApiBase();
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT ?? "8002";
  try {
    if (base.startsWith("http://") || base.startsWith("https://")) {
      const u = new URL(base);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return `Connected (local backend ${u.host})`;
      }
      return `Connected (hosted API at ${u.host})`;
    }
  } catch {
    /* fall through */
  }
  if (base === "/api") {
    return `Connected (Next.js → local backend on port ${port})`;
  }
  return `Connected (${base})`;
}

function uniqueSpeakersFromLines(lines: { speaker: string }[]): string[] {
  const set = new Set<string>();
  lines.forEach((l) => set.add(l.speaker.trim()).add(l.speaker));
  return Array.from(set).filter(Boolean).sort();
}

export default function HomePage() {
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [script, setScript] = useState<ParsedScript | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [assignments, setAssignments] = useState<VoiceAssignment[]>([]);
  const [globalStyle, setGlobalStyle] = useState<ReadingStyle>("normal");
  const [audioId, setAudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const isGeneratingRef = useRef(false);
  const [usage, setUsage] = useState<{
    provider: string;
    usage: { character_limit?: number; character_count?: number; character_remaining?: number };
  } | null>(null);
  const [announceNames, setAnnounceNames] = useState(true);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [appActivity, setAppActivity] = useState<AppActivityStats | null>(null);
  const [statsSecretInput, setStatsSecretInput] = useState("");
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection().then(setConnectionStatus);
  }, []);

  useEffect(() => {
    void recordPageView();
  }, []);

  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined") return;
      const k = sessionStorage.getItem(STATS_KEY_STORAGE);
      if (!k) return;
      const s = await getAppStats(k);
      setAppActivity(s);
    })();
  }, []);

  const refreshPrivateStats = useCallback(async () => {
    if (typeof window === "undefined") return;
    const k = sessionStorage.getItem(STATS_KEY_STORAGE);
    if (!k) return;
    const s = await getAppStats(k);
    setAppActivity(s);
  }, []);

  const handleUnlockStats = useCallback(async () => {
    setStatsError(null);
    const s = await getAppStats(statsSecretInput);
    if (!s) {
      setStatsError("Could not load stats. Wrong secret or server STATS_SECRET not set.");
      return;
    }
    sessionStorage.setItem(STATS_KEY_STORAGE, statsSecretInput.trim());
    setStatsSecretInput("");
    setAppActivity(s);
  }, [statsSecretInput]);

  const handleLockStats = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.removeItem(STATS_KEY_STORAGE);
    setAppActivity(null);
    setStatsError(null);
  }, []);

  useEffect(() => {
    listVoices(elevenLabsKey || undefined)
      .then((r) => setVoices(r.voices))
      .catch(() => setVoices([{ id: "alloy", name: "Alloy" }]));

    // Fetch usage info in the background; best-effort only.
    getUsage(elevenLabsKey || undefined)
      .then((u) => setUsage(u))
      .catch(() => setUsage(null));
  }, [elevenLabsKey]);

  useEffect(() => {
    if (!script?.speakers?.length) return;
    setAssignments((prev) => {
      const next = script.speakers.map((sp) => {
        const existing = prev.find((a) => a.speaker === sp);
        return existing ?? { speaker: sp, voice_id: voices[0]?.id ?? "alloy", style: "normal" as const };
      });
      return next;
    });
  }, [script?.speakers?.join(","), voices.length]);

  const handlePdfUpload = useCallback(async (file: File) => {
    setInputError(null);
    setLoading(true);
    try {
      const { script: s } = await uploadPdf(file);
      setScript(s);
      setPasteValue("");
      const speakers = uniqueSpeakersFromLines(s.lines);
      setAssignments((prev) => {
        const next = speakers.map((sp) => {
          const existing = prev.find((a) => a.speaker === sp);
          return existing ?? { speaker: sp, voice_id: voices[0]?.id ?? "alloy", style: "normal" as const };
        });
        return next;
      });
    } catch (e) {
      setInputError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [voices]);

  const handleParsePaste = useCallback(async () => {
    setInputError(null);
    setLoading(true);
    try {
      const { script: s } = await parseText(pasteValue, pasteTitle);
      setScript(s);
      const speakers = uniqueSpeakersFromLines(s.lines);
      setAssignments((prev) => {
        const next = speakers.map((sp) => {
          const existing = prev.find((a) => a.speaker === sp);
          return existing ?? { speaker: sp, voice_id: voices[0]?.id ?? "alloy", style: "normal" as const };
        });
        return next;
      });
    } catch (e) {
      setInputError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }, [pasteValue, pasteTitle, voices]);

  const handleLoadSample = useCallback(() => {
    setPasteValue(SAMPLE_SCRIPT);
    setPasteTitle("Greetings");
    setInputError(null);
  }, []);

  const updateLine = useCallback((id: string, field: "speaker" | "text", value: string) => {
    setScript((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.map((l) =>
        l.id === id ? { ...l, [field]: value } : l
      );
      const speakers = uniqueSpeakersFromLines(lines);
      return { ...prev, lines, speakers };
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setScript((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.filter((l) => l.id !== id);
      const speakers = uniqueSpeakersFromLines(lines);
      return { ...prev, lines, speakers };
    });
  }, []);

  const handleAssignmentChange = useCallback(
    (speaker: string, voiceId: string, style: ReadingStyle) => {
      setAssignments((prev) => {
        const has = prev.find((a) => a.speaker === speaker);
        const rest = prev.filter((a) => a.speaker !== speaker);
        return [...rest, { speaker, voice_id: voiceId, style }];
      });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (isGeneratingRef.current) return; // Prevent double-submit (saves credits)
    if (!script || script.lines.length === 0) {
      setError("No dialogue lines to generate. Add or parse a script first.");
      return;
    }
    const linesWithText = script.lines.filter((l) => l.text?.trim());
    if (linesWithText.length === 0) {
      setError("No lines have text. Add content before generating.");
      return;
    }
    isGeneratingRef.current = true;
    setError(null);
    setAudioId(null);
    setLoading(true);
    try {
      const res = await generateAudio({
        script,
        voiceAssignments: assignments,
        globalStyle,
        announceNames,
        elevenLabsApiKey: elevenLabsKey || undefined,
      });
      if (res.success && res.audio_id) {
        setAudioId(res.audio_id);
        void refreshPrivateStats();
      } else {
        setError(res.error ?? "Generation failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  }, [script, assignments, globalStyle, announceNames, elevenLabsKey, refreshPrivateStats]);

  const speakers = script ? uniqueSpeakersFromLines(script.lines) : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">ESOL Scripts</h1>
        <p className="mt-1 text-slate-600">
          Convert classroom dialogue scripts into clear audio for English learners.
        </p>
        {connectionStatus !== null && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              connectionStatus.ok
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <strong>API:</strong> {connectionStatus.ok ? (
              <>{connectedApiMessage()}</>
            ) : (
              <>
                Connection error — {connectionStatus.message}. This app expects the backend on port{" "}
                <strong>{process.env.NEXT_PUBLIC_BACKEND_PORT ?? "8002"}</strong>. Start it with that port, then refresh:{" "}
                <code className="rounded bg-red-100 px-1 text-xs">
                  cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port {process.env.NEXT_PUBLIC_BACKEND_PORT ?? "8002"}
                </code>
                {" "}If your backend runs on a different port, set BACKEND_PORT in frontend/.env.local and restart npm run dev.
              </>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
          <label className="flex flex-col gap-1 max-w-md">
            <span className="font-medium">ElevenLabs API key (optional)</span>
            <input
              type="password"
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value.trim())}
              placeholder="Override backend ELEVENLABS_API_KEY for this browser session"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-slate-500">
              If set, this key is used for ElevenLabs voices, usage, and generation from this browser,
              so you can use a different account&apos;s credits without changing the server .env.
            </span>
          </label>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Input</h2>
        <InputModeTabs mode={inputMode} onChange={setInputMode} />
        <div className="mt-4">
          {inputMode === "pdf" && (
            <PdfUpload
              onUpload={handlePdfUpload}
              disabled={loading}
              error={inputError ?? undefined}
            />
          )}
          {inputMode === "paste" && (
            <PasteScript
              value={pasteValue}
              title={pasteTitle}
              onChange={setPasteValue}
              onTitleChange={setPasteTitle}
              onParse={handleParsePaste}
              onLoadSample={handleLoadSample}
              disabled={loading}
              error={inputError ?? undefined}
            />
          )}
        </div>
      </section>

      {script && script.lines.length > 0 && (
        <>
          <section className="mb-8">
            <ScriptReview
              script={script}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
            />
          </section>
          <section className="mb-8">
            <SpeakerVoices
              speakers={speakers}
              voices={voices}
              assignments={assignments}
              globalStyle={globalStyle}
              onAssignmentChange={handleAssignmentChange}
              onGlobalStyleChange={setGlobalStyle}
            />
          </section>
          <section className="mb-8">
            <h3 className="mb-2 text-lg font-semibold text-slate-800">Generate audio</h3>
            <p className="mb-2 text-sm text-slate-600">
              {script.lines.filter((l) => l.text?.trim()).length} lines, ~
              {script.lines
                .filter((l) => l.text?.trim())
                .reduce((sum, l) => sum + (l.text?.length ?? 0), 0)}{" "}
              characters — each generation uses API credits.
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={announceNames}
                onChange={(e) => setAnnounceNames(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Narrator announces speaker names (e.g. “Jin.” before each line)
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate Audio"}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </section>
        </>
      )}

      {audioId && (
        <section className="mb-8">
          <AudioOutput audioId={audioId} />
        </section>
      )}

      <div className="fixed bottom-3 left-3 z-10 max-w-sm rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
        <details>
          <summary className="cursor-pointer select-none font-semibold text-slate-800">
            Site metrics
          </summary>
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            {!appActivity ? (
              <>
                <p className="text-slate-500">
                  Enter the same <code className="rounded bg-slate-100 px-0.5">STATS_SECRET</code> you set
                  on the server (e.g. Render environment).
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    value={statsSecretInput}
                    onChange={(e) => setStatsSecretInput(e.target.value)}
                    placeholder="Stats secret"
                    className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => void handleUnlockStats()}
                    className="rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-800"
                  >
                    Unlock
                  </button>
                </div>
                {statsError && <p className="text-red-600">{statsError}</p>}
              </>
            ) : (
              <>
                <p>
                  <span className="font-semibold text-slate-800">This server run:</span>{" "}
                  {appActivity.page_views_total} page loads · {appActivity.unique_visitors_today} visitors
                  today (by IP) · {appActivity.audio_generations_completed} audio files generated.
                </p>
                <p className="text-slate-500">Counters reset when the host restarts.</p>
                <button
                  type="button"
                  onClick={handleLockStats}
                  className="text-slate-600 underline hover:text-slate-900"
                >
                  Lock and hide on this browser
                </button>
              </>
            )}
          </div>
        </details>
      </div>

      {usage && usage.usage.character_limit !== undefined && (
        <div className="fixed bottom-3 right-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm">
          <span className="font-semibold">ElevenLabs credits:</span>{" "}
          {usage.usage.character_remaining} / {usage.usage.character_limit} characters left
        </div>
      )}
    </main>
  );
}

