from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Document, Job, Resume
from schemas import (
    ColdEmailRequest,
    CoverLetterRequest,
    DocumentOut,
    DocumentUpdate,
    JobDocuments,
)
from services import claude_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def _get_base_latex(db: AsyncSession) -> str | None:
    result = await db.execute(select(Resume).where(Resume.is_base == True))
    base = result.scalar_one_or_none()
    return base.latex_source if base else None


async def _upsert_document(
    job_id: int, doc_type: str, content: str, db: AsyncSession
) -> Document:
    result = await db.execute(
        select(Document).where(Document.job_id == job_id, Document.doc_type == doc_type)
    )
    doc = result.scalar_one_or_none()
    if doc:
        doc.content = content
    else:
        doc = Document(job_id=job_id, doc_type=doc_type, content=content)
        db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/cover-letter/{job_id}", response_model=DocumentOut)
async def generate_cover_letter(
    job_id: int,
    body: CoverLetterRequest = CoverLetterRequest(),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.jd_text:
        raise HTTPException(status_code=400, detail="Job has no JD text")

    base_latex = await _get_base_latex(db)
    if not base_latex:
        raise HTTPException(status_code=400, detail="No base resume uploaded yet")

    try:
        content = await claude_service.generate_cover_letter(
            job.jd_text, job.company, job.title, base_latex, body.tone
        )
    except claude_service.ClaudeError as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")

    doc = await _upsert_document(job_id, "cover_letter", content, db)
    return DocumentOut.model_validate(doc)


@router.post("/cold-email/{job_id}", response_model=DocumentOut)
async def generate_cold_email(
    job_id: int,
    body: ColdEmailRequest = ColdEmailRequest(),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.jd_text:
        raise HTTPException(status_code=400, detail="Job has no JD text")

    base_latex = await _get_base_latex(db)
    if not base_latex:
        raise HTTPException(status_code=400, detail="No base resume uploaded yet")

    contact = body.contact_name or job.contact_name

    try:
        content = await claude_service.generate_cold_email(
            job.jd_text, job.company, job.title, base_latex, contact
        )
    except claude_service.ClaudeError as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")

    doc = await _upsert_document(job_id, "cold_email", content, db)
    return DocumentOut.model_validate(doc)


@router.get("/documents/{job_id}", response_model=JobDocuments)
async def get_documents(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.job_id == job_id))
    docs = result.scalars().all()
    doc_map = {d.doc_type: DocumentOut.model_validate(d) for d in docs}
    return JobDocuments(
        cover_letter=doc_map.get("cover_letter"),
        cold_email=doc_map.get("cold_email"),
    )


@router.put("/documents/{doc_id}", response_model=DocumentOut)
async def update_document(doc_id: int, body: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.content = body.content
    await db.commit()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)
