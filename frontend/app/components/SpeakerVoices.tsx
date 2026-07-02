"use client";

import { useRef } from "react";
import type { VoiceOption } from "../lib/types";
import type { VoiceAssignment } from "../lib/types";
import type { ReadingStyle } from "../lib/types";

export default function SpeakerVoices({
  speakers,
  voices,
  assignments,
  globalStyle,
  onAssignmentChange,
  onGlobalStyleChange,
}: {
  speakers: string[];
  voices: VoiceOption[];
  assignments: VoiceAssignment[];
  globalStyle: ReadingStyle;
  onAssignmentChange: (speaker: string, voiceId: string, style: ReadingStyle) => void;
  onGlobalStyleChange: (style: ReadingStyle) => void;
}) {
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const getVoice = (speaker: string) =>
    assignments.find((a) => a.speaker === speaker)?.voice_id ?? voices[0]?.id ?? "";
  const getStyle = (speaker: string) =>
    assignments.find((a) => a.speaker === speaker)?.style ?? globalStyle;

  const playPreview = (voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    const url = voice?.preview_url?.trim();
    if (!url || !previewAudioRef.current) return;
    previewAudioRef.current.src = url;
    previewAudioRef.current.play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <audio ref={previewAudioRef} className="hidden" />
      <p className="text-sm text-slate-600">
        Pick a voice for each speaker. Use &quot;Play sample&quot; to hear a voice before generating — samples don&apos;t use credits.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Default reading speed
        </label>
        <select
          value={globalStyle}
          onChange={(e) => onGlobalStyleChange(e.target.value as ReadingStyle)}
          className="select-field"
        >
          <option value="slow_clear">Beginner (0.70×)</option>
          <option value="normal">Intermediate (0.75×)</option>
          <option value="fast">Advanced (0.78×)</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {speakers.map((speaker) => {
          const voiceId = getVoice(speaker);
          const voice = voices.find((v) => v.id === voiceId);
          const hasPreview = Boolean(voice?.preview_url?.trim());
          return (
            <div
              key={speaker}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50"
            >
              <p className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                <span
                  aria-hidden
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                >
                  {speaker.charAt(0).toUpperCase()}
                </span>
                {speaker}
              </p>
              <div className="space-y-2.5">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-500">Voice</label>
                    <select
                      value={voiceId}
                      onChange={(e) =>
                        onAssignmentChange(speaker, e.target.value, getStyle(speaker))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => playPreview(voiceId)}
                    disabled={!hasPreview}
                    title={hasPreview ? "Play voice sample (no credits used)" : "Preview not available for this provider"}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
                      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z" />
                    </svg>
                    Play sample
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Reading speed</label>
                  <select
                    value={getStyle(speaker)}
                    onChange={(e) =>
                      onAssignmentChange(speaker, getVoice(speaker), e.target.value as ReadingStyle)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="slow_clear">Beginner</option>
                    <option value="normal">Intermediate</option>
                    <option value="fast">Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
