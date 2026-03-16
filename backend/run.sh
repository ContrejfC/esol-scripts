#!/bin/bash
# Run backend with reload, excluding audio/uploads so generated files don't trigger restarts
cd "$(dirname "$0")"
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
exec uvicorn app.main:app --reload --port 8002 \
  --reload-exclude 'audio/*' \
  --reload-exclude 'uploads/*'
