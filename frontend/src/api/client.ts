const BASE = '/api'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 30000
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const opts: RequestInit = {
      method,
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    }
    const res = await fetch(`${BASE}${path}`, opts)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail ?? res.statusText)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

function aiRequest<T>(path: string, body?: unknown) {
  return request<T>('POST', path, body, 140000)
}

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface Job {
  id: number
  company: string
  title: string
  url: string | null
  platform: string | null
  jd_text: string | null
  status: JobStatus
  date_added: string
  date_applied: string | null
  notes: string | null
  salary_range: string | null
  location: string | null
  is_remote: boolean
  contact_name: string | null
  contact_email: string | null
  has_tailored_resume: boolean
  has_cover_letter: boolean
  has_cold_email: boolean
}

export interface UrlFetchResult {
  company: string
  title: string
  jd_text: string
  platform: string
  location: string | null
  salary_range: string | null
  url: string
}

export interface Document {
  id: number
  job_id: number
  doc_type: string
  content: string
  created_at: string
  updated_at: string
}

export interface JobDocuments {
  cover_letter: Document | null
  cold_email: Document | null
}

export interface Resume {
  id: number
  job_id: number | null
  is_base: boolean
  pdf_path: string | null
  latex_source?: string
  created_at: string
  updated_at: string
}

export const api = {
  jobs: {
    list: (params?: { status?: string; platform?: string; search?: string }) => {
      const q = new URLSearchParams()
      if (params?.status) q.set('status', params.status)
      if (params?.platform) q.set('platform', params.platform)
      if (params?.search) q.set('search', params.search)
      const qs = q.toString()
      return request<{ items: Job[]; total: number }>('GET', `/jobs${qs ? '?' + qs : ''}`)
    },
    get: (id: number) => request<Job>('GET', `/jobs/${id}`),
    fetchUrl: (url: string) => request<UrlFetchResult>('POST', '/jobs/fetch-url', { url }),
    create: (body: Omit<Partial<Job>, 'id'> & { company: string; title: string }) =>
      request<Job>('POST', '/jobs', body, 20000),
    update: (id: number, body: Partial<Job>) => request<Job>('PATCH', `/jobs/${id}`, body),
    delete: (id: number) => request<{ ok: boolean }>('DELETE', `/jobs/${id}`),
  },
  resumes: {
    uploadDocx: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return request<{ resume_id: number; latex_preview: string }>('POST', '/resumes/upload', fd, 30000)
    },
    getBase: () => request<Resume>('GET', '/resumes/base'),
    tailor: (jobId: number) => aiRequest<{ resume_id: number; pdf_path: string | null; latex_source: string; compile_error: string | null }>(`/resumes/tailor/${jobId}`),
    getLatex: (jobId: number) => request<{ latex_source: string }>('GET', `/resumes/${jobId}/latex`),
    updateLatex: (jobId: number, latex_source: string) =>
      request<{ pdf_path: string | null; compile_error: string | null }>('PUT', `/resumes/${jobId}/latex`, { latex_source }),
    pdfUrl: (jobId: number) => `${BASE}/resumes/${jobId}/pdf`,
  },
  ai: {
    coverLetter: (jobId: number, tone = 'professional') =>
      aiRequest<Document>(`/ai/cover-letter/${jobId}`, { tone }),
    coldEmail: (jobId: number, contactName?: string) =>
      aiRequest<Document>(`/ai/cold-email/${jobId}`, { contact_name: contactName ?? null }),
    getDocuments: (jobId: number) => request<JobDocuments>('GET', `/ai/documents/${jobId}`),
    updateDocument: (docId: number, content: string) =>
      request<Document>('PUT', `/ai/documents/${docId}`, { content }),
  },
}
