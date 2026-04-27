import logging
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import ai, jobs, resumes
from services.resume_service import BASE_DIR, TAILORED_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    TAILORED_DIR.mkdir(parents=True, exist_ok=True)

    if not shutil.which("pandoc"):
        logger.warning("pandoc not found — DOCX conversion may fall back to plain text extraction")
    if not shutil.which("pdflatex"):
        logger.warning("pdflatex not found — LaTeX compilation will fail")

    yield


app = FastAPI(title="Apply-thon API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(ai.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
