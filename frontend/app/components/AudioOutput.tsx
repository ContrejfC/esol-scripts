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
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Your audio</h3>
      <audio controls src={url} className="w-full" />
      <div className="flex gap-2">
        <a
          href={url}
          download={audioId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Download MP3
        </a>
      </div>
    </div>
  );
}
