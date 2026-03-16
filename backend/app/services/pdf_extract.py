"""Extract text from PDF files (classroom dialogue scripts)."""

from pathlib import Path

import pypdf


def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extract raw text from a text-based PDF.
    Optimized for simple teacher-created classroom scripts.
    """
    reader = pypdf.PdfReader(str(pdf_path))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts).strip() if parts else ""
