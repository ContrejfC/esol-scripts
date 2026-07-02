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
      <p className="text-slate-600">
        Loading ElevenLabs voices… (on the live site this can take up to a minute the first time)
      </p>
    );
  }

  if (error) {
    const help = voiceLoadHelpForError(error);
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950"
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
    return <p className="text-green-700">{voiceCount} voices loaded — you can generate audio.</p>;
  }

  return null;
}
