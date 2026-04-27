import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Job } from '../api/client'
import JobCard from './JobCard'
import AddJobModal from './AddJobModal'
import JobDetailDrawer from './JobDetailDrawer'
import UploadResumeModal from './UploadResumeModal'

const STATUSES = ['all', 'saved', 'applied', 'interview', 'offer', 'rejected']

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', statusFilter, search],
    queryFn: () =>
      api.jobs.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  })

  const jobs = data?.items ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 36px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em' }}>
            apply<span style={{ color: 'var(--accent)' }}>-thon</span>
          </h1>
          {data && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {data.total} {data.total === 1 ? 'application' : 'applications'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowUpload(true)}>
            Upload Resume
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Job
          </button>
        </div>
      </header>

      <div style={{ padding: '20px 36px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            aria-label="Search jobs"
            placeholder="Search company or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280, height: 36, padding: '0 13px', fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 5 }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  background: statusFilter === s ? 'var(--accent)' : 'transparent',
                  color: statusFilter === s ? 'oklch(9% 0.006 260)' : 'var(--text-muted)',
                  border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 20,
                  padding: '4px 13px',
                  fontSize: 12,
                  fontWeight: statusFilter === s ? 600 : 400,
                  textTransform: 'capitalize',
                  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
            Loading...
          </div>
        )}

        {error && (
          <div className="error-msg" style={{ padding: '20px 0' }}>
            Failed to load. Is the backend running?
          </div>
        )}

        {!isLoading && jobs.length === 0 && !error && (
          <div className="empty-state">
            {search || statusFilter !== 'all' ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                  No results
                </p>
                <p>
                  {search && statusFilter !== 'all'
                    ? `No ${statusFilter} applications matching "${search}"`
                    : search
                    ? `Nothing matching "${search}"`
                    : `No ${statusFilter} applications yet`}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                  No applications yet
                </p>
                <p>Add a job posting URL or enter one manually to start tracking.</p>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {jobs.map((job, i) => (
            <JobCard
              key={job.id}
              job={job}
              index={i + 1}
              onClick={() => setSelectedJob(job)}
            />
          ))}
        </div>
      </div>

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} />}
      {showUpload && <UploadResumeModal onClose={() => setShowUpload(false)} />}
      {selectedJob && (
        <JobDetailDrawer
          jobId={selectedJob.id}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  )
}
