from datetime import datetime
from pydantic import BaseModel


# --- Jobs ---

class JobCreate(BaseModel):
    company: str
    title: str
    url: str | None = None
    platform: str | None = None
    jd_text: str | None = None
    location: str | None = None
    salary_range: str | None = None
    is_remote: bool = False
    contact_name: str | None = None
    contact_email: str | None = None
    notes: str | None = None


class JobUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
    url: str | None = None
    platform: str | None = None
    jd_text: str | None = None
    status: str | None = None
    date_applied: datetime | None = None
    notes: str | None = None
    salary_range: str | None = None
    location: str | None = None
    is_remote: bool | None = None
    contact_name: str | None = None
    contact_email: str | None = None


class JobOut(BaseModel):
    id: int
    company: str
    title: str
    url: str | None
    platform: str | None
    jd_text: str | None
    status: str
    date_added: datetime
    date_applied: datetime | None
    notes: str | None
    salary_range: str | None
    location: str | None
    is_remote: bool
    contact_name: str | None
    contact_email: str | None
    has_tailored_resume: bool = False
    has_cover_letter: bool = False
    has_cold_email: bool = False

    model_config = {"from_attributes": True}


class UrlFetchRequest(BaseModel):
    url: str


class UrlFetchResult(BaseModel):
    company: str
    title: str
    jd_text: str
    platform: str
    location: str | None = None
    salary_range: str | None = None
    url: str


# --- Resumes ---

class ResumeOut(BaseModel):
    id: int
    job_id: int | None
    is_base: bool
    pdf_path: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeWithLatex(ResumeOut):
    latex_source: str | None


class LatexUpdateRequest(BaseModel):
    latex_source: str


# --- Documents ---

class DocumentOut(BaseModel):
    id: int
    job_id: int
    doc_type: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    content: str


class CoverLetterRequest(BaseModel):
    tone: str = "professional"


class ColdEmailRequest(BaseModel):
    contact_name: str | None = None


class JobDocuments(BaseModel):
    cover_letter: DocumentOut | None
    cold_email: DocumentOut | None
