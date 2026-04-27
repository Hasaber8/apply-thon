import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Job, Resume
from schemas import LatexUpdateRequest, ResumeOut, ResumeWithLatex
from services import claude_service, resume_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


async def _get_base_resume(db: AsyncSession) -> Resume | None:
    result = await db.execute(select(Resume).where(Resume.is_base == True))
    return result.scalar_one_or_none()


async def _get_job_resume(job_id: int, db: AsyncSession) -> Resume | None:
    result = await db.execute(
        select(Resume).where(Resume.job_id == job_id, Resume.is_base == False)
    )
    return result.scalar_one_or_none()


@router.post("/upload", response_model=dict, status_code=201)
async def upload_resume(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(await file.read())
        docx_path = tmp.name

    try:
        latex = await resume_service.convert_docx_to_latex(docx_path)
    except Exception as e:
        Path(docx_path).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")
    finally:
        Path(docx_path).unlink(missing_ok=True)

    resume_service.save_base_latex(latex)

    existing = await _get_base_resume(db)
    if existing:
        existing.latex_source = latex
        existing.pdf_path = None
        await db.commit()
        await db.refresh(existing)
        resume = existing
    else:
        resume = Resume(is_base=True, job_id=None, latex_source=latex)
        db.add(resume)
        await db.commit()
        await db.refresh(resume)

    return {"resume_id": resume.id, "latex_preview": latex[:500]}


@router.get("/base", response_model=ResumeWithLatex)
async def get_base_resume(db: AsyncSession = Depends(get_db)):
    resume = await _get_base_resume(db)
    if not resume:
        raise HTTPException(status_code=404, detail="No base resume uploaded yet")
    return ResumeWithLatex.model_validate(resume)


@router.post("/tailor/{job_id}", response_model=dict)
async def tailor_resume(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    base = await _get_base_resume(db)
    if not base or not base.latex_source:
        raise HTTPException(status_code=400, detail="No base resume uploaded yet")

    if not job.jd_text:
        raise HTTPException(status_code=400, detail="Job has no JD text to tailor against")

    try:
        tailored_latex = await claude_service.tailor_resume(
            base.latex_source, job.jd_text, job.company, job.title
        )
    except claude_service.ClaudeError as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")

    tex_path = resume_service.save_tailored_latex(job_id, tailored_latex)

    try:
        pdf_path = resume_service.compile_latex(tex_path)
    except resume_service.LatexCompileError as e:
        pdf_path = None
        # still save the latex even if compile fails
        compile_error = str(e)
    else:
        compile_error = None

    existing = await _get_job_resume(job_id, db)
    if existing:
        existing.latex_source = tailored_latex
        existing.pdf_path = pdf_path
        await db.commit()
        await db.refresh(existing)
        resume = existing
    else:
        resume = Resume(job_id=job_id, is_base=False, latex_source=tailored_latex, pdf_path=pdf_path)
        db.add(resume)
        await db.commit()
        await db.refresh(resume)

    return {
        "resume_id": resume.id,
        "pdf_path": pdf_path,
        "latex_source": tailored_latex,
        "compile_error": compile_error,
    }


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


@router.get("/{job_id}/pdf")
async def download_pdf(job_id: int, db: AsyncSession = Depends(get_db)):
    resume = await _get_job_resume(job_id, db)
    if not resume or not resume.pdf_path:
        raise HTTPException(status_code=404, detail="No compiled PDF for this job")
    pdf = Path(resume.pdf_path)
    if not pdf.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    job = await db.get(Job, job_id)
    filename = f"resume-{_slugify(job.company)}-{_slugify(job.title)}.pdf" if job else f"resume-{job_id}.pdf"
    return FileResponse(str(pdf), media_type="application/pdf", filename=filename)


@router.get("/{job_id}/latex", response_model=dict)
async def get_latex(job_id: int, db: AsyncSession = Depends(get_db)):
    resume = await _get_job_resume(job_id, db)
    if not resume:
        raise HTTPException(status_code=404, detail="No tailored resume for this job")
    return {"latex_source": resume.latex_source}


@router.put("/{job_id}/latex", response_model=dict)
async def update_latex(job_id: int, body: LatexUpdateRequest, db: AsyncSession = Depends(get_db)):
    resume = await _get_job_resume(job_id, db)
    if not resume:
        raise HTTPException(status_code=404, detail="No tailored resume for this job")

    tex_path = resume_service.save_tailored_latex(job_id, body.latex_source)
    try:
        pdf_path = resume_service.compile_latex(tex_path)
        compile_error = None
    except resume_service.LatexCompileError as e:
        pdf_path = resume.pdf_path
        compile_error = str(e)

    resume.latex_source = body.latex_source
    resume.pdf_path = pdf_path
    await db.commit()

    return {"pdf_path": pdf_path, "compile_error": compile_error}
