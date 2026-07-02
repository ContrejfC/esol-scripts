"use client";

import { voiceLoadHelpForError } from "../lib/voiceLoadHelp";

export default function VoiceLoadStatus({
  loading,
  error,
  voiceCount,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  voiceCount: number;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm shadow-slate-200/60"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
        />
        Loading ElevenLabs voices… (on the live site this can take up to a minute the first time)
      </div>
    );
  }

  if (error) {
    const help = voiceLoadHelpForError(error);
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm shadow-amber-100/60"
        role="alert"
      >
        <p className="font-semibold">{help.headline}</p>
        {help.detail && help.detail !== help.headline && (
          <p className="mt-1 text-xs text-amber-800">{help.detail}</p>
        )}
        <p className="mt-2.5 text-sm font-medium">Try this:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
          {help.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Retry voices
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-1.5 text-xs font-semibold transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  if (voiceCount > 0) {
    return (
      <p className="pill border-teal-200 bg-teal-50 text-teal-800">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-500" />
        {voiceCount} voices loaded — you can generate audio.
      </p>
    );
  }

  return null;
}
