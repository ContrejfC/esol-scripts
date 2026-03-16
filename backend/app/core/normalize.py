"""Text normalization for TTS: punctuation and abbreviations."""

import re


def normalize_for_tts(text: str) -> str:
    """
    Clean text for clear pronunciation in TTS.
    Handles common abbreviations and punctuation that can sound odd when read aloud.
    """
    if not text or not text.strip():
        return text
    t = text.strip()
    # Expand common abbreviations for learners
    replacements = [
        (r"\bMr\.", "Mister"),
        (r"\bMrs\.", "Missus"),
        (r"\bMs\.", "Ms"),
        (r"\bDr\.", "Doctor"),
        (r"\betc\.", "et cetera"),
        (r"\be\.g\.", "for example"),
        (r"\bi\.e\.", "that is"),
        (r"\bvs\.", "versus"),
        (r"\bSt\.", "Street"),
        (r"\bAve\.", "Avenue"),
        (r"\bapprox\.", "approximately"),
        (r"\bno\.", "number"),
        (r"\bYes\?", "Yes?"),  # keep question tone
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t, flags=re.IGNORECASE)
    # Normalize multiple spaces
    t = re.sub(r"\s+", " ", t)
    return t.strip()
