"""Structured script data model for dialogue lines and speakers."""

from typing import Literal

from pydantic import BaseModel, Field


ReadingStyle = Literal["slow_clear", "normal", "fast"]


class DialogueLine(BaseModel):
    """A single line of dialogue with speaker and text."""

    id: str
    speaker: str
    text: str
    order: int
    pause_after_ms: int = 500
    is_malformed: bool = False


class ParsedScript(BaseModel):
    """Full parsed script with speakers and lines."""

    title: str = ""
    source_type: Literal["pdf", "text"] = Field(default="text", alias="sourceType")
    speakers: list[str] = Field(default_factory=list)
    lines: list[DialogueLine] = Field(default_factory=list)
    unmatched_lines: list[str] = Field(default_factory=list, alias="unmatchedLines")

    model_config = {"populate_by_name": True}


class VoiceAssignment(BaseModel):
    """Voice assigned to a speaker."""

    speaker: str
    voice_id: str
    style: ReadingStyle = "normal"


class GenerateAudioRequest(BaseModel):
    """Request body for audio generation."""

    script: ParsedScript
    voice_assignments: list[VoiceAssignment] = Field(
        default_factory=list, alias="voiceAssignments"
    )
    global_style: ReadingStyle = Field(default="normal", alias="globalStyle")
    announce_names: bool = Field(default=True, alias="announceNames")

    model_config = {"populate_by_name": True}


class GenerateAudioResponse(BaseModel):
    """Response with audio file identifier."""

    audio_id: str
    success: bool = True
    error: str | None = None

