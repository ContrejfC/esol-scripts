export type SourceType = "pdf" | "text";

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  order: number;
  pause_after_ms?: number;
  is_malformed?: boolean;
}

export interface ParsedScript {
  title?: string;
  sourceType?: SourceType;
  speakers: string[];
  lines: DialogueLine[];
  unmatchedLines?: string[];
}

export interface VoiceOption {
  id: string;
  name: string;
  /** Optional URL to free sample audio (ElevenLabs provides this; no credits used). */
  preview_url?: string;
}

export interface VoiceAssignment {
  speaker: string;
  voice_id: string;
  style: "slow_clear" | "normal" | "fast";
}

export type ReadingStyle = "slow_clear" | "normal" | "fast";
