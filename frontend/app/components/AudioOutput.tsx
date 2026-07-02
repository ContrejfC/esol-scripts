"use client";

import { audioUrl } from "../lib/api";

export default function AudioOutput({
  audioId,
  onDownload,
}: {
  audioId: string | null;
  onDownload?: () => void;
}) {
  if (!audioId) return null;
  const url = audioUrl(audioId);

  return (
    <div className="space-y-4 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 to-white p-6 shadow-sm shadow-teal-100/60">
      <h3 className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.58l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
          </svg>
        </span>
        Your audio is ready
      </h3>
      <audio controls src={url} className="w-full" />
      <div className="flex gap-2">
        <a
          href={url}
          download={audioId}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/25 transition hover:bg-teal-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.61L6.3 8.4a.75.75 0 10-1.1 1.02l4.25 4.55a.75.75 0 001.1 0l4.25-4.55a.75.75 0 10-1.1-1.02l-2.95 2.96V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Download MP3
        </a>
      </div>
    </div>
  );
}
