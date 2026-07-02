"""Extract text from PDF files (classroom dialogue scripts)."""

from io import BytesIO
from pathlib import Path

import pypdf


def extract_text_from_pdf(source: bytes | Path) -> str:
    """
    Extract raw text from a text-based PDF (bytes or path).
    Optimized for simple teacher-created classroom scripts.
    """
    data = source.read_bytes() if isinstance(source, Path) else source
    reader = pypdf.PdfReader(BytesIO(data))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts).strip() if parts else ""
