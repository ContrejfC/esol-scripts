# ESOL Scripts

Convert short classroom dialogue scripts into clear audio for English learners. Teachers upload a PDF or paste script text; the app parses speakers, lets you assign voices and reading style, then generates one MP3.

## Quick start

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Copy environment variables:

```bash
cp ../.env.example .env
# Edit .env and set OPENAI_API_KEY (required for TTS)
```

You need **ffmpeg** installed (for merging audio clips):

- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`

Run the API on port **8002** (so it doesn’t clash with other apps):

```bash
./run.sh
```

Or manually (excludes `audio/` and `uploads/` from the file watcher so generating audio doesn't restart the server):

```bash
uvicorn app.main:app --reload --port 8002 --reload-exclude 'audio/*' --reload-exclude 'uploads/*'
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app talks to the backend at **http://127.0.0.1:8002** (see `frontend/.env.local`). A connection status line under the title shows “Connected” or the exact error if the backend isn’t reachable.

**If you see a connection error**: (1) Start the backend with the same port the frontend expects (default 8002). (2) If you run uvicorn on another port, set BACKEND_PORT in frontend/.env.local and restart npm run dev. (3) Open the URL Next.js prints (e.g. localhost:3000 or 3001). The green/red status on the page shows the backend port and the exact error (e.g. “Failed to fetch” = backend not running or wrong port).

**If `npm install` fails with EPERM** (cache folder permissions), run once:  
`sudo chown -R $(whoami) ~/.npm`  
Then run `npm install` again in the frontend folder.

### 3. Using the app

1. Choose **Upload PDF** or **Paste Script Text**.
2. For paste: type or paste dialogue in the form `Speaker: line` (one per line). Use **Load sample** to try the demo.
3. For PDF: select a text-based PDF with the same dialogue format.
4. Review and edit parsed lines if needed.
5. Assign a voice to each speaker and pick a reading style (normal or slow and clear).
6. Click **Generate Audio**, then play or download the MP3.

## Project structure

```
ESOL Scripts/
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── api/routes.py    # HTTP endpoints
│   │   ├── core/            # config, parser, normalize
│   │   ├── models/          # Pydantic script models
│   │   └── services/        # PDF extract, TTS, audio gen
│   ├── tests/
│   ├── uploads/             # temp PDF uploads (dev)
│   ├── audio/               # generated MP3s (dev)
│   └── requirements.txt
├── frontend/                # Next.js app
│   ├── app/
│   │   ├── components/      # InputModeTabs, PdfUpload, etc.
│   │   ├── lib/            # api client, types
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── package.json
├── sample_scripts/          # Example dialogues for testing
├── .env.example
└── README.md
```

## Architecture choices

- **Single parser**: PDF and pasted text both go through `parse_raw_script()` so behaviour is identical and teachers can fall back to paste if PDF extraction is messy.
- **TTS abstraction**: `TTSProvider` in `backend/app/services/tts/` allows swapping providers; v1 uses OpenAI TTS.
- **No DB**: Generated files are stored under `backend/audio/`; no user accounts or persistence. Suitable for classroom use and phase 2 can add storage later.
- **ffmpeg**: Used only to concatenate per-line MP3s and optional silence; keeps the backend simple and portable.

## TTS provider (v1)

The first implementation uses **OpenAI TTS** (`tts-1`):

- Clear, natural-sounding English.
- Multiple distinct voices so each speaker can have a different one.
- Speed control for “slow and clear” vs normal.
- Well-documented API and easy to swap later via the provider interface.

**For natural-sounding audio**, use OpenAI TTS: set `TTS_PROVIDER=openai` and `OPENAI_API_KEY` in `backend/.env`, then restart. The local provider (macOS `say`) is free but sounds robotic.

## Tests

```bash
cd backend
pip install pytest
pytest tests/ -v
```

## Sample scripts

In `sample_scripts/`:

- `greetings.txt`
- `introducing_yourself.txt`
- `asking_directions.txt`
- `ordering_food.txt`

Use them to test parsing and audio generation; the paste UI also has a **Load sample** button with a short greetings dialogue.

## Phase 2 (not in v1)

- Student accounts and saved script/audio libraries.
- Database persistence.
- Translation, student recording, word-by-word highlighting, quizzes.
- Live conversation or advanced orchestration.

Focus for v1 is a reliable, teacher-friendly workflow for short ESOL dialogues and clear audio output.
