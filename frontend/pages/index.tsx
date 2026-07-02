"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import InputModeTabs from "../app/components/InputModeTabs";
import PdfUpload from "../app/components/PdfUpload";
import PasteScript, { SAMPLE_SCRIPT } from "../app/components/PasteScript";
import ScriptReview from "../app/components/ScriptReview";
import SpeakerVoices from "../app/components/SpeakerVoices";
import AudioOutput from "../app/components/AudioOutput";
import VoiceLoadStatus from "../app/components/VoiceLoadStatus";
import {
  uploadPdf,
  parseText,
  generateAudio,
  listVoices,
  getApiBase,
  isLocalApi,
  checkConnection,
  getUsage,
  recordPageView,
  type ElevenLabsKeyProfile,
} from "../app/lib/api";
import { voiceLoadHelpForError } from "../app/lib/voiceLoadHelp";
import type { ParsedScript, VoiceOption, VoiceAssignment, ReadingStyle } from "../app/lib/types";

type InputMode = "pdf" | "paste";

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
  lines.forEach((l) => {
    const trimmed = l.speaker.trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set).sort();
}

function buildSpeakerAssignments(
  speakers: string[],
  voices: VoiceOption[],
  prev: VoiceAssignment[],
): VoiceAssignment[] {
  if (voices.length === 0) return [];
  const validIds = new Set(voices.map((v) => v.id));
  const defaultId = voices[0].id;
  return speakers.map((sp) => {
    const existing = prev.find((a) => a.speaker === sp);
    const voice_id =
      existing && validIds.has(existing.voice_id) ? existing.voice_id : defaultId;
    return {
      speaker: sp,
      voice_id,
      style: existing?.style ?? "normal",
    };
  });
}

function voiceIdsKey(voices: VoiceOption[]): string {
  return voices.map((v) => v.id).join(",");
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
  const [generating, setGenerating] = useState(false);
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
  const [elevenLabsProfile, setElevenLabsProfile] = useState<ElevenLabsKeyProfile>("default");
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    setVoicesLoading(true);
    setVoicesError(null);
    const opts = {
      elevenLabsApiKey: elevenLabsKey || undefined,
      elevenLabsProfile,
    };
    let lastError = "Could not load voices.";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await listVoices(opts);
        setVoices(r.voices);
        setVoicesLoading(false);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
        }
      }
    }
    setVoices([]);
    setVoicesError(lastError);
    setVoicesLoading(false);
  }, [elevenLabsKey, elevenLabsProfile]);

  useEffect(() => {
    checkConnection().then(setConnectionStatus);
  }, []);

  useEffect(() => {
    void recordPageView();
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const u = await getUsage({
        elevenLabsApiKey: elevenLabsKey || undefined,
        elevenLabsProfile,
      });
      setUsage(u);
    } catch {
      setUsage(null);
    }
  }, [elevenLabsKey, elevenLabsProfile]);

  useEffect(() => {
    void loadVoices();
    void refreshUsage();
  }, [loadVoices, refreshUsage]);

  useEffect(() => {
    if (!script?.speakers?.length || voices.length === 0) return;
    setAssignments((prev) => buildSpeakerAssignments(script.speakers, voices, prev));
  }, [script?.speakers?.join(","), voiceIdsKey(voices)]);

  const handlePdfUpload = useCallback(async (file: File) => {
    setInputError(null);
    setLoading(true);
    try {
      const { script: s } = await uploadPdf(file);
      setScript(s);
      setPasteValue("");
      const speakers = uniqueSpeakersFromLines(s.lines);
      setAssignments((prev) => buildSpeakerAssignments(speakers, voices, prev));
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
      setAssignments((prev) => buildSpeakerAssignments(speakers, voices, prev));
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
    if (voicesLoading) {
      setError("Still loading voices. Please wait a moment and try again.");
      return;
    }
    if (voices.length === 0) {
      const help = voiceLoadHelpForError(
        voicesError ?? "Voices are not loaded yet.",
      );
      setError(`${help.headline} ${help.steps[0]}`);
      return;
    }
    const validVoiceIds = new Set(voices.map((v) => v.id));
    const badAssignment = assignments.find((a) => !validVoiceIds.has(a.voice_id));
    if (badAssignment) {
      setError(
        `Invalid voice for "${badAssignment.speaker}". Pick a voice from the dropdown (not a placeholder).`,
      );
      return;
    }
    isGeneratingRef.current = true;
    setError(null);
    setAudioId(null);
    setGenerating(true);
    try {
      const res = await generateAudio({
        script,
        voiceAssignments: assignments,
        globalStyle,
        announceNames,
        elevenLabsApiKey: elevenLabsKey || undefined,
        elevenLabsProfile,
      });
      if (res.success && res.audio_id) {
        setAudioId(res.audio_id);
        // Generation consumed credits; update the usage badge right away.
        void refreshUsage();
      } else {
        setError(res.error ?? "Generation failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [script, assignments, globalStyle, announceNames, elevenLabsKey, elevenLabsProfile, voices, voicesLoading, voicesError, refreshUsage]);

  const speakers = script ? uniqueSpeakersFromLines(script.lines) : [];
  const hasLinesWithText = script ? script.lines.some((l) => l.text?.trim()) : false;
  const generateBlockedReason = voicesLoading
    ? "Voices are still loading — Generate will enable when they're ready."
    : voices.length === 0
      ? "Voices could not be loaded. Fix the voice connection above, then retry."
      : !hasLinesWithText
        ? "Add at least one line with text before generating."
        : null;
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT ?? "8002";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-600/25"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5c-1.6-1.2-3.7-1.5-6-1.5v12c2.3 0 4.4.3 6 1.5 1.6-1.2 3.7-1.5 6-1.5v-12c-2.3 0-4.4.3-6 1.5z" />
                <path strokeLinecap="round" d="M12 6.5v12" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                ESOL{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent">
                  Scripts
                </span>
              </h1>
              <p className="mt-1 text-slate-600">
                Turn classroom dialogue scripts into clear audio for English learners.
              </p>
            </div>
          </div>
          {connectionStatus !== null && (
            <span
              className={`pill ${
                connectionStatus.ok
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus.ok ? "bg-teal-500" : "bg-red-500"
                }`}
              />
              {connectionStatus.ok ? connectedApiMessage() : "API connection error"}
            </span>
          )}
        </div>
        {connectionStatus !== null && !connectionStatus.ok && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {isLocalApi() ? (
              <>
                Connection error — {connectionStatus.message}. This app expects the backend on port{" "}
                <strong>{backendPort}</strong>. Start it with that port, then refresh:{" "}
                <code className="rounded bg-red-100 px-1 text-xs">
                  cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port {backendPort}
                </code>
                {" "}If your backend runs on a different port, set BACKEND_PORT in frontend/.env.local and restart npm run dev.
              </>
            ) : (
              <>
                Connection error — {connectionStatus.message}. The hosted API may be waking up.
                Wait about 30 seconds, then refresh this page.
              </>
            )}
          </div>
        )}
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <VoiceLoadStatus
            loading={voicesLoading}
            error={voicesError}
            voiceCount={voices.length}
            onRetry={() => void loadVoices()}
          />
          <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
            <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 transition hover:text-slate-900">
              Advanced: ElevenLabs account &amp; API key
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
                className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4">
              <label className="flex max-w-md flex-col gap-1.5">
                <span className="font-medium text-slate-800">ElevenLabs account</span>
                <select
                  value={elevenLabsProfile}
                  onChange={(e) => setElevenLabsProfile(e.target.value as ElevenLabsKeyProfile)}
                  className="select-field"
                >
                  <option value="default">Default</option>
                  <option value="elizabeth">Elizabeth</option>
                </select>
                <span className="text-xs leading-relaxed text-slate-500">
                  <strong>Default</strong> uses the server&apos;s <code className="rounded bg-slate-100 px-1">ELEVENLABS_API_KEY</code>.
                  <strong> Elizabeth</strong> uses <code className="rounded bg-slate-100 px-1">ELEVENLABS_API_KEY_ELIZABETH</code> (set on the backend).
                </span>
              </label>
              <label className="flex max-w-md flex-col gap-1.5">
                <span className="font-medium text-slate-800">ElevenLabs API key (optional)</span>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="Overrides account choice for this browser session only"
                  className="input-field"
                />
                <span className="text-xs leading-relaxed text-slate-500">
                  If set, this key is used instead of Default or Elizabeth for voices, usage, and generation.
                </span>
              </label>
            </div>
          </details>
        </div>
      </header>

      <section className="card mb-6 border-l-4 border-l-indigo-500">
        <h2 className="step-heading mb-4">
          <span className="step-badge">1</span>
          Add your script
        </h2>
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
          <section className="card mb-6 border-l-4 border-l-indigo-500">
            <h2 className="step-heading mb-4">
              <span className="step-badge">2</span>
              Review the lines
            </h2>
            <ScriptReview
              script={script}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
            />
          </section>
          <section className="card mb-6 border-l-4 border-l-indigo-500">
            <h2 className="step-heading mb-4">
              <span className="step-badge">3</span>
              Choose voices
            </h2>
            <SpeakerVoices
              speakers={speakers}
              voices={voices}
              assignments={assignments}
              globalStyle={globalStyle}
              onAssignmentChange={handleAssignmentChange}
              onGlobalStyleChange={setGlobalStyle}
            />
          </section>
          <section className="card mb-6 border-l-4 border-l-teal-500 bg-gradient-to-br from-white to-indigo-50/40">
            <h2 className="step-heading mb-3">
              <span className="step-badge bg-teal-600">4</span>
              Generate audio
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              {script.lines.filter((l) => l.text?.trim()).length} lines, ~
              {script.lines
                .filter((l) => l.text?.trim())
                .reduce((sum, l) => sum + (l.text?.length ?? 0), 0)}{" "}
              characters — each generation uses API credits.
            </p>
            <label className="mb-4 flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={announceNames}
                onChange={(e) => setAnnounceNames(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Narrator announces speaker names (e.g. “Jin.” before each line)
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || generateBlockedReason !== null}
              className="btn-cta"
            >
              {generating ? (
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
                  <path d="M13.5 4.06c0-1.34-1.6-2-2.53-1.06l-4.28 4.25H4.25A2.25 2.25 0 002 9.5v5a2.25 2.25 0 002.25 2.25h2.44l4.28 4.25c.93.94 2.53.28 2.53-1.06V4.06zM18.58 6.42a.75.75 0 10-1.06 1.06 6.5 6.5 0 010 9.19.75.75 0 101.06 1.06 8 8 0 000-11.31z" />
                  <path d="M16.46 8.54a.75.75 0 10-1.06 1.06 3.5 3.5 0 010 4.95.75.75 0 101.06 1.06 5 5 0 000-7.07z" />
                </svg>
              )}
              {generating ? "Generating…" : "Generate Audio"}
            </button>
            {!generating && generateBlockedReason && (
              <p className="mt-3 text-sm text-slate-500">{generateBlockedReason}</p>
            )}
            {generating && (
              <div className="mt-4 max-w-md" role="status" aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                  <div className="animate-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500" />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Generating audio line by line — this may take a minute for longer scripts.
                  Keep this tab open.
                </p>
              </div>
            )}
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
            )}
          </section>
        </>
      )}

      {audioId && (
        <section className="mb-6">
          <AudioOutput audioId={audioId} />
        </section>
      )}

      {usage && usage.usage.character_limit !== undefined && (
        <div className="fixed bottom-3 right-3 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2 text-xs text-slate-700 shadow-md shadow-slate-200/60 backdrop-blur-sm">
          <span className="font-semibold text-indigo-700">ElevenLabs credits:</span>{" "}
          {usage.usage.character_remaining} / {usage.usage.character_limit} characters left
        </div>
      )}

      <footer className="mt-14 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-5 pb-2 text-xs text-slate-400">
        <span>
          Made for ESOL teachers — turn any dialogue into classroom-ready audio.
        </span>
        <Link
          href="/metrics"
          className="rounded-md px-1 py-0.5 transition hover:text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Usage metrics
        </Link>
      </footer>
    </main>
  );
}

