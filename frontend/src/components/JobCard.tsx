import type { Job } from '../api/client'

interface Props {
  job: Job
  index: number
  onClick: () => void
}

export default function JobCard({ job, index, onClick }: Props) {
  const initials = job.company.slice(0, 2).toUpperCase()
  const added = new Date(job.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const meta = [job.company, job.location, job.salary_range].filter(Boolean).join(' · ')

  return (
    <div
      className="job-card"
      role="button"
      tabIndex={0}
      aria-label={`${job.title} at ${job.company}, status: ${job.status}`}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className="job-index">
        {index}
      </div>

      <div className="job-monogram">
        {initials}
      </div>

      <div className="job-main">
        <div className="job-title">
          {job.title}
        </div>
        {meta && (
          <div className="job-meta">
            {meta}
          </div>
        )}
      </div>

      {(job.has_tailored_resume || job.has_cover_letter || job.has_cold_email) && (
        <div className="job-docdots">
          {job.has_tailored_resume && (
            <span
              title="Tailored resume"
              className="job-dot"
              style={{ background: 'var(--accent)' }}
            />
          )}
          {job.has_cover_letter && (
            <span
              title="Cover letter"
              className="job-dot"
              style={{ background: 'var(--success)' }}
            />
          )}
          {job.has_cold_email && (
            <span
              title="Cold email"
              className="job-dot"
              style={{ background: 'var(--warning)' }}
            />
          )}
        </div>
      )}

      <span className={`badge badge-${job.status}`}>{job.status}</span>

      <div className="job-date">
        {added}
      </div>
    </div>
  )
}
