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
      <h3 className="text-lg font-semibold text-slate-800">Voice for each speaker</h3>
      <p className="text-sm text-slate-600">
        Use &quot;Play sample&quot; to hear each voice before generating. No credits used for samples.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Default reading style (speed)
        </label>
        <select
          value={globalStyle}
          onChange={(e) => onGlobalStyleChange(e.target.value as ReadingStyle)}
          className="rounded-lg border border-slate-300 px-3 py-2"
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
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <p className="mb-2 font-medium text-slate-800">{speaker}</p>
              <div className="space-y-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-slate-500">Voice</label>
                    <select
                      value={voiceId}
                      onChange={(e) =>
                        onAssignmentChange(speaker, e.target.value, getStyle(speaker))
                      }
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
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
                    className="shrink-0 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Play sample
                  </button>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Style</label>
                  <select
                    value={getStyle(speaker)}
                    onChange={(e) =>
                      onAssignmentChange(speaker, getVoice(speaker), e.target.value as ReadingStyle)
                    }
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
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
