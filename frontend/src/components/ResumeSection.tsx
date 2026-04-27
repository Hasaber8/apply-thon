import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'

interface Props {
  jobId: number
  company: string
  title: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function ResumeSection({ jobId, company, title }: Props) {
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [localLatex, setLocalLatex] = useState('')

  const { data: latexData, isLoading: latexLoading } = useQuery({
    queryKey: ['resume-latex', jobId],
    queryFn: () => api.resumes.getLatex(jobId),
    retry: false,
  })

  const tailorMutation = useMutation({
    mutationFn: () => api.resumes.tailor(jobId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['resume-latex', jobId] })
      if (data.compile_error) {
        toast.error(`Tailored but LaTeX compile error. Edit and fix manually.`)
      } else {
        toast.success('Resume tailored and compiled!')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMutation = useMutation({
    mutationFn: () => api.resumes.updateLatex(jobId, localLatex),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['resume-latex', jobId] })
      setEditMode(false)
      if (data.compile_error) {
        toast.error(`Saved but compile error: ${data.compile_error}`)
      } else {
        toast.success('LaTeX saved and compiled!')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const currentLatex = latexData?.latex_source ?? ''
  const pdfUrl = api.resumes.pdfUrl(jobId)

  return (
    <div className="section">
      <div className="section-title">Tailored Resume</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          className="btn-primary btn-sm"
          disabled={tailorMutation.isPending}
          onClick={() => tailorMutation.mutate()}
        >
          {tailorMutation.isPending ? <><span className="spinner" />Tailoring (may take ~60s)...</> : 'Re-tailor with AI'}
        </button>
        {currentLatex && (
          <>
            <a href={pdfUrl}>
              <button className="btn-ghost btn-sm">Download Resume</button>
            </a>
            <button
              className="btn-ghost btn-sm"
              onClick={() => { setLocalLatex(currentLatex); setEditMode(e => !e) }}
            >
              {editMode ? 'Cancel Edit' : 'Edit LaTeX'}
            </button>
          </>
        )}
      </div>

      {tailorMutation.isPending && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 6 }}>
          Claude is tailoring your resume... This takes 30–90 seconds.
        </div>
      )}

      {!currentLatex && !latexLoading && !tailorMutation.isPending && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No tailored resume yet. Click "Re-tailor with AI" to generate one.
        </p>
      )}

      {editMode && (
        <div>
          <textarea
            value={localLatex}
            onChange={e => setLocalLatex(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 320, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
            <button
              className="btn-primary btn-sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <><span className="spinner" />Saving...</> : 'Save & Compile'}
            </button>
          </div>
        </div>
      )}

      {currentLatex && !editMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 6,
          background: 'rgba(29,233,182,0.08)', border: '1px solid rgba(29,233,182,0.2)',
        }}>
          <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            Resume tailored —{' '}
            <strong>resume-{slugify(company)}-{slugify(title)}.pdf</strong>
          </span>
        </div>
      )}
    </div>
  )
}
