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
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500"
        />
        Loading ElevenLabs voices… (on the live site this can take up to a minute the first time)
      </div>
    );
  }

  if (error) {
    const help = voiceLoadHelpForError(error);
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
        role="alert"
      >
        <p className="font-medium">{help.headline}</p>
        {help.detail && help.detail !== help.headline && (
          <p className="mt-1 text-xs text-amber-800">{help.detail}</p>
        )}
        <p className="mt-2 text-sm font-medium">Try this:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
          {help.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
          >
            Retry voices
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-amber-300 bg-amber-100/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-200"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  if (voiceCount > 0) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-green-700">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {voiceCount} voices loaded — you can generate audio.
      </p>
    );
  }

  return null;
}
