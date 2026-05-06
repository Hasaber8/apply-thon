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
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="brand-mark">
            apply<span>-thon</span>
          </h1>
          {data && (
            <span className="app-count">
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

      <div className="dashboard-body">
        <div className="toolbar">
          <input
            aria-label="Search jobs"
            placeholder="Search company or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="status-pills">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`status-pill ${statusFilter === s ? 'active' : ''}`}
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

        <div className="jobs-list">
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
