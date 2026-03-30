"""FastAPI app for ESOL Scripts - dialogue to audio for classroom."""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory so OPENAI_API_KEY is set before config is imported
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router

app = FastAPI(
    title="ESOL Scripts API",
    description="Convert dialogue scripts to audio for ESOL classroom use",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    # allow_credentials=True cannot be combined with allow_origins=["*"] in browsers.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="", tags=["esol"])


@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, exc: Exception):
    """Return 500 with error detail so we can see what failed."""
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
