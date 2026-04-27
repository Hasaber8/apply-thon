from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, exists
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Job, Resume, Document
from schemas import JobCreate, JobOut, JobUpdate, UrlFetchRequest, UrlFetchResult
from services.job_fetcher import fetch_job_from_url, ScrapingBlockedError, FetchError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _job_out(job: Job, db: AsyncSession) -> JobOut:
    has_resume = await db.scalar(
        select(exists().where(Resume.job_id == job.id, Resume.is_base == False))
    )
    has_cl = await db.scalar(
        select(exists().where(Document.job_id == job.id, Document.doc_type == "cover_letter"))
    )
    has_ce = await db.scalar(
        select(exists().where(Document.job_id == job.id, Document.doc_type == "cold_email"))
    )
    out = JobOut.model_validate(job)
    out.has_tailored_resume = bool(has_resume)
    out.has_cover_letter = bool(has_cl)
    out.has_cold_email = bool(has_ce)
    return out


@router.post("/fetch-url", response_model=UrlFetchResult)
async def fetch_url(body: UrlFetchRequest):
    try:
        result = await fetch_job_from_url(body.url)
        return UrlFetchResult(**result)
    except ScrapingBlockedError as e:
        raise HTTPException(status_code=422, detail=f"LinkedIn blocked: {e}. Please paste the JD manually.")
    except FetchError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch job: {e}")


@router.post("", response_model=JobOut, status_code=201)
async def create_job(body: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(**body.model_dump())
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return await _job_out(job, db)


@router.get("", response_model=dict)
async def list_jobs(
    status: str | None = Query(None),
    platform: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Job).order_by(Job.date_added.desc())
    if status:
        stmt = stmt.where(Job.status == status)
    if platform:
        stmt = stmt.where(Job.platform == platform)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((Job.company.ilike(like)) | (Job.title.ilike(like)))

    result = await db.execute(stmt)
    jobs = result.scalars().all()
    items = [await _job_out(j, db) for j in jobs]
    return {"items": items, "total": len(items)}


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return await _job_out(job, db)


@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: int, body: JobUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return await _job_out(job, db)


@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    return {"ok": True}
