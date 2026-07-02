/** Plain-language guidance when ElevenLabs voices fail to load. */

export type VoiceLoadHelp = {
  headline: string;
  detail?: string;
  steps: string[];
};

export function voiceLoadHelpForError(error: string): VoiceLoadHelp {
  const lower = error.toLowerCase();

  if (lower.includes("timed out") || lower.includes("waking up")) {
    return {
      headline: "Voices are taking longer than usual",
      detail: error,
      steps: [
        "Wait about 30–60 seconds (the server may be waking up after idle time).",
        'Click "Retry voices" below.',
        "If it still fails, refresh the page and try again.",
      ],
    };
  }

  if (
    lower.includes("not reachable") ||
    lower.includes("failed to fetch") ||
    lower.includes("backend not reachable")
  ) {
    return {
      headline: "Could not connect to the server",
      detail: error,
      steps: [
        "Check your internet connection.",
        "Refresh the page.",
        "If the problem continues, wait a minute and try again—the hosted API may be restarting.",
      ],
    };
  }

  if (lower.includes("no elevenlabs voices") || lower.includes("no voices")) {
    return {
      headline: "Voices could not load from ElevenLabs",
      detail: error,
      steps: [
        'Try the other option under "ElevenLabs account" (Default or Elizabeth).',
        "Clear the optional API key box if you pasted a key there.",
        'Click "Retry voices", or refresh the page.',
      ],
    };
  }

  return {
    headline: "Voices failed to load",
    detail: error,
    steps: [
      'Click "Retry voices" below.',
      "Refresh the page.",
      "If you still see this, wait a minute and try again.",
    ],
  };
}
