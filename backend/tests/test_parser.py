"""Tests for dialogue parsing (Speaker: line format)."""

import pytest
from app.core.parser import parse_raw_script


def test_parse_valid_dialogue():
    raw = """Maria: Hi John, how are you?
John: I am good, thank you.
Maria: I am fine."""
    script = parse_raw_script(raw, source_type="text")
    assert len(script.lines) == 3
    assert script.lines[0].speaker == "Maria"
    assert script.lines[0].text == "Hi John, how are you?"
    assert script.lines[1].speaker == "John"
    assert script.lines[1].text == "I am good, thank you."
    assert script.speakers == ["John", "Maria"]


def test_blank_lines_ignored():
    raw = """Maria: Hello.

John: Hi.

Maria: How are you?"""
    script = parse_raw_script(raw)
    assert len(script.lines) == 3
    assert [l.text for l in script.lines] == ["Hello.", "Hi.", "How are you?"]


def test_first_colon_only_splits():
    raw = "Shopkeeper: We close at 6:30 pm."
    script = parse_raw_script(raw)
    assert len(script.lines) == 1
    assert script.lines[0].speaker == "Shopkeeper"
    assert script.lines[0].text == "We close at 6:30 pm."


def test_malformed_lines_in_unmatched():
    raw = """Maria: Hello.
This has no colon
John: Hi there."""
    script = parse_raw_script(raw)
    assert len(script.lines) == 2
    assert script.unmatched_lines == ["This has no colon"]


def test_preserve_line_order():
    raw = """A: First.
C: Second.
B: Third."""
    script = parse_raw_script(raw)
    assert [l.speaker for l in script.lines] == ["A", "C", "B"]
    assert [l.order for l in script.lines] == [1, 2, 3]


def test_detect_unique_speakers():
    raw = """Maria: One.
John: Two.
Maria: Three.
John: Four."""
    script = parse_raw_script(raw)
    assert sorted(script.speakers) == ["John", "Maria"]


def test_empty_input():
    script = parse_raw_script("", source_type="text")
    assert script.lines == []
    assert script.speakers == []
    assert script.unmatched_lines == []


def test_title_and_source_type():
    script = parse_raw_script("A: Hi.", source_type="pdf", title="Greetings")
    assert script.title == "Greetings"
    assert script.source_type == "pdf"
