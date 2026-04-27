import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { Job } from '../api/client'

interface Props {
  job: Job
  onClick: () => void
}

export default function JobCard({ job, onClick }: Props) {
  const qc = useQueryClient()

  const tailorMutation = useMutation({
    mutationFn: () => api.resumes.tailor(job.id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      if (data.compile_error) {
        toast.error(`Tailored but compile error: ${data.compile_error}`)
      } else {
        toast.success('Resume tailored!')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const coverMutation = useMutation({
    mutationFn: () => api.ai.coverLetter(job.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Cover letter generated!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const emailMutation = useMutation({
    mutationFn: () => api.ai.coldEmail(job.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Cold email generated!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const anyLoading = tailorMutation.isPending || coverMutation.isPending || emailMutation.isPending

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.title}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{job.company}</div>
        </div>
        <span className={`badge badge-${job.status}`}>{job.status}</span>
      </div>

      {(job.location || job.salary_range) && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', gap: 10 }}>
          {job.location && <span>{job.location}</span>}
          {job.salary_range && <span>{job.salary_range}</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {job.has_tailored_resume && (
          <span style={{ fontSize: 11, background: 'rgba(108,99,255,0.15)', color: 'var(--accent)', borderRadius: 4, padding: '2px 6px' }}>resume</span>
        )}
        {job.has_cover_letter && (
          <span style={{ fontSize: 11, background: 'rgba(29,233,182,0.15)', color: 'var(--success)', borderRadius: 4, padding: '2px 6px' }}>cover letter</span>
        )}
        {job.has_cold_email && (
          <span style={{ fontSize: 11, background: 'rgba(255,215,64,0.15)', color: 'var(--warning)', borderRadius: 4, padding: '2px 6px' }}>cold email</span>
        )}
      </div>

      <div
        style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', gap: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="btn-ghost btn-sm"
          disabled={anyLoading}
          onClick={() => tailorMutation.mutate()}
          title="Tailor resume for this role using AI"
        >
          {tailorMutation.isPending ? <><span className="spinner" />Tailoring...</> : 'Tailor Resume'}
        </button>
        <button
          className="btn-ghost btn-sm"
          disabled={anyLoading}
          onClick={() => coverMutation.mutate()}
          title="Generate cover letter using AI"
        >
          {coverMutation.isPending ? <><span className="spinner" />Generating...</> : 'Cover Letter'}
        </button>
        <button
          className="btn-ghost btn-sm"
          disabled={anyLoading}
          onClick={() => emailMutation.mutate()}
          title="Generate cold email using AI"
        >
          {emailMutation.isPending ? <><span className="spinner" />Generating...</> : 'Cold Email'}
        </button>
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        Added {new Date(job.date_added).toLocaleDateString()}
        {job.date_applied && ` · Applied ${new Date(job.date_applied).toLocaleDateString()}`}
      </div>
    </div>
  )
}
