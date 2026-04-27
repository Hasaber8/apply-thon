import type { Job } from '../api/client'

interface Props {
  job: Job
  onClick: () => void
}

export default function JobCard({ job, onClick }: Props) {
  const initials = job.company.slice(0, 2).toUpperCase()
  const added = new Date(job.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const meta = [job.company, job.location, job.salary_range].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'oklch(14% 0.008 260)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      {/* Monogram */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 8,
        background: 'var(--surface2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {initials}
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: 15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          {job.title}
        </div>
        {meta && (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            marginTop: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {meta}
          </div>
        )}
      </div>

      {/* Document indicators */}
      {(job.has_tailored_resume || job.has_cover_letter || job.has_cold_email) && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
          {job.has_tailored_resume && (
            <span
              title="Tailored resume"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'block' }}
            />
          )}
          {job.has_cover_letter && (
            <span
              title="Cover letter"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'block' }}
            />
          )}
          {job.has_cold_email && (
            <span
              title="Cold email"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warning)', display: 'block' }}
            />
          )}
        </div>
      )}

      {/* Status badge */}
      <span className={`badge badge-${job.status}`}>{job.status}</span>

      {/* Date */}
      <div style={{
        color: 'var(--text-muted)',
        fontSize: 12,
        flexShrink: 0,
        minWidth: 50,
        textAlign: 'right',
      }}>
        {added}
      </div>
    </div>
  )
}
