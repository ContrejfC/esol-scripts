"""Parse raw script text into structured dialogue (Speaker: line format)."""

import re
from uuid import uuid4

from app.models.script import DialogueLine, ParsedScript


# Line format: Speaker: dialogue (split only at first colon)
LINE_PATTERN = re.compile(r"^(.+?):\s*(.*)$", re.UNICODE)


def parse_raw_script(
    raw_text: str,
    source_type: str = "text",
    title: str = "",
) -> ParsedScript:
    """
    Parse raw script text into ParsedScript.
    - Each line: "Speaker: dialogue" (split at first colon only).
    - Blank lines ignored.
    - Non-matching lines go to unmatched_lines and are flagged for review.
    - Line order is preserved.
    """
    lines: list[DialogueLine] = []
    unmatched: list[str] = []
    seen_speakers: set[str] = set()

    for order, raw_line in enumerate(raw_text.splitlines(), start=1):
        line_stripped = raw_line.strip()
        if not line_stripped:
            continue

        # Parentheses-only line -> stage direction narrated by the narrator voice.
        # Example: "(Mr. Gordon rushing into the classroom)"
        if line_stripped.startswith("(") and line_stripped.endswith(")"):
            direction_text = line_stripped[1:-1].strip()
            if direction_text:
                lines.append(
                    DialogueLine(
                        id=f"line_{uuid4().hex[:8]}",
                        speaker="Narrator",
                        text=direction_text,
                        order=order,
                        pause_after_ms=500,
                        is_malformed=False,
                    )
                )
            continue

        match = LINE_PATTERN.match(line_stripped)
        if match:
            speaker = match.group(1).strip()
            text = match.group(2).strip()
            if not speaker or not text:
                unmatched.append(line_stripped)
                continue
            seen_speakers.add(speaker)
            lines.append(
                DialogueLine(
                    id=f"line_{uuid4().hex[:8]}",
                    speaker=speaker,
                    text=text,
                    order=order,
                    pause_after_ms=500,
                    is_malformed=False,
                )
            )
        else:
            unmatched.append(line_stripped)

    # Do not include the implicit Narrator "speaker" in the speakers list;
    # narrator voice is fixed and not user-selectable.
    speakers_list = sorted(s for s in seen_speakers if s != "Narrator")
    return ParsedScript(
        title=title or "",
        source_type=source_type,
        speakers=speakers_list,
        lines=lines,
        unmatchedLines=unmatched,
    )
